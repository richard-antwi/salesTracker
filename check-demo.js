const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: 'postgresql://postgres:admin@localhost:5432/salestracker_multitenant_dev?schema=public'
    }
  }
});

async function main() {
  const u = await prisma.user.findUnique({where: {phone: '0000000000'}});
  console.log(u);
}
main().catch(console.error).finally(() => prisma.$disconnect());
