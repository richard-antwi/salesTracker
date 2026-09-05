const http = require('http');

async function makeRequest(path, method = 'GET', body = null, cookie = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3005,
      path,
      method,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    if (cookie) {
      options.headers['Cookie'] = cookie;
    }

    const req = http.request(options, (res) => {
      let data = '';
      const responseCookies = res.headers['set-cookie'];
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, data: parsed, cookies: responseCookies });
        } catch {
          resolve({ status: res.statusCode, raw: data, cookies: responseCookies });
        }
      });
    });

    req.on('error', (err) => reject(err));
    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

async function runVerification() {
  console.log('=== WORK & PAY PLATFORM VERIFICATION SCRIPT ===\n');

  // 1. Admin Login
  console.log('1. Testing Admin Login (Emmanuel Osei)...');
  const adminLogin = await makeRequest('/api/auth/login', 'POST', {
    identifier: '0240000000',
    password: 'Admin123!',
  });
  console.log('   Status:', adminLogin.status, '| Role:', adminLogin.data.user?.role);
  const adminCookie = adminLogin.cookies ? adminLogin.cookies[0].split(';')[0] : '';

  // 2. Fetch Admin Agreements Portfolio
  console.log('\n2. Fetching Admin Portfolio...');
  const adminPortfolio = await makeRequest('/api/agreements', 'GET', null, adminCookie);
  console.log('   Agreements count:', adminPortfolio.data.agreements?.length);
  const initialAgr = adminPortfolio.data.agreements[0];
  console.log('   Sample Agreement:', initialAgr?.hirer?.name, '| Vehicle:', initialAgr?.vehicle?.registrationNo);
  console.log('   Balance Remaining:', initialAgr?.summary?.balanceRemaining, 'GH₵');
  console.log('   % Paid:', initialAgr?.summary?.percentComplete, '%');
  console.log('   Status Badge:', initialAgr?.summary?.statusBadge?.label);
  console.log('   Scheduled Finish Date:', initialAgr?.summary?.scheduledFinishDate);
  console.log('   Actual Pace Finish Date:', initialAgr?.summary?.actualPaceFinishDate);

  // 3. Create New Agreement (Kofi Annan)
  console.log('\n3. Creating New Agreement for Kofi Annan (GT-9911-24)...');
  const newAgrRes = await makeRequest('/api/agreements', 'POST', {
    ownerName: 'Emmanuel Osei (Owner)',
    ownerPhone: '0240000000',
    hirerName: 'Kofi Annan',
    hirerPhone: '0249998877',
    hirerEmail: 'kofi@workandpay.gh',
    makeModel: 'TVS HLX 150',
    registrationNo: 'GT-9911-24',
    cashPrice: 12000,
    hirePurchasePrice: 16000,
    installmentAmount: 400,
    frequency: 'WEEKLY',
    totalInstallments: 40,
    startDate: '2026-08-01',
  }, adminCookie);

  console.log('   Status:', newAgrRes.status);
  const newAgreementId = newAgrRes.data.agreement?.id;
  console.log('   New Agreement ID:', newAgreementId);
  console.log('   Assigned Rider Initial Password:', newAgrRes.data.assignedPassword);

  // 4. Record 2 Payments against new agreement
  console.log('\n4. Recording 2 test payments...');
  const p1 = await makeRequest(`/api/agreements/${newAgreementId}/payments`, 'POST', {
    amount: 400,
    datePaid: '2026-08-08',
    channel: 'MOMO',
    reference: 'MM-884012',
    note: 'Week 1 installment via MTN MoMo',
  }, adminCookie);
  console.log('   Payment 1 (MoMo GH₵ 400):', p1.status, '| Message:', p1.data.message);

  const p2 = await makeRequest(`/api/agreements/${newAgreementId}/payments`, 'POST', {
    amount: 800,
    datePaid: '2026-08-22',
    channel: 'CASH',
    reference: 'REC-9011',
    note: 'Weeks 2 & 3 cash payment at depot',
  }, adminCookie);
  console.log('   Payment 2 (Cash GH₵ 800):', p2.status, '| Message:', p2.data.message);

  // 5. Fetch updated agreement detail
  console.log('\n5. Verifying recalculated balance and projections for new agreement...');
  const updatedAgrRes = await makeRequest(`/api/agreements/${newAgreementId}`, 'GET', null, adminCookie);
  const updatedAgr = updatedAgrRes.data.agreement;
  console.log('   Total Paid:', updatedAgr.summary.totalPaid, 'GH₵');
  console.log('   Balance Remaining:', updatedAgr.summary.balanceRemaining, 'GH₵ (Expected: 14,800 GH₵)');
  console.log('   % Paid:', updatedAgr.summary.percentComplete.toFixed(2), '%');
  console.log('   Scheduled Finish:', updatedAgr.summary.scheduledFinishDate);
  console.log('   Actual Pace Finish:', updatedAgr.summary.actualPaceFinishDate);

  // 6. Void Payment 1 to test soft-delete audit trail
  const paymentToVoidId = updatedAgr.payments.find((p) => p.reference === 'MM-884012')?.id;
  console.log('\n6. Soft-deleting / Voiding Payment 1 (ID:', paymentToVoidId, ')...');
  const voidRes = await makeRequest(`/api/payments/${paymentToVoidId}/void`, 'PATCH', null, adminCookie);
  console.log('   Void Status:', voidRes.status, '| Message:', voidRes.data.message);

  const afterVoidAgrRes = await makeRequest(`/api/agreements/${newAgreementId}`, 'GET', null, adminCookie);
  const afterVoid = afterVoidAgrRes.data.agreement;
  console.log('   Recalculated Balance after void:', afterVoid.summary.balanceRemaining, 'GH₵ (Expected: 15,200 GH₵)');
  console.log('   Voided payment log note:', afterVoid.payments.find((p) => p.id === paymentToVoidId)?.note);

  // 7. Rider Login & Security Isolation Check
  console.log('\n7. Testing Rider Login & Security Isolation (Kwesi Mensah)...');
  const riderLogin = await makeRequest('/api/auth/login', 'POST', {
    identifier: '0241112233',
    password: 'Rider123!',
  });
  console.log('   Status:', riderLogin.status, '| Role:', riderLogin.data.user?.role);
  const riderCookie = riderLogin.cookies ? riderLogin.cookies[0].split(';')[0] : '';

  const riderPortfolio = await makeRequest('/api/agreements', 'GET', null, riderCookie);
  console.log('   Rider visible agreements count:', riderPortfolio.data.agreements?.length);
  console.log('   Rider agreement Hirer name:', riderPortfolio.data.agreements[0]?.hirer?.name);

  // Try accessing Kofi Annan\'s agreement ID with Kwesi\'s rider session
  const forbiddenCheck = await makeRequest(`/api/agreements/${newAgreementId}`, 'GET', null, riderCookie);
  console.log('   Attempting to access unauthorized agreement status:', forbiddenCheck.status, '(Expected 403 Forbidden)');

  console.log('\n=== VERIFICATION SUMMARY COMPLETE ===');
}

runVerification().catch(console.error);
