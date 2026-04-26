// 세션 64 — Tier 4 잔여 4건 검증 + 회귀
// V-3: HQ-BRANCH-CONTACT-001 (연락처 모달)
// V-4: HQ-REPORT-EXPORT-001 (HQ 리포트 XLSX)
// V-5: HQ-CROP-REPORT-001 (작물 보고서 XLSX)
// V-6: HQ-FINANCE-PDF-EXPORT-001 (window.print 호출)
// R: 핵심 라우트 회귀
// S: 콘솔 에러
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
  console.log('=== 세션 64 Tier 4 잔여 4건 검증 + 회귀 ===\n');
  const browser = await chromium.launch({ headless: true });
  const consoleErrors = [];

  // ═══════════════════════════════════════════════════════
  // SECTION V: Tier 4 기능 검증
  // ═══════════════════════════════════════════════════════
  console.log('[SECTION V] Tier 4 기능 검증');

  const expCtx = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    acceptDownloads: true,
  });
  const expPage = await expCtx.newPage();
  expPage.on('console', msg => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });

  const vOk = await loginAs(expPage, 'jhkim');
  log(vOk ? 'PASS' : 'FAIL', 'V-0: jhkim 로그인');

  if (vOk) {
    // ─ V-3: HQ-BRANCH-CONTACT-001 ─
    console.log('\n[V-3] HQ-BRANCH-CONTACT-001 — 지점 연락처 모달');
    await goto(expPage, `${BASE_URL}/admin/hq/branches`);
    const brBody = await getBody(expPage, 1200);
    log(!brBody.includes('앱 오류 발생') ? 'PASS' : 'FAIL', 'V-3-1: 지점 관리 오류 없음');
    log(brBody.includes('지점 관리') ? 'PASS' : 'WARN', 'V-3-2: "지점 관리" 타이틀');

    const contactBtn = expPage.locator('button:has-text("연락")').first();
    const contactBtnVisible = await contactBtn.isVisible().catch(() => false);
    log(contactBtnVisible ? 'PASS' : 'FAIL', 'V-3-3: "연락" 버튼 표시');

    if (contactBtnVisible) {
      await contactBtn.click();
      await expPage.waitForTimeout(500);
      const modalBody = await expPage.textContent('body').catch(() => '');
      log(modalBody.includes('지점 연락처') ? 'PASS' : 'FAIL', 'V-3-4: 연락처 모달 열림');
      log(modalBody.includes('지점장') ? 'PASS' : 'WARN', 'V-3-5: 지점장 정보 표시');
      log(modalBody.includes('직원 수') ? 'PASS' : 'WARN', 'V-3-6: 직원수 정보 표시');

      // 모달 닫기 (× 버튼)
      const closeBtn = expPage.locator('button:has-text("×")').first();
      const closeBtnVisible = await closeBtn.isVisible().catch(() => false);
      if (closeBtnVisible) {
        await closeBtn.click();
        await expPage.waitForTimeout(300);
        const afterClose = await expPage.textContent('body').catch(() => '');
        log(!afterClose.includes('지점 연락처') ? 'PASS' : 'FAIL', 'V-3-7: 모달 닫힘 확인');
      } else {
        log('WARN', 'V-3-7: × 버튼 미발견 — 오버레이 클릭으로 스킵');
      }
    } else {
      log('FAIL', 'V-3-4: (V-3-3 실패로 스킵)');
      log('FAIL', 'V-3-5: (V-3-3 실패로 스킵)');
      log('FAIL', 'V-3-6: (V-3-3 실패로 스킵)');
      log('FAIL', 'V-3-7: (V-3-3 실패로 스킵)');
    }

    // ─ V-4: HQ-REPORT-EXPORT-001 ─
    console.log('\n[V-4] HQ-REPORT-EXPORT-001 — HQ 리포트 XLSX');
    await goto(expPage, `${BASE_URL}/admin/hq`);
    const hqBody = await getBody(expPage, 1200);
    log(!hqBody.includes('앱 오류 발생') ? 'PASS' : 'FAIL', 'V-4-1: HQ 대시보드 오류 없음');

    const reportBtn = expPage.locator('button:has-text("리포트 내보내기")').first();
    const reportBtnVisible = await reportBtn.isVisible().catch(() => false);
    log(reportBtnVisible ? 'PASS' : 'FAIL', 'V-4-2: "리포트 내보내기" 버튼 표시');

    if (reportBtnVisible) {
      const [dl4] = await Promise.all([
        expPage.waitForEvent('download', { timeout: 10000 }).catch(() => null),
        reportBtn.click(),
      ]);
      if (dl4) {
        const fname4 = dl4.suggestedFilename();
        log(fname4.startsWith('gref_HQ리포트_') && fname4.endsWith('.xlsx') ? 'PASS' : 'WARN', `V-4-3: 파일명 (${fname4})`);
        const tmpPath4 = path.join(os.tmpdir(), fname4);
        await dl4.saveAs(tmpPath4);
        const stat4 = fs.statSync(tmpPath4);
        log(stat4.size > 1000 ? 'PASS' : 'FAIL', `V-4-4: 파일 크기 양호 (${stat4.size}bytes)`);
        fs.unlinkSync(tmpPath4);
      } else {
        log('FAIL', 'V-4-3: 다운로드 이벤트 없음');
        log('FAIL', 'V-4-4: (V-4-3 실패로 스킵)');
      }
    } else {
      log('FAIL', 'V-4-3: (V-4-2 실패로 스킵)');
      log('FAIL', 'V-4-4: (V-4-2 실패로 스킵)');
    }

    // ─ V-5: HQ-CROP-REPORT-001 ─
    console.log('\n[V-5] HQ-CROP-REPORT-001 — 작물 보고서 XLSX');
    // "보고서 열기" 는 span (click event)
    // getByText(exact:true) → inner span만 타겟 (outer span 제외)
    const cropReportLink = expPage.getByText('보고서 열기', { exact: true });
    const cropVisible = await cropReportLink.isVisible().catch(() => false);
    log(cropVisible ? 'PASS' : 'WARN', 'V-5-1: "보고서 열기" 링크 표시');

    if (cropVisible) {
      await cropReportLink.scrollIntoViewIfNeeded().catch(() => {});
      const [dl5] = await Promise.all([
        expPage.waitForEvent('download', { timeout: 10000 }).catch(() => null),
        cropReportLink.click(),
      ]);
      if (dl5) {
        const fname5 = dl5.suggestedFilename();
        log(fname5.startsWith('gref_작물보고서_') && fname5.endsWith('.xlsx') ? 'PASS' : 'WARN', `V-5-2: 파일명 (${fname5})`);
        const tmpPath5 = path.join(os.tmpdir(), fname5);
        await dl5.saveAs(tmpPath5);
        const stat5 = fs.statSync(tmpPath5);
        log(stat5.size > 500 ? 'PASS' : 'FAIL', `V-5-3: 파일 크기 양호 (${stat5.size}bytes)`);
        fs.unlinkSync(tmpPath5);
      } else {
        log('FAIL', 'V-5-2: 다운로드 이벤트 없음');
        log('FAIL', 'V-5-3: (V-5-2 실패로 스킵)');
      }
    } else {
      log('FAIL', 'V-5-2: (V-5-1 실패로 스킵)');
      log('FAIL', 'V-5-3: (V-5-1 실패로 스킵)');
    }

    // ─ V-6: HQ-FINANCE-PDF-EXPORT-001 ─
    console.log('\n[V-6] HQ-FINANCE-PDF-EXPORT-001 — window.print() 호출');
    await goto(expPage, `${BASE_URL}/admin/hq/finance`);
    const finBody = await getBody(expPage, 1200);
    log(!finBody.includes('앱 오류 발생') ? 'PASS' : 'FAIL', 'V-6-1: 경영 지표 페이지 오류 없음');
    log(finBody.includes('경영 지표') || finBody.includes('재무') ? 'PASS' : 'WARN', 'V-6-2: 재무 페이지 타이틀');

    const pdfBtn = expPage.locator('button:has-text("PDF 내보내기")').first();
    const pdfBtnVisible = await pdfBtn.isVisible().catch(() => false);
    log(pdfBtnVisible ? 'PASS' : 'FAIL', 'V-6-3: "PDF 내보내기" 버튼 표시');

    if (pdfBtnVisible) {
      // window.print()는 headless에서 no-op — dialog 이벤트 없음. 에러 없으면 PASS
      let printError = false;
      expPage.once('pageerror', () => { printError = true; });
      await pdfBtn.click();
      await expPage.waitForTimeout(1000);
      log(!printError ? 'PASS' : 'FAIL', 'V-6-4: window.print() 호출 — 에러 없음');
    } else {
      log('FAIL', 'V-6-4: (V-6-3 실패로 스킵)');
    }
  }
  await expCtx.close();

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
      ['/admin/hq',             '운영 리포트'],
      ['/admin/hq/branches',    '지점 관리'],
      ['/admin/hq/approvals',   '승인 허브'],
      ['/admin/hq/finance',     '경영 지표'],
      ['/admin/hq/employees',   '직원'],
      ['/admin/employees',      '직원 관리'],
      ['/admin/tasks',          '작업 칸반'],
      ['/admin/leave',          '휴가 신청 관리'],
      ['/admin/notices',        null],
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
    console.log('✅ GO — Tier 4 잔여 4건 검증 + 회귀 PASS. FAIL 0 / WARN 0');
  } else if (fail === 0) {
    console.log(`⚠️  CONDITIONAL — FAIL 0 / WARN ${warn}. WARN 항목 검토 요망.`);
  } else {
    console.log(`❌ FAIL ${fail}건 발생 — 즉시 수정 필요.`);
  }

  process.exit(fail > 0 ? 1 : 0);
})();
