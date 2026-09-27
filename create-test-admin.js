const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  const email = 'richardrichfavourantwi88@gmail.com';
  const phone = '0249999999';
  const password = 'password123';
  const passwordHash = await bcrypt.hash(password, 10);

  // Check if org exists
  let org = await prisma.organization.findFirst({
    where: { name: 'Test Organization' }
  });

  if (!org) {
    org = await prisma.organization.create({
      data: {
        name: 'Test Organization',
        contactEmail: email,
        contactPhone: phone,
        status: 'APPROVED',
        slug: 'test-org-123'
      }
    });
  }

  // Create User
  const user = await prisma.user.upsert({
    where: { email },
    update: {
      passwordHash,
      role: 'ADMIN',
      organizationId: org.id
    },
    create: {
      name: 'Richard Antwi (Test Admin)',
      email,
      phone,
      passwordHash,
      role: 'ADMIN',
      organizationId: org.id,
      mustChangePassword: false
    }
  });

  console.log(`Test Admin created successfully!`);
  console.log(`Login Email: ${email}`);
  console.log(`Password: ${password}`);
  console.log(`(This account will trigger 2FA since it is not the demo account)`);
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
