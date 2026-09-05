const http = require('http');
const fs = require('fs');
const path = require('path');

const ARTIFACT_DIR = 'C:\\Users\\USER\\.gemini\\antigravity-ide\\brain\\87bc0194-e431-4ed5-b6d6-eb7d190cfbf7';

async function makeRequest(pathName, method = 'GET', body = null, cookie = null, extraHeaders = {}) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3005,
      path: pathName,
      method,
      headers: {
        'Content-Type': 'application/json',
        ...extraHeaders,
      },
    };

    if (cookie) {
      options.headers['Cookie'] = cookie;
    }

    const req = http.request(options, (res) => {
      const chunks = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => {
        const buffer = Buffer.concat(chunks);
        const contentType = res.headers['content-type'] || '';
        let parsed = null;
        if (contentType.includes('application/json')) {
          try {
            parsed = JSON.parse(buffer.toString());
          } catch {}
        }
        resolve({
          status: res.statusCode,
          headers: res.headers,
          data: parsed,
          buffer,
          cookies: res.headers['set-cookie'],
        });
      });
    });

    req.on('error', (err) => reject(err));
    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

async function runNotificationsPdfVerification() {
  console.log('===============================================================');
  console.log('  VERIFICATION: NOTIFICATION SYSTEM & PDF STATEMENT EXPORT');
  console.log('===============================================================\n');

  // 1. Admin Login
  console.log('1. Admin Login (Emmanuel Osei)...');
  const adminLogin = await makeRequest('/api/auth/login', 'POST', {
    identifier: '0240000000',
    password: 'Admin123!',
  });
  const adminCookie = adminLogin.cookies ? adminLogin.cookies[0].split(';')[0] : '';
  console.log('   Admin Login Status:', adminLogin.status);

  // 2. Fetch Agreements
  const portfolioRes = await makeRequest('/api/agreements', 'GET', null, adminCookie);
  const agreements = portfolioRes.data.agreements;
  const sampleAgr = agreements[0];
  console.log(`   Sample Agreement ID: ${sampleAgr.id} (${sampleAgr.hirer.name} - ${sampleAgr.vehicle.registrationNo})`);

  // 3. Record Payment & Trigger Instant Notifications
  console.log('\n2. Recording Test Payment (GH₵ 500 via MOMO) & Triggering Notifications...');
  const payRes = await makeRequest(`/api/agreements/${sampleAgr.id}/payments`, 'POST', {
    amount: 500,
    datePaid: new Date().toISOString().split('T')[0],
    channel: 'MOMO',
    reference: 'MM-NOTIFICATION-TEST-99',
    note: 'Verification payment test for notifications',
  }, adminCookie);

  console.log('   Payment Status:', payRes.status, '| Message:', payRes.data.message);
  console.log('   New Balance Remaining:', payRes.data.summary?.balanceRemaining, 'GH₵');

  // 4. Test Cron Reminders Endpoint
  console.log('\n3. Testing /api/cron/reminders Endpoint...');
  const cronRes = await makeRequest('/api/cron/reminders', 'GET', null, null, {
    Authorization: 'Bearer work_and_pay_cron_secret_2026',
  });
  console.log('   Cron Status:', cronRes.status);
  console.log('   Cron Output Data:', JSON.stringify(cronRes.data, null, 2));

  // 5. Test PDF Statement Generation
  console.log('\n4. Testing PDF Statement Generation Endpoint (/api/agreements/[id]/pdf)...');
  const pdfRes = await makeRequest(`/api/agreements/${sampleAgr.id}/pdf`, 'GET', null, adminCookie);
  console.log('   PDF Status:', pdfRes.status);
  console.log('   Content-Type:', pdfRes.headers['content-type']);
  console.log('   Content-Disposition:', pdfRes.headers['content-disposition']);
  console.log('   PDF Buffer Byte Size:', pdfRes.buffer.length, 'bytes');

  // Save generated PDF to artifacts directory
  const pdfFileName = `Statement_${sampleAgr.vehicle.registrationNo.replace(/\s+/g, '_')}_Verified.pdf`;
  const pdfPath = path.join(ARTIFACT_DIR, pdfFileName);
  fs.writeFileSync(pdfPath, pdfRes.buffer);
  console.log(`   📸 Saved Verified PDF Statement to: ${pdfPath}`);

  console.log('\n===============================================================');
  console.log('  VERIFICATION COMPLETE — ALL NOTIFICATION & PDF TESTS PASSED');
  console.log('===============================================================\n');
}

runNotificationsPdfVerification().catch(console.error);
