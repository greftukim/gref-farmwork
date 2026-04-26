// 세션 72 — 라우트 회귀 정정 + StatsPage 폐기 + Phase 5 GO 게이트
// A: /admin/hq/performance 복원 + /admin/stats 제거 + 사이드바/BottomNav 정합성
// B: StatsPage.jsx 파일 삭제 확인
// R: 핵심 라우트 회귀 (세션 71 목록 업데이트 — /admin/stats 제거, /admin/performance + /admin/hq/performance 추가)
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
  console.log('=== 세션 72 — 라우트 회귀 정정 + StatsPage 폐기 + Phase 5 GO 게이트 ===\n');
  const browser = await chromium.launch({ headless: true });
  const consoleErrors = [];

  // ═══════════════════════════════════════════════════════
  // SECTION B: StatsPage.jsx 파일 삭제 확인 (파일시스템)
  // ═══════════════════════════════════════════════════════
  console.log('[SECTION B] StatsPage.jsx 파일 삭제 확인');
  log(!existsSync('src/pages/admin/StatsPage.jsx') ? 'PASS' : 'FAIL', 'B-1: src/pages/admin/StatsPage.jsx 삭제됨');

  // ═══════════════════════════════════════════════════════
  // SECTION A: 라우트 회귀 정정 — HQ 사이드바 + 라우트 검증 (mkkim)
  // ═══════════════════════════════════════════════════════
  console.log('\n[SECTION A] 라우트 회귀 정정 + 사이드바 정합성 (mkkim)');
  const aCtx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const aPage = await aCtx.newPage();
  aPage.on('console', msg => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });

  const aOk = await loginAs(aPage, 'mkkim');
  log(aOk ? 'PASS' : 'FAIL', 'A-0: mkkim 로그인');

  if (aOk) {
    // HQ 사이드바 "성과 분석" 항목 → /admin/hq/performance
    await goto(aPage, `${BASE_URL}/admin/hq`);
    const sidebar = await aPage.locator('aside').textContent().catch(() => '');
    log(sidebar.includes('성과 분석') ? 'PASS' : 'FAIL', 'A-1: HQ 사이드바 "성과 분석" 항목 표시');

    // /admin/hq/performance 오류 없음
    await goto(aPage, `${BASE_URL}/admin/hq/performance`);
    const perfBody = await getBody(aPage, 1500);
    log(!perfBody.includes('앱 오류 발생') ? 'PASS' : 'FAIL', 'A-2: /admin/hq/performance 오류 없음');

    // HQPerformanceScreen 컨텐츠 확인 (성과 분석 타이틀 또는 작업자 성과)
    const hasPerfContent = perfBody.includes('성과 분석') || perfBody.includes('작업자 성과');
    log(hasPerfContent ? 'PASS' : 'FAIL', 'A-3: /admin/hq/performance 성과 분석 컨텐츠 표시');

    // /admin/stats 라우트 제거됨 — 오류 없이 빈 화면 or 리다이렉트
    await goto(aPage, `${BASE_URL}/admin/stats`);
    await waitForLoad(aPage);
    await aPage.waitForTimeout(800);
    const statsBody = await aPage.textContent('body').catch(() => '');
    log(!statsBody.includes('앱 오류 발생') ? 'PASS' : 'FAIL', 'A-4: /admin/stats 라우트 제거 후 오류 없음');

    // /admin/hq/performance 사이드바 active 확인
    await goto(aPage, `${BASE_URL}/admin/hq/performance`);
    await waitForLoad(aPage);
    await aPage.waitForTimeout(800);
    const sidebarOnPerf = await aPage.locator('aside').textContent().catch(() => '');
    log(sidebarOnPerf.includes('성과 분석') ? 'PASS' : 'FAIL', 'A-5: /admin/hq/performance 진입 시 사이드바 "성과 분석" 표시');

    // AdminDashboard "상세 분석 →" 클릭 → /admin/performance 이동
    await goto(aPage, `${BASE_URL}/admin`);
    const dashBody = await getBody(aPage, 1000);
    // mkkim은 HQ(본사)이므로 AdminDashboard 자체는 팜 대시보드와 다를 수 있음
    // 이 테스트는 WARN 처리 (팜 대시보드가 아닐 수 있음)
    const hasDetailBtn = dashBody.includes('상세 분석');
    if (hasDetailBtn) {
      const detailLink = aPage.locator('span', { hasText: '상세 분석 →' }).first();
      const isVisible = await detailLink.isVisible().catch(() => false);
      if (isVisible) {
        await detailLink.click();
        await aPage.waitForTimeout(1000);
        const afterClick = aPage.url();
        log(afterClick.includes('/admin/performance') ? 'PASS' : 'FAIL', 'A-6: "상세 분석 →" 클릭 → /admin/performance 이동');
      } else {
        log('WARN', 'A-6: "상세 분석 →" 요소 미발견 (팜 대시보드 맥락 아닐 수 있음) 스킵');
      }
    } else {
      log('WARN', 'A-6: 팜 대시보드 "상세 분석" 텍스트 미발견 스킵 (HQ 사용자 맥락)');
    }
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
      ['/admin/hq/performance',  '성과 분석'],    // 세션 72 복원
      ['/admin/employees',       '직원 관리'],
      ['/admin/tasks',           '작업 칸반'],
      ['/admin/leave',           '휴가 신청 관리'],
      ['/admin/performance',     null],            // BranchPerformanceScreen
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
    console.log('✅ GO — 세션 72 검증 + 회귀 PASS. FAIL 0 / WARN 0');
  } else if (fail === 0) {
    console.log(`⚠️  CONDITIONAL — FAIL 0 / WARN ${warn}. WARN 항목 검토 요망.`);
  } else {
    console.log(`❌ FAIL ${fail}건 발생 — 즉시 수정 필요.`);
  }

  process.exit(fail > 0 ? 1 : 0);
})();
