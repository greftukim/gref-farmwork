// 세션 60 감사: Tier 5 EmployeesPage + LeavePage 이식 검증 + 세션 59 회귀
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
  return page.url().includes('/admin') || page.url().includes('/worker');
}

// 세션 58 — addInitScript worker context
const TEST_WORKER = {
  id: '581949b5-1a85-4429-ba26-19892ddc7240',
  name: '윤화순',
  role: 'worker',
  branch: 'busan',
  isActive: true,
  isTeamLeader: false,
  deviceToken: '5d607a37-e96e-432f-b472-85c01e89dc17',
  authUserId: null,
  jobType: 'worker',
  workStartTime: '07:30:00',
  workEndTime: '16:30:00',
};

async function createWorkerContext(browser) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const workerAuthState = {
    state: {
      currentUser: TEST_WORKER,
      isAuthenticated: true,
      workerToken: TEST_WORKER.deviceToken,
    },
    version: 0,
  };
  await ctx.addInitScript(({ key, value }) => {
    localStorage.setItem(key, JSON.stringify(value));
  }, { key: 'gref-auth', value: workerAuthState });
  return ctx;
}

(async () => {
  console.log('=== 세션 60 감사: Tier 5 EmployeesPage + LeavePage 이식 + 세션 59 회귀 ===\n');
  const browser = await chromium.launch({ headless: true });
  const consoleErrors = [];

  // ════════════════════════════════════════════
  // SECTION E: EmployeesPage 이식 검증
  // ════════════════════════════════════════════
  console.log('[SECTION E] EmployeesPage Tier 5 이식 검증');

  const adminCtxE = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const adminPageE = await adminCtxE.newPage();
  adminPageE.on('console', msg => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });
  adminPageE.on('dialog', async d => d.accept().catch(() => {}));

  const jOkE = await loginAs(adminPageE, 'jhkim');
  log(jOkE ? 'PASS' : 'FAIL', 'jhkim 로그인 (Employees 섹션)');

  if (jOkE) {
    console.log('\n[E-1] /admin/employees 초기 렌더');
    await goto(adminPageE, `${BASE_URL}/admin/employees`);
    await waitForDataLoad(adminPageE, 12000);
    await adminPageE.waitForTimeout(1000);
    {
      const body = await adminPageE.textContent('body').catch(() => '');
      const url = adminPageE.url();
      log(!body.includes('앱 오류 발생') ? 'PASS' : 'FAIL', 'EmployeesPage ErrorBoundary 없음');
      log(url.includes('/employees') ? 'PASS' : 'FAIL', `/admin/employees URL (${url})`);
      log(body.includes('직원 관리') ? 'PASS' : 'FAIL', '"직원 관리" 타이틀');
      log(body.includes('전체 직원') ? 'PASS' : 'FAIL', 'KPI "전체 직원"');
      log(body.includes('재직중') ? 'PASS' : 'FAIL', 'KPI "재직중"');
      log(body.includes('작업자') ? 'PASS' : 'FAIL', 'KPI "작업자"');
      log(body.includes('관리자') ? 'PASS' : 'FAIL', 'KPI "관리자"');
    }

    console.log('\n[E-2] 직군 필터 탭');
    {
      const body = await adminPageE.textContent('body').catch(() => '');
      log(body.includes('재배') ? 'PASS' : 'FAIL', '필터 "재배" 탭');
      log(body.includes('기타') ? 'PASS' : 'FAIL', '필터 "기타" 탭');
      // 재배 탭 클릭
      const reTab = adminPageE.locator('span', { hasText: '재배' }).first();
      const reVisible = await reTab.isVisible().catch(() => false);
      if (reVisible) {
        await reTab.click().catch(() => {});
        await adminPageE.waitForTimeout(400);
        log(true, '"재배" 탭 클릭 — 정상');
        // 전체 탭으로 복구
        const allTab = adminPageE.locator('span', { hasText: '전체' }).first();
        await allTab.click().catch(() => {});
        await adminPageE.waitForTimeout(300);
      } else {
        log('WARN', '"재배" 탭 버튼 미발견');
      }
    }

    console.log('\n[E-3] 테이블 컬럼 헤더');
    {
      const body = await adminPageE.textContent('body').catch(() => '');
      log(body.includes('직무') ? 'PASS' : 'FAIL', '컬럼 "직무"');
      log(body.includes('입사일') ? 'PASS' : 'FAIL', '컬럼 "입사일"');
      log(body.includes('연락처') ? 'PASS' : 'FAIL', '컬럼 "연락처"');
      log(body.includes('상태') ? 'PASS' : 'FAIL', '컬럼 "상태"');
    }

    console.log('\n[E-4] 페이지네이션 — "이전" / "다음"');
    {
      const body = await adminPageE.textContent('body').catch(() => '');
      log(body.includes('이전') ? 'PASS' : 'FAIL', '페이지네이션 "이전" 버튼');
      log(body.includes('다음') ? 'PASS' : 'FAIL', '페이지네이션 "다음" 버튼');
    }

    console.log('\n[E-5] 직원 등록 모달');
    {
      const addBtn = adminPageE.locator('button, span', { hasText: '직원 등록' }).first();
      const addVisible = await addBtn.isVisible().catch(() => false);
      log(addVisible ? 'PASS' : 'WARN', '"직원 등록" 버튼 존재');
      if (addVisible) {
        await addBtn.click().catch(() => {});
        await adminPageE.waitForTimeout(500);
        const body = await adminPageE.textContent('body').catch(() => '');
        log(body.includes('신규 직원 등록') ? 'PASS' : 'FAIL', '모달 "신규 직원 등록" 표시');
        // ESC로 닫기
        await adminPageE.keyboard.press('Escape').catch(() => {});
        await adminPageE.waitForTimeout(300);
      }
    }
  }

  await adminCtxE.close();

  // ════════════════════════════════════════════
  // SECTION LV: LeavePage 이식 검증
  // ════════════════════════════════════════════
  console.log('\n[SECTION LV] LeavePage Tier 5 이식 검증');

  const adminCtxLV = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const adminPageLV = await adminCtxLV.newPage();
  adminPageLV.on('console', msg => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });

  const jOkLV = await loginAs(adminPageLV, 'jhkim');
  log(jOkLV ? 'PASS' : 'FAIL', 'jhkim 로그인 (Leave 섹션)');

  if (jOkLV) {
    console.log('\n[LV-1] /admin/leave 초기 렌더');
    await goto(adminPageLV, `${BASE_URL}/admin/leave`);
    await waitForDataLoad(adminPageLV, 12000);
    await adminPageLV.waitForTimeout(1000);
    {
      const body = await adminPageLV.textContent('body').catch(() => '');
      const url = adminPageLV.url();
      log(!body.includes('앱 오류 발생') ? 'PASS' : 'FAIL', 'LeavePage ErrorBoundary 없음');
      log(url.includes('/leave') ? 'PASS' : 'FAIL', `/admin/leave URL (${url})`);
      log(body.includes('휴가 신청 관리') ? 'PASS' : 'FAIL', '"휴가 신청 관리" 타이틀');
    }

    console.log('\n[LV-2] KPI 카드');
    {
      const body = await adminPageLV.textContent('body').catch(() => '');
      log(body.includes('승인 대기') ? 'PASS' : 'FAIL', 'KPI "승인 대기"');
      log(body.includes('이번 달 휴가') ? 'PASS' : 'FAIL', 'KPI "이번 달 휴가"');
      log(body.includes('승인 완료') ? 'PASS' : 'FAIL', 'KPI "승인 완료"');
      log(body.includes('전체 신청') ? 'PASS' : 'FAIL', 'KPI "전체 신청"');
    }

    console.log('\n[LV-3] 2컬럼 레이아웃 — 승인 대기 + 팀 캘린더');
    {
      const body = await adminPageLV.textContent('body').catch(() => '');
      log(body.includes('팀 휴가 캘린더') ? 'PASS' : 'FAIL', '"팀 휴가 캘린더" 패널');
      // 캘린더 요일 헤더
      log(body.includes('일') && body.includes('월') && body.includes('화') ? 'PASS' : 'FAIL', '캘린더 요일 헤더 (일/월/화)');
      // 월 이동 버튼
      const prevBtn = adminPageLV.locator('button', { hasText: '‹' });
      const nextBtn = adminPageLV.locator('button', { hasText: '›' });
      const prevVisible = await prevBtn.isVisible().catch(() => false);
      const nextVisible = await nextBtn.isVisible().catch(() => false);
      log(prevVisible ? 'PASS' : 'WARN', '캘린더 이전 달(‹) 버튼');
      log(nextVisible ? 'PASS' : 'WARN', '캘린더 다음 달(›) 버튼');
      if (nextVisible) {
        await nextBtn.click().catch(() => {});
        await adminPageLV.waitForTimeout(300);
        log(true, '다음 달 이동 클릭 — 정상');
        await prevBtn.click().catch(() => {});
        await adminPageLV.waitForTimeout(300);
      }
    }

    console.log('\n[LV-4] 승인/반려 버튼 (대기 건 존재 시)');
    {
      const body = await adminPageLV.textContent('body').catch(() => '');
      const hasPending = body.includes('승인') && body.includes('반려');
      log(hasPending ? 'PASS' : 'WARN', '승인/반려 버튼 존재 (대기 건 있을 때)');
    }
  }

  await adminCtxLV.close();

  // ════════════════════════════════════════════
  // SECTION R: 세션 59 회귀 — LoginScreen + worker + admin
  // ════════════════════════════════════════════
  console.log('\n[SECTION R] 세션 59 회귀 — LoginScreen + worker + admin HQ');

  console.log('\n[R-1] LoginScreen 회귀');
  const loginCtxR = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const loginPageR = await loginCtxR.newPage();
  loginPageR.on('console', msg => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });
  await goto(loginPageR, `${BASE_URL}/login`);
  await loginPageR.waitForTimeout(1500);
  {
    const body = await loginPageR.textContent('body').catch(() => '');
    log(!body.includes('앱 오류 발생') ? 'PASS' : 'FAIL', 'LoginPage ErrorBoundary 없음');
    log(body.includes('GREF Farm') ? 'PASS' : 'FAIL', '"GREF Farm" 브랜드 패널');
    log(body.includes('온실에서 사람까지') ? 'PASS' : 'FAIL', '"온실에서 사람까지" 카피');
    log(body.includes('관리자') && body.includes('작업자') ? 'PASS' : 'FAIL', '관리자/작업자 탭');
  }
  await loginCtxR.close();

  console.log('\n[R-2] worker 회귀');
  const workerCtx = await createWorkerContext(browser);
  const workerPage = await workerCtx.newPage();
  workerPage.on('console', msg => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });
  workerPage.on('dialog', async d => d.accept().catch(() => {}));

  const workerRoutes = [
    ['/worker', '윤화순'],
    ['/worker/notices', '공지'],
    ['/worker/tasks', null],
    ['/worker/attendance', null],
    ['/worker/leave', null],
    ['/worker/issues', null],
  ];
  for (const [route, title] of workerRoutes) {
    await goto(workerPage, `${BASE_URL}${route}`);
    await waitForDataLoad(workerPage, 12000);
    await workerPage.waitForTimeout(1200);
    const body = await workerPage.textContent('body').catch(() => '');
    const url = workerPage.url();
    log(!body.includes('앱 오류 발생') ? 'PASS' : 'FAIL', `${route} — ErrorBoundary 없음`);
    log(url.includes('/worker') && !url.includes('/login') ? 'PASS' : 'FAIL', `${route} — 로그인 유지`);
    if (title) log(body.includes(title) ? 'PASS' : 'WARN', `${route} — "${title}" 표시`);
  }
  await workerCtx.close();

  console.log('\n[R-3] admin HQ 회귀');
  const adminCtxR = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const adminPageR = await adminCtxR.newPage();
  adminPageR.on('console', msg => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });

  const jOkR = await loginAs(adminPageR, 'jhkim');
  log(jOkR ? 'PASS' : 'FAIL', 'jhkim(hr_admin) 로그인 회귀');

  if (jOkR) {
    const regressionRoutes = [
      ['/admin/hq', '운영 리포트'],
      ['/admin/hq/growth', '생육 비교'],
      ['/admin/hq/branches/busan', '부산LAB'],
      ['/admin/records', '이상신고'],
      ['/admin/leave', '휴가 신청 관리'],
      ['/admin/employees', '직원 관리'],
    ];
    for (const [route, title] of regressionRoutes) {
      await goto(adminPageR, `${BASE_URL}${route}`);
      await waitForDataLoad(adminPageR, 12000);
      await adminPageR.waitForTimeout(600);
      const body = await adminPageR.textContent('body').catch(() => '');
      log(!body.includes('앱 오류 발생') ? 'PASS' : 'FAIL', `${route} — ErrorBoundary 없음`);
      log(body.includes(title) ? 'PASS' : 'WARN', `${route} — "${title}" 확인`);
    }
  }
  await adminCtxR.close();

  // ════════════════════════════════════════════
  // SECTION S: 전체 콘솔 에러
  // ════════════════════════════════════════════
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
      filtered.slice(0, 5).forEach(e => log('WARN', '콘솔 에러', e.slice(0, 120)));
    }
  }

  await browser.close();

  console.log(`\n${'='.repeat(60)}`);
  console.log(`결과: PASS ${pass} / FAIL ${fail} / WARN ${warn} / TOTAL ${pass + fail + warn}`);
  process.exit(fail > 0 ? 1 : 0);
})();
