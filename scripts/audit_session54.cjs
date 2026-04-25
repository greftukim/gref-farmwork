// 세션 54 감사: TBM-COMPLETION-001 — SafetyChecksPage 실데이터 연결
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
  return page.url().includes('/admin');
}

(async () => {
  console.log('=== 세션 54 감사: TBM-COMPLETION-001 — SafetyChecksPage 실데이터 연결 ===\n');
  const browser = await chromium.launch({ headless: true });

  // ════════════════════════════════════════════
  // SECTION A: 로그인
  // ════════════════════════════════════════════
  console.log('[SECTION A] 로그인');
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  const consoleErrors = [];
  page.on('console', msg => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });
  page.on('dialog', async d => d.accept().catch(() => {}));

  console.log('\n[A-1] jhkim(hr_admin) 로그인');
  const jOk = await loginAs(page, 'jhkim');
  log(jOk ? 'PASS' : 'FAIL', 'jhkim 로그인', jOk ? page.url() : '로그인 실패');

  if (!jOk) {
    console.log('\n로그인 실패 — 이후 테스트 스킵');
    await browser.close();
    console.log(`\n결과: PASS ${pass} / FAIL ${fail} / WARN ${warn} / TOTAL ${pass + fail + warn}`);
    process.exit(fail > 0 ? 1 : 0);
  }

  // ════════════════════════════════════════════
  // SECTION B: 세션 53 회귀 (Finance Phase 2 보존)
  // ════════════════════════════════════════════
  console.log('\n[SECTION B] 세션 53 회귀 — Finance Phase 2 보존');

  console.log('\n[B-1] HQFinanceScreen Phase 2 — 에러 없음 + 핵심 요소 보존');
  await goto(page, `${BASE_URL}/admin/hq/finance`);
  await waitForDataLoad(page, 20000);
  await page.waitForTimeout(3000);
  {
    const body = await page.textContent('body').catch(() => '');
    log(!body.includes('앱 오류 발생') ? 'PASS' : 'FAIL', 'Finance ErrorBoundary 없음');
    log(body.includes('경영 지표') ? 'PASS' : 'FAIL', '"경영 지표" 타이틀 보존');
    log(body.includes('원/kg') ? 'PASS' : 'FAIL', 'kg당 원가 "원/kg" 보존');
    log(body.includes('예산 집행률') ? 'PASS' : 'FAIL', '"예산 집행률" 섹션 보존');
  }

  console.log('\n[B-2] DashboardInteractive FinanceTrendCard 보존');
  await goto(page, `${BASE_URL}/admin/hq/interactive`);
  await waitForDataLoad(page, 20000);
  await page.waitForTimeout(2000);
  {
    const body = await page.textContent('body').catch(() => '');
    log(!body.includes('앱 오류 발생') ? 'PASS' : 'FAIL', 'DashboardInteractive ErrorBoundary 없음');
    log(body.includes('운영 리포트') ? 'PASS' : 'FAIL', '"운영 리포트" 타이틀 보존');
  }

  // ════════════════════════════════════════════
  // SECTION Q: TBM 안전점검 현황 — SafetyChecksPage
  // ════════════════════════════════════════════
  console.log('\n[SECTION Q] TBM 안전점검 현황 — SafetyChecksPage 실데이터');

  console.log('\n[Q-1] /admin/safety-checks 페이지 로드');
  await goto(page, `${BASE_URL}/admin/safety-checks`);
  await waitForDataLoad(page, 18000);
  await page.waitForTimeout(3500);
  {
    const body = await page.textContent('body').catch(() => '');
    log(!body.includes('앱 오류 발생') ? 'PASS' : 'FAIL', 'ErrorBoundary 없음');
    log(body.includes('TBM 안전점검 현황') ? 'PASS' : 'FAIL', '"TBM 안전점검 현황" 타이틀 표시');
    log(body.includes('안전 관리') ? 'PASS' : 'FAIL', '"안전 관리" 서브타이틀 표시');
  }

  console.log('\n[Q-2] KPI 카드 4개 표시 확인');
  {
    const body = await page.textContent('body').catch(() => '');
    log(body.includes('오늘 점검 완료율') ? 'PASS' : 'FAIL', '"오늘 점검 완료율" KPI 카드');
    log(body.includes('점검 완료') ? 'PASS' : 'FAIL', '"점검 완료" KPI 카드');
    log(body.includes('미점검') ? 'PASS' : 'FAIL', '"미점검" KPI 카드');
    log(body.includes('승인 완료') ? 'PASS' : 'FAIL', '"승인 완료" KPI 카드');
  }

  console.log('\n[Q-3] 완료율 실데이터 > 0% (오늘 2026-04-26 시드 10건/24명 = 42%)');
  {
    const body = await page.textContent('body').catch(() => '');
    // rate = 10/24 = 42%
    const hasRate = /\d+(?:%|\s*%)/.test(body);
    log(hasRate ? 'PASS' : 'FAIL', '완료율 숫자 표시');
    // 0%가 아닌 실데이터 — 오늘 시드 10건 삽입됨
    log(!body.includes('0%') || body.includes('42%') || body.includes('41%')
      ? 'PASS' : 'WARN', '완료율 0% 이상 (시드 10/24 반영)', '기대: ~42%');
    // 분모 = 24명 활성 작업자
    const hasDenominator = body.includes('/ 24명') || body.includes('/24명');
    log(hasDenominator ? 'PASS' : 'WARN', '분모 24명 표시');
  }

  console.log('\n[Q-4] 날짜 선택기 표시 + 변경');
  {
    const dateInput = page.locator('input[type="date"]').first();
    const dateVisible = await dateInput.isVisible().catch(() => false);
    log(dateVisible ? 'PASS' : 'FAIL', '날짜 선택기 표시');

    // 다른 날짜(2026-04-16)로 변경 → 데이터 변경 확인
    if (dateVisible) {
      await dateInput.fill('2026-04-16');
      await page.waitForTimeout(3000);
      const bodyAfter = await page.textContent('body').catch(() => '');
      log(!bodyAfter.includes('앱 오류 발생') ? 'PASS' : 'FAIL', '날짜 변경 후 오류 없음');
    } else {
      log('WARN', '날짜 선택기 미표시 — 변경 테스트 스킵');
    }
    // 오늘 날짜로 복원
    await goto(page, `${BASE_URL}/admin/safety-checks`);
    await waitForDataLoad(page, 15000);
    await page.waitForTimeout(3500);
  }

  console.log('\n[Q-5] 점검 내역 테이블 — 작업자 행 표시');
  {
    const body = await page.textContent('body').catch(() => '');
    log(body.includes('점검 내역') ? 'PASS' : 'FAIL', '"점검 내역" 섹션 표시');
    log(body.includes('작업자') ? 'PASS' : 'FAIL', '테이블 "작업자" 헤더');
    log(body.includes('유형') ? 'PASS' : 'FAIL', '테이블 "유형" 헤더');
    log(body.includes('시각') ? 'PASS' : 'FAIL', '테이블 "시각" 헤더');
    log(body.includes('상태') ? 'PASS' : 'FAIL', '테이블 "상태" 헤더');
  }

  console.log('\n[Q-6] 상태 Pill — 제출/승인/미점검');
  {
    const body = await page.textContent('body').catch(() => '');
    log(body.includes('제출') ? 'PASS' : 'FAIL', '"제출" Pill 표시 (info)');
    log(body.includes('승인') ? 'PASS' : 'FAIL', '"승인" Pill 표시 (success)');
    log(body.includes('미점검') ? 'PASS' : 'FAIL', '"미점검" Pill 표시 (warning)');
  }

  console.log('\n[Q-7] 작업 유형 "작업 전" 표시 (pre_task → 한국어)');
  {
    const body = await page.textContent('body').catch(() => '');
    log(body.includes('작업 전') ? 'PASS' : 'FAIL', '"작업 전" (pre_task 변환) 표시');
    log(!body.includes('pre_task') ? 'PASS' : 'WARN', 'raw "pre_task" 미노출');
  }

  console.log('\n[Q-8] 오늘 시드 작업자 이름 표시 (부산LAB 샘플)');
  {
    const body = await page.textContent('body').catch(() => '');
    log(body.includes('김선아') ? 'PASS' : 'WARN', '김선아(busan) 행 표시');
    log(body.includes('김옥희') ? 'PASS' : 'WARN', '김옥희(busan, approved) 행 표시');
  }

  // ════════════════════════════════════════════
  // SECTION R: HQ 전체 메뉴 회귀 (10개)
  // ════════════════════════════════════════════
  console.log('\n[SECTION R] HQ 전체 메뉴 회귀');

  const hqRoutes = [
    ['/admin/hq', '운영 리포트'],               // HQDashboardScreen: index route /admin/hq
    ['/admin/hq/interactive', '운영 리포트'],
    ['/admin/hq/employees', '직원 관리'],
    ['/admin/hq/branches', '지점 관리'],
    ['/admin/hq/approvals', '승인 허브'],
    ['/admin/hq/finance', '경영 지표'],
    ['/admin/hq/growth', '생육 비교'],
    ['/admin/hq/performance', '작업자 성과 관리'],  // PerfHeader title
    ['/admin/hq/notices', '공지 · 정책'],       // HQPageHeader title
    ['/admin/hq/issues', '이상 신고'],
  ];

  for (const [route, title] of hqRoutes) {
    await goto(page, `${BASE_URL}${route}`);
    await waitForDataLoad(page, 15000);
    await page.waitForTimeout(1000);
    const body = await page.textContent('body').catch(() => '');
    const noErr = !body.includes('앱 오류 발생');
    log(noErr ? 'PASS' : 'FAIL', `${route} — ErrorBoundary 없음`);
    log(body.includes(title) ? 'PASS' : 'WARN', `${route} — "${title}" 타이틀`);
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
      !e.includes('react-router')
    );
    if (filtered.length === 0) {
      log('PASS', `콘솔 에러 0건`);
    } else {
      filtered.slice(0, 5).forEach(e => log('WARN', '콘솔 에러', e.slice(0, 120)));
    }
  }

  await browser.close();

  console.log(`\n${'='.repeat(60)}`);
  console.log(`결과: PASS ${pass} / FAIL ${fail} / WARN ${warn} / TOTAL ${pass + fail + warn}`);
  process.exit(fail > 0 ? 1 : 0);
})();
