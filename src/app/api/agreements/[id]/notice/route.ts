import { NextResponse } from 'next/server';
import { getCurrentSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { calculateAgreementSummary } from '@/lib/calculations';
import { generateLegalNoticePDFBuffer } from '@/lib/pdf-generator';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getCurrentSession();
    if (!session || (session.role !== 'ADMIN' && session.role !== 'SUPER_ADMIN')) {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const { id } = await params;
    const url = new URL(request.url);
    const typeParam = (url.searchParams.get('type') || 'DEFAULT').toUpperCase();
    const noticeType = typeParam === 'REPOSSESSION' ? 'REPOSSESSION' : 'DEFAULT';

    const agreement = await prisma.agreement.findUnique({
      where: { id },
      include: {
        hirer: true,
        vehicle: true,
      },
    });

    if (!agreement) {
      return NextResponse.json({ error: 'Agreement not found' }, { status: 404 });
    }

    // Organization security check
    if (session.role !== 'SUPER_ADMIN' && agreement.organizationId !== session.organizationId) {
      return NextResponse.json({ error: 'Forbidden access to this agreement' }, { status: 403 });
    }

    const summary = calculateAgreementSummary(agreement);
    const pdfBuffer = await generateLegalNoticePDFBuffer(
      {
        ...agreement,
        summary,
      },
      noticeType
    );

    const docPrefix = noticeType === 'REPOSSESSION' ? 'Repossession_Notice' : 'Default_Notice';
    const filename = `${docPrefix}-${agreement.vehicle.registrationNo.replace(/\s+/g, '_')}.pdf`;

    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': pdfBuffer.length.toString(),
      },
    });
  } catch (error: any) {
    console.error('Error generating legal notice PDF:', error);
    return NextResponse.json({ error: 'Failed to generate legal notice PDF' }, { status: 500 });
  }
}
