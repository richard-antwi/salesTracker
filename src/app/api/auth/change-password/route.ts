import { NextResponse } from 'next/server';
import { getCurrentSession, hashPassword, setAuthCookie } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function POST(request: Request) {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { newPassword } = await request.json();
    if (!newPassword || newPassword.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters long' }, { status: 400 });
    }

    const passwordHash = await hashPassword(newPassword);

    await prisma.user.update({
      where: { id: session.userId },
      data: {
        passwordHash,
        mustChangePassword: false,
      },
    });

    const updatedSession = {
      ...session,
      mustChangePassword: false,
    };

    await setAuthCookie(updatedSession);

    return NextResponse.json({ message: 'Password updated successfully' });
  } catch (error) {
    console.error('Change password error:', error);
    return NextResponse.json({ error: 'Failed to update password' }, { status: 500 });
  }
}
