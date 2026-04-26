// 세션 67 — P1 HQ 사이드바 수정 + StatsPage 속도 기반 재설계 검증 + 회귀
// X-A: HQSidebar 수정 (badge 동적화, 검색 제거, 로그아웃 표시, 시스템 설정 제거, 지점 바로가기 navigate)
// X-D: StatsPage 작업 속도 랭킹 + 우수/평균/저성과 카드
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
  console.log('=== 세션 67 HQ 사이드바 + StatsPage 속도 랭킹 + 회귀 ===\n');
  const browser = await chromium.launch({ headless: true });
  const consoleErrors = [];

  // ═══════════════════════════════════════════════════════
  // SECTION X-A: HQSidebar 수정 검증 (mkkim hr_admin)
  // ═══════════════════════════════════════════════════════
  console.log('[SECTION X-A] HQSidebar 수정 검증 (mkkim)');
  const xaCtx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const xaPage = await xaCtx.newPage();
  xaPage.on('console', msg => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });

  const xaOk = await loginAs(xaPage, 'mkkim');
  log(xaOk ? 'PASS' : 'FAIL', 'X-A-0: mkkim 로그인');

  if (xaOk) {
    await goto(xaPage, `${BASE_URL}/admin/hq`);
    const hqBody = await getBody(xaPage, 1500);

    // E2: "시스템 설정" 메뉴 제거 확인
    log(!hqBody.includes('시스템 설정') ? 'PASS' : 'FAIL', 'X-A-1: "시스템 설정" 메뉴 제거 확인');

    // A1: badge=12 하드코딩 제거 (12 배지가 보이면 FAIL)
    const badge12 = xaPage.locator('aside >> text=12').first();
    const badge12Visible = await badge12.isVisible().catch(() => false);
    log(!badge12Visible ? 'PASS' : 'FAIL', 'X-A-2: badge 12 하드코딩 제거 확인');

    // A2: "직원, 공지 검색" 입력창 제거 확인
    const searchInput = xaPage.locator('input[placeholder*="직원, 공지 검색"]');
    const searchVisible = await searchInput.isVisible().catch(() => false);
    log(!searchVisible ? 'PASS' : 'FAIL', 'X-A-3: 검색 입력창 제거 확인');

    // A3: 로그아웃 버튼 표시 (사이드바 내)
    const logoutBtn = xaPage.locator('aside >> text=로그아웃').first();
    const logoutVisible = await logoutBtn.isVisible().catch(() => false);
    log(logoutVisible ? 'PASS' : 'FAIL', 'X-A-4: 로그아웃 버튼 사이드바 내 표시');

    // E1: 지점 바로가기 클릭 → /admin/hq/branches
    const branchShortcut = xaPage.locator('aside >> text=부산LAB').first();
    const shortcutVisible = await branchShortcut.isVisible().catch(() => false);
    if (shortcutVisible) {
      await branchShortcut.click();
      await xaPage.waitForTimeout(1200);
      log(xaPage.url().includes('/admin/hq/branches') ? 'PASS' : 'FAIL',
        `X-A-5: 부산LAB 클릭 → /admin/hq/branches (실제: ${xaPage.url()})`);
    } else {
      log('WARN', 'X-A-5: 부산LAB 바로가기 미발견 — 스킵');
    }
  }
  await xaCtx.close();

  // ═══════════════════════════════════════════════════════
  // SECTION X-D: StatsPage 속도 랭킹 검증 (jhkim hr_admin)
  // ═══════════════════════════════════════════════════════
  console.log('\n[SECTION X-D] StatsPage 속도 랭킹 검증 (jhkim)');
  const xdCtx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const xdPage = await xdCtx.newPage();
  xdPage.on('console', msg => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });

  const xdOk = await loginAs(xdPage, 'jhkim');
  log(xdOk ? 'PASS' : 'FAIL', 'X-D-0: jhkim 로그인');

  if (xdOk) {
    await goto(xdPage, `${BASE_URL}/admin/stats`);
    const statsBody = await getBody(xdPage, 2000);

    log(!statsBody.includes('앱 오류 발생') ? 'PASS' : 'FAIL', 'X-D-1: 성과 분석 오류 없음');
    log(statsBody.includes('성과 분석') ? 'PASS' : 'FAIL', 'X-D-2: "성과 분석" 타이틀 확인');
    log(statsBody.includes('작업 속도 랭킹') ? 'PASS' : 'FAIL', 'X-D-3: "작업 속도 랭킹" 카드 타이틀');
    log(statsBody.includes('우수 작업자') ? 'PASS' : 'FAIL', 'X-D-4: "우수 작업자" KPI 카드 표시');
    log(statsBody.includes('평균 작업자') ? 'PASS' : 'FAIL', 'X-D-5: "평균 작업자" KPI 카드 표시');
    log(statsBody.includes('저성과 작업자') ? 'PASS' : 'FAIL', 'X-D-6: "저성과 작업자" KPI 카드 표시');

    // 랭킹에 티어 배지 표시 확인 (우수/평균/저성과 중 하나 이상)
    const tierVisible = statsBody.includes('우수') || statsBody.includes('평균') || statsBody.includes('저성과');
    log(tierVisible ? 'PASS' : 'WARN', 'X-D-7: 랭킹 티어 배지 표시 확인');

    // 지점 필터 동작 (hr_admin이므로 필터 표시)
    const filterBtn = xdPage.locator('button:has-text("전체 지점")');
    const filterVisible = await filterBtn.isVisible().catch(() => false);
    log(filterVisible ? 'PASS' : 'FAIL', 'X-D-8: 지점 필터 버튼 표시 (hr_admin)');
  }
  await xdCtx.close();

  // farm_admin 속도 랭킹 검증 (hdkim — 부산만 표시)
  console.log('\n[X-D-farm] farm_admin StatsPage 자동 필터 (hdkim)');
  const hdCtx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const hdPage = await hdCtx.newPage();
  hdPage.on('console', msg => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });

  const hdOk = await loginAs(hdPage, 'hdkim');
  log(hdOk ? 'PASS' : 'FAIL', 'X-D-farm-0: hdkim 로그인');
  if (hdOk) {
    await goto(hdPage, `${BASE_URL}/admin/stats`);
    const hdBody = await getBody(hdPage, 1500);
    log(!hdBody.includes('앱 오류 발생') ? 'PASS' : 'FAIL', 'X-D-farm-1: hdkim 성과 분석 오류 없음');
    const hdFilterVisible = await hdPage.locator('button:has-text("전체 지점")').isVisible().catch(() => false);
    log(!hdFilterVisible ? 'PASS' : 'WARN', 'X-D-farm-2: farm_admin 필터 UI 미표시 확인');
  }
  await hdCtx.close();

  // ═══════════════════════════════════════════════════════
  // SECTION R: 핵심 회귀 (jhkim)
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
    console.log('✅ GO — 세션 67 검증 + 회귀 PASS. FAIL 0 / WARN 0');
  } else if (fail === 0) {
    console.log(`⚠️  CONDITIONAL — FAIL 0 / WARN ${warn}. WARN 항목 검토 요망.`);
  } else {
    console.log(`❌ FAIL ${fail}건 발생 — 즉시 수정 필요.`);
  }

  process.exit(fail > 0 ? 1 : 0);
})();
