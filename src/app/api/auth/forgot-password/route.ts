import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import crypto from 'crypto';
import nodemailer from 'nodemailer';
import { CONFIG } from '@/lib/config';

export async function POST(request: Request) {
  try {
    const { identifier } = await request.json();

    if (!identifier) {
      return NextResponse.json({ error: 'Email or phone is required' }, { status: 400 });
    }

    const user = await prisma.user.findFirst({
      where: {
        OR: [{ phone: identifier }, { email: identifier }],
      }
    });

    if (!user) {
      // Return success even if user not found to prevent user enumeration
      return NextResponse.json({ success: true, message: 'If an account exists, a reset link has been sent.' });
    }

    // Only allow reset if user has an email
    if (!user.email) {
      return NextResponse.json(
        { error: 'No email associated with this account. Contact platform support.' },
        { status: 400 }
      );
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpiry = new Date(Date.now() + 3600000); // 1 hour from now

    await prisma.user.update({
      where: { id: user.id },
      data: { resetToken, resetTokenExpiry },
    });

    const reqUrl = new URL(request.url);
    const resetLink = `${reqUrl.protocol}//${reqUrl.host}/reset-password?token=${resetToken}`;

    const { notifications } = await import('@/lib/notifications');
    const result = await notifications.sendPasswordReset(user.email, user.name, resetLink);
    
    if (result && !result.success) {
      return NextResponse.json({ error: 'Failed to send email via provider', details: result.error }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Password reset email sent' });
  } catch (error: any) {
    console.error('Forgot password error:', error);
    return NextResponse.json({ error: 'Server error', details: error.message }, { status: 500 });
  }
}
