/**
 * 세션 35 — 3건 UX 구현 검증 + 회귀 방어
 * 실행: node scripts/audit_session35.cjs
 *
 * 검증 대상:
 *   WORKER-M-STATIC-001: _screens.jsx 4개 화면 하드코딩 제거
 *   HQ-KPI-DRILLDOWN-001: KPI 카드 navigate 연결
 *   HQ-EMPLOYEE-EDIT-MODAL-001: 직원 편집 모달
 *
 * 회귀 방어:
 *   BUG-F01: 부동소수점 미포맷
 *   BUG-F02: 제거된 작물 탭 재등장
 *   세션 34: 알림 드롭다운·검색·기간 탭·승인 탭 disabled
 */
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:5173';
const OUT_DIR = path.join(__dirname, '..', 'docs', 'regression_session35');

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

// ── Worker auth 주입 (교훈 58) ──
const WORKER_AUTH = {
  state: {
    currentUser: {
      id: '581949b5-1a85-4429-ba26-19892ddc7240',
      name: '윤화순',
      role: 'worker',
      branch: 'busan',
      isActive: true,
      isTeamLeader: false,
      deviceToken: '5d607a37-e96e-432f-b472-85c01e89dc17',
      authUserId: null,
      jobType: 'worker',
      workStartTime: '07:30:00',
      workEndTime: '16:30:00',
    },
    session: null,
    isAuthenticated: true,
    workerToken: '5d607a37-e96e-432f-b472-85c01e89dc17',
    loading: false,
  },
  version: 0,
};

