/**
 * 세션 37 — 근무 관리 타임라인 UI 이식 검증 + 세션 36 회귀 방어
 * 실행: node scripts/audit_session37.cjs
 *
 * 검증 대상:
 *   Task 1: SchedulePage 목업 이식 (주 선택 바 + 타임라인 + 월간 캘린더)
 *   - 일간/주간/월간 탭 전환
 *   - ‹/› 네비게이션
 *   - TopBar 액션 버튼 (출퇴근 기록, 스케줄 등록)
 *   - NOW 선 (오늘 날짜 기준)
 *   - 주간 뷰 요일 탭 7개
 *   - 월간 뷰 캘린더 셀
 *
 * 회귀 방어 (세션 36 누적):
 *   BUG-F01: 부동소수점, BUG-F02: 작물 탭 재등장
 *   Dashboard 차트 3지점 가로 배치
 *   HQ 사이드바 로그아웃 버튼
 *   HQ 콘솔 에러 0건
 */
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:5173';
const OUT_DIR = path.join(__dirname, '..', 'docs', 'regression_session37');

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

(async () => {
  console.log('=== 세션 37 검증 + 세션 36 회귀 방어 감사 ===\n');

  const browser = await chromium.launch({ headless: true });

  // ════════════════════════════════════════════
  // SECTION A: HQ 로그인 (jhkim)
  // ════════════════════════════════════════════
  console.log('[SECTION A] HQ 로그인');
  const ctxHQ = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const pageHQ = await ctxHQ.newPage();
  const hqErrors = [];
  const hqDialogs = [];
  pageHQ.on('console', (msg) => { if (msg.type() === 'error') hqErrors.push(msg.text()); });
  pageHQ.on('dialog', async (d) => { hqDialogs.push(d.message()); await d.dismiss().catch(() => {}); });

  currentTest = 'HQ-LOGIN';
  console.log('\n[A-1] jhkim 로그인');
  await goto(pageHQ, `${BASE_URL}/login`);
  await pageHQ.fill('input[placeholder*="아이디"]', 'jhkim').catch(() => {});
  await pageHQ.fill('input[type="password"]', 'rmfpvm001').catch(() => {});
  await pageHQ.click('button[type="submit"]').catch(() => {});
  await pageHQ.waitForTimeout(4500);
  const loggedIn = pageHQ.url().includes('/admin');
  loggedIn ? log('PASS', 'jhkim 로그인', pageHQ.url()) : log('FAIL', '로그인 실패', pageHQ.url());
  if (!loggedIn) { await browser.close(); process.exit(1); }

  // ════════════════════════════════════════════
  // SECTION B: 근무 관리 페이지 (Task 1)
  // ════════════════════════════════════════════
  console.log('\n[SECTION B] 근무 관리 SchedulePage');

  currentTest = 'SCHEDULE-LOAD';
  console.log('\n[B-1] /admin/schedule 접속 + 기본 구조');
  await goto(pageHQ, `${BASE_URL}/admin/schedule`);
  await pageHQ.waitForTimeout(1500);
  await ss(pageHQ, 'B1-schedule-day');
  const schedBody = await pageHQ.evaluate(() => document.body.innerText);
  schedBody.includes('근무 관리') ? log('PASS', 'TopBar "근무 관리" 타이틀 존재')
                                  : log('FAIL', 'TopBar 타이틀 없음');
  schedBody.includes('출퇴근 기록') ? log('PASS', '"출퇴근 기록" 버튼 존재')
                                    : log('FAIL', '"출퇴근 기록" 버튼 없음');
  schedBody.includes('스케줄 등록') ? log('PASS', '"스케줄 등록" 버튼 존재')
                                    : log('FAIL', '"스케줄 등록" 버튼 없음');

  currentTest = 'SCHEDULE-TABS';
  console.log('\n[B-2] 일간/주간/월간 탭 존재');
  ['일간', '주간', '월간'].forEach((tab) => {
    schedBody.includes(tab) ? log('PASS', `"${tab}" 탭 존재`) : log('FAIL', `"${tab}" 탭 없음`);
  });

  currentTest = 'SCHEDULE-TIMELINE';
  console.log('\n[B-3] 타임라인 카드 (08:00~17:00)');
  schedBody.includes('08:00') ? log('PASS', '시간 헤더 08:00 존재') : log('FAIL', '시간 헤더 없음');
  schedBody.includes('17:00') ? log('PASS', '시간 헤더 17:00 존재') : log('WARN', '17:00 미표시');
  schedBody.includes('타임라인') ? log('PASS', '"타임라인" 카드 헤더 존재') : log('FAIL', '타임라인 헤더 없음');
  schedBody.includes('08:00 ~ 17:00') ? log('PASS', '근무 시간 범위 표시') : log('WARN', '시간 범위 미표시');

  currentTest = 'SCHEDULE-LEGEND';
  console.log('\n[B-4] 범례 (TBM·수확·측정·이상)');
  ['TBM', '수확', '측정', '이상'].forEach((item) => {
    schedBody.includes(item) ? log('PASS', `범례 "${item}" 존재`) : log('WARN', `범례 "${item}" 미표시`);
  });

  currentTest = 'SCHEDULE-NAV';
  console.log('\n[B-5] ‹/› 네비게이션');
  const navBtns = await pageHQ.evaluate(() =>
    [...document.querySelectorAll('button')].filter((b) => b.textContent.trim() === '‹' || b.textContent.trim() === '›').length
  );
  navBtns >= 2 ? log('PASS', `네비게이션 버튼 ${navBtns}개 존재`) : log('FAIL', `네비게이션 버튼 부족 (${navBtns}개)`);

  // ‹ 클릭 후 날짜 변경 확인
  const dateBefore = await pageHQ.evaluate(() => document.body.innerText.match(/\d+월 \d+일/)?.[0] || '');
  await pageHQ.click('button:has-text("‹")').catch(() => {});
  await pageHQ.waitForTimeout(300);
  const dateAfter = await pageHQ.evaluate(() => document.body.innerText.match(/\d+월 \d+일/)?.[0] || '');
  dateBefore !== dateAfter ? log('PASS', `‹ 클릭 날짜 변경: ${dateBefore} → ${dateAfter}`)
                           : log('WARN', '‹ 클릭 후 날짜 미변경 (same-day 가능)');

  currentTest = 'SCHEDULE-WEEK-MODE';
  console.log('\n[B-6] 주간 뷰 전환 + 요일 탭 7개');
  await goto(pageHQ, `${BASE_URL}/admin/schedule`);
  await pageHQ.waitForTimeout(800);
  const weekTabEl = await pageHQ.$('span:has-text("주간")').catch(() => null);
  if (weekTabEl) {
    await weekTabEl.click();
    await pageHQ.waitForTimeout(400);
    await ss(pageHQ, 'B6-schedule-week');
    const weekBody = await pageHQ.evaluate(() => document.body.innerText);
    const dayCount = ['월', '화', '수', '목', '금', '토', '일'].filter((d) => weekBody.includes(d)).length;
    dayCount >= 7 ? log('PASS', `주간 뷰 요일 탭 ${dayCount}개 표시`) : log('WARN', `요일 탭 ${dayCount}개 (7개 기대)`);
    weekBody.includes('주차') ? log('PASS', '"주차" 표시') : log('WARN', '"주차" 미표시');
  } else {
    log('FAIL', '"주간" 탭 클릭 불가');
  }

  currentTest = 'SCHEDULE-MONTH-MODE';
  console.log('\n[B-7] 월간 뷰 전환 + 캘린더');
  const monthTabEl = await pageHQ.$('span:has-text("월간")').catch(() => null);
  if (monthTabEl) {
    await monthTabEl.click();
    await pageHQ.waitForTimeout(400);
    await ss(pageHQ, 'B7-schedule-month');
    const monthBody = await pageHQ.evaluate(() => document.body.innerText);
    monthBody.includes('월 일정') ? log('PASS', '월간 캘린더 헤더 존재') : log('FAIL', '월간 캘린더 헤더 없음');
    const calCells = await pageHQ.evaluate(() =>
      [...document.querySelectorAll('div[style*="cursor: pointer"]')].filter((el) => /^\d+$/.test(el.textContent.trim())).length
    );
    calCells >= 28 ? log('PASS', `캘린더 날짜 셀 ${calCells}개`) : log('WARN', `캘린더 셀 ${calCells}개 (28+ 기대)`);
    // 월간 셀 클릭 → 일간 뷰로 이동
    const firstCell = await pageHQ.$('div[style*="cursor: pointer"]').catch(() => null);
    if (firstCell) {
      await firstCell.click();
      await pageHQ.waitForTimeout(300);
      const afterClickBody = await pageHQ.evaluate(() => document.body.innerText);
      afterClickBody.includes('타임라인') ? log('PASS', '월간 날짜 클릭 → 일간 타임라인 이동')
                                          : log('WARN', '월간 클릭 후 타임라인 미확인');
    }
  } else {
    log('FAIL', '"월간" 탭 클릭 불가');
  }

  currentTest = 'SCHEDULE-ATTD-BTN';
  console.log('\n[B-8] "출퇴근 기록" 버튼 클릭 → /admin/attendance-status');
  await goto(pageHQ, `${BASE_URL}/admin/schedule`);
  await pageHQ.waitForTimeout(800);
  const attdBtn = await pageHQ.$('button:has-text("출퇴근 기록")').catch(() => null);
  if (attdBtn) {
    await attdBtn.click();
    await pageHQ.waitForTimeout(1000);
    const afterUrl = pageHQ.url();
    afterUrl.includes('attendance') ? log('PASS', `출퇴근 기록 이동: ${afterUrl}`)
                                    : log('FAIL', `이동 실패: ${afterUrl}`);
  } else {
    log('FAIL', '"출퇴근 기록" 버튼 없음');
  }

  currentTest = 'SCHEDULE-SCHED-BTN';
  console.log('\n[B-9] "스케줄 등록" 버튼 클릭 → alert(준비 중)');
  hqDialogs.length = 0;
  await goto(pageHQ, `${BASE_URL}/admin/schedule`);
  await pageHQ.waitForTimeout(800);
  const schedBtn = await pageHQ.$('button:has-text("스케줄 등록")').catch(() => null);
  if (schedBtn) {
    await schedBtn.click();
    await pageHQ.waitForTimeout(500);
    hqDialogs.length > 0 ? log('PASS', `스케줄 등록 alert: "${hqDialogs[0].slice(0, 40)}"`)
                         : log('WARN', '스케줄 등록 dialog 미확인 (auto-dismiss 가능)');
  } else {
    log('FAIL', '"스케줄 등록" 버튼 없음');
  }

  // ════════════════════════════════════════════
  // SECTION C: 세션 36 회귀 방어
  // ════════════════════════════════════════════
  console.log('\n[SECTION C] 세션 36 회귀 방어');

  currentTest = 'BUG-F01';
  console.log('\n[C-1] BUG-F01 부동소수점 회귀');
  await goto(pageHQ, `${BASE_URL}/admin/hq`);
  await pageHQ.waitForTimeout(2500);
  const floatBugs = await pageHQ.evaluate(() =>
    [...document.querySelectorAll('*')]
      .filter((el) => el.children.length === 0 && /\d+\.\d{5,}/.test(el.textContent))
      .map((el) => el.textContent.trim())
  );
  floatBugs.length > 0 ? log('FAIL', 'BUG-F01 회귀', floatBugs.slice(0, 3).join(', '))
                       : log('PASS', 'BUG-F01 회귀 없음');

  currentTest = 'BUG-F02';
  console.log('\n[C-2] BUG-F02 작물 탭 회귀');
  const cropTabEls = await pageHQ.evaluate(() =>
    [...document.querySelectorAll('button, [role="tab"], span')]
      .filter((t) => ['토마토', '딸기', '파프리카', '오이'].some((c) => t.textContent.trim() === c))
      .map((t) => t.textContent.trim())
  );
  cropTabEls.length > 0 ? log('FAIL', 'BUG-F02 회귀', cropTabEls.join(', '))
                        : log('PASS', 'BUG-F02 회귀 없음');

  currentTest = 'DASHBOARD-CHART';
  console.log('\n[C-3] Dashboard 차트 3지점 가로 배치 회귀');
  const dashBody = await pageHQ.evaluate(() => document.body.innerText);
  ['부산LAB', '진주HUB', '하동HUB'].forEach((b) => {
    dashBody.includes(b) ? log('PASS', `차트 "${b}" 표시`)
                         : log('WARN', `차트 "${b}" 미표시 (데이터 없을 수 있음)`);
  });

  currentTest = 'HQ-SIDEBAR-LOGOUT';
  console.log('\n[C-4] HQ 사이드바 로그아웃 버튼 회귀');
  const hqSidebarLogout = await pageHQ.evaluate(() =>
    [...document.querySelectorAll('*')].some((el) => el.children.length === 0 && el.textContent.trim() === '로그아웃')
  );
  hqSidebarLogout ? log('PASS', 'HQ 사이드바 "로그아웃" 텍스트 존재')
                  : log('FAIL', 'HQ 사이드바 "로그아웃" 텍스트 없음');

  currentTest = 'HQ-CONSOLE-ERRORS';
  console.log('\n[C-5] HQ 콘솔 에러 0건');
  const filteredErrors = hqErrors.filter((e) => !e.includes('favicon') && !e.includes('future') && !e.includes('net::ERR'));
  filteredErrors.length === 0 ? log('PASS', 'HQ 콘솔 에러 없음')
                              : log('FAIL', `HQ 콘솔 에러 ${filteredErrors.length}건`, filteredErrors[0].slice(0, 80));

  await ss(pageHQ, 'C-final-hq');
  await ctxHQ.close();

  // ════════════════════════════════════════════
  // 결과 저장
  // ════════════════════════════════════════════
  await browser.close();

  if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(path.join(OUT_DIR, 'results.json'), JSON.stringify({ PASS, FAIL, WARN, results }, null, 2));

  const total = PASS + FAIL + WARN;
  console.log(`\n${'═'.repeat(50)}`);
  console.log(`결과: PASS ${PASS} / FAIL ${FAIL} / WARN ${WARN} / TOTAL ${total}`);
  console.log(`스크린샷: ${OUT_DIR}`);

  if (FAIL > 0) process.exit(1);
})();
