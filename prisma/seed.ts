import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding Multi-Tenant Work & Pay database...');

  // Hash passwords
  const superAdminPasswordHash = await bcrypt.hash('SuperAdmin123!', 10);
  const adminPasswordHash = await bcrypt.hash('Admin123!', 10);
  const riderPasswordHash = await bcrypt.hash('Rider123!', 10);

  // 1. Create Organization #1
  const org1 = await prisma.organization.upsert({
    where: { slug: 'work-and-pay-ghana' },
    update: {},
    create: {
      name: 'Work & Pay Ghana',
      slug: 'work-and-pay-ghana',
      status: 'APPROVED',
      contactEmail: 'admin@workandpay.gh',
      contactPhone: '0240000000',
    },
  });

  // 2. Create Platform SUPER_ADMIN (System operator across organizations)
  const superAdmin = await prisma.user.upsert({
    where: { phone: '0000000000' },
    update: {},
    create: {
      name: 'Platform Operator (Super Admin)',
      phone: '0000000000',
      email: 'superadmin@platform.com',
      passwordHash: superAdminPasswordHash,
      role: 'SUPER_ADMIN',
      mustChangePassword: false,
      organizationId: null,
    },
  });

  // 3. Create Org #1 Admin
  const admin = await prisma.user.upsert({
    where: { phone: '0240000000' },
    update: { organizationId: org1.id },
    create: {
      organizationId: org1.id,
      name: 'Emmanuel Osei (Owner)',
      phone: '0240000000',
      email: 'admin@workandpay.gh',
      passwordHash: adminPasswordHash,
      role: 'ADMIN',
      mustChangePassword: false,
    },
  });

  // 4. Create Org #1 Rider
  const rider = await prisma.user.upsert({
    where: { phone: '0241112233' },
    update: { organizationId: org1.id },
    create: {
      organizationId: org1.id,
      name: 'Kwesi Mensah',
      phone: '0241112233',
      email: 'kwesi@workandpay.gh',
      passwordHash: riderPasswordHash,
      role: 'RIDER',
      mustChangePassword: true,
    },
  });

  // 5. Create Org #1 Vehicle
  const existingVehicle = await prisma.vehicle.findFirst({
    where: { registrationNo: 'GT-4820-24', organizationId: org1.id },
  });

  let vehicle = existingVehicle;
  if (!vehicle) {
    vehicle = await prisma.vehicle.create({
      data: {
        organizationId: org1.id,
        makeModel: 'Bajaj Boxer BM 150',
        registrationNo: 'GT-4820-24',
        chassisNo: 'MD2A18AZ6PW129481',
        engineNo: 'DUXW82194',
        colorYear: 'Red / 2024',
      },
    });
  }

  // 6. Create Org #1 Agreement
  const sixWeeksAgo = new Date();
  sixWeeksAgo.setDate(sixWeeksAgo.getDate() - 42);

  const existingAgreement = await prisma.agreement.findFirst({
    where: { hirerId: rider.id, organizationId: org1.id },
  });

  let agreement = existingAgreement;
  if (!agreement) {
    agreement = await prisma.agreement.create({
      data: {
        organizationId: org1.id,
        ownerName: admin.name,
        ownerPhone: admin.phone,
        hirerId: rider.id,
        guarantor1Name: 'Joseph Kwarteng',
        guarantor1Phone: '0208889900',
        guarantor2Name: 'Abena Serwaa',
        guarantor2Phone: '0554443322',
        vehicleId: vehicle.id,
        cashPrice: 11000,
        hirePurchasePrice: 15000,
        installmentAmount: 300,
        frequency: 'WEEKLY',
        totalInstallments: 50,
        startDate: sixWeeksAgo,
        status: 'ACTIVE',
      },
    });

    // 7. Create Org #1 Payments
    const date1 = new Date(sixWeeksAgo);
    date1.setDate(date1.getDate() + 7);

    const date2 = new Date(sixWeeksAgo);
    date2.setDate(date2.getDate() + 21);

    const date3 = new Date(sixWeeksAgo);
    date3.setDate(date3.getDate() + 35);

    await prisma.payment.createMany({
      data: [
        {
          organizationId: org1.id,
          agreementId: agreement.id,
          amount: 300,
          datePaid: date1,
          channel: 'MOMO',
          reference: 'MM-948102',
          note: 'Week 1 payment via MTN MoMo',
          recordedBy: admin.id,
          voided: false,
        },
        {
          organizationId: org1.id,
          agreementId: agreement.id,
          amount: 300,
          datePaid: date2,
          channel: 'CASH',
          reference: 'REC-0012',
          note: 'Hand delivery cash payment at depot',
          recordedBy: admin.id,
          voided: false,
        },
        {
          organizationId: org1.id,
          agreementId: agreement.id,
          amount: 300,
          datePaid: date3,
          channel: 'MOMO',
          reference: 'MM-950211',
          note: 'Week 5 payment via Telecel Cash',
          recordedBy: admin.id,
          voided: false,
        },
      ],
    });
  }

  // 8. Create Organization #2 for Data Isolation Testing
  const org2 = await prisma.organization.upsert({
    where: { slug: 'accra-logistics-fleet' },
    update: {},
    create: {
      name: 'Accra Logistics Fleet (Org #2)',
      slug: 'accra-logistics-fleet',
      status: 'APPROVED',
      contactEmail: 'admin@accralogistics.gh',
      contactPhone: '0249998877',
    },
  });

  const org2Admin = await prisma.user.upsert({
    where: { phone: '0249998877' },
    update: { organizationId: org2.id },
    create: {
      organizationId: org2.id,
      name: 'Kofi Mensah (Org 2 Owner)',
      phone: '0249998877',
      email: 'admin@accralogistics.gh',
      passwordHash: adminPasswordHash,
      role: 'ADMIN',
      mustChangePassword: false,
    },
  });

  const org2Vehicle = await prisma.vehicle.create({
    data: {
      organizationId: org2.id,
      makeModel: 'TVS King Deluxe 200',
      registrationNo: 'GW-9900-24',
      chassisNo: 'TVS9988776655',
      engineNo: 'ENG99887766',
      colorYear: 'Blue / 2024',
    },
  });

  console.log('✅ Multi-tenant seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
