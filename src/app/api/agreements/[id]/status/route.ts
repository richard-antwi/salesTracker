import { NextResponse } from 'next/server';
import { getCurrentSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { notifications } from '@/lib/notifications';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getCurrentSession();
    if (!session || (session.role !== 'ADMIN' && session.role !== 'SUPER_ADMIN')) {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const { newStatus, reason } = body;

    if (!newStatus || !['ACTIVE', 'COMPLETED', 'DEFAULTED', 'REPOSSESSED'].includes(newStatus)) {
      return NextResponse.json({ error: 'Invalid or missing new status' }, { status: 400 });
    }

    if (!reason || typeof reason !== 'string' || !reason.trim()) {
      return NextResponse.json({ error: 'Reason for status change is required' }, { status: 400 });
    }

    const existingAgreement = await prisma.agreement.findUnique({
      where: { id },
      include: {
        hirer: true,
        vehicle: true,
      },
    });

    if (!existingAgreement) {
      return NextResponse.json({ error: 'Agreement not found' }, { status: 404 });
    }

    // Organization data isolation check
    if (session.role !== 'SUPER_ADMIN' && existingAgreement.organizationId !== session.organizationId) {
      return NextResponse.json({ error: 'Forbidden: Access denied to agreement outside organization' }, { status: 403 });
    }

    const previousStatus = existingAgreement.status;

    // Execute status change & audit log in a transaction
    const [updatedAgreement, statusLog] = await prisma.$transaction([
      prisma.agreement.update({
        where: { id },
        data: { status: newStatus },
      }),
      prisma.statusChangeLog.create({
        data: {
          organizationId: existingAgreement.organizationId,
          agreementId: id,
          fromStatus: previousStatus,
          toStatus: newStatus,
          reason: reason.trim(),
          changedBy: session.name || session.userId,
        },
      }),
    ]);

    // Send notifications if status changed to DEFAULTED or REPOSSESSED
    if (newStatus === 'DEFAULTED' || newStatus === 'REPOSSESSED') {
      await notifications.sendAgreementStatusChangedNotification(
        {
          name: existingAgreement.hirer.name,
          email: existingAgreement.hirer.email,
          phone: existingAgreement.hirer.phone,
        },
        existingAgreement.vehicle.registrationNo,
        newStatus,
        reason.trim()
      );
    }

    return NextResponse.json({
      agreement: updatedAgreement,
      statusLog,
      message: `Agreement status updated from ${previousStatus} to ${newStatus}`,
    });
  } catch (error) {
    console.error('Error updating agreement status:', error);
    return NextResponse.json({ error: 'Failed to update status' }, { status: 500 });
  }
}
