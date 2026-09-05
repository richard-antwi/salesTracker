import { PrismaClient } from '@prisma/client';
import { notifications } from '../src/lib/notifications';

const prisma = new PrismaClient();

async function main() {
  console.log('Testing live Postgres payment recording & Gmail SMTP notification...');

  const agreement = await prisma.agreement.findFirst({
    where: { hirer: { phone: '0241112233' } },
    include: { hirer: true, vehicle: true, payments: true },
  });

  if (!agreement) {
    throw new Error('Kwesi Mensah agreement not found in Postgres!');
  }

  console.log(`Found Agreement ID: ${agreement.id} for ${agreement.hirer.name}`);

  // Calculate current paid & balance
  const currentPaid = agreement.payments.reduce((sum, p) => sum + (p.voided ? 0 : Number(p.amount)), 0);
  const hpPrice = Number(agreement.hirePurchasePrice);
  const newPaymentAmount = 300;
  const newBalance = Math.max(0, hpPrice - (currentPaid + newPaymentAmount));

  // Record payment in Postgres
  const payment = await prisma.payment.create({
    data: {
      agreementId: agreement.id,
      amount: newPaymentAmount,
      datePaid: new Date(),
      channel: 'MOMO',
      reference: 'MM-VERIFY-POSTGRES',
      note: 'Verified payment on Supabase Postgres database',
      recordedBy: 'Admin Verification',
      voided: false,
    },
  });

  console.log(`✅ Payment recorded in Supabase Postgres! Payment ID: ${payment.id}`);

  // Send Live Gmail Notification to user's test address
  console.log(`Sending live Gmail notification to ${agreement.hirer.name} (richardantwi8888@gmail.com)...`);
  await notifications.sendPaymentReceived(
    {
      name: agreement.hirer.name,
      email: 'richardantwi8888@gmail.com', // Direct to user's test address
      phone: agreement.hirer.phone,
    },
    { amount: newPaymentAmount, channel: 'MOMO' },
    newBalance
  );

  console.log('\n🎉 End-to-End PostgreSQL & Gmail SMTP Verification Complete!');
}

main()
  .catch((err) => {
    console.error('❌ Verification failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
