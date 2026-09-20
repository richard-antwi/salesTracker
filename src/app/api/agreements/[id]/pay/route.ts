import { NextResponse } from 'next/server';
import { getCurrentSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { paystackService } from '@/lib/paystack';
import { CONFIG } from '@/lib/config';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!CONFIG.ENABLE_PAYSTACK) {
       return NextResponse.json({ error: 'Online payments are currently disabled' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const { amount } = body;

    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      return NextResponse.json({ error: 'Invalid payment amount' }, { status: 400 });
    }

    const agreement = await prisma.agreement.findUnique({
      where: { id },
      include: { hirer: true },
    });

    if (!agreement) {
      return NextResponse.json({ error: 'Agreement not found' }, { status: 404 });
    }

    // Is the user allowed to pay this?
    if (session.role !== 'SUPER_ADMIN' && session.role !== 'ADMIN' && agreement.hirerId !== session.userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Generate a unique reference for this transaction attempt
    const reference = `PAY_${agreement.id}_${Date.now()}`;

    // Call Paystack
    const result = await paystackService.initializeTransaction({
      amount: Number(amount),
      email: agreement.hirer.email || 'payer@workandpay.gh',
      reference,
    });

    if (!result.success || !result.authorizationUrl) {
      return NextResponse.json({ error: result.error || 'Failed to initialize Paystack checkout' }, { status: 500 });
    }

    // We can save the pending transaction to the DB if we want to track abandoned checkouts. 
    // For now, we rely on the webhook to create the Payment record when successful.

    return NextResponse.json({
      success: true,
      authorizationUrl: result.authorizationUrl,
    });

  } catch (error) {
    console.error('Error initiating Paystack payment:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
