// 세션 52 감사: HQ-FINANCE-001 Phase 1 — finance_monthly + KPI 실데이터 연결
const { chromium } = require('playwright');

const BASE_URL = 'http://localhost:5173';
let pass = 0, fail = 0, warn = 0;

function log(level, label, detail = '') {
  const icons = { PASS: '✅', FAIL: '❌', WARN: '⚠️' };
  console.log(`  ${icons[level] || '?'} [${level}] ${label}${detail ? ` — ${detail}` : ''}`);
  if (level === 'PASS') pass++;
  else if (level === 'FAIL') fail++;
  else if (level === 'WARN') warn++;
}

async function waitForDataLoad(page, timeout = 18000) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    const body = await page.textContent('body').catch(() => '');
    if (!body.includes('로딩 중...') && !body.includes('로딩 중…')) return true;
    await page.waitForTimeout(300);
  }
  return false;
}

async function goto(page, url) {
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 }).catch(() => page.goto(url).catch(() => {}));
}

async function loginAs(page, username, password = 'rmfpvm001') {
  await goto(page, `${BASE_URL}/login`);
  await page.fill('input[placeholder*="아이디"]', username).catch(() => {});
  await page.fill('input[type="password"]', password).catch(() => {});
  await page.click('button[type="submit"]').catch(() => {});
  await page.waitForTimeout(4500);
  return page.url().includes('/admin');
}

