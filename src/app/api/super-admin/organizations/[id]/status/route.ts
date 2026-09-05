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
    const { status } = body;

    const allowedStatuses = ['APPROVED', 'REJECTED', 'SUSPENDED', 'PENDING'];
    if (!status || !allowedStatuses.includes(status)) {
      return NextResponse.json({ error: 'Invalid or missing status' }, { status: 400 });
    }

    const organization = await prisma.organization.findUnique({
      where: { id },
      include: {
        users: { where: { role: 'ADMIN' }, take: 1 },
      },
    });

    if (!organization) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    const updatedOrg = await prisma.organization.update({
      where: { id },
      data: { status: status as any },
    });

    if (status === 'APPROVED') {
      const { notifications } = await import('@/lib/notifications');
      const adminName = organization.users[0]?.name || 'Admin';
      await notifications.sendOrganizationApprovalNotification(
        { name: organization.name, contactEmail: organization.contactEmail },
        adminName
      );
    }

    return NextResponse.json({
      organization: updatedOrg,
      message: `Organization "${organization.name}" status updated to ${status}`,
    });
  } catch (error) {
    console.error('Error updating organization status:', error);
    return NextResponse.json({ error: 'Failed to update organization status' }, { status: 500 });
  }
}
