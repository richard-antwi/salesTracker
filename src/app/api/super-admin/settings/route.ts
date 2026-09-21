import { NextResponse } from 'next/server';
import { getCurrentSession } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET() {
  try {
    const session = await getCurrentSession();
    if (!session || session.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let settings = await prisma.systemSettings.findUnique({
      where: { id: 'global' },
    });

    if (!settings) {
      settings = await prisma.systemSettings.create({
        data: { id: 'global', monthlySubscriptionFee: 50 },
      });
    }

    return NextResponse.json(settings);
  } catch (error) {
    console.error('Settings GET Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getCurrentSession();
    if (!session || session.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { monthlySubscriptionFee } = await request.json();

    if (monthlySubscriptionFee === undefined || isNaN(Number(monthlySubscriptionFee))) {
      return NextResponse.json({ error: 'Invalid fee amount' }, { status: 400 });
    }

    const settings = await prisma.systemSettings.upsert({
      where: { id: 'global' },
      update: { monthlySubscriptionFee: Number(monthlySubscriptionFee) },
      create: { id: 'global', monthlySubscriptionFee: Number(monthlySubscriptionFee) },
    });

    return NextResponse.json(settings);
  } catch (error) {
    console.error('Settings POST Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
