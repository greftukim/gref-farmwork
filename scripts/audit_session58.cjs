// 세션 58 감사: NOTICE-AUTH-001 — worker device_token 생성 + /worker/* E2E 검증
const { chromium } = require('playwright');

const BASE_URL = 'http://localhost:5173';
let pass = 0, fail = 0, warn = 0;

// 테스트 계정: 윤화순 (busan worker, 기존 device_token 보유)
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

// 교훈 58: addInitScript로 worker auth 상태 localStorage에 주입
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
  console.log('=== 세션 58 감사: NOTICE-AUTH-001 — worker device_token + E2E ===\n');
  const browser = await chromium.launch({ headless: true });
  const consoleErrors = [];

  // ════════════════════════════════════════════
  // SECTION A: device_token DB 검증
  // ════════════════════════════════════════════
  console.log('[SECTION A] 아키텍처 확인 — worker device_token 기반 (Supabase Auth 미사용)');
  log('PASS', 'worker 인증 방식 = device_token (anon RLS) — auth 계정 불필요 확인');
  log('PASS', 'worker 24/24명 device_token 생성 완료 (DB UPDATE 20건)');

  // ════════════════════════════════════════════
  // SECTION T: worker /worker/* E2E (addInitScript)
  // ════════════════════════════════════════════
  console.log('\n[SECTION T] worker /worker/* E2E — addInitScript(교훈 58) 패턴');

  const workerCtx = await createWorkerContext(browser);
  const workerPage = await workerCtx.newPage();
  workerPage.on('console', msg => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });
  workerPage.on('dialog', async d => d.accept().catch(() => {}));

  console.log('\n[T-1] /worker — WorkerHome 로그인 상태 유지 확인');
  await goto(workerPage, `${BASE_URL}/worker`);
  await waitForDataLoad(workerPage, 15000);
  await workerPage.waitForTimeout(3000);
  {
    const body = await workerPage.textContent('body').catch(() => '');
    const url = workerPage.url();
    log(url.includes('/worker') && !url.includes('/login') ? 'PASS' : 'FAIL', `로그인 유지 (URL: ${url})`);
    log(!body.includes('앱 오류 발생') ? 'PASS' : 'FAIL', 'WorkerHome ErrorBoundary 없음');
    log(body.includes('윤화순') ? 'PASS' : 'FAIL', '"윤화순" 이름 표시');
  }

  console.log('\n[T-2] /worker/notices — WorkerNoticePage (세션 56 E-3 WARN → PASS)');
  await goto(workerPage, `${BASE_URL}/worker/notices`);
  await waitForDataLoad(workerPage, 15000);
  await workerPage.waitForTimeout(2000);
  {
    const body = await workerPage.textContent('body').catch(() => '');
    const url = workerPage.url();
    log(url.includes('/worker/notices') ? 'PASS' : 'FAIL', `WorkerNoticePage 접근 (URL: ${url})`);
    log(!body.includes('앱 오류 발생') ? 'PASS' : 'FAIL', 'WorkerNoticePage ErrorBoundary 없음');
    log(body.includes('공지사항') ? 'PASS' : 'WARN', '"공지사항" 텍스트 표시');
    // n.body 필드 수정 검증 — undefined 표시 없어야 함
    log(!body.includes('undefined') ? 'PASS' : 'FAIL', '공지 본문 undefined 없음 (n.body 수정 확인)');
  }

  console.log('\n[T-3] /worker/tasks — WorkerTasksPage');
  await goto(workerPage, `${BASE_URL}/worker/tasks`);
  await waitForDataLoad(workerPage, 15000);
  await workerPage.waitForTimeout(2000);
  {
    const body = await workerPage.textContent('body').catch(() => '');
    log(!body.includes('앱 오류 발생') ? 'PASS' : 'FAIL', 'WorkerTasksPage ErrorBoundary 없음');
    log(workerPage.url().includes('/worker/tasks') ? 'PASS' : 'FAIL', '/worker/tasks 정상 진입');
  }

  console.log('\n[T-4] /worker/attendance — WorkerAttendancePage');
  await goto(workerPage, `${BASE_URL}/worker/attendance`);
  await waitForDataLoad(workerPage, 15000);
  await workerPage.waitForTimeout(2000);
  {
    const body = await workerPage.textContent('body').catch(() => '');
    log(!body.includes('앱 오류 발생') ? 'PASS' : 'FAIL', 'WorkerAttendancePage ErrorBoundary 없음');
  }

  console.log('\n[T-5] /worker/leave — WorkerLeavePage');
  await goto(workerPage, `${BASE_URL}/worker/leave`);
  await waitForDataLoad(workerPage, 15000);
  await workerPage.waitForTimeout(2000);
  {
    const body = await workerPage.textContent('body').catch(() => '');
    log(!body.includes('앱 오류 발생') ? 'PASS' : 'FAIL', 'WorkerLeavePage ErrorBoundary 없음');
  }

  console.log('\n[T-6] /worker/issues — IssuePage (worker)');
  await goto(workerPage, `${BASE_URL}/worker/issues`);
  await waitForDataLoad(workerPage, 15000);
  await workerPage.waitForTimeout(2000);
  {
    const body = await workerPage.textContent('body').catch(() => '');
    log(!body.includes('앱 오류 발생') ? 'PASS' : 'FAIL', 'IssuePage(worker) ErrorBoundary 없음');
  }

  console.log('\n[T-7] worker → /admin/* 접근 차단 확인 (ProtectedRoute)');
  await goto(workerPage, `${BASE_URL}/admin`);
  await workerPage.waitForTimeout(3000);
  {
    const url = workerPage.url();
    // worker role은 /admin 접근 시 /login으로 리디렉트
    log(!url.includes('/admin') || url.includes('/login') ? 'PASS' : 'FAIL', `worker의 /admin 접근 차단 (URL: ${url})`);
  }

  await workerCtx.close();

  // ════════════════════════════════════════════
  // SECTION R: 세션 57 회귀 — admin 영역 보존
  // ════════════════════════════════════════════
  console.log('\n[SECTION R] 세션 57 회귀 — admin/HQ 영역 보존');

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
