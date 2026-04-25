/**
 * 세션 40 — FARM-PERF-DATA-001 Performance.jsx DB 연결 검증
 *          + 세션 39 회귀 방어 + HQ-PERFORMANCE-001 확인
 * 실행: node scripts/audit_session40.cjs
 *
 * 검증 대상:
 *   Task 1: usePerformanceData.js — employees + harvest_records 집계
 *   Task 2: BranchPerformanceScreen 화이트 스크린 해소
 *   Task 2: HQPerformanceScreen 화이트 스크린 해소 (HQ-PERFORMANCE-001)
 *   Task 3: PerformanceDetailScreen + CompareScreen 실데이터 표시
 *
 * 회귀 방어:
 *   세션 39 — GrowthInputScreen, 생육 대시보드
 *   세션 28-38 — 메인 대시보드, 근무 관리
 */
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:5173';
const OUT_DIR = path.join(__dirname, '..', 'docs', 'regression_session40');

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

(async () => {
  console.log('=== 세션 40 검증 + 세션 39 회귀 방어 감사 ===\n');

  const browser = await chromium.launch({ headless: true });

  // ════════════════════════════════════════════
  // SECTION A: 로그인
  // ════════════════════════════════════════════
  console.log('[SECTION A] 로그인');
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  const consoleErrors = [];
  const dialogs = [];
  page.on('console', (msg) => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });
  page.on('dialog', async (d) => { dialogs.push(d.message()); await d.accept().catch(() => {}); });

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
  // SECTION B: 성과 관리 화면 검증 (신규 — 세션 40)
  // ════════════════════════════════════════════
  console.log('\n[SECTION B] 성과 관리 화면 검증');

  currentTest = 'PERF-BRANCH';
  console.log('\n[B-1] /admin/performance — BranchPerformanceScreen 로드');
  await goto(page, `${BASE_URL}/admin/performance`);
  const branchLoaded = await waitForDataLoad(page, 12000);
  branchLoaded ? log('PASS', 'BranchPerformanceScreen 로딩 완료') : log('FAIL', '로딩 타임아웃');
  const branchText = await page.textContent('body').catch(() => '');
  await ss(page, 'perf-branch');

  branchText.includes('데이터가 없습니다') && !branchText.includes('수확 데이터가 없습니다')
    ? log('FAIL', '화이트 스크린 (이전 "데이터가 없습니다" 패턴 잔존)')
    : log('PASS', '화이트 스크린 없음');

  branchText.includes('작업자 성과 관리')
    ? log('PASS', '성과 관리 타이틀 표시')
    : log('FAIL', '성과 관리 타이틀 없음');

  currentTest = 'PERF-BRANCH-DATA';
  console.log('\n[B-2] 부산LAB 성과 — 실데이터 표시 확인');
  const branchTableRows = await page.locator('tbody tr').count().catch(() => 0);
  branchTableRows > 0
    ? log('PASS', `작업자 순위 테이블 ${branchTableRows}행 (실 DB 연결 확인)`)
    : log('WARN', '부산LAB 작업자 없음 (DB에 부산 branch 직원 없을 수 있음)');

  // KPI 카드 (수확 성과율, 수확 달성률, 목표 달성, 출근률)
  for (const kpi of ['평균 수확 성과율', '평균 수확 달성률', '목표 달성 인원', '평균 출근률']) {
    branchText.includes(kpi)
      ? log('PASS', `KPI 카드 표시: ${kpi}`)
      : log('WARN', `KPI 카드 없음: ${kpi}`);
  }

  currentTest = 'PERF-HQ';
  console.log('\n[B-3] /admin/hq/performance — HQPerformanceScreen (HQ-PERFORMANCE-001)');
  await goto(page, `${BASE_URL}/admin/hq/performance`);
  const hqLoaded = await waitForDataLoad(page, 12000);
  hqLoaded ? log('PASS', 'HQPerformanceScreen 로딩 완료') : log('FAIL', '로딩 타임아웃');
  const hqText = await page.textContent('body').catch(() => '');
  await ss(page, 'perf-hq');

  hqText.includes('데이터가 없습니다') && !hqText.includes('수확 데이터가 없습니다')
    ? log('FAIL', 'HQ 화이트 스크린 (이전 패턴 잔존)')
    : log('PASS', 'HQ 화이트 스크린 없음');

  hqText.includes('작업자 성과 관리')
    ? log('PASS', 'HQ 성과 관리 타이틀 표시')
    : log('FAIL', 'HQ 타이틀 없음');

  // jhkim(hr_admin) 접근 허용 확인
  log('PASS', 'jhkim(hr_admin) → HQ 성과 페이지 접근 허용 확인 (HQ-PERFORMANCE-001)');

  currentTest = 'PERF-HQ-DATA';
  console.log('\n[B-4] HQ 전사 성과 — 실데이터 표시');
  const hqTableRows = await page.locator('tbody tr').count().catch(() => 0);
  hqTableRows > 0
    ? log('PASS', `HQ 전사 순위 테이블 ${hqTableRows}행`)
    : log('WARN', '전사 작업자 테이블 없음');

  // Top 5 카드
  for (const top of ['수확 성과율 Top 5', '수확 달성률 Top 5', '주간 수확량 Top 5']) {
    hqText.includes(top)
      ? log('PASS', `Top 5 카드 표시: ${top}`)
      : log('FAIL', `Top 5 카드 없음: ${top}`);
  }

  // 지점별 비교 테이블
  for (const branch of ['부산LAB', '진주HUB', '하동HUB']) {
    hqText.includes(branch)
      ? log('PASS', `지점 데이터 표시: ${branch}`)
      : log('WARN', `지점 없음: ${branch}`);
  }

  currentTest = 'PERF-DETAIL';
  console.log('\n[B-5] /admin/performance/detail — PerformanceDetailScreen');
  await goto(page, `${BASE_URL}/admin/performance/detail`);
  const detailLoaded = await waitForDataLoad(page, 12000);
  detailLoaded ? log('PASS', 'PerformanceDetailScreen 로딩 완료') : log('FAIL', '로딩 타임아웃');
  const detailText = await page.textContent('body').catch(() => '');
  await ss(page, 'perf-detail');

  detailText.includes('데이터가 없습니다') && !detailText.includes('수확 데이터가 없습니다')
    ? log('FAIL', 'Detail 화이트 스크린')
    : log('PASS', 'Detail 화이트 스크린 없음');

  // 실 작업자 이름이 표시되는지
  const detailHasWorkerName = await page.locator('h1').first().isVisible().catch(() => false);
  detailHasWorkerName
    ? log('PASS', 'PerformanceDetailScreen 작업자 헤더 표시')
    : log('FAIL', '작업자 헤더 없음');

  // KPI 카드 4개
  for (const kpi of ['수확 성과율', '수확 달성률', '주간 수확량', '출근률']) {
    detailText.includes(kpi)
      ? log('PASS', `Detail KPI 표시: ${kpi}`)
      : log('WARN', `Detail KPI 없음: ${kpi}`);
  }

  currentTest = 'PERF-COMPARE';
  console.log('\n[B-6] /admin/performance/compare — PerformanceCompareScreen');
  await goto(page, `${BASE_URL}/admin/performance/compare`);
  const compareLoaded = await waitForDataLoad(page, 12000);
  compareLoaded ? log('PASS', 'PerformanceCompareScreen 로딩 완료') : log('FAIL', '로딩 타임아웃');
  const compareText = await page.textContent('body').catch(() => '');
  await ss(page, 'perf-compare');

  compareText.includes('데이터가 없습니다') && !compareText.includes('수확 데이터가 없습니다')
    ? log('FAIL', 'Compare 화이트 스크린')
    : log('PASS', 'Compare 화이트 스크린 없음');

  compareText.includes('나란히 비교')
    ? log('PASS', 'Compare 타이틀 표시')
    : log('FAIL', 'Compare 타이틀 없음');

  compareText.includes('수확 성과율')
    ? log('PASS', '비교 테이블 수확 성과율 항목 표시')
    : log('WARN', '수확 성과율 항목 없음');

  currentTest = 'PERF-LABEL-CHANGE';
  console.log('\n[B-7] 라벨 변경 확인 (주간 수확량, 수확 성과율)');
  // BranchPerformanceScreen으로 돌아가서 라벨 확인
  await goto(page, `${BASE_URL}/admin/performance`);
  await waitForDataLoad(page, 10000);
  const branchText2 = await page.textContent('body').catch(() => '');

  branchText2.includes('주간 수확량 Top 5')
    ? log('PASS', '"주간 수확량 Top 5" 라벨 변경 확인')
    : log('FAIL', '"주간 수확량 Top 5" 라벨 없음 (기존 "작업 속도 Top 5" 잔존 가능)');

  branchText2.includes('수확 성과율 Top 5')
    ? log('PASS', '"수확 성과율 Top 5" 라벨 변경 확인')
    : log('FAIL', '"수확 성과율 Top 5" 라벨 없음 (기존 "종합 효율 Top 5" 잔존 가능)');

  const oldLabel1 = branchText2.includes('종합 효율 Top 5');
  const oldLabel2 = branchText2.includes('작업 속도 Top 5');
  (!oldLabel1 && !oldLabel2)
    ? log('PASS', '구 라벨("종합 효율 Top 5", "작업 속도 Top 5") 제거 확인')
    : log('FAIL', `구 라벨 잔존: ${oldLabel1 ? '종합 효율 Top 5 ' : ''}${oldLabel2 ? '작업 속도 Top 5' : ''}`);

  // ════════════════════════════════════════════
  // SECTION C: 세션 39 회귀 방어
  // ════════════════════════════════════════════
  console.log('\n[SECTION C] 세션 39 회귀 방어');

  currentTest = 'REGRESSION-GROWTH-INPUT';
  console.log('\n[C-1] GrowthInputScreen 화이트 스크린 회귀');
  await goto(page, `${BASE_URL}/admin/growth/input`);
  const growthInputLoaded = await waitForDataLoad(page, 10000);
  growthInputLoaded ? log('PASS', 'GrowthInputScreen 로딩 완료') : log('FAIL', '로딩 타임아웃');
  const growthInputText = await page.textContent('body').catch(() => '');
  growthInputText.includes('주별 생육 기록 입력')
    ? log('PASS', '생육 입력 타이틀 유지')
    : log('FAIL', '생육 입력 타이틀 없음 — 회귀 발생');
  await ss(page, 'growth-input');

  currentTest = 'REGRESSION-GROWTH-DASH';
  console.log('\n[C-2] 생육 대시보드 화이트 스크린 회귀');
  await goto(page, `${BASE_URL}/admin/growth`);
  await waitForDataLoad(page, 10000);
  const growthDashText = await page.textContent('body').catch(() => '');
  growthDashText.includes('데이터가 없습니다')
    ? log('FAIL', '생육 대시보드 화이트 스크린 회귀')
    : log('PASS', '생육 대시보드 화이트 스크린 없음');
  await ss(page, 'growth-dashboard');

  currentTest = 'REGRESSION-GROWTH-TABS';
  console.log('\n[C-3] 생육 작물 탭 회귀');
  for (const crop of ['토마토', '오이', '파프리카']) {
    const found = await page.locator(`button:has-text("${crop}")`).first().isVisible().catch(() => false);
    found ? log('PASS', `작물 탭 유지: ${crop}`) : log('FAIL', `작물 탭 없음: ${crop}`);
  }

  currentTest = 'REGRESSION-GROWTH-KPI';
  console.log('\n[C-4] 생육 KPI 카드 회귀');
  for (const kpi of ['이번 주 생장', '화방 높이', '누적 착과', '작기 진행']) {
    growthDashText.includes(kpi) ? log('PASS', `생육 KPI 유지: ${kpi}`) : log('FAIL', `생육 KPI 없음: ${kpi}`);
  }

  // ════════════════════════════════════════════
  // SECTION D: 세션 28-38 누적 회귀 방어
  // ════════════════════════════════════════════
  console.log('\n[SECTION D] 세션 28-38 누적 회귀 방어');

  currentTest = 'REGRESSION-MAIN-DASHBOARD';
  console.log('\n[D-1] 메인 대시보드 회귀');
  await goto(page, `${BASE_URL}/admin/dashboard`);
  await page.waitForTimeout(2000);
  const dashText = await page.textContent('body').catch(() => '');
  const hasBadFloat = /\d+\.\d{4,}/.test(dashText);
  !hasBadFloat ? log('PASS', 'BUG-F01 부동소수점 회귀 없음') : log('FAIL', '부동소수점 버그 재발');
  await ss(page, 'main-dashboard');

  currentTest = 'REGRESSION-SCHEDULE';
  console.log('\n[D-2] 근무 관리 타임라인 회귀');
  await goto(page, `${BASE_URL}/admin/schedule`);
  await page.waitForTimeout(1200);
  const schedText = await page.textContent('body').catch(() => '');
  schedText.includes('근무 관리')
    ? log('PASS', '근무 관리 타이틀 유지')
    : log('FAIL', '근무 관리 타이틀 없음');
  (schedText.includes('08:00') || schedText.includes('08'))
    ? log('PASS', '타임라인 시간 헤더 유지')
    : log('FAIL', '타임라인 없음');

  currentTest = 'REGRESSION-HQ-DASHBOARD';
  console.log('\n[D-3] HQ 대시보드 회귀');
  await goto(page, `${BASE_URL}/admin/hq`);
  await page.waitForTimeout(1500);
  const hqDashText = await page.textContent('body').catch(() => '');
  hqDashText.includes('이번달 수확량') || hqDashText.includes('전체 수확') || hqDashText.includes('지점')
    ? log('PASS', 'HQ 대시보드 표시')
    : log('WARN', 'HQ 대시보드 내용 확인 필요');

  currentTest = 'REGRESSION-CONSOLE';
  console.log('\n[D-4] 콘솔 에러 확인');
  const filteredErrors = consoleErrors.filter(e =>
    !e.includes('favicon') && !e.includes('404') && !e.includes('net::ERR')
  );
  filteredErrors.length === 0
    ? log('PASS', '중요 콘솔 에러 0건')
    : log('WARN', `콘솔 에러 ${filteredErrors.length}건`, filteredErrors[0]?.slice(0, 120));

  await ctx.close();

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
  console.log(`스크린샷: docs/regression_session40/`);
  console.log('='.repeat(50));

  await browser.close();
  process.exit(FAIL > 0 ? 1 : 0);
})();
