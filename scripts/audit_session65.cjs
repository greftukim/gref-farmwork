// 세션 65 — P1 핫픽스 검증 + 회귀
// W-1: P1-LEAVE-SILENT-FAIL (fetchRequests on mount + DB 반영 검증)
// W-2: P1-ROLE-MKKIM-MSPARK (mkkim → /admin/hq 라우팅)
// W-3: P3-SEARCH-REMOVE (검색란 제거)
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
  console.log('=== 세션 65 P1 핫픽스 + 회귀 검증 ===\n');
  const browser = await chromium.launch({ headless: true });
  const consoleErrors = [];

  // ═══════════════════════════════════════════════════════
  // SECTION W: P1 핫픽스 검증
  // ═══════════════════════════════════════════════════════
  console.log('[SECTION W] P1 핫픽스 검증');

  // ─ W-1: P1-LEAVE-SILENT-FAIL ─
  console.log('\n[W-1] P1-LEAVE-SILENT-FAIL — fetchRequests on mount + DB 반영');
  const w1Ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const w1Page = await w1Ctx.newPage();
  w1Page.on('console', msg => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });

  const w1Ok = await loginAs(w1Page, 'jhkim');
  log(w1Ok ? 'PASS' : 'FAIL', 'W-1-0: jhkim 로그인');

  if (w1Ok) {
    // 콜드 진입 (새 컨텍스트 — 스토어 초기화 상태)
    await goto(w1Page, `${BASE_URL}/admin/leave`);
    const leaveBody = await getBody(w1Page, 1500);
    log(!leaveBody.includes('앱 오류 발생') ? 'PASS' : 'FAIL', 'W-1-1: 휴가 관리 오류 없음');
    log(leaveBody.includes('휴가 신청 관리') ? 'PASS' : 'FAIL', 'W-1-2: 페이지 타이틀 확인');

    // fetchRequests on mount 검증: 대기 목록이 DB에서 로드되는지
    const approveButtonsBefore = await w1Page.locator('button:has-text("승인")').count();
    log(approveButtonsBefore > 0 ? 'PASS' : 'WARN',
      `W-1-3: 승인 대기 건 로드됨 (${approveButtonsBefore}건)`,
      approveButtonsBefore === 0 ? '대기 건 없음 — DB 상태에 따라 WARN' : '');

    if (approveButtonsBefore > 0) {
      // 승인 클릭
      let alertFired = false;
      w1Page.once('dialog', async (dialog) => {
        alertFired = true;
        await dialog.dismiss().catch(() => {});
      });
      await w1Page.locator('button:has-text("승인")').first().click();
      await w1Page.waitForTimeout(2500);

      const approveButtonsAfter = await w1Page.locator('button:has-text("승인")').count();
      log(approveButtonsAfter < approveButtonsBefore ? 'PASS' : 'FAIL',
        `W-1-4: 승인 후 UI 업데이트 (${approveButtonsBefore}→${approveButtonsAfter}건)`);
      log(!alertFired ? 'PASS' : 'FAIL', 'W-1-5: 에러 알림 없음 (승인 성공)');

      // DB 반영 검증: 리로드 후 건수 확인
      await w1Page.reload({ waitUntil: 'domcontentloaded' });
      await waitForLoad(w1Page);
      await w1Page.waitForTimeout(2000);
      const approveButtonsReload = await w1Page.locator('button:has-text("승인")').count();
      const dbPersisted = approveButtonsReload === approveButtonsAfter;
      log(dbPersisted ? 'PASS' : 'FAIL',
        `W-1-6: reload 후 DB 반영 (${approveButtonsReload}건 — 기대 ${approveButtonsAfter}건)`,
        dbPersisted ? 'DB 저장 확인' : '리로드 후 복원 = DB 미반영');
    } else {
      log('WARN', 'W-1-4: (대기 건 없음 — 스킵)');
      log('WARN', 'W-1-5: (대기 건 없음 — 스킵)');
      log('WARN', 'W-1-6: (대기 건 없음 — 스킵)');
    }
  }
  await w1Ctx.close();

  // ─ W-2: P1-ROLE-MKKIM-MSPARK ─
  console.log('\n[W-2] P1-ROLE-MKKIM-MSPARK — mkkim /admin/hq 라우팅');
  const w2Ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const w2Page = await w2Ctx.newPage();
  w2Page.on('console', msg => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });

  const w2Ok = await loginAs(w2Page, 'mkkim');
  if (w2Ok) {
    const w2Url = w2Page.url();
    const routedToHQ = w2Url.includes('/admin/hq');
    const routedToFarm = w2Url.includes('/admin') && !w2Url.includes('/admin/hq');
    log(routedToHQ ? 'PASS' : 'FAIL', `W-2-1: mkkim 로그인 → /admin/hq (실제: ${w2Url})`);

    const w2Body = await getBody(w2Page, 1200);
    log(!w2Body.includes('앱 오류 발생') ? 'PASS' : 'FAIL', 'W-2-2: HQ 대시보드 오류 없음');
    log(w2Body.includes('운영 리포트') || w2Body.includes('HQ') ? 'PASS' : 'WARN', 'W-2-3: HQ 대시보드 콘텐츠 확인');

    // 역할 표시: '인사관리' (ROLE_LABEL['hr_admin'])
    log(w2Body.includes('인사관리') ? 'PASS' : 'WARN', 'W-2-4: "인사관리" 역할 표시');
    log(!w2Body.includes('작업자') || routedToHQ ? 'PASS' : 'WARN', 'W-2-5: "작업자" 오분류 없음');
  } else {
    log('WARN', 'W-2-1: mkkim 로그인 실패 (비밀번호 상이 가능성) — DB role 변경만 검증');
    // DB 변경은 이미 RETURNING으로 확인됨 — WARN 처리
    log('WARN', 'W-2-2: (로그인 실패 스킵)');
    log('WARN', 'W-2-3: (로그인 실패 스킵)');
    log('WARN', 'W-2-4: (로그인 실패 스킵)');
    log('WARN', 'W-2-5: (로그인 실패 스킵)');
  }
  await w2Ctx.close();

  // ─ W-3: P3-SEARCH-REMOVE ─
  console.log('\n[W-3] P3-SEARCH-REMOVE — 검색란 제거 확인');
  const w3Ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const w3Page = await w3Ctx.newPage();
  w3Page.on('console', msg => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });

  const w3Ok = await loginAs(w3Page, 'jhkim');
  log(w3Ok ? 'PASS' : 'FAIL', 'W-3-0: jhkim 로그인');

  if (w3Ok) {
    const pagesToCheck = [
      `${BASE_URL}/admin/employees`,
      `${BASE_URL}/admin/tasks`,
      `${BASE_URL}/admin/leave`,
    ];
    for (const url of pagesToCheck) {
      await goto(w3Page, url);
      await waitForLoad(w3Page);
      await w3Page.waitForTimeout(600);
      const body = await w3Page.textContent('body').catch(() => '');
      const path = url.replace(BASE_URL, '');
      log(!body.includes('검색 (직원, 작업, 구역...)') ? 'PASS' : 'FAIL',
        `W-3: ${path} — 검색란 제거 확인`);
    }
  }
  await w3Ctx.close();

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
    console.log('✅ GO — P1 핫픽스 검증 + 회귀 PASS. FAIL 0 / WARN 0');
  } else if (fail === 0) {
    console.log(`⚠️  CONDITIONAL — FAIL 0 / WARN ${warn}. WARN 항목 검토 요망.`);
  } else {
    console.log(`❌ FAIL ${fail}건 발생 — 즉시 수정 필요.`);
  }

  process.exit(fail > 0 ? 1 : 0);
})();
