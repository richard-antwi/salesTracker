import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { hashPassword } from '@/lib/auth';

export async function POST() {
  try {
    const demoPhone = '0550000000';
    const demoEmail = 'demo@workandpay.gh';
    
    const passwordHash = await hashPassword('DEMO');

    // Check if demo user exists by email or phone
    let demoUser = await prisma.user.findFirst({
      where: { OR: [{ email: demoEmail }, { phone: demoPhone }] }
    });

    const org = await prisma.organization.upsert({
      where: { slug: 'demo-fleet' },
      update: { status: 'APPROVED' },
      create: {
        name: 'Demo Fleet Sandbox',
        slug: 'demo-fleet',
        status: 'APPROVED',
        contactEmail: demoEmail,
        contactPhone: demoPhone,
        subscriptionStatus: 'TRIAL',
        trialEndsAt: new Date(new Date().setDate(new Date().getDate() + 14)),
      }
    });

    if (demoUser) {
      await prisma.user.update({
        where: { id: demoUser.id },
        data: {
          passwordHash,
          phone: demoPhone,
          twoFactorCode: null,
          twoFactorExpiresAt: null,
        }
      });
    } else {
      // Create Demo User
      demoUser = await prisma.user.create({
        data: {
          organizationId: org.id,
          name: 'Demo Admin',
          phone: demoPhone,
          email: demoEmail,
          passwordHash,
          role: 'ADMIN',
          mustChangePassword: false,
        }
      });

      // Populate dummy data
      const vehicle = await prisma.vehicle.create({
        data: {
          organizationId: org.id,
          makeModel: 'Haojue 110',
          registrationNo: 'M-24-GL 1234',
        }
      });

      const rider = await prisma.user.create({
        data: {
          organizationId: org.id,
          name: 'Demo Rider',
          phone: '0550000001',
          email: 'rider@demo.com',
          passwordHash,
          role: 'RIDER',
        }
      });

      const guarantor = await prisma.user.create({
        data: {
          organizationId: org.id,
          name: 'Demo Guarantor',
          phone: '0240000002',
          email: 'guarantor@demo.com',
          passwordHash,
          role: 'GUARANTOR',
        }
      });

      await prisma.agreement.create({
        data: {
          organizationId: org.id,
          ownerName: 'Demo Admin',
          ownerPhone: demoPhone,
          hirerId: rider.id,
          guarantor1Name: 'Demo Guarantor',
          guarantor1Phone: '0240000002',
          vehicleId: vehicle.id,
          cashPrice: 15000,
          hirePurchasePrice: 20000,
          installmentAmount: 400,
          frequency: 'WEEKLY',
          totalInstallments: 50,
          startDate: new Date(),
          status: 'ACTIVE',
        }
      });
    }

    return NextResponse.json({ success: true, phone: demoUser.phone, password: 'DEMO' });
  } catch (error: any) {
    console.error('Demo Init Error:', error);
    return NextResponse.json({ error: 'Failed to initialize demo sandbox', details: error.message || String(error) }, { status: 500 });
  }
}
