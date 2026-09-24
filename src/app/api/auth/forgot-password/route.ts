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

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD,
      },
    });

    const resetLink = `${CONFIG.APP_URL}/reset-password?token=${resetToken}`;

    await transporter.sendMail({
      from: `"Work & Pay Ghana" <${process.env.GMAIL_USER}>`,
      to: user.email,
      subject: 'Password Reset Request',
      html: `
        <div style="font-family: sans-serif; max-w: 600px; margin: 0 auto;">
          <h2 style="color: #065f46;">Work & Pay Password Reset</h2>
          <p>Hello ${user.name},</p>
          <p>We received a request to reset your password. Click the button below to set a new password:</p>
          <div style="margin: 30px 0;">
            <a href="${resetLink}" style="background-color: #059669; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold;">Reset Password</a>
          </div>
          <p>If you did not request this, you can safely ignore this email.</p>
          <p><em>This link expires in 1 hour.</em></p>
        </div>
      `,
    });

    return NextResponse.json({ success: true, message: 'Password reset email sent' });
  } catch (error: any) {
    console.error('Forgot password error:', error);
    return NextResponse.json({ error: 'Server error', details: error.message }, { status: 500 });
  }
}
