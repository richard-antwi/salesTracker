import { NextResponse } from 'next/server';
import { getCurrentSession } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function POST(req: Request) {
  try {
    const session = await getCurrentSession();
    if (!session || session.role !== 'ADMIN' || !session.organizationId) {
      return NextResponse.json({ error: 'Unauthorized: Admin access required' }, { status: 401 });
    }

    const body = await req.json();
    const { newNetwork, newAccountName, newAccountNumber } = body;

    if (!newNetwork || !newAccountName || !newAccountNumber) {
      return NextResponse.json({ error: 'All wallet fields (Network, Account Name, Account Number) are required' }, { status: 400 });
    }

    // Check if there is already a pending request
    const existingPending = await prisma.walletChangeRequest.findFirst({
      where: {
        organizationId: session.organizationId,
        status: 'PENDING',
      },
    });

    if (existingPending) {
      // Update existing pending request
      const updated = await prisma.walletChangeRequest.update({
        where: { id: existingPending.id },
        data: {
          newNetwork: newNetwork.trim(),
          newAccountName: newAccountName.trim(),
          newAccountNumber: newAccountNumber.trim(),
          requestedBy: session.userName || session.userId,
        },
      });
      return NextResponse.json({ success: true, walletChangeRequest: updated, message: 'Wallet change request updated and awaiting Super Admin approval.' });
    }

    // Create a new pending wallet change request
    const walletChangeRequest = await prisma.walletChangeRequest.create({
      data: {
        organizationId: session.organizationId,
        requestedBy: session.userName || session.userId,
        newNetwork: newNetwork.trim(),
        newAccountName: newAccountName.trim(),
        newAccountNumber: newAccountNumber.trim(),
        status: 'PENDING',
      },
    });

    return NextResponse.json({
      success: true,
      walletChangeRequest,
      message: 'Wallet change request submitted! Super Admin must approve this change to prevent scam withdrawals.',
    });
  } catch (error: any) {
    console.error('Admin Wallet Change POST Error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
