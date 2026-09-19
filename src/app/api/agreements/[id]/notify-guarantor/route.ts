import { NextResponse } from 'next/server';
import { getCurrentSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { notifications } from '@/lib/notifications';

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
    const body = await request.json();
    const { subject, message } = body;

    if (!subject || !message) {
      return NextResponse.json({ error: 'Subject and message are required' }, { status: 400 });
    }

    const agreement = await prisma.agreement.findUnique({
      where: { id },
    });

    if (!agreement) {
      return NextResponse.json({ error: 'Agreement not found' }, { status: 404 });
    }

    // Organization data isolation check
    if (session.role !== 'SUPER_ADMIN' && agreement.organizationId !== session.organizationId) {
      return NextResponse.json({ error: 'Forbidden access to this agreement' }, { status: 403 });
    }

    if (!agreement.guarantor1Phone && !agreement.guarantor2Phone) {
      return NextResponse.json({ error: 'No guarantor phone numbers are associated with this agreement.' }, { status: 400 });
    }

    // Find the guarantor user(s) to get their email address
    const guarantorPhones = [agreement.guarantor1Phone, agreement.guarantor2Phone].filter(Boolean) as string[];
    
    const guarantors = await prisma.user.findMany({
      where: {
        phone: { in: guarantorPhones },
        role: 'GUARANTOR'
      }
    });

    const guarantorWithEmail = guarantors.find(g => g.email);

    if (!guarantorWithEmail || !guarantorWithEmail.email) {
      return NextResponse.json({ error: 'No email address found for the guarantor(s) of this agreement.' }, { status: 400 });
    }

    // Send the email using our notification service
    await notifications.sendCustomGuarantorEmail(
      guarantorWithEmail.email,
      subject,
      message
    );

    return NextResponse.json({ success: true, message: 'Email sent successfully to ' + guarantorWithEmail.email });
  } catch (error) {
    console.error('Error notifying guarantor:', error);
    return NextResponse.json({ error: 'Failed to send notification' }, { status: 500 });
  }
}
