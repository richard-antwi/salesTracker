const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

// Force the production database URL
process.env.DATABASE_URL = 'postgresql://postgres.jhxctmcjbjkicgrlzftr:cQ%24X%214yiUQ%2332hY@aws-0-eu-central-1.pooler.supabase.com:5432/postgres?sslmode=no-verify';

const prisma = new PrismaClient();

async function main() {
  const phone = '0201112233';
  console.log('Connecting to Live Supabase DB...');
  let user = await prisma.user.findFirst({ where: { phone } });
  
  const hashedPassword = await bcrypt.hash('123456', 10);
  
  if (!user) {
    const org = await prisma.organization.findFirst();
    user = await prisma.user.create({
      data: {
        name: 'Yaw Osei',
        phone: phone,
        email: 'guarantor.yaw@example.com',
        role: 'GUARANTOR',
        passwordHash: hashedPassword,
        organizationId: org ? org.id : undefined,
        mustChangePassword: false
      }
    });
    console.log('Created Guarantor user on PROD:', user.phone);
  } else {
    await prisma.user.update({
      where: { id: user.id },
      data: {
        role: 'GUARANTOR',
        passwordHash: hashedPassword,
        mustChangePassword: false
      }
    });
    console.log('Updated Guarantor user on PROD:', user.phone);
  }
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
