const { PrismaClient } = require('@prisma/client');

async function seed(url) {
  const prisma = new PrismaClient({
    datasources: { db: { url } }
  });

  try {
    const org = await prisma.organization.findUnique({ where: { slug: 'demo-fleet' } });
    if (!org) {
      console.log('Demo org not found for', url.substring(0, 30));
      return;
    }

    // Delete existing demo data except users
    await prisma.payment.deleteMany({ where: { organizationId: org.id } });
    await prisma.statusChangeLog.deleteMany({ where: { organizationId: org.id } });
    await prisma.agreement.deleteMany({ where: { organizationId: org.id } });
    await prisma.vehicle.deleteMany({ where: { organizationId: org.id } });

    console.log('Cleared old demo data. Generating rich data...');

    const admin = await prisma.user.findFirst({ where: { role: 'ADMIN', organizationId: org.id } });
    const rider = await prisma.user.findFirst({ where: { role: 'RIDER', organizationId: org.id } });
    const guarantor = await prisma.user.findFirst({ where: { role: 'GUARANTOR', organizationId: org.id } });

    if (!admin || !rider || !guarantor) {
      console.log('Missing demo users');
      return;
    }

    // Create Vehicles
    const v1 = await prisma.vehicle.create({
      data: {
        organizationId: org.id,
        makeModel: 'Demo Haojue 110',
        registrationNo: 'DEMO-M-24-GL 1234',
        colorYear: 'Demo Red / 2024'
      }
    });

    const v2 = await prisma.vehicle.create({
      data: {
        organizationId: org.id,
        makeModel: 'Demo TVS Neo NX',
        registrationNo: 'DEMO-M-23-AS 9999',
        colorYear: 'Demo Blue / 2023'
      }
    });

    // Create Active Agreement (for Demo Rider)
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - 2); // started 2 months ago

    const a1 = await prisma.agreement.create({
      data: {
        organizationId: org.id,
        ownerName: admin.name,
        ownerPhone: admin.phone,
        hirerId: rider.id,
        guarantor1Name: guarantor.name,
        guarantor1Phone: guarantor.phone,
        vehicleId: v1.id,
        cashPrice: 15000,
        hirePurchasePrice: 20000,
        installmentAmount: 400,
        frequency: 'WEEKLY',
        totalInstallments: 50,
        startDate,
        status: 'ACTIVE',
        enableLateFee: true,
        lateFeeType: 'FLAT',
        lateFeeAmount: 50,
        gracePeriodDays: 3,
      }
    });

    // Generate Payments for Active Agreement (8 weeks of payments)
    const payments = [];
    let currentPayDate = new Date(startDate);
    for (let i = 0; i < 8; i++) {
      currentPayDate.setDate(currentPayDate.getDate() + 7);
      payments.push({
        organizationId: org.id,
        agreementId: a1.id,
        amount: 400,
        datePaid: new Date(currentPayDate),
        channel: 'MOMO',
        reference: 'DEMO-MOMO-' + Math.random().toString(36).substring(2, 6).toUpperCase(),
        recordedBy: admin.id
      });
    }
    // Add one partial recent payment
    currentPayDate.setDate(currentPayDate.getDate() + 7);
    payments.push({
      organizationId: org.id,
      agreementId: a1.id,
      amount: 250, // Partial payment
      datePaid: new Date(currentPayDate),
      channel: 'CASH',
      reference: 'DEMO-RCPT-001',
      recordedBy: admin.id
    });

    await prisma.payment.createMany({ data: payments });

    // Create Completed Agreement (for dummy past rider)
    const pastRider = await prisma.user.create({
      data: {
        organizationId: org.id,
        name: 'Demo Completed Rider',
        phone: '0540000009',
        email: 'completed-rider@demo.com',
        passwordHash: admin.passwordHash,
        role: 'RIDER'
      }
    });

    const pastStartDate = new Date();
    pastStartDate.setFullYear(pastStartDate.getFullYear() - 1);

    const a2 = await prisma.agreement.create({
      data: {
        organizationId: org.id,
        ownerName: admin.name,
        ownerPhone: admin.phone,
        hirerId: pastRider.id,
        guarantor1Name: guarantor.name,
        guarantor1Phone: guarantor.phone,
        vehicleId: v2.id,
        cashPrice: 12000,
        hirePurchasePrice: 16000,
        installmentAmount: 400,
        frequency: 'WEEKLY',
        totalInstallments: 40,
        startDate: pastStartDate,
        status: 'COMPLETED',
      }
    });

    // Create massive bulk payment for the completed agreement just to show data
    await prisma.payment.create({
      data: {
        organizationId: org.id,
        agreementId: a2.id,
        amount: 16000,
        datePaid: new Date(pastStartDate.getTime() + (40 * 7 * 24 * 60 * 60 * 1000)), // paid off 40 weeks later
        channel: 'BANK',
        reference: 'DEMO-BANK-TRF-999',
        recordedBy: admin.id
      }
    });

    // Create a mock verification document for the Demo Rider
    await prisma.document.create({
      data: {
        organizationId: org.id,
        agreementId: a1.id,
        type: 'GHANA_CARD',
        fileName: 'demo_rider_ghana_card.pdf',
        fileUrl: '#',
        fileSize: 1024000, // 1MB
        mimeType: 'application/pdf',
        uploadedBy: admin.id,
        note: 'Verified demo document'
      }
    });

    console.log('Seeded rich demo data successfully for', url.substring(0, 30));
  } catch (error) {
    console.error('Error seeding data:', error);
  } finally {
    await prisma.$disconnect();
  }
}

async function run() {
  await seed('postgresql://postgres:admin@localhost:5432/salestracker_multitenant_dev?schema=public');
  await seed('postgresql://postgres.jhxctmcjbjkicgrlzftr:dbadmin%408888R@aws-0-eu-central-1.pooler.supabase.com:6543/postgres?pgbouncer=true');
}

run().catch(console.error);
