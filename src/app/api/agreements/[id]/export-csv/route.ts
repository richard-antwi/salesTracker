import { NextResponse } from 'next/server';
import { getCurrentSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { generatePaymentsCSV } from '@/lib/csv';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const agreement = await prisma.agreement.findUnique({
      where: { id },
      include: {
        hirer: { select: { name: true, phone: true } },
        vehicle: { select: { registrationNo: true } },
        payments: {
          orderBy: { datePaid: 'desc' },
        },
      },
    });

    if (!agreement) {
      return NextResponse.json({ error: 'Agreement not found' }, { status: 404 });
    }

    if (session.role === 'RIDER' && agreement.hirerId !== session.userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const csvContent = generatePaymentsCSV(agreement, agreement.payments);
    const regNoClean = agreement.vehicle.registrationNo.replace(/[^a-zA-Z0-9]/g, '_');

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="payments_${regNoClean}.csv"`,
      },
    });
  } catch (error) {
    console.error('Error generating payments CSV:', error);
    return NextResponse.json({ error: 'Failed to generate CSV' }, { status: 500 });
  }
}
