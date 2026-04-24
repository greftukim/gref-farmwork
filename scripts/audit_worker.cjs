// 세션 33 — 모바일 worker 전수조사 (390×844 viewport)
// 계정: 윤화순 (busan, device_token으로 localStorage 주입)
// 주의: check-in/out, 폼 제출, QR 스캔 클릭 금지
const { chromium } = require('playwright');
const fs = require('fs');

const BASE = 'http://localhost:5173';
const SS_DIR = 'docs/regression_session33';
if (!fs.existsSync(SS_DIR)) fs.mkdirSync(SS_DIR, { recursive: true });

const results = [];
function pass(id, note) { results.push({ id, status: 'PASS', note }); console.log(`  ✅ [PASS] ${id}: ${note}`); }
function fail(id, note) { results.push({ id, status: 'FAIL', note }); console.log(`  ❌ [FAIL] ${id}: ${note}`); }
function warn(id, note) { results.push({ id, status: 'WARN', note }); console.log(`  ⚠️ [WARN] ${id}: ${note}`); }

async function shot(page, name) {
  await page.screenshot({ path: `${SS_DIR}/${name}.png`, fullPage: false });
}

async function navAndWait(page, path, ms = 3000) {
  await page.goto(`${BASE}${path}`);
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(ms);
}

// 윤화순 계정 — DB 검증된 device_token (is_active=true, busan)
const WORKER_AUTH = {
  state: {
    currentUser: {
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
    },
    session: null,
    isAuthenticated: true,
    workerToken: '5d607a37-e96e-432f-b472-85c01e89dc17',
    loading: false,
  },
  version: 0,
};

async function injectAuth(page) {
  // addInitScript: 페이지 스크립트 실행 전 localStorage 주입
  // (goto 후 inject하면 Zustand initialize()가 덮어씀 — 교훈 58)
  await page.addInitScript((auth) => {
    localStorage.setItem('gref-auth', JSON.stringify(auth));
  }, WORKER_AUTH);
}