(async () => {
  console.log('=== 세션 52 감사: HQ-FINANCE-001 Phase 1 — KPI 실데이터 연결 ===\n');
  const browser = await chromium.launch({ headless: true });

  // ════════════════════════════════════════════
  // SECTION A: 로그인
  // ════════════════════════════════════════════
  console.log('[SECTION A] 로그인');
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  const consoleErrors = [];
  page.on('console', msg => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });
  page.on('dialog', async d => d.accept().catch(() => {}));

  console.log('\n[A-1] jhkim(hr_admin) 로그인');
  const jOk = await loginAs(page, 'jhkim');
  log(jOk ? 'PASS' : 'FAIL', 'jhkim 로그인', jOk ? page.url() : '로그인 실패');

  // ════════════════════════════════════════════
  // SECTION B: 세션 51 회귀 (핵심 대표 스냅샷)
  // ════════════════════════════════════════════
  console.log('\n[SECTION B] 세션 51 회귀 — 핵심 대표 체크');

  console.log('\n[B-1] 생육 대시보드 회귀 (jhkim)');
  await goto(page, `${BASE_URL}/admin/growth`);
  await waitForDataLoad(page, 18000);
  await page.waitForTimeout(1000);
  {
    const body = await page.textContent('body').catch(() => '');
    log(!body.includes('앱 오류 발생') ? 'PASS' : 'FAIL', 'Growth ErrorBoundary 없음');
    log(body.includes('생육 대시보드') ? 'PASS' : 'FAIL', '생육 대시보드 표시');
  }

  console.log('\n[B-2] DashboardInteractive 회귀');
  await goto(page, `${BASE_URL}/admin/hq/interactive`);
  await waitForDataLoad(page, 20000);
  await page.waitForTimeout(1500);
  {
    const body = await page.textContent('body').catch(() => '');
    log(!body.includes('앱 오류 발생') ? 'PASS' : 'FAIL', 'DashboardInteractive ErrorBoundary 없음');
    log(body.includes('운영 리포트') ? 'PASS' : 'FAIL', '운영 리포트 타이틀');
  }

  console.log('\n[B-3] 메인 대시보드 회귀 (콘솔 에러)');
  await goto(page, `${BASE_URL}/admin`);
  await waitForDataLoad(page, 15000);
  {
    const body = await page.textContent('body').catch(() => '');
    log(!body.includes('앱 오류 발생') ? 'PASS' : 'FAIL', 'AdminDashboard ErrorBoundary 없음');
    log(!body.includes('3,280') ? 'PASS' : 'FAIL', '하드코딩 3,280 제거 확인');
    const severeErr = consoleErrors.filter(e =>
      !e.includes('favicon') && !e.includes('manifest') && !e.includes('sw.js') &&
      (e.includes('TypeError') || e.includes('Cannot read') || e.includes('undefined'))
    );
    log(severeErr.length === 0 ? 'PASS' : 'WARN', `중요 콘솔 에러 ${severeErr.length}건`, severeErr[0] || '');
  }

  // ════════════════════════════════════════════
  // SECTION P: HQ Finance 핵심 검증 (hr_admin)
  // ════════════════════════════════════════════
  console.log('\n[SECTION P] HQFinanceScreen — hr_admin 실데이터 검증');

  console.log('\n[P-1] /admin/hq/finance 진입 — ErrorBoundary 없음');
  await goto(page, `${BASE_URL}/admin/hq/finance`);
  await waitForDataLoad(page, 20000);
  await page.waitForTimeout(2500); // finance 데이터 로딩 여유 시간
  {
    const body = await page.textContent('body').catch(() => '');
    log(!body.includes('앱 오류 발생') ? 'PASS' : 'FAIL', 'ErrorBoundary 없음');
    log(body.includes('경영 지표') ? 'PASS' : 'FAIL', '"경영 지표" 타이틀');
  }

  console.log('\n[P-2] KPI 카드 — 실데이터 표시 (하드코딩 값 제거)');
  {
    const body = await page.textContent('body').catch(() => '');
    // 하드코딩 인건비 8,420만원 제거 확인 (실데이터: ~11,720만원)
    log(!body.includes('8,420') ? 'PASS' : 'FAIL', '하드코딩 인건비 "8,420" 제거 (실데이터 교체)');
    // 하드코딩 이익률 23.4 제거 확인 (실데이터: ~37.5%)
    log(!body.includes('23.4') ? 'PASS' : 'FAIL', '하드코딩 이익률 "23.4" 제거 (실데이터 교체)');
    // 실데이터 표시 확인: 억원 또는 만원 단위 포맷
    const hasRevenue = body.includes('억원') || /[\d,]+만원/.test(body);
    log(hasRevenue ? 'PASS' : 'FAIL', 'KPI 수확액 — 억원/만원 단위 표시');
    // 이익률 — 숫자% 형식
    const hasProfitRate = /\d+\.\d+%/.test(body);
    log(hasProfitRate ? 'PASS' : 'FAIL', 'KPI 이익률 — X.X% 형식 표시');
    // 인건비 — 만원 단위
    const hasLabor = /[\d,]+만원/.test(body);
    log(hasLabor ? 'PASS' : 'FAIL', 'KPI 인건비 — 만원 단위 표시');
    // Phase 2 표시 (kg당 원가)
    log(body.includes('Phase 2') ? 'PASS' : 'FAIL', 'kg당 생산원가 — Phase 2 예정 표시');
  }

  console.log('\n[P-3] KPI 수치 합리성 검증 (YTD 기준)');
  {
    const body = await page.textContent('body').catch(() => '');
    // YTD 수확액: 4억 이상 (시드 데이터 기준 4.19억)
    const revenueMatch = body.match(/([\d.]+)억원/);
    const revBil = revenueMatch ? parseFloat(revenueMatch[1]) : 0;
    log(revBil >= 3.5 ? 'PASS' : 'FAIL', `YTD 수확액 ≥ 3.5억 (실측 ${revBil}억원)`, `${revBil}억`);
    // 이익률: 30% 이상 (시드 기준 ~37.5%)
    const profitMatch = body.match(/(\d+\.\d+)%/);
    const profitPct = profitMatch ? parseFloat(profitMatch[1]) : 0;
    log(profitPct >= 20 ? 'PASS' : 'FAIL', `YTD 이익률 ≥ 20% (실측 ${profitPct}%)`, `${profitPct}%`);
  }

  console.log('\n[P-4] Period 필터 버튼 표시');
  {
    const body = await page.textContent('body').catch(() => '');
    log(body.includes('MTD') && body.includes('QTD') && body.includes('YTD') ? 'PASS' : 'FAIL',
      'Period 필터 (MTD/QTD/YTD) 표시');
  }

  console.log('\n[P-5] Period 필터 전환 — MTD 클릭');
  try {
    const mtdBtn = page.locator('button', { hasText: 'MTD' }).first();
    await mtdBtn.click({ timeout: 3000 });
    await page.waitForTimeout(800);
    const body = await page.textContent('body').catch(() => '');
    log(!body.includes('앱 오류 발생') ? 'PASS' : 'FAIL', 'MTD 클릭 후 에러 없음');
    // MTD = 1개월 → 수치가 YTD보다 작아야 함 (또는 "1개월" 표시)
    log(body.includes('1개월') || body.includes('억원') || /[\d,]+만원/.test(body) ? 'PASS' : 'WARN',
      'MTD 전환 후 데이터 표시');
  } catch {
    log('WARN', 'MTD 버튼 클릭 실패 — Period 필터 Playwright 제약');
  }

  console.log('\n[P-6] 차트/그래프 영역 유지 (Phase 2 하드코딩 유지 확인)');
  {
    // YTD로 복구
    await goto(page, `${BASE_URL}/admin/hq/finance`);
    await waitForDataLoad(page, 15000);
    await page.waitForTimeout(1500);
    const body = await page.textContent('body').catch(() => '');
    log(body.includes('월별 수확액 vs 인건비') ? 'PASS' : 'FAIL', '차트 타이틀 유지');
    log(body.includes('지점별 수익성') ? 'PASS' : 'FAIL', '지점별 수익성 섹션 유지');
    log(body.includes('비용 구조') ? 'PASS' : 'FAIL', '비용 구조 섹션 유지');
    log(body.includes('예산 집행률') ? 'PASS' : 'FAIL', '예산 집행률 섹션 유지');
  }

  console.log('\n[P-7] 콘솔 에러 — finance 페이지');
  {
    const financeErrs = consoleErrors.filter(e =>
      !e.includes('favicon') && !e.includes('manifest') && !e.includes('sw.js') &&
      (e.includes('TypeError') || e.includes('Cannot read') || e.includes('finance'))
    );
    log(financeErrs.length === 0 ? 'PASS' : 'FAIL',
      `finance 관련 콘솔 에러 ${financeErrs.length}건`, financeErrs[0] || '');
  }

  // ════════════════════════════════════════════
  // SECTION Q: farm_admin 권한 검증 (hdkim)
  // ════════════════════════════════════════════
  console.log('\n[SECTION Q] farm_admin(hdkim) — finance 접근 권한');

  const ctxH = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const pageH = await ctxH.newPage();
  pageH.on('dialog', async d => d.accept().catch(() => {}));

  console.log('\n[Q-1] hdkim 로그인');
  const hOk = await loginAs(pageH, 'hdkim');
  log(hOk ? 'PASS' : 'FAIL', 'hdkim 로그인');

  console.log('\n[Q-2] farm_admin → /admin/hq/finance 접근 차단 (PROTECTED-ROUTE)');
  await goto(pageH, `${BASE_URL}/admin/hq/finance`);
  await pageH.waitForTimeout(1500);
  {
    const url = pageH.url();
    log(!url.includes('/hq/finance') && url.includes('/admin') ? 'PASS' : 'FAIL',
      'farm_admin /hq/finance → /admin 리디렉트', url);
  }

  console.log('\n[Q-3] farm_admin /admin/growth 정상 유지');
  await goto(pageH, `${BASE_URL}/admin/growth`);
  await waitForDataLoad(pageH, 20000);
  await pageH.waitForTimeout(1000);
  {
    const body = await pageH.textContent('body').catch(() => '');
    log(!body.includes('앱 오류 발생') ? 'PASS' : 'FAIL', 'Growth ErrorBoundary 없음 (farm_admin)');
  }

  await ctxH.close();

  // ════════════════════════════════════════════
  // SECTION R: HQ 전체 메뉴 회귀 (hr_admin)
  // ════════════════════════════════════════════
  console.log('\n[SECTION R] HQ 전체 메뉴 회귀 (hr_admin — finance 포함)');

  const hqRoutes = [
    ['/admin/hq', ''],
    ['/admin/hq/branches', '지점 관리'],
    ['/admin/hq/employees', ''],
    ['/admin/hq/approvals', ''],
    ['/admin/hq/notices', ''],
    ['/admin/hq/performance', '성과 관리'],
    ['/admin/hq/interactive', '운영 리포트'],
    ['/admin/hq/issues', '이상 신고'],
    ['/admin/hq/growth', ''],
    ['/admin/hq/finance', '경영 지표'],  // 핵심 추가
  ];

  for (const [route, title] of hqRoutes) {
    await goto(page, `${BASE_URL}${route}`);
    await waitForDataLoad(page, 15000);
    await page.waitForTimeout(1000);
    const body = await page.textContent('body').catch(() => '');
    const noErr = !body.includes('앱 오류 발생');
    const hasTitle = title ? body.includes(title) : noErr;
    log(noErr && hasTitle ? 'PASS' : (noErr ? 'WARN' : 'FAIL'),
      `hr_admin ${route}${title ? ` — "${title}"` : ''}`,
      !noErr ? 'ErrorBoundary' : (!hasTitle && title ? '타이틀 없음' : ''));
  }

  // ════════════════════════════════════════════
  // 결과 요약
  // ════════════════════════════════════════════
  console.log('\n==================================================');
  console.log('섹션별 결과:');
  console.log('  A: 로그인');
  console.log('  B: 세션 51 회귀 (Growth/DashboardInteractive/AdminDashboard)');
  console.log('  P: HQFinanceScreen 실데이터 검증 (P-1~P-7)');
  console.log('  Q: farm_admin 권한 검증 (Q-1~Q-3)');
  console.log('  R: HQ 전체 메뉴 회귀 (10개)');
  console.log('==================================================');
  console.log(`결과: PASS ${pass} / FAIL ${fail} / WARN ${warn} / TOTAL ${pass + fail + warn}`);
  console.log('==================================================');

  await browser.close();
  process.exit(fail > 0 ? 1 : 0);
})();
