const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  page.on('console', msg => console.log(`[console.${msg.type()}] ${msg.text().slice(0,100)}`));
  await page.goto('http://localhost:5173/login', { waitUntil: 'domcontentloaded', timeout: 15000 });
  await page.waitForTimeout(1000);
  console.log('URL after load:', page.url());
  const inputs = await page.$$('input');
  console.log('inputs found:', inputs.length);
  for (const input of inputs) {
    const ph = await input.getAttribute('placeholder').catch(()=>'');
    const type = await input.getAttribute('type').catch(()=>'');
    console.log('  input type='+type+' placeholder='+ph);
  }
  const idInput = await page.$('input[placeholder*="아이디"]');
  const pwInput = await page.$('input[type="password"]');
  if (idInput) await idInput.fill('jhkim');
  if (pwInput) await pwInput.fill('rmfpvm001');
  console.log('filled inputs. submitting...');
  await page.click('button[type="submit"]').catch(e => console.log('submit click error:', e.message));
  await page.waitForTimeout(4000);
  console.log('URL after submit wait:', page.url());
  await browser.close();
})();
