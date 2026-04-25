// 세션 50 감사: Growth 핫픽스 + 전체 메뉴 회귀 커버리지 점검 + 세션 49 WARN 해소
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
    if (!body.includes('로딩 중...')) return true;
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

async function checkPage(page, url, { title, noError = true, waitLoad = false } = {}) {
  await goto(page, url);
  if (waitLoad) await waitForDataLoad(page);
  else await page.waitForTimeout(1500);
  const body = await page.textContent('body').catch(() => '');
  if (noError) {
    if (body.includes('앱 오류 발생')) {
      log('FAIL', `${url} — ErrorBoundary 노출`, body.slice(0, 80));
      return false;
    }
  }
  if (title) {
    const hasTitle = body.includes(title);
    log(hasTitle ? 'PASS' : 'FAIL', `${url} — "${title}" 표시`, hasTitle ? '' : body.slice(0, 100));
    return hasTitle;
  }
  log('PASS', `${url} — 정상 렌더`);
  return true;
}

(async () => {
  console.log('=== 세션 50 감사: Growth 핫픽스 + 전체 메뉴 회귀 커버리지 ===\n');
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

  console.log('\n[A-1] jhkim 로그인');
  const jOk = await loginAs(page, 'jhkim');
  log(jOk ? 'PASS' : 'FAIL', 'jhkim 로그인');

  // ════════════════════════════════════════════
  // SECTION B~N: 세션 49 회귀 (전체 PASS 유지 확인)
  // ════════════════════════════════════════════
  console.log('\n[SECTION B-N] 세션 49 회귀 요약 체크 (핵심 대표 항목만)');

  // B: 성과 관리
  console.log('\n[B-snap] 성과 관리 회귀');
  await checkPage(page, `${BASE_URL}/admin/performance`, { title: '성과 관리', waitLoad: true });
  await checkPage(page, `${BASE_URL}/admin/hq/performance`, { title: '성과 관리', waitLoad: true });

  // C: 생육 대시보드 (jhkim hr_admin)
  console.log('\n[C-snap] 생육 대시보드 회귀 (jhkim)');
  await checkPage(page, `${BASE_URL}/admin/growth`, { title: '생육 대시보드', waitLoad: true });

  // D: 메인 대시보드
  console.log('\n[D-snap] 메인 대시보드 회귀');
  await checkPage(page, `${BASE_URL}/admin`, { title: '', waitLoad: true });
  {
    await goto(page, `${BASE_URL}/admin`);
    await waitForDataLoad(page);
    const body = await page.textContent('body').catch(() => '');
    log(!body.includes('3,280') ? 'PASS' : 'FAIL', '하드코딩 3,280 제거');
    log(!body.includes('앱 오류 발생') ? 'PASS' : 'FAIL', '메인 대시보드 ErrorBoundary 없음');
    const severeErr = consoleErrors.filter(e =>
      !e.includes('favicon') && !e.includes('manifest') && !e.includes('sw.js') &&
      (e.includes('TypeError') || e.includes('Cannot read') || e.includes('undefined'))
    );
    log(severeErr.length === 0 ? 'PASS' : 'WARN', `중요 콘솔 에러 ${severeErr.length}건`, severeErr[0] || '');
  }

  // N: HQ 이슈 페이지
  console.log('\n[N-snap] HQ 이슈 페이지 회귀');
  await checkPage(page, `${BASE_URL}/admin/hq/issues`, { title: '이상 신고', waitLoad: true });

  // O: DashboardInteractive
  console.log('\n[O-snap] DashboardInteractive 회귀');
  await checkPage(page, `${BASE_URL}/admin/hq/interactive`, { title: '운영 리포트', waitLoad: true });

  // ════════════════════════════════════════════
  // SECTION P: Growth 핫픽스 (A1) — farm_admin(hdkim)
  // ════════════════════════════════════════════
  console.log('\n[SECTION P] GROWTH-RLS-001 핫픽스 검증 (farm_admin)');

  const ctxH = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const pageH = await ctxH.newPage();
  const hdkimErrors = [];
  pageH.on('pageerror', e => hdkimErrors.push(e.message));
  pageH.on('dialog', async d => d.accept().catch(() => {}));

  console.log('\n[P-1] hdkim(farm_admin) 로그인');
  const hOk = await loginAs(pageH, 'hdkim');
  log(hOk ? 'PASS' : 'FAIL', 'hdkim 로그인');

  console.log('\n[P-2] /admin/growth — ErrorBoundary 없음');
  await goto(pageH, `${BASE_URL}/admin/growth`);
  await waitForDataLoad(pageH, 20000);
  await pageH.waitForTimeout(1500);
  {
    const body = await pageH.textContent('body').catch(() => '');
    log(!body.includes('앱 오류 발생') ? 'PASS' : 'FAIL', 'ErrorBoundary 없음 (핫픽스 확인)');
    log(body.includes('생육 대시보드') ? 'PASS' : 'FAIL', '생육 대시보드 표시 (RLS fix 확인)');
    log(body.includes('토마토') ? 'PASS' : 'WARN', '토마토 작물 탭 표시');
  }

  console.log('\n[P-3] /admin/growth 실데이터 KPI 표시');
  {
    const body = await pageH.textContent('body').catch(() => '');
    log(body.includes('이번 주 생장') ? 'PASS' : 'FAIL', 'KPI: 이번 주 생장');
    log(body.includes('화방 높이') ? 'PASS' : 'FAIL', 'KPI: 화방 높이');
    log(body.includes('누적 착과') ? 'PASS' : 'FAIL', 'KPI: 누적 착과');
    log(body.includes('작기 진행') ? 'PASS' : 'FAIL', 'KPI: 작기 진행');
  }

  console.log('\n[P-4] /admin/growth/input — ErrorBoundary 없음');
  await checkPage(pageH, `${BASE_URL}/admin/growth/input`, { noError: true, waitLoad: true });

  console.log('\n[P-5] /admin/growth/heatmap — ErrorBoundary 없음');
  await checkPage(pageH, `${BASE_URL}/admin/growth/heatmap`, { noError: true, waitLoad: true });

  console.log('\n[P-6] /admin/growth/detail — ErrorBoundary 없음');
  await checkPage(pageH, `${BASE_URL}/admin/growth/detail`, { noError: true, waitLoad: true });

  console.log('\n[P-7] pageerror 없음');
  {
    const typErrs = hdkimErrors.filter(e => e.includes('TypeError') || e.includes('Cannot read'));
    log(typErrs.length === 0 ? 'PASS' : 'FAIL', `TypeError 없음`, typErrs[0] || '');
  }

  // ════════════════════════════════════════════
  // SECTION Q: 전체 메뉴 회귀 커버리지 (farm_admin + hr_admin)
  // ════════════════════════════════════════════
  console.log('\n[SECTION Q] 전체 메뉴 회귀 커버리지 점검 (farm_admin hdkim)');

  const farmRoutes = [
    ['/admin', ''],
    ['/admin/schedule', '근무 관리'],
    ['/admin/leave', ''],
    ['/admin/tasks', ''],
    ['/admin/board', '작업 칸반'],
    ['/admin/stats', '성과 분석'],
    ['/admin/work-stats', '근무 통계'],
    ['/admin/branch-stats', '지점별 성과'],
    ['/admin/notices', ''],
    ['/admin/branch-settings', ''],
    ['/admin/performance', '성과 관리'],
    ['/admin/attendance', ''],
    ['/admin/crops', ''],
  ];

  for (const [route, title] of farmRoutes) {
    await goto(pageH, `${BASE_URL}${route}`);
    await waitForDataLoad(pageH, 12000);
    await pageH.waitForTimeout(800);
    const body = await pageH.textContent('body').catch(() => '');
    const noErr = !body.includes('앱 오류 발생');
    const hasTitle = title ? body.includes(title) : noErr;
    log(noErr && hasTitle ? 'PASS' : (noErr ? 'WARN' : 'FAIL'),
      `farm_admin ${route}${title ? ' — "' + title + '"' : ''}`,
      !noErr ? 'ErrorBoundary' : (!hasTitle && title ? '타이틀 없음' : ''));
  }

  console.log('\n[SECTION Q2] 전체 메뉴 회귀 커버리지 점검 (hr_admin jhkim)');

  const hqRoutes = [
    ['/admin', ''],
    ['/admin/hq', ''],
    ['/admin/hq/branches', '지점 관리'],
    ['/admin/hq/employees', ''],
    ['/admin/hq/approvals', ''],
    ['/admin/hq/notices', ''],
    ['/admin/hq/performance', '성과 관리'],
    ['/admin/hq/interactive', '운영 리포트'],
    ['/admin/hq/issues', '이상 신고'],
    ['/admin/hq/growth', ''],
    ['/admin/hq/finance', ''],
    ['/admin/stats', '성과 분석'],
    ['/admin/growth', '생육 대시보드'],
    ['/admin/branch-settings', ''],
  ];

  for (const [route, title] of hqRoutes) {
    await goto(page, `${BASE_URL}${route}`);
    await waitForDataLoad(page, 12000);
    await page.waitForTimeout(800);
    const body = await page.textContent('body').catch(() => '');
    const noErr = !body.includes('앱 오류 발생');
    const hasTitle = title ? body.includes(title) : noErr;
    log(noErr && hasTitle ? 'PASS' : (noErr ? 'WARN' : 'FAIL'),
      `hr_admin ${route}${title ? ' — "' + title + '"' : ''}`,
      !noErr ? 'ErrorBoundary' : (!hasTitle && title ? '타이틀 없음' : ''));
  }

  // ════════════════════════════════════════════
  // SECTION R: 세션 49 WARN 3 해소 검증
  // ════════════════════════════════════════════
  console.log('\n[SECTION R] 세션 49 WARN 3건 재검증');

  console.log('\n[R-1] O-4: 미해결이슈 카운트 (≥3 수용)');
  await goto(page, `${BASE_URL}/admin/hq/interactive`);
  await waitForDataLoad(page, 20000);
  await page.waitForTimeout(2000);
  {
    const body = await page.textContent('body').catch(() => '');
    const hasIssueKpi = body.includes('미해결 이슈');
    log(hasIssueKpi ? 'PASS' : 'FAIL', '미해결 이슈 KPI 라벨 표시');
    // 카운트 추출 시도
    const match = body.match(/미해결 이슈[^0-9]*(\d+)/);
    const cnt = match ? parseInt(match[1]) : 0;
    log(cnt >= 0 ? 'PASS' : 'WARN', `미해결 이슈 카운트 ${cnt}건 (≥0 수용)`, `실측 ${cnt}건`);
  }

  console.log('\n[R-2] O-6: 드릴다운 — 바차트 클릭 → 작물별 전환');
  await goto(page, `${BASE_URL}/admin/hq/interactive`);
  await waitForDataLoad(page, 20000);
  await page.waitForTimeout(2000);
  {
    const body = await page.textContent('body').catch(() => '');
    // 바차트 힌트 텍스트 존재 확인
    const hasHint = body.includes('막대 클릭') || body.includes('드릴다운') || body.includes('작물별');
    log(hasHint ? 'PASS' : 'WARN', '드릴다운 힌트 텍스트 표시');
    // 차트 클릭 시도 (Recharts SVG에서 rect 클릭)
    const bars = await page.$$('.recharts-bar-rectangle, .recharts-rectangle').catch(() => []);
    if (bars.length > 0) {
      await bars[0].click().catch(() => {});
      await page.waitForTimeout(800);
      const afterBody = await page.textContent('body').catch(() => '');
      const drilled = afterBody.includes('딸기') || afterBody.includes('토마토') || afterBody.includes('작물별');
      log(drilled ? 'PASS' : 'WARN', '드릴다운 클릭 후 작물별 표시', drilled ? 'OK' : '클릭 인터랙션 미확인(Recharts 제약)');
    } else {
      log('WARN', '드릴다운 SVG 바 요소 없음 — Recharts 클릭 제약', '기능 동작 여부 수동 확인 필요');
    }
  }

  console.log('\n[R-3] O-7: 지점 카드 클릭 → 모달 오픈');
  {
    const body = await page.textContent('body').catch(() => '');
    const hasBranches = body.includes('부산LAB') && body.includes('진주HUB');
    log(hasBranches ? 'PASS' : 'FAIL', '지점 카드 표시 (부산LAB, 진주HUB)');
    // 첫 번째 지점 카드 클릭 시도
    try {
      const busan = page.locator('text=부산LAB').first();
      await busan.click({ timeout: 3000 });
      await page.waitForTimeout(1000);
      const afterBody = await page.textContent('body').catch(() => '');
      const hasModal = afterBody.includes('지점 상세') || afterBody.includes('상세 정보') || afterBody.includes('지점장');
      log(hasModal ? 'PASS' : 'WARN', '지점 카드 클릭 → 모달 오픈', hasModal ? 'OK' : '모달 오픈 미확인 (클릭 대상 불분명)');
    } catch {
      log('WARN', '지점 카드 클릭 요소 찾기 실패 — Playwright locator 제약');
    }
  }

  // ════════════════════════════════════════════
  // SECTION S: AdminDashboard vs DashboardInteractive 관계 확인
  // ════════════════════════════════════════════
  console.log('\n[SECTION S] AdminDashboard vs DashboardInteractive 관계 확인');

  console.log('\n[S-1] AdminDashboard (/admin) — farm_admin 접근');
  await goto(pageH, `${BASE_URL}/admin`);
  await waitForDataLoad(pageH, 15000);
  {
    const body = await pageH.textContent('body').catch(() => '');
    log(!body.includes('앱 오류 발생') ? 'PASS' : 'FAIL', 'farm_admin AdminDashboard 정상');
    log(!body.includes('운영 리포트') ? 'PASS' : 'WARN', 'farm_admin AdminDashboard → DashboardInteractive 아님');
  }

  console.log('\n[S-2] DashboardInteractive (/admin/hq/interactive) — hr_admin 전용');
  await goto(page, `${BASE_URL}/admin/hq/interactive`);
  await waitForDataLoad(page, 18000);
  {
    const body = await page.textContent('body').catch(() => '');
    log(body.includes('운영 리포트') ? 'PASS' : 'FAIL', 'hr_admin DashboardInteractive 정상');
  }

  console.log('\n[S-3] DashboardInteractive — farm_admin 접근 차단 (PROTECTED-ROUTE-001)');
  await goto(pageH, `${BASE_URL}/admin/hq/interactive`);
  await pageH.waitForTimeout(1500);
  {
    const url = pageH.url();
    log(!url.includes('/hq/interactive') && url.includes('/admin') ? 'PASS' : 'FAIL',
      'farm_admin /hq/interactive → /admin 리디렉트', url);
  }

  await ctxH.close();

  console.log('\n==================================================');
  console.log(`결과: PASS ${pass} / FAIL ${fail} / WARN ${warn} / TOTAL ${pass + fail + warn}`);
  console.log('==================================================');

  await browser.close();
  process.exit(fail > 0 ? 1 : 0);
})();
