const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

const EDGE_PATH_1 = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const EDGE_PATH_2 = 'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe';
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

function getExecutablePath() {
  if (fs.existsSync(EDGE_PATH_1)) return EDGE_PATH_1;
  if (fs.existsSync(EDGE_PATH_2)) return EDGE_PATH_2;
  if (fs.existsSync(CHROME_PATH)) return CHROME_PATH;
  throw new Error('No Edge or Chrome browser executable found on system');
}

const ARTIFACTS_DIR = 'C:\\Users\\USER\\.gemini\\antigravity-ide\\brain\\87bc0194-e431-4ed5-b6d6-eb7d190cfbf7';

async function main() {
  const executablePath = getExecutablePath();
  console.log(`Using browser executable: ${executablePath}`);

  const browser = await puppeteer.launch({
    executablePath,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();

  // 1. Log in
  console.log('Logging in as Admin...');
  await page.goto('http://localhost:3005/login', { waitUntil: 'networkidle0' });
  await page.type('input[type="text"]', '0240000000');
  await page.type('input[type="password"]', 'Admin123!');
  await page.click('button[type="submit"]');
  await page.waitForNavigation({ waitUntil: 'networkidle0' });

  // 2. Admin Dashboard Desktop (1280x800)
  console.log('Capturing Admin Dashboard Desktop...');
  await page.setViewport({ width: 1280, height: 800 });
  await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'admin_dashboard_phase2_desktop.png'), fullPage: true });

  // 3. Admin Dashboard Mobile (375x812)
  console.log('Capturing Admin Dashboard Mobile...');
  await page.setViewport({ width: 375, height: 812 });
  await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'admin_dashboard_phase2_mobile.png'), fullPage: true });

  // 4. Agreement Detail Page Desktop (1280x800)
  console.log('Capturing Agreement Detail Desktop...');
  await page.setViewport({ width: 1280, height: 800 });
  await page.goto('http://localhost:3005/admin/agreements/cmtodrov50004vlfwcl0kzrrh', { waitUntil: 'networkidle0' });
  await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'admin_detail_phase2_desktop.png'), fullPage: true });

  // 5. Agreement Detail Page Mobile (375x812)
  console.log('Capturing Agreement Detail Mobile...');
  await page.setViewport({ width: 375, height: 812 });
  await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'admin_detail_phase2_mobile.png'), fullPage: true });

  // 6. Admin Users Page Desktop (1280x800)
  console.log('Capturing Admin Users Page Desktop...');
  await page.setViewport({ width: 1280, height: 800 });
  await page.goto('http://localhost:3005/admin/users', { waitUntil: 'networkidle0' });
  await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'admin_users_phase2_desktop.png'), fullPage: true });

  await browser.close();
  console.log('Screenshots captured successfully!');
}

main().catch((err) => {
  console.error('Error capturing screenshots:', err);
  process.exit(1);
});
