// 세션 55 감사: HQ-BRANCH-DETAIL-001 — 지점 상세 페이지
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
  console.log('=== 세션 55 감사: HQ-BRANCH-DETAIL-001 — 지점 상세 페이지 ===\n');
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
  // SECTION B: 세션 54 회귀 — SafetyChecksPage 보존
  // ════════════════════════════════════════════
  console.log('\n[SECTION B] 세션 54 회귀 — SafetyChecksPage 보존');

  console.log('\n[B-1] /admin/safety-checks 핵심 요소 보존');
  await goto(page, `${BASE_URL}/admin/safety-checks`);
  await waitForDataLoad(page, 18000);
  await page.waitForTimeout(2000);
  {
    const body = await page.textContent('body').catch(() => '');
    log(!body.includes('앱 오류 발생') ? 'PASS' : 'FAIL', 'SafetyChecks ErrorBoundary 없음');
    log(body.includes('TBM 안전점검 현황') ? 'PASS' : 'FAIL', '"TBM 안전점검 현황" 타이틀 보존');
    log(body.includes('오늘 점검 완료율') ? 'PASS' : 'FAIL', '"오늘 점검 완료율" KPI 보존');
  }

  // ════════════════════════════════════════════
  // SECTION C: 지점 관리 목록 → 상세 이동
  // ════════════════════════════════════════════
  console.log('\n[SECTION C] 지점 관리 목록 → 상세 이동');

  console.log('\n[C-1] /admin/hq/branches 목록 페이지');
  await goto(page, `${BASE_URL}/admin/hq/branches`);
  await waitForDataLoad(page, 15000);
  await page.waitForTimeout(2000);
  {
    const body = await page.textContent('body').catch(() => '');
    log(!body.includes('앱 오류 발생') ? 'PASS' : 'FAIL', '지점 관리 ErrorBoundary 없음');
    log(body.includes('지점 관리') ? 'PASS' : 'FAIL', '"지점 관리" 타이틀 표시');
    log(body.includes('상세 →') ? 'PASS' : 'FAIL', '"상세 →" 버튼 표시');
  }

  console.log('\n[C-2] 부산LAB "상세 →" 클릭 → 상세 페이지 이동');
  {
    const btns = page.locator('button', { hasText: '상세 →' });
    const count = await btns.count().catch(() => 0);
    log(count >= 1 ? 'PASS' : 'FAIL', `"상세 →" 버튼 ${count}개 존재`);
    if (count >= 1) {
      await btns.first().click().catch(() => {});
      await page.waitForTimeout(3000);
      const url = page.url();
      log(url.includes('/branches/') ? 'PASS' : 'FAIL', 'URL /branches/:branchId 이동', url);
    }
  }

  // ════════════════════════════════════════════
  // SECTION D: 상세 페이지 직접 접근 (busan)
  // ════════════════════════════════════════════
  console.log('\n[SECTION D] /admin/hq/branches/busan 상세 페이지');

  await goto(page, `${BASE_URL}/admin/hq/branches/busan`);
  await waitForDataLoad(page, 18000);
  await page.waitForTimeout(3000);

  console.log('\n[D-1] 기본 구조 + ErrorBoundary');
  {
    const body = await page.textContent('body').catch(() => '');
    log(!body.includes('앱 오류 발생') ? 'PASS' : 'FAIL', 'ErrorBoundary 없음');
    log(body.includes('부산LAB') ? 'PASS' : 'FAIL', '"부산LAB" 타이틀 표시');
    log(body.includes('지점 관리') ? 'PASS' : 'FAIL', '"지점 관리" 서브타이틀');
    log(body.includes('목록으로') ? 'PASS' : 'FAIL', '"목록으로" 뒤로 버튼');
  }

  console.log('\n[D-2] KPI 4개 카드');
  {
    const body = await page.textContent('body').catch(() => '');
    log(body.includes('활성 인원') ? 'PASS' : 'FAIL', '"활성 인원" KPI');
    log(body.includes('이번 달 수확') ? 'PASS' : 'FAIL', '"이번 달 수확" KPI');
    log(body.includes('오늘 TBM 완료율') ? 'PASS' : 'FAIL', '"오늘 TBM 완료율" KPI');
    log(body.includes('이번 달 수익') ? 'PASS' : 'FAIL', '"이번 달 수익" KPI');
  }

  console.log('\n[D-3] 수확 데이터 (busan 목표 5000kg, 부산 작업자 이번달 수확)');
  {
    const body = await page.textContent('body').catch(() => '');
    log(body.includes('kg') ? 'PASS' : 'WARN', '수확량 kg 단위 표시');
    log(body.includes('5,000') || body.includes('5000') || body.includes('목표') ? 'PASS' : 'WARN', '목표 5000kg 관련 텍스트');
  }

  console.log('\n[D-4] 재무 요약 (busan 2026/4 수익 47M)');
  {
    const body = await page.textContent('body').catch(() => '');
    log(body.includes('이번 달 재무 요약') ? 'PASS' : 'FAIL', '"이번 달 재무 요약" 섹션');
    log(body.includes('수익') ? 'PASS' : 'FAIL', '"수익" 항목');
    log(body.includes('인건비') ? 'PASS' : 'FAIL', '"인건비" 항목');
    // busan revenue=47000000 → "4,700만원" 또는 "47,000,000"
    const hasRevenue = body.includes('4,700만원') || body.includes('47,000,000') || body.includes('4700만원');
    log(hasRevenue ? 'PASS' : 'WARN', 'busan 수익 ~47M 표시', '기대: 4,700만원');
    log(body.includes('이익률') ? 'PASS' : 'WARN', '"이익률" 표시');
  }

  console.log('\n[D-5] 작업자 현황 테이블');
  {
    const body = await page.textContent('body').catch(() => '');
    log(body.includes('작업자 현황') ? 'PASS' : 'FAIL', '"작업자 현황" 섹션');
    log(body.includes('이번 달 수확') ? 'PASS' : 'FAIL', '테이블 "이번 달 수확" 컬럼');
    log(body.includes('오늘 TBM') ? 'PASS' : 'FAIL', '테이블 "오늘 TBM" 컬럼');
  }

  console.log('\n[D-6] TBM 상태 Pill (승인/제출/미점검)');
  {
    const body = await page.textContent('body').catch(() => '');
    const hasPill = body.includes('승인') || body.includes('제출') || body.includes('미점검');
    log(hasPill ? 'PASS' : 'WARN', 'TBM 상태 Pill 표시');
  }

  console.log('\n[D-7] 목록으로 버튼 → /admin/hq/branches 복귀');
  {
    const btn = page.locator('button', { hasText: '목록으로' });
    const visible = await btn.isVisible().catch(() => false);
    log(visible ? 'PASS' : 'FAIL', '"목록으로" 버튼 존재');
    if (visible) {
      await btn.click().catch(() => {});
      await page.waitForTimeout(2000);
      const url = page.url();
      log(url.includes('/hq/branches') && !url.includes('/busan') ? 'PASS' : 'FAIL', '목록 URL 복귀', url);
      // 상세로 재이동
      await goto(page, `${BASE_URL}/admin/hq/branches/busan`);
      await waitForDataLoad(page, 15000);
      await page.waitForTimeout(2000);
    }
  }

  // ════════════════════════════════════════════
  // SECTION E: jinju / hadong 페이지
  // ════════════════════════════════════════════
  console.log('\n[SECTION E] jinju / hadong 상세 페이지');

  for (const [code, name] of [['jinju', '진주HUB'], ['hadong', '하동HUB']]) {
    console.log(`\n[E-${code}] /admin/hq/branches/${code}`);
    await goto(page, `${BASE_URL}/admin/hq/branches/${code}`);
    await waitForDataLoad(page, 15000);
    await page.waitForTimeout(2500);
    const body = await page.textContent('body').catch(() => '');
    log(!body.includes('앱 오류 발생') ? 'PASS' : 'FAIL', `${name} ErrorBoundary 없음`);
    log(body.includes(name) ? 'PASS' : 'FAIL', `"${name}" 타이틀 표시`);
    log(body.includes('활성 인원') ? 'PASS' : 'FAIL', `${name} KPI 카드 표시`);
    log(body.includes('이번 달 재무 요약') ? 'PASS' : 'FAIL', `${name} 재무 요약 섹션`);
  }

  console.log('\n[E-invalid] /admin/hq/branches/unknown — 잘못된 지점 코드');
  await goto(page, `${BASE_URL}/admin/hq/branches/unknown`);
  await page.waitForTimeout(2000);
  {
    const body = await page.textContent('body').catch(() => '');
    log(!body.includes('앱 오류 발생') ? 'PASS' : 'FAIL', 'unknown 코드 ErrorBoundary 없음');
    log(body.includes('알 수 없는') ? 'PASS' : 'WARN', '"알 수 없는 지점" 에러 메시지');
  }

  // ════════════════════════════════════════════
  // SECTION R: HQ 전체 메뉴 회귀
  // ════════════════════════════════════════════
  console.log('\n[SECTION R] HQ 전체 메뉴 회귀');

  const hqRoutes = [
    ['/admin/hq', '운영 리포트'],
    ['/admin/hq/interactive', '운영 리포트'],
    ['/admin/hq/employees', '직원 관리'],
    ['/admin/hq/branches', '지점 관리'],
    ['/admin/hq/approvals', '승인 허브'],
    ['/admin/hq/finance', '경영 지표'],
    ['/admin/hq/growth', '생육 비교'],
    ['/admin/hq/performance', '작업자 성과 관리'],
    ['/admin/hq/notices', '공지 · 정책'],
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
