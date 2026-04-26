// 세션 71 — DASHBOARD-INTERACTIVE-002 + dead code 삭제 + 사이드바 성과 명칭 + 회귀
// A: DashboardInteractive 가동률 실측 + 빈 상태 + 기간 필터
// B3/B4: admin/Performance.jsx, admin/Growth.jsx 삭제 후 import 잔존 0건
// C: 사이드바 "성과 분석" 라벨 + StatsPage H1 일치
// R: 핵심 라우트 회귀
// S: 콘솔 에러
const { chromium } = require('playwright');
const { existsSync } = require('fs');

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
  console.log('=== 세션 71 DASHBOARD-INTERACTIVE-002 + dead code + 명칭 + 회귀 ===\n');
  const browser = await chromium.launch({ headless: true });
  const consoleErrors = [];

  // ═══════════════════════════════════════════════════════
  // SECTION B3/B4: dead code 파일 삭제 확인 (파일시스템)
  // ═══════════════════════════════════════════════════════
  console.log('[SECTION B3/B4] dead code 파일 삭제 확인');
  log(!existsSync('src/pages/admin/Performance.jsx') ? 'PASS' : 'FAIL', 'B3: admin/Performance.jsx 삭제됨');
  log(!existsSync('src/pages/admin/Growth.jsx') ? 'PASS' : 'FAIL', 'B4: admin/Growth.jsx 삭제됨');
  log(existsSync('src/pages/Performance.jsx') ? 'PASS' : 'FAIL', 'B3-safe: pages/Performance.jsx 유지됨');
  log(existsSync('src/pages/Growth.jsx') ? 'PASS' : 'FAIL', 'B4-safe: pages/Growth.jsx 유지됨');

  // ═══════════════════════════════════════════════════════
  // SECTION C: 사이드바 "성과 분석" 라벨 + StatsPage H1 (mkkim)
  // ═══════════════════════════════════════════════════════
  console.log('\n[SECTION C] 사이드바 "성과 분석" 라벨 + StatsPage 일치 (mkkim)');
  const cCtx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const cPage = await cCtx.newPage();
  cPage.on('console', msg => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });

  const cOk = await loginAs(cPage, 'mkkim');
  log(cOk ? 'PASS' : 'FAIL', 'C-0: mkkim 로그인');

  if (cOk) {
    await goto(cPage, `${BASE_URL}/admin/hq`);
    const sidebar = await cPage.locator('aside').textContent().catch(() => '');
    log(sidebar.includes('성과 분석') ? 'PASS' : 'FAIL', 'C-1: 사이드바 "성과 분석" 라벨 표시');
    log(!sidebar.includes('작업자 성과') ? 'PASS' : 'FAIL', 'C-2: 사이드바 구형 "작업자 성과" 미표시');

    await goto(cPage, `${BASE_URL}/admin/stats`);
    const statsBody = await getBody(cPage, 1000);
    log(statsBody.includes('성과 분석') ? 'PASS' : 'FAIL', 'C-3: StatsPage H1 "성과 분석" 표시');
    log(!statsBody.includes('앱 오류 발생') ? 'PASS' : 'FAIL', 'C-4: /admin/stats 오류 없음');
  }
  await cCtx.close();

  // ═══════════════════════════════════════════════════════
  // SECTION A: DashboardInteractive 가동률 실측 + 기간 필터 (jhkim)
  // ═══════════════════════════════════════════════════════
  console.log('\n[SECTION A] DashboardInteractive 가동률 실측 + 기간 필터 (jhkim)');
  const aCtx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const aPage = await aCtx.newPage();
  aPage.on('console', msg => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });

  const aOk = await loginAs(aPage, 'jhkim');
  log(aOk ? 'PASS' : 'FAIL', 'A-0: jhkim 로그인');

  if (aOk) {
    await goto(aPage, `${BASE_URL}/admin/hq/interactive`);
    const interBody = await getBody(aPage, 2000);

    log(!interBody.includes('앱 오류 발생') ? 'PASS' : 'FAIL', 'A-1: DashboardInteractive 오류 없음');

    // 가동률 KPI 카드 — 실측("실측") 또는 빈 상태("데이터 없음") 표시, "+2.1%p" 미표시
    log(!interBody.includes('+2.1%p') ? 'PASS' : 'FAIL', 'A-2: 하드코딩 "+2.1%p" 미표시');
    const hasGaTrend = interBody.includes('실측') || interBody.includes('데이터 없음');
    log(hasGaTrend ? 'PASS' : 'FAIL', 'A-3: 가동률 "실측" 또는 "데이터 없음" trend 표시');

    // NaN 미표시 확인
    log(!interBody.includes('NaN') ? 'PASS' : 'FAIL', 'A-4: NaN 값 미표시');

    // 기간 필터 탭 — 일/주/월/분기 표시
    const sidebar2 = await aPage.locator('aside').textContent().catch(() => '');
    log(interBody.includes('일') && interBody.includes('주') && interBody.includes('분기') ? 'PASS' : 'FAIL', 'A-5: 기간 필터 탭(일/주/분기) 표시');

    // "주" 기간 탭 클릭 → 오류 없음
    const weekBtn = aPage.locator('button', { hasText: '주' }).first();
    const weekVisible = await weekBtn.isVisible().catch(() => false);
    if (weekVisible) {
      await weekBtn.click();
      await aPage.waitForTimeout(1000);
      const afterWeek = await aPage.textContent('body').catch(() => '');
      log(!afterWeek.includes('앱 오류 발생') ? 'PASS' : 'FAIL', 'A-6: "주" 기간 클릭 후 오류 없음');
      log(!afterWeek.includes('NaN') ? 'PASS' : 'FAIL', 'A-7: "주" 기간 NaN 미표시');
    } else {
      log('WARN', 'A-6/7: "주" 기간 탭 미발견 스킵');
    }

    // "분기" 기간 탭 클릭
    const quarterBtn = aPage.locator('button', { hasText: '분기' }).first();
    const quarterVisible = await quarterBtn.isVisible().catch(() => false);
    if (quarterVisible) {
      await quarterBtn.click();
      await aPage.waitForTimeout(1000);
      const afterQ = await aPage.textContent('body').catch(() => '');
      log(!afterQ.includes('앱 오류 발생') ? 'PASS' : 'FAIL', 'A-8: "분기" 기간 클릭 후 오류 없음');
    } else {
      log('WARN', 'A-8: "분기" 탭 미발견 스킵');
    }

    // 승인 결재 세션 70 회귀 — 명칭 유지 확인
    log(interBody.includes('승인 결재') ? 'PASS' : 'FAIL', 'A-9: "승인 결재" 명칭 회귀 없음');
    log(!interBody.includes('승인 허브') ? 'PASS' : 'FAIL', 'A-10: "승인 허브" 미표시 회귀 없음');
  }
  await aCtx.close();

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
      ['/admin/hq',              '운영 리포트'],
      ['/admin/hq/interactive',  '승인 결재'],
      ['/admin/hq/branches',     '지점 관리'],
      ['/admin/hq/approvals',    '승인 결재'],
      ['/admin/hq/finance',      '경영 지표'],
      ['/admin/hq/employees',    '직원'],
      ['/admin/hq/leave',        '휴가 신청 관리'],
      ['/admin/employees',       '직원 관리'],
      ['/admin/tasks',           '작업 칸반'],
      ['/admin/leave',           '휴가 신청 관리'],
      ['/admin/stats',           '성과 분석'],
      ['/admin/notices',         null],
      ['/admin/growth',          null],
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
    console.log('✅ GO — 세션 71 검증 + 회귀 PASS. FAIL 0 / WARN 0');
  } else if (fail === 0) {
    console.log(`⚠️  CONDITIONAL — FAIL 0 / WARN ${warn}. WARN 항목 검토 요망.`);
  } else {
    console.log(`❌ FAIL ${fail}건 발생 — 즉시 수정 필요.`);
  }

  process.exit(fail > 0 ? 1 : 0);
})();
