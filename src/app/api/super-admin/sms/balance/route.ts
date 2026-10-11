import { NextResponse } from 'next/server';
import { getCurrentSession } from '@/lib/auth';
import { notifications } from '@/lib/notifications';
import { CONFIG } from '@/lib/config';

export async function GET() {
  try {
    const session = await getCurrentSession();
    if (!session || session.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Unauthorized: Super Admin access required' }, { status: 401 });
    }

    const balanceInfo = await notifications.getSmsBalance();

    return NextResponse.json({
      success: true,
      balance: balanceInfo.balance ?? 0,
      model: balanceInfo.model ?? 'units',
      provider: CONFIG.SMS_PROVIDER,
      senderId: CONFIG.SMSONLINEGH_SENDER_ID,
      smsEnabled: CONFIG.SMS_ENABLED,
      hasApiKey: Boolean(CONFIG.SMSONLINEGH_API_KEY),
    });
  } catch (error: any) {
    console.error('Error fetching SMS balance:', error);
    return NextResponse.json(
      { error: 'Failed to fetch SMS balance', details: error.message },
      { status: 500 }
    );
  }
}
