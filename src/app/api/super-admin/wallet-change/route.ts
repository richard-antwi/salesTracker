import { NextResponse } from 'next/server';
import { getCurrentSession } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function POST(req: Request) {
  try {
    const session = await getCurrentSession();
    if (!session || session.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Forbidden: Super Admin access required' }, { status: 403 });
    }

    const body = await req.json();
    const { id, status } = body;

    if (!id || !['APPROVED', 'REJECTED'].includes(status)) {
      return NextResponse.json({ error: 'Invalid request: Request ID and valid status (APPROVED or REJECTED) required' }, { status: 400 });
    }

    const walletRequest = await prisma.walletChangeRequest.findUnique({
      where: { id },
      include: { organization: true },
    });

    if (!walletRequest) {
      return NextResponse.json({ error: 'Wallet change request not found' }, { status: 404 });
    }

    if (walletRequest.status !== 'PENDING') {
      return NextResponse.json({ error: `Request has already been ${walletRequest.status.toLowerCase()}` }, { status: 400 });
    }

    if (status === 'APPROVED') {
      // Execute transaction: update organization verified payout wallet and set request status to APPROVED
      await prisma.$transaction([
        prisma.organization.update({
          where: { id: walletRequest.organizationId },
          data: {
            payoutNetwork: walletRequest.newNetwork,
            payoutAccountName: walletRequest.newAccountName,
            payoutAccountNumber: walletRequest.newAccountNumber,
          },
        }),
        prisma.walletChangeRequest.update({
          where: { id },
          data: {
            status: 'APPROVED',
            resolvedAt: new Date(),
          },
        }),
      ]);

      return NextResponse.json({
        success: true,
        message: `Wallet update approved! Verified payout account set to ${walletRequest.newAccountName} (${walletRequest.newNetwork} - ${walletRequest.newAccountNumber})`,
      });
    } else {
      // Reject request
      await prisma.walletChangeRequest.update({
        where: { id },
        data: {
          status: 'REJECTED',
          resolvedAt: new Date(),
        },
      });

      return NextResponse.json({
        success: true,
        message: 'Wallet change request rejected.',
      });
    }
  } catch (error: any) {
    console.error('Super Admin Wallet Change Approval Error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
