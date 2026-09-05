import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { comparePassword, setAuthCookie } from '@/lib/auth';

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
    });

    if (!user) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const isMatch = await comparePassword(password, user.passwordHash);
    if (!isMatch) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const sessionPayload = {
      userId: user.id,
      name: user.name,
      phone: user.phone,
      role: user.role as 'ADMIN' | 'RIDER' | 'GUARANTOR',
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
