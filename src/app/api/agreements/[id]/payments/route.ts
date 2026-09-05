import { NextResponse } from 'next/server';
import { getCurrentSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { calculateAgreementSummary } from '@/lib/calculations';
import { notifications } from '@/lib/notifications';
import { CONFIG } from '@/lib/config';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getCurrentSession();
    if (!session || (session.role !== 'ADMIN' && session.role !== 'SUPER_ADMIN')) {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const { id: agreementId } = await params;
    const body = await request.json();
    const { amount, datePaid, channel, reference, note } = body;

    if (!amount || parseFloat(amount) <= 0) {
      return NextResponse.json({ error: 'Valid payment amount is required' }, { status: 400 });
    }

    const agreement = await prisma.agreement.findUnique({
      where: { id: agreementId },
      include: {
        hirer: true,
        vehicle: true,
        payments: true,
      },
    });

    if (!agreement) {
      return NextResponse.json({ error: 'Agreement not found' }, { status: 404 });
    }

    // Organization data isolation check
    if (session.role !== 'SUPER_ADMIN' && agreement.organizationId !== session.organizationId) {
      return NextResponse.json({ error: 'Forbidden: Cannot add payment to agreement outside organization' }, { status: 403 });
    }

    const payment = await prisma.payment.create({
      data: {
        organizationId: agreement.organizationId,
        agreementId,
        amount: parseFloat(amount),
        datePaid: datePaid ? new Date(datePaid) : new Date(),
        channel: channel || 'MOMO',
        reference: reference || null,
        note: note || null,
        recordedBy: session.userId,
        voided: false,
      },
    });

    // Fetch updated payments & summary
    const updatedPayments = [...agreement.payments, payment];
    const summary = calculateAgreementSummary({
      ...agreement,
      payments: updatedPayments,
    });

    // 1. Trigger Payment Received Notification (Rider)
    await notifications.sendPaymentReceived(
      agreement.hirer,
      { amount: parseFloat(amount), channel: payment.channel },
      summary.balanceRemaining
    );

    // 2. Trigger Fully Paid Milestone if balance hit 0
    if (summary.balanceRemaining <= 0) {
      await notifications.sendFullyPaidMilestone(
        agreement.hirer,
        CONFIG.ADMIN_EMAIL,
        agreement.hirer.name,
        agreement.vehicle.registrationNo
      );
    }

    return NextResponse.json({
      payment,
      summary,
      message: 'Payment recorded successfully',
    });
  } catch (error) {
    console.error('Error recording payment:', error);
    return NextResponse.json({ error: 'Failed to record payment' }, { status: 500 });
  }
}
