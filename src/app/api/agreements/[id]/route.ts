import { NextResponse } from 'next/server';
import { getCurrentSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { calculateAgreementSummary } from '@/lib/calculations';

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
    const rawAgreement = await prisma.agreement.findUnique({
      where: { id },
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
          orderBy: { datePaid: 'desc' },
        },
        statusLogs: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!rawAgreement) {
      return NextResponse.json({ error: 'Agreement not found' }, { status: 404 });
    }

    // Organization data isolation check: Admins/Riders can only access agreements within their organization
    if (session.role !== 'SUPER_ADMIN' && rawAgreement.organizationId !== session.organizationId) {
      return NextResponse.json({ error: 'Forbidden access to this agreement' }, { status: 403 });
    }

    // Role-based authorization check: Riders can ONLY see their own agreement
    if (session.role === 'RIDER' && rawAgreement.hirerId !== session.userId) {
      return NextResponse.json({ error: 'Forbidden access to this agreement' }, { status: 403 });
    }

    const summary = calculateAgreementSummary(rawAgreement);

    const agreement = {
      ...rawAgreement,
      statusLogs: rawAgreement.statusLogs.map((log) => ({
        ...log,
        previousStatus: log.fromStatus,
        newStatus: log.toStatus,
        changedBy: { name: log.changedBy },
      })),
      summary,
    };

    return NextResponse.json({
      agreement,
    });
  } catch (error) {
    console.error('Error fetching agreement detail:', error);
    return NextResponse.json({ error: 'Failed to fetch agreement' }, { status: 500 });
  }
}
