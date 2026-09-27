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

    // --- RIDER INSTALLMENT PAYMENT ---
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

      // Record Payment
      const payment = await prisma.payment.create({
        data: {
          amount: amountPaidGHS,
          datePaid: new Date(),
          channel: 'MOMO',
          reference: reference,
          note: 'Auto-reconciled via Paystack Verification API',
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
