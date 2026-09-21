import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { prisma } from '@/lib/db';
import { notifications } from '@/lib/notifications';
import { calculateAgreementSummary } from '@/lib/calculations';
import { CONFIG } from '@/lib/config';

export async function POST(request: Request) {
  try {
    const rawBody = await request.text();
    const signature = request.headers.get('x-paystack-signature');

    if (!signature) {
      return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
    }

    // Verify Signature
    if (CONFIG.PAYSTACK_SECRET_KEY) {
      const hash = crypto.createHmac('sha512', CONFIG.PAYSTACK_SECRET_KEY).update(rawBody).digest('hex');
      if (hash !== signature) {
        console.error('Invalid Paystack Webhook Signature');
        return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
      }
    }

    const event = JSON.parse(rawBody);
    console.log('📬 [Paystack Webhook] Event:', event.event);

    if (event.event !== 'charge.success') {
      // Return 200 to acknowledge receipt of other events
      return NextResponse.json({ received: true });
    }

    const { reference, amount, metadata } = event.data; 
    const paymentAmount = Number(amount) / 100;
    
    // --- 1. SAAS SUBSCRIPTION PAYMENT ---
    if (metadata?.type === 'SAAS_SUBSCRIPTION' && metadata?.organizationId) {
      console.log(`✅ [Webhook] SaaS Subscription Payment for Org: ${metadata.organizationId}`);
      
      const org = await prisma.organization.findUnique({ where: { id: metadata.organizationId } });
      if (!org) return NextResponse.json({ error: 'Org not found' }, { status: 404 });

      // Extend subscription by 30 days
      const currentEnd = org.currentPeriodEnd && org.currentPeriodEnd > new Date() 
        ? org.currentPeriodEnd 
        : new Date();
      
      const newPeriodEnd = new Date(currentEnd);
      newPeriodEnd.setDate(newPeriodEnd.getDate() + 30);

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
            amount: paymentAmount,
            reference: reference,
            status: 'SUCCESS'
          }
        })
      ]);

      return NextResponse.json({ received: true });
    }

    // --- 2. RIDER INSTALLMENT PAYMENT ---
    const parts = reference.split('_');
    if (parts.length < 2 || parts[0] !== 'PAY') {
       console.error(`Invalid reference format: ${reference}`);
       return NextResponse.json({ received: true });
    }
    const agreementId = parts[1];

    // 1. Find the agreement
    const agreement = await prisma.agreement.findUnique({
      where: { id: agreementId },
      include: {
        hirer: true,
        payments: true,
        organization: true,
      },
    });

    if (!agreement) {
      console.error(`Agreement not found for ID: ${agreementId}`);
      return NextResponse.json({ received: true });
    }

    // 2. Prevent duplicate processing (idempotency check)
    const existingPayment = await prisma.payment.findFirst({
      where: { reference }
    });

    if (existingPayment) {
      console.log(`Payment already processed for Ref: ${reference}`);
      return NextResponse.json({ received: true });
    }

    // 3. Record the payment
    const payment = await prisma.payment.create({
      data: {
        amount: paymentAmount,
        datePaid: new Date(),
        channel: 'MOMO', // Paystack handles MoMo/Card, we just label it digital/MOMO
        reference: reference,
        note: 'Auto-reconciled via Paystack Gateway',
        recordedBy: 'SYSTEM',
        agreementId: agreement.id,
        organizationId: agreement.organizationId,
      },
    });

    // 4. Calculate new balance for notification
    const updatedAgreement = await prisma.agreement.findUnique({
      where: { id: agreement.id },
      include: { payments: true }
    });

    if (updatedAgreement) {
      const summary = calculateAgreementSummary(updatedAgreement);
      
      // Send receipt notification
      await notifications.sendPaymentReceived(
        { name: agreement.hirer.name, phone: agreement.hirer.phone, email: agreement.hirer.email },
        { amount: payment.amount.toNumber(), channel: 'MOMO' },
        summary.balanceRemaining
      );

      // Check if fully paid milestone reached
      if (summary.balanceRemaining <= 0) {
        await notifications.sendFullyPaidMilestone(
          { name: agreement.hirer.name, phone: agreement.hirer.phone, email: agreement.hirer.email },
          agreement.organization.contactEmail,
          agreement.hirer.name,
          agreement.vehicleId
        );
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Error processing Paystack Webhook:', error);
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}