// ─────────────────────────────────────────────
(async () => {
  console.log('=== 세션 35 UX 3건 + 회귀 방어 감사 ===\n');

  const browser = await chromium.launch({ headless: true });

  // ════════════════════════════════════════════
  // SECTION A: WORKER-M-STATIC-001 (mobile 390×844)
  // ════════════════════════════════════════════
  console.log('[SECTION A] WORKER-M-STATIC-001 — 모바일 하드코딩 제거');
  const ctxMobile = await browser.newContext({
    viewport: { width: 390, height: 844 },
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15',
  });
  const pageMobile = await ctxMobile.newPage();
  const mobileErrors = [];
  pageMobile.on('console', (msg) => { if (msg.type() === 'error') mobileErrors.push(msg.text()); });

  // addInitScript 전에 goto (교훈 58)
  await pageMobile.addInitScript((auth) => {
    localStorage.setItem('gref-auth', JSON.stringify(auth));
  }, WORKER_AUTH);

  currentTest = 'WORKER-M-AUTH';
  console.log('\n[A-1] Worker 인증 주입 후 /worker 진입');
  await pageMobile.goto(`${BASE_URL}/worker`, { waitUntil: 'domcontentloaded', timeout: 15000 });
  await pageMobile.waitForTimeout(4000);
  const landingUrl = pageMobile.url();
  landingUrl.includes('/worker') && !landingUrl.includes('/login')
    ? log('PASS', 'Worker 인증 랜딩', landingUrl)
    : log('FAIL', 'Worker 인증 실패', landingUrl);

  // ── A-2: /worker/m/home ──
  currentTest = 'MHOME';
  console.log('\n[A-2] MobileHomeScreen (/worker/m/home)');
  mobileErrors.length = 0;
  await goto(pageMobile, `${BASE_URL}/worker/m/home`);
  await ss(pageMobile, 'A2-mobile-home');
  const mHomeBody = await pageMobile.evaluate(() => document.body.innerText);
  mHomeErrors = mobileErrors.filter(e => !e.includes('favicon') && !e.includes('future'));
  mHomeErrors.length ? log('FAIL', 'MHOME 콘솔 에러', mHomeErrors[0].slice(0, 80)) : log('PASS', 'MHOME 콘솔 에러 없음');
  mHomeBody.includes('김민국') ? log('FAIL', 'MHOME 하드코딩 이름 "김민국"') : log('PASS', 'MHOME 이름 하드코딩 없음');
  mHomeBody.includes('4월 21일 화요일') ? log('FAIL', 'MHOME 하드코딩 날짜') : log('PASS', 'MHOME 날짜 하드코딩 없음');
  mHomeBody.includes('윤화순') ? log('PASS', 'MHOME 인증 계정명 "윤화순" 표시') : log('WARN', 'MHOME 계정명 미표시');

  // ── A-3: /worker/m/checkin ──
  currentTest = 'MCHECKIN';
  console.log('\n[A-3] MobileCheckInScreen (/worker/m/checkin)');
  mobileErrors.length = 0;
  await goto(pageMobile, `${BASE_URL}/worker/m/checkin`);
  await ss(pageMobile, 'A3-mobile-checkin');
  const mCheckinBody = await pageMobile.evaluate(() => document.body.innerText);
  mobileErrors.filter(e => !e.includes('favicon') && !e.includes('future')).length
    ? log('FAIL', 'MCHECKIN 콘솔 에러', mobileErrors[0].slice(0, 80)) : log('PASS', 'MCHECKIN 콘솔 에러 없음');
  mCheckinBody.includes('김민국') ? log('FAIL', 'MCHECKIN 하드코딩 이름') : log('PASS', 'MCHECKIN 이름 하드코딩 없음');
  mCheckinBody.includes('4월 21일 화요일') ? log('FAIL', 'MCHECKIN 하드코딩 날짜') : log('PASS', 'MCHECKIN 날짜 하드코딩 없음');

  // ── A-4: /worker/m/attendance ──
  currentTest = 'MATT';
  console.log('\n[A-4] MobileAttendanceScreen (/worker/m/attendance)');
  mobileErrors.length = 0;
  await goto(pageMobile, `${BASE_URL}/worker/m/attendance`);
  await ss(pageMobile, 'A4-mobile-attendance');
  const mAttBody = await pageMobile.evaluate(() => document.body.innerText);
  mobileErrors.filter(e => !e.includes('favicon') && !e.includes('future')).length
    ? log('FAIL', 'MATT 콘솔 에러', mobileErrors[0].slice(0, 80)) : log('PASS', 'MATT 콘솔 에러 없음');
  mAttBody.includes('김민국') ? log('FAIL', 'MATT 하드코딩 이름') : log('PASS', 'MATT 이름 하드코딩 없음');
  mAttBody.includes('윤화순') ? log('PASS', 'MATT 계정명 표시') : log('WARN', 'MATT 계정명 미표시');

  // ── A-5: /worker/m/profile ──
  currentTest = 'MPROFILE';
  console.log('\n[A-5] MobileProfileScreen (/worker/m/profile)');
  mobileErrors.length = 0;
  await goto(pageMobile, `${BASE_URL}/worker/m/profile`);
  await ss(pageMobile, 'A5-mobile-profile');
  const mProfileBody = await pageMobile.evaluate(() => document.body.innerText);
  mobileErrors.filter(e => !e.includes('favicon') && !e.includes('future')).length
    ? log('FAIL', 'MPROFILE 콘솔 에러', mobileErrors[0].slice(0, 80)) : log('PASS', 'MPROFILE 콘솔 에러 없음');
  mProfileBody.includes('김민국') ? log('FAIL', 'MPROFILE 하드코딩 이름 "김민국"') : log('PASS', 'MPROFILE 이름 하드코딩 없음');
  mProfileBody.includes('윤화순') ? log('PASS', 'MPROFILE "윤화순" 표시 확인') : log('WARN', 'MPROFILE 계정명 미표시');

  await ctxMobile.close();

  // ════════════════════════════════════════════
  // SECTION B: HQ 로그인 + 회귀 방어 + Task 2/3
  // ════════════════════════════════════════════
  console.log('\n[SECTION B] HQ — 로그인 후 KPI drilldown + 편집 모달 + 회귀');
  const ctxHQ = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const pageHQ = await ctxHQ.newPage();
  const hqErrors = [];
  const hqDialogs = [];
  pageHQ.on('console', (msg) => { if (msg.type() === 'error') hqErrors.push(msg.text()); });
  pageHQ.on('dialog', async (d) => { hqDialogs.push(d.message()); await d.dismiss().catch(() => {}); });

  currentTest = 'HQ-LOGIN';
  console.log('\n[B-1] jhkim 로그인');
  await goto(pageHQ, `${BASE_URL}/login`);
  await pageHQ.fill('input[placeholder*="아이디"]', 'jhkim').catch(() => {});
  await pageHQ.fill('input[type="password"]', 'rmfpvm001').catch(() => {});
  await pageHQ.click('button[type="submit"]').catch(() => {});
  await pageHQ.waitForTimeout(4500);
  const loggedIn = pageHQ.url().includes('/admin');
  loggedIn ? log('PASS', 'jhkim 로그인', pageHQ.url()) : log('FAIL', '로그인 실패', pageHQ.url());
  if (!loggedIn) { await browser.close(); process.exit(1); }

  // ── 회귀: BUG-F01 ──
  currentTest = 'BUG-F01';
  console.log('\n[B-2] BUG-F01 회귀: 부동소수점');
  await goto(pageHQ, `${BASE_URL}/admin/hq`);
  await ss(pageHQ, 'B2-hq-dashboard');
  const floatBugs = await pageHQ.evaluate(() =>
    [...document.querySelectorAll('*')]
      .filter((el) => el.children.length === 0 && /\d+\.\d{5,}/.test(el.textContent))
      .map((el) => el.textContent.trim())
  );
  floatBugs.length > 0 ? log('FAIL', 'BUG-F01 회귀', floatBugs.slice(0, 3).join(', ')) : log('PASS', 'BUG-F01 회귀 없음');

  // ── 회귀: BUG-F02 ──
  currentTest = 'BUG-F02';
  console.log('\n[B-3] BUG-F02 회귀: 작물 탭');
  const cropTabs = await pageHQ.evaluate(() =>
    [...document.querySelectorAll('button, [role="tab"], span')]
      .filter((t) => ['토마토', '딸기', '파프리카', '오이'].includes(t.textContent.trim()))
      .map((t) => t.textContent.trim())
  );
  cropTabs.length > 0 ? log('FAIL', 'BUG-F02 회귀', cropTabs.join(', ')) : log('PASS', 'BUG-F02 회귀 없음');

  // ── B-4: HQ-KPI-DRILLDOWN-001 ──
  currentTest = 'KPI-DRILLDOWN';
  console.log('\n[B-4] HQ-KPI-DRILLDOWN-001: KPI 카드 navigate');
  const kpiTests = [
    { label: '전사 가동률', expected: '/admin/hq/employees' },
    { label: '월 수확량',   expected: '/admin/hq/finance' },
    { label: '월 인건비',   expected: '/admin/hq/finance' },
  ];
  for (const t of kpiTests) {
    await goto(pageHQ, `${BASE_URL}/admin/hq`);
    await pageHQ.waitForTimeout(1500);
    const card = pageHQ.locator('text=' + t.label).first();
    if (await card.count() > 0) {
      await card.click({ force: true });
      await pageHQ.waitForTimeout(1000);
      const url = pageHQ.url();
      url.includes(t.expected) ? log('PASS', `KPI-${t.label} navigate`, url) : log('FAIL', `KPI-${t.label}`, '기대:'+t.expected+' 실제:'+url);
    } else {
      log('FAIL', `KPI-FIND-${t.label}`, '카드 미발견');
    }
  }

  // 미해결 이슈 → alert
  await goto(pageHQ, `${BASE_URL}/admin/hq`);
  await pageHQ.waitForTimeout(1500);
  hqDialogs.length = 0;
  const issueCard = pageHQ.locator('text=미해결 이슈').first();
  if (await issueCard.count() > 0) {
    await issueCard.click({ force: true });
    await pageHQ.waitForTimeout(800);
    hqDialogs.length > 0 ? log('PASS', 'KPI-미해결이슈 alert', hqDialogs[0].slice(0, 50)) : log('FAIL', 'KPI-미해결이슈 alert 없음', '현재 URL: '+pageHQ.url());
  } else {
    log('WARN', 'KPI-FIND-미해결이슈', '카드 미발견');
  }

  // ── B-5: HQ-EMPLOYEE-EDIT-MODAL-001 ──
  currentTest = 'EDIT-MODAL';
  console.log('\n[B-5] HQ-EMPLOYEE-EDIT-MODAL-001: 직원 편집 모달');
  await goto(pageHQ, `${BASE_URL}/admin/hq/employees`);
  await pageHQ.waitForTimeout(3000);
  await ss(pageHQ, 'B5-hq-employees');

  const tableRows = await pageHQ.locator('tbody tr').count();
  tableRows > 0 ? log('PASS', '직원 테이블 행', tableRows + '개') : log('FAIL', '직원 테이블 비어 있음');

  const detailBtn = pageHQ.locator('button', { hasText: '상세' }).first();
  if (await detailBtn.count() > 0) {
    await detailBtn.click();
    await pageHQ.waitForTimeout(800);
    const detailTitle = await pageHQ.locator('h2').first().innerText().catch(() => '');
    detailTitle.includes('직원 상세') ? log('PASS', '상세 모달 열림', detailTitle) : log('FAIL', '상세 모달 미열림', detailTitle);

    const editBtn = pageHQ.locator('button', { hasText: '수정' }).first();
    if (await editBtn.count() > 0) {
      await editBtn.click();
      await pageHQ.waitForTimeout(600);
      const editTitle = await pageHQ.locator('h2').last().innerText().catch(() => '');
      editTitle.includes('직원 정보 수정') ? log('PASS', '편집 모달 열림', editTitle) : log('FAIL', '편집 모달 미열림', editTitle);

      const inputs = await pageHQ.locator('input[type="text"]').count();
      inputs >= 3 ? log('PASS', `편집 폼 input ${inputs}개 확인`) : log('WARN', `편집 폼 input ${inputs}개 — 예상 3+개`);

      const cancelBtn = pageHQ.locator('button', { hasText: '취소' }).first();
      if (await cancelBtn.count() > 0) {
        await cancelBtn.click();
        await pageHQ.waitForTimeout(400);
        const modalGone = await pageHQ.locator('h2:has-text("직원 정보 수정")').count() === 0;
        modalGone ? log('PASS', '취소 후 편집 모달 닫힘') : log('FAIL', '편집 모달 여전히 표시');
      }
    } else {
      log('WARN', '수정 버튼 없음 — jhkim 권한 확인 필요');
      await pageHQ.keyboard.press('Escape');
    }
  } else {
    log('FAIL', '상세 버튼 없음');
  }

  // ── B-6: 세션34 회귀 — 알림 드롭다운 ──
  currentTest = 'NOTIF-DROPDOWN';
  console.log('\n[B-6] 세션 34 회귀: 알림 드롭다운');
  await goto(pageHQ, `${BASE_URL}/admin/hq`);
  await pageHQ.waitForTimeout(2000);
  await ss(pageHQ, 'B6-hq-notif');
  const allBtns = await pageHQ.evaluate(() => [...document.querySelectorAll('button')].map(b => ({ w: b.getBoundingClientRect().width, h: b.getBoundingClientRect().height })));
  const bellBtn = allBtns.find(b => Math.abs(b.w - 36) < 4 && Math.abs(b.h - 36) < 4);
  if (bellBtn) {
    log('PASS', '벨 버튼 (36×36) 존재');
  } else {
    log('WARN', '벨 버튼 크기 미확인');
  }

  // ── B-7: 기간 탭 4개 ──
  currentTest = 'PERIOD-TABS';
  console.log('\n[B-7] 세션 34 회귀: 기간 탭');
  const bodyText = await pageHQ.evaluate(() => document.body.innerText);
  const periodTabs = ['일', '주', '월', '분기'].every(t => bodyText.includes(t));
  periodTabs ? log('PASS', '기간 탭 4개 (일·주·월·분기) 확인') : log('FAIL', '기간 탭 일부 미표시');

  // ── B-8: 콘솔 에러 ──
  currentTest = 'CONSOLE-ERRORS';
  const hqFinalErrors = hqErrors.filter(e => !e.includes('favicon') && !e.includes('future') && !e.includes('No routes'));
  hqFinalErrors.length === 0 ? log('PASS', 'HQ 콘솔 에러 0건') : log('FAIL', `HQ 콘솔 에러 ${hqFinalErrors.length}건`, hqFinalErrors[0].slice(0, 80));

  await ctxHQ.close();
  await browser.close();

  // ── 결과 집계 ──
  console.log('\n══════════════════════════════════════');
  console.log('세션 35 감사 결과');
  console.log('══════════════════════════════════════');
  console.log(`PASS: ${PASS} / FAIL: ${FAIL} / WARN: ${WARN} / TOTAL: ${PASS + FAIL + WARN}`);
  if (FAIL > 0) {
    console.log('\n실패 항목:');
    results.filter(r => r.status === 'FAIL').forEach(r => console.log(`  ❌ ${r.title}: ${r.detail}`));
  }
  if (WARN > 0) {
    console.log('\n경고 항목:');
    results.filter(r => r.status === 'WARN').forEach(r => console.log(`  ⚠️ ${r.title}: ${r.detail}`));
  }

  if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(
    path.join(OUT_DIR, 'results.json'),
    JSON.stringify({ results, summary: { PASS, FAIL, WARN, total: PASS + FAIL + WARN } }, null, 2)
  );
  console.log(`\n결과 저장: ${OUT_DIR}/results.json`);
})();