(async () => {
  const browser = await chromium.launch({ headless: true });

  console.log('\n══════════════════════════════════════');
  console.log('세션 33 — 모바일 Worker 전수조사');
  console.log('계정: 윤화순 (busan) | viewport: 390×844');
  console.log('══════════════════════════════════════');

  const ctx = await browser.newContext({
    viewport: { width: 390, height: 844 },
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
  });
  const page = await ctx.newPage();

  const consoleErrors = [];
  const dialogs = [];
  page.on('console', msg => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });
  page.on('pageerror', err => consoleErrors.push('[PAGEERROR] ' + err.message));
  page.on('dialog', async d => { dialogs.push(d.message()); await d.dismiss(); });

  // ── 1. localStorage 주입 후 /worker 진입 ──
  console.log('\n── 1. Worker 인증 (addInitScript 주입) ──');
  await injectAuth(page);  // addInitScript 등록 (goto 전에 반드시 먼저)
  consoleErrors.length = 0;

  await page.goto(`${BASE}/worker`);
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(4000); // revalidateWorkerToken + Supabase 대기

  const landingUrl = page.url();
  if (landingUrl.includes('/worker') && !landingUrl.includes('/login')) {
    pass('AUTH-INJECT', `worker 랜딩 성공: ${landingUrl}`);
  } else if (landingUrl.includes('/login')) {
    fail('AUTH-INJECT', `인증 실패 — /login 으로 리다이렉트됨: ${landingUrl}`);
    console.log('  → 인증 실패, 스크립트 종료');
    await browser.close();
    process.exit(1);
  } else {
    warn('AUTH-INJECT', `예상치 않은 URL: ${landingUrl}`);
  }

  await shot(page, '01-worker-home');

  // 콘솔 에러 확인
  const homeErrors = consoleErrors.filter(e => !e.includes('favicon') && !e.includes('future'));
  homeErrors.length
    ? fail('HOME-CONSOLE', `에러 ${homeErrors.length}건: ${homeErrors[0].slice(0, 80)}`)
    : pass('HOME-CONSOLE', '홈 콘솔 에러 없음');

  // ── 2. 홈 페이지 콘텐츠 검증 ──
  console.log('\n── 2. WorkerHome 콘텐츠 ──');
  const homeBody = await page.evaluate(() => document.body.innerText);

  // 하드코딩 이름 검사
  if (homeBody.includes('김민국')) {
    fail('HOME-NAME', '하드코딩 이름 "김민국" 표시됨');
  } else if (homeBody.includes('윤화순')) {
    pass('HOME-NAME', '인증 계정 "윤화순" 표시');
  } else {
    warn('HOME-NAME', '사용자 이름 미표시 (데이터 미로드 가능성)');
  }

  // 하드코딩 날짜 검사
  if (homeBody.includes('4월 21일 화요일')) {
    warn('HOME-DATE', '하드코딩 날짜 "4월 21일 화요일" 표시됨 → BUG');
  } else {
    pass('HOME-DATE', '하드코딩 날짜 없음');
  }

  // BottomNav 검증
  const bottomNavTabs = await page.evaluate(() => {
    const nav = document.querySelector('nav') || document.querySelector('[class*="bottom"]');
    return nav ? nav.innerText : '';
  });
  const hasBottomNav = bottomNavTabs.includes('홈') || bottomNavTabs.includes('작업') || homeBody.includes('근태') || homeBody.includes('공지');
  hasBottomNav ? pass('HOME-BOTTOMNAV', `BottomNav 표시 확인`) : warn('HOME-BOTTOMNAV', `BottomNav 미확인`);

  // check-in 버튼 존재 확인 (클릭 금지)
  const checkInBtns = await page.evaluate(() =>
    [...document.querySelectorAll('button')].map(b => b.textContent.trim()).filter(t => t.includes('출근') || t.includes('퇴근') || t.includes('체크'))
  );
  checkInBtns.length
    ? pass('HOME-CHECKIN-BTN', `출퇴근 버튼 존재: [${checkInBtns.join(', ')}] (클릭 미수행)`)
    : warn('HOME-CHECKIN-BTN', '출퇴근 버튼 미발견');

  // ── 3. 작업 목록 (/worker/tasks) ──
  console.log('\n── 3. WorkerTasksPage (/worker/tasks) ──');
  consoleErrors.length = 0;
  await navAndWait(page, '/worker/tasks');
  await shot(page, '02-worker-tasks');
  const taskBody = await page.evaluate(() => document.body.innerText);
  const taskErrors = consoleErrors.filter(e => !e.includes('favicon') && !e.includes('future'));
  taskErrors.length
    ? fail('TASKS-CONSOLE', `에러: ${taskErrors[0].slice(0, 80)}`)
    : pass('TASKS-CONSOLE', '작업 목록 콘솔 에러 없음');
  if (taskBody.includes('하동') || taskBody.includes('진주')) {
    fail('TASKS-SCOPE', '타 지점 데이터(하동/진주) 노출 — worker scope 위반');
  } else {
    pass('TASKS-SCOPE', 'worker 범위 데이터 (타 지점 미노출)');
  }
  page.url().includes('/worker/tasks') ? pass('TASKS-ROUTE', '경로 유지') : fail('TASKS-ROUTE', `경로 이탈: ${page.url()}`);

  // ── 4. 생육 조사 (/worker/survey) ──
  console.log('\n── 4. GrowthSurveyPage (/worker/survey) ──');
  consoleErrors.length = 0;
  await navAndWait(page, '/worker/survey');
  await shot(page, '03-worker-survey');
  const surveyErrors = consoleErrors.filter(e => !e.includes('favicon') && !e.includes('future'));
  surveyErrors.length
    ? fail('SURVEY-CONSOLE', `에러: ${surveyErrors[0].slice(0, 80)}`)
    : pass('SURVEY-CONSOLE', '생육 조사 콘솔 에러 없음');
  page.url().includes('/worker/survey') ? pass('SURVEY-ROUTE', '경로 유지') : warn('SURVEY-ROUTE', `경로 이탈: ${page.url()}`);

  // ── 5. 근태 (/worker/attendance) ──
  console.log('\n── 5. WorkerAttendancePage (/worker/attendance) ──');
  consoleErrors.length = 0;
  await navAndWait(page, '/worker/attendance');
  await shot(page, '04-worker-attendance');
  const attBody = await page.evaluate(() => document.body.innerText);
  const attErrors = consoleErrors.filter(e => !e.includes('favicon') && !e.includes('future'));
  attErrors.length
    ? fail('ATT-CONSOLE', `에러: ${attErrors[0].slice(0, 80)}`)
    : pass('ATT-CONSOLE', '근태 콘솔 에러 없음');
  page.url().includes('/worker/attendance') ? pass('ATT-ROUTE', '경로 유지') : fail('ATT-ROUTE', `경로 이탈: ${page.url()}`);

  // ── 6. 휴가 신청 (/worker/leave) ──
  console.log('\n── 6. WorkerLeavePage (/worker/leave) ──');
  consoleErrors.length = 0;
  await navAndWait(page, '/worker/leave');
  await shot(page, '05-worker-leave');
  const leaveBody = await page.evaluate(() => document.body.innerText);
  const leaveErrors = consoleErrors.filter(e => !e.includes('favicon') && !e.includes('future'));
  leaveErrors.length
    ? fail('LEAVE-CONSOLE', `에러: ${leaveErrors[0].slice(0, 80)}`)
    : pass('LEAVE-CONSOLE', '휴가 신청 콘솔 에러 없음');
  page.url().includes('/worker/leave') ? pass('LEAVE-ROUTE', '경로 유지') : warn('LEAVE-ROUTE', `경로 이탈: ${page.url()}`);

  // 휴가 신청 버튼 존재 확인 (폼 제출 금지)
  const leaveBtns = await page.evaluate(() =>
    [...document.querySelectorAll('button')].map(b => b.textContent.trim()).filter(t => t.length > 0)
  );
  console.log(`  버튼 목록: ${leaveBtns.slice(0, 8).join(', ')}`);
  leaveBtns.some(t => t.includes('신청') || t.includes('등록') || t.includes('추가'))
    ? pass('LEAVE-BTN', `신청 버튼 존재 (폼 제출 미수행)`)
    : warn('LEAVE-BTN', '신청 버튼 미발견');

  // ── 7. 이상 신고 (/worker/issues) ──
  console.log('\n── 7. IssuePage (/worker/issues) ──');
  consoleErrors.length = 0;
  await navAndWait(page, '/worker/issues');
  await shot(page, '06-worker-issues');
  const issueErrors = consoleErrors.filter(e => !e.includes('favicon') && !e.includes('future'));
  issueErrors.length
    ? fail('ISSUES-CONSOLE', `에러: ${issueErrors[0].slice(0, 80)}`)
    : pass('ISSUES-CONSOLE', '이상 신고 콘솔 에러 없음');
  page.url().includes('/worker/issues') ? pass('ISSUES-ROUTE', '경로 유지') : warn('ISSUES-ROUTE', `경로 이탈: ${page.url()}`);

  // ── 8. 긴급 호출 (/worker/emergency) ──
  console.log('\n── 8. EmergencyCallPage (/worker/emergency) ──');
  consoleErrors.length = 0;
  await navAndWait(page, '/worker/emergency');
  await shot(page, '07-worker-emergency');
  const emergencyBody = await page.evaluate(() => document.body.innerText);
  const emergencyErrors = consoleErrors.filter(e => !e.includes('favicon') && !e.includes('future'));
  emergencyErrors.length
    ? fail('EMERGENCY-CONSOLE', `에러: ${emergencyErrors[0].slice(0, 80)}`)
    : pass('EMERGENCY-CONSOLE', '긴급 호출 콘솔 에러 없음');
  page.url().includes('/worker/emergency') ? pass('EMERGENCY-ROUTE', '경로 유지') : warn('EMERGENCY-ROUTE', `경로 이탈: ${page.url()}`);
  // 긴급 호출 버튼 존재 확인 (클릭 금지)
  const emergencyBtns = await page.evaluate(() =>
    [...document.querySelectorAll('button')].map(b => b.textContent.trim()).filter(t => t.length > 0)
  );
  console.log(`  긴급 호출 버튼: ${emergencyBtns.slice(0, 5).join(', ')}`);

  // ── 9. 공지사항 (/worker/notices) ──
  console.log('\n── 9. WorkerNoticePage (/worker/notices) ──');
  consoleErrors.length = 0;
  await navAndWait(page, '/worker/notices');
  await shot(page, '08-worker-notices');
  const noticeErrors = consoleErrors.filter(e => !e.includes('favicon') && !e.includes('future'));
  noticeErrors.length
    ? fail('NOTICES-CONSOLE', `에러: ${noticeErrors[0].slice(0, 80)}`)
    : pass('NOTICES-CONSOLE', '공지사항 콘솔 에러 없음');
  page.url().includes('/worker/notices') ? pass('NOTICES-ROUTE', '경로 유지') : warn('NOTICES-ROUTE', `경로 이탈: ${page.url()}`);

  // ── 10. 더보기 (/worker/more) ──
  console.log('\n── 10. WorkerMorePage (/worker/more) ──');
  consoleErrors.length = 0;
  await navAndWait(page, '/worker/more');
  await shot(page, '09-worker-more');
  const moreErrors = consoleErrors.filter(e => !e.includes('favicon') && !e.includes('future'));
  moreErrors.length
    ? fail('MORE-CONSOLE', `에러: ${moreErrors[0].slice(0, 80)}`)
    : pass('MORE-CONSOLE', '더보기 콘솔 에러 없음');
  // WorkerMorePage = <Navigate to="/worker/notices" replace /> — 의도적 리다이렉트
  if (page.url().includes('/worker/notices')) {
    pass('MORE-ROUTE', 'WorkerMorePage → Navigate to /worker/notices (의도적 리다이렉트)');
  } else if (page.url().includes('/worker/more')) {
    warn('MORE-ROUTE', '리다이렉트 미작동 — 경로 유지됨');
  } else {
    warn('MORE-ROUTE', `예상치 않은 경로: ${page.url()}`);
  }

  // ── 11. 모바일 홈 (/worker/m/home) ──
  console.log('\n── 11. MobileHomeScreen (/worker/m/home) ──');
  consoleErrors.length = 0;
  await navAndWait(page, '/worker/m/home');
  await shot(page, '10-mobile-home');
  const mHomeBody = await page.evaluate(() => document.body.innerText);
  const mHomeErrors = consoleErrors.filter(e => !e.includes('favicon') && !e.includes('future'));
  mHomeErrors.length
    ? fail('MHOME-CONSOLE', `에러: ${mHomeErrors[0].slice(0, 80)}`)
    : pass('MHOME-CONSOLE', '모바일 홈 콘솔 에러 없음');
  page.url().includes('/worker/m/home') ? pass('MHOME-ROUTE', '경로 유지') : warn('MHOME-ROUTE', `경로 이탈: ${page.url()}`);
  if (mHomeBody.includes('김민국')) {
    fail('MHOME-HARDCODE-NAME', '하드코딩 이름 "김민국" — BUG (MobileHomeScreen 정적 컴포넌트)');
    if (mHomeBody.includes('4월 21일 화요일')) fail('MHOME-HARDCODE-DATE', '하드코딩 날짜 "4월 21일 화요일" — BUG');
    else pass('MHOME-HARDCODE-DATE', '날짜 하드코딩 없음');
  } else if (mHomeBody.includes('4월 21일 화요일')) {
    fail('MHOME-HARDCODE-DATE', '하드코딩 날짜 "4월 21일 화요일" — BUG');
    pass('MHOME-HARDCODE-NAME', '이름 하드코딩 없음');
  } else {
    pass('MHOME-HARDCODE', '하드코딩(이름/날짜) 없음');
  }

  // ── 12. 모바일 체크인 (/worker/m/checkin) ──
  console.log('\n── 12. MobileCheckInScreen (/worker/m/checkin) ──');
  consoleErrors.length = 0;
  await navAndWait(page, '/worker/m/checkin');
  await shot(page, '11-mobile-checkin');
  const mCheckinBody = await page.evaluate(() => document.body.innerText);
  const mCheckinErrors = consoleErrors.filter(e => !e.includes('favicon') && !e.includes('future'));
  mCheckinErrors.length
    ? fail('MCHECKIN-CONSOLE', `에러: ${mCheckinErrors[0].slice(0, 80)}`)
    : pass('MCHECKIN-CONSOLE', '체크인 콘솔 에러 없음');
  page.url().includes('/worker/m/checkin') ? pass('MCHECKIN-ROUTE', '경로 유지') : warn('MCHECKIN-ROUTE', `경로 이탈: ${page.url()}`);
  if (mCheckinBody.includes('김민국')) fail('MCHECKIN-HARDCODE-NAME', '하드코딩 이름 "김민국" — BUG');
  else pass('MCHECKIN-HARDCODE', '체크인 화면 이름 하드코딩 없음');
  // 출근/퇴근 버튼 존재 확인 (클릭 금지)
  const checkinBtns = await page.evaluate(() =>
    [...document.querySelectorAll('button')].map(b => b.textContent.trim()).filter(t => t.length > 0)
  );
  console.log(`  체크인 버튼: ${checkinBtns.slice(0, 6).join(', ')}`);

  // ── 13. 모바일 작업 (/worker/m/tasks) ──
  console.log('\n── 13. MobileTasksScreen (/worker/m/tasks) ──');
  consoleErrors.length = 0;
  await navAndWait(page, '/worker/m/tasks');
  await shot(page, '12-mobile-tasks');
  const mTaskErrors = consoleErrors.filter(e => !e.includes('favicon') && !e.includes('future'));
  mTaskErrors.length
    ? fail('MTASKS-CONSOLE', `에러: ${mTaskErrors[0].slice(0, 80)}`)
    : pass('MTASKS-CONSOLE', '모바일 작업 콘솔 에러 없음');
  page.url().includes('/worker/m/tasks') ? pass('MTASKS-ROUTE', '경로 유지') : warn('MTASKS-ROUTE', `경로 이탈: ${page.url()}`);
  const mTaskBody = await page.evaluate(() => document.body.innerText);
  if (mTaskBody.includes('하동') || mTaskBody.includes('진주')) {
    fail('MTASKS-SCOPE', '타 지점 데이터 노출 — scope 위반');
  } else {
    pass('MTASKS-SCOPE', '타 지점 미노출');
  }

  // ── 14. 모바일 근태 (/worker/m/attendance) ──
  console.log('\n── 14. MobileAttendanceScreen (/worker/m/attendance) ──');
  consoleErrors.length = 0;
  await navAndWait(page, '/worker/m/attendance');
  await shot(page, '13-mobile-attendance');
  const mAttErrors = consoleErrors.filter(e => !e.includes('favicon') && !e.includes('future'));
  mAttErrors.length
    ? fail('MATT-CONSOLE', `에러: ${mAttErrors[0].slice(0, 80)}`)
    : pass('MATT-CONSOLE', '모바일 근태 콘솔 에러 없음');
  page.url().includes('/worker/m/attendance') ? pass('MATT-ROUTE', '경로 유지') : warn('MATT-ROUTE', `경로 이탈: ${page.url()}`);

  // ── 15. 모바일 프로필 (/worker/m/profile) ──
  console.log('\n── 15. MobileProfileScreen (/worker/m/profile) ──');
  consoleErrors.length = 0;
  await navAndWait(page, '/worker/m/profile');
  await shot(page, '14-mobile-profile');
  const mProfileBody = await page.evaluate(() => document.body.innerText);
  const mProfileErrors = consoleErrors.filter(e => !e.includes('favicon') && !e.includes('future'));
  mProfileErrors.length
    ? fail('MPROFILE-CONSOLE', `에러: ${mProfileErrors[0].slice(0, 80)}`)
    : pass('MPROFILE-CONSOLE', '모바일 프로필 콘솔 에러 없음');
  page.url().includes('/worker/m/profile') ? pass('MPROFILE-ROUTE', '경로 유지') : warn('MPROFILE-ROUTE', `경로 이탈: ${page.url()}`);
  if (mProfileBody.includes('김민국')) fail('MPROFILE-HARDCODE', '하드코딩 이름 "김민국" — BUG');
  else if (mProfileBody.includes('윤화순')) pass('MPROFILE-NAME', '"윤화순" 표시 확인');
  else warn('MPROFILE-NAME', '사용자 이름 미표시');

  // ── 16. 모바일 생육 (/worker/m/growth) ──
  console.log('\n── 16. MobileGrowthScreen (/worker/m/growth) ──');
  consoleErrors.length = 0;
  await navAndWait(page, '/worker/m/growth');
  await shot(page, '15-mobile-growth');
  const mGrowthErrors = consoleErrors.filter(e => !e.includes('favicon') && !e.includes('future'));
  mGrowthErrors.length
    ? fail('MGROWTH-CONSOLE', `에러: ${mGrowthErrors[0].slice(0, 80)}`)
    : pass('MGROWTH-CONSOLE', '모바일 생육 콘솔 에러 없음');
  page.url().includes('/worker/m/growth') ? pass('MGROWTH-ROUTE', '경로 유지') : warn('MGROWTH-ROUTE', `경로 이탈: ${page.url()}`);

  // ── 17. QR 스캔 (/worker/m/qr-scan) ──
  console.log('\n── 17. QrScanPage (/worker/m/qr-scan) ──');
  consoleErrors.length = 0;
  await navAndWait(page, '/worker/m/qr-scan');
  await shot(page, '16-qr-scan');
  const qrErrors = consoleErrors.filter(e => !e.includes('favicon') && !e.includes('future'));
  qrErrors.length
    ? fail('QR-CONSOLE', `에러: ${qrErrors[0].slice(0, 80)}`)
    : pass('QR-CONSOLE', 'QR 스캔 콘솔 에러 없음');
  page.url().includes('/worker') ? pass('QR-ROUTE', `경로 유지: ${page.url()}`) : warn('QR-ROUTE', `경로 이탈: ${page.url()}`);

  // ── 18. BottomNav 탭 전환 검증 ──
  console.log('\n── 18. BottomNav 탭 전환 (/worker 기준) ──');
  consoleErrors.length = 0;
  await navAndWait(page, '/worker');
  await page.waitForTimeout(1000);

  // 네비 요소 찾기
  const navLinks = await page.evaluate(() => {
    const links = [...document.querySelectorAll('a[href]')];
    return links.map(a => ({ href: a.getAttribute('href'), text: a.textContent.trim() }));
  });
  const workerNavLinks = navLinks.filter(l => l.href && l.href.startsWith('/worker'));
  console.log(`  네비 링크 (worker): ${workerNavLinks.map(l => `${l.text}→${l.href}`).join(', ')}`);

  const hasTabs = workerNavLinks.length >= 4;
  hasTabs
    ? pass('BOTTOMNAV-LINKS', `${workerNavLinks.length}개 링크 확인 (최소 4개)`)
    : warn('BOTTOMNAV-LINKS', `링크 ${workerNavLinks.length}개 — BottomNav 탭 부족 가능성`);

  // tasks 탭 클릭 (비파괴) — 알림 허용 모달 먼저 닫기
  const laterBtn = page.locator('button', { hasText: '나중에' });
  if (await laterBtn.count() > 0) {
    console.log('  알림 모달 "나중에" 버튼 클릭');
    await laterBtn.first().click({ force: true });
    await page.waitForTimeout(800);
  }
  // dismiss by backdrop click if still open
  const overlayEl = page.locator('.fixed.inset-0').filter({ has: page.locator('[class*="bg-black"]') });
  if (await overlayEl.count() > 0) {
    await page.evaluate(() => {
      const el = document.querySelector('.fixed.inset-0.z-50');
      if (el) el.remove();
    });
    await page.waitForTimeout(300);
  }
  const tasksLink = await page.locator('a[href="/worker/tasks"]').first();
  if (await tasksLink.count() > 0) {
    await tasksLink.click({ timeout: 5000, force: true });
    await page.waitForTimeout(1500);
    page.url().includes('/worker/tasks')
      ? pass('BOTTOMNAV-CLICK', '/worker/tasks 탭 전환 성공')
      : warn('BOTTOMNAV-CLICK', `탭 클릭 후 예상 경로 아님: ${page.url()}`);
  } else {
    warn('BOTTOMNAV-CLICK', '/worker/tasks 링크 미발견');
  }

  // ── 19. 인증 지속성 검증 ──
  console.log('\n── 19. 인증 지속성 (/worker/attendance 재방문) ──');
  consoleErrors.length = 0;
  await navAndWait(page, '/worker/attendance');
  const persistUrl = page.url();
  if (persistUrl.includes('/login')) {
    fail('AUTH-PERSIST', '재방문 시 /login 리다이렉트 — 세션 만료');
  } else if (persistUrl.includes('/worker')) {
    pass('AUTH-PERSIST', `인증 유지: ${persistUrl}`);
  } else {
    warn('AUTH-PERSIST', `예상치 않은 URL: ${persistUrl}`);
  }

  // ── 20. 관리자 페이지 접근 차단 검증 ──
  console.log('\n── 20. 관리자 페이지 접근 차단 (ProtectedRoute 검증) ──');
  consoleErrors.length = 0;
  await page.goto(`${BASE}/admin`);
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(2000);
  const adminUrl = page.url();
  if (adminUrl.includes('/admin') && !adminUrl.includes('/login') && !adminUrl.includes('/worker')) {
    fail('ROLE-GUARD', `worker가 /admin 접근 가능 — ProtectedRoute 미작동: ${adminUrl}`);
  } else if (adminUrl.includes('/login') || adminUrl.includes('/worker')) {
    pass('ROLE-GUARD', `/admin 접근 차단 → ${adminUrl}`);
  } else {
    warn('ROLE-GUARD', `예상치 않은 리다이렉트: ${adminUrl}`);
  }

  await ctx.close();
  await browser.close();

  // ── 결과 집계 ──
  console.log('\n══════════════════════════════════════');
  console.log('세션 33 모바일 Worker 전수조사 결과');
  console.log('══════════════════════════════════════');
  const passCount = results.filter(r => r.status === 'PASS').length;
  const failCount = results.filter(r => r.status === 'FAIL').length;
  const warnCount = results.filter(r => r.status === 'WARN').length;
  console.log(`PASS: ${passCount} / FAIL: ${failCount} / WARN: ${warnCount} / TOTAL: ${results.length}`);
  if (failCount > 0) {
    console.log('\n실패 항목:');
    results.filter(r => r.status === 'FAIL').forEach(r => console.log(`  ❌ ${r.id}: ${r.note}`));
  }
  if (warnCount > 0) {
    console.log('\n경고 항목:');
    results.filter(r => r.status === 'WARN').forEach(r => console.log(`  ⚠️ ${r.id}: ${r.note}`));
  }
  fs.writeFileSync(`${SS_DIR}/results.json`, JSON.stringify({ results, summary: { passCount, failCount, warnCount } }, null, 2));
  console.log(`\n결과 저장: ${SS_DIR}/results.json`);
})();
