import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { comparePassword, setAuthCookie, UserSession } from '@/lib/auth';
import { authenticator } from 'otplib';

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

    // 2FA Enforcement
    if (user.twoFactorSecret) {
      if (!body.token) {
        return NextResponse.json({ 
          requires2FA: true, 
          message: '2FA token required' 
        }, { status: 403 }); // 403 or 401
      }

      const isValid = authenticator.verify({ token: body.token, secret: user.twoFactorSecret });
      
      if (!isValid) {
        return NextResponse.json({ error: 'Invalid 2FA code' }, { status: 401 });
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
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ error: 'Server error during login' }, { status: 500 });
  }
}
