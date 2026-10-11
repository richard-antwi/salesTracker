import { NextResponse } from 'next/server';
import { getCurrentSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { notifications } from '@/lib/notifications';

export async function POST(request: Request) {
  try {
    const session = await getCurrentSession();
    if (!session || session.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Unauthorized: Super Admin access required' }, { status: 401 });
    }

    const body = await request.json();
    const { recipientMode, selectedUserIds, message, testPhone } = body;

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return NextResponse.json({ error: 'Message content is required' }, { status: 400 });
    }

    const trimmedMsg = message.trim();

    // Mode 1: Quick Test SMS to a single number (e.g., 0592303054)
    if (recipientMode === 'test' || testPhone) {
      const phoneToTest = (testPhone || '').trim();
      if (!phoneToTest) {
        return NextResponse.json({ error: 'Test phone number is required' }, { status: 400 });
      }

      const result = await notifications.sendCustomSms(phoneToTest, trimmedMsg, 'Admin Test', 'TEST');
      return NextResponse.json({
        success: result.success,
        recipientMode: 'test',
        totalRecipients: 1,
        delivered: result.success ? 1 : 0,
        failed: result.success ? 0 : 1,
        details: [result],
      });
    }

    // Mode 2: Broadcast to Selected Riders
    let targetRiders: Array<{ id: string; name: string; phone: string }> = [];

    if (recipientMode === 'selected') {
      if (!Array.isArray(selectedUserIds) || selectedUserIds.length === 0) {
        return NextResponse.json({ error: 'No riders selected' }, { status: 400 });
      }

      targetRiders = await prisma.user.findMany({
        where: {
          id: { in: selectedUserIds },
          role: 'RIDER',
        },
        select: { id: true, name: true, phone: true },
      });
    } else if (recipientMode === 'all') {
      // Mode 3: Broadcast to All Riders
      targetRiders = await prisma.user.findMany({
        where: { role: 'RIDER' },
        select: { id: true, name: true, phone: true },
      });
    } else {
      return NextResponse.json({ error: 'Invalid recipient mode. Must be "all", "selected", or "test"' }, { status: 400 });
    }

    if (targetRiders.length === 0) {
      return NextResponse.json({ error: 'No matching rider phone numbers found to send SMS' }, { status: 404 });
    }

    let delivered = 0;
    let failed = 0;
    const results: Array<{ phone: string; name: string; success: boolean; id?: string; error?: string }> = [];

    for (const rider of targetRiders) {
      if (!rider.phone) continue;

      const res = await notifications.sendCustomSms(
        rider.phone,
        trimmedMsg,
        rider.name,
        'BROADCAST'
      );

      if (res.success) {
        delivered++;
      } else {
        failed++;
      }

      results.push({
        phone: rider.phone,
        name: rider.name,
        success: res.success,
        id: res.id,
        error: res.error,
      });
    }

    return NextResponse.json({
      success: delivered > 0 || targetRiders.length === 0,
      recipientMode,
      totalRecipients: targetRiders.length,
      delivered,
      failed,
      results,
    });
  } catch (error: any) {
    console.error('Error sending SMS broadcast:', error);
    return NextResponse.json({ error: 'Broadcast dispatch failed', details: error.message }, { status: 500 });
  }
}
