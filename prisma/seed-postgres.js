const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding Work & Pay PostgreSQL database...');

  // Hash passwords
  const adminPasswordHash = await bcrypt.hash('Admin123!', 10);
  const riderPasswordHash = await bcrypt.hash('Rider123!', 10);

  // 1. Create Admins
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

  const secondaryAdmin = await prisma.user.upsert({
    where: { phone: '0244112233' },
    update: {},
    create: {
      name: 'Richard Antwi',
      phone: '0244112233',
      email: 'richardantwi8888@gmail.com',
      passwordHash: adminPasswordHash,
      role: 'ADMIN',
      mustChangePassword: false,
    },
  });

  // 2. Create Riders
  const kwesi = await prisma.user.upsert({
    where: { phone: '0241112233' },
    update: {},
    create: {
      name: 'Kwesi Mensah',
      phone: '0241112233',
      email: 'kwesi@workandpay.gh',
      passwordHash: riderPasswordHash,
      role: 'RIDER',
      mustChangePassword: false,
    },
  });

  const kofi = await prisma.user.upsert({
    where: { phone: '0205556677' },
    update: {},
    create: {
      name: 'Kofi Annan',
      phone: '0205556677',
      email: 'kofi@workandpay.gh',
      passwordHash: riderPasswordHash,
      role: 'RIDER',
      mustChangePassword: true,
    },
  });

  // 3. Create Vehicles
  const vehicle1 = await prisma.vehicle.upsert({
    where: { registrationNo: 'GT-9911-24' },
    update: {},
    create: {
      makeModel: 'Honda Ace 125',
      registrationNo: 'GT-9911-24',
      chassisNo: 'HA125-99881122',
      engineNo: 'ENG-HA-4455',
      colorYear: 'Black / 2024',
    },
  });

  const vehicle2 = await prisma.vehicle.upsert({
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

  // 4. Create Kwesi Agreement (Weekly, Started Aug 25 2026)
  const kwesiStart = new Date('2026-07-25T00:00:00.000Z');
  let kwesiAgreement = await prisma.agreement.findFirst({
    where: { hirerId: kwesi.id },
  });

  if (!kwesiAgreement) {
    kwesiAgreement = await prisma.agreement.create({
      data: {
        ownerName: admin.name,
        ownerPhone: admin.phone,
        hirerId: kwesi.id,
        guarantor1Name: 'Joseph Kwarteng',
        guarantor1Phone: '0208889900',
        guarantor2Name: 'Abena Serwaa',
        guarantor2Phone: '0554443322',
        vehicleId: vehicle1.id,
        cashPrice: 10000,
        hirePurchasePrice: 15000,
        installmentAmount: 300,
        frequency: 'WEEKLY',
        totalInstallments: 50,
        startDate: kwesiStart,
        status: 'ACTIVE',
      },
    });

    // Kwesi Payments (3 payments made)
    await prisma.payment.createMany({
      data: [
        {
          agreementId: kwesiAgreement.id,
          amount: 300,
          datePaid: new Date('2026-08-01T10:00:00.000Z'),
          channel: 'MOMO',
          reference: 'MM-948102',
          note: 'Week 1 installment via MTN MoMo',
          recordedBy: admin.id,
          voided: false,
        },
        {
          agreementId: kwesiAgreement.id,
          amount: 300,
          datePaid: new Date('2026-08-08T14:30:00.000Z'),
          channel: 'CASH',
          reference: 'REC-0012',
          note: 'Week 2 cash payment at office',
          recordedBy: admin.id,
          voided: false,
        },
        {
          agreementId: kwesiAgreement.id,
          amount: 300,
          datePaid: new Date('2026-08-15T11:15:00.000Z'),
          channel: 'MOMO',
          reference: 'MM-950211',
          note: 'Week 3 payment via Telecel Cash',
          recordedBy: admin.id,
          voided: false,
        },
      ],
    });
  }

  // 5. Create Kofi Agreement
  const kofiStart = new Date('2026-08-05T00:00:00.000Z');
  let kofiAgreement = await prisma.agreement.findFirst({
    where: { hirerId: kofi.id },
  });

  if (!kofiAgreement) {
    kofiAgreement = await prisma.agreement.create({
      data: {
        ownerName: admin.name,
        ownerPhone: admin.phone,
        hirerId: kofi.id,
        guarantor1Name: 'Yaw Boateng',
        guarantor1Phone: '0243334455',
        vehicleId: vehicle2.id,
        cashPrice: 11000,
        hirePurchasePrice: 16000,
        installmentAmount: 350,
        frequency: 'WEEKLY',
        totalInstallments: 46,
        startDate: kofiStart,
        status: 'ACTIVE',
      },
    });

    // Kofi Payment
    await prisma.payment.create({
      data: {
        agreementId: kofiAgreement.id,
        amount: 350,
        datePaid: new Date('2026-08-12T09:00:00.000Z'),
        channel: 'MOMO',
        reference: 'MM-112233',
        note: 'Initial installment',
        recordedBy: admin.id,
        voided: false,
      },
    });
  }

  console.log('✅ PostgreSQL seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
