const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: 'postgresql://postgres:admin@localhost:5432/salestracker_multitenant_dev?schema=public'
    }
  }
});

async function main() {
  const bcrypt = require('bcryptjs');
  
  // Upsert Organization in case it was missing
  const demoEmail = 'demo@workandpay.gh';
  const org = await prisma.organization.upsert({
    where: { slug: 'demo-fleet' },
    update: {},
    create: {
      name: 'Demo Fleet Sandbox',
      slug: 'demo-fleet',
      status: 'APPROVED',
      contactEmail: demoEmail,
      contactPhone: '0550000000',
      subscriptionStatus: 'TRIAL',
      trialEndsAt: new Date(new Date().setDate(new Date().getDate() + 14)),
    }
  });

  const passwordHash = await bcrypt.hash('DEMO', 10);

  // Update or Create the Demo Admin with 0550000000
  const demoUser = await prisma.user.upsert({
    where: { phone: '0550000000' },
    update: { role: 'ADMIN', organizationId: org.id },
    create: {
      organizationId: org.id,
      name: 'Demo Admin',
      phone: '0550000000',
      email: 'admin@demo.com',
      passwordHash,
      role: 'ADMIN',
      mustChangePassword: false,
    }
  });
  console.log('Created/Updated Demo Admin locally:', demoUser.id);
}
main().catch(console.error).finally(() => prisma.$disconnect());
