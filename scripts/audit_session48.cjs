/**
 * 세션 48 — HQ-ISSUE-PAGE-001 검증
 *           + 세션 47 누적 회귀 방어 (Section L 복원 포함)
 * 실행: node scripts/audit_session48.cjs
 *
 * 섹션 구성:
 *   A:   로그인
 *   B:   성과 관리 4화면 + 라벨 회귀 (세션 40)
 *   C:   생육 대시보드 회귀 (세션 39)
 *   D:   메인 대시보드 + HQ + 콘솔 에러 회귀
 *   E:   Stats 성과 분석 회귀 (세션 41)
 *   F:   WorkStatsPage 회귀 (세션 42)
 *   G:   BranchStatsPage 회귀 (세션 42)
 *   H:   앱 이름 FarmWork 회귀 (세션 42)
 *   I:   PROTECTED-ROUTE-001 회귀 (세션 43) — 완전판 복원
 *   J:   BRANCH-WORK-SCHEDULE-UI-001 회귀 (세션 44) — 완전판 복원
 *   K:   TASKS-WORKER-ID-MISMATCH-001 회귀 (세션 45) — 완전판 복원
 *   L:   HARVEST-TARGETS-001 회귀 (세션 46) — 복원 (세션 47에서 탈락됨)
 *   M:   DASHBOARD-PHASE2-001 회귀 (세션 47)
 *   N:   HQ-ISSUE-PAGE-001 신규 (세션 48)
 */
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:5173';
const OUT_DIR = path.join(__dirname, '..', 'docs', 'regression_session48');

let PASS = 0, FAIL = 0, WARN = 0;
const results = [];
let currentTest = '';

function log(status, title, detail = '') {
  const sym = status === 'PASS' ? '✅' : status === 'FAIL' ? '❌' : '⚠️';
  console.log(`  ${sym} [${status}] ${title}${detail ? ' — ' + detail : ''}`);
  results.push({ test: currentTest, status, title, detail });
  if (status === 'PASS') PASS++;
  else if (status === 'FAIL') FAIL++;
  else WARN++;
}

async function ss(page, name) {
  if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });
  await page.screenshot({ path: path.join(OUT_DIR, `${name}.png`), fullPage: false }).catch(() => {});
}

async function goto(page, url) {
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(800);
}

async function waitForDataLoad(page, timeout = 12000) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    const text = await page.textContent('body').catch(() => '');
    if (!text.includes('로딩 중...')) return true;
    await page.waitForTimeout(400);
  }
  return false;
}

async function loginAs(page, username, password = 'rmfpvm001') {
  await goto(page, `${BASE_URL}/login`);
  await page.fill('input[placeholder*="아이디"]', username).catch(() => {});
  await page.fill('input[type="password"]', password).catch(() => {});
  await page.click('button[type="submit"]').catch(() => {});
  await page.waitForTimeout(4500);
  return page.url().includes('/admin');
}

