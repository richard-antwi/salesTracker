import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { hashPassword } from '@/lib/auth';
import { isValidGhanaPhone } from '@/lib/validation';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, contactEmail, contactPhone, ownerName, adminPassword, password } = body;
    const rawPassword = adminPassword || password;

    if (!name || !contactEmail || !contactPhone || !ownerName) {
      return NextResponse.json({ error: 'All fields (Business Name, Owner Name, Contact Phone, Email) are required' }, { status: 400 });
    }

    if (!isValidGhanaPhone(contactPhone)) {
      return NextResponse.json({ error: 'Contact Phone must be a valid 10-digit Ghana number starting with 0 (e.g. 0244123456)' }, { status: 400 });
    }

    if (rawPassword && rawPassword.length < 6) {
      return NextResponse.json({ error: 'Initial Admin Password must be at least 6 characters long' }, { status: 400 });
    }

    const emailClean = contactEmail.trim().toLowerCase();
    const phoneClean = contactPhone.trim();

    // Slugify business name
    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || `org-${Date.now()}`;

    // Check if slug or email exists on Organization
    const existingOrg = await prisma.organization.findFirst({
      where: {
        OR: [{ slug }, { contactEmail: emailClean }],
      },
    });

    if (existingOrg) {
      return NextResponse.json(
        { error: 'An organization with this business name or email address has already requested access.' },
        { status: 400 }
      );
    }

    // Check if user with phone or email already exists
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [{ phone: phoneClean }, { email: emailClean }],
      },
    });

    if (existingUser) {
      if (existingUser.phone === phoneClean) {
        return NextResponse.json(
          { error: 'A user account with this phone number is already registered in the system.' },
          { status: 400 }
        );
      }
      return NextResponse.json(
        { error: 'A user account with this email address is already registered in the system.' },
        { status: 400 }
      );
    }

    // Initial admin password
    const finalPassword = rawPassword || ('WP-' + Math.random().toString(36).slice(-6).toUpperCase());
    const passwordHash = await hashPassword(finalPassword);

    // Create Organization and initial Owner Admin user in a transaction
    const [organization, adminUser] = await prisma.$transaction(async (tx) => {
      const org = await tx.organization.create({
        data: {
          name: name.trim(),
          slug,
          status: 'PENDING',
          contactEmail: emailClean,
          contactPhone: phoneClean,
        },
      });

      const user = await tx.user.create({
        data: {
          organizationId: org.id,
          name: ownerName.trim(),
          phone: phoneClean,
          email: emailClean,
          passwordHash,
          role: 'ADMIN',
          mustChangePassword: false,
        },
      });

      return [org, user];
    });

    return NextResponse.json({
      success: true,
      organization,
      message: 'Access request submitted successfully! The platform operator will review and approve your account.',
    });
  } catch (error: any) {
    console.error('Error submitting organization request:', error);

    if (error?.code === 'P2002') {
      const target = error?.meta?.target;
      const targetStr = Array.isArray(target) ? target.join(', ') : String(target || '');

      if (targetStr.includes('email')) {
        return NextResponse.json(
          { error: 'An organization or user with this email address already exists. Please use a different email.' },
          { status: 400 }
        );
      }
      if (targetStr.includes('phone')) {
        return NextResponse.json(
          { error: 'A user account with this phone number already exists.' },
          { status: 400 }
        );
      }
      if (targetStr.includes('slug')) {
        return NextResponse.json(
          { error: 'An organization with a similar name already exists.' },
          { status: 400 }
        );
      }
    }

    const errorMessage = error instanceof Error ? error.message : 'Failed to submit request';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
