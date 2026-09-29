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
      statusLogs: (rawAgreement.statusLogs || []).map((log) => ({
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
  } catch (error: any) {
    console.error('Error fetching agreement detail:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch agreement';
    return NextResponse.json({ error: errorMessage, stack: error?.stack }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getCurrentSession();
    if (!session || (session.role !== 'ADMIN' && session.role !== 'SUPER_ADMIN')) {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const { id } = await params;
    const existing = await prisma.agreement.findUnique({
      where: { id },
      include: { vehicle: true, hirer: true },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Agreement not found' }, { status: 404 });
    }

    if (session.role !== 'SUPER_ADMIN' && existing.organizationId !== session.organizationId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const {
      ownerName,
      ownerPhone,
      guarantor1Name,
      guarantor1Phone,
      guarantor2Name,
      guarantor2Phone,
      cashPrice,
      hirePurchasePrice,
      installmentAmount,
      frequency,
      totalInstallments,
      startDate,
      enableLateFee,
      lateFeeType,
      lateFeeAmount,
      gracePeriodDays,
      vehicle,
      hirer,
    } = body;

    // Update hirer if passed
    if (hirer && existing.hirerId) {
      await prisma.user.update({
        where: { id: existing.hirerId },
        data: {
          name: hirer.name ?? existing.hirer.name,
          phone: hirer.phone ?? existing.hirer.phone,
          email: hirer.email !== undefined ? hirer.email : existing.hirer.email,
        },
      });
    }

    // Update vehicle if passed
    if (vehicle && existing.vehicleId) {
      await prisma.vehicle.update({
        where: { id: existing.vehicleId },
        data: {
          makeModel: vehicle.makeModel ?? existing.vehicle.makeModel,
          registrationNo: vehicle.registrationNo ?? existing.vehicle.registrationNo,
          chassisNo: vehicle.chassisNo !== undefined ? vehicle.chassisNo : existing.vehicle.chassisNo,
          engineNo: vehicle.engineNo !== undefined ? vehicle.engineNo : existing.vehicle.engineNo,
          colorYear: vehicle.colorYear !== undefined ? vehicle.colorYear : existing.vehicle.colorYear,
        },
      });
    }

    // Update agreement terms
    const updatedAgreement = await prisma.agreement.update({
      where: { id },
      data: {
        ownerName: ownerName ?? existing.ownerName,
        ownerPhone: ownerPhone ?? existing.ownerPhone,
        guarantor1Name: guarantor1Name !== undefined ? guarantor1Name : existing.guarantor1Name,
        guarantor1Phone: guarantor1Phone !== undefined ? guarantor1Phone : existing.guarantor1Phone,
        guarantor2Name: guarantor2Name !== undefined ? guarantor2Name : existing.guarantor2Name,
        guarantor2Phone: guarantor2Phone !== undefined ? guarantor2Phone : existing.guarantor2Phone,
        cashPrice: cashPrice !== undefined ? parseFloat(cashPrice) : existing.cashPrice,
        hirePurchasePrice: hirePurchasePrice !== undefined ? parseFloat(hirePurchasePrice) : existing.hirePurchasePrice,
        installmentAmount: installmentAmount !== undefined ? parseFloat(installmentAmount) : existing.installmentAmount,
        frequency: frequency ?? existing.frequency,
        totalInstallments: totalInstallments !== undefined ? parseInt(totalInstallments) : existing.totalInstallments,
        startDate: startDate ? new Date(startDate) : existing.startDate,
        enableLateFee: enableLateFee !== undefined ? Boolean(enableLateFee) : existing.enableLateFee,
        lateFeeType: lateFeeType ?? existing.lateFeeType,
        lateFeeAmount: lateFeeAmount !== undefined ? parseFloat(lateFeeAmount) : existing.lateFeeAmount,
        gracePeriodDays: gracePeriodDays !== undefined ? parseInt(gracePeriodDays) : existing.gracePeriodDays,
      },
      include: {
        hirer: true,
        vehicle: true,
        payments: true,
      },
    });

    const summary = calculateAgreementSummary(updatedAgreement);

    return NextResponse.json({
      agreement: {
        ...updatedAgreement,
        summary,
      },
      message: 'Agreement updated successfully',
    });
  } catch (error: any) {
    console.error('Error updating agreement:', error);
    return NextResponse.json({ error: error.message || 'Failed to update agreement' }, { status: 500 });
  }
}

