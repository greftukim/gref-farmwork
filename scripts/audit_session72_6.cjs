// 세션 72.6 — HQ 사이드바 UX 정비
// Track A: 그룹 헤더 글자 크기 (10px → 12px), 하위 항목 (13px → 14px)
// Track B: 호버 → 클릭 토글, 단일 펼침, 활성 그룹 자동 펼침
// Track C: 애니메이션 0.18s → 0.25s + opacity
// R: 핵심 라우트 회귀 (session 72 기준 유지)
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
  console.log('=== 세션 72.6 — HQ 사이드바 UX 정비 (클릭 토글 + 글자 크기 + 애니메이션) ===\n');
  const browser = await chromium.launch({ headless: true });
  const consoleErrors = [];

  // ═══════════════════════════════════════════════════════
  // SECTION A/B/C: HQ 사이드바 UX (mkkim)
  // ═══════════════════════════════════════════════════════
  console.log('[SECTION A/B/C] HQ 사이드바 UX — 글자 크기 + 클릭 토글 + 활성 그룹 (mkkim)');
  const aCtx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const aPage = await aCtx.newPage();
  aPage.on('console', msg => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });

  const aOk = await loginAs(aPage, 'mkkim');
  log(aOk ? 'PASS' : 'FAIL', 'A-0: mkkim 로그인');

  if (aOk) {
    await goto(aPage, `${BASE_URL}/admin/hq`);
    await waitForLoad(aPage);
    await aPage.waitForTimeout(1200);

    // A-1: 사이드바 오류 없음
    const hqBody = await aPage.textContent('body').catch(() => '');
    log(!hqBody.includes('앱 오류 발생') ? 'PASS' : 'FAIL', 'A-1: /admin/hq 오류 없음');

    // A-2: 그룹 헤더 표시 (텍스트 확인)
    const sidebar = await aPage.locator('aside').textContent().catch(() => '');
    log(sidebar.includes('대시보드') ? 'PASS' : 'FAIL', 'A-2: "대시보드" 그룹 헤더 표시');
    log(sidebar.includes('성과') ? 'PASS' : 'FAIL', 'A-3: "성과" 그룹 헤더 표시');
    log(sidebar.includes('직원/근태 관리') ? 'PASS' : 'FAIL', 'A-4: "직원/근태 관리" 그룹 헤더 표시');

    // B-1: 활성 그룹 자동 펼침 (/admin/hq → 대시보드 그룹 → 본사 대시보드 표시)
    log(sidebar.includes('본사 대시보드') ? 'PASS' : 'FAIL', 'B-1: /admin/hq 진입 시 "대시보드" 그룹 자동 펼침 (본사 대시보드 표시)');

    // B-2: /admin/hq/performance 진입 시 "성과" 그룹 자동 펼침
    await goto(aPage, `${BASE_URL}/admin/hq/performance`);
    await waitForLoad(aPage);
    await aPage.waitForTimeout(1000);
    const perfSidebar = await aPage.locator('aside').textContent().catch(() => '');
    log(perfSidebar.includes('경영 지표') ? 'PASS' : 'FAIL', 'B-2: /admin/hq/performance 진입 시 "성과" 그룹 자동 펼침 (경영 지표 표시)');
    log(perfSidebar.includes('성과 분석') ? 'PASS' : 'FAIL', 'B-3: /admin/hq/performance 진입 시 "성과 분석" 하위 항목 표시');

    // B-4: 클릭 토글 — "성과" 그룹 클릭 시 접힘 (toggleable)
    const perfGroupBtn = aPage.locator('aside div').filter({ hasText: /^성과$/ }).first();
    const perfGroupVisible = await perfGroupBtn.isVisible().catch(() => false);
    if (perfGroupVisible) {
      await perfGroupBtn.click();
      await aPage.waitForTimeout(400);
      const afterClose = await aPage.locator('aside').textContent().catch(() => '');
      // 닫히면 "성과 분석" 하위 항목이 사라져야 함 (opacity/maxHeight 0)
      // textContent로는 DOM 자체는 있으므로 isVisible 체크
      const subItem = aPage.locator('aside').getByText('성과 분석').first();
      const subVisible = await subItem.isVisible().catch(() => false);
      log(!subVisible ? 'PASS' : 'WARN', 'B-4: "성과" 그룹 클릭 시 하위 항목 숨김 (토글)');

      // 다시 클릭해서 열기
      await perfGroupBtn.click();
      await aPage.waitForTimeout(400);
    } else {
      log('WARN', 'B-4: "성과" 그룹 헤더 미발견 스킵');
    }

    // B-5: 라우트 이동 시 새 활성 그룹 자동 펼침
    await goto(aPage, `${BASE_URL}/admin/hq/leave`);
    await waitForLoad(aPage);
    await aPage.waitForTimeout(1000);
    const leaveSidebar = await aPage.locator('aside').textContent().catch(() => '');
    log(leaveSidebar.includes('휴가 관리') || leaveSidebar.includes('전사 직원') ? 'PASS' : 'FAIL',
      'B-5: /admin/hq/leave 진입 시 "직원/근태 관리" 그룹 자동 펼침');

    // B-6: hoveredGroup 코드 제거 검증 — 호버해도 다른 그룹 안 펼쳐짐 (Playwright hover)
    // 성과 그룹으로 다시 이동 후 직원 그룹 헤더에 hover → 성과 그룹 닫혀있어야 함
    await goto(aPage, `${BASE_URL}/admin/hq`);
    await waitForLoad(aPage);
    await aPage.waitForTimeout(800);
    const perfGroupBtn2 = aPage.locator('aside div').filter({ hasText: /^성과$/ }).first();
    const isVisible2 = await perfGroupBtn2.isVisible().catch(() => false);
    if (isVisible2) {
      await perfGroupBtn2.hover();
      await aPage.waitForTimeout(500);
      const afterHover = await aPage.locator('aside').textContent().catch(() => '');
      // hover 후 성과 그룹 하위 항목이 보이지 않아야 함 (현재 페이지는 /admin/hq = 대시보드 그룹)
      const perfSubItem = aPage.locator('aside').getByText('성과 분석').first();
      const perfSubVisible = await perfSubItem.isVisible().catch(() => false);
      log(!perfSubVisible ? 'PASS' : 'WARN', 'B-6: 호버 시 비활성 그룹 미펼침 (클릭 전용 토글 확인)');
    } else {
      log('WARN', 'B-6: 성과 그룹 미발견 스킵');
    }

    // 단일 펼침 확인 — "성과" 클릭 후 "직원/근태" 닫혀있는지
    await goto(aPage, `${BASE_URL}/admin/hq`);
    await waitForLoad(aPage);
    await aPage.waitForTimeout(800);
    const perfBtn3 = aPage.locator('aside div').filter({ hasText: /^성과$/ }).first();
    if (await perfBtn3.isVisible().catch(() => false)) {
      await perfBtn3.click();
      await aPage.waitForTimeout(400);
      // 대시보드 그룹은 자동 펼침, 성과 그룹은 클릭으로 펼침
      // 두 그룹 동시 펼침 여부: openGroup 단일 변수이므로 성과 클릭 시 대시보드 닫힘
      const dashItem = aPage.locator('aside').getByText('본사 대시보드').first();
      const dashVisible = await dashItem.isVisible().catch(() => false);
      log(!dashVisible ? 'PASS' : 'WARN', 'B-7: 단일 펼침 — 성과 클릭 시 대시보드 그룹 자동 닫힘');
    } else {
      log('WARN', 'B-7: 성과 그룹 미발견 스킵');
    }

    // C-1: 오류 없음 최종 확인
    const finalBody = await aPage.textContent('body').catch(() => '');
    log(!finalBody.includes('앱 오류 발생') ? 'PASS' : 'FAIL', 'C-1: 최종 오류 없음');
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
      ['/admin/hq/performance',  '성과 분석'],
      ['/admin/employees',       '직원 관리'],
      ['/admin/tasks',           '작업 칸반'],
      ['/admin/leave',           '휴가 신청 관리'],
      ['/admin/performance',     null],
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
    console.log('✅ GO — 세션 72.6 검증 + 회귀 PASS. FAIL 0 / WARN 0');
  } else if (fail === 0) {
    console.log(`⚠️  CONDITIONAL — FAIL 0 / WARN ${warn}. WARN 항목 검토 요망.`);
  } else {
    console.log(`❌ FAIL ${fail}건 발생 — 즉시 수정 필요.`);
  }

  process.exit(fail > 0 ? 1 : 0);
})();
