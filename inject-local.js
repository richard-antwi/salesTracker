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
  const org = await prisma.organization.findUnique({ where: { slug: 'demo-fleet' } });
  
  if (org) {
    let guarantor = await prisma.user.findUnique({ where: { phone: '0240000002' } });
    if (!guarantor) {
      const passwordHash = await bcrypt.hash('DEMO', 10);
      guarantor = await prisma.user.create({
        data: {
          organizationId: org.id,
          name: 'Demo Guarantor',
          phone: '0240000002',
          email: 'guarantor@demo.com',
          passwordHash,
          role: 'GUARANTOR',
        }
      });
      console.log('Created Demo Guarantor locally:', guarantor.id);
    } else {
      console.log('Demo Guarantor already exists locally');
    }
  } else {
    console.log('Demo org not found locally');
  }
}
main().catch(console.error).finally(() => prisma.$disconnect());
