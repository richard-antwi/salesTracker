import { NextResponse } from 'next/server';
import { getCurrentSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { validateFileMagicBytes, getStorageProvider } from '@/lib/storage';

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
      select: { hirerId: true, organizationId: true },
    });

    if (!agreement) {
      return NextResponse.json({ error: 'Agreement not found' }, { status: 404 });
    }

    // Organization data isolation check
    if (session.role !== 'SUPER_ADMIN' && agreement.organizationId !== session.organizationId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Riders can only view documents for their own agreement
    if (session.role === 'RIDER' && agreement.hirerId !== session.userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const rawDocuments = await prisma.document.findMany({
      where: { agreementId: id, organizationId: agreement.organizationId },
      orderBy: { createdAt: 'desc' },
    });

    const documents = rawDocuments.map((d) => ({
      ...d,
      documentType: d.type,
      uploadedBy: { name: d.uploadedBy },
    }));

    return NextResponse.json({ documents });
  } catch (error) {
    console.error('Error fetching documents:', error);
    return NextResponse.json({ error: 'Failed to fetch documents' }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getCurrentSession();
    if (!session || (session.role !== 'ADMIN' && session.role !== 'SUPER_ADMIN')) {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const { id } = await params;

    const agreement = await prisma.agreement.findUnique({
      where: { id },
    });

    if (!agreement) {
      return NextResponse.json({ error: 'Agreement not found' }, { status: 404 });
    }

    // Organization data isolation check
    if (session.role !== 'SUPER_ADMIN' && agreement.organizationId !== session.organizationId) {
      return NextResponse.json({ error: 'Forbidden: Access denied to agreement outside organization' }, { status: 403 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const documentType = (formData.get('documentType') as string) || 'OTHER';

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const allowedTypes = ['GHANA_CARD', 'PASSPORT_PHOTO', 'SIGNED_CONTRACT', 'OTHER'];
    if (!allowedTypes.includes(documentType)) {
      return NextResponse.json({ error: 'Invalid document type' }, { status: 400 });
    }

    // 1. File size check (Max 5MB = 5 * 1024 * 1024 bytes)
    const MAX_SIZE = 5 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: 'File size exceeds 5MB limit' }, { status: 400 });
    }

    // 2. Binary Content Magic Bytes Validation (PDF, PNG, JPEG)
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const validation = validateFileMagicBytes(buffer);
    if (!validation.valid) {
      return NextResponse.json(
        {
          error: validation.error || 'Invalid file format. Only genuine PDF, PNG, or JPEG files are allowed.',
          magicBytesFailed: true,
        },
        { status: 400 }
      );
    }

    // 3. Save file using Storage Provider
    const storageProvider = getStorageProvider();
    const { fileUrl, fileSize } = await storageProvider.uploadFile(buffer, file.name);

    // 4. Create Document Record with organizationId
    const rawDocument = await prisma.document.create({
      data: {
        organizationId: agreement.organizationId,
        agreementId: id,
        type: documentType as any,
        fileName: file.name,
        fileUrl,
        fileSize,
        mimeType: validation.detectedMime || 'application/octet-stream',
        uploadedBy: session.name || session.userId,
      },
    });

    const document = {
      ...rawDocument,
      documentType: rawDocument.type,
      uploadedBy: { name: rawDocument.uploadedBy },
    };

    return NextResponse.json({
      document,
      detectedMime: validation.detectedMime,
      message: 'Document uploaded successfully',
    });
  } catch (error) {
    console.error('Error uploading document:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to upload document';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
