import { NextResponse } from 'next/server';
import { getCurrentSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { calculateAgreementSummary } from '@/lib/calculations';
import { generateStatementPDFBuffer } from '@/lib/pdf-generator';

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
        hirer: true,
        vehicle: true,
        payments: {
          orderBy: { datePaid: 'asc' },
        },
      },
    });

    if (!agreement) {
      return NextResponse.json({ error: 'Agreement not found' }, { status: 404 });
    }

    // Role security check: Rider can ONLY download their own statement
    if (session.role !== 'ADMIN' && agreement.hirerId !== session.userId) {
      return NextResponse.json({ error: 'Forbidden access to this statement' }, { status: 403 });
    }

    const summary = calculateAgreementSummary(agreement);
    const pdfBuffer = await generateStatementPDFBuffer({
      ...agreement,
      summary,
    });

    const filename = `Statement-${agreement.vehicle.registrationNo.replace(/\s+/g, '_')}.pdf`;

    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': pdfBuffer.length.toString(),
      },
    });
  } catch (error) {
    console.error('Error generating PDF statement:', error);
    return NextResponse.json({ error: 'Failed to generate PDF statement' }, { status: 500 });
  }
}
