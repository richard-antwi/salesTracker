const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();
async function main() {
  const hashedPassword = await bcrypt.hash('123456', 10);
  await prisma.user.updateMany({
    where: { phone: '0201112233' },
    data: { passwordHash: hashedPassword }
  });
  console.log('Password reset to 123456');
}
main().finally(async () => { await prisma.$disconnect(); });
