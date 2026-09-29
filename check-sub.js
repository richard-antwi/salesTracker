const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: 'postgresql://postgres:admin@localhost:5432/salestracker_multitenant_dev?schema=public'
    }
  }
});

async function checkSub() {
  const org = await prisma.organization.findUnique({
    where: { id: 'cmu9w112e0000vlro3tgja2dn' }
  });
  console.log('Org status:', org.subscriptionStatus);
  console.log('Period End:', org.currentPeriodEnd);
  
  const subs = await prisma.subscriptionPayment.findMany({
    where: { organizationId: 'cmu9w112e0000vlro3tgja2dn' }
  });
  console.log('Subscription payments:', subs);
}
checkSub();
