import { NextResponse } from 'next/server';
import { getCurrentSession } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function POST(request: Request) {
  try {
    const session = await getCurrentSession();
    if (!session || session.role !== 'ADMIN' || !session.organizationId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const amount = Number(body.amount);

    if (!amount || isNaN(amount) || amount <= 0) {
      return NextResponse.json({ error: 'Invalid withdrawal amount' }, { status: 400 });
    }

    // Double check balance
    const digitalPayments = await prisma.payment.aggregate({
      where: {
        organizationId: session.organizationId,
        voided: false,
        channel: { in: ['MOMO', 'BANK'] }
      },
      _sum: { amount: true }
    });

    const totalDigitalCollected = Number(digitalPayments._sum.amount || 0);

    const withdrawals = await prisma.withdrawalRequest.aggregate({
      where: {
        organizationId: session.organizationId,
        status: { in: ['APPROVED', 'PENDING'] }
      },
      _sum: { amount: true }
    });

    const totalWithdrawn = Number(withdrawals._sum.amount || 0);
    const balance = totalDigitalCollected - totalWithdrawn;

    if (amount > balance) {
      return NextResponse.json({ error: 'Insufficient balance' }, { status: 400 });
    }

    const withdrawal = await prisma.withdrawalRequest.create({
      data: {
        organizationId: session.organizationId,
        amount,
        requestedBy: session.userId,
        status: 'PENDING',
      }
    });

    return NextResponse.json({ success: true, withdrawal });
  } catch (error) {
    console.error('Withdrawal request error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
