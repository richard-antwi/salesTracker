import { NextResponse } from 'next/server';
import { getCurrentSession } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET() {
  try {
    const session = await getCurrentSession();
    if (!session || session.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Unauthorized: Super Admin access required' }, { status: 401 });
    }

    const riders = await prisma.user.findMany({
      where: { role: 'RIDER' },
      select: {
        id: true,
        name: true,
        phone: true,
        email: true,
        receivePaymentSms: true,
        createdAt: true,
        organization: {
          select: {
            id: true,
            name: true,
          },
        },
        agreementsAsHirer: {
          select: {
            id: true,
            status: true,
            vehicle: {
              select: {
                registrationNo: true,
                makeModel: true,
              },
            },
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    return NextResponse.json({ riders });
  } catch (error: any) {
    console.error('Error fetching riders for SMS management:', error);
    return NextResponse.json({ error: 'Failed to fetch riders', details: error.message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await getCurrentSession();
    if (!session || session.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Unauthorized: Super Admin access required' }, { status: 401 });
    }

    const body = await request.json();
    const { riderId, riderIds, receivePaymentSms } = body;

    if (typeof receivePaymentSms !== 'boolean') {
      return NextResponse.json({ error: 'receivePaymentSms boolean is required' }, { status: 400 });
    }

    if (riderId) {
      const updated = await prisma.user.update({
        where: { id: riderId },
        data: { receivePaymentSms },
        select: { id: true, name: true, phone: true, receivePaymentSms: true },
      });
      return NextResponse.json({ success: true, updated });
    }

    if (Array.isArray(riderIds) && riderIds.length > 0) {
      await prisma.user.updateMany({
        where: { id: { in: riderIds } },
        data: { receivePaymentSms },
      });
      return NextResponse.json({ success: true, count: riderIds.length });
    }

    return NextResponse.json({ error: 'riderId or riderIds array is required' }, { status: 400 });
  } catch (error: any) {
    console.error('Error updating rider SMS configuration:', error);
    return NextResponse.json({ error: 'Failed to update rider SMS status', details: error.message }, { status: 500 });
  }
}
