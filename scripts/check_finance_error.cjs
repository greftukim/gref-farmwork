const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  const errors = [];
  const warnings = [];
  page.on('console', msg => {
    if (msg.type() === 'error') errors.push(msg.text());
    if (msg.type() === 'warning') warnings.push(msg.text());
  });
  page.on('pageerror', err => errors.push('[PAGEERROR] ' + err.message));

  await page.goto('http://localhost:5173/login');
  await page.waitForSelector('input[placeholder*="아이디"]', { timeout: 10000 });
  await page.fill('input[placeholder*="아이디"]', 'jhkim');
  await page.fill('input[placeholder*="비밀번호"]', 'rmfpvm001');
  await page.click('button[type="submit"]');
  await page.waitForURL('**/admin/**', { timeout: 10000 });
  await page.waitForTimeout(1500);

  errors.length = 0;
  warnings.length = 0;

  console.log('Finance 페이지 이동...');
  await page.goto('http://localhost:5173/admin/hq/finance');
  await page.waitForTimeout(2500);

  console.log('\n=== Console Errors ===');
  if (errors.length === 0) console.log('(없음)');
  else errors.forEach((e, i) => console.log(`[${i+1}] ${e}`));

  console.log('\n=== Console Warnings ===');
  if (warnings.length === 0) console.log('(없음)');
  else warnings.forEach((w, i) => console.log(`[${i+1}] ${w}`));

  await browser.close();
  process.exit(0);
})();
