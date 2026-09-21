import { NextResponse } from 'next/server';
import { getCurrentSession } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET() {
  try {
    const session = await getCurrentSession();
    if (!session || session.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // 1. Get all subscription payments
    const payments = await prisma.subscriptionPayment.findMany({
      include: {
        organization: {
          select: { name: true, slug: true, subscriptionStatus: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // 2. Get past due organizations
    const pastDueOrgs = await prisma.organization.findMany({
      where: {
        status: 'APPROVED',
        OR: [
          { subscriptionStatus: 'PAST_DUE' },
          { 
            currentPeriodEnd: { lt: new Date() },
            subscriptionStatus: 'ACTIVE'
          }
        ]
      },
      select: {
        id: true,
        name: true,
        slug: true,
        subscriptionStatus: true,
        currentPeriodEnd: true,
        trialEndsAt: true
      }
    });

    // 3. Calculate total revenue
    const totalRevenue = payments.reduce((sum, p) => sum + Number(p.amount), 0);

    return NextResponse.json({
      payments,
      pastDueOrgs,
      totalRevenue
    });
  } catch (error) {
    console.error('Error fetching finance data:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
