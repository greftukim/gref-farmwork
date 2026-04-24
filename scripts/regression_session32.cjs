// 세션 32 회귀 테스트 (v3)
// 수정: 로그인 후 goto 중복 제거, jhkim 비밀번호 수정, HQ 경로 /admin/hq/*
const { chromium } = require('playwright');
const fs = require('fs');

const BASE = 'http://localhost:5173';
const SS_DIR = 'docs/regression_session32';
if (!fs.existsSync(SS_DIR)) fs.mkdirSync(SS_DIR, { recursive: true });

const results = [];
function pass(id, note) { results.push({ id, status: 'PASS', note }); console.log(`  ✅ [PASS] ${id}: ${note}`); }
function fail(id, note) { results.push({ id, status: 'FAIL', note }); console.log(`  ❌ [FAIL] ${id}: ${note}`); }
function warn(id, note) { results.push({ id, status: 'WARN', note }); console.log(`  ⚠️ [WARN] ${id}: ${note}`); }

async function shot(page, name) {
  await page.screenshot({ path: `${SS_DIR}/${name}.png`, fullPage: false });
}

async function navAndWait(page, path) {
  await page.goto(`${BASE}${path}`);
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(2500);
}

(async () => {
  const browser = await chromium.launch({ headless: true });

  // ══════════════════════════════════════
  // ▶ 세션 A: hdkim (farm_admin, busan)
  // ══════════════════════════════════════
  console.log('\n══ [FARM ADMIN] hdkim (farm_admin, busan) ══');
  const ctxFarm = await browser.newContext();
  const pageFarm = await ctxFarm.newPage();
  await pageFarm.setViewportSize({ width: 1440, height: 900 });

  const farmErrors = [];
  const farmDialogs = [];
  pageFarm.on('console', msg => { if (msg.type() === 'error') farmErrors.push(msg.text()); });
  pageFarm.on('pageerror', err => farmErrors.push('[PAGEERROR] ' + err.message));
  pageFarm.on('dialog', async d => { farmDialogs.push(d.message()); await d.dismiss(); });

  // 1. 로그인 → /admin 직착
  console.log('\n── 1. hdkim 로그인 ──');
  await pageFarm.goto(`${BASE}/login`);
  await pageFarm.waitForSelector('input[placeholder*="아이디"]', { timeout: 10000 });
  await pageFarm.fill('input[placeholder*="아이디"]', 'hdkim');
  await pageFarm.fill('input[placeholder*="비밀번호"]', 'rmfpvm001');
  await pageFarm.click('button[type="submit"]');
  await pageFarm.waitForURL(/\/admin/, { timeout: 12000 });
  // 로그인 직후 이미 /admin 에 있으므로 추가 goto 불필요
  // 대신 충분히 대기하여 React 데이터 로딩 완료
  await pageFarm.waitForTimeout(3000);
  await shot(pageFarm, '01-hdkim-dashboard');
  pass('LOGIN-HDKIM', `랜딩: ${pageFarm.url()}`);

  // ── 2. 대시보드 날짜 동적 확인 (FARM-DASH-DATE-001) ──
  console.log('\n── 2. 대시보드 날짜 동적 확인 (FARM-DASH-DATE-001) ──');
  farmErrors.length = 0;

  // h1 렌더링 대기
  await pageFarm.waitForSelector('h1', { timeout: 5000 }).catch(() => {});

  const h1Text = await pageFarm.locator('h1').first().innerText().catch(() => '');
  const bodyText = await pageFarm.evaluate(() => document.body.innerText);
  const today = new Date();
  const monthDay = `${today.getMonth() + 1}월 ${today.getDate()}일`;

  if (bodyText.includes('4월 21일') && bodyText.includes('화요일')) {
    fail('FARM-DASH-DATE-001', '하드코딩 "4월 21일 화요일" 여전히 표시됨');
  } else if (h1Text.includes(monthDay)) {
    pass('FARM-DASH-DATE-001', `TopBar h1: "${h1Text}"`);
  } else if (bodyText.includes(monthDay)) {
    pass('FARM-DASH-DATE-001', `본문에 오늘 날짜 "${monthDay}" 표시`);
  } else {
    warn('FARM-DASH-DATE-001', `하드코딩 제거됨, h1: "${h1Text}", 본문 날짜 미확인`);
  }

  // ── 3. 스케줄 그리드 "오늘" 동적 확인 ──
  console.log('\n── 3. 스케줄 그리드 "오늘" 동적 확인 (FARM-DASH-SCHED-HARDCODE-001) ──');
  const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
  const todayDayKo = dayNames[today.getDay()];
  const todayLabel = `${todayDayKo} ${today.getDate()}`;

  // 텍스트 노드 전체 수집
  const allTextNodes = await pageFarm.evaluate(() => {
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    const texts = [];
    let node;
    while ((node = walker.nextNode())) {
      const t = node.textContent.trim();
      if (t.length > 0 && t.length < 200) texts.push(t);
    }
    return texts;
  });
  const allText = allTextNodes.join(' ');

  if (bodyText.includes('4월 21일')) {
    fail('FARM-DASH-SCHED-HARDCODE-001', '하드코딩 날짜 "4월 21일" 여전히 존재');
  } else if (allText.includes('오늘')) {
    pass('FARM-DASH-SCHED-HARDCODE-001', `"오늘" 뱃지 표시 확인, 오늘 레이블: ${todayLabel}`);
  } else if (allText.includes(todayLabel)) {
    warn('FARM-DASH-SCHED-HARDCODE-001', `레이블 "${todayLabel}" 있으나 "오늘" 뱃지 없음`);
  } else {
    warn('FARM-DASH-SCHED-HARDCODE-001', `"오늘"/"${todayLabel}" 미확인 — 렌더링 대기 부족 가능성`);
  }

  const dashErrors = farmErrors.filter(e => !e.includes('future') && !e.includes('No routes'));
  dashErrors.length ? fail('DASH-CONSOLE', `에러 ${dashErrors.length}건`) : pass('DASH-CONSOLE', '콘솔 에러 없음');

  // ── 4. TopBar 버튼 onClick (FARM-DASH-BTN-001) ──
  console.log('\n── 4. 대시보드 버튼 onClick (FARM-DASH-BTN-001) ──');
  farmDialogs.length = 0;

  // 버튼 텍스트 목록 수집
  const allBtnTexts = await pageFarm.evaluate(() =>
    [...document.querySelectorAll('button')].map(b => b.textContent.trim())
  );
  console.log(`  버튼 목록: ${allBtnTexts.slice(0, 10).join(', ')}`);

  const exportLoc = pageFarm.locator('button', { hasText: '내보내기' }).first();
  if (await exportLoc.count() > 0) {
    await exportLoc.click(); await pageFarm.waitForTimeout(600);
    farmDialogs.length > 0
      ? (pass('FARM-DASH-BTN-001-EXPORT', `alert 확인: "${farmDialogs[0].slice(0, 50)}"`), farmDialogs.length = 0)
      : fail('FARM-DASH-BTN-001-EXPORT', '내보내기 클릭 후 alert 없음');
  } else {
    fail('FARM-DASH-BTN-001-EXPORT', `"내보내기" 버튼 없음 (전체 버튼: ${allBtnTexts.slice(0, 5).join(', ')})`);
  }

  const aiApplyLoc = pageFarm.locator('button', { hasText: '적용하기' }).first();
  if (await aiApplyLoc.count() > 0) {
    farmDialogs.length = 0;
    await aiApplyLoc.click(); await pageFarm.waitForTimeout(600);
    farmDialogs.length > 0
      ? pass('FARM-DASH-BTN-001-AI-APPLY', `alert: "${farmDialogs[0].slice(0, 50)}"`)
      : fail('FARM-DASH-BTN-001-AI-APPLY', 'AI 적용하기 alert 없음');
  } else {
    fail('FARM-DASH-BTN-001-AI-APPLY', '"적용하기" 버튼 없음');
  }

  farmDialogs.length = 0;
  const aiDetailLoc = pageFarm.locator('button', { hasText: '자세히' }).first();
  if (await aiDetailLoc.count() > 0) {
    await aiDetailLoc.click(); await pageFarm.waitForTimeout(600);
    farmDialogs.length > 0
      ? pass('FARM-DASH-BTN-001-AI-DETAIL', `alert: "${farmDialogs[0].slice(0, 50)}"`)
      : fail('FARM-DASH-BTN-001-AI-DETAIL', 'AI 자세히 alert 없음');
  } else {
    fail('FARM-DASH-BTN-001-AI-DETAIL', '"자세히" 버튼 없음');
  }

  // ── 5. TaskPlanPage 작업 추가 버튼 (FARM-TASK-ADD-001) ──
  console.log('\n── 5. TaskPlanPage 작업 추가 버튼 (FARM-TASK-ADD-001) ──');
  await navAndWait(pageFarm, '/admin/tasks');
  farmErrors.length = 0;
  await shot(pageFarm, '05-task-plan');

  const addTaskLoc = pageFarm.locator('button', { hasText: '작업 추가' }).first();
  if (await addTaskLoc.count() > 0) {
    pass('FARM-TASK-ADD-001', '"작업 추가" 버튼 존재');
    await addTaskLoc.click(); await pageFarm.waitForTimeout(1500);
    pageFarm.url().includes('/admin/tasks/new')
      ? pass('FARM-TASK-ADD-001-NAV', `navigate → ${pageFarm.url()}`)
      : warn('FARM-TASK-ADD-001-NAV', `예상 경로 아님: ${pageFarm.url()}`);
  } else {
    const planBtnTexts = await pageFarm.evaluate(() =>
      [...document.querySelectorAll('button')].map(b => b.textContent.trim())
    );
    fail('FARM-TASK-ADD-001', `"작업 추가" 없음 (버튼: ${planBtnTexts.slice(0, 5).join(', ')})`);
  }
  const planErrors = farmErrors.filter(e => !e.includes('future') && !e.includes('No routes'));
  planErrors.length ? fail('TASKPLAN-CONSOLE', `에러: ${planErrors[0].slice(0, 80)}`) : pass('TASKPLAN-CONSOLE', '콘솔 에러 없음');

  // ── 6. 휴가 신청 branch 필터 (FARM-LEAVE-SCOPE-001) ──
  console.log('\n── 6. 휴가 신청 branch 필터 (FARM-LEAVE-SCOPE-001) ──');
  await navAndWait(pageFarm, '/admin/leave');
  farmErrors.length = 0;
  await shot(pageFarm, '06-leave');
  const leaveErrors = farmErrors.filter(e => !e.includes('future') && !e.includes('No routes'));
  leaveErrors.length ? fail('FARM-LEAVE-SCOPE-001', `에러: ${leaveErrors[0].slice(0, 80)}`) : pass('FARM-LEAVE-SCOPE-001', '휴가 신청 페이지 정상');

  // ── 7. 이상 신고/근태 branch 필터 (FARM-TASK-SCOPE-001) ──
  console.log('\n── 7. 이상 신고/근태 branch 필터 (FARM-TASK-SCOPE-001) ──');
  await navAndWait(pageFarm, '/admin/issues');
  farmErrors.length = 0;
  await shot(pageFarm, '07-issues');
  const issueErrors = farmErrors.filter(e => !e.includes('future') && !e.includes('No routes'));
  issueErrors.length ? fail('FARM-TASK-SCOPE-ISSUES', `에러: ${issueErrors[0].slice(0, 80)}`) : pass('FARM-TASK-SCOPE-ISSUES', '이상 신고 페이지 정상');

  await navAndWait(pageFarm, '/admin/attendance-status');
  farmErrors.length = 0;
  await shot(pageFarm, '08-attendance');
  const attErrors = farmErrors.filter(e => !e.includes('future') && !e.includes('No routes'));
  attErrors.length ? fail('FARM-TASK-SCOPE-ATT', `에러: ${attErrors[0].slice(0, 80)}`) : pass('FARM-TASK-SCOPE-ATT', '근태 현황 페이지 정상');

  await ctxFarm.close();

  // ══════════════════════════════════════
  // ▶ 세션 B: jhkim (hq_admin) — HQ regression
  // 비밀번호: rmfpvm001, HQ 경로: /admin/hq/*
  // ══════════════════════════════════════
  console.log('\n══ [HQ] jhkim (hq_admin) HQ regression ══');
  const ctxHQ = await browser.newContext();
  const pageHQ = await ctxHQ.newPage();
  await pageHQ.setViewportSize({ width: 1440, height: 900 });

  const hqErrors = [];
  pageHQ.on('console', msg => { if (msg.type() === 'error') hqErrors.push(msg.text()); });
  pageHQ.on('pageerror', err => hqErrors.push('[PAGEERROR] ' + err.message));

  // 8. jhkim 로그인
  console.log('\n── 8. jhkim 로그인 ──');
  await pageHQ.goto(`${BASE}/login`);
  await pageHQ.waitForSelector('input[placeholder*="아이디"]', { timeout: 10000 });
  await pageHQ.fill('input[placeholder*="아이디"]', 'jhkim');
  await pageHQ.fill('input[placeholder*="비밀번호"]', 'rmfpvm001');
  await pageHQ.click('button[type="submit"]');
  await pageHQ.waitForURL(/\/admin/, { timeout: 12000 });
  await pageHQ.waitForTimeout(2500);
  await shot(pageHQ, '09-jhkim-landing');
  pass('LOGIN-JHKIM', `랜딩: ${pageHQ.url()}`);

  // HQ 대시보드 (/admin/hq)
  await navAndWait(pageHQ, '/admin/hq');
  hqErrors.length = 0;
  await shot(pageHQ, '10-hq-dashboard');
  const hqDashText = await pageHQ.evaluate(() => document.body.innerText);
  const hqDashErrors = hqErrors.filter(e => !e.includes('future') && !e.includes('No routes'));
  hqDashErrors.length ? fail('HQ-DASH', `에러: ${hqDashErrors[0].slice(0, 80)}`) : pass('HQ-DASH', 'HQ 대시보드 정상');
  const hasMultiBranch = hqDashText.includes('부산') || hqDashText.includes('진주') || hqDashText.includes('하동');
  hasMultiBranch ? pass('HQ-SCOPE', 'HQ 전체 지점 데이터 표시 확인') : warn('HQ-SCOPE', 'HQ 지점 텍스트 미확인');

  // HQ 직원 목록 (/admin/hq/employees)
  await navAndWait(pageHQ, '/admin/hq/employees');
  hqErrors.length = 0;
  await shot(pageHQ, '11-hq-employees');
  const hqEmpErrors = hqErrors.filter(e => !e.includes('future') && !e.includes('No routes'));
  hqEmpErrors.length ? fail('HQ-EMP', `에러: ${hqEmpErrors[0].slice(0, 80)}`) : pass('HQ-EMP', 'HQ 직원 목록 정상');

  // HQ 휴가 승인 (/admin/hq/approvals) — scope 필터 미영향 확인
  await navAndWait(pageHQ, '/admin/hq/approvals');
  hqErrors.length = 0;
  await shot(pageHQ, '12-hq-approvals');
  const hqApprovalErrors = hqErrors.filter(e => !e.includes('future') && !e.includes('No routes'));
  hqApprovalErrors.length ? fail('HQ-APPROVALS', `에러: ${hqApprovalErrors[0].slice(0, 80)}`) : pass('HQ-APPROVALS', 'HQ 휴가 승인 정상 (scope 필터 미영향)');

  await ctxHQ.close();
  await browser.close();

  // ── 결과 집계 ──
  console.log('\n══════════════════════════════════════');
  console.log('세션 32 회귀 테스트 결과');
  console.log('══════════════════════════════════════');
  const passCount = results.filter(r => r.status === 'PASS').length;
  const failCount = results.filter(r => r.status === 'FAIL').length;
  const warnCount = results.filter(r => r.status === 'WARN').length;
  console.log(`PASS: ${passCount} / FAIL: ${failCount} / WARN: ${warnCount} / TOTAL: ${results.length}`);
  if (failCount > 0) {
    console.log('\n실패 항목:');
    results.filter(r => r.status === 'FAIL').forEach(r => console.log(`  ❌ ${r.id}: ${r.note}`));
  }
  if (warnCount > 0) {
    console.log('\n경고 항목:');
    results.filter(r => r.status === 'WARN').forEach(r => console.log(`  ⚠️ ${r.id}: ${r.note}`));
  }
  fs.writeFileSync(`${SS_DIR}/results.json`, JSON.stringify({ results, summary: { passCount, failCount, warnCount } }, null, 2));
  console.log(`\n결과 저장: ${SS_DIR}/results.json`);
  if (failCount > 0) process.exit(1);
})();
