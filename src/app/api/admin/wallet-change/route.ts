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
    const { newNetwork, newAccountName, newAccountNumber } = body;

    if (!newNetwork || !newAccountName || !newAccountNumber) {
      return NextResponse.json({ error: 'All wallet fields are required' }, { status: 400 });
    }

    // Check if there is already a pending request
    const existing = await prisma.walletChangeRequest.findFirst({
      where: {
        organizationId: session.organizationId,
        status: 'PENDING'
      }
    });

    if (existing) {
      return NextResponse.json({ error: 'You already have a pending wallet change request.' }, { status: 400 });
    }

    const requestLog = await prisma.walletChangeRequest.create({
      data: {
        organizationId: session.organizationId,
        requestedBy: session.userId,
        newNetwork,
        newAccountName,
        newAccountNumber,
        status: 'PENDING'
      }
    });

    // TODO: Send email to Super Admin

    return NextResponse.json({ success: true, request: requestLog });
  } catch (error) {
    console.error('Error requesting wallet change:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
