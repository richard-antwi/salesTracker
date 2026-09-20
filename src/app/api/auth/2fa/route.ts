import { NextResponse } from 'next/server';
import { getCurrentSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import * as twofactor from 'node-2fa';
import QRCode from 'qrcode';

export async function POST(request: Request) {
  try {
    const session = await getCurrentSession();
    if (!session || (session.role !== 'SUPER_ADMIN' && session.role !== 'ADMIN')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { action, token } = body;

    const user = await prisma.user.findUnique({ where: { id: session.userId } });
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    // Action 1: Setup 2FA (Generate Secret and QR Code)
    if (action === 'setup') {
      const newSecret = twofactor.generateSecret({ name: 'Work&Pay', account: user.email || user.phone });
      const secret = newSecret.secret;
      const otpauth = newSecret.uri;
      const qrCodeUrl = await QRCode.toDataURL(otpauth);

      return NextResponse.json({
        secret,
        qrCodeUrl,
        message: 'Scan this QR code with Google Authenticator or Authy',
      });
    }

    // Action 2: Verify and Enable 2FA
    if (action === 'verify' && token) {
      const { tempSecret } = body; // The secret generated during setup step

      if (!tempSecret) {
         return NextResponse.json({ error: 'Missing temporary secret' }, { status: 400 });
      }

      const result = twofactor.verifyToken(tempSecret, token);
      const isValid = result !== null;

      if (!isValid) {
        return NextResponse.json({ error: 'Invalid 2FA code' }, { status: 400 });
      }

      // Save secret to database
      await prisma.user.update({
        where: { id: user.id },
        data: { twoFactorSecret: tempSecret },
      });

      return NextResponse.json({ success: true, message: '2FA successfully enabled.' });
    }

    // Action 3: Disable 2FA
    if (action === 'disable') {
      await prisma.user.update({
        where: { id: user.id },
        data: { twoFactorSecret: null },
      });
      return NextResponse.json({ success: true, message: '2FA disabled.' });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('2FA Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
