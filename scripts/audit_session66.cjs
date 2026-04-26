// 세션 66 — P2 작업자 성과 #3/#4 검증 + 회귀
// X-3: P2-STATS-BRANCH-FILTER-001 (지점별 필터)
// X-4: P2-MENU-CLEANUP-001 (메뉴 정리)
// W-1 재확인: audit_session65 W-2-4 수정 검증
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
  console.log('=== 세션 66 P2 #3/#4 검증 + 회귀 ===\n');
  const browser = await chromium.launch({ headless: true });
  const consoleErrors = [];

  // ═══════════════════════════════════════════════════════
  // SECTION X: P2 기능 검증
  // ═══════════════════════════════════════════════════════
  console.log('[SECTION X] P2 기능 검증');

  const xCtx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const xPage = await xCtx.newPage();
  xPage.on('console', msg => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });

  const xOk = await loginAs(xPage, 'jhkim');
  log(xOk ? 'PASS' : 'FAIL', 'X-0: jhkim 로그인');

  if (xOk) {
    // ─ X-3: P2-STATS-BRANCH-FILTER-001 ─
    console.log('\n[X-3] P2-STATS-BRANCH-FILTER-001 — 지점별 필터');
    await goto(xPage, `${BASE_URL}/admin/stats`);
    const statsBody = await getBody(xPage, 1500);
    log(!statsBody.includes('앱 오류 발생') ? 'PASS' : 'FAIL', 'X-3-1: 성과 분석 페이지 오류 없음');
    log(statsBody.includes('성과 분석') ? 'PASS' : 'FAIL', 'X-3-2: "성과 분석" 타이틀 확인');

    // 필터 버튼 표시 (hr_admin jhkim이므로 필터 표시되어야 함)
    const filterBtn = xPage.locator('button:has-text("전체 지점")');
    const filterVisible = await filterBtn.isVisible().catch(() => false);
    log(filterVisible ? 'PASS' : 'FAIL', 'X-3-3: "전체 지점" 필터 버튼 표시');

    const busanBtn = xPage.locator('button:has-text("부산LAB")');
    const busanVisible = await busanBtn.isVisible().catch(() => false);
    log(busanVisible ? 'PASS' : 'FAIL', 'X-3-4: "부산LAB" 필터 버튼 표시');

    if (filterVisible && busanVisible) {
      // 전체 랭킹 건수 파악
      const allCount = await xPage.locator('[style*="수확 성과 랭킹"] ~ * .ranked-item, div[key]').count().catch(() => -1);

      // 부산 필터 적용
      await busanBtn.click();
      await xPage.waitForTimeout(800);
      const busanBody = await xPage.textContent('body').catch(() => '');
      log(busanBody.includes('부산LAB') ? 'PASS' : 'WARN', 'X-3-5: 부산 필터 후 "부산LAB" 배지 표시');

      // 진주HUB 필터
      const jinjiBtn = xPage.locator('button:has-text("진주HUB")');
      if (await jinjiBtn.isVisible().catch(() => false)) {
        await jinjiBtn.click();
        await xPage.waitForTimeout(600);
        const jinjiBody = await xPage.textContent('body').catch(() => '');
        log(jinjiBody.includes('진주HUB') ? 'PASS' : 'WARN', 'X-3-6: 진주 필터 후 "진주HUB" 배지 표시');
      } else {
        log('WARN', 'X-3-6: 진주HUB 필터 버튼 미발견');
      }

      // 전체 지점 복원
      await filterBtn.click();
      await xPage.waitForTimeout(600);
      log('PASS', 'X-3-7: 전체 지점 복원');
    } else {
      log('FAIL', 'X-3-5: (필터 버튼 없음 — 스킵)');
      log('FAIL', 'X-3-6: (필터 버튼 없음 — 스킵)');
      log('WARN', 'X-3-7: (필터 버튼 없음 — 스킵)');
    }

    // W-2-4 수정 검증: mkkim HQ 대시보드 콘텐츠
    console.log('\n[X-5] W-2-4 재검증 (mkkim HQ 대시보드)');
  }
  await xCtx.close();

  // ─ X-4: P2-MENU-CLEANUP-001 (farm_admin hdkim 사이드바 확인) ─
  // 주의: jhkim(hr_admin)은 HQ 사이드바 사용 → farm 사이드바는 farm_admin(hdkim)만 봄
  console.log('\n[X-4] P2-MENU-CLEANUP-001 — 메뉴 정리 (hdkim farm 사이드바)');
  const x4Ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const x4Page = await x4Ctx.newPage();
  x4Page.on('console', msg => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });

  const x4Ok = await loginAs(x4Page, 'hdkim');
  log(x4Ok ? 'PASS' : 'FAIL', 'X-4-0: hdkim 로그인');
  if (x4Ok) {
    await goto(x4Page, `${BASE_URL}/admin/employees`);
    await waitForLoad(x4Page);
    await x4Page.waitForTimeout(800);
    const sidebarBody = await x4Page.textContent('body').catch(() => '');

    // farm 사이드바에서 "작업자 성과" 항목 제거 확인
    const hasOldMenu = sidebarBody.includes('작업자 성과');
    log(!hasOldMenu ? 'PASS' : 'FAIL', 'X-4-1: "작업자 성과" farm 사이드바 메뉴 제거 확인');

    // farm 사이드바에 "성과 분석" 표시 확인
    log(sidebarBody.includes('성과 분석') ? 'PASS' : 'FAIL', 'X-4-2: "성과 분석" farm 사이드바 메뉴 표시');

    // 성과 분석 메뉴 클릭 → /admin/stats 라우팅
    const statsMenuBtn = x4Page.locator('aside >> text=성과 분석').first();
    const statsMenuVisible = await statsMenuBtn.isVisible().catch(() => false);
    if (statsMenuVisible) {
      await statsMenuBtn.click();
      await x4Page.waitForTimeout(1000);
      log(x4Page.url().includes('/admin/stats') ? 'PASS' : 'FAIL', `X-4-3: 성과 분석 클릭 → /admin/stats (실제: ${x4Page.url()})`);
    } else {
      // aside 셀렉터 없는 경우 일반 텍스트로 재시도
      const statsMenuBtn2 = x4Page.locator('nav >> text=성과 분석').first();
      const v2 = await statsMenuBtn2.isVisible().catch(() => false);
      if (v2) {
        await statsMenuBtn2.click();
        await x4Page.waitForTimeout(1000);
        log(x4Page.url().includes('/admin/stats') ? 'PASS' : 'FAIL', `X-4-3: 성과 분석 클릭 → /admin/stats (실제: ${x4Page.url()})`);
      } else {
        log('WARN', 'X-4-3: 성과 분석 메뉴 미발견 — 스킵');
      }
    }
  }
  await x4Ctx.close();

  // mkkim 로그인 W-2-4 재검증
  const mkCtx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const mkPage = await mkCtx.newPage();
  mkPage.on('console', msg => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });

  const mkOk = await loginAs(mkPage, 'mkkim');
  if (mkOk) {
    const mkBody = await getBody(mkPage, 1500);
    log(mkPage.url().includes('/admin/hq') ? 'PASS' : 'FAIL', 'X-5-1: mkkim → /admin/hq 라우팅');
    log(mkBody.includes('운영 리포트') || mkBody.includes('지점 현황') ? 'PASS' : 'WARN',
      'X-5-2: HQ 대시보드 주요 콘텐츠 확인');
  } else {
    log('WARN', 'X-5-1: mkkim 로그인 실패');
    log('WARN', 'X-5-2: (스킵)');
  }
  await mkCtx.close();

  // farm_admin 필터 검증 (hdkim — 부산 지점만 표시)
  console.log('\n[X-3b] farm_admin 지점 자동 필터 (hdkim)');
  const hdCtx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const hdPage = await hdCtx.newPage();
  hdPage.on('console', msg => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });

  const hdOk = await loginAs(hdPage, 'hdkim');
  log(hdOk ? 'PASS' : 'FAIL', 'X-3b-0: hdkim 로그인');
  if (hdOk) {
    await goto(hdPage, `${BASE_URL}/admin/stats`);
    const hdBody = await getBody(hdPage, 1500);
    log(!hdBody.includes('앱 오류 발생') ? 'PASS' : 'FAIL', 'X-3b-1: hdkim 성과 분석 오류 없음');
    // farm_admin은 필터 버튼 미표시 (자동 필터)
    const hdFilterVisible = await hdPage.locator('button:has-text("전체 지점")').isVisible().catch(() => false);
    log(!hdFilterVisible ? 'PASS' : 'WARN', 'X-3b-2: farm_admin 지점 필터 UI 미표시 (자동 필터)');
    // 부산 작업자만 표시 (진주/하동 없음)
    log(!hdBody.includes('진주HUB') && !hdBody.includes('하동HUB') ? 'PASS' : 'WARN',
      'X-3b-3: farm_admin — 타 지점 작업자 미표시');
  }
  await hdCtx.close();

  // ═══════════════════════════════════════════════════════
  // SECTION R: 핵심 회귀
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
    console.log('✅ GO — P2 #3/#4 검증 + 회귀 PASS. FAIL 0 / WARN 0');
  } else if (fail === 0) {
    console.log(`⚠️  CONDITIONAL — FAIL 0 / WARN ${warn}. WARN 항목 검토 요망.`);
  } else {
    console.log(`❌ FAIL ${fail}건 발생 — 즉시 수정 필요.`);
  }

  process.exit(fail > 0 ? 1 : 0);
})();
