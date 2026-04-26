// 세션 63 — Tier 4 내보내기 기능 검증 + 회귀
// Section V: FARM-DASH-EXPORT-001 + HQ-APPROVAL-EXPORT-001 버튼 진입점
// Section R: 핵심 라우트 회귀 (세션 62 패턴 유지)
// Section S: 콘솔 에러 0건
const { chromium } = require('playwright');
const path = require('path');
const fs   = require('fs');
const os   = require('os');

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
  console.log('=== 세션 63 Tier 4 내보내기 검증 + 회귀 ===\n');
  const browser = await chromium.launch({ headless: true });
  const consoleErrors = [];

  // ═══════════════════════════════════════════════════════
  // SECTION V: Tier 4 내보내기 기능 검증
  // ═══════════════════════════════════════════════════════
  console.log('[SECTION V] Tier 4 내보내기 버튼 검증');

  const expCtx = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    acceptDownloads: true,
  });
  const expPage = await expCtx.newPage();
  expPage.on('console', msg => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });

  const vOk = await loginAs(expPage, 'jhkim');
  log(vOk ? 'PASS' : 'FAIL', 'V-0: jhkim 로그인');

  if (vOk) {
    // ─ V-1: HQ-APPROVAL-EXPORT-001 ─
    console.log('\n[V-1] HQ-APPROVAL-EXPORT-001 — 승인 허브 내보내기');
    await goto(expPage, `${BASE_URL}/admin/hq/approvals`);
    const apBody = await getBody(expPage, 1200);
    log(!apBody.includes('앱 오류 발생') ? 'PASS' : 'FAIL', 'V-1-1: 승인 허브 오류 없음');
    log(apBody.includes('승인 허브') ? 'PASS' : 'WARN', 'V-1-2: "승인 허브" 타이틀');

    // 버튼 존재 확인
    const exportBtn = expPage.locator('button:has-text("내보내기")').first();
    const btnVisible = await exportBtn.isVisible().catch(() => false);
    log(btnVisible ? 'PASS' : 'FAIL', 'V-1-3: "내보내기" 버튼 표시');

    // 다운로드 이벤트 캡처
    if (btnVisible) {
      const [download] = await Promise.all([
        expPage.waitForEvent('download', { timeout: 10000 }).catch(() => null),
        exportBtn.click(),
      ]);

      if (download) {
        const fname = download.suggestedFilename();
        log(fname.startsWith('gref_승인내역_') && fname.endsWith('.xlsx') ? 'PASS' : 'WARN', `V-1-4: 파일명 형식 (${fname})`);

        // 파일 저장 후 크기 확인
        const tmpPath = path.join(os.tmpdir(), fname);
        await download.saveAs(tmpPath);
        const stat = fs.statSync(tmpPath);
        log(stat.size > 1000 ? 'PASS' : 'FAIL', `V-1-5: 파일 크기 양호 (${stat.size}bytes)`);
        fs.unlinkSync(tmpPath);
      } else {
        log('FAIL', 'V-1-4: 다운로드 이벤트 없음 — alert 처리 가능성');
        log('FAIL', 'V-1-5: (V-1-4 실패로 스킵)');
      }
    } else {
      log('FAIL', 'V-1-4: (V-1-3 실패로 스킵)');
      log('FAIL', 'V-1-5: (V-1-3 실패로 스킵)');
    }

    // ─ V-2: FARM-DASH-EXPORT-001 ─
    console.log('\n[V-2] FARM-DASH-EXPORT-001 — 재배팀 대시보드 내보내기');

    // farm_admin으로 전환
    await goto(expPage, `${BASE_URL}/login`);
    await expPage.waitForTimeout(1000);
    await expPage.fill('input[placeholder*="아이디"]', 'hdkim').catch(() => {});
    await expPage.fill('input[type="password"]', 'rmfpvm001').catch(() => {});
    await expPage.click('button[type="submit"]').catch(() => {});
    await expPage.waitForTimeout(5000);

    await goto(expPage, `${BASE_URL}/admin`);
    const dbBody = await getBody(expPage, 1200);
    log(!dbBody.includes('앱 오류 발생') ? 'PASS' : 'FAIL', 'V-2-1: 재배팀 대시보드 오류 없음');

    const dashExportBtn = expPage.locator('button:has-text("내보내기")').first();
    const dashBtnVisible = await dashExportBtn.isVisible().catch(() => false);
    log(dashBtnVisible ? 'PASS' : 'FAIL', 'V-2-2: "내보내기" 버튼 표시');

    if (dashBtnVisible) {
      const [download2] = await Promise.all([
        expPage.waitForEvent('download', { timeout: 10000 }).catch(() => null),
        dashExportBtn.click(),
      ]);

      if (download2) {
        const fname2 = download2.suggestedFilename();
        log(fname2.startsWith('gref_대시보드_') && fname2.endsWith('.xlsx') ? 'PASS' : 'WARN', `V-2-3: 파일명 형식 (${fname2})`);

        const tmpPath2 = path.join(os.tmpdir(), fname2);
        await download2.saveAs(tmpPath2);
        const stat2 = fs.statSync(tmpPath2);
        log(stat2.size > 1000 ? 'PASS' : 'FAIL', `V-2-4: 파일 크기 양호 (${stat2.size}bytes)`);
        fs.unlinkSync(tmpPath2);
      } else {
        log('FAIL', 'V-2-3: 다운로드 이벤트 없음 — alert 처리 가능성');
        log('FAIL', 'V-2-4: (V-2-3 실패로 스킵)');
      }
    } else {
      log('FAIL', 'V-2-3: (V-2-2 실패로 스킵)');
      log('FAIL', 'V-2-4: (V-2-2 실패로 스킵)');
    }
  }
  await expCtx.close();

  // ═══════════════════════════════════════════════════════
  // SECTION R: 핵심 회귀 (세션 62 패턴 — 기존 기능 이상 없음 확인)
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
      ['/admin/hq/approvals', '승인 허브'],
      ['/admin/hq/finance',   '경영 지표'],
      ['/admin/hq/employees', '직원'],
      ['/admin/employees',    '직원 관리'],
      ['/admin/tasks',        '작업 칸반'],
      ['/admin/leave',        '휴가 신청 관리'],
      ['/admin/notices',      null],
      ['/admin/schedule',     null],
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
    console.log('✅ GO — Tier 4 검증 + 회귀 PASS. FAIL 0 / WARN 0');
  } else if (fail === 0) {
    console.log(`⚠️  CONDITIONAL — FAIL 0 / WARN ${warn}. WARN 항목 검토 요망.`);
  } else {
    console.log(`❌ FAIL ${fail}건 발생 — 즉시 수정 필요.`);
  }

  process.exit(fail > 0 ? 1 : 0);
})();
