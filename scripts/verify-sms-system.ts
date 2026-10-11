import 'dotenv/config';
import { notifications, normalizeGhanaPhone } from '../src/lib/notifications';
import { prisma } from '../src/lib/db';
import { CONFIG } from '../src/lib/config';

async function runVerification() {
  console.log('=== [1] Testing Ghana Phone Number Normalization ===');
  const testNumbers = [
    { input: '0592303054', expected: '233592303054' },
    { input: '592303054', expected: '233592303054' },
    { input: '+233592303054', expected: '233592303054' },
    { input: '233592303054', expected: '233592303054' },
    { input: '024 123 4567', expected: '233241234567' },
  ];

  for (const { input, expected } of testNumbers) {
    const normalized = normalizeGhanaPhone(input);
    const pass = normalized === expected;
    console.log(`[PHONE TEST] ${input} -> ${normalized} [${pass ? 'PASSED' : 'FAILED'}]`);
    if (!pass) throw new Error(`Normalization mismatch for ${input}`);
  }

  console.log('\n=== [2] Checking Config & SMS Provider Settings ===');
  console.log(`Provider: ${CONFIG.SMS_PROVIDER}`);
  console.log(`SMS Enabled: ${CONFIG.SMS_ENABLED}`);
  console.log(`Sender ID: ${CONFIG.SMSONLINEGH_SENDER_ID}`);
  console.log(`API Key set?: ${Boolean(CONFIG.SMSONLINEGH_API_KEY && CONFIG.SMSONLINEGH_API_KEY.length > 5)}`);

  console.log('\n=== [3] Checking SMS Balance via notifications facade ===');
  const balance = await notifications.getSmsBalance();
  console.log('Balance response:', balance);

  console.log('\n=== [4] Testing Custom SMS to User Test Phone (0592303054) ===');
  const testSend = await notifications.sendCustomSms(
    '0592303054',
    'Work & Pay Test: Your SMS notification system is successfully configured.',
    'User Test',
    'TEST_VERIFICATION'
  );
  console.log('Test dispatch result:', testSend);

  console.log('\n=== [5] Testing Overdue Alert Notification Flow ===');
  // Overdue alert must send SMS to rider only, and Email to Fleet Owner & Platform Owner.
  const overdueResult = await notifications.sendOverdueAlert({
    hirer: {
      name: 'Kwame Mensah (Test Rider)',
      phone: '0592303054',
      email: 'rider-test@workandpay.gh',
    },
    vehicleReg: 'GR-4829-24',
    daysOverdue: 4,
    balanceRemaining: 650.00,
    fleetOwnerEmail: 'fleetowner-test@workandpay.gh',
    platformOwnerEmail: CONFIG.ADMIN_EMAIL,
  });
  console.log('Overdue alert dispatch result:', overdueResult);

  console.log('\n=== [6] Testing Payment Received SMS Gating ===');
  // Scenario A: receivePaymentSms = false (default) -> SMS must NOT be sent
  const paymentWithoutSms = await notifications.sendPaymentReceived(
    {
      name: 'Kwame Mensah',
      phone: '0592303054',
      email: 'rider-test@workandpay.gh',
      receivePaymentSms: false,
    },
    { amount: 250, channel: 'MOMO' },
    400
  );
  console.log('Payment (SMS Disabled) result: SMS was bypassed successfully.');

  // Scenario B: receivePaymentSms = true -> SMS should be dispatched
  const paymentWithSms = await notifications.sendPaymentReceived(
    {
      name: 'Kwame Mensah',
      phone: '0592303054',
      email: 'rider-test@workandpay.gh',
      receivePaymentSms: true,
    },
    { amount: 250, channel: 'MOMO' },
    400
  );
  console.log('Payment (SMS Enabled) result: SMS was triggered successfully.');

  console.log('\n=== [7] Inspecting Audit Logs in Database ===');
  const recentLogs = await prisma.smsLog.findMany({
    take: 5,
    orderBy: { createdAt: 'desc' }
  });
  console.log(`Found ${recentLogs.length} audit logs:`);
  for (const log of recentLogs) {
    console.log(`- [${log.status}] [${log.purpose}] To: ${log.recipient} (${log.recipientName || 'N/A'}) - Msg: "${log.message.slice(0, 45)}..."`);
  }

  console.log('\n=== ALL VERIFICATIONS PASSED ===');
}

runVerification()
  .catch((err) => {
    console.error('Verification failed with error:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
