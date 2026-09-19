import { NextResponse } from 'next/server';
import { getCurrentSession, hashPassword } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET() {
  try {
    const session = await getCurrentSession();
    if (!session || (session.role !== 'ADMIN' && session.role !== 'SUPER_ADMIN')) {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 401 });
    }

    const whereClause: any = { role: { in: ['ADMIN', 'GUARANTOR'] } };
    if (session.role !== 'SUPER_ADMIN') {
      if (!session.organizationId) {
        return NextResponse.json({ error: 'Forbidden: No organization assigned' }, { status: 403 });
      }
      whereClause.organizationId = session.organizationId;
    }

    const users = await prisma.user.findMany({
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

    return NextResponse.json({ users });
  } catch (error) {
    console.error('Error fetching organization users:', error);
    return NextResponse.json({ error: 'Failed to fetch organization users' }, { status: 500 });
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
    const { name, phone, email, password, role } = body;

    if (!name || !phone) {
      return NextResponse.json({ error: 'Name and phone number are required' }, { status: 400 });
    }

    const targetRole = role === 'GUARANTOR' ? 'GUARANTOR' : 'ADMIN';

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

    // Generate unique temporary password if not provided
    const prefix = targetRole === 'GUARANTOR' ? 'WP-GUA-' : 'WP-ADM-';
    const assignedPassword = password && password.trim().length >= 6
      ? password.trim()
      : prefix + Math.random().toString(36).slice(-6).toUpperCase();

    const passwordHash = await hashPassword(assignedPassword);

    const newUser = await prisma.user.create({
      data: {
        organizationId: session.organizationId,
        name: name.trim(),
        phone: phone.trim(),
        email: email ? email.trim() : null,
        passwordHash,
        role: targetRole,
        mustChangePassword: true, // Force password change on first login
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

    // Send email/SMS credentials notification
    const { notifications } = await import('@/lib/notifications');
    await notifications.sendUserAccountCreated(newUser, assignedPassword);

    return NextResponse.json({
      user: newUser,
      assignedPassword,
      message: `New ${targetRole} account created successfully. Credentials sent to email.`,
    });
  } catch (error) {
    console.error('Error creating admin user:', error);
    return NextResponse.json({ error: 'Failed to create admin user' }, { status: 500 });
  }
}
