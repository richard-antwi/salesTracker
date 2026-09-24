import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { comparePassword, setAuthCookie, UserSession } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { identifier, password } = body; // identifier can be phone or email

    if (!identifier || !password) {
      return NextResponse.json({ error: 'Phone/Email and password are required' }, { status: 400 });
    }

    const user = await prisma.user.findFirst({
      where: {
        OR: [{ phone: identifier }, { email: identifier }],
      },
      include: {
        organization: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const isMatch = await comparePassword(password, user.passwordHash);
    if (!isMatch) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    // Organization approval status check for non-Super Admin users
    if (user.role !== 'SUPER_ADMIN' && user.organization) {
      if (user.organization.status === 'PENDING') {
        return NextResponse.json(
          { error: 'Your organization access request is pending approval. Please wait for platform administrator approval.' },
          { status: 403 }
        );
      }
      if (user.organization.status === 'REJECTED') {
        return NextResponse.json(
          { error: 'Your organization access request was not approved. Please contact platform support.' },
          { status: 403 }
        );
      }
      if (user.organization.status === 'SUSPENDED') {
        return NextResponse.json(
          { error: 'Your organization access has been suspended. Please contact platform support.' },
          { status: 403 }
        );
      }
    }

    // 2FA Verification for ADMIN and SUPER_ADMIN (Skip for DEMO user)
    const isDemoAdmin = user.phone === '0550000000';
    if ((user.role === 'ADMIN' || user.role === 'SUPER_ADMIN') && !isDemoAdmin) {
      const { token } = body;

      if (!token) {
        // Generate new 2FA token
        const generatedToken = Math.floor(100000 + Math.random() * 900000).toString(); // 6 digits
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

        await prisma.user.update({
          where: { id: user.id },
          data: {
            twoFactorCode: generatedToken,
            twoFactorExpiresAt: expiresAt,
          }
        });

        // Send email
        const { notifications } = await import('@/lib/notifications');
        if (user.email) {
          await notifications.send2FAToken(user.email, user.name, generatedToken);
        }

        return NextResponse.json({ requires2FA: true }, { status: 403 });
      } else {
        // Verify provided token
        if (
          !user.twoFactorCode ||
          user.twoFactorCode !== token ||
          !user.twoFactorExpiresAt ||
          user.twoFactorExpiresAt < new Date()
        ) {
          return NextResponse.json({ error: 'Invalid or expired 2FA code' }, { status: 401 });
        }

        // Clear the token after successful verification
        await prisma.user.update({
          where: { id: user.id },
          data: {
            twoFactorCode: null,
            twoFactorExpiresAt: null,
          }
        });
      }
    }


    const sessionPayload: UserSession = {
      userId: user.id,
      organizationId: user.organizationId,
      name: user.name,
      phone: user.phone,
      role: user.role as 'SUPER_ADMIN' | 'ADMIN' | 'RIDER' | 'GUARANTOR',
      mustChangePassword: user.mustChangePassword,
    };

    await setAuthCookie(sessionPayload);

    return NextResponse.json({
      user: sessionPayload,
      message: 'Logged in successfully',
    });
  } catch (error: any) {
    console.error('Login error:', error);
    return NextResponse.json({ error: 'Server error during login', details: error.message || String(error) }, { status: 500 });
  }
}
