import { NextResponse } from 'next/server';
import { getCurrentSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { calculateAgreementSummary } from '@/lib/calculations';

export async function GET() {
  try {
    const session = await getCurrentSession();
    if (!session || session.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Unauthorized: Super Admin access required' }, { status: 401 });
    }

    const riders = await prisma.user.findMany({
      where: { role: 'RIDER' },
      select: {
        id: true,
        name: true,
        phone: true,
        email: true,
        receivePaymentSms: true,
        createdAt: true,
        organization: {
          select: {
            id: true,
            name: true,
          },
        },
        agreementsAsHirer: {
          where: { status: 'ACTIVE' },
          select: {
            id: true,
            status: true,
            startDate: true,
            frequency: true,
            totalInstallments: true,
            hirePurchasePrice: true,
            installmentAmount: true,
            gracePeriodDays: true,
            vehicle: {
              select: {
                registrationNo: true,
                makeModel: true,
              },
            },
            payments: {
              select: {
                amount: true,
                voided: true,
                datePaid: true,
                status: true,
              },
            },
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    const enrichedRiders = riders.map((rider) => {
      const activeAgr = rider.agreementsAsHirer[0];
      let overdueInfo: {
        agreementId?: string;
        vehicleReg?: string;
        isOverdue: boolean;
        daysOverdue: number;
        statusLabel: string;
        balanceRemaining: number;
      } = {
        isOverdue: false,
        daysOverdue: 0,
        statusLabel: 'No Active Agreement',
        balanceRemaining: 0,
      };

      if (activeAgr) {
        try {
          const summary = calculateAgreementSummary(activeAgr as any);
          const isOverdue = summary.statusBadge.daysOverdue > 0;
          overdueInfo = {
            agreementId: activeAgr.id,
            vehicleReg: activeAgr.vehicle?.registrationNo,
            isOverdue,
            daysOverdue: summary.statusBadge.daysOverdue,
            statusLabel: summary.statusBadge.label,
            balanceRemaining: summary.balanceRemaining,
          };
        } catch (e) {
          console.warn('Error calculating summary for rider agreement:', e);
        }
      }

      return {
        id: rider.id,
        name: rider.name,
        phone: rider.phone,
        email: rider.email,
        receivePaymentSms: rider.receivePaymentSms,
        createdAt: rider.createdAt,
        organization: rider.organization,
        activeAgreement: overdueInfo,
      };
    });

    return NextResponse.json({ riders: enrichedRiders });
  } catch (error: any) {
    console.error('Error fetching riders for SMS management:', error);
    return NextResponse.json({ error: 'Failed to fetch riders', details: error.message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await getCurrentSession();
    if (!session || session.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Unauthorized: Super Admin access required' }, { status: 401 });
    }

    const body = await request.json();
    const { riderId, riderIds, receivePaymentSms } = body;

    if (typeof receivePaymentSms !== 'boolean') {
      return NextResponse.json({ error: 'receivePaymentSms boolean is required' }, { status: 400 });
    }

    if (riderId) {
      const updated = await prisma.user.update({
        where: { id: riderId },
        data: { receivePaymentSms },
        select: { id: true, name: true, phone: true, receivePaymentSms: true },
      });
      return NextResponse.json({ success: true, updated });
    }

    if (Array.isArray(riderIds) && riderIds.length > 0) {
      await prisma.user.updateMany({
        where: { id: { in: riderIds } },
        data: { receivePaymentSms },
      });
      return NextResponse.json({ success: true, count: riderIds.length });
    }

    return NextResponse.json({ error: 'riderId or riderIds array is required' }, { status: 400 });
  } catch (error: any) {
    console.error('Error updating rider SMS configuration:', error);
    return NextResponse.json({ error: 'Failed to update rider SMS status', details: error.message }, { status: 500 });
  }
}
