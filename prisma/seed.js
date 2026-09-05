const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding Work & Pay database...');

  // Hash passwords
  const adminPasswordHash = await bcrypt.hash('Admin123!', 10);
  const riderPasswordHash = await bcrypt.hash('Rider123!', 10);

  // 1. Create Admin
  const admin = await prisma.user.upsert({
    where: { phone: '0240000000' },
    update: {},
    create: {
      name: 'Emmanuel Osei (Owner)',
      phone: '0240000000',
      email: 'admin@workandpay.gh',
      passwordHash: adminPasswordHash,
      role: 'ADMIN',
      mustChangePassword: false,
    },
  });

  // 2. Create Rider
  const rider = await prisma.user.upsert({
    where: { phone: '0241112233' },
    update: {},
    create: {
      name: 'Kwesi Mensah',
      phone: '0241112233',
      email: 'kwesi@workandpay.gh',
      passwordHash: riderPasswordHash,
      role: 'RIDER',
      mustChangePassword: true, // Force password change on first login per requirement
    },
  });

  // 3. Create Vehicle
  const vehicle = await prisma.vehicle.upsert({
    where: { registrationNo: 'GT-4820-24' },
    update: {},
    create: {
      makeModel: 'Bajaj Boxer BM 150',
      registrationNo: 'GT-4820-24',
      chassisNo: 'MD2A18AZ6PW129481',
      engineNo: 'DUXW82194',
      colorYear: 'Red / 2024',
    },
  });

  // 4. Create Agreement
  const sixWeeksAgo = new Date();
  sixWeeksAgo.setDate(sixWeeksAgo.getDate() - 42);

  const existingAgreement = await prisma.agreement.findFirst({
    where: { hirerId: rider.id },
  });

  let agreement = existingAgreement;
  if (!agreement) {
    agreement = await prisma.agreement.create({
      data: {
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

    // 5. Create Payments
    const date1 = new Date(sixWeeksAgo);
    date1.setDate(date1.getDate() + 7);

    const date2 = new Date(sixWeeksAgo);
    date2.setDate(date2.getDate() + 21);

    const date3 = new Date(sixWeeksAgo);
    date3.setDate(date3.getDate() + 35);

    await prisma.payment.createMany({
      data: [
        {
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

  console.log('✅ Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
