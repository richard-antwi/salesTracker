import { NextResponse } from 'next/server';
import { getCurrentSession } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET() {
  try {
    const session = await getCurrentSession();
    if (!session || session.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Unauthorized: Super Admin access required' }, { status: 401 });
    }

    const logs = await prisma.smsLog.findMany({
      take: 100,
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ logs });
  } catch (error: any) {
    console.error('Error fetching SMS logs:', error);
    return NextResponse.json({ error: 'Failed to fetch SMS logs', details: error.message }, { status: 500 });
  }
}
