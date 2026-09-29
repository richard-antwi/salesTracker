import { NextResponse } from 'next/server';
import { getCurrentSession } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET() {
  try {
    const session = await getCurrentSession();
    if (!session || session.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Forbidden: Super Admin access required' }, { status: 403 });
    }

    const [
      subscriptionPayments,
      pastDueOrgs,
      riderPayments,
      withdrawals,
      organizations,
    ] = await Promise.all([
      // 1. All SaaS subscription payments from Fleet Owners
      prisma.subscriptionPayment.findMany({
        include: {
          organization: {
            select: { id: true, name: true, slug: true, contactEmail: true, contactPhone: true, subscriptionStatus: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),

      // 2. Past due / Expired Fleets
      prisma.organization.findMany({
        where: {
          status: 'APPROVED',
          OR: [
            { subscriptionStatus: 'PAST_DUE' },
            {
              currentPeriodEnd: { lt: new Date() },
              subscriptionStatus: 'ACTIVE',
            },
          ],
        },
        select: {
          id: true,
          name: true,
          slug: true,
          contactEmail: true,
          contactPhone: true,
          subscriptionStatus: true,
          currentPeriodEnd: true,
          trialEndsAt: true,
        },
      }),

      // 3. All Rider Payments across all contracts (Ledger)
      prisma.payment.findMany({
        take: 300,
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

      // 4. Withdrawal / Payout requests
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
            },
          },
        },
      }),

      // 5. Fleet Organizations list
      prisma.organization.findMany({
        select: {
          id: true,
          name: true,
          status: true,
          payoutNetwork: true,
          payoutAccountName: true,
          payoutAccountNumber: true,
        },
      }),
    ]);

    // Financial Computations
    const totalSubscriptionRevenue = subscriptionPayments.reduce((sum, p) => sum + Number(p.amount), 0);
    const totalRiderPaymentsCollected = riderPayments.filter((p) => !p.voided).reduce((sum, p) => sum + Number(p.amount), 0);
    const pendingWithdrawalsTotal = withdrawals
      .filter((w) => w.status === 'PENDING')
      .reduce((sum, w) => sum + Number(w.amount), 0);

    return NextResponse.json({
      subscriptionPayments,
      pastDueOrgs,
      riderPayments,
      withdrawals,
      organizations,
      metrics: {
        totalSubscriptionRevenue,
        totalRiderPaymentsCollected,
        pendingWithdrawalsTotal,
        pastDueCount: pastDueOrgs.length,
      },
    });
  } catch (error: any) {
    console.error('Error fetching enterprise finance data:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
