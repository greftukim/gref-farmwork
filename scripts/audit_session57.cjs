// 세션 57 감사: HQ-GROWTH-BRANCH-DETAIL-001 구현 + 세션 56 WARN 해소
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

(async () => {
  console.log('=== 세션 57 감사: HQ-GROWTH-BRANCH-DETAIL-001 + WARN 해소 ===\n');
  const browser = await chromium.launch({ headless: true });
  const consoleErrors = [];

  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  page.on('console', msg => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });
  page.on('dialog', async d => d.accept().catch(() => {}));

  // ════════════════════════════════════════════
  // SECTION A: 로그인
  // ════════════════════════════════════════════
  console.log('[SECTION A] 로그인');

  const jOk = await loginAs(page, 'jhkim');
  log(jOk ? 'PASS' : 'FAIL', 'jhkim(hr_admin) 로그인', jOk ? page.url() : '로그인 실패');

  if (!jOk) {
    console.log('\n로그인 실패 — 이후 테스트 스킵');
    await browser.close();
    console.log(`\n결과: PASS ${pass} / FAIL ${fail} / WARN ${warn} / TOTAL ${pass + fail + warn}`);
    process.exit(fail > 0 ? 1 : 0);
  }

  // ════════════════════════════════════════════
  // SECTION B: 세션 56 WARN 해소 — leave_requests 시드 확인
  // ════════════════════════════════════════════
  console.log('\n[SECTION B] 세션 56 WARN 해소 — 휴가 신청 대기 건 확인');

  await goto(page, `${BASE_URL}/admin/leave`);
  await waitForDataLoad(page, 15000);
  await page.waitForTimeout(3000);

  console.log('\n[B-1] 페이지 로드');
  {
    const body = await page.textContent('body').catch(() => '');
    log(!body.includes('앱 오류 발생') ? 'PASS' : 'FAIL', '/admin/leave ErrorBoundary 없음');
    log(body.includes('휴가 신청 관리') ? 'PASS' : 'FAIL', '"휴가 신청 관리" 타이틀');
  }

  console.log('\n[B-2] 대기 건 존재 (시드 2건 확인)');
  {
    const approveBtns = page.locator('button', { hasText: '승인' });
    const count = await approveBtns.count().catch(() => 0);
    if (count > 0) {
      log('PASS', `승인 버튼 ${count}개 노출 (대기 건 존재)`);
    } else {
      log('WARN', '승인 버튼 0개 — 대기 건 없거나 필터 문제');
    }
  }

  console.log('\n[B-3] 승인 클릭 동작 확인');
  {
    const approveBtns = page.locator('button', { hasText: '승인' });
    const count = await approveBtns.count().catch(() => 0);
    if (count > 0) {
      await approveBtns.first().click().catch(() => {});
      await page.waitForTimeout(3000);
      const body = await page.textContent('body').catch(() => '');
      log(!body.includes('앱 오류 발생') ? 'PASS' : 'FAIL', '승인 클릭 후 오류 없음');
    } else {
      log('WARN', '대기 건 없음 — 승인 시뮬레이션 스킵');
    }
  }

  // ════════════════════════════════════════════
  // SECTION C: HQ-GROWTH-BRANCH-DETAIL-001 — GrowthCompare 수정
  // ════════════════════════════════════════════
  console.log('\n[SECTION C] HQ-GROWTH-BRANCH-DETAIL-001 — GrowthCompare 수정');

  console.log('\n[C-1] /admin/hq/growth 페이지 로드');
  await goto(page, `${BASE_URL}/admin/hq/growth`);
  await waitForDataLoad(page, 15000);
  await page.waitForTimeout(2000);
  {
    const body = await page.textContent('body').catch(() => '');
    log(!body.includes('앱 오류 발생') ? 'PASS' : 'FAIL', 'GrowthCompare ErrorBoundary 없음');
    log(body.includes('지점별 생육 현황') ? 'PASS' : 'FAIL', '"지점별 생육 현황" 타이틀');
    log(body.includes('부산LAB') ? 'PASS' : 'FAIL', '부산LAB 지점 표시');
    log(body.includes('진주HUB') ? 'PASS' : 'FAIL', '진주HUB 지점 표시');
    log(body.includes('하동HUB') ? 'PASS' : 'FAIL', '하동HUB 지점 표시');
  }

  console.log('\n[C-2] "지점 상세 보기 →" 클릭 → navigate 동작 확인 (alert 미발생)');
  {
    const detailBtns = page.locator('button', { hasText: '지점 상세 보기 →' });
    const count = await detailBtns.count().catch(() => 0);
    log(count > 0 ? 'PASS' : 'FAIL', `"지점 상세 보기 →" 버튼 ${count}개 존재`);
    if (count > 0) {
      let alertFired = false;
      page.on('dialog', async d => { alertFired = true; d.accept().catch(() => {}); });
      await detailBtns.first().click().catch(() => {});
      await page.waitForTimeout(2000);
      const url = page.url();
      log(url.includes('/admin/hq/growth/branches/') ? 'PASS' : 'FAIL', `navigate 동작 (URL: ${url})`);
      log(!alertFired ? 'PASS' : 'FAIL', 'alert 미발생 (navigate로 교체됨)');
    }
  }

  // ════════════════════════════════════════════
  // SECTION D: GrowthBranchDetail 3개 지점 상세
  // ════════════════════════════════════════════
  console.log('\n[SECTION D] GrowthBranchDetail 3개 지점 상세 페이지');

  const branches = [
    { id: 'busan',  name: '부산LAB', crops: ['토마토', '딸기', '파프리카'] },
    { id: 'jinju',  name: '진주HUB', crops: ['오이', '애호박'] },
    { id: 'hadong', name: '하동HUB', crops: ['방울토마토', '고추'] },
  ];

  for (const b of branches) {
    console.log(`\n[D-${branches.indexOf(b) + 1}] /admin/hq/growth/branches/${b.id} (${b.name})`);
    await goto(page, `${BASE_URL}/admin/hq/growth/branches/${b.id}`);
    await waitForDataLoad(page, 15000);
    await page.waitForTimeout(1500);
    const body = await page.textContent('body').catch(() => '');
    log(!body.includes('앱 오류 발생') ? 'PASS' : 'FAIL', `${b.name} ErrorBoundary 없음`);
    log(body.includes(b.name) ? 'PASS' : 'FAIL', `"${b.name}" 타이틀`);
    log(body.includes('작물별 생육 상세') ? 'PASS' : 'FAIL', '"작물별 생육 상세" 섹션');
    log(body.includes('평균 건전도') ? 'PASS' : 'FAIL', '"평균 건전도" KPI');
    log(body.includes(b.crops[0]) ? 'PASS' : 'FAIL', `대표 작물 "${b.crops[0]}" 표시`);
  }

  console.log('\n[D-4] "목록으로" 버튼 → /admin/hq/growth 복귀');
  {
    const backBtn = page.locator('button', { hasText: '목록으로' });
    const visible = await backBtn.isVisible().catch(() => false);
    log(visible ? 'PASS' : 'FAIL', '"목록으로" 버튼 존재');
    if (visible) {
      await backBtn.click().catch(() => {});
      await page.waitForTimeout(1500);
      const url = page.url();
      log(url.includes('/admin/hq/growth') && !url.includes('branches') ? 'PASS' : 'FAIL', `GrowthCompare로 복귀 (URL: ${url})`);
    }
  }

  console.log('\n[D-5] 알 수 없는 branchId guard');
  {
    await goto(page, `${BASE_URL}/admin/hq/growth/branches/unknown-branch`);
    await waitForDataLoad(page, 12000);
    await page.waitForTimeout(1000);
    const body = await page.textContent('body').catch(() => '');
    log(!body.includes('앱 오류 발생') ? 'PASS' : 'FAIL', 'unknown branchId ErrorBoundary 없음');
    log(body.includes('알 수 없는 지점') ? 'PASS' : 'WARN', '"알 수 없는 지점" 가드 메시지');
  }

  // ════════════════════════════════════════════
  // SECTION R: 세션 56 회귀 — STORE-MISSING-001~003 보존
  // ════════════════════════════════════════════
  console.log('\n[SECTION R] 세션 56 회귀 — STORE-MISSING-001~003 보존');

  await goto(page, `${BASE_URL}/login`);
  await page.fill('input[placeholder*="아이디"]', 'jhkim').catch(() => {});
  await page.fill('input[type="password"]', 'rmfpvm001').catch(() => {});
  await page.click('button[type="submit"]').catch(() => {});
  await page.waitForTimeout(4000);

  const regressionRoutes = [
    ['/admin/records', '이상신고'],
    ['/admin/leave', '휴가 신청 관리'],
    ['/admin/hq/branches/busan', '부산LAB'],
    ['/admin/hq/branches/jinju', '진주HUB'],
    ['/admin/hq/branches/hadong', '하동HUB'],
    ['/admin/hq/growth', '생육 비교'],
    ['/admin/hq/notices', '공지'],
    ['/admin/hq/issues', '이상 신고'],
    ['/admin/hq/finance', '경영'],
    ['/admin/hq/employees', '직원'],
    ['/admin/hq/approvals', '승인'],
  ];

  for (const [route, title] of regressionRoutes) {
    await goto(page, `${BASE_URL}${route}`);
    await waitForDataLoad(page, 12000);
    await page.waitForTimeout(700);
    const body = await page.textContent('body').catch(() => '');
    log(!body.includes('앱 오류 발생') ? 'PASS' : 'FAIL', `${route} — ErrorBoundary 없음`);
    log(body.includes(title) ? 'PASS' : 'WARN', `${route} — "${title}" 확인`);
  }

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
      !e.includes('400')
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
