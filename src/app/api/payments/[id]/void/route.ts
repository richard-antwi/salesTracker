import { NextResponse } from 'next/server';
import { getCurrentSession } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getCurrentSession();
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const { id: paymentId } = await params;
    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
    });

    if (!payment) {
      return NextResponse.json({ error: 'Payment record not found' }, { status: 404 });
    }

    // Toggle or set voided to true (soft delete)
    const updatedPayment = await prisma.payment.update({
      where: { id: paymentId },
      data: {
        voided: true,
        note: payment.note
          ? `${payment.note} (Voided by Admin ${session.name} on ${new Date().toISOString()})`
          : `Voided by Admin ${session.name} on ${new Date().toISOString()}`,
      },
    });

    return NextResponse.json({
      payment: updatedPayment,
      message: 'Payment voided successfully (soft-deleted with audit trail)',
    });
  } catch (error) {
    console.error('Error voiding payment:', error);
    return NextResponse.json({ error: 'Failed to void payment' }, { status: 500 });
  }
}
