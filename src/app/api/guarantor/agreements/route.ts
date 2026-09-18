import { NextResponse } from 'next/server';
import { getCurrentSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { calculateAgreementSummary } from '@/lib/calculations';

export async function GET() {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.role !== 'GUARANTOR' && session.role !== 'SUPER_ADMIN' && session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden: Guarantor access required' }, { status: 403 });
    }

    const whereCondition: any = {};
    if (session.role !== 'SUPER_ADMIN' && session.organizationId) {
      whereCondition.organizationId = session.organizationId;
    }

    // Match guarantor by phone number (guarantor1Phone or guarantor2Phone)
    if (session.role === 'GUARANTOR') {
      whereCondition.OR = [
        { guarantor1Phone: session.phone },
        { guarantor2Phone: session.phone },
      ];
    }

    const agreements = await prisma.agreement.findMany({
      where: whereCondition,
      include: {
        hirer: {
          select: {
            id: true,
            name: true,
            phone: true,
            email: true,
          },
        },
        vehicle: true,
        payments: {
          where: { voided: false },
          orderBy: { datePaid: 'desc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const agreementsWithSummary = agreements.map((agr) => ({
      ...agr,
      summary: calculateAgreementSummary(agr),
    }));

    return NextResponse.json({ agreements: agreementsWithSummary });
  } catch (error: any) {
    console.error('Error fetching guarantor agreements:', error);
    return NextResponse.json({ error: 'Failed to fetch guarantor agreements' }, { status: 500 });
  }
}
