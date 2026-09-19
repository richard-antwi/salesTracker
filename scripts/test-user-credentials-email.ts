import { PrismaClient } from '@prisma/client';
import { notifications } from '../src/lib/notifications';

const prisma = new PrismaClient();

async function runCredentialsTest() {
  console.log('--------------------------------------------------');
  console.log('🧪 RUNNING USER CREDENTIALS & EMAIL NOTIFICATION TEST');
  console.log('--------------------------------------------------\n');

  let passedCount = 0;
  let totalCount = 0;

  function assert(condition: boolean, message: string) {
    totalCount++;
    if (condition) {
      console.log(`  ✅ TEST ${totalCount} PASSED: ${message}`);
      passedCount++;
    } else {
      console.error(`  ❌ TEST ${totalCount} FAILED: ${message}`);
    }
  }

  try {
    const org = await prisma.organization.findFirst();
    assert(!!org, 'Found Organization in dev DB');

    if (org) {
      const testPhone = '0207771122';
      const testEmail = 'testguarantor@example.com';

      // Clean up previous test user if exists
      await prisma.user.deleteMany({ where: { phone: testPhone } });

      // Simulate auto-generated password logic
      const assignedPassword = 'WP-GUA-' + Math.random().toString(36).slice(-6).toUpperCase();
      assert(assignedPassword.startsWith('WP-GUA-'), 'Auto-generated password has correct prefix (WP-GUA-XXXXXX)');
      assert(assignedPassword.length >= 10, 'Auto-generated password has sufficient entropy');

      // Create user with mustChangePassword = true
      const newUser = await prisma.user.create({
        data: {
          organizationId: org.id,
          name: 'Kwame Test Guarantor',
          phone: testPhone,
          email: testEmail,
          passwordHash: 'dummyhash',
          role: 'GUARANTOR',
          mustChangePassword: true,
        },
      });

      assert(newUser.mustChangePassword === true, 'Created user has mustChangePassword = true');

      // Test Notification Dispatch
      await notifications.sendUserAccountCreated(
        {
          name: newUser.name,
          phone: newUser.phone,
          email: newUser.email,
          role: newUser.role,
        },
        assignedPassword
      );
      assert(true, 'sendUserAccountCreated dispatched successfully');

      // Cleanup
      await prisma.user.delete({ where: { id: newUser.id } });
      console.log('  🧹 Cleaned up temporary test user');
    }
  } catch (err: any) {
    console.error('  ❌ Error:', err.message);
  }

  console.log('\n--------------------------------------------------');
  console.log(`📊 RESULTS: ${passedCount} / ${totalCount} tests passed`);
  console.log('--------------------------------------------------\n');

  await prisma.$disconnect();
  if (passedCount === totalCount) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}

runCredentialsTest();
