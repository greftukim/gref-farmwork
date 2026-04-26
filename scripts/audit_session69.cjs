// 세션 69 — StatsPage 기간 필터 버튼 추가 + Growth 실데이터 확인 + 회귀
// X-1: StatsPage 기간 필터 3개 버튼(이번 주/이번 달/전체) 표시 + 클릭 동작
// X-2: /admin/growth 페이지 오류 없음 + 생육 데이터 표시
// R: 핵심 라우트 회귀
// S: 콘솔 에러
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

async function waitForLoad(page, timeout = 18000) {
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
  await page.waitForTimeout(5000);
  return page.url().includes('/admin') || page.url().includes('/worker');
}

async function getBody(page, extraWait = 800) {
  await waitForLoad(page);
  await page.waitForTimeout(extraWait);
  return page.textContent('body').catch(() => '');
}

(async () => {
  console.log('=== 세션 69 StatsPage 기간 필터 + Growth 실데이터 + 회귀 ===\n');
  const browser = await chromium.launch({ headless: true });
  const consoleErrors = [];

  // ═══════════════════════════════════════════════════════
  // SECTION X-1: StatsPage 기간 필터 버튼 검증 (mkkim)
  // ═══════════════════════════════════════════════════════
  console.log('[SECTION X-1] StatsPage 기간 필터 버튼 3개 + 클릭 동작 (mkkim)');
  const x1Ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const x1Page = await x1Ctx.newPage();
  x1Page.on('console', msg => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });

  const x1Ok = await loginAs(x1Page, 'mkkim');
  log(x1Ok ? 'PASS' : 'FAIL', 'X-1-0: mkkim 로그인');

  if (x1Ok) {
    await goto(x1Page, `${BASE_URL}/admin/stats`);
    const statsBody = await getBody(x1Page, 1200);

    log(!statsBody.includes('앱 오류 발생') ? 'PASS' : 'FAIL', 'X-1-1: StatsPage 오류 없음');
    log(statsBody.includes('성과 분석') ? 'PASS' : 'FAIL', 'X-1-2: "성과 분석" 제목 표시');

    // 기간 필터 버튼 3개 확인
    log(statsBody.includes('이번 주') ? 'PASS' : 'FAIL', 'X-1-3: "이번 주" 버튼 표시');
    log(statsBody.includes('이번 달') ? 'PASS' : 'FAIL', 'X-1-4: "이번 달" 버튼 표시');
    log(statsBody.includes('전체') ? 'PASS' : 'FAIL', 'X-1-5: "전체" 버튼 표시');

    // 성과 카드 3개 확인
    log(statsBody.includes('우수 작업자') ? 'PASS' : 'FAIL', 'X-1-6: "우수 작업자" 카드 표시');
    log(statsBody.includes('평균 작업자') ? 'PASS' : 'FAIL', 'X-1-7: "평균 작업자" 카드 표시');
    log(statsBody.includes('저성과 작업자') ? 'PASS' : 'FAIL', 'X-1-8: "저성과 작업자" 카드 표시');
    log(statsBody.includes('작업 속도 랭킹') ? 'PASS' : 'FAIL', 'X-1-9: "작업 속도 랭킹" 표시');

    // "이번 주" 클릭 → 오류 없음
    const weekBtn = x1Page.locator('button', { hasText: '이번 주' }).first();
    const weekVisible = await weekBtn.isVisible().catch(() => false);
    log(weekVisible ? 'PASS' : 'FAIL', 'X-1-10: "이번 주" 버튼 클릭 가능');
    if (weekVisible) {
      await weekBtn.click();
      await x1Page.waitForTimeout(1500);
      await waitForLoad(x1Page);
      const afterWeek = await x1Page.textContent('body').catch(() => '');
      log(!afterWeek.includes('앱 오류 발생') ? 'PASS' : 'FAIL', 'X-1-11: "이번 주" 클릭 후 오류 없음');
    } else {
      log('FAIL', 'X-1-11: "이번 주" 클릭 스킵 (버튼 미발견)');
    }

    // "이번 달" 클릭 → 오류 없음
    const monthBtn = x1Page.locator('button', { hasText: '이번 달' }).first();
    const monthVisible = await monthBtn.isVisible().catch(() => false);
    if (monthVisible) {
      await monthBtn.click();
      await x1Page.waitForTimeout(1500);
      await waitForLoad(x1Page);
      const afterMonth = await x1Page.textContent('body').catch(() => '');
      log(!afterMonth.includes('앱 오류 발생') ? 'PASS' : 'FAIL', 'X-1-12: "이번 달" 클릭 후 오류 없음');
    } else {
      log('WARN', 'X-1-12: "이번 달" 버튼 미발견');
    }

    // "전체" 클릭 → 오류 없음
    const allBtn = x1Page.locator('button', { hasText: '전체' }).first();
    const allVisible = await allBtn.isVisible().catch(() => false);
    if (allVisible) {
      await allBtn.click();
      await x1Page.waitForTimeout(1500);
      await waitForLoad(x1Page);
      const afterAll = await x1Page.textContent('body').catch(() => '');
      log(!afterAll.includes('앱 오류 발생') ? 'PASS' : 'FAIL', 'X-1-13: "전체" 클릭 후 오류 없음');
    } else {
      log('WARN', 'X-1-13: "전체" 버튼 미발견');
    }
  }
  await x1Ctx.close();

  // ═══════════════════════════════════════════════════════
  // SECTION X-2: Growth 페이지 실데이터 표시 확인 (jhkim = farm_admin)
  // ═══════════════════════════════════════════════════════
  console.log('\n[SECTION X-2] Growth 페이지 실데이터 확인 (jhkim)');
  const x2Ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const x2Page = await x2Ctx.newPage();
  x2Page.on('console', msg => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });

  const x2Ok = await loginAs(x2Page, 'jhkim');
  log(x2Ok ? 'PASS' : 'FAIL', 'X-2-0: jhkim 로그인');

  if (x2Ok) {
    await goto(x2Page, `${BASE_URL}/admin/growth`);
    const growthBody = await getBody(x2Page, 2000);

    log(!growthBody.includes('앱 오류 발생') ? 'PASS' : 'FAIL', 'X-2-1: Growth 페이지 오류 없음');
    log(growthBody.includes('생육') || growthBody.includes('초장') || growthBody.includes('주간 생육') ? 'PASS' : 'WARN',
      'X-2-2: 생육 관련 텍스트 표시');
    log(!growthBody.includes('undefined') ? 'PASS' : 'WARN', 'X-2-3: "undefined" 텍스트 미표시');
    log(!growthBody.includes('NaN') ? 'PASS' : 'WARN', 'X-2-4: "NaN" 값 미표시');
  }
  await x2Ctx.close();

  // ═══════════════════════════════════════════════════════
  // SECTION R: 핵심 라우트 회귀 (jhkim)
  // ═══════════════════════════════════════════════════════
  console.log('\n[SECTION R] 핵심 라우트 회귀 (jhkim)');
  const regCtx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const regPage = await regCtx.newPage();
  regPage.on('console', msg => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });

  const rOk = await loginAs(regPage, 'jhkim');
  log(rOk ? 'PASS' : 'FAIL', 'R-0: jhkim 로그인');

  if (rOk) {
    const regressionRoutes = [
      ['/admin/hq',           '운영 리포트'],
      ['/admin/hq/branches',  '지점 관리'],
      ['/admin/hq/approvals', '승인 허브'],
      ['/admin/hq/finance',   '경영 지표'],
      ['/admin/hq/employees', '직원'],
      ['/admin/employees',    '직원 관리'],
      ['/admin/tasks',        '작업 칸반'],
      ['/admin/leave',        '휴가 신청 관리'],
      ['/admin/stats',        '성과 분석'],
      ['/admin/notices',      null],
      ['/admin/growth',       null],
    ];
    for (const [route, title] of regressionRoutes) {
      await goto(regPage, `${BASE_URL}${route}`);
      await waitForLoad(regPage);
      await regPage.waitForTimeout(700);
      const body = await regPage.textContent('body').catch(() => '');
      log(!body.includes('앱 오류 발생') ? 'PASS' : 'FAIL', `R: ${route} 오류 없음`);
      if (title) log(body.includes(title) ? 'PASS' : 'WARN', `R: ${route} — "${title}" 표시`);
    }
  }
  await regCtx.close();

  // ═══════════════════════════════════════════════════════
  // SECTION S: 콘솔 에러
  // ═══════════════════════════════════════════════════════
  console.log('\n[SECTION S] 전체 콘솔 에러');
  {
    const filtered = consoleErrors.filter(e =>
      !e.includes('favicon') &&
      !e.includes('ERR_ABORTED') &&
      !e.includes('net::ERR') &&
      !e.includes('ResizeObserver') &&
      !e.includes('future flag') &&
      !e.includes('react-router') &&
      !e.includes('400') &&
      !e.includes('FCM') &&
      !e.includes('firebase') &&
      !e.includes('messaging')
    );
    if (filtered.length === 0) {
      log('PASS', '콘솔 에러 0건');
    } else {
      filtered.slice(0, 8).forEach(e => log('WARN', '콘솔 에러', e.slice(0, 120)));
    }
  }

  await browser.close();

  const total = pass + fail + warn;
  console.log(`\n${'='.repeat(60)}`);
  console.log(`결과: PASS ${pass} / FAIL ${fail} / WARN ${warn} / TOTAL ${total}`);
  console.log('='.repeat(60));

  if (fail === 0 && warn === 0) {
    console.log('✅ GO — 세션 69 검증 + 회귀 PASS. FAIL 0 / WARN 0');
  } else if (fail === 0) {
    console.log(`⚠️  CONDITIONAL — FAIL 0 / WARN ${warn}. WARN 항목 검토 요망.`);
  } else {
    console.log(`❌ FAIL ${fail}건 발생 — 즉시 수정 필요.`);
  }

  process.exit(fail > 0 ? 1 : 0);
})();
