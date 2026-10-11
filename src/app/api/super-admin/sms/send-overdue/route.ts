import { NextResponse } from 'next/server';
import { getCurrentSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { calculateAgreementSummary } from '@/lib/calculations';
import { notifications } from '@/lib/notifications';
import { CONFIG } from '@/lib/config';

export async function POST(request: Request) {
  try {
    const session = await getCurrentSession();
    if (!session || session.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Unauthorized: Super Admin access required' }, { status: 401 });
    }

    const body = await request.json();
    const { agreementId, riderId } = body;

    if (!agreementId && !riderId) {
      return NextResponse.json({ error: 'Must provide agreementId or riderId' }, { status: 400 });
    }

    // Find agreement
    const agreement = await prisma.agreement.findFirst({
      where: agreementId
        ? { id: agreementId }
        : { hirerId: riderId, status: 'ACTIVE' },
      include: {
        hirer: true,
        vehicle: true,
        organization: true,
        payments: true,
      },
    });

    if (!agreement) {
      return NextResponse.json({ error: 'Active agreement not found for rider' }, { status: 404 });
    }

    const summary = calculateAgreementSummary(agreement);

    // Dispatch Overdue Alert (SMS to Rider ONLY, Email to Fleet Owner and Platform Owner)
    await notifications.sendOverdueAlert({
      hirer: {
        name: agreement.hirer.name,
        phone: agreement.hirer.phone,
        email: agreement.hirer.email,
      },
      vehicleReg: agreement.vehicle.registrationNo,
      daysOverdue: summary.statusBadge.daysOverdue,
      balanceRemaining: summary.balanceRemaining,
      fleetOwnerEmail: agreement.organization?.contactEmail,
      platformOwnerEmail: CONFIG.ADMIN_EMAIL,
    });

    return NextResponse.json({
      success: true,
      riderName: agreement.hirer.name,
      phone: agreement.hirer.phone,
      vehicleReg: agreement.vehicle.registrationNo,
      daysOverdue: summary.statusBadge.daysOverdue,
      balanceRemaining: summary.balanceRemaining,
    });
  } catch (error: any) {
    console.error('Error sending manual overdue alert:', error);
    return NextResponse.json({ error: 'Failed to send overdue alert', details: error.message }, { status: 500 });
  }
}
