// Growth 핫픽스 검증: farm_admin growth 접근 ErrorBoundary 회귀 확인
const { chromium } = require('playwright');

async function waitForLoad(page, timeout = 15000) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    const body = await page.textContent('body').catch(() => '');
    if (!body.includes('로딩 중...')) return true;
    await page.waitForTimeout(300);
  }
  return false;
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push(e.message));

  let pass = 0, fail = 0;
  const log = (ok, label, detail = '') => {
    const s = ok ? '✅ [PASS]' : '❌ [FAIL]';
    console.log(`  ${s} ${label}${detail ? ' — ' + detail : ''}`);
    ok ? pass++ : fail++;
  };

  // 로그인
  await page.goto('http://localhost:5173/login');
  await page.fill('input[placeholder*="아이디"]', 'hdkim').catch(() => {});
  await page.fill('input[type="password"]', 'rmfpvm001').catch(() => {});
  await page.click('button[type="submit"]').catch(() => {});
  await page.waitForTimeout(4500);
  const url1 = page.url();
  log(url1.includes('/admin'), 'hdkim 로그인', url1);

  // /admin/growth — ErrorBoundary 없어야 함
  await page.goto('http://localhost:5173/admin/growth');
  await waitForLoad(page, 20000);
  await page.waitForTimeout(1500);

  const bodyText = await page.textContent('body').catch(() => '');
  log(!bodyText.includes('앱 오류 발생'), 'ErrorBoundary 미노출');
  log(!bodyText.includes('Cannot read properties'), 'undefined.length 에러 없음');

  const hasGrowth = bodyText.includes('생육 대시보드') || bodyText.includes('생육 조사') || bodyText.includes('데이터가 없습니다') || bodyText.includes('기록이 없습니다');
  log(hasGrowth, '생육 대시보드 or 빈상태 표시', hasGrowth ? '정상' : bodyText.slice(0, 100));

  // 타이틀 또는 빈상태 (RLS 수정 후 데이터 있으면 대시보드)
  const hasDashboard = bodyText.includes('생육 대시보드');
  log(hasDashboard, '생육 대시보드 타이틀 (RLS fix 후 데이터 표시)', hasDashboard ? '실데이터 OK' : '빈상태 표시');

  // 작물 탭
  if (hasDashboard) {
    log(bodyText.includes('토마토'), '작물 탭: 토마토');
    log(bodyText.includes('오이') || bodyText.includes('파프리카'), '작물 탭: 추가 작물');
  }

  // /admin/growth/input
  await page.goto('http://localhost:5173/admin/growth/input');
  await waitForLoad(page, 15000);
  await page.waitForTimeout(1000);
  const inputBody = await page.textContent('body').catch(() => '');
  log(!inputBody.includes('앱 오류 발생'), 'growth/input ErrorBoundary 없음');

  // /admin/growth/heatmap
  await page.goto('http://localhost:5173/admin/growth/heatmap');
  await waitForLoad(page, 15000);
  await page.waitForTimeout(1000);
  const heatBody = await page.textContent('body').catch(() => '');
  log(!heatBody.includes('앱 오류 발생'), 'growth/heatmap ErrorBoundary 없음');

  // 콘솔 에러
  const critErrs = errs.filter(e => e.includes('Cannot read') || e.includes('TypeError'));
  log(critErrs.length === 0, '콘솔 TypeError 없음', critErrs.length > 0 ? critErrs[0].slice(0, 80) : '');

  console.log(`\n결과: PASS ${pass} / FAIL ${fail}`);
  await browser.close();
  process.exit(fail > 0 ? 1 : 0);
})();
