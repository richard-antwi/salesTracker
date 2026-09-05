const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');

const ARTIFACTS_DIR = 'C:\\Users\\USER\\.gemini\\antigravity-ide\\brain\\87bc0194-e431-4ed5-b6d6-eb7d190cfbf7';
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

async function capture() {
  console.log('🚀 Starting Chrome automation via puppeteer-core...');

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();

  // 1. Capture Request Access Desktop
  console.log('📸 Capturing /request-access (Desktop 1280x800)...');
  await page.setViewport({ width: 1280, height: 800 });
  await page.goto('http://localhost:3000/request-access', { waitUntil: 'networkidle0' });
  await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'request_access_desktop.png'), fullPage: false });

  // 2. Capture Request Access Mobile (375x812)
  console.log('📸 Capturing /request-access (Mobile 375x812)...');
  await page.setViewport({ width: 375, height: 812, isMobile: true, hasTouch: true });
  await page.goto('http://localhost:3000/request-access', { waitUntil: 'networkidle0' });
  await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'request_access_mobile.png'), fullPage: false });

  // 3. Log in as Super Admin
  console.log('🔑 Logging in as Super Admin (0240000000)...');
  await page.setViewport({ width: 1280, height: 800 });
  await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle0' });
  
  // Fill login inputs
  await page.type('input[type="text"], input[name="identifier"]', '0240000000');
  await page.type('input[type="password"]', 'Admin123!');
  await Promise.all([
    page.waitForNavigation({ waitUntil: 'networkidle0' }),
    page.click('button[type="submit"]'),
  ]);

  console.log(`Current page URL after login: ${page.url()}`);

  // 4. Capture Super Admin Dashboard Desktop
  console.log('📸 Capturing /super-admin (Desktop 1280x800)...');
  await page.goto('http://localhost:3000/super-admin', { waitUntil: 'networkidle0' });
  await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'super_admin_desktop.png'), fullPage: false });

  // 5. Capture Super Admin Dashboard Mobile (375x812)
  console.log('📸 Capturing /super-admin (Mobile 375x812)...');
  await page.setViewport({ width: 375, height: 812, isMobile: true, hasTouch: true });
  await page.goto('http://localhost:3000/super-admin', { waitUntil: 'networkidle0' });
  await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'super_admin_mobile.png'), fullPage: false });

  await browser.close();
  console.log('✅ All screenshots captured successfully!');
}

capture().catch((err) => {
  console.error('❌ Screenshot capture error:', err);
  process.exit(1);
});
