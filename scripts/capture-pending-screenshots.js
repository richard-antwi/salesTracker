const puppeteer = require('puppeteer-core');
const path = require('path');
const http = require('http');

const ARTIFACTS_DIR = 'C:\\Users\\USER\\.gemini\\antigravity-ide\\brain\\87bc0194-e431-4ed5-b6d6-eb7d190cfbf7';
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

async function makeRequest(path, method = 'GET', body = null) {
  return new Promise((resolve, reject) => {
    const postData = body ? JSON.stringify(body) : '';
    const reqHeaders = { 'Content-Type': 'application/json' };
    if (body) reqHeaders['Content-Length'] = Buffer.byteLength(postData);

    const req = http.request(
      { hostname: 'localhost', port: 3000, path, method, headers: reqHeaders },
      (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => resolve(JSON.parse(data)));
      }
    );
    req.on('error', reject);
    if (body) req.write(postData);
    req.end();
  });
}

async function capturePending() {
  console.log('📝 Submitting pending access request for screenshot capture...');
  const testId = Date.now().toString().slice(-4);
  const pendingOrgName = `Tamale Fleet ${testId}`;
  
  await makeRequest('/api/organizations/request-access', 'POST', {
    name: pendingOrgName,
    ownerName: 'Ibrahim Alhassan',
    contactPhone: `02477${testId}9`,
    contactEmail: `ibrahim${testId}@tamalefleet.com`,
    adminPassword: 'Tamale2026!',
  });

  console.log('🚀 Starting Chrome automation...');
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();

  // Log in as Super Admin
  await page.setViewport({ width: 1280, height: 800 });
  await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle0' });
  await page.type('input[type="text"], input[name="identifier"]', '0240000000');
  await page.type('input[type="password"]', 'Admin123!');
  await Promise.all([
    page.waitForNavigation({ waitUntil: 'networkidle0' }),
    page.click('button[type="submit"]'),
  ]);

  // Capture Super Admin Dashboard Desktop with Pending Request
  console.log('📸 Capturing /super-admin with Pending Request (Desktop 1280x800)...');
  await page.goto('http://localhost:3000/super-admin', { waitUntil: 'networkidle0' });
  await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'super_admin_pending_desktop.png'), fullPage: false });

  // Capture Super Admin Dashboard Mobile with Pending Request
  console.log('📸 Capturing /super-admin with Pending Request (Mobile 375x812)...');
  await page.setViewport({ width: 375, height: 812, isMobile: true, hasTouch: true });
  await page.goto('http://localhost:3000/super-admin', { waitUntil: 'networkidle0' });
  await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'super_admin_pending_mobile.png'), fullPage: false });

  await browser.close();
  console.log('✅ Pending screenshots captured successfully!');
}

capturePending().catch((err) => {
  console.error('❌ Screenshot error:', err);
  process.exit(1);
});
