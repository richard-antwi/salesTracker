const http = require('http');
const { SignJWT } = require('jose');
const { PrismaClient } = require('@prisma/client');

async function testNoticeEndpoint() {
  console.log('--------------------------------------------------');
  console.log('🧪 RUNNING PHASE 3: LEGAL NOTICE API ENDPOINT TEST');
  console.log('--------------------------------------------------\n');

  const prisma = new PrismaClient();

  try {
    const agreement = await prisma.agreement.findFirst();

    if (!agreement) {
      console.log('  ⚠️ Missing Agreement record in dev DB');
      process.exit(1);
    }

    const adminUser = await prisma.user.findFirst({
      where: {
        organizationId: agreement.organizationId,
      },
    });

    if (!adminUser) {
      console.log('  ⚠️ Missing Admin user for agreement organization in dev DB');
      process.exit(1);
    }

    const jwtSecret = "dbc921c4c177c275a08b3294cbafe1c03ddd3ba890d16f4bcbfd5d8fd7fd748f";
    const secretKey = new TextEncoder().encode(jwtSecret);
    const token = await new SignJWT({
      userId: adminUser.id,
      organizationId: adminUser.organizationId,
      name: adminUser.name,
      phone: adminUser.phone,
      role: adminUser.role,
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('1d')
      .sign(secretKey);

    const optionsDefault = {
      hostname: 'localhost',
      port: 3000,
      path: `/api/agreements/${agreement.id}/notice?type=default`,
      method: 'GET',
      headers: {
        Cookie: `work_and_pay_session=${token}`,
      },
    };

    const req = http.request(optionsDefault, (res) => {
      console.log(`  ✅ Default Notice API Status Code: ${res.statusCode}`);
      console.log(`  ✅ Content-Type: ${res.headers['content-type']}`);
      console.log(`  ✅ Content-Disposition: ${res.headers['content-disposition']}`);

      let chunks = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => {
        const buffer = Buffer.concat(chunks);
        console.log(`  ✅ Response PDF Buffer Size: ${buffer.length} bytes`);
        const isPdf = buffer.toString('utf-8', 0, 5) === '%PDF-';
        console.log(`  ✅ PDF Magic Bytes Verified (%PDF-): ${isPdf}`);

        if (res.statusCode === 200 && isPdf) {
          console.log('\n--------------------------------------------------');
          console.log('📊 PHASE 3 LEGAL NOTICE PDF API TEST PASSED 100%');
          console.log('--------------------------------------------------\n');
          process.exit(0);
        } else {
          console.error('❌ Endpoint failed or invalid PDF response');
          process.exit(1);
        }
      });
    });

    req.on('error', (err) => {
      console.error('  ❌ HTTP Request Error:', err.message);
      process.exit(1);
    });

    req.end();
  } catch (err) {
    console.error('  ❌ Setup Error:', err.message);
    process.exit(1);
  }
}

testNoticeEndpoint();
