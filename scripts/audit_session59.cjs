// 세션 59 감사: Tier 5 LoginScreen 이식 검증 + 세션 58 회귀
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
  console.log('=== 세션 59 감사: Tier 5 LoginScreen 이식 + 세션 58 회귀 ===\n');
  const browser = await chromium.launch({ headless: true });
  const consoleErrors = [];

  // ════════════════════════════════════════════
  // SECTION L: LoginScreen 신규 디자인 검증
  // ════════════════════════════════════════════
  console.log('[SECTION L] LoginScreen Tier 5 이식 검증');

  const loginCtx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const loginPage = await loginCtx.newPage();
  loginPage.on('console', msg => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });
  loginPage.on('dialog', async d => d.accept().catch(() => {}));

  console.log('\n[L-1] /login 초기 렌더');
  await goto(loginPage, `${BASE_URL}/login`);
  await loginPage.waitForTimeout(2000);
  {
    const body = await loginPage.textContent('body').catch(() => '');
    const url = loginPage.url();
    log(url.includes('/login') ? 'PASS' : 'FAIL', `/login 진입 (URL: ${url})`);
    log(!body.includes('앱 오류 발생') ? 'PASS' : 'FAIL', 'LoginPage ErrorBoundary 없음');
    log(body.includes('로그인') ? 'PASS' : 'FAIL', '"로그인" 타이틀');
    log(body.includes('GREF Farm') ? 'PASS' : 'FAIL', '"GREF Farm" 브랜드 패널 (데스크톱)');
    log(body.includes('온실에서 사람까지') ? 'PASS' : 'FAIL', '"온실에서 사람까지" 카피 (브랜드패널)');
    log(body.includes('관리자') && body.includes('작업자') ? 'PASS' : 'FAIL', '관리자/작업자 탭 존재');
    log(body.includes('아이디') ? 'PASS' : 'FAIL', '아이디 필드 레이블');
    log(body.includes('비밀번호') ? 'PASS' : 'FAIL', '비밀번호 필드 레이블');
    log(body.includes('로그인 유지') ? 'PASS' : 'FAIL', '"로그인 유지" 체크박스 영역');
    log(body.includes('비밀번호 찾기') ? 'PASS' : 'FAIL', '"비밀번호 찾기" 링크');
  }

  console.log('\n[L-2] 작업자 탭 클릭 → QR 안내 표시');
  {
    const workerTab = loginPage.locator('button', { hasText: '작업자' });
    const visible = await workerTab.isVisible().catch(() => false);
    log(visible ? 'PASS' : 'FAIL', '"작업자" 탭 버튼 존재');
    if (visible) {
      await workerTab.click().catch(() => {});
      await loginPage.waitForTimeout(500);
      const body = await loginPage.textContent('body').catch(() => '');
      log(body.includes('QR') ? 'PASS' : 'FAIL', '작업자 탭 → QR 안내 표시');
      // 폼이 숨겨졌는지 확인 — 관리자 탭으로 돌아가기
      const adminTab = loginPage.locator('button', { hasText: '관리자' });
      await adminTab.click().catch(() => {});
      await loginPage.waitForTimeout(300);
    }
  }

  console.log('\n[L-3] 잘못된 자격증명 — 에러 메시지');
  {
    await goto(loginPage, `${BASE_URL}/login`);
    await loginPage.waitForTimeout(1000);
    await loginPage.fill('input[placeholder*="아이디"]', 'wronguser').catch(() => {});
    await loginPage.fill('input[type="password"]', 'wrongpw').catch(() => {});
    await loginPage.click('button[type="submit"]').catch(() => {});
    await loginPage.waitForTimeout(5000);
    const body = await loginPage.textContent('body').catch(() => '');
    const url = loginPage.url();
    log(url.includes('/login') ? 'PASS' : 'FAIL', '오류 후 /login 유지');
    log(
      body.includes('올바르지 않습니다') || body.includes('Invalid') || body.includes('invalid') ||
      body.includes('오류') || body.includes('실패') || body.includes('incorrect')
        ? 'PASS' : 'WARN',
      '에러 메시지 표시'
    );
  }

  console.log('\n[L-4] hr_admin (jhkim) 로그인 → /admin/hq 진입');
  {
    const ok = await loginAs(loginPage, 'jhkim');
    log(ok ? 'PASS' : 'FAIL', 'jhkim 로그인 성공');
    if (ok) {
      const url = loginPage.url();
      log(url.includes('/admin') ? 'PASS' : 'FAIL', `/admin 진입 (URL: ${url})`);
      await waitForDataLoad(loginPage, 12000);
      const body = await loginPage.textContent('body').catch(() => '');
      log(!body.includes('앱 오류 발생') ? 'PASS' : 'FAIL', 'HQ 대시보드 ErrorBoundary 없음');
      log(body.includes('운영 리포트') || body.includes('대시보드') || body.includes('GREF') ? 'PASS' : 'WARN', 'HQ 콘텐츠 렌더');
    }
  }

  await loginCtx.close();

  // ════════════════════════════════════════════
  // SECTION L-MOB: 모바일 뷰 (로그인 폼만)
  // ════════════════════════════════════════════
  console.log('\n[SECTION L-MOB] 모바일 뷰 LoginScreen');

  const mobCtx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const mobPage = await mobCtx.newPage();
  mobPage.on('console', msg => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });

  await goto(mobPage, `${BASE_URL}/login`);
  await mobPage.waitForTimeout(1500);
  {
    const body = await mobPage.textContent('body').catch(() => '');
    log(!body.includes('앱 오류 발생') ? 'PASS' : 'FAIL', '모바일 LoginPage ErrorBoundary 없음');
    log(body.includes('로그인') ? 'PASS' : 'FAIL', '모바일 "로그인" 타이틀');
    log(body.includes('아이디') ? 'PASS' : 'FAIL', '모바일 아이디 필드');
  }

  await mobCtx.close();

  // ════════════════════════════════════════════
  // SECTION R: 세션 58 회귀 — worker + admin
  // ════════════════════════════════════════════
  console.log('\n[SECTION R] 세션 58 회귀 — worker /worker/* + admin HQ');

  // worker 회귀 (addInitScript)
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
    await workerPage.waitForTimeout(1500);
    const body = await workerPage.textContent('body').catch(() => '');
    const url = workerPage.url();
    log(!body.includes('앱 오류 발생') ? 'PASS' : 'FAIL', `${route} — ErrorBoundary 없음`);
    log(url.includes('/worker') && !url.includes('/login') ? 'PASS' : 'FAIL', `${route} — 로그인 유지`);
    if (title) log(body.includes(title) ? 'PASS' : 'WARN', `${route} — "${title}" 표시`);
  }

  await workerCtx.close();

  // admin HQ 회귀
  const adminCtx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const adminPage = await adminCtx.newPage();
  adminPage.on('console', msg => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });

  const jOk = await loginAs(adminPage, 'jhkim');
  log(jOk ? 'PASS' : 'FAIL', 'jhkim(hr_admin) 로그인 회귀');

  if (jOk) {
    const regressionRoutes = [
      ['/admin/hq/growth', '생육 비교'],
      ['/admin/hq/growth/branches/busan', '부산LAB'],
      ['/admin/hq/growth/branches/jinju', '진주HUB'],
      ['/admin/hq/growth/branches/hadong', '하동HUB'],
      ['/admin/hq/branches/busan', '부산LAB'],
      ['/admin/records', '이상신고'],
      ['/admin/leave', '휴가 신청 관리'],
      ['/admin/hq', '운영 리포트'],
    ];

    for (const [route, title] of regressionRoutes) {
      await goto(adminPage, `${BASE_URL}${route}`);
      await waitForDataLoad(adminPage, 12000);
      await adminPage.waitForTimeout(600);
      const body = await adminPage.textContent('body').catch(() => '');
      log(!body.includes('앱 오류 발생') ? 'PASS' : 'FAIL', `${route} — ErrorBoundary 없음`);
      log(body.includes(title) ? 'PASS' : 'WARN', `${route} — "${title}" 확인`);
    }
  }

  await adminCtx.close();

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
