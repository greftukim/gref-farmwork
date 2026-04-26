// 운영 진입 전 통합 회귀 감사 — 세션 61
// 전 영역: Login / HQ / 재배팀 / worker / 권한 분기 / 콘솔 에러
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

async function checkRoute(page, route, title, timeout = 12000) {
  await goto(page, `${BASE_URL}${route}`);
  await waitForDataLoad(page, timeout);
  await page.waitForTimeout(600);
  const body = await page.textContent('body').catch(() => '');
  log(!body.includes('앱 오류 발생') ? 'PASS' : 'FAIL', `${route} — ErrorBoundary 없음`);
  if (title) log(body.includes(title) ? 'PASS' : 'WARN', `${route} — "${title}" 렌더`);
}

// worker E2E context
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
  const workerAuthState = { state: { currentUser: TEST_WORKER, isAuthenticated: true, workerToken: TEST_WORKER.deviceToken }, version: 0 };
  await ctx.addInitScript(({ key, value }) => { localStorage.setItem(key, JSON.stringify(value)); }, { key: 'gref-auth', value: workerAuthState });
  return ctx;
}

(async () => {
  console.log('=== 운영 진입 전 통합 회귀 감사 (세션 61) ===\n');
  const browser = await chromium.launch({ headless: true });
  const consoleErrors = [];

  // ════════════════════════════════════════════
  // SECTION A: LoginScreen
  // ════════════════════════════════════════════
  console.log('[SECTION A] LoginScreen');
  const loginCtx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const loginPage = await loginCtx.newPage();
  loginPage.on('console', msg => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });
  await goto(loginPage, `${BASE_URL}/login`);
  await loginPage.waitForTimeout(1500);
  {
    const body = await loginPage.textContent('body').catch(() => '');
    log(!body.includes('앱 오류 발생') ? 'PASS' : 'FAIL', 'LoginPage 렌더');
    log(body.includes('GREF Farm') ? 'PASS' : 'FAIL', '브랜드 패널 "GREF Farm"');
    log(body.includes('온실에서 사람까지') ? 'PASS' : 'FAIL', '"온실에서 사람까지" 카피');
    log(body.includes('관리자') && body.includes('작업자') ? 'PASS' : 'FAIL', '관리자/작업자 탭');
    log(body.includes('아이디') && body.includes('비밀번호') ? 'PASS' : 'FAIL', '아이디/비밀번호 필드');
  }
  await loginCtx.close();

  // ════════════════════════════════════════════
  // SECTION B: HQ 영역 (hr_admin jhkim)
  // ════════════════════════════════════════════
  console.log('\n[SECTION B] HQ 영역 (hr_admin jhkim)');
  const hqCtx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const hqPage = await hqCtx.newPage();
  hqPage.on('console', msg => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });
  const jOk = await loginAs(hqPage, 'jhkim');
  log(jOk ? 'PASS' : 'FAIL', 'jhkim(hr_admin) 로그인');

  if (jOk) {
    const hqRoutes = [
      ['/admin/hq', '운영 리포트'],
      ['/admin/hq/growth', '생육 비교'],
      ['/admin/hq/branches/busan', '부산LAB'],
      ['/admin/hq/branches/jinju', '진주HUB'],
      ['/admin/hq/finance', '경영 지표'],
      ['/admin/hq/approvals', '승인 허브'],
      ['/admin/hq/employees', '직원'],
      ['/admin/hq/performance', '성과'],
    ];
    for (const [route, title] of hqRoutes) {
      await checkRoute(hqPage, route, title);
    }
  }
  await hqCtx.close();

  // ════════════════════════════════════════════
  // SECTION C: 재배팀 영역 — Tier 5 신규 + 기존
  // ════════════════════════════════════════════
  console.log('\n[SECTION C] 재배팀 영역 (farm_admin 또는 hr_admin)');
  const farmCtx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const farmPage = await farmCtx.newPage();
  farmPage.on('console', msg => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });
  const jOk2 = await loginAs(farmPage, 'jhkim');
  log(jOk2 ? 'PASS' : 'FAIL', 'jhkim 로그인 (재배팀)');

  if (jOk2) {
    // Tier 5 신규 3건 (세션 59/60/61)
    console.log('\n[C-T5] Tier 5 이식 검증 (세션 59-61)');
    await checkRoute(farmPage, '/admin/employees', '직원 관리');
    await checkRoute(farmPage, '/admin/leave', '휴가 신청 관리');

    console.log('\n[C-T5-TASKS] TaskBoardPage 칸반 (세션 61 신규)');
    await goto(farmPage, `${BASE_URL}/admin/tasks`);
    await waitForDataLoad(farmPage, 12000);
    await farmPage.waitForTimeout(1200);
    {
      const body = await farmPage.textContent('body').catch(() => '');
      const url = farmPage.url();
      log(!body.includes('앱 오류 발생') ? 'PASS' : 'FAIL', '/admin/tasks — ErrorBoundary 없음');
      log(url.includes('/tasks') ? 'PASS' : 'FAIL', `/admin/tasks URL (${url})`);
      log(body.includes('작업 칸반') ? 'PASS' : 'FAIL', '"작업 칸반" 타이틀');
      log(body.includes('계획') ? 'PASS' : 'FAIL', '칸반 "계획" 열');
      log(body.includes('배정') ? 'PASS' : 'FAIL', '칸반 "배정" 열');
      log(body.includes('진행중') ? 'PASS' : 'FAIL', '칸반 "진행중" 열');
      log(body.includes('완료') ? 'PASS' : 'FAIL', '칸반 "완료" 열');
      // pending 169건이 계획 열에 표시되는지 (작업이 0건이 아닌지)
      const hasItems = !body.includes('작업 없음') || body.match(/작업 없음/g)?.length < 4;
      log(hasItems ? 'PASS' : 'WARN', '칸반 카드 1건 이상 표시');
    }

    // 기존 재배팀 화면
    console.log('\n[C-기존] 기존 재배팀 화면 회귀');
    const farmRoutes = [
      ['/admin/records', '이상신고'],
      ['/admin/notices', '공지'],
      ['/admin/schedule', '스케줄'],
      ['/admin/stats', null],
      ['/admin/attendance', null],
      ['/admin/growth', null],
      ['/admin/harvest', null],
      ['/admin/performance', null],
    ];
    for (const [route, title] of farmRoutes) {
      await checkRoute(farmPage, route, title);
    }
  }
  await farmCtx.close();

  // ════════════════════════════════════════════
  // SECTION D: worker 영역 (addInitScript 패턴)
  // ════════════════════════════════════════════
  console.log('\n[SECTION D] worker 영역 (addInitScript, 세션 58 패턴)');
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

  // ════════════════════════════════════════════
  // SECTION E: 권한 분기 — 미인증 접근 차단
  // ════════════════════════════════════════════
  console.log('\n[SECTION E] 권한 분기 — 미인증 접근 차단');
  const anonCtx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const anonPage = await anonCtx.newPage();
  anonPage.on('console', msg => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });
  {
    await goto(anonPage, `${BASE_URL}/admin/hq`);
    await anonPage.waitForTimeout(2000);
    const url = anonPage.url();
    log(url.includes('/login') ? 'PASS' : 'FAIL', '미인증 /admin/hq → /login 리디렉션');
  }
  {
    await goto(anonPage, `${BASE_URL}/admin/employees`);
    await anonPage.waitForTimeout(1500);
    const url = anonPage.url();
    log(url.includes('/login') ? 'PASS' : 'FAIL', '미인증 /admin/employees → /login 리디렉션');
  }
  await anonCtx.close();

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
      filtered.slice(0, 8).forEach(e => log('WARN', '콘솔 에러', e.slice(0, 120)));
    }
  }

  await browser.close();

  console.log(`\n${'='.repeat(60)}`);
  console.log(`결과: PASS ${pass} / FAIL ${fail} / WARN ${warn} / TOTAL ${pass + fail + warn}`);
  console.log('='.repeat(60));
  if (fail === 0 && warn === 0) {
    console.log('✅ 운영 진입 가능 — 전 영역 FAIL 0 / WARN 0');
  } else if (fail === 0) {
    console.log(`⚠️  운영 진입 조건부 가능 — FAIL 0 / WARN ${warn} (WARN 항목 검토 요망)`);
  } else {
    console.log(`❌ 운영 진입 불가 — FAIL ${fail}건 해소 필요`);
  }
  process.exit(fail > 0 ? 1 : 0);
})();
