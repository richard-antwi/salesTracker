const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkGuarantorAgreements() {
  const phone = '0201112233';
  const agreements = await prisma.agreement.findMany({
    where: {
      OR: [
        { guarantor1Phone: phone },
        { guarantor2Phone: phone }
      ]
    },
    include: {
      hirer: true,
      vehicle: true
    }
  });

  console.log(`Found ${agreements.length} guaranteed agreement(s) for ${phone}:`);
  agreements.forEach(a => {
    console.log(`- Hirer: ${a.hirer?.name || a.guarantor1Name} | Vehicle: ${a.vehicle?.make} ${a.vehicle?.model} (${a.vehicle?.regNumber}) | Total Price: GHS ${a.totalHirePrice}`);
  });
}

checkGuarantorAgreements()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
