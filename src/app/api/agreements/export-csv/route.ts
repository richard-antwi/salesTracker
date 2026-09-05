import { NextResponse } from 'next/server';
import { getCurrentSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { generateAgreementsCSV } from '@/lib/csv';

export async function GET() {
  try {
    const session = await getCurrentSession();
    if (!session || (session.role !== 'ADMIN' && session.role !== 'SUPER_ADMIN')) {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const whereClause: any = {};
    if (session.role !== 'SUPER_ADMIN') {
      if (!session.organizationId) {
        return NextResponse.json({ error: 'Forbidden: No organization assigned' }, { status: 403 });
      }
      whereClause.organizationId = session.organizationId;
    }

    const agreements = await prisma.agreement.findMany({
      where: whereClause,
      include: {
        hirer: { select: { name: true, phone: true } },
        vehicle: { select: { registrationNo: true, makeModel: true } },
        payments: { orderBy: { datePaid: 'desc' } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const csvContent = generateAgreementsCSV(agreements);
    const dateStr = new Date().toISOString().split('T')[0];

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="work_and_pay_portfolio_${dateStr}.csv"`,
      },
    });
  } catch (error) {
    console.error('Error generating portfolio CSV:', error);
    return NextResponse.json({ error: 'Failed to generate CSV' }, { status: 500 });
  }
}
