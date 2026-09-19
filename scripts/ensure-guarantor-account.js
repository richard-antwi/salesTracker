const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  const phone = '0201112233';
  let user = await prisma.user.findFirst({ where: { phone } });
  
  const hashedPassword = await bcrypt.hash('Guarantor123!', 10);
  
  if (!user) {
    const org = await prisma.organization.findFirst();
    if (!org) {
      console.error('No organization found');
      return;
    }
    user = await prisma.user.create({
      data: {
        name: 'Yaw Osei',
        phone: phone,
        email: 'guarantor.yaw@example.com',
        role: 'GUARANTOR',
        passwordHash: hashedPassword,
        organizationId: org.id,
        mustChangePassword: false
      }
    });
    console.log('SUCCESS: Created Guarantor user account:', user.phone);
  } else {
    await prisma.user.update({
      where: { id: user.id },
      data: {
        role: 'GUARANTOR',
        passwordHash: hashedPassword,
        mustChangePassword: false
      }
    });
    console.log('SUCCESS: Updated Guarantor user account password & role:', user.phone);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
