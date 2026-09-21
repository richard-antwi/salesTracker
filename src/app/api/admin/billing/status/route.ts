import { NextResponse } from 'next/server';
import { getCurrentSession } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET() {
  try {
    const session = await getCurrentSession();
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!session.organizationId) {
      return NextResponse.json({ error: 'No organization' }, { status: 400 });
    }

    const org = await prisma.organization.findUnique({
      where: { id: session.organizationId },
      select: {
        subscriptionStatus: true,
        trialEndsAt: true,
        currentPeriodEnd: true,
      }
    });

    if (!org) {
      return NextResponse.json({ error: 'Org not found' }, { status: 404 });
    }

    let settings = await prisma.systemSettings.findUnique({ where: { id: 'global' } });
    if (!settings) {
      settings = await prisma.systemSettings.create({ data: { id: 'global', monthlySubscriptionFee: 50 } });
    }

    return NextResponse.json({
      organization: org,
      fee: settings.monthlySubscriptionFee
    });
  } catch (error) {
    console.error('Billing Status GET Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
