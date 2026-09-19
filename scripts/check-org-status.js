const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const user = await prisma.user.findFirst({
    where: { phone: '0201112233' },
    include: { organization: true }
  });
  console.log(user.organization);
}
main().finally(async () => { await prisma.$disconnect(); });
