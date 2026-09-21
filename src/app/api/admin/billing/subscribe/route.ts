import { NextResponse } from 'next/server';
import { getCurrentSession } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function POST() {
  try {
    const session = await getCurrentSession();
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized. Only Fleet Owners can access billing.' }, { status: 401 });
    }

    if (!session.organizationId) {
      return NextResponse.json({ error: 'No organization attached to session' }, { status: 400 });
    }

    const org = await prisma.organization.findUnique({
      where: { id: session.organizationId },
    });

    if (!org) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    // Get current subscription fee from global settings
    let settings = await prisma.systemSettings.findUnique({ where: { id: 'global' } });
    if (!settings) {
      settings = await prisma.systemSettings.create({ data: { id: 'global', monthlySubscriptionFee: 50 } });
    }

    const feeInPesewas = Math.round(Number(settings.monthlySubscriptionFee) * 100);

    const paystackSecret = process.env.PAYSTACK_SECRET_KEY;
    if (!paystackSecret) {
      console.error('Missing PAYSTACK_SECRET_KEY');
      return NextResponse.json({ error: 'Payment gateway not configured' }, { status: 500 });
    }

    // Initialize Paystack transaction
    const host = process.env.NEXT_PUBLIC_APP_URL || (process.env.NODE_ENV === 'development' ? 'http://localhost:3000' : 'https://salestrackergh.vercel.app');
    
    const response = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${paystackSecret}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: org.contactEmail,
        amount: feeInPesewas,
        reference: `SUB_${org.id}_${Date.now()}`,
        callback_url: `${host}/admin/settings/billing`,
        metadata: {
          type: 'SAAS_SUBSCRIPTION',
          organizationId: org.id,
        },
      }),
    });

    const data = await response.json();

    if (!response.ok || !data.status) {
      console.error('Paystack API Error:', data);
      return NextResponse.json({ error: 'Failed to initialize payment gateway' }, { status: 500 });
    }

    return NextResponse.json({
      authorization_url: data.data.authorization_url,
      reference: data.data.reference,
    });

  } catch (error) {
    console.error('Billing Initialization Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
