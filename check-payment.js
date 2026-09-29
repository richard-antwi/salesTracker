const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: 'postgresql://postgres.jhxctmcjbjkicgrlzftr:dbadmin%408888R@aws-0-eu-central-1.pooler.supabase.com:6543/postgres?pgbouncer=true'
    }
  }
});

async function checkDatabase() {
  try {
    const latestPayment = await prisma.payment.findMany({
      orderBy: { createdAt: 'desc' },
      take: 1,
      include: {
        agreement: {
          select: { id: true, ownerName: true, hirePurchasePrice: true }
        },
        organization: {
          select: { name: true }
        }
      }
    });

    console.log('\n✅ Latest Payment Record:');
    console.log(JSON.stringify(latestPayment, null, 2));

    if (latestPayment.length > 0) {
      const agreementId = latestPayment[0].agreementId;
      const allPayments = await prisma.payment.findMany({
        where: { agreementId }
      });
      const totalPaid = allPayments.reduce((sum, p) => sum + Number(p.amount), 0);
      
      console.log(`\n📊 Agreement ID: ${agreementId}`);
      console.log(`Total Paid so far: GHS ${totalPaid}`);
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkDatabase();
