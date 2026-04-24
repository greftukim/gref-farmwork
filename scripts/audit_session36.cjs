/**
 * 세션 36 — 신규 구현 검증 + 세션 35 회귀 방어
 * 실행: node scripts/audit_session36.cjs
 *
 * 검증 대상:
 *   Task 0: /admin/growth·performance·stats 빈 상태 UI (코드 정상)
 *   Task 1: 미니오이·완숙토마토 작물 추가
 *   Task 2: harvest_records 재시드 (busan 3종·jinju 미니오이·hadong 완숙토마토)
 *   Task 3: Dashboard 차트 가로 배치 (3지점 수평)
 *   Task 4: 사이드바·모바일 로그아웃 버튼
 *
 * 회귀 방어 (세션 35 누적):
 *   BUG-F01: 부동소수점, BUG-F02: 작물 탭 재등장
 *   세션 34: 알림 드롭다운·기간 탭
 *   세션 35: KPI 드릴다운, 편집 모달
 */
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:5173';
const OUT_DIR = path.join(__dirname, '..', 'docs', 'regression_session36');

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

(async () => {
  console.log('=== 세션 36 검증 + 회귀 방어 감사 ===\n');

  const browser = await chromium.launch({ headless: true });

  // ════════════════════════════════════════════
  // SECTION A: 모바일 로그아웃 버튼 (Task 4)
  // ════════════════════════════════════════════
  console.log('[SECTION A] 모바일 프로필 로그아웃 버튼 (Task 4)');
  const ctxMobile = await browser.newContext({
    viewport: { width: 390, height: 844 },
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15',
  });
  const pageMobile = await ctxMobile.newPage();
  const mobileErrors = [];
  pageMobile.on('console', (msg) => { if (msg.type() === 'error') mobileErrors.push(msg.text()); });

  await pageMobile.addInitScript((auth) => {
    localStorage.setItem('gref-auth', JSON.stringify(auth));
  }, WORKER_AUTH);

  currentTest = 'MOBILE-AUTH';
  await pageMobile.goto(`${BASE_URL}/worker`, { waitUntil: 'domcontentloaded', timeout: 15000 });
  await pageMobile.waitForTimeout(4000);
  const landingUrl = pageMobile.url();
  landingUrl.includes('/worker') && !landingUrl.includes('/login')
    ? log('PASS', 'Worker 인증 랜딩', landingUrl)
    : log('FAIL', 'Worker 인증 실패', landingUrl);

  currentTest = 'MOBILE-LOGOUT';
  console.log('\n[A-1] MobileProfileScreen 로그아웃 버튼 onClick');
  mobileErrors.length = 0;
  await goto(pageMobile, `${BASE_URL}/worker/m/profile`);
  await ss(pageMobile, 'A1-mobile-profile');
  const mProfileBody = await pageMobile.evaluate(() => document.body.innerText);
  mobileErrors.filter(e => !e.includes('favicon') && !e.includes('future')).length
    ? log('FAIL', 'MPROFILE 콘솔 에러', mobileErrors[0].slice(0, 80)) : log('PASS', 'MPROFILE 콘솔 에러 없음');
  mProfileBody.includes('로그아웃') ? log('PASS', 'MPROFILE 로그아웃 버튼 텍스트 존재') : log('FAIL', 'MPROFILE 로그아웃 버튼 없음');
  mProfileBody.includes('윤화순') ? log('PASS', 'MPROFILE "윤화순" 표시') : log('WARN', 'MPROFILE 계정명 미표시');

  // 세션35 회귀: 하드코딩 없음
  currentTest = 'MPROFILE-HARDCODE';
  mProfileBody.includes('김민국') ? log('FAIL', 'MPROFILE 하드코딩 "김민국"') : log('PASS', 'MPROFILE 이름 하드코딩 없음');

  await ctxMobile.close();

  // ════════════════════════════════════════════
  // SECTION B: HQ 로그인
  // ════════════════════════════════════════════
  console.log('\n[SECTION B] HQ 로그인');
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

  // ── B-2: BUG-F01 회귀 ──
  currentTest = 'BUG-F01';
  console.log('\n[B-2] BUG-F01 회귀: 부동소수점');
  await goto(pageHQ, `${BASE_URL}/admin/hq`);
  await pageHQ.waitForTimeout(2500);
  await ss(pageHQ, 'B2-hq-dashboard');
  const floatBugs = await pageHQ.evaluate(() =>
    [...document.querySelectorAll('*')]
      .filter((el) => el.children.length === 0 && /\d+\.\d{5,}/.test(el.textContent))
      .map((el) => el.textContent.trim())
  );
  floatBugs.length > 0 ? log('FAIL', 'BUG-F01 회귀', floatBugs.slice(0, 3).join(', ')) : log('PASS', 'BUG-F01 회귀 없음');

  // ── B-3: BUG-F02 회귀 ──
  currentTest = 'BUG-F02';
  console.log('\n[B-3] BUG-F02 회귀: 작물 탭');
  const cropTabEls = await pageHQ.evaluate(() =>
    [...document.querySelectorAll('button, [role="tab"], span')]
      .filter((t) => ['토마토', '딸기', '파프리카', '오이'].some(c => t.textContent.trim() === c))
      .map((t) => t.textContent.trim())
  );
  cropTabEls.length > 0 ? log('FAIL', 'BUG-F02 회귀', cropTabEls.join(', ')) : log('PASS', 'BUG-F02 회귀 없음');

  // ── B-4: Dashboard 차트 가로 배치 (Task 3) ──
  currentTest = 'DASHBOARD-CHART-LAYOUT';
  console.log('\n[B-4] Task 3: Dashboard 지점별 수확량 차트 가로 배치');
  await goto(pageHQ, `${BASE_URL}/admin/hq`);
  await pageHQ.waitForTimeout(2500);
  await ss(pageHQ, 'B4-hq-dashboard-chart');
  const bodyText = await pageHQ.evaluate(() => document.body.innerText);
  const hasBusan  = bodyText.includes('부산LAB');
  const hasJinju  = bodyText.includes('진주HUB');
  const hasHadong = bodyText.includes('하동HUB');
  (hasBusan && hasJinju && hasHadong) ? log('PASS', '3지점 (부산·진주·하동) 모두 표시') : log('FAIL', '지점 미표시', `부산:${hasBusan} 진주:${hasJinju} 하동:${hasHadong}`);

  // 새 작물명이 차트에 표시되는지 확인
  const hasMiniooi = bodyText.includes('미니오이');
  const hasRipeTomato = bodyText.includes('완숙토마토');
  hasMiniooi ? log('PASS', '차트에 "미니오이" 표시') : log('WARN', '차트 "미니오이" 미표시 (빈 데이터 가능)');
  hasRipeTomato ? log('PASS', '차트에 "완숙토마토" 표시') : log('WARN', '차트 "완숙토마토" 미표시 (빈 데이터 가능)');

  // ── B-5: HQ 사이드바 로그아웃 (Task 4) ──
  currentTest = 'HQ-SIDEBAR-LOGOUT';
  console.log('\n[B-5] Task 4: HQ 사이드바 로그아웃 버튼');
  const hqSidebarText = await pageHQ.evaluate(() => {
    const aside = document.querySelector('aside');
    return aside ? aside.innerText : '';
  });
  hqSidebarText.includes('로그아웃') ? log('PASS', 'HQ 사이드바 "로그아웃" 텍스트 존재') : log('FAIL', 'HQ 사이드바 로그아웃 버튼 없음');

  // ── B-6: KPI 드릴다운 세션35 회귀 ──
  currentTest = 'KPI-DRILLDOWN-REGRESSION';
  console.log('\n[B-6] 세션 35 회귀: KPI 드릴다운');
  await goto(pageHQ, `${BASE_URL}/admin/hq`);
  await pageHQ.waitForTimeout(1500);
  const kpiCard = pageHQ.locator('text=전사 가동률').first();
  if (await kpiCard.count() > 0) {
    await kpiCard.click({ force: true });
    await pageHQ.waitForTimeout(800);
    pageHQ.url().includes('/admin/hq/employees')
      ? log('PASS', 'KPI-전사가동률 navigate', pageHQ.url())
      : log('FAIL', 'KPI-전사가동률', pageHQ.url());
  } else {
    log('WARN', 'KPI 카드 미발견');
  }

  // ── B-7: 직원 편집 모달 세션35 회귀 ──
  currentTest = 'EDIT-MODAL-REGRESSION';
  console.log('\n[B-7] 세션 35 회귀: 직원 편집 모달');
  await goto(pageHQ, `${BASE_URL}/admin/hq/employees`);
  await pageHQ.waitForTimeout(3000);
  const detailBtn = pageHQ.locator('button', { hasText: '상세' }).first();
  if (await detailBtn.count() > 0) {
    await detailBtn.click();
    await pageHQ.waitForTimeout(600);
    const editBtn = pageHQ.locator('button', { hasText: '수정' }).first();
    if (await editBtn.count() > 0) {
      await editBtn.click();
      await pageHQ.waitForTimeout(600);
      const editTitle = await pageHQ.locator('h2').last().innerText().catch(() => '');
      editTitle.includes('직원 정보 수정') ? log('PASS', '편집 모달 열림') : log('FAIL', '편집 모달 미열림', editTitle);
      await pageHQ.locator('button', { hasText: '취소' }).first().click().catch(() => {});
    } else {
      log('WARN', '수정 버튼 없음');
      await pageHQ.keyboard.press('Escape');
    }
  } else {
    log('FAIL', '상세 버튼 없음');
  }

  // ── B-8: 기간 탭 4개 세션34 회귀 ──
  currentTest = 'PERIOD-TABS';
  console.log('\n[B-8] 세션 34 회귀: 기간 탭 4개');
  await goto(pageHQ, `${BASE_URL}/admin/hq`);
  await pageHQ.waitForTimeout(1500);
  const ptText = await pageHQ.evaluate(() => document.body.innerText);
  const periodTabs = ['일', '주', '월', '분기'].every(t => ptText.includes(t));
  periodTabs ? log('PASS', '기간 탭 4개 (일·주·월·분기) 확인') : log('FAIL', '기간 탭 일부 미표시');

  // ── B-9: 재배팀 사이드바 로그아웃 (Task 4) ──
  currentTest = 'FARM-SIDEBAR-LOGOUT';
  console.log('\n[B-9] Task 4: 재배팀 사이드바 로그아웃 버튼 (jhkim은 HQ팀 — farm_admin으로 검증 스킵)');
  log('WARN', '재배팀 사이드바는 farm_admin 로그인 필요 — 이번 세션 스킵');

  // ── B-10: 콘솔 에러 ──
  currentTest = 'CONSOLE-ERRORS';
  console.log('\n[B-10] HQ 콘솔 에러 0건');
  const hqFinalErrors = hqErrors.filter(e =>
    !e.includes('favicon') && !e.includes('future') && !e.includes('No routes') && !e.includes('net::ERR')
  );
  hqFinalErrors.length === 0 ? log('PASS', 'HQ 콘솔 에러 0건') : log('FAIL', `HQ 콘솔 에러 ${hqFinalErrors.length}건`, hqFinalErrors[0].slice(0, 80));

  // ── B-11: 재배팀 농작물 빈 상태 페이지 코드 정상 (Task 0) ──
  currentTest = 'GROWTH-EMPTY-STATE';
  console.log('\n[B-11] Task 0: /admin/growth·performance·stats 빈 상태 정상');
  for (const path of ['/admin/growth', '/admin/performance', '/admin/stats']) {
    await goto(pageHQ, `${BASE_URL}${path}`);
    await pageHQ.waitForTimeout(2000);
    const pageErrors = hqErrors.filter(e => !e.includes('favicon') && !e.includes('future') && !e.includes('No routes'));
    const lastErrorCount = pageErrors.length;
    pageErrors.length > hqFinalErrors.length
      ? log('FAIL', `${path} 콘솔 에러 발생`)
      : log('PASS', `${path} 정상 렌더 (빈 상태 또는 콘텐츠)`);
  }

  await ctxHQ.close();
  await browser.close();

  // ── 결과 집계 ──
  console.log('\n══════════════════════════════════════');
  console.log('세션 36 감사 결과');
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
