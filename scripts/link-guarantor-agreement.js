const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function linkGuarantorToAgreement() {
  const phone = '0201112233';

  // Find any active agreement
  const agreement = await prisma.agreement.findFirst({
    where: { status: 'ACTIVE' },
    include: { hirer: true, vehicle: true }
  }) || await prisma.agreement.findFirst({
    include: { hirer: true, vehicle: true }
  });

  if (!agreement) {
    console.log('No agreement found in database.');
    return;
  }

  await prisma.agreement.update({
    where: { id: agreement.id },
    data: {
      guarantor1Name: 'Yaw Osei',
      guarantor1Phone: phone
    }
  });

  console.log(`SUCCESS: Linked Guarantor (${phone}) to Agreement ${agreement.id}`);
  console.log(`- Hirer: ${agreement.hirer?.name}`);
  console.log(`- Vehicle: ${agreement.vehicle?.make} ${agreement.vehicle?.model} (${agreement.vehicle?.regNumber})`);
}

linkGuarantorToAgreement()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
