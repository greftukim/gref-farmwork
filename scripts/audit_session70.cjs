// 세션 70 — HQSidebar 인라인 펼침 + /admin/hq/leave + 승인 결재 명명 + 회귀
// X-1: HQSidebar 8그룹 + 인라인 펼침 + "승인 결재" 명칭 + 이모지 0
// X-2: /admin/hq/leave 접근 + LeavePage HQ 지점 필터
// X-3: DashboardInteractive "승인 결재" 표시 + 오류 없음
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
  console.log('=== 세션 70 HQSidebar 인라인 펼침 + 휴가 HQ 접근 + 승인 결재 명칭 + 회귀 ===\n');
  const browser = await chromium.launch({ headless: true });
  const consoleErrors = [];

  // ═══════════════════════════════════════════════════════
  // SECTION X-1: HQSidebar 8그룹 + 인라인 펼침 + 명칭 (mkkim)
  // ═══════════════════════════════════════════════════════
  console.log('[SECTION X-1] HQSidebar 8그룹 + "승인 결재" 명칭 + 이모지 0 (mkkim)');
  const x1Ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const x1Page = await x1Ctx.newPage();
  x1Page.on('console', msg => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });

  const x1Ok = await loginAs(x1Page, 'mkkim');
  log(x1Ok ? 'PASS' : 'FAIL', 'X-1-0: mkkim 로그인');

  if (x1Ok) {
    await goto(x1Page, `${BASE_URL}/admin/hq`);
    const hqBody = await getBody(x1Page, 1200);

    log(!hqBody.includes('앱 오류 발생') ? 'PASS' : 'FAIL', 'X-1-1: /admin/hq 오류 없음');

    // 8개 그룹 헤더 표시
    log(hqBody.includes('대시보드') ? 'PASS' : 'FAIL', 'X-1-2: "대시보드" 그룹 표시');
    log(hqBody.includes('성과') ? 'PASS' : 'FAIL', 'X-1-3: "성과" 그룹 표시');
    log(hqBody.includes('직원/근태 관리') ? 'PASS' : 'FAIL', 'X-1-4: "직원/근태 관리" 그룹 표시');
    log(hqBody.includes('생산') ? 'PASS' : 'FAIL', 'X-1-5: "생산" 그룹 표시');
    log(hqBody.includes('승인 결재') ? 'PASS' : 'FAIL', 'X-1-6: "승인 결재" 그룹 표시');
    log(hqBody.includes('운영/이슈') ? 'PASS' : 'FAIL', 'X-1-7: "운영/이슈" 그룹 표시');
    log(hqBody.includes('공지/정책') ? 'PASS' : 'FAIL', 'X-1-8: "공지/정책" 그룹 표시');
    log(hqBody.includes('지점 관리') ? 'PASS' : 'FAIL', 'X-1-9: "지점 관리" 그룹 표시');

    // 명칭 정정 확인
    log(!hqBody.includes('승인 허브') ? 'PASS' : 'FAIL', 'X-1-10: "승인 허브" 미표시 (정정 확인)');
    log(!hqBody.includes('인사/직원') ? 'PASS' : 'FAIL', 'X-1-11: 구형 "인사/직원" 그룹명 미표시');

    // 이모지 0개 확인 (사이드바 내 이모지 금지)
    const sidebar = await x1Page.locator('aside').textContent().catch(() => '');
    const emojiRegex = /[\u{1F000}-\u{1FFFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;
    log(!emojiRegex.test(sidebar) ? 'PASS' : 'FAIL', 'X-1-12: 사이드바 이모지 0개');

    // 활성 그룹 자동 펼침 — 현재 /admin/hq = 대시보드 그룹 → 본사 대시보드 표시
    log(sidebar.includes('본사 대시보드') ? 'PASS' : 'FAIL', 'X-1-13: 활성 그룹 "대시보드" 자동 펼침 → "본사 대시보드" 표시');

    // 다른 라우트에서 활성 그룹 변경 확인 → /admin/stats = 성과 그룹
    await goto(x1Page, `${BASE_URL}/admin/stats`);
    await getBody(x1Page, 800);
    const statsSidebar = await x1Page.locator('aside').textContent().catch(() => '');
    log(statsSidebar.includes('경영 지표') || statsSidebar.includes('작업자 성과') ? 'PASS' : 'FAIL',
      'X-1-14: /admin/stats → "성과" 그룹 자동 펼침');

    // 지점 바로가기 표시
    log(sidebar.includes('부산LAB') ? 'PASS' : 'WARN', 'X-1-15: 부산LAB 지점 항목 표시');
    log(sidebar.includes('진주HUB') ? 'PASS' : 'WARN', 'X-1-16: 진주HUB 지점 항목 표시');
    log(sidebar.includes('하동HUB') ? 'PASS' : 'WARN', 'X-1-17: 하동HUB 지점 항목 표시');
  }
  await x1Ctx.close();

  // ═══════════════════════════════════════════════════════
  // SECTION X-2: /admin/hq/leave 접근 + 지점 필터 (mkkim = hr_admin)
  // ═══════════════════════════════════════════════════════
  console.log('\n[SECTION X-2] /admin/hq/leave 접근 + 지점 필터 (mkkim)');
  const x2Ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const x2Page = await x2Ctx.newPage();
  x2Page.on('console', msg => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });

  const x2Ok = await loginAs(x2Page, 'mkkim');
  log(x2Ok ? 'PASS' : 'FAIL', 'X-2-0: mkkim 로그인');

  if (x2Ok) {
    await goto(x2Page, `${BASE_URL}/admin/hq/leave`);
    const leaveBody = await getBody(x2Page, 1500);

    log(!leaveBody.includes('앱 오류 발생') ? 'PASS' : 'FAIL', 'X-2-1: /admin/hq/leave 오류 없음');
    log(leaveBody.includes('휴가 신청 관리') ? 'PASS' : 'FAIL', 'X-2-2: "휴가 신청 관리" 제목 표시');

    // 지점 필터 바 표시 확인 (hr_admin 전용)
    log(leaveBody.includes('부산LAB') && leaveBody.includes('진주HUB') && leaveBody.includes('하동HUB') ? 'PASS' : 'FAIL',
      'X-2-3: 지점 필터 바(부산LAB/진주HUB/하동HUB) 표시');

    // 부산 필터 클릭 테스트
    const busanBtn = x2Page.locator('button', { hasText: '부산LAB' }).first();
    const busanVisible = await busanBtn.isVisible().catch(() => false);
    if (busanVisible) {
      await busanBtn.click();
      await x2Page.waitForTimeout(800);
      const afterFilter = await x2Page.textContent('body').catch(() => '');
      log(!afterFilter.includes('앱 오류 발생') ? 'PASS' : 'FAIL', 'X-2-4: 부산LAB 필터 클릭 후 오류 없음');
    } else {
      log('WARN', 'X-2-4: 부산LAB 필터 버튼 미발견 스킵');
    }
  }
  await x2Ctx.close();

  // ═══════════════════════════════════════════════════════
  // SECTION X-3: DashboardInteractive "승인 결재" 표시 (jhkim)
  // ═══════════════════════════════════════════════════════
  console.log('\n[SECTION X-3] DashboardInteractive "승인 결재" 표시 (jhkim)');
  const x3Ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const x3Page = await x3Ctx.newPage();
  x3Page.on('console', msg => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });

  const x3Ok = await loginAs(x3Page, 'jhkim');
  log(x3Ok ? 'PASS' : 'FAIL', 'X-3-0: jhkim 로그인');

  if (x3Ok) {
    await goto(x3Page, `${BASE_URL}/admin/hq/interactive`);
    const interBody = await getBody(x3Page, 2000);

    log(!interBody.includes('앱 오류 발생') ? 'PASS' : 'FAIL', 'X-3-1: DashboardInteractive 오류 없음');
    log(interBody.includes('승인 결재') ? 'PASS' : 'FAIL', 'X-3-2: "승인 결재" 텍스트 표시');
    log(!interBody.includes('승인 허브') ? 'PASS' : 'WARN', 'X-3-3: "승인 허브" 미표시 (명칭 정정)');
    log(!interBody.includes('NaN') ? 'PASS' : 'WARN', 'X-3-4: NaN 값 미표시');

    // HQApprovalsScreen 명칭 확인
    await goto(x3Page, `${BASE_URL}/admin/hq/approvals`);
    const approvalBody = await getBody(x3Page, 1000);
    log(!approvalBody.includes('앱 오류 발생') ? 'PASS' : 'FAIL', 'X-3-5: /admin/hq/approvals 오류 없음');
    log(approvalBody.includes('승인 결재') ? 'PASS' : 'FAIL', 'X-3-6: HQApprovalsScreen "승인 결재" 제목 표시');
  }
  await x3Ctx.close();

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
    console.log('✅ GO — 세션 70 검증 + 회귀 PASS. FAIL 0 / WARN 0');
  } else if (fail === 0) {
    console.log(`⚠️  CONDITIONAL — FAIL 0 / WARN ${warn}. WARN 항목 검토 요망.`);
  } else {
    console.log(`❌ FAIL ${fail}건 발생 — 즉시 수정 필요.`);
  }

  process.exit(fail > 0 ? 1 : 0);
})();
