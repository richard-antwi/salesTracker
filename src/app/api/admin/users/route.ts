import { NextResponse } from 'next/server';
import { getCurrentSession, hashPassword } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET() {
  try {
    const session = await getCurrentSession();
    if (!session || (session.role !== 'ADMIN' && session.role !== 'SUPER_ADMIN')) {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const whereClause: any = { role: 'ADMIN' };
    if (session.role !== 'SUPER_ADMIN') {
      if (!session.organizationId) {
        return NextResponse.json({ error: 'Forbidden: No organization assigned' }, { status: 403 });
      }
      whereClause.organizationId = session.organizationId;
    }

    const adminUsers = await prisma.user.findMany({
      where: whereClause,
      select: {
        id: true,
        organizationId: true,
        name: true,
        phone: true,
        email: true,
        role: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ users: adminUsers });
  } catch (error) {
    console.error('Error fetching admin users:', error);
    return NextResponse.json({ error: 'Failed to fetch admin users' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getCurrentSession();
    if (!session || (session.role !== 'ADMIN' && session.role !== 'SUPER_ADMIN')) {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    if (!session.organizationId && session.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Forbidden: No organization assigned' }, { status: 403 });
    }

    const body = await request.json();
    const { name, phone, email, password } = body;

    if (!name || !phone || !password) {
      return NextResponse.json({ error: 'Name, phone number, and password are required' }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 });
    }

    const { isValidGhanaPhone } = await import('@/lib/validation');
    if (!isValidGhanaPhone(phone)) {
      return NextResponse.json({ error: 'Phone number must be a valid 10-digit Ghana number starting with 0 (e.g. 0244123456)' }, { status: 400 });
    }

    const existingUser = await prisma.user.findUnique({
      where: { phone: phone.trim() },
    });

    if (existingUser) {
      return NextResponse.json({ error: 'A user with this phone number already exists' }, { status: 400 });
    }

    const passwordHash = await hashPassword(password);

    const newUser = await prisma.user.create({
      data: {
        organizationId: session.organizationId,
        name: name.trim(),
        phone: phone.trim(),
        email: email ? email.trim() : null,
        passwordHash,
        role: 'ADMIN',
        mustChangePassword: false,
      },
      select: {
        id: true,
        organizationId: true,
        name: true,
        phone: true,
        email: true,
        role: true,
        createdAt: true,
      },
    });

    return NextResponse.json({
      user: newUser,
      message: 'New Admin account created successfully',
    });
  } catch (error) {
    console.error('Error creating admin user:', error);
    return NextResponse.json({ error: 'Failed to create admin user' }, { status: 500 });
  }
}
