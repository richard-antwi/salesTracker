const { PrismaClient } = require('@prisma/client');
process.env.DATABASE_URL = 'postgresql://postgres.jhxctmcjbjkicgrlzftr:cQ%24X%214yiUQ%2332hY@aws-0-eu-central-1.pooler.supabase.com:5432/postgres?sslmode=no-verify';
const prisma = new PrismaClient();

async function linkGuarantorToAgreement() {
  const phone = '0201112233';

  console.log('Connecting to Live Supabase DB to link agreement...');
  
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
