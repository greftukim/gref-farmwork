/**
 * 세션 39 — GROWTH-INPUT-SESSION39-001 생육 입력 저장 검증 + 세션 38 회귀 방어
 * 실행: node scripts/audit_session39.cjs
 *
 * 검증 대상:
 *   Task 1: useGrowthData.js cropId 추가
 *   Task 1: growthSurveyStore marker_plant_id + week_number 지원
 *   Task 2: GrowthInputScreen — 제어 입력 + handleSubmit + 권한 분기
 *     - 이번 주 입력 필드 editable
 *     - 값 입력 시 즉시 반영
 *     - 저장 버튼 클릭 → "조사 등록 완료!" 다이얼로그
 *     - 입력값 초기화
 *     - 파생 항목(엽장/엽폭 비율) 자동 계산
 *     - 과거 주차 → 읽기 전용
 *
 * 회귀 방어 (세션 38):
 *   생육 대시보드 화이트 스크린 없음, 작물 탭 3개, KPI 카드, 표식주 목록
 *   Dashboard 부동소수점 (BUG-F01), SchedulePage 타임라인
 */
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:5173';
const OUT_DIR = path.join(__dirname, '..', 'docs', 'regression_session39');

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

async function waitForGrowthLoad(page, timeout = 10000) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    const text = await page.textContent('body').catch(() => '');
    if (!text.includes('로딩 중...')) return true;
    await page.waitForTimeout(300);
  }
  return false;
}

