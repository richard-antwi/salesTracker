import { NextResponse } from 'next/server';
import { getCurrentSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { calculateAgreementSummary } from '@/lib/calculations';

export async function GET() {
  try {
    const session = await getCurrentSession();
    if (!session || session.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Forbidden: Super Admin access required' }, { status: 403 });
    }

    // Parallel high-performance Prisma queries using optimized indexes
    const [
      rawOrganizations,
      rawAgreements,
      rawVehicles,
      rawPayments,
      rawUsers,
      withdrawals,
      walletChanges,
      settings,
    ] = await Promise.all([
      // 1. Organizations
      prisma.organization.findMany({
        orderBy: { createdAt: 'desc' },
        include: {
          _count: {
            select: {
              users: true,
              vehicles: true,
              agreements: true,
              payments: true,
            },
          },
        },
      }),

      // 2. All Agreements
      prisma.agreement.findMany({
        orderBy: { createdAt: 'desc' },
        include: {
          organization: { select: { id: true, name: true, slug: true } },
          hirer: { select: { id: true, name: true, phone: true, email: true } },
          vehicle: true,
          payments: {
            orderBy: { datePaid: 'desc' },
          },
        },
      }),

      // 3. All Vehicles
      prisma.vehicle.findMany({
        orderBy: { registrationNo: 'asc' },
        include: {
          organization: { select: { id: true, name: true } },
          agreement: {
            include: {
              hirer: { select: { name: true, phone: true } },
            },
          },
        },
      }),

      // 4. Recent Payments Ledger (Top 250)
      prisma.payment.findMany({
        take: 250,
        orderBy: { datePaid: 'desc' },
        include: {
          organization: { select: { id: true, name: true } },
          agreement: {
            select: {
              id: true,
              vehicle: { select: { registrationNo: true, makeModel: true } },
              hirer: { select: { name: true, phone: true } },
            },
          },
        },
      }),

      // 5. System Users Directory
      prisma.user.findMany({
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          phone: true,
          email: true,
          role: true,
          mustChangePassword: true,
          createdAt: true,
          organization: { select: { id: true, name: true } },
        },
      }),

      // 6. Withdrawal Requests
      prisma.withdrawalRequest.findMany({
        orderBy: { createdAt: 'desc' },
        include: {
          organization: {
            select: {
              id: true,
              name: true,
              payoutNetwork: true,
              payoutAccountName: true,
              payoutAccountNumber: true,
              contactEmail: true,
              contactPhone: true,
            },
          },
        },
      }),

      // 7. Wallet Change Requests
      prisma.walletChangeRequest.findMany({
        orderBy: { createdAt: 'desc' },
        include: {
          organization: {
            select: {
              id: true,
              name: true,
              payoutNetwork: true,
              payoutAccountName: true,
              payoutAccountNumber: true,
              contactEmail: true,
              contactPhone: true,
            },
          },
        },
      }),

      // 8. Global System Settings
      prisma.systemSettings.findFirst(),
    ]);

    // Process calculated summaries for all agreements
    const agreements = rawAgreements.map((ag) => {
      const summary = calculateAgreementSummary(ag);
      return {
        ...ag,
        summary,
      };
    });

    // Compute Executive KPI Totals
    let totalGMV = 0;
    let totalCollected = 0;
    let totalRemaining = 0;
    let activeContractsCount = 0;
    let overdueContractsCount = 0;

    agreements.forEach((ag) => {
      totalGMV += ag.summary.hirePurchasePrice;
      totalCollected += ag.summary.totalPaid;
      totalRemaining += ag.summary.balanceRemaining;
      if (ag.status === 'ACTIVE') activeContractsCount++;
      if (ag.summary.statusBadge.variant === 'warning' || ag.summary.statusBadge.variant === 'danger') {
        overdueContractsCount++;
      }
    });

    const pendingOrgsCount = rawOrganizations.filter((o) => o.status === 'PENDING').length;
    const pendingWithdrawalsCount = withdrawals.filter((w) => w.status === 'PENDING').length;
    const pendingWalletChangesCount = walletChanges.filter((wc) => wc.status === 'PENDING').length;

    return NextResponse.json({
      metrics: {
        totalGMV,
        totalCollected,
        totalRemaining,
        collectionRatePercent: totalGMV > 0 ? Math.round((totalCollected / totalGMV) * 100) : 0,
        activeContractsCount,
        overdueContractsCount,
        totalOrganizationsCount: rawOrganizations.length,
        totalVehiclesCount: rawVehicles.length,
        totalUsersCount: rawUsers.length,
        pendingOrgsCount,
        pendingWithdrawalsCount,
        pendingWalletChangesCount,
      },
      organizations: rawOrganizations,
      agreements,
      vehicles: rawVehicles,
      payments: rawPayments,
      users: rawUsers,
      withdrawals,
      walletChanges,
      settings: settings || { monthlySubscriptionFee: 50 },
    });
  } catch (error: any) {
    console.error('Error fetching global super admin data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch global enterprise data', details: error.message },
      { status: 500 }
    );
  }
}
