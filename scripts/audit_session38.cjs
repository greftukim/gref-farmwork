/**
 * 세션 38 — GROWTH-SURVEYS-001 생육 DB 연결 검증 + 세션 37 회귀 방어
 * 실행: node scripts/audit_session38.cjs
 *
 * 검증 대상:
 *   Task 3+4: useGrowthData 훅 → grData.crops 실데이터 채우기 (화이트 스크린 해소)
 *   Task 5: 샘플 설정 UI (branch_crop_sample_config 읽기/쓰기)
 *   - 생육 대시보드 타이틀 표시
 *   - 작물 탭 3개 (토마토/오이/파프리카)
 *   - KPI 카드 표시
 *   - 추이 차트 표시
 *   - 표식주 목록 행 표시
 *   - 표식주 관리 → 샘플 설정 테이블
 *
 * 회귀 방어 (세션 37):
 *   BUG-F01: 부동소수점 / BUG-F02: 작물 탭
 *   Dashboard 차트 3지점 / HQ 사이드바 / HQ 콘솔 에러 0건
 */
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:5173';
const OUT_DIR = path.join(__dirname, '..', 'docs', 'regression_session38');

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
  console.log('=== 세션 38 검증 + 세션 37 회귀 방어 감사 ===\n');

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
  page.on('dialog', async (d) => { dialogs.push(d.message()); await d.dismiss().catch(() => {}); });

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
  // SECTION B: 생육 대시보드 (화이트 스크린 해소 검증)
  // ════════════════════════════════════════════
  console.log('\n[SECTION B] 생육 대시보드 검증');

  currentTest = 'GROWTH-DASHBOARD';
  console.log('\n[B-1] 생육 대시보드 로드 (화이트 스크린 해소)');
  await goto(page, `${BASE_URL}/admin/growth`);
  const loaded = await waitForGrowthLoad(page, 10000);
  loaded ? log('PASS', '로딩 완료 (spinner 종료)') : log('FAIL', '로딩 타임아웃');
  await ss(page, 'growth-dashboard');

  const bodyText = await page.textContent('body').catch(() => '');
  bodyText.includes('데이터가 없습니다')
    ? log('FAIL', '화이트 스크린: "데이터가 없습니다" 표시됨')
    : log('PASS', '화이트 스크린 없음');

  const hasTitle = await page.$('h1').then(el => el?.textContent()).catch(() => '');
  hasTitle?.includes('생육 대시보드')
    ? log('PASS', '생육 대시보드 타이틀 표시')
    : log('FAIL', '타이틀 없음', hasTitle);

  console.log('\n[B-2] 작물 탭 3개 (토마토/오이/파프리카)');
  currentTest = 'CROP-TABS';
  for (const crop of ['토마토', '오이', '파프리카']) {
    const found = await page.locator(`button:has-text("${crop}")`).first().isVisible().catch(() => false);
    found ? log('PASS', `작물 탭: ${crop}`) : log('FAIL', `작물 탭 없음: ${crop}`);
  }

  console.log('\n[B-3] KPI 카드 4개');
  currentTest = 'KPI-CARDS';
  for (const kpi of ['이번 주 생장', '화방 높이', '누적 착과', '작기 진행']) {
    const found = bodyText.includes(kpi);
    found ? log('PASS', `KPI: ${kpi}`) : log('FAIL', `KPI 없음: ${kpi}`);
  }

  console.log('\n[B-4] 추이 차트 (개화 화방 높이)');
  currentTest = 'TREND-CHART';
  const hasTrendChart = bodyText.includes('개화 화방 높이 추이');
  hasTrendChart ? log('PASS', '개화 화방 높이 추이 섹션 표시') : log('FAIL', '차트 섹션 없음');

  console.log('\n[B-5] 표식주 목록 행 표시');
  currentTest = 'MARKER-TABLE';
  const tableRows = await page.locator('tbody tr').count().catch(() => 0);
  tableRows > 0
    ? log('PASS', `표식주 테이블 행 ${tableRows}개`)
    : log('WARN', '표식주 테이블 행 없음 — 작물 탭 기본값 토마토 확인 필요');

  console.log('\n[B-6] 주별 입력 페이지');
  currentTest = 'GROWTH-INPUT';
  await goto(page, `${BASE_URL}/admin/growth/input`);
  await waitForGrowthLoad(page, 8000);
  await ss(page, 'growth-input');
  const inputText = await page.textContent('body').catch(() => '');
  const hasInputTitle = inputText.includes('주별 생육 기록 입력');
  hasInputTitle ? log('PASS', '주별 입력 타이틀 표시') : log('FAIL', '주별 입력 페이지 실패', inputText.slice(0, 100));

  console.log('\n[B-7] 히트맵 페이지');
  currentTest = 'HEATMAP';
  await goto(page, `${BASE_URL}/admin/growth/heatmap`);
  await waitForGrowthLoad(page, 8000);
  await ss(page, 'growth-heatmap');
  const hmText = await page.textContent('body').catch(() => '');
  hmText.includes('목표 곡선 대비 편차 히트맵')
    ? log('PASS', '히트맵 타이틀 표시')
    : log('FAIL', '히트맵 페이지 실패');

  console.log('\n[B-8] 표식주 관리 + 샘플 설정');
  currentTest = 'MARKER-MANAGE';
  await goto(page, `${BASE_URL}/admin/growth/markers`);
  await page.waitForTimeout(1500);
  await ss(page, 'growth-markers');
  const markersText = await page.textContent('body').catch(() => '');
  markersText.includes('표식주 관리')
    ? log('PASS', '표식주 관리 타이틀 표시')
    : log('FAIL', '표식주 관리 페이지 실패');

  markersText.includes('조사 샘플 수 설정')
    ? log('PASS', '샘플 설정 섹션 표시')
    : log('FAIL', '샘플 설정 섹션 없음');

  for (const branch of ['부산LAB', '진주HUB', '하동HUB']) {
    const found = markersText.includes(branch);
    found ? log('PASS', `샘플 설정 지점: ${branch}`) : log('WARN', `샘플 설정 지점 미확인: ${branch}`);
  }

  // ════════════════════════════════════════════
  // SECTION C: 세션 37 회귀 방어
  // ════════════════════════════════════════════
  console.log('\n[SECTION C] 세션 37 회귀 방어');

  currentTest = 'REGRESSION-BUG-F01';
  console.log('\n[C-1] BUG-F01 부동소수점 회귀');
  await goto(page, `${BASE_URL}/admin/dashboard`);
  await page.waitForTimeout(2000);
  const dashText = await page.textContent('body').catch(() => '');
  const hasBadFloat = /\d+\.\d{4,}/.test(dashText);
  !hasBadFloat ? log('PASS', 'BUG-F01 회귀 없음') : log('FAIL', '부동소수점 버그 재발');

  currentTest = 'REGRESSION-BUG-F02';
  console.log('\n[C-2] BUG-F02 작물 탭 회귀');
  const hasFloatingCropTabs = dashText.includes('토마토') && dashText.includes('딸기') && dashText.includes('오이') && dashText.includes('파프리카');
  !hasFloatingCropTabs ? log('PASS', 'BUG-F02 회귀 없음') : log('WARN', '대시보드에 작물명 다수 존재 — 확인 필요');

  currentTest = 'REGRESSION-SCHEDULE';
  console.log('\n[C-3] SchedulePage 타임라인 회귀');
  await goto(page, `${BASE_URL}/admin/schedule`);
  await page.waitForTimeout(1200);
  await ss(page, 'schedule-regression');
  const schedText = await page.textContent('body').catch(() => '');
  const hasScheduleTitle = schedText.includes('근무 관리');
  const hasTimeline = schedText.includes('08:00') || schedText.includes('08');
  hasScheduleTitle ? log('PASS', '근무 관리 타이틀 유지') : log('FAIL', '근무 관리 타이틀 없음');
  hasTimeline ? log('PASS', '타임라인 시간 헤더 유지') : log('FAIL', '타임라인 없음');

  currentTest = 'REGRESSION-HQ';
  console.log('\n[C-4] HQ 사이드바 로그아웃');
  const ctxHQ = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const pageHQ = await ctxHQ.newPage();
  const hqErrors = [];
  pageHQ.on('console', (msg) => { if (msg.type() === 'error') hqErrors.push(msg.text()); });
  await goto(pageHQ, `${BASE_URL}/login`);
  await pageHQ.fill('input[placeholder*="아이디"]', 'jhkim').catch(() => {});
  await pageHQ.fill('input[type="password"]', 'rmfpvm001').catch(() => {});
  await pageHQ.click('button[type="submit"]').catch(() => {});
  await pageHQ.waitForTimeout(4000);
  await goto(pageHQ, `${BASE_URL}/hq`);
  await pageHQ.waitForTimeout(1500);
  const hqText = await pageHQ.textContent('body').catch(() => '');
  hqText.includes('로그아웃')
    ? log('PASS', 'HQ 사이드바 로그아웃 버튼 유지')
    : log('FAIL', 'HQ 로그아웃 버튼 없음');

  console.log('\n[C-5] HQ 콘솔 에러 0건');
  currentTest = 'REGRESSION-HQ-ERRORS';
  const filteredHQErrors = hqErrors.filter(e => !e.includes('favicon') && !e.includes('404'));
  filteredHQErrors.length === 0
    ? log('PASS', 'HQ 콘솔 에러 0건')
    : log('FAIL', `HQ 콘솔 에러 ${filteredHQErrors.length}건`, filteredHQErrors[0]);
  await ctxHQ.close();

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
  console.log(`스크린샷: docs/regression_session38/`);
  console.log('='.repeat(50));

  await browser.close();
  process.exit(FAIL > 0 ? 1 : 0);
})();
