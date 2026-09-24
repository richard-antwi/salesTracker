import { NextResponse } from 'next/server';
import { getCurrentSession, hashPassword, setAuthCookie } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function POST(request: Request) {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.phone === '0000000000') {
      return NextResponse.json({ error: 'Sandbox demo accounts cannot change passwords.' }, { status: 403 });
    }

    const { currentPassword, newPassword } = await request.json();
    
    if (!newPassword || newPassword.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters long' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { id: session.userId } });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // If it's not a forced first-time reset, require current password
    if (!user.mustChangePassword) {
      if (!currentPassword) {
        return NextResponse.json({ error: 'Current password is required' }, { status: 400 });
      }
      const { comparePassword } = await import('@/lib/auth');
      const isMatch = await comparePassword(currentPassword, user.passwordHash);
      if (!isMatch) {
        return NextResponse.json({ error: 'Incorrect current password' }, { status: 401 });
      }
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