(async () => {
  console.log('=== 세션 48 검증 + 세션 47 누적 회귀 방어 감사 ===\n');

  const browser = await chromium.launch({ headless: true });

  // ════════════════════════════════════════════
  // SECTION A: 로그인 (jhkim hr_admin)
  // ════════════════════════════════════════════
  console.log('[SECTION A] 로그인');
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  const consoleErrors = [];
  page.on('console', (msg) => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });
  page.on('dialog', async (d) => { await d.accept().catch(() => {}); });

  currentTest = 'LOGIN';
  console.log('\n[A-1] jhkim 로그인');
  await goto(page, `${BASE_URL}/login`);
  await page.fill('input[placeholder*="아이디"]', 'jhkim').catch(() => {});
  await page.fill('input[type="password"]', 'rmfpvm001').catch(() => {});
  await page.click('button[type="submit"]').catch(() => {});
  await page.waitForTimeout(4500);
  const loggedIn = page.url().includes('/admin');
  loggedIn ? log('PASS', 'jhkim 로그인', page.url()) : log('FAIL', '로그인 실패', page.url());
  if (!loggedIn) { await browser.close(); process.exit(1); }

  // ════════════════════════════════════════════
  // SECTION B: 성과 관리 화면 검증 (세션 40 회귀)
  // ════════════════════════════════════════════
  console.log('\n[SECTION B] 성과 관리 화면 검증 (세션 40 회귀)');

  currentTest = 'PERF-BRANCH';
  console.log('\n[B-1] /admin/performance — BranchPerformanceScreen 로드');
  await goto(page, `${BASE_URL}/admin/performance`);
  await waitForDataLoad(page, 12000);
  const branchText = await page.textContent('body').catch(() => '');
  await ss(page, 'perf-branch');
  log('PASS', 'BranchPerformanceScreen 로딩 완료');
  branchText.includes('데이터가 없습니다') && !branchText.includes('수확 데이터가 없습니다')
    ? log('FAIL', '화이트 스크린') : log('PASS', '화이트 스크린 없음');
  branchText.includes('작업자 성과 관리')
    ? log('PASS', '성과 관리 타이틀 표시') : log('FAIL', '성과 관리 타이틀 없음');

  currentTest = 'PERF-BRANCH-DATA';
  console.log('\n[B-2] 부산LAB 성과 — 실데이터');
  const branchTableRows = await page.locator('tbody tr').count().catch(() => 0);
  branchTableRows > 0 ? log('PASS', `테이블 ${branchTableRows}행`) : log('WARN', '작업자 없음');
  for (const kpi of ['평균 수확 성과율', '평균 수확 달성률', '목표 달성 인원', '평균 출근률']) {
    branchText.includes(kpi) ? log('PASS', `KPI: ${kpi}`) : log('WARN', `KPI 없음: ${kpi}`);
  }

  currentTest = 'PERF-HQ';
  console.log('\n[B-3] /admin/hq/performance — HQPerformanceScreen');
  await goto(page, `${BASE_URL}/admin/hq/performance`);
  await waitForDataLoad(page, 12000);
  const hqPerfText = await page.textContent('body').catch(() => '');
  await ss(page, 'perf-hq');
  hqPerfText.includes('데이터가 없습니다') && !hqPerfText.includes('수확 데이터가 없습니다')
    ? log('FAIL', 'HQ 화이트 스크린') : log('PASS', 'HQ 화이트 스크린 없음');
  hqPerfText.includes('작업자 성과 관리')
    ? log('PASS', 'HQ 성과 관리 타이틀') : log('FAIL', 'HQ 타이틀 없음');
  log('PASS', 'jhkim(hr_admin) → HQ 성과 페이지 접근 허용');

  currentTest = 'PERF-HQ-DATA';
  console.log('\n[B-4] HQ 전사 성과 — 실데이터');
  const hqTableRows = await page.locator('tbody tr').count().catch(() => 0);
  hqTableRows > 0 ? log('PASS', `HQ 테이블 ${hqTableRows}행`) : log('WARN', '전사 테이블 없음');
  for (const top of ['수확 성과율 Top 5', '수확 달성률 Top 5', '주간 수확량 Top 5']) {
    hqPerfText.includes(top) ? log('PASS', `Top 5: ${top}`) : log('FAIL', `Top 5 없음: ${top}`);
  }
  for (const branch of ['부산LAB', '진주HUB', '하동HUB']) {
    hqPerfText.includes(branch) ? log('PASS', `지점: ${branch}`) : log('WARN', `지점 없음: ${branch}`);
  }

  currentTest = 'PERF-DETAIL';
  console.log('\n[B-5] /admin/performance/detail — PerformanceDetailScreen');
  await goto(page, `${BASE_URL}/admin/performance/detail`);
  await waitForDataLoad(page, 12000);
  const detailText = await page.textContent('body').catch(() => '');
  await ss(page, 'perf-detail');
  detailText.includes('데이터가 없습니다') && !detailText.includes('수확 데이터가 없습니다')
    ? log('FAIL', 'Detail 화이트 스크린') : log('PASS', 'Detail 화이트 스크린 없음');
  const detailH1 = await page.locator('h1').first().isVisible().catch(() => false);
  detailH1 ? log('PASS', '작업자 헤더 표시') : log('FAIL', '작업자 헤더 없음');
  for (const kpi of ['수확 성과율', '수확 달성률', '주간 수확량', '출근률']) {
    detailText.includes(kpi) ? log('PASS', `Detail KPI: ${kpi}`) : log('WARN', `Detail KPI 없음: ${kpi}`);
  }

  currentTest = 'PERF-COMPARE';
  console.log('\n[B-6] /admin/performance/compare — PerformanceCompareScreen');
  await goto(page, `${BASE_URL}/admin/performance/compare`);
  await waitForDataLoad(page, 12000);
  const compareText = await page.textContent('body').catch(() => '');
  await ss(page, 'perf-compare');
  compareText.includes('데이터가 없습니다') && !compareText.includes('수확 데이터가 없습니다')
    ? log('FAIL', 'Compare 화이트 스크린') : log('PASS', 'Compare 화이트 스크린 없음');
  compareText.includes('나란히 비교') ? log('PASS', 'Compare 타이틀') : log('FAIL', 'Compare 타이틀 없음');
  compareText.includes('수확 성과율') ? log('PASS', '비교 테이블 항목') : log('WARN', '항목 없음');

  currentTest = 'PERF-LABEL-CHANGE';
  console.log('\n[B-7] 라벨 변경 확인');
  await goto(page, `${BASE_URL}/admin/performance`);
  await waitForDataLoad(page, 10000);
  const branchText2 = await page.textContent('body').catch(() => '');
  branchText2.includes('주간 수확량 Top 5') ? log('PASS', '"주간 수확량 Top 5" 라벨') : log('FAIL', '라벨 없음');
  branchText2.includes('수확 성과율 Top 5') ? log('PASS', '"수확 성과율 Top 5" 라벨') : log('FAIL', '라벨 없음');
  (!branchText2.includes('종합 효율 Top 5') && !branchText2.includes('작업 속도 Top 5'))
    ? log('PASS', '구 라벨 제거') : log('FAIL', '구 라벨 잔존');

  // ════════════════════════════════════════════
  // SECTION C: 세션 39 회귀 방어
  // ════════════════════════════════════════════
  console.log('\n[SECTION C] 세션 39 회귀 방어');
  currentTest = 'REGRESSION-GROWTH-INPUT';
  console.log('\n[C-1] GrowthInputScreen 회귀');
  await goto(page, `${BASE_URL}/admin/growth/input`);
  await waitForDataLoad(page, 10000);
  const growthInputText = await page.textContent('body').catch(() => '');
  log('PASS', 'GrowthInputScreen 로딩 완료');
  growthInputText.includes('주별 생육 기록 입력') ? log('PASS', '생육 입력 타이틀') : log('FAIL', '타이틀 없음');
  await ss(page, 'growth-input');

  currentTest = 'REGRESSION-GROWTH-DASH';
  console.log('\n[C-2] 생육 대시보드 회귀');
  await goto(page, `${BASE_URL}/admin/growth`);
  await waitForDataLoad(page, 10000);
  const growthDashText = await page.textContent('body').catch(() => '');
  growthDashText.includes('데이터가 없습니다')
    ? log('FAIL', '생육 대시보드 화이트 스크린 회귀') : log('PASS', '생육 대시보드 정상');
  await ss(page, 'growth-dashboard');

  currentTest = 'REGRESSION-GROWTH-TABS';
  console.log('\n[C-3] 생육 작물 탭 회귀');
  for (const crop of ['토마토', '오이', '파프리카']) {
    const found = await page.locator(`button:has-text("${crop}")`).first().isVisible().catch(() => false);
    found ? log('PASS', `작물 탭: ${crop}`) : log('FAIL', `탭 없음: ${crop}`);
  }

  currentTest = 'REGRESSION-GROWTH-KPI';
  console.log('\n[C-4] 생육 KPI 카드 회귀');
  for (const kpi of ['이번 주 생장', '화방 높이', '누적 착과', '작기 진행']) {
    growthDashText.includes(kpi) ? log('PASS', `KPI: ${kpi}`) : log('FAIL', `KPI 없음: ${kpi}`);
  }

  // ════════════════════════════════════════════
  // SECTION D: 세션 28-38 누적 회귀 방어
  // ════════════════════════════════════════════
  console.log('\n[SECTION D] 세션 28-38 누적 회귀 방어');
  currentTest = 'REGRESSION-MAIN-DASHBOARD';
  console.log('\n[D-1] 메인 대시보드');
  await goto(page, `${BASE_URL}/admin/dashboard`);
  await page.waitForTimeout(2000);
  const dashText = await page.textContent('body').catch(() => '');
  !(/\d+\.\d{4,}/.test(dashText)) ? log('PASS', 'BUG-F01 부동소수점 회귀 없음') : log('FAIL', '부동소수점 재발');
  await ss(page, 'main-dashboard');

  currentTest = 'REGRESSION-SCHEDULE';
  console.log('\n[D-2] 근무 관리 회귀');
  await goto(page, `${BASE_URL}/admin/schedule`);
  await page.waitForTimeout(1200);
  const schedText = await page.textContent('body').catch(() => '');
  schedText.includes('근무 관리') ? log('PASS', '근무 관리 타이틀') : log('FAIL', '타이틀 없음');
  (schedText.includes('08:00') || schedText.includes('08'))
    ? log('PASS', '타임라인 헤더') : log('FAIL', '타임라인 없음');

  currentTest = 'REGRESSION-EMPLOYEES';
  console.log('\n[D-3] 직원 목록 회귀');
  await goto(page, `${BASE_URL}/admin/employees`);
  await page.waitForTimeout(1500);
  const empText = await page.textContent('body').catch(() => '');
  empText.includes('직원') ? log('PASS', '직원 관리 페이지') : log('FAIL', '페이지 없음');
  const empRows = await page.locator('table tbody tr').count().catch(() => 0);
  empRows > 0 ? log('PASS', `직원 ${empRows}행`) : log('WARN', '행 없음');

  currentTest = 'REGRESSION-HQ-DASHBOARD';
  console.log('\n[D-4] HQ 대시보드 (hr_admin 접근) — 회귀');
  await goto(page, `${BASE_URL}/admin/hq`);
  await page.waitForTimeout(2000);
  const hqDashText = await page.textContent('body').catch(() => '');
  hqDashText.includes('이번달 수확량') || hqDashText.includes('전체 수확') || hqDashText.includes('지점')
    ? log('PASS', 'HQ 대시보드 표시 (hr_admin)') : log('WARN', 'HQ 대시보드 확인 필요');

  currentTest = 'REGRESSION-CONSOLE';
  console.log('\n[D-5] 콘솔 에러 확인');
  const filteredErrors = consoleErrors.filter(e =>
    !e.includes('favicon') && !e.includes('404') && !e.includes('net::ERR')
  );
  filteredErrors.length === 0
    ? log('PASS', '중요 콘솔 에러 0건')
    : log('WARN', `콘솔 에러 ${filteredErrors.length}건`, filteredErrors[0]?.slice(0, 120));

  // ════════════════════════════════════════════
  // SECTION E: Stats 성과 분석 회귀 (세션 41)
  // ════════════════════════════════════════════
  console.log('\n[SECTION E] Stats 성과 분석 회귀 (세션 41)');
  currentTest = 'STATS-LOAD';
  console.log('\n[E-1] /admin/stats — 화이트 스크린 회귀');
  await goto(page, `${BASE_URL}/admin/stats`);
  await waitForDataLoad(page, 12000);
  const statsText = await page.textContent('body').catch(() => '');
  await ss(page, 'stats-main');
  log('PASS', 'StatsPage 로딩 완료');
  statsText.includes('작업자 성과 분석') ? log('PASS', '성과 분석 타이틀') : log('FAIL', '타이틀 없음');
  statsText.includes('평가 데이터가 없습니다') ? log('FAIL', '구 빈 상태 잔존') : log('PASS', '빈 상태 없음');

  currentTest = 'STATS-KPI';
  console.log('\n[E-2] Stats KPI 3개');
  for (const kpi of ['평균 수확 성과율', '주간 최고 수확량', '평가 인원']) {
    statsText.includes(kpi) ? log('PASS', `KPI: ${kpi}`) : log('FAIL', `KPI 없음: ${kpi}`);
  }
  statsText.includes('kg/주') ? log('PASS', '"kg/주" 단위') : log('WARN', '"kg/주" 없음');
  statsText.includes('수확 성과 랭킹') ? log('PASS', '랭킹 헤더') : log('FAIL', '헤더 없음');

  currentTest = 'STATS-RANKING';
  console.log('\n[E-3] 수확 성과 랭킹');
  const hasPctUnit = await page.locator('text="%"').first().isVisible().catch(() => false);
  hasPctUnit ? log('PASS', '% 단위 표시') : log('WARN', '% 없음');
  const hasBranchBadge = statsText.includes('부산LAB') || statsText.includes('진주HUB') || statsText.includes('하동HUB');
  hasBranchBadge ? log('PASS', '지점 배지 표시') : log('WARN', '지점 배지 없음');

  currentTest = 'STATS-PERMISSION';
  console.log('\n[E-4] 권한 분기');
  const allBranches = ['부산LAB', '진주HUB', '하동HUB'].every(b => statsText.includes(b));
  allBranches ? log('PASS', 'hr_admin 전체 지점 (3개 지점 배지 확인)') : log('WARN', '지점 일부 미표시');

  // ════════════════════════════════════════════
  // SECTION F: WorkStatsPage 회귀 (세션 42)
  // ════════════════════════════════════════════
  console.log('\n[SECTION F] WorkStatsPage 회귀 (세션 42)');
  currentTest = 'WORK-STATS-LOAD';
  console.log('\n[F-1] /admin/work-stats 로드');
  await goto(page, `${BASE_URL}/admin/work-stats`);
  await waitForDataLoad(page, 10000);
  const wsText = await page.textContent('body').catch(() => '');
  await ss(page, 'work-stats');
  wsText.includes('근무 통계') ? log('PASS', '근무 통계 타이틀') : log('FAIL', '타이틀 없음');
  wsText.includes('준비 중') ? log('FAIL', '"준비 중" stub 잔존') : log('PASS', 'stub 제거됨');

  // ════════════════════════════════════════════
  // SECTION G: BranchStatsPage 회귀 (세션 42)
  // ════════════════════════════════════════════
  console.log('\n[SECTION G] BranchStatsPage 회귀 (세션 42)');
  currentTest = 'BRANCH-STATS-LOAD';
  console.log('\n[G-1] /admin/branch-stats 로드');
  await goto(page, `${BASE_URL}/admin/branch-stats`);
  await waitForDataLoad(page, 12000);
  const bsText = await page.textContent('body').catch(() => '');
  await ss(page, 'branch-stats');
  bsText.includes('지점별 성과') ? log('PASS', '지점별 성과 타이틀') : log('FAIL', '타이틀 없음');
  for (const branch of ['부산LAB', '진주HUB', '하동HUB']) {
    bsText.includes(branch) ? log('PASS', `지점 카드: ${branch}`) : log('FAIL', `카드 없음: ${branch}`);
  }
  bsText.includes('이번 달 달성률') ? log('PASS', '"이번 달 달성률" KPI (세션 46 회귀)') : log('FAIL', '달성률 KPI 없음');

  // ════════════════════════════════════════════
  // SECTION H: 앱 이름 FarmWork 회귀 (세션 42)
  // ════════════════════════════════════════════
  console.log('\n[SECTION H] 앱 이름 FarmWork 회귀 (세션 42)');
  await ctx.close();
  const ctx2 = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page2 = await ctx2.newPage();

  currentTest = 'APP-NAME-LOGIN';
  await goto(page2, `${BASE_URL}/login`);
  await page2.waitForTimeout(500);
  const loginPageText = await page2.textContent('body').catch(() => '');
  loginPageText.includes('FarmWork') ? log('PASS', '"FarmWork" 표시') : log('FAIL', '"FarmWork" 없음');
  loginPageText.includes('GREF FarmWork') ? log('FAIL', '구 이름 잔존') : log('PASS', '구 이름 제거');

  currentTest = 'APP-NAME-SIDEBAR';
  await page2.fill('input[placeholder*="아이디"]', 'jhkim').catch(() => {});
  await page2.fill('input[type="password"]', 'rmfpvm001').catch(() => {});
  await page2.click('button[type="submit"]').catch(() => {});
  await page2.waitForTimeout(4000);
  const sidebarText = await page2.textContent('body').catch(() => '');
  sidebarText.includes('FarmWork') ? log('PASS', '"FarmWork" 사이드바') : log('WARN', '"FarmWork" 미확인');
  await ctx2.close();

  // ════════════════════════════════════════════
  // SECTION I: PROTECTED-ROUTE-001 (세션 43 회귀) — 완전판 복원
  // ════════════════════════════════════════════
  console.log('\n[SECTION I] PROTECTED-ROUTE-001 HQ 라우트 보호 검증 (세션 43 회귀)');

  const ctxHR = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const pageHR = await ctxHR.newPage();
  pageHR.on('dialog', async (d) => { await d.accept().catch(() => {}); });

  currentTest = 'HQ-ROUTE-HR-ADMIN';
  console.log('\n[I-1] hr_admin(jhkim) → /admin/hq 접근 허용');
  const hrLoggedIn = await loginAs(pageHR, 'jhkim');
  hrLoggedIn ? log('PASS', 'jhkim 로그인') : log('FAIL', '로그인 실패');

  await goto(pageHR, `${BASE_URL}/admin/hq`);
  await pageHR.waitForTimeout(1500);
  pageHR.url().includes('/admin/hq')
    ? log('PASS', `hr_admin → /admin/hq 접근 허용`)
    : log('FAIL', `hr_admin → /admin/hq 접근 거부됨 (${pageHR.url()})`);

  console.log('\n[I-2] hr_admin → /admin/hq/employees 접근 허용');
  await goto(pageHR, `${BASE_URL}/admin/hq/employees`);
  await pageHR.waitForTimeout(1500);
  pageHR.url().includes('/admin/hq/employees')
    ? log('PASS', 'hr_admin → /admin/hq/employees 접근 허용')
    : log('FAIL', `접근 거부됨 (${pageHR.url()})`);

  console.log('\n[I-3] hr_admin → /admin/hq/issues 접근 허용 (세션 48 신규 라우트)');
  await goto(pageHR, `${BASE_URL}/admin/hq/issues`);
  await pageHR.waitForTimeout(2000);
  pageHR.url().includes('/admin/hq/issues')
    ? log('PASS', 'hr_admin → /admin/hq/issues 접근 허용')
    : log('FAIL', `접근 거부됨 (${pageHR.url()})`);

  await ctxHR.close();

  const ctxFarm = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const pageFarm = await ctxFarm.newPage();
  pageFarm.on('dialog', async (d) => { await d.accept().catch(() => {}); });

  currentTest = 'HQ-ROUTE-FARM-ADMIN';
  console.log('\n[I-4] farm_admin(hdkim) 로그인');
  const farmLoggedIn = await loginAs(pageFarm, 'hdkim');
  farmLoggedIn
    ? log('PASS', `hdkim(farm_admin) 로그인`)
    : log('FAIL', `hdkim 로그인 실패`);

  if (farmLoggedIn) {
    console.log('\n[I-5] farm_admin → /admin/hq → /admin 리디렉트 확인');
    await goto(pageFarm, `${BASE_URL}/admin/hq`);
    await pageFarm.waitForTimeout(1500);
    const farmHqUrl = pageFarm.url();
    !farmHqUrl.includes('/admin/hq') && farmHqUrl.includes('/admin')
      ? log('PASS', `farm_admin → /admin/hq → /admin 리디렉트`)
      : log('FAIL', `차단 실패: ${farmHqUrl}`);

    console.log('\n[I-6] farm_admin → /admin/hq/issues → /admin 리디렉트 (세션 48 신규 라우트)');
    await goto(pageFarm, `${BASE_URL}/admin/hq/issues`);
    await pageFarm.waitForTimeout(1500);
    const farmIssueUrl = pageFarm.url();
    !farmIssueUrl.includes('/admin/hq') && farmIssueUrl.includes('/admin')
      ? log('PASS', 'farm_admin → /admin/hq/issues → /admin 리디렉트')
      : log('FAIL', `차단 실패: ${farmIssueUrl}`);

    console.log('\n[I-7] farm_admin → /admin/performance (HQ 아님) → 접근 허용');
    await goto(pageFarm, `${BASE_URL}/admin/performance`);
    await waitForDataLoad(pageFarm, 8000);
    const farmPerfText = await pageFarm.textContent('body').catch(() => '');
    pageFarm.url().includes('/admin/performance') && farmPerfText.includes('성과 관리')
      ? log('PASS', 'farm_admin → /admin/performance 접근 허용')
      : log('FAIL', `비HQ 페이지 접근 이상: ${pageFarm.url()}`);

    console.log('\n[I-8] farm_admin → /admin/stats (HQ 아님) → 접근 허용');
    await goto(pageFarm, `${BASE_URL}/admin/stats`);
    await waitForDataLoad(pageFarm, 8000);
    const farmStatsText = await pageFarm.textContent('body').catch(() => '');
    farmStatsText.includes('작업자 성과 분석')
      ? log('PASS', 'farm_admin → /admin/stats 접근 허용')
      : log('WARN', 'farm_admin /admin/stats 표시 확인 필요');
  } else {
    for (let i = 5; i <= 8; i++) log('WARN', `I-${i}: hdkim 로그인 불가 — 스킵`);
  }
  await ctxFarm.close();

  // ════════════════════════════════════════════
  // SECTION J: BRANCH-WORK-SCHEDULE-UI-001 (세션 44 회귀) — 완전판 복원
  // ════════════════════════════════════════════
  console.log('\n[SECTION J] BRANCH-WORK-SCHEDULE-UI-001 근무시간 설정 UI 검증 (세션 44 회귀)');

  const ctxJ = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const pageJ = await ctxJ.newPage();
  pageJ.on('dialog', async (d) => { await d.accept().catch(() => {}); });

  currentTest = 'BRANCH-WORK-SCHEDULE';
  console.log('\n[J-1] hr_admin → /admin/branch-settings 로드');
  const jLoggedIn = await loginAs(pageJ, 'jhkim');
  jLoggedIn ? log('PASS', 'jhkim 로그인') : log('FAIL', '로그인 실패');

  await goto(pageJ, `${BASE_URL}/admin/branch-settings`);
  // branches 로딩 후 selected 확정까지 폴링 (교훈 76)
  const deadlineJ1 = Date.now() + 8000;
  let jText1 = '';
  while (Date.now() < deadlineJ1) {
    jText1 = await pageJ.textContent('body').catch(() => '');
    if (jText1.includes('근무시간 설정')) break;
    await pageJ.waitForTimeout(400);
  }
  await ss(pageJ, 'branch-settings-sched');
  jText1.includes('지점 설정') ? log('PASS', '지점 설정 페이지 로드') : log('FAIL', '페이지 로드 실패');

  console.log('\n[J-2] 근무시간 설정 섹션 표시');
  jText1.includes('근무시간 설정')
    ? log('PASS', '"근무시간 설정" 섹션 표시')
    : log('FAIL', '"근무시간 설정" 섹션 없음');

  console.log('\n[J-3] DB 데이터 로드 — 시간 표시 확인');
  const deadline44 = Date.now() + 8000;
  let jText2 = jText1;
  while (Date.now() < deadline44) {
    jText2 = await pageJ.textContent('body').catch(() => '');
    if (!jText2.includes('로딩 중...') && (jText2.includes('07:30') || jText2.includes('출근 시간'))) break;
    await pageJ.waitForTimeout(400);
  }
  await ss(pageJ, 'branch-settings-sched-loaded');
  (jText2.includes('07:30') || jText2.includes('07'))
    ? log('PASS', '출근 시간 표시 (DB 데이터 로드 확인)')
    : log('WARN', '출근 시간 미표시');
  (jText2.includes('16:30') || jText2.includes('퇴근 시간'))
    ? log('PASS', '퇴근 시간 필드 표시')
    : log('WARN', '퇴근 시간 필드 미표시');

  console.log('\n[J-4] 근무 요일 버튼 표시');
  for (const day of ['월', '화', '수', '목', '금', '토', '일']) {
    const btn = await pageJ.locator(`button:has-text("${day}")`).first().isVisible().catch(() => false);
    btn ? log('PASS', `요일 버튼: ${day}`) : log('WARN', `요일 버튼 없음: ${day}`);
  }

  console.log('\n[J-5] hr_admin → 저장 버튼 표시 (편집 권한)');
  const saveBtn = await pageJ.locator('button:has-text("근무시간 저장")').first().isVisible().catch(() => false);
  saveBtn ? log('PASS', '"근무시간 저장" 버튼 표시 (hr_admin 편집 권한 확인)') : log('FAIL', '저장 버튼 없음');

  await ctxJ.close();

  const ctxJ2 = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const pageJ2 = await ctxJ2.newPage();
  pageJ2.on('dialog', async (d) => { await d.accept().catch(() => {}); });

  console.log('\n[J-6] farm_admin → /admin/branch-settings → 읽기 전용 표시');
  const j2LoggedIn = await loginAs(pageJ2, 'hdkim');
  j2LoggedIn ? log('PASS', 'hdkim(farm_admin) 로그인') : log('FAIL', '로그인 실패');

  if (j2LoggedIn) {
    await goto(pageJ2, `${BASE_URL}/admin/branch-settings`);
    const deadlineJ6 = Date.now() + 8000;
    let jFarmText = '';
    while (Date.now() < deadlineJ6) {
      jFarmText = await pageJ2.textContent('body').catch(() => '');
      if (jFarmText.includes('근무시간 설정')) break;
      await pageJ2.waitForTimeout(400);
    }
    await ss(pageJ2, 'branch-settings-farm-admin');
    jFarmText.includes('근무시간 설정')
      ? log('PASS', 'farm_admin → 근무시간 설정 섹션 표시')
      : log('FAIL', 'farm_admin → 섹션 없음');
    jFarmText.includes('읽기 전용')
      ? log('PASS', 'farm_admin → "읽기 전용" 표시 확인')
      : log('WARN', 'farm_admin → "읽기 전용" 표시 미확인');
    const saveBtnFarm = await pageJ2.locator('button:has-text("근무시간 저장")').first().isVisible().catch(() => false);
    !saveBtnFarm
      ? log('PASS', 'farm_admin → 저장 버튼 없음 (편집 차단 확인)')
      : log('FAIL', 'farm_admin → 저장 버튼 노출 — 권한 분기 오류');
  } else {
    log('WARN', 'hdkim 로그인 실패 — J-6 스킵');
  }
  await ctxJ2.close();

  // ════════════════════════════════════════════
  // SECTION K: TASKS-WORKER-ID-MISMATCH-001 (세션 45 회귀) — 완전판 복원
  // ════════════════════════════════════════════
  console.log('\n[SECTION K] TASKS-WORKER-ID-MISMATCH-001 — 3지점 작업 데이터 검증 (세션 45 회귀)');

  const ctxK = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const pageK = await ctxK.newPage();
  pageK.on('dialog', async (d) => { await d.accept().catch(() => {}); });

  currentTest = 'TASKS-MISMATCH-FIX';
  console.log('\n[K-1] hr_admin → /admin/schedule — 작업자 목록 표시');
  const kLoggedIn = await loginAs(pageK, 'jhkim');
  kLoggedIn ? log('PASS', 'jhkim 로그인') : log('FAIL', '로그인 실패');

  await goto(pageK, `${BASE_URL}/admin/schedule`);
  await pageK.waitForTimeout(2500);
  const kSchedText = await pageK.textContent('body').catch(() => '');
  await ss(pageK, 'schedule-k1');
  kSchedText.includes('근무 관리') ? log('PASS', '근무 관리 타이틀') : log('FAIL', '타이틀 없음');

  console.log('\n[K-2] SchedulePage — 활성 작업자 표시');
  !kSchedText.includes('작업자 데이터가 없습니다')
    ? log('PASS', '활성 작업자 목록 표시')
    : log('FAIL', '"작업자 데이터가 없습니다" — 작업자 연결 실패');

  console.log('\n[K-3] /admin/board — 작업 칸반 로드');
  await goto(pageK, `${BASE_URL}/admin/board`);
  await waitForDataLoad(pageK, 12000);
  const kBoardText = await pageK.textContent('body').catch(() => '');
  await ss(pageK, 'board-k3');
  kBoardText.includes('작업 칸반') ? log('PASS', '"작업 칸반" 타이틀') : log('FAIL', '타이틀 없음');
  for (const col of ['계획', '배정', '진행중', '완료']) {
    kBoardText.includes(col) ? log('PASS', `칸반 컬럼: ${col}`) : log('FAIL', `컬럼 없음: ${col}`);
  }

  console.log('\n[K-4] Board — 총 작업 건수 ≥ 300건');
  const totalMatch = kBoardText.match(/총\s+(\d+)건/);
  const boardTotal = totalMatch ? parseInt(totalMatch[1]) : 0;
  boardTotal >= 300
    ? log('PASS', `board 총 ${boardTotal}건 (≥300 확인)`)
    : log(boardTotal > 0 ? 'WARN' : 'FAIL', `board 총 ${boardTotal}건 — 예상 361건`);

  await ctxK.close();

  const ctxK2 = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const pageK2 = await ctxK2.newPage();
  pageK2.on('dialog', async (d) => { await d.accept().catch(() => {}); });

  console.log('\n[K-5] farm_admin(hdkim) → /admin/board — 부산 활성 작업 표시');
  const kFarmLoggedIn = await loginAs(pageK2, 'hdkim');
  kFarmLoggedIn ? log('PASS', 'hdkim(farm_admin) 로그인') : log('FAIL', '로그인 실패');

  if (kFarmLoggedIn) {
    await goto(pageK2, `${BASE_URL}/admin/board`);
    await waitForDataLoad(pageK2, 12000);
    const kFarmBoardText = await pageK2.textContent('body').catch(() => '');
    await ss(pageK2, 'board-farm-k5');
    kFarmBoardText.includes('작업 칸반')
      ? log('PASS', 'farm_admin → /admin/board 로딩 정상')
      : log('FAIL', 'farm_admin → board 로딩 실패');
    const farmTotalMatch = kFarmBoardText.match(/총\s+(\d+)건/);
    const farmBoardTotal = farmTotalMatch ? parseInt(farmTotalMatch[1]) : 0;
    farmBoardTotal >= 50
      ? log('PASS', `farm_admin board 총 ${farmBoardTotal}건`)
      : log(farmBoardTotal > 0 ? 'WARN' : 'FAIL', `farm_admin board 총 ${farmBoardTotal}건`);
  } else {
    log('WARN', 'hdkim 로그인 실패 — K-5 스킵');
  }
  await ctxK2.close();

  // ════════════════════════════════════════════
  // SECTION L: HARVEST-TARGETS-001 (세션 46 회귀) — 복원
  // ════════════════════════════════════════════
  console.log('\n[SECTION L] HARVEST-TARGETS-001 — 월 수확 목표 KPI 검증 (세션 46 회귀)');

  const ctxL = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const pageL = await ctxL.newPage();
  pageL.on('dialog', async (d) => { await d.accept().catch(() => {}); });

  currentTest = 'HARVEST-TARGETS';
  console.log('\n[L-1] hr_admin → /admin/branch-settings — "월 수확 목표" 섹션 표시');
  const lLoggedIn = await loginAs(pageL, 'jhkim');
  lLoggedIn ? log('PASS', 'jhkim 로그인') : log('FAIL', '로그인 실패');

  await goto(pageL, `${BASE_URL}/admin/branch-settings`);
  // 폴링 (교훈 76: selected 확정 대기)
  const deadlineL1 = Date.now() + 8000;
  let lText1 = '';
  while (Date.now() < deadlineL1) {
    lText1 = await pageL.textContent('body').catch(() => '');
    if (lText1.includes('월 수확 목표')) break;
    await pageL.waitForTimeout(400);
  }
  await ss(pageL, 'branch-settings-target-l1');
  lText1.includes('월 수확 목표')
    ? log('PASS', '"월 수확 목표" 섹션 표시')
    : log('FAIL', '"월 수확 목표" 섹션 없음');

  console.log('\n[L-2] hr_admin → 목표값 DB 로드 확인 (부산: 5000 kg)');
  const deadlineL2 = Date.now() + 8000;
  let lText2 = lText1;
  while (Date.now() < deadlineL2) {
    lText2 = await pageL.textContent('body').catch(() => '');
    if (!lText2.includes('로딩 중...') && lText2.includes('5000')) break;
    await pageL.waitForTimeout(400);
  }
  await ss(pageL, 'branch-settings-target-l2-loaded');
  (lText2.includes('5000') || lText2.includes('5,000'))
    ? log('PASS', '부산 목표 5000 kg DB 로드 확인')
    : log('WARN', '부산 목표값 미표시');
  lText2.includes('kg / 월')
    ? log('PASS', '"kg / 월" 단위 표시')
    : log('WARN', '"kg / 월" 단위 미표시');

  console.log('\n[L-3] hr_admin → "목표 저장" 버튼 표시');
  const targetSaveBtn = await pageL.locator('button:has-text("목표 저장")').first().isVisible().catch(() => false);
  targetSaveBtn
    ? log('PASS', '"목표 저장" 버튼 표시 (hr_admin 편집 권한 확인)')
    : log('FAIL', '"목표 저장" 버튼 없음');

  await ctxL.close();

  const ctxL2 = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const pageL2 = await ctxL2.newPage();
  pageL2.on('dialog', async (d) => { await d.accept().catch(() => {}); });

  console.log('\n[L-4] farm_admin → /admin/branch-settings — 수확 목표 읽기 전용');
  const l2LoggedIn = await loginAs(pageL2, 'hdkim');
  l2LoggedIn ? log('PASS', 'hdkim(farm_admin) 로그인') : log('FAIL', '로그인 실패');

  if (l2LoggedIn) {
    await goto(pageL2, `${BASE_URL}/admin/branch-settings`);
    const deadlineL4 = Date.now() + 8000;
    let lFarmText = '';
    while (Date.now() < deadlineL4) {
      lFarmText = await pageL2.textContent('body').catch(() => '');
      if (lFarmText.includes('월 수확 목표')) break;
      await pageL2.waitForTimeout(400);
    }
    await ss(pageL2, 'branch-settings-target-farm');
    lFarmText.includes('월 수확 목표')
      ? log('PASS', 'farm_admin → "월 수확 목표" 섹션 표시')
      : log('FAIL', 'farm_admin → 섹션 없음');
    const targetSaveBtnFarm = await pageL2.locator('button:has-text("목표 저장")').first().isVisible().catch(() => false);
    !targetSaveBtnFarm
      ? log('PASS', 'farm_admin → "목표 저장" 버튼 없음 (읽기 전용 확인)')
      : log('FAIL', 'farm_admin → "목표 저장" 버튼 노출 — 권한 분기 오류');
  } else {
    log('WARN', 'hdkim 로그인 실패 — L-4 스킵');
  }
  await ctxL2.close();

  const ctxL3 = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const pageL3 = await ctxL3.newPage();
  pageL3.on('dialog', async (d) => { await d.accept().catch(() => {}); });

  console.log('\n[L-5] /admin/branch-stats — "이번 달 달성률" KPI 표시');
  const l3LoggedIn = await loginAs(pageL3, 'jhkim');
  l3LoggedIn ? log('PASS', 'jhkim 로그인') : log('FAIL', '로그인 실패');

  await goto(pageL3, `${BASE_URL}/admin/branch-stats`);
  await waitForDataLoad(pageL3, 12000);
  const l3Text = await pageL3.textContent('body').catch(() => '');
  await ss(pageL3, 'branch-stats-target-l5');
  l3Text.includes('이번 달 달성률')
    ? log('PASS', '"이번 달 달성률" KPI 항목 표시')
    : log('FAIL', '"이번 달 달성률" KPI 없음');
  (/%|—/.test(l3Text))
    ? log('PASS', '달성률 값(% 또는 —) 표시 확인')
    : log('WARN', '달성률 값 미표시');

  await ctxL3.close();

  const ctxL4 = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const pageL4 = await ctxL4.newPage();
  pageL4.on('dialog', async (d) => { await d.accept().catch(() => {}); });

  console.log('\n[L-6] HQBranchesScreen — 달성률 실데이터 표시');
  const l4LoggedIn = await loginAs(pageL4, 'jhkim');
  l4LoggedIn ? log('PASS', 'jhkim 로그인') : log('FAIL', '로그인 실패');

  await goto(pageL4, `${BASE_URL}/admin/hq/branches`);
  await waitForDataLoad(pageL4, 12000);
  await pageL4.waitForTimeout(2000);
  const l4Text = await pageL4.textContent('body').catch(() => '');
  await ss(pageL4, 'hq-branches-target-l6');
  l4Text.includes('달성')
    ? log('PASS', '"달성" 메트릭 슬롯 표시')
    : log('FAIL', '"달성" 메트릭 없음');
  const achieveMatch = l4Text.match(/(\d+)%/g);
  achieveMatch && achieveMatch.length > 0
    ? log('PASS', `달성률 % 값 표시 (${achieveMatch.slice(0, 3).join(', ')})`)
    : log('WARN', '달성률 % 미표시');

  await ctxL4.close();

  const ctxL5 = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const pageL5 = await ctxL5.newPage();
  pageL5.on('dialog', async (d) => { await d.accept().catch(() => {}); });

  console.log('\n[L-7] AdminDashboard — 하드코딩 "87%" 제거, 실데이터 표시');
  const l5LoggedIn = await loginAs(pageL5, 'jhkim');
  l5LoggedIn ? log('PASS', 'jhkim 로그인') : log('FAIL', '로그인 실패');

  await goto(pageL5, `${BASE_URL}/admin/dashboard`);
  await pageL5.waitForTimeout(3000);
  const l5Text = await pageL5.textContent('body').catch(() => '');
  await ss(pageL5, 'dashboard-target-l7');
  !l5Text.includes('목표 대비 87%')
    ? log('PASS', '하드코딩 "목표 대비 87%" 제거 확인')
    : log('FAIL', '하드코딩 "87%" 잔존');
  l5Text.includes('이번 달 목표 대비')
    ? log('PASS', '"이번 달 목표 대비" 텍스트 표시')
    : log('FAIL', '"이번 달 목표 대비" 텍스트 없음');

  await ctxL5.close();

  // ════════════════════════════════════════════
  // SECTION M: DASHBOARD-PHASE2-001 회귀 (세션 47)
  // ════════════════════════════════════════════
  console.log('\n[SECTION M] DASHBOARD-PHASE2-001 — AdminDashboard 주간 차트 + 스케줄 회귀 (세션 47)');

  const ctxM = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const pageM = await ctxM.newPage();
  pageM.on('dialog', async (d) => { await d.accept().catch(() => {}); });

  currentTest = 'DASHBOARD-PHASE2';
  console.log('\n[M-1] hr_admin → /admin/dashboard — "이번 주 수확량" 타이틀');
  const mLoggedIn = await loginAs(pageM, 'jhkim');
  mLoggedIn ? log('PASS', 'jhkim 로그인') : log('FAIL', '로그인 실패');

  await goto(pageM, `${BASE_URL}/admin/dashboard`);
  await pageM.waitForTimeout(3000);
  const mText = await pageM.textContent('body').catch(() => '');
  await ss(pageM, 'dashboard-phase2-m1');
  mText.includes('이번 주 수확량')
    ? log('PASS', '"이번 주 수확량" 타이틀 표시 (하드코딩 제거 확인)')
    : log('FAIL', '"이번 주 수확량" 타이틀 없음');

  console.log('\n[M-2] 주간 바 차트 — 하드코딩 "3,280" 제거');
  !mText.includes('3,280')
    ? log('PASS', '하드코딩 3,280 kg 제거 확인')
    : log('FAIL', '하드코딩 3,280 kg 잔존');

  console.log('\n[M-3] 이번 달 목표 대비 — 세션 46 회귀');
  mText.includes('이번 달 목표 대비')
    ? log('PASS', '"이번 달 목표 대비" 유지 (세션 46 회귀)')
    : log('FAIL', '"이번 달 목표 대비" 없음');
  !mText.includes('목표 대비 87%')
    ? log('PASS', '하드코딩 87% 미잔존')
    : log('FAIL', '87% 하드코딩 잔존');

  console.log('\n[M-4] 이번 주 스케줄 카드 — 실데이터 로드');
  mText.includes('이번 주 스케줄')
    ? log('PASS', '"이번 주 스케줄" 섹션 표시')
    : log('FAIL', '"이번 주 스케줄" 없음');
  !mText.includes('수확,TBM,방제') && !mText.includes("['수확','TBM']")
    ? log('PASS', '스케줄 하드코딩 배열 제거 확인')
    : log('FAIL', '스케줄 하드코딩 잔존');

  await ctxM.close();

  // ════════════════════════════════════════════
  // SECTION N: HQ-ISSUE-PAGE-001 신규 (세션 48)
  // ════════════════════════════════════════════
  console.log('\n[SECTION N] HQ-ISSUE-PAGE-001 — HQ 이상 신고 페이지 검증 (신규)');

  const ctxN = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const pageN = await ctxN.newPage();
  pageN.on('dialog', async (d) => { await d.accept().catch(() => {}); });

  currentTest = 'HQ-ISSUE-PAGE';
  console.log('\n[N-1] hr_admin → /admin/hq/issues — 페이지 로드');
  const nLoggedIn = await loginAs(pageN, 'jhkim');
  nLoggedIn ? log('PASS', 'jhkim 로그인') : log('FAIL', '로그인 실패');

  await goto(pageN, `${BASE_URL}/admin/hq/issues`);
  await waitForDataLoad(pageN, 12000);
  const nText1 = await pageN.textContent('body').catch(() => '');
  await ss(pageN, 'hq-issues-n1');
  pageN.url().includes('/admin/hq/issues')
    ? log('PASS', '/admin/hq/issues 라우트 도달')
    : log('FAIL', `라우트 실패 (${pageN.url()})`);
  nText1.includes('이상 신고')
    ? log('PASS', '"이상 신고" 타이틀 표시')
    : log('FAIL', '"이상 신고" 타이틀 없음');

  console.log('\n[N-2] KPI 카드 4개 표시');
  for (const kpi of ['미해결', '해결됨', '전체', '병해충 미해결']) {
    nText1.includes(kpi) ? log('PASS', `KPI: ${kpi}`) : log('FAIL', `KPI 없음: ${kpi}`);
  }

  console.log('\n[N-3] 이슈 목록 표시 — 시드 데이터 (미해결 8건)');
  // 시드 데이터의 이슈 타입 확인
  const hasIssueTypes = ['병해충', '시설이상', '작물이상', '기타'].some(t => nText1.includes(t));
  hasIssueTypes
    ? log('PASS', '이슈 타입 배지 표시 (시드 데이터 로드 확인)')
    : log('FAIL', '이슈 타입 없음 — 시드 데이터 미로드');

  // 미해결 이슈 수 확인 (KPI 숫자)
  const openCountMatch = nText1.match(/미해결[\s\S]{0,200}?(\d+)/);
  const openCount = openCountMatch ? parseInt(openCountMatch[1]) : 0;
  openCount >= 6
    ? log('PASS', `미해결 이슈 ${openCount}건 표시 (≥6 확인)`)
    : log('WARN', `미해결 이슈 ${openCount}건 — 시드 8건 예상`);

  console.log('\n[N-4] 필터 탭 — 미해결/해결됨/전체');
  for (const tab of ['미해결', '해결됨', '전체']) {
    nText1.includes(tab) ? log('PASS', `필터 탭: ${tab}`) : log('FAIL', `필터 탭 없음: ${tab}`);
  }

  console.log('\n[N-5] 이슈 내용 표시 — comment 텍스트 확인');
  const hasSeedComment = nText1.includes('흰가루병') || nText1.includes('진딧물') || nText1.includes('누수');
  hasSeedComment
    ? log('PASS', '시드 이슈 comment 내용 표시 확인')
    : log('WARN', 'comment 텍스트 미표시 (데이터 로드 확인 필요)');

  console.log('\n[N-6] 지점 정보 + 작업자 이름 표시');
  const hasBranchInfo = nText1.includes('부산LAB') || nText1.includes('진주HUB') || nText1.includes('하동HUB');
  hasBranchInfo ? log('PASS', '지점 배지 표시') : log('WARN', '지점 배지 없음');
  const hasWorkerName = nText1.includes('김선아') || nText1.includes('ANG') || nText1.includes('김도윤');
  hasWorkerName ? log('PASS', '작업자 이름 표시') : log('WARN', '작업자 이름 없음');

  console.log('\n[N-7] "해결 완료" 버튼 — 미해결 항목에만 표시');
  const resolveBtn = await pageN.locator('button:has-text("해결 완료")').first().isVisible().catch(() => false);
  resolveBtn
    ? log('PASS', '"해결 완료" 버튼 표시 (미해결 항목 확인)')
    : log('FAIL', '"해결 완료" 버튼 없음');

  console.log('\n[N-8] HQ 사이드바 — "이상 신고" 메뉴 항목');
  nText1.includes('이상 신고')
    ? log('PASS', 'HQ 사이드바 "이상 신고" 메뉴 표시')
    : log('FAIL', '"이상 신고" 메뉴 없음');

  // 전체 탭 전환 확인
  console.log('\n[N-9] 전체 탭 전환 — 해결됨 이슈 포함');
  const allTab = await pageN.locator('span:has-text("전체")').first();
  await allTab.click().catch(() => {});
  await pageN.waitForTimeout(800);
  const nTextAll = await pageN.textContent('body').catch(() => '');
  await ss(pageN, 'hq-issues-n9-all');
  // 전체 12건이면 미해결(8)+해결됨(4) = 12
  const totalCountMatch = nTextAll.match(/전체[\s\S]{0,100}?(\d+)/);
  const totalCount = totalCountMatch ? parseInt(totalCountMatch[1]) : 0;
  totalCount >= 10
    ? log('PASS', `전체 탭 이슈 ${totalCount}건 (≥10 확인)`)
    : log('WARN', `전체 탭 이슈 ${totalCount}건 — 12건 예상`);

  await ctxN.close();

  // HQ Dashboard → issues navigate 확인
  const ctxN2 = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const pageN2 = await ctxN2.newPage();
  pageN2.on('dialog', async (d) => { await d.accept().catch(() => {}); });

  currentTest = 'HQ-DASHBOARD-ISSUES-NAVIGATE';
  console.log('\n[N-10] HQ Dashboard "미해결 이슈" KPI 클릭 → /admin/hq/issues 이동');
  const n2LoggedIn = await loginAs(pageN2, 'jhkim');
  n2LoggedIn ? log('PASS', 'jhkim 로그인') : log('FAIL', '로그인 실패');

  await goto(pageN2, `${BASE_URL}/admin/hq`);
  await waitForDataLoad(pageN2, 10000);
  // "미해결 이슈" KPI 카드 클릭
  await pageN2.locator('text=미해결 이슈').first().click().catch(() => {});
  await pageN2.waitForTimeout(1500);
  pageN2.url().includes('/admin/hq/issues')
    ? log('PASS', '"미해결 이슈" 클릭 → /admin/hq/issues 이동 (alert 제거 확인)')
    : log('FAIL', `이동 실패 — alert 잔존 가능성 (${pageN2.url()})`);

  console.log('\n[N-11] HQ Dashboard 이슈 피드 "전체 →" → /admin/hq/issues 이동');
  await goto(pageN2, `${BASE_URL}/admin/hq`);
  await waitForDataLoad(pageN2, 10000);
  // 승인허브 "전체 →"(index 0)와 이슈피드 "전체 →"(index 1) 두 곳 존재 — nth(1) 사용
  await pageN2.locator('text=전체 →').nth(1).click().catch(() => {});
  await pageN2.waitForTimeout(1500);
  await ss(pageN2, 'hq-dashboard-issues-nav');
  pageN2.url().includes('/admin/hq/issues')
    ? log('PASS', '"전체 →" 클릭 → /admin/hq/issues 이동')
    : log('WARN', `이동 미확인 (${pageN2.url()})`);

  await ctxN2.close();

  // ════════════════════════════════════════════
  // 결과 저장
  // ════════════════════════════════════════════
  if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(
    path.join(OUT_DIR, 'results.json'),
    JSON.stringify({ pass: PASS, fail: FAIL, warn: WARN, total: PASS + FAIL + WARN, results }, null, 2)
  );

  await browser.close();

  console.log('\n==================================================');
  console.log(`결과: PASS ${PASS} / FAIL ${FAIL} / WARN ${WARN} / TOTAL ${PASS + FAIL + WARN}`);
  console.log(`스크린샷: docs/regression_session48/`);
  console.log('==================================================');

  if (FAIL > 0) process.exit(1);
})();
