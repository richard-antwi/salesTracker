import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { paystackService } from '@/lib/paystack';
import { notifications } from '@/lib/notifications';
import { calculateAgreementSummary } from '@/lib/calculations';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const reference = searchParams.get('reference');

  if (!reference) {
    return NextResponse.json({ error: 'Missing reference' }, { status: 400 });
  }

  try {
    // 1. Verify with Paystack
    const verifyResponse = await paystackService.verifyTransaction(reference);

    if (!verifyResponse.success || verifyResponse.data?.status !== 'success') {
      return NextResponse.json({ error: 'Payment verification failed' }, { status: 400 });
    }

    const amountPaidGHS = verifyResponse.data.amount / 100;

    // 2. Prevent duplicate processing
    const existingPayment = await prisma.payment.findFirst({
      where: { reference }
    });

    if (existingPayment) {
      return NextResponse.json({ success: true, message: 'Already processed' });
    }

    // --- 3. SAAS SUBSCRIPTION PAYMENT ---
    if (verifyResponse.data.metadata?.type === 'SAAS_SUBSCRIPTION' && verifyResponse.data.metadata?.organizationId) {
      const orgId = verifyResponse.data.metadata.organizationId;
      
      const org = await prisma.organization.findUnique({ where: { id: orgId } });
      if (!org) return NextResponse.json({ error: 'Org not found' }, { status: 404 });

      // Check if already processed
      const existingSub = await prisma.subscriptionPayment.findFirst({ where: { reference } });
      if (existingSub) return NextResponse.json({ success: true, message: 'Already processed' });

      // Calculate new end date based on duration in months
      const durationInMonths = verifyResponse.data.metadata.durationInMonths || 1;
      const daysToAdd = durationInMonths * 30;

      // Extend subscription
      const currentEnd = org.currentPeriodEnd && org.currentPeriodEnd > new Date() 
        ? org.currentPeriodEnd 
        : new Date();
      
      const newPeriodEnd = new Date(currentEnd);
      newPeriodEnd.setDate(newPeriodEnd.getDate() + daysToAdd);

      await prisma.$transaction([
        prisma.organization.update({
          where: { id: org.id },
          data: {
            subscriptionStatus: 'ACTIVE',
            currentPeriodEnd: newPeriodEnd,
          }
        }),
        prisma.subscriptionPayment.create({
          data: {
            organizationId: org.id,
            amount: amountPaidGHS,
            reference: reference,
            status: 'SUCCESS'
          }
        })
      ]);

      return NextResponse.json({ success: true, message: 'Subscription upgraded successfully' });
    }

    // --- 4. RIDER INSTALLMENT PAYMENT ---
    const parts = reference.split('_');
    if (parts[0] === 'PAY' && parts.length >= 2) {
      const agreementId = parts[1];

      const agreement = await prisma.agreement.findUnique({
        where: { id: agreementId },
        include: { hirer: true, payments: true, organization: true },
      });

      if (!agreement) {
        return NextResponse.json({ error: 'Agreement not found' }, { status: 404 });
      }

      // Extract principal amount (without the 2% fee)
      const totalAmountPaid = amountPaidGHS;
      const principalAmount = verifyResponse.data.metadata?.principalAmount 
        ? Number(verifyResponse.data.metadata.principalAmount)
        : totalAmountPaid / 1.02; // Fallback if metadata is missing

      // Record Payment
      const payment = await prisma.payment.create({
        data: {
          amount: principalAmount,
          datePaid: new Date(),
          channel: 'MOMO',
          reference: reference,
          note: `Auto-reconciled (Paid GH₵${totalAmountPaid.toFixed(2)} total inc. 2% fee)`,
          recordedBy: 'SYSTEM',
          agreementId: agreement.id,
          organizationId: agreement.organizationId,
        },
      });

      const updatedAgreement = await prisma.agreement.findUnique({
        where: { id: agreement.id },
        include: { payments: true }
      });

      if (updatedAgreement) {
        const summary = calculateAgreementSummary(updatedAgreement);
        
        await notifications.sendPaymentReceived(
          { name: agreement.hirer.name, phone: agreement.hirer.phone, email: agreement.hirer.email },
          { amount: payment.amount.toNumber(), channel: 'MOMO' },
          summary.balanceRemaining
        );

        if (summary.balanceRemaining <= 0) {
          await notifications.sendFullyPaidMilestone(
            { name: agreement.hirer.name, phone: agreement.hirer.phone, email: agreement.hirer.email },
            agreement.organization.contactEmail,
            agreement.hirer.name,
            agreement.vehicleId
          );
        }
      }

      return NextResponse.json({ success: true, message: 'Payment recorded successfully' });
    }

    return NextResponse.json({ success: true, message: 'Payment verified but not an installment' });

  } catch (error: any) {
    console.error('Verify error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
