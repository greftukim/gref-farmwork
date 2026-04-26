// 세션 68 — Track 1 (HQ 작업자 성과 → StatsPage 리루트) + Track 2 (HQSidebar 그룹화) + 회귀
// X-1: HQ "작업자 성과" 메뉴 → /admin/stats (StatsPage 새 카드) 연결 확인
// X-2: HQSidebar 그룹 헤더 + 지점 중첩 구조 + 로그아웃 표시
// R: 핵심 라우트 회귀
// S: 콘솔 에러
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

async function waitForLoad(page, timeout = 18000) {
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
  await page.waitForTimeout(5000);
  return page.url().includes('/admin') || page.url().includes('/worker');
}

async function getBody(page, extraWait = 800) {
  await waitForLoad(page);
  await page.waitForTimeout(extraWait);
  return page.textContent('body').catch(() => '');
}

(async () => {
  console.log('=== 세션 68 Track 1 (HQ→StatsPage) + Track 2 (사이드바 그룹화) + 회귀 ===\n');
  const browser = await chromium.launch({ headless: true });
  const consoleErrors = [];

  // ═══════════════════════════════════════════════════════
  // SECTION X-1: Track 1 — HQ 작업자 성과 → StatsPage 리루트 (mkkim)
  // ═══════════════════════════════════════════════════════
  console.log('[SECTION X-1] Track 1 — HQ "작업자 성과" → StatsPage 리루트 (mkkim)');
  const x1Ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const x1Page = await x1Ctx.newPage();
  x1Page.on('console', msg => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });

  const x1Ok = await loginAs(x1Page, 'mkkim');
  log(x1Ok ? 'PASS' : 'FAIL', 'X-1-0: mkkim 로그인');

  if (x1Ok) {
    // "작업자 성과" 메뉴 클릭 → /admin/stats 확인
    const perfMenu = x1Page.locator('aside >> text=작업자 성과').first();
    const perfVisible = await perfMenu.isVisible().catch(() => false);
    log(perfVisible ? 'PASS' : 'FAIL', 'X-1-1: HQ 사이드바 "작업자 성과" 메뉴 표시');

    if (perfVisible) {
      await perfMenu.click();
      await x1Page.waitForTimeout(1500);
      log(x1Page.url().includes('/admin/stats') ? 'PASS' : 'FAIL',
        `X-1-2: "작업자 성과" 클릭 → /admin/stats (실제: ${x1Page.url()})`);

      const statsBody = await getBody(x1Page, 1000);
      log(!statsBody.includes('앱 오류 발생') ? 'PASS' : 'FAIL', 'X-1-3: StatsPage 오류 없음');
      log(statsBody.includes('우수 작업자') ? 'PASS' : 'FAIL', 'X-1-4: "우수 작업자" 카드 표시');
      log(statsBody.includes('저성과 작업자') ? 'PASS' : 'FAIL', 'X-1-5: "저성과 작업자" 카드 표시');
      log(statsBody.includes('작업 속도 랭킹') ? 'PASS' : 'FAIL', 'X-1-6: "작업 속도 랭킹" 표시');
      // 구형 수확량 카드 미표시 확인
      const noOldCard = !statsBody.includes('수확 성과율 Top 5') && !statsBody.includes('수확 달성률 Top 5');
      log(noOldCard ? 'PASS' : 'FAIL', 'X-1-7: 구형 수확 카드 미표시');
    } else {
      ['X-1-2','X-1-3','X-1-4','X-1-5','X-1-6','X-1-7'].forEach(id => log('FAIL', `${id}: (메뉴 미발견 — 스킵)`));
    }
  }
  await x1Ctx.close();

  // ═══════════════════════════════════════════════════════
  // SECTION X-2: Track 2 — HQSidebar 그룹화 구조 검증 (mkkim)
  // ═══════════════════════════════════════════════════════
  console.log('\n[SECTION X-2] Track 2 — HQSidebar 그룹화 구조 (mkkim)');
  const x2Ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const x2Page = await x2Ctx.newPage();
  x2Page.on('console', msg => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });

  const x2Ok = await loginAs(x2Page, 'mkkim');
  log(x2Ok ? 'PASS' : 'FAIL', 'X-2-0: mkkim 로그인');

  if (x2Ok) {
    await goto(x2Page, `${BASE_URL}/admin/hq`);
    const hqBody = await getBody(x2Page, 1000);

    // 그룹 헤더 표시 확인
    log(hqBody.includes('대시보드') ? 'PASS' : 'FAIL', 'X-2-1: "대시보드" 그룹 헤더 표시');
    log(hqBody.includes('지점 관리') ? 'PASS' : 'FAIL', 'X-2-2: "지점 관리" 그룹 표시');
    log(hqBody.includes('인사/직원') ? 'PASS' : 'FAIL', 'X-2-3: "인사/직원" 그룹 헤더 표시');
    log(hqBody.includes('생산') ? 'PASS' : 'FAIL', 'X-2-4: "생산" 그룹 헤더 표시');
    log(hqBody.includes('승인/리포트') ? 'PASS' : 'FAIL', 'X-2-5: "승인/리포트" 그룹 헤더 표시');

    // 지점 바로가기 중첩 표시
    log(hqBody.includes('부산LAB') ? 'PASS' : 'FAIL', 'X-2-6: 부산LAB 지점 항목 표시');
    log(hqBody.includes('진주HUB') ? 'PASS' : 'FAIL', 'X-2-7: 진주HUB 지점 항목 표시');
    log(hqBody.includes('하동HUB') ? 'PASS' : 'FAIL', 'X-2-8: 하동HUB 지점 항목 표시');

    // 로그아웃 버튼 표시
    const logoutBtn = x2Page.locator('aside >> text=로그아웃').first();
    log(await logoutBtn.isVisible().catch(() => false) ? 'PASS' : 'FAIL', 'X-2-9: 로그아웃 버튼 표시');

    // 시스템 설정 미표시 (이전 세션 E2)
    log(!hqBody.includes('시스템 설정') ? 'PASS' : 'FAIL', 'X-2-10: "시스템 설정" 미표시 유지');

    // 경영 지표가 "대시보드" 그룹에 합류했는지 (재배치)
    log(hqBody.includes('경영 지표') ? 'PASS' : 'FAIL', 'X-2-11: "경영 지표" 표시');

    // 지점 클릭 → /admin/hq/branches
    const busanItem = x2Page.locator('aside >> text=부산LAB').first();
    if (await busanItem.isVisible().catch(() => false)) {
      await busanItem.click();
      await x2Page.waitForTimeout(1000);
      log(x2Page.url().includes('/admin/hq/branches') ? 'PASS' : 'FAIL',
        `X-2-12: 부산LAB 클릭 → /admin/hq/branches (실제: ${x2Page.url()})`);
    } else {
      log('WARN', 'X-2-12: 부산LAB 클릭 스킵');
    }
  }
  await x2Ctx.close();

  // ═══════════════════════════════════════════════════════
  // SECTION R: 핵심 회귀 (jhkim)
  // ═══════════════════════════════════════════════════════
  console.log('\n[SECTION R] 핵심 라우트 회귀 (jhkim)');
  const regCtx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const regPage = await regCtx.newPage();
  regPage.on('console', msg => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });

  const rOk = await loginAs(regPage, 'jhkim');
  log(rOk ? 'PASS' : 'FAIL', 'R-0: jhkim 로그인');

  if (rOk) {
    const regressionRoutes = [
      ['/admin/hq',           '운영 리포트'],
      ['/admin/hq/branches',  '지점 관리'],
      ['/admin/hq/approvals', '승인 허브'],
      ['/admin/hq/finance',   '경영 지표'],
      ['/admin/hq/employees', '직원'],
      ['/admin/employees',    '직원 관리'],
      ['/admin/tasks',        '작업 칸반'],
      ['/admin/leave',        '휴가 신청 관리'],
      ['/admin/stats',        '성과 분석'],
      ['/admin/notices',      null],
    ];
    for (const [route, title] of regressionRoutes) {
      await goto(regPage, `${BASE_URL}${route}`);
      await waitForLoad(regPage);
      await regPage.waitForTimeout(700);
      const body = await regPage.textContent('body').catch(() => '');
      log(!body.includes('앱 오류 발생') ? 'PASS' : 'FAIL', `R: ${route} 오류 없음`);
      if (title) log(body.includes(title) ? 'PASS' : 'WARN', `R: ${route} — "${title}" 표시`);
    }
  }
  await regCtx.close();

  // ═══════════════════════════════════════════════════════
  // SECTION S: 콘솔 에러
  // ═══════════════════════════════════════════════════════
  console.log('\n[SECTION S] 전체 콘솔 에러');
  {
    const filtered = consoleErrors.filter(e =>
      !e.includes('favicon') &&
      !e.includes('ERR_ABORTED') &&
      !e.includes('net::ERR') &&
      !e.includes('ResizeObserver') &&
      !e.includes('future flag') &&
      !e.includes('react-router') &&
      !e.includes('400') &&
      !e.includes('FCM') &&
      !e.includes('firebase') &&
      !e.includes('messaging')
    );
    if (filtered.length === 0) {
      log('PASS', '콘솔 에러 0건');
    } else {
      filtered.slice(0, 8).forEach(e => log('WARN', '콘솔 에러', e.slice(0, 120)));
    }
  }

  await browser.close();

  const total = pass + fail + warn;
  console.log(`\n${'='.repeat(60)}`);
  console.log(`결과: PASS ${pass} / FAIL ${fail} / WARN ${warn} / TOTAL ${total}`);
  console.log('='.repeat(60));

  if (fail === 0 && warn === 0) {
    console.log('✅ GO — 세션 68 검증 + 회귀 PASS. FAIL 0 / WARN 0');
  } else if (fail === 0) {
    console.log(`⚠️  CONDITIONAL — FAIL 0 / WARN ${warn}. WARN 항목 검토 요망.`);
  } else {
    console.log(`❌ FAIL ${fail}건 발생 — 즉시 수정 필요.`);
  }

  process.exit(fail > 0 ? 1 : 0);
})();
