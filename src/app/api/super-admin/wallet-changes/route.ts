import { NextResponse } from 'next/server';
import { getCurrentSession } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET() {
  try {
    const session = await getCurrentSession();
    if (!session || session.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const requests = await prisma.walletChangeRequest.findMany({
      include: {
        organization: {
          select: {
            name: true,
            contactPhone: true,
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({ requests });
  } catch (error) {
    console.error('Error fetching wallet change requests:', error);
    return NextResponse.json({ error: 'Failed to fetch wallet change requests' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getCurrentSession();
    if (!session || session.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { id, status } = body;

    if (!id || !['APPROVED', 'REJECTED'].includes(status)) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    const walletRequest = await prisma.walletChangeRequest.findUnique({ where: { id } });
    if (!walletRequest) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    if (status === 'APPROVED') {
      // Update the organization's verified wallet as part of a transaction
      await prisma.$transaction([
        prisma.walletChangeRequest.update({
          where: { id },
          data: { status: 'APPROVED', resolvedAt: new Date() }
        }),
        prisma.organization.update({
          where: { id: walletRequest.organizationId },
          data: {
            payoutNetwork: walletRequest.newNetwork,
            payoutAccountName: walletRequest.newAccountName,
            payoutAccountNumber: walletRequest.newAccountNumber,
          }
        })
      ]);
    } else {
      await prisma.walletChangeRequest.update({
        where: { id },
        data: { status: 'REJECTED', resolvedAt: new Date() }
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating wallet change:', error);
    return NextResponse.json({ error: 'Failed to update wallet change' }, { status: 500 });
  }
}
