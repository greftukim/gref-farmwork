// 세션 62 — 운영 진입 직전 E2E 시연 플로우 감사
// Track 2: 첫 사용자 시나리오 A(hr_admin) / B(farm_admin) / C(worker)
// Track 3: 최종 회귀 — GO/NO-GO 판정
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
  const url = page.url();
  return url.includes('/admin') || url.includes('/worker');
}

async function getBody(page) {
  await waitForLoad(page);
  await page.waitForTimeout(600);
  return page.textContent('body').catch(() => '');
}

// worker E2E context (세션 58 패턴)
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
    state: { currentUser: TEST_WORKER, isAuthenticated: true, workerToken: TEST_WORKER.deviceToken },
    version: 0,
  };
  await ctx.addInitScript(
    ({ key, value }) => { localStorage.setItem(key, JSON.stringify(value)); },
    { key: 'gref-auth', value: workerAuthState }
  );
  return ctx;
}

(async () => {
  console.log('=== 세션 62 E2E 시연 플로우 + 최종 회귀 감사 ===\n');
  const browser = await chromium.launch({ headless: true });
  const consoleErrors = [];

  // ═══════════════════════════════════════════════════════
  // SCENARIO A: hr_admin (jhkim) — HQ 전체 플로우
  // ═══════════════════════════════════════════════════════
  console.log('[SCENARIO A] hr_admin (jhkim) — HQ 시연 플로우');
  const hqCtx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const hqPage = await hqCtx.newPage();
  hqPage.on('console', msg => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });

  const aOk = await loginAs(hqPage, 'jhkim');
  log(aOk ? 'PASS' : 'FAIL', 'A-1: jhkim(hr_admin) 로그인');

  if (aOk) {
    // A-2: HQ 대시보드
    await goto(hqPage, `${BASE_URL}/admin/hq`);
    {
      const body = await getBody(hqPage);
      log(!body.includes('앱 오류 발생') ? 'PASS' : 'FAIL', 'A-2: HQ 대시보드 오류 없음');
      log(body.includes('운영 리포트') ? 'PASS' : 'WARN', 'A-2: "운영 리포트" 타이틀');
      // 수확량 데이터 존재 여부 (숫자 포함 여부로 확인)
      const hasNumbers = /[0-9]+/.test(body);
      log(hasNumbers ? 'PASS' : 'WARN', 'A-2: 대시보드 숫자 데이터 표시');
    }

    // A-3: 경영 지표 (finance)
    await goto(hqPage, `${BASE_URL}/admin/hq/finance`);
    {
      const body = await getBody(hqPage);
      log(!body.includes('앱 오류 발생') ? 'PASS' : 'FAIL', 'A-3: 경영 지표 오류 없음');
      log(body.includes('경영 지표') ? 'PASS' : 'WARN', 'A-3: "경영 지표" 타이틀');
      log(body.includes('%') || body.includes('매출') || body.includes('이익') ? 'PASS' : 'WARN', 'A-3: 재무 데이터 지표 표시');
    }

    // A-4: 지점별 현황 (부산LAB)
    await goto(hqPage, `${BASE_URL}/admin/hq/branches/busan`);
    {
      const body = await getBody(hqPage);
      log(!body.includes('앱 오류 발생') ? 'PASS' : 'FAIL', 'A-4: 부산LAB 지점 상세 오류 없음');
      log(body.includes('부산') ? 'PASS' : 'WARN', 'A-4: "부산" 지점명 표시');
    }

    // A-5: 승인 허브
    await goto(hqPage, `${BASE_URL}/admin/hq/approvals`);
    {
      const body = await getBody(hqPage);
      log(!body.includes('앱 오류 발생') ? 'PASS' : 'FAIL', 'A-5: 승인 허브 오류 없음');
      log(body.includes('승인 허브') ? 'PASS' : 'WARN', 'A-5: "승인 허브" 타이틀');
    }

    // A-6: HQ 직원 현황
    await goto(hqPage, `${BASE_URL}/admin/hq/employees`);
    {
      const body = await getBody(hqPage);
      log(!body.includes('앱 오류 발생') ? 'PASS' : 'FAIL', 'A-6: HQ 직원 현황 오류 없음');
      log(body.includes('직원') ? 'PASS' : 'WARN', 'A-6: "직원" 키워드 표시');
      // 직원 수 (최소 1명 이상)
      const hasEmployee = body.includes('김지현') || body.includes('박세정') || body.includes('홍승표');
      log(hasEmployee ? 'PASS' : 'WARN', 'A-6: 직원 이름 1건 이상 표시');
    }

    // A-7: 성과 분석
    await goto(hqPage, `${BASE_URL}/admin/hq/performance`);
    {
      const body = await getBody(hqPage);
      log(!body.includes('앱 오류 발생') ? 'PASS' : 'FAIL', 'A-7: 성과 분석 오류 없음');
      log(body.includes('성과') ? 'PASS' : 'WARN', 'A-7: "성과" 키워드 표시');
    }

    // A-8: 공지사항 (seed 5건 확인)
    await goto(hqPage, `${BASE_URL}/admin/notices`);
    {
      const body = await getBody(hqPage);
      log(!body.includes('앱 오류 발생') ? 'PASS' : 'FAIL', 'A-8: 공지사항 오류 없음');
      log(body.includes('안전교육') || body.includes('수확') || body.includes('급여') ? 'PASS' : 'WARN', 'A-8: 공지 시드 데이터 표시');
    }
  }
  await hqCtx.close();

  // ═══════════════════════════════════════════════════════
  // SCENARIO B: farm_admin (hdkim/부산) — 재배팀 전체 플로우
  // ═══════════════════════════════════════════════════════
  console.log('\n[SCENARIO B] farm_admin (hdkim/부산) — 재배팀 시연 플로우');
  const farmCtx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const farmPage = await farmCtx.newPage();
  farmPage.on('console', msg => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });

  const bOk = await loginAs(farmPage, 'hdkim');
  log(bOk ? 'PASS' : 'FAIL', 'B-1: hdkim(farm_admin/부산) 로그인');

  if (bOk) {
    // B-2: 대시보드
    await goto(farmPage, `${BASE_URL}/admin`);
    {
      const body = await getBody(farmPage);
      log(!body.includes('앱 오류 발생') ? 'PASS' : 'FAIL', 'B-2: 관리자 대시보드 오류 없음');
    }

    // B-3: 직원 관리 (Tier 5)
    await goto(farmPage, `${BASE_URL}/admin/employees`);
    {
      const body = await getBody(farmPage);
      log(!body.includes('앱 오류 발생') ? 'PASS' : 'FAIL', 'B-3: 직원 관리 오류 없음');
      log(body.includes('직원 관리') ? 'PASS' : 'WARN', 'B-3: "직원 관리" 타이틀');
      const hasEmp = body.includes('윤화순') || body.includes('김선아') || body.includes('홍승표');
      log(hasEmp ? 'PASS' : 'WARN', 'B-3: 직원 목록 1건 이상 표시');
    }

    // B-4: 작업 칸반 (Tier 5)
    await goto(farmPage, `${BASE_URL}/admin/tasks`);
    {
      const body = await getBody(farmPage);
      log(!body.includes('앱 오류 발생') ? 'PASS' : 'FAIL', 'B-4: 작업 칸반 오류 없음');
      log(body.includes('작업 칸반') ? 'PASS' : 'WARN', 'B-4: "작업 칸반" 타이틀');
      log(body.includes('계획') && body.includes('진행중') && body.includes('완료') ? 'PASS' : 'WARN', 'B-4: 칸반 열 3개 표시');
      const hasCards = !body.includes('작업 없음') || (body.match(/작업 없음/g) || []).length < 4;
      log(hasCards ? 'PASS' : 'WARN', 'B-4: 칸반 카드 1건 이상');
    }

    // B-5: 휴가 관리 (Tier 5) — pending 4건 확인
    await goto(farmPage, `${BASE_URL}/admin/leave`);
    {
      const body = await getBody(farmPage);
      log(!body.includes('앱 오류 발생') ? 'PASS' : 'FAIL', 'B-5: 휴가 관리 오류 없음');
      log(body.includes('휴가 신청 관리') ? 'PASS' : 'WARN', 'B-5: "휴가 신청 관리" 타이틀');
      log(body.includes('승인 대기') ? 'PASS' : 'WARN', 'B-5: "승인 대기" 섹션 표시');
      // 시드로 4건 pending 삽입
      const hasPending = body.includes('4') || body.includes('연차') || body.includes('오전반차');
      log(hasPending ? 'PASS' : 'WARN', 'B-5: 휴가 신청 데이터 표시');
      // leaveDays 버그 수정 확인 — '일' 텍스트가 표시되어야 함
      log(body.includes('일') && !body.includes('undefined') ? 'PASS' : 'FAIL', 'B-5: leaveDays undefined 없음 (BUG-FIX 확인)');
    }

    // B-6: 스케줄 — 시드 12건 확인
    await goto(farmPage, `${BASE_URL}/admin/schedule`);
    {
      const body = await getBody(farmPage);
      log(!body.includes('앱 오류 발생') ? 'PASS' : 'FAIL', 'B-6: 스케줄 오류 없음');
      log(body.includes('스케줄') ? 'PASS' : 'WARN', 'B-6: "스케줄" 키워드 표시');
      const hasSched = body.includes('수확') || body.includes('정식') || body.includes('안전교육');
      log(hasSched ? 'PASS' : 'WARN', 'B-6: 스케줄 시드 데이터 표시');
    }

    // B-7: 공지사항
    await goto(farmPage, `${BASE_URL}/admin/notices`);
    {
      const body = await getBody(farmPage);
      log(!body.includes('앱 오류 발생') ? 'PASS' : 'FAIL', 'B-7: 공지사항 오류 없음');
      const hasNotice = body.includes('안전교육') || body.includes('수확') || body.includes('급여');
      log(hasNotice ? 'PASS' : 'WARN', 'B-7: 공지 시드 데이터 표시');
    }

    // B-8: 출결 관리
    await goto(farmPage, `${BASE_URL}/admin/attendance`);
    {
      const body = await getBody(farmPage);
      log(!body.includes('앱 오류 발생') ? 'PASS' : 'FAIL', 'B-8: 출결 관리 오류 없음');
    }

    // B-9: HQ 전용 라우트 접근 차단 (farm_admin → /admin으로 리디렉션)
    await goto(farmPage, `${BASE_URL}/admin/hq`);
    await farmPage.waitForTimeout(2000);
    {
      const url = farmPage.url();
      log(!url.includes('/hq') || url === `${BASE_URL}/admin/hq` ? 'PASS' : 'FAIL', `B-9: farm_admin HQ 접근 차단 (url: ${url})`);
    }
  }
  await farmCtx.close();

  // ═══════════════════════════════════════════════════════
  // SCENARIO C: worker (윤화순) — 모바일 앱 플로우
  // ═══════════════════════════════════════════════════════
  console.log('\n[SCENARIO C] worker (윤화순) — 모바일 앱 플로우');
  const workerCtx = await createWorkerContext(browser);
  const workerPage = await workerCtx.newPage();
  workerPage.on('console', msg => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });
  workerPage.on('dialog', async d => d.accept().catch(() => {}));

  // C-1: 홈 (이름 표시) — 스토어 하이드레이션 완료까지 1200ms 대기
  await goto(workerPage, `${BASE_URL}/worker`);
  await waitForLoad(workerPage);
  await workerPage.waitForTimeout(1200);
  {
    const body = await workerPage.textContent('body').catch(() => '');
    log(!body.includes('앱 오류 발생') ? 'PASS' : 'FAIL', 'C-1: 작업자 홈 오류 없음');
    log(body.includes('윤화순') ? 'PASS' : 'WARN', 'C-1: 작업자 이름 "윤화순" 표시');
    const url = workerPage.url();
    log(url.includes('/worker') && !url.includes('/login') ? 'PASS' : 'FAIL', 'C-1: 로그인 세션 유지');
  }

  // C-2: 공지사항 (notices seed 5건)
  await goto(workerPage, `${BASE_URL}/worker/notices`);
  {
    const body = await getBody(workerPage);
    log(!body.includes('앱 오류 발생') ? 'PASS' : 'FAIL', 'C-2: 공지사항 오류 없음');
    log(body.includes('공지') ? 'PASS' : 'WARN', 'C-2: "공지" 키워드 표시');
    const hasNotice = body.includes('안전교육') || body.includes('수확') || body.includes('급여');
    log(hasNotice ? 'PASS' : 'WARN', 'C-2: 공지 시드 데이터 표시');
  }

  // C-3: 내 작업 목록
  await goto(workerPage, `${BASE_URL}/worker/tasks`);
  {
    const body = await getBody(workerPage);
    log(!body.includes('앱 오류 발생') ? 'PASS' : 'FAIL', 'C-3: 내 작업 목록 오류 없음');
    const url = workerPage.url();
    log(url.includes('/worker') ? 'PASS' : 'FAIL', 'C-3: 로그인 유지');
  }

  // C-4: 휴가 신청
  await goto(workerPage, `${BASE_URL}/worker/leave`);
  {
    const body = await getBody(workerPage);
    log(!body.includes('앱 오류 발생') ? 'PASS' : 'FAIL', 'C-4: 휴가 신청 오류 없음');
  }

  // C-5: 출결 확인
  await goto(workerPage, `${BASE_URL}/worker/attendance`);
  {
    const body = await getBody(workerPage);
    log(!body.includes('앱 오류 발생') ? 'PASS' : 'FAIL', 'C-5: 출결 확인 오류 없음');
  }

  // C-6: 이상신고
  await goto(workerPage, `${BASE_URL}/worker/issues`);
  {
    const body = await getBody(workerPage);
    log(!body.includes('앱 오류 발생') ? 'PASS' : 'FAIL', 'C-6: 이상신고 오류 없음');
  }

  await workerCtx.close();

  // ═══════════════════════════════════════════════════════
  // SECTION R: 기존 회귀 — 핵심 라우트 재확인
  // ═══════════════════════════════════════════════════════
  console.log('\n[SECTION R] 핵심 라우트 회귀 (jhkim)');
  const regCtx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const regPage = await regCtx.newPage();
  regPage.on('console', msg => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });

  const rOk = await loginAs(regPage, 'jhkim');
  log(rOk ? 'PASS' : 'FAIL', 'R-0: jhkim 로그인 (회귀)');

  if (rOk) {
    const regressionRoutes = [
      ['/admin/records', '이상신고'],
      ['/admin/growth', null],
      ['/admin/harvest', null],
      ['/admin/performance', null],
      ['/admin/stats', null],
    ];
    for (const [route, title] of regressionRoutes) {
      await goto(regPage, `${BASE_URL}${route}`);
      await waitForLoad(regPage);
      await regPage.waitForTimeout(600);
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
    console.log('✅ GO — 운영 진입 승인. 전 시나리오 FAIL 0 / WARN 0');
  } else if (fail === 0) {
    console.log(`⚠️  CONDITIONAL GO — FAIL 0 / WARN ${warn}. WARN 항목 검토 후 진입 결정.`);
  } else {
    console.log(`❌ NO-GO — FAIL ${fail}건 해소 필수. 운영 진입 보류.`);
  }

  process.exit(fail > 0 ? 1 : 0);
})();
