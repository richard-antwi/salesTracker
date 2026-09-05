const https = require('https');

const PROD_HOST = 'salestrackergh.vercel.app';

function makeRequest(path, method = 'GET', body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const postData = body ? JSON.stringify(body) : '';
    const reqHeaders = {
      'Content-Type': 'application/json',
      ...headers,
    };
    if (body) reqHeaders['Content-Length'] = Buffer.byteLength(postData);

    const req = https.request(
      {
        hostname: PROD_HOST,
        port: 443,
        path,
        method,
        headers: reqHeaders,
      },
      (res) => {
        let responseBody = '';
        const cookieHeader = res.headers['set-cookie'];
        res.on('data', (chunk) => (responseBody += chunk));
        res.on('end', () => {
          let data;
          try {
            data = JSON.parse(responseBody);
          } catch {
            data = responseBody;
          }
          resolve({ status: res.statusCode, data, cookies: cookieHeader });
        });
      }
    );

    req.on('error', reject);
    if (body) req.write(postData);
    req.end();
  });
}

async function verifyAgreementDetail() {
  console.log('======================================================================');
  console.log('🔍 VERIFYING AGREEMENT DETAIL FIX ON LIVE PRODUCTION');
  console.log(`Target: https://${PROD_HOST}/api/agreements/cmtokerqf000cvlvw7wtqt05g`);
  console.log('======================================================================\n');

  console.log('1. Authenticating as Admin (0240000000)...');
  let loginRes;
  for (let attempt = 1; attempt <= 5; attempt++) {
    loginRes = await makeRequest('/api/auth/login', 'POST', {
      identifier: '0240000000',
      password: 'Admin123!',
    });
    if (loginRes.status === 200) break;
    console.log(`   Attempt ${attempt} waiting for Vercel deployment...`);
    await new Promise((r) => setTimeout(r, 4000));
  }

  const sessionCookie = loginRes.cookies ? loginRes.cookies[0].split(';')[0] : '';

  console.log('2. Fetching agreement detail for ID cmtokerqf000cvlvw7wtqt05g...');
  const detailRes = await makeRequest('/api/agreements/cmtokerqf000cvlvw7wtqt05g', 'GET', null, {
    Cookie: sessionCookie,
  });

  console.log(`   HTTP Status: ${detailRes.status}`);
  if (detailRes.status === 200) {
    const agr = detailRes.data.agreement;
    console.log('   ✅ AGREEMENT DETAIL FETCH SUCCESSFUL!');
    console.log(`   Hirer Name: ${agr.hirer?.name}`);
    console.log(`   Vehicle Reg: ${agr.vehicle?.registrationNo}`);
    console.log(`   Total Payments Recorded: ${agr.payments?.length}`);
    console.log(`   Remaining Balance: GH₵ ${agr.summary?.balanceRemaining}`);
    console.log(`   Status Logs Count: ${agr.statusLogs?.length}`);
  } else {
    console.error('   ❌ ERROR:', JSON.stringify(detailRes.data));
  }

  console.log('======================================================================');
}

verifyAgreementDetail().catch(console.error);
