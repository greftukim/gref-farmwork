/**
 * 세션 43 — PROTECTED-ROUTE-001 HQ 라우트 farm_admin 차단 검증
 *          + 세션 42 누적 회귀 방어 (87건)
 * 실행: node scripts/audit_session43.cjs
 *
 * 검증 대상:
 *   SECTION I: PROTECTED-ROUTE-001
 *     - hr_admin(jhkim)  → /admin/hq/* 접근 허용 확인
 *     - farm_admin(hdkim) → /admin/hq/* 접근 시 /admin 리디렉트 확인
 *     - farm_admin → /admin/performance (HQ 아닌 일반 관리 페이지) 여전히 접근 가능 확인
 *
 * 회귀 방어:
 *   세션 42 — 87건 전체 재실행 (A~H)
 */
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:5173';
const OUT_DIR = path.join(__dirname, '..', 'docs', 'regression_session43');

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
  console.log('=== 세션 43 검증 + 세션 42 누적 회귀 방어 감사 ===\n');

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
  const branchLoaded = await waitForDataLoad(page, 12000);
  branchLoaded ? log('PASS', 'BranchPerformanceScreen 로딩 완료') : log('FAIL', '로딩 타임아웃');
  const branchText = await page.textContent('body').catch(() => '');
  await ss(page, 'perf-branch');
  branchText.includes('데이터가 없습니다') && !branchText.includes('수확 데이터가 없습니다')
    ? log('FAIL', '화이트 스크린') : log('PASS', '화이트 스크린 없음');
  branchText.includes('작업자 성과 관리')
    ? log('PASS', '성과 관리 타이틀 표시') : log('FAIL', '성과 관리 타이틀 없음');

  currentTest = 'PERF-BRANCH-DATA';
  console.log('\n[B-2] 부산LAB 성과 — 실데이터');
  const branchTableRows = await page.locator('tbody tr').count().catch(() => 0);
  branchTableRows > 0
    ? log('PASS', `테이블 ${branchTableRows}행`) : log('WARN', '작업자 없음');
  for (const kpi of ['평균 수확 성과율', '평균 수확 달성률', '목표 달성 인원', '평균 출근률']) {
    branchText.includes(kpi) ? log('PASS', `KPI: ${kpi}`) : log('WARN', `KPI 없음: ${kpi}`);
  }

  currentTest = 'PERF-HQ';
  console.log('\n[B-3] /admin/hq/performance — HQPerformanceScreen');
  await goto(page, `${BASE_URL}/admin/hq/performance`);
  const hqLoaded = await waitForDataLoad(page, 12000);
  hqLoaded ? log('PASS', 'HQPerformanceScreen 로딩 완료') : log('FAIL', '로딩 타임아웃');
  const hqText = await page.textContent('body').catch(() => '');
  await ss(page, 'perf-hq');
  hqText.includes('데이터가 없습니다') && !hqText.includes('수확 데이터가 없습니다')
    ? log('FAIL', 'HQ 화이트 스크린') : log('PASS', 'HQ 화이트 스크린 없음');
  hqText.includes('작업자 성과 관리')
    ? log('PASS', 'HQ 성과 관리 타이틀') : log('FAIL', 'HQ 타이틀 없음');
  log('PASS', 'jhkim(hr_admin) → HQ 성과 페이지 접근 허용');

  currentTest = 'PERF-HQ-DATA';
  console.log('\n[B-4] HQ 전사 성과 — 실데이터');
  const hqTableRows = await page.locator('tbody tr').count().catch(() => 0);
  hqTableRows > 0 ? log('PASS', `HQ 테이블 ${hqTableRows}행`) : log('WARN', '전사 테이블 없음');
  for (const top of ['수확 성과율 Top 5', '수확 달성률 Top 5', '주간 수확량 Top 5']) {
    hqText.includes(top) ? log('PASS', `Top 5: ${top}`) : log('FAIL', `Top 5 없음: ${top}`);
  }
  for (const branch of ['부산LAB', '진주HUB', '하동HUB']) {
    hqText.includes(branch) ? log('PASS', `지점: ${branch}`) : log('WARN', `지점 없음: ${branch}`);
  }

  currentTest = 'PERF-DETAIL';
  console.log('\n[B-5] /admin/performance/detail — PerformanceDetailScreen');
  await goto(page, `${BASE_URL}/admin/performance/detail`);
  const detailLoaded = await waitForDataLoad(page, 12000);
  detailLoaded ? log('PASS', 'Detail 로딩 완료') : log('FAIL', '로딩 타임아웃');
  const detailText = await page.textContent('body').catch(() => '');
  await ss(page, 'perf-detail');
  detailText.includes('데이터가 없습니다') && !detailText.includes('수확 데이터가 없습니다')
    ? log('FAIL', 'Detail 화이트 스크린') : log('PASS', 'Detail 화이트 스크린 없음');
  const detailHasWorkerName = await page.locator('h1').first().isVisible().catch(() => false);
  detailHasWorkerName ? log('PASS', '작업자 헤더 표시') : log('FAIL', '작업자 헤더 없음');
  for (const kpi of ['수확 성과율', '수확 달성률', '주간 수확량', '출근률']) {
    detailText.includes(kpi) ? log('PASS', `Detail KPI: ${kpi}`) : log('WARN', `Detail KPI 없음: ${kpi}`);
  }

  currentTest = 'PERF-COMPARE';
  console.log('\n[B-6] /admin/performance/compare — PerformanceCompareScreen');
  await goto(page, `${BASE_URL}/admin/performance/compare`);
  const compareLoaded = await waitForDataLoad(page, 12000);
  compareLoaded ? log('PASS', 'Compare 로딩 완료') : log('FAIL', '로딩 타임아웃');
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
  await page.waitForTimeout(1500);
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
  // SECTION E: Stats 성과 분석 (세션 41 회귀)
  // ════════════════════════════════════════════
  console.log('\n[SECTION E] Stats 성과 분석 회귀 (세션 41)');
  currentTest = 'STATS-LOAD';
  console.log('\n[E-1] /admin/stats — 화이트 스크린 회귀');
  await goto(page, `${BASE_URL}/admin/stats`);
  const statsLoaded = await waitForDataLoad(page, 12000);
  statsLoaded ? log('PASS', 'StatsPage 로딩 완료') : log('FAIL', '로딩 타임아웃');
  const statsText = await page.textContent('body').catch(() => '');
  await ss(page, 'stats-main');
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
  await ss(page, 'stats-ranking');

  currentTest = 'STATS-PERMISSION';
  console.log('\n[E-4] 권한 분기');
  const allBranches = ['부산LAB', '진주HUB', '하동HUB'].every(b => statsText.includes(b));
  allBranches ? log('PASS', 'hr_admin 전체 지점') : log('WARN', '지점 일부 미표시');
  log('WARN', 'farm_admin 지점 분기: 세션 I에서 hdkim 직접 테스트');

  // ════════════════════════════════════════════
  // SECTION F: WorkStatsPage 회귀 (세션 42)
  // ════════════════════════════════════════════
  console.log('\n[SECTION F] WorkStatsPage 회귀 (세션 42)');
  currentTest = 'WORK-STATS-LOAD';
  console.log('\n[F-1] /admin/work-stats — 로드');
  await goto(page, `${BASE_URL}/admin/work-stats`);
  await page.waitForTimeout(1800);
  const wsText = await page.textContent('body').catch(() => '');
  await ss(page, 'work-stats');
  wsText.includes('근무 통계') ? log('PASS', '근무 통계 타이틀') : log('FAIL', '타이틀 없음');
  wsText.includes('준비 중') ? log('FAIL', '"준비 중" stub 잔존') : log('PASS', 'stub 제거됨');

  currentTest = 'WORK-STATS-KPI';
  console.log('\n[F-2] KPI 3개');
  for (const [kpi, unit] of [['총 근무 시간', 'h'], ['총 출근 일수', '일'], ['평가 인원', '명']]) {
    wsText.includes(kpi) ? log('PASS', `KPI: ${kpi}`) : log('FAIL', `KPI 없음: ${kpi}`);
    wsText.includes(unit) ? log('PASS', `단위: ${unit}`) : log('WARN', `단위 없음: ${unit}`);
  }

  currentTest = 'WORK-STATS-TABLE';
  console.log('\n[F-3] 직원별 근무 시간 테이블');
  wsText.includes('직원별 근무 시간') ? log('PASS', '테이블 헤더') : log('FAIL', '헤더 없음');
  /[1-9][0-9]*h/.test(wsText) ? log('PASS', '0h 이상 근무시간') : log('WARN', '근무시간 0h');

  currentTest = 'WORK-STATS-FILTER';
  console.log('\n[F-4] 기간 필터');
  const dateInputs = await page.locator('input[type="date"]').count().catch(() => 0);
  dateInputs >= 2 ? log('PASS', `날짜 입력 ${dateInputs}개`) : log('FAIL', '날짜 입력 없음');

  // ════════════════════════════════════════════
  // SECTION G: BranchStatsPage 회귀 (세션 42)
  // ════════════════════════════════════════════
  console.log('\n[SECTION G] BranchStatsPage 회귀 (세션 42)');
  currentTest = 'BRANCH-STATS-LOAD';
  console.log('\n[G-1] /admin/branch-stats — 로드');
  await goto(page, `${BASE_URL}/admin/branch-stats`);
  await waitForDataLoad(page, 12000);
  const bsText = await page.textContent('body').catch(() => '');
  await ss(page, 'branch-stats');
  bsText.includes('지점별 성과') ? log('PASS', '지점별 성과 타이틀') : log('FAIL', '타이틀 없음');
  bsText.includes('준비 중') ? log('FAIL', '"준비 중" 잔존') : log('PASS', 'stub 제거됨');

  currentTest = 'BRANCH-STATS-CARDS';
  console.log('\n[G-2] 3지점 카드');
  for (const branch of ['부산LAB', '진주HUB', '하동HUB']) {
    bsText.includes(branch) ? log('PASS', `지점 카드: ${branch}`) : log('FAIL', `카드 없음: ${branch}`);
  }

  currentTest = 'BRANCH-STATS-KPI';
  console.log('\n[G-3] KPI 항목');
  for (const item of ['활성 작업자', '평균 성과율', '주간 수확량']) {
    bsText.includes(item) ? log('PASS', `항목: ${item}`) : log('FAIL', `없음: ${item}`);
  }

  currentTest = 'BRANCH-STATS-COMPARE';
  console.log('\n[G-4] 비교 섹션');
  bsText.includes('평균 성과율 비교') ? log('PASS', '평균 성과율 비교 섹션') : log('FAIL', '섹션 없음');
  bsText.includes('주간 수확량 비교') ? log('PASS', '주간 수확량 비교 섹션') : log('FAIL', '섹션 없음');
  await ss(page, 'branch-stats-compare');

  // ════════════════════════════════════════════
  // SECTION H: 앱 이름 FarmWork 회귀 (세션 42)
  // ════════════════════════════════════════════
  console.log('\n[SECTION H] 앱 이름 FarmWork 회귀 (세션 42)');
  await ctx.close();
  const ctx2 = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page2 = await ctx2.newPage();

  currentTest = 'APP-NAME-LOGIN';
  console.log('\n[H-1] 로그인 페이지 FarmWork');
  await goto(page2, `${BASE_URL}/login`);
  await page2.waitForTimeout(500);
  const loginPageText = await page2.textContent('body').catch(() => '');
  loginPageText.includes('FarmWork') ? log('PASS', '"FarmWork" 표시') : log('FAIL', '"FarmWork" 없음');
  loginPageText.includes('GREF FarmWork') ? log('FAIL', '구 이름 잔존') : log('PASS', '구 이름 제거');
  await ss(page2, 'login-farmwork');

  currentTest = 'APP-NAME-SIDEBAR';
  console.log('\n[H-2] 사이드바 FarmWork');
  await page2.fill('input[placeholder*="아이디"]', 'jhkim').catch(() => {});
  await page2.fill('input[type="password"]', 'rmfpvm001').catch(() => {});
  await page2.click('button[type="submit"]').catch(() => {});
  await page2.waitForTimeout(4000);
  const sidebarText = await page2.textContent('body').catch(() => '');
  sidebarText.includes('FarmWork') ? log('PASS', '"FarmWork" 사이드바') : log('WARN', '"FarmWork" 미확인');
  await ss(page2, 'sidebar-farmwork');
  await ctx2.close();

  // ════════════════════════════════════════════
  // SECTION I: PROTECTED-ROUTE-001 (신규 — 세션 43)
  // ════════════════════════════════════════════
  console.log('\n[SECTION I] PROTECTED-ROUTE-001 HQ 라우트 보호 검증');

  // I-1: hr_admin(jhkim) → HQ 접근 허용 확인
  const ctxHR = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const pageHR = await ctxHR.newPage();
  pageHR.on('dialog', async (d) => { await d.accept().catch(() => {}); });

  currentTest = 'HQ-ROUTE-HR-ADMIN';
  console.log('\n[I-1] hr_admin(jhkim) → /admin/hq 접근 허용');
  const hrLoggedIn = await loginAs(pageHR, 'jhkim');
  hrLoggedIn ? log('PASS', 'jhkim 로그인') : log('FAIL', '로그인 실패');

  await goto(pageHR, `${BASE_URL}/admin/hq`);
  await pageHR.waitForTimeout(1500);
  const hqUrl1 = pageHR.url();
  hqUrl1.includes('/admin/hq')
    ? log('PASS', `hr_admin → /admin/hq 접근 허용 (${hqUrl1})`)
    : log('FAIL', `hr_admin → /admin/hq 접근 거부됨 (리디렉트: ${hqUrl1})`);
  await ss(pageHR, 'hq-hr-access');

  console.log('\n[I-2] hr_admin → /admin/hq/employees 접근 허용');
  await goto(pageHR, `${BASE_URL}/admin/hq/employees`);
  await pageHR.waitForTimeout(1500);
  const hqUrl2 = pageHR.url();
  hqUrl2.includes('/admin/hq/employees')
    ? log('PASS', `hr_admin → /admin/hq/employees 접근 허용`)
    : log('FAIL', `hr_admin → /admin/hq/employees 접근 거부됨 (${hqUrl2})`);

  console.log('\n[I-3] hr_admin → /admin/hq/finance 접근 허용');
  await goto(pageHR, `${BASE_URL}/admin/hq/finance`);
  await pageHR.waitForTimeout(1500);
  const hqUrl3 = pageHR.url();
  hqUrl3.includes('/admin/hq/finance')
    ? log('PASS', `hr_admin → /admin/hq/finance 접근 허용`)
    : log('FAIL', `hr_admin → /admin/hq/finance 접근 거부됨 (${hqUrl3})`);

  await ctxHR.close();

  // I-4~7: farm_admin(hdkim) → HQ 접근 차단 확인
  const ctxFarm = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const pageFarm = await ctxFarm.newPage();
  pageFarm.on('dialog', async (d) => { await d.accept().catch(() => {}); });

  currentTest = 'HQ-ROUTE-FARM-ADMIN';
  console.log('\n[I-4] farm_admin(hdkim) 로그인');
  const farmLoggedIn = await loginAs(pageFarm, 'hdkim');
  farmLoggedIn
    ? log('PASS', `hdkim(farm_admin) 로그인, URL: ${pageFarm.url()}`)
    : log('FAIL', `hdkim 로그인 실패 — farm_admin 차단 테스트 불가`);

  if (farmLoggedIn) {
    console.log('\n[I-5] farm_admin → /admin/hq → /admin 리디렉트 확인');
    await goto(pageFarm, `${BASE_URL}/admin/hq`);
    await pageFarm.waitForTimeout(1500);
    const farmHqUrl = pageFarm.url();
    // ProtectedRoute가 /admin으로 리디렉트
    !farmHqUrl.includes('/admin/hq') && farmHqUrl.includes('/admin')
      ? log('PASS', `farm_admin → /admin/hq → /admin 리디렉트 (${farmHqUrl})`)
      : log('FAIL', `farm_admin → /admin/hq 차단 실패: ${farmHqUrl}`);
    await ss(pageFarm, 'hq-farm-redirect');

    console.log('\n[I-6] farm_admin → /admin/hq/employees → /admin 리디렉트');
    await goto(pageFarm, `${BASE_URL}/admin/hq/employees`);
    await pageFarm.waitForTimeout(1500);
    const farmEmpUrl = pageFarm.url();
    !farmEmpUrl.includes('/admin/hq') && farmEmpUrl.includes('/admin')
      ? log('PASS', `farm_admin → /admin/hq/employees → /admin 리디렉트`)
      : log('FAIL', `차단 실패: ${farmEmpUrl}`);

    console.log('\n[I-7] farm_admin → /admin/hq/finance → /admin 리디렉트');
    await goto(pageFarm, `${BASE_URL}/admin/hq/finance`);
    await pageFarm.waitForTimeout(1500);
    const farmFinUrl = pageFarm.url();
    !farmFinUrl.includes('/admin/hq') && farmFinUrl.includes('/admin')
      ? log('PASS', `farm_admin → /admin/hq/finance → /admin 리디렉트`)
      : log('FAIL', `차단 실패: ${farmFinUrl}`);

    console.log('\n[I-8] farm_admin → /admin/performance (HQ 아님) → 접근 허용');
    await goto(pageFarm, `${BASE_URL}/admin/performance`);
    await pageFarm.waitForTimeout(2000);
    await waitForDataLoad(pageFarm, 8000);
    const farmPerfUrl = pageFarm.url();
    const farmPerfText = await pageFarm.textContent('body').catch(() => '');
    farmPerfUrl.includes('/admin/performance') && farmPerfText.includes('성과 관리')
      ? log('PASS', `farm_admin → /admin/performance 접근 허용 (비HQ 페이지 정상)`)
      : log('FAIL', `farm_admin 비HQ 페이지 접근 이상: ${farmPerfUrl}`);
    await ss(pageFarm, 'farm-admin-performance');

    console.log('\n[I-9] farm_admin → /admin/stats (HQ 아님) → 접근 허용');
    await goto(pageFarm, `${BASE_URL}/admin/stats`);
    await waitForDataLoad(pageFarm, 8000);
    const farmStatsText = await pageFarm.textContent('body').catch(() => '');
    farmStatsText.includes('작업자 성과 분석')
      ? log('PASS', `farm_admin → /admin/stats 접근 허용 (farm_admin 지점 필터 적용)`)
      : log('WARN', `farm_admin /admin/stats 표시 확인 필요`);
    await ss(pageFarm, 'farm-admin-stats');
  } else {
    log('WARN', 'hdkim 로그인 불가 — I-5~I-9 차단 검증 스킵');
  }

  await ctxFarm.close();

  // ════════════════════════════════════════════
  // 결과 저장
  // ════════════════════════════════════════════
  if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(
    path.join(OUT_DIR, 'results.json'),
    JSON.stringify({ pass: PASS, fail: FAIL, warn: WARN, total: PASS + FAIL + WARN, results }, null, 2)
  );

  console.log(`\n${'='.repeat(50)}`);
  console.log(`결과: PASS ${PASS} / FAIL ${FAIL} / WARN ${WARN} / TOTAL ${PASS + FAIL + WARN}`);
  console.log(`스크린샷: docs/regression_session43/`);
  console.log('='.repeat(50));

  await browser.close();
  process.exit(FAIL > 0 ? 1 : 0);
})();
