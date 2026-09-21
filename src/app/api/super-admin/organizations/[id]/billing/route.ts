import { NextResponse } from 'next/server';
import { getCurrentSession } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getCurrentSession();
    if (!session || session.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Forbidden: Platform Super Admin access required' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const { action } = body;

    const organization = await prisma.organization.findUnique({
      where: { id }
    });

    if (!organization) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    const updateData: any = {};

    if (action === 'GRANT_LIFETIME') {
      updateData.subscriptionStatus = 'ACTIVE';
      const lifetimeEnd = new Date();
      lifetimeEnd.setFullYear(2099);
      updateData.currentPeriodEnd = lifetimeEnd;
    } else if (action === 'GRANT_30_DAYS') {
      updateData.subscriptionStatus = 'ACTIVE';
      const currentEnd = organization.currentPeriodEnd && organization.currentPeriodEnd > new Date()
        ? organization.currentPeriodEnd
        : new Date();
      const newEnd = new Date(currentEnd);
      newEnd.setDate(newEnd.getDate() + 30);
      updateData.currentPeriodEnd = newEnd;
    } else if (action === 'REVOKE_ACCESS') {
      updateData.subscriptionStatus = 'PAST_DUE';
      updateData.currentPeriodEnd = new Date();
    } else {
      return NextResponse.json({ error: 'Invalid billing action' }, { status: 400 });
    }

    const updatedOrg = await prisma.organization.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({
      organization: updatedOrg,
      message: `Organization billing overridden successfully`,
    });
  } catch (error) {
    console.error('Error overriding organization billing:', error);
    return NextResponse.json({ error: 'Failed to override organization billing' }, { status: 500 });
  }
}