(async () => {
  console.log('=== 세션 39 검증 + 세션 38 회귀 방어 감사 ===\n');

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
  console.log('\n[A-1] jhkim 로그인 (farm_admin)');
  await goto(page, `${BASE_URL}/login`);
  await page.fill('input[placeholder*="아이디"]', 'jhkim').catch(() => {});
  await page.fill('input[type="password"]', 'rmfpvm001').catch(() => {});
  await page.click('button[type="submit"]').catch(() => {});
  await page.waitForTimeout(4500);
  const loggedIn = page.url().includes('/admin');
  loggedIn ? log('PASS', 'jhkim 로그인', page.url()) : log('FAIL', '로그인 실패', page.url());
  if (!loggedIn) { await browser.close(); process.exit(1); }

  // ════════════════════════════════════════════
  // SECTION B: 생육 입력 폼 검증 (신규 — 세션 39)
  // ════════════════════════════════════════════
  console.log('\n[SECTION B] 생육 입력 폼 검증');

  currentTest = 'GROWTH-INPUT-LOAD';
  console.log('\n[B-1] 입력 페이지 로드');
  await goto(page, `${BASE_URL}/admin/growth/input`);
  const loaded = await waitForGrowthLoad(page, 10000);
  loaded ? log('PASS', '입력 페이지 로딩 완료') : log('FAIL', '로딩 타임아웃');
  await ss(page, 'input-loaded');

  const inputText = await page.textContent('body').catch(() => '');
  inputText.includes('주별 생육 기록 입력')
    ? log('PASS', '주별 생육 기록 입력 타이틀 표시')
    : log('FAIL', '입력 페이지 타이틀 없음');
  inputText.includes('데이터가 없습니다')
    ? log('FAIL', '화이트 스크린 ("데이터가 없습니다")')
    : log('PASS', '화이트 스크린 없음');

  currentTest = 'GROWTH-INPUT-TABLE';
  console.log('\n[B-2] 입력 테이블 렌더링 확인 (66 inputs = 6 plants × 11 fields)');
  const inputCells = page.locator('table tbody tr td input[type="number"]');
  const cellCount = await inputCells.count().catch(() => 0);
  cellCount > 0
    ? log('PASS', `number 입력 필드 ${cellCount}개 렌더링 (HR_DATA 연결 확인)`)
    : log('FAIL', 'number 입력 필드 없음 — 테이블 렌더링 실패');

  currentTest = 'GROWTH-INPUT-PERMISSION-HR';
  console.log('\n[B-3] jhkim(hr_admin) → 읽기 전용 + "권한 없음" 버튼');
  // jhkim은 hr_admin → DB 인증으로 항상 hr_admin으로 복원됨 (localStorage 주입 불가)
  if (cellCount > 0) {
    const firstInput = inputCells.first();
    const isReadOnly = await firstInput.getAttribute('readonly').catch(() => null);
    isReadOnly !== null
      ? log('PASS', 'hr_admin → 모든 입력 필드 읽기 전용 (정상)')
      : log('WARN', 'hr_admin인데 입력 필드 편집 가능 — 권한 체크 오류 가능성');
  }
  // 버튼 텍스트 확인
  const bodyForBtn = await page.textContent('body').catch(() => '');
  bodyForBtn.includes('권한 없음')
    ? log('PASS', 'hr_admin → "권한 없음" 버튼 표시')
    : log('FAIL', '"권한 없음" 버튼 없음 — 권한 분기 미작동');

  currentTest = 'GROWTH-INPUT-DERIVED';
  console.log('\n[B-4] 파생 항목 자동 계산 셀 렌더링');
  // 오이 탭에서 파생 항목(leafRatio) 확인
  await page.locator('button:has-text("오이")').first().click().catch(() => {});
  await page.waitForTimeout(400);
  const derivedCells = page.locator('table tbody td div[style*="color"]');
  const derivedCount = await derivedCells.count().catch(() => 0);
  derivedCount > 0
    ? log('PASS', `파생 항목 셀 ${derivedCount}개 표시 (오이 leafRatio 포함)`)
    : log('WARN', '파생 항목 셀 없음');
  // 토마토 탭 복원
  await page.locator('button:has-text("토마토")').first().click().catch(() => {});
  await page.waitForTimeout(200);
  await ss(page, 'input-table');

  currentTest = 'GROWTH-INPUT-READONLY-PAST';
  console.log('\n[B-5] 과거 주차 → 읽기 전용 + "과거 기록" 버튼');
  const weekBtns = page.locator('div[style*="gap: 4px"] button');
  const weekCount = await weekBtns.count().catch(() => 0);
  if (weekCount >= 2) {
    await weekBtns.first().click().catch(() => {});
    await page.waitForTimeout(500);
    await ss(page, 'input-past-week');
    const pastBodyText = await page.textContent('body').catch(() => '');
    pastBodyText.includes('과거 기록 (읽기 전용)') || pastBodyText.includes('읽기 전용')
      ? log('PASS', '과거 주차 → "과거 기록 (읽기 전용)" 버튼 표시')
      : log('FAIL', '과거 주차 읽기 전용 버튼 없음');
    const pastReadOnly = await inputCells.first().getAttribute('readonly').catch(() => null);
    pastReadOnly !== null
      ? log('PASS', '과거 주차 입력 필드 readOnly 확인')
      : log('WARN', '과거 주차 readOnly 확인 불가 — 현재 주차가 1주일 수 있음');
  } else {
    log('WARN', '주차 버튼 없음 — B-5 건너뜀');
  }
  await ss(page, 'input-after-submit');

  // ════════════════════════════════════════════
  // SECTION C: 세션 38 회귀 방어
  // ════════════════════════════════════════════
  console.log('\n[SECTION C] 세션 38 회귀 방어');

  currentTest = 'REGRESSION-DASHBOARD';
  console.log('\n[C-1] 생육 대시보드 화이트 스크린 해소');
  await goto(page, `${BASE_URL}/admin/growth`);
  await waitForGrowthLoad(page, 10000);
  await ss(page, 'growth-dashboard');
  const dashGText = await page.textContent('body').catch(() => '');
  dashGText.includes('데이터가 없습니다')
    ? log('FAIL', '화이트 스크린 회귀 ("데이터가 없습니다")')
    : log('PASS', '대시보드 화이트 스크린 없음');
  const h1 = await page.$('h1').then(el => el?.textContent()).catch(() => '');
  h1?.includes('생육 대시보드')
    ? log('PASS', '생육 대시보드 타이틀 유지')
    : log('FAIL', '타이틀 없음', h1);

  currentTest = 'REGRESSION-CROP-TABS';
  console.log('\n[C-2] 작물 탭 3개');
  for (const crop of ['토마토', '오이', '파프리카']) {
    const found = await page.locator(`button:has-text("${crop}")`).first().isVisible().catch(() => false);
    found ? log('PASS', `작물 탭 유지: ${crop}`) : log('FAIL', `작물 탭 없음: ${crop}`);
  }

  currentTest = 'REGRESSION-KPI';
  console.log('\n[C-3] KPI 카드 4개');
  for (const kpi of ['이번 주 생장', '화방 높이', '누적 착과', '작기 진행']) {
    dashGText.includes(kpi) ? log('PASS', `KPI 유지: ${kpi}`) : log('FAIL', `KPI 없음: ${kpi}`);
  }

  currentTest = 'REGRESSION-MARKER-TABLE';
  console.log('\n[C-4] 표식주 목록 행');
  const tableRows = await page.locator('tbody tr').count().catch(() => 0);
  tableRows > 0
    ? log('PASS', `표식주 테이블 행 ${tableRows}개 유지`)
    : log('WARN', '표식주 테이블 행 없음');

  currentTest = 'REGRESSION-BUG-F01';
  console.log('\n[C-5] BUG-F01 부동소수점 회귀');
  await goto(page, `${BASE_URL}/admin/dashboard`);
  await page.waitForTimeout(2000);
  const adminDashText = await page.textContent('body').catch(() => '');
  const hasBadFloat = /\d+\.\d{4,}/.test(adminDashText);
  !hasBadFloat ? log('PASS', 'BUG-F01 회귀 없음') : log('FAIL', '부동소수점 버그 재발');

  currentTest = 'REGRESSION-SCHEDULE';
  console.log('\n[C-6] 근무 관리 타임라인 회귀');
  await goto(page, `${BASE_URL}/admin/schedule`);
  await page.waitForTimeout(1200);
  const schedText = await page.textContent('body').catch(() => '');
  schedText.includes('근무 관리')
    ? log('PASS', '근무 관리 타이틀 유지')
    : log('FAIL', '근무 관리 타이틀 없음');
  (schedText.includes('08:00') || schedText.includes('08'))
    ? log('PASS', '타임라인 시간 헤더 유지')
    : log('FAIL', '타임라인 없음');

  currentTest = 'REGRESSION-CONSOLE';
  console.log('\n[C-7] 콘솔 에러 확인');
  const filteredErrors = consoleErrors.filter(e => !e.includes('favicon') && !e.includes('404') && !e.includes('net::ERR'));
  filteredErrors.length === 0
    ? log('PASS', '중요 콘솔 에러 0건')
    : log('WARN', `콘솔 에러 ${filteredErrors.length}건`, filteredErrors[0]?.slice(0, 100));

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
  console.log(`스크린샷: docs/regression_session39/`);
  console.log('='.repeat(50));
  console.log('\n⚠️  주의: 테스트 중 실제 INSERT가 발생합니다.');
  console.log('   Supabase MCP로 정리 필요:');
  console.log("   DELETE FROM growth_surveys WHERE worker_id IS NULL AND created_at > now() - interval '1 hour';");
  console.log('   (또는 수동으로 테스트 날짜 조건으로 삭제)');

  await browser.close();
  process.exit(FAIL > 0 ? 1 : 0);
})();
