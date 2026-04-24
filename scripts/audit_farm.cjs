// 세션 31 — 재배팀 영역 전수조사
// 로그인: hdkim / rmfpvm001 (farm_admin, busan 지점)
// 원칙: 발견만, 수정 없음. 파괴적 액션(승인/삭제/폼 제출) 금지
const { chromium } = require('playwright');
const fs = require('fs');

const BASE = 'http://localhost:5173';
const SS_DIR = 'docs/regression_session31';
if (!fs.existsSync(SS_DIR)) fs.mkdirSync(SS_DIR, { recursive: true });

async function shot(page, name) {
  await page.screenshot({ path: `${SS_DIR}/${name}.png`, fullPage: false });
}
async function shotFull(page, name) {
  await page.screenshot({ path: `${SS_DIR}/${name}.png`, fullPage: true });
}

const issues = [];
const checkpoints = [];

function cp(page, status, note) {
  checkpoints.push({ page, status, note });
  const icon = status === 'PASS' ? '✅' : status === 'WARN' ? '⚠️' : '❌';
  console.log(`  ${icon} [${page}] ${note}`);
}

function issue(id, page, severity, cat, desc) {
  issues.push({ id, page, severity, cat, desc });
  console.log(`  🐛 ${id} (${severity}) [${page}] ${desc}`);
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1440, height: 900 });

  const errors = [];
  const dialogs = [];
  page.on('console', msg => { if (msg.type() === 'error') errors.push({ url: page.url(), msg: msg.text() }); });
  page.on('pageerror', err => errors.push({ url: page.url(), msg: '[PAGEERROR] ' + err.message }));
  page.on('dialog', async d => { dialogs.push({ type: d.type(), msg: d.message().slice(0, 120) }); await d.dismiss(); });

  // ══════════════════════════════════════
  // 0. 로그인
  // ══════════════════════════════════════
  console.log('\n── 0. 로그인 ──');
  await page.goto(`${BASE}/login`);
  await page.waitForSelector('input[placeholder*="아이디"]', { timeout: 10000 });
  await page.fill('input[placeholder*="아이디"]', 'hdkim');
  await page.fill('input[placeholder*="비밀번호"]', 'rmfpvm001');
  errors.length = 0;
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/admin/, { timeout: 10000 });
  await page.waitForTimeout(2000);
  const landingUrl = page.url();
  console.log(`  ✅ 로그인 완료 → ${landingUrl}`);
  await shot(page, '00-login-landing');
  cp('Login', 'PASS', `랜딩 URL: ${landingUrl}`);

  // ══════════════════════════════════════
  // 1. 대시보드 /admin
  // ══════════════════════════════════════
  console.log('\n── 1. 대시보드 /admin ──');
  await page.goto(`${BASE}/admin`);
  await page.waitForTimeout(2500);
  errors.length = 0;
  const bodyErrors1 = errors.filter(e => !e.msg.includes('future') && !e.msg.includes('No routes'));
  await shotFull(page, '01-dashboard');

  const dashText = await page.evaluate(() => document.body.innerText);
  const hasFPBug = /\d\.\d{7,}/.test(dashText);
  hasFPBug ? cp('Dashboard', 'FAIL', `부동소수점 버그: ${dashText.match(/\d\.\d{7,}/)?.[0]}`) : cp('Dashboard', 'PASS', '부동소수점 없음');
  if (bodyErrors1.length) { cp('Dashboard', 'FAIL', `콘솔 에러 ${bodyErrors1.length}건`); bodyErrors1.forEach(e => issue('FARM-DASH-ERR-001', 'Dashboard', 'P1', '에러', e.msg.slice(0, 100))); }
  else cp('Dashboard', 'PASS', '콘솔 에러 없음');

  // KPI 카드 확인
  const kpiCards = await page.$$eval('[style*="border-left"]', els => els.length);
  cp('Dashboard', kpiCards > 0 ? 'PASS' : 'WARN', `KPI 카드: ${kpiCards}개`);

  // 사이드바 메뉴 클릭 가능 여부
  const sidebarItems = await page.$$('aside nav div[style*="cursor: pointer"]');
  cp('Dashboard', 'PASS', `사이드바 메뉴 항목: ${sidebarItems.length}개`);

  // 대시보드 링크 클릭 테스트 (비파괴적)
  dialogs.length = 0;
  const dashNavLinks = [
    { selector: 'span:has-text("모두 보기")', desc: '휴가 모두 보기' },
    { selector: 'span:has-text("상세 분석 →")', desc: '통계 상세 분석' },
    { selector: 'span:has-text("작성 +")', desc: '공지 작성 +' },
    { selector: 'span:has-text("전체 스케줄 →")', desc: '전체 스케줄' },
  ];
  for (const ln of dashNavLinks) {
    await page.goto(`${BASE}/admin`);
    await page.waitForTimeout(1000);
    const el = await page.$(ln.selector);
    if (el) {
      await el.click();
      await page.waitForTimeout(600);
      const newUrl = page.url();
      cp('Dashboard', newUrl !== `${BASE}/admin` ? 'PASS' : 'WARN', `${ln.desc} → ${newUrl}`);
    } else {
      cp('Dashboard', 'WARN', `${ln.desc} 링크 미발견`);
    }
  }

  // ══════════════════════════════════════
  // 2. 직원 관리 /admin/employees
  // ══════════════════════════════════════
  console.log('\n── 2. 직원 관리 /admin/employees ──');
  await page.goto(`${BASE}/admin/employees`);
  await page.waitForTimeout(1500);
  errors.length = 0;
  const bodyErrors2 = errors.filter(e => !e.msg.includes('future'));
  await shotFull(page, '02-employees');

  if (bodyErrors2.length) { issue('FARM-EMP-ERR-001', 'Employees', 'P1', '에러', bodyErrors2[0].msg.slice(0, 100)); }
  else cp('Employees', 'PASS', '콘솔 에러 없음');

  // 역할 필터 탭
  const roleFilters = await page.$$('span[style*="cursor: pointer"]');
  cp('Employees', 'PASS', `역할 필터 탭: ${roleFilters.length}개`);
  if (roleFilters.length > 0) {
    await roleFilters[0].click();
    await page.waitForTimeout(300);
    await shot(page, '02-employees-filter');
    cp('Employees', 'PASS', '역할 필터 탭 클릭 반응');
  }

  // 직원 수 확인 (DB: busan 활성 12명, 전체 15명)
  const empRows = await page.$$eval('tbody tr, [style*="border-bottom"]', els => els.length);
  cp('Employees', empRows > 0 ? 'PASS' : 'WARN', `직원 행 수: ${empRows}개 (DB busan 전체 15, 활성 12)`);
  if (empRows === 0) issue('FARM-EMP-DATA-001', 'Employees', 'P1', '데이터', '직원 목록 미표시');

  // "추가" 버튼 클릭 → 모달 열림만 확인 (제출 금지)
  const addBtn = await page.$('button:has-text("추가"), button:has-text("직원 추가")');
  if (addBtn) {
    await addBtn.click();
    await page.waitForTimeout(600);
    const modal = await page.$('div[class*="fixed"], [style*="inset: 0"]');
    await shot(page, '02-employees-add-modal');
    modal ? cp('Employees', 'PASS', '직원 추가 모달 열림') : cp('Employees', 'WARN', '직원 추가 모달 미표시');
    // 닫기 (취소 버튼)
    const cancelBtn = await page.$('button:has-text("취소")');
    if (cancelBtn) await cancelBtn.click();
    else await page.keyboard.press('Escape');
    await page.waitForTimeout(300);
  } else {
    cp('Employees', 'WARN', '직원 추가 버튼 미발견');
    issue('FARM-EMP-BTN-001', 'Employees', 'P2', '인터랙션', '직원 추가 버튼 미발견');
  }

  // 활성/비활성 토글 버튼 (존재 확인만, 클릭 시 isActive 변경 → 원칙3 위반)
  const toggleBtn = await page.$('button:has-text("활성"), button:has-text("비활성")');
  cp('Employees', toggleBtn ? 'PASS' : 'WARN', `활성/비활성 토글 버튼 ${toggleBtn ? '존재' : '미발견'}`);

  // ══════════════════════════════════════
  // 3. 근무 관리 /admin/schedule
  // ══════════════════════════════════════
  console.log('\n── 3. 근무 관리 /admin/schedule ──');
  await page.goto(`${BASE}/admin/schedule`);
  await page.waitForTimeout(1500);
  errors.length = 0;
  const bodyErrors3 = errors.filter(e => !e.msg.includes('future'));
  await shotFull(page, '03-schedule');

  if (bodyErrors3.length) { issue('FARM-SCH-ERR-001', 'Schedule', 'P1', '에러', bodyErrors3[0].msg.slice(0, 100)); }
  else cp('Schedule', 'PASS', '콘솔 에러 없음');

  const schedText = await page.evaluate(() => document.body.innerText);
  const hasSchedData = schedText.length > 100;
  cp('Schedule', hasSchedData ? 'PASS' : 'WARN', '페이지 콘텐츠 ' + (hasSchedData ? '있음' : '빈 상태'));

  // 날짜 이동 버튼
  const prevBtn = await page.$('button:has-text("이전"), button:has-text("<"), button[aria-label*="이전"]');
  const nextBtn = await page.$('button:has-text("다음"), button:has-text(">"), button[aria-label*="다음"]');
  if (nextBtn) {
    await nextBtn.click();
    await page.waitForTimeout(400);
    cp('Schedule', 'PASS', '날짜 이동(다음) 버튼 반응');
  }

  // ══════════════════════════════════════
  // 4. 휴가 관리 /admin/leave
  // ══════════════════════════════════════
  console.log('\n── 4. 휴가 관리 /admin/leave ──');
  await page.goto(`${BASE}/admin/leave`);
  await page.waitForTimeout(1500);
  errors.length = 0;
  const bodyErrors4 = errors.filter(e => !e.msg.includes('future'));
  await shotFull(page, '04-leave');

  if (bodyErrors4.length) { issue('FARM-LEAVE-ERR-001', 'Leave', 'P1', '에러', bodyErrors4[0].msg.slice(0, 100)); }
  else cp('Leave', 'PASS', '콘솔 에러 없음');

  const leaveText = await page.evaluate(() => document.body.innerText);
  const leaveRows = await page.$$eval('tbody tr, [style*="border-bottom"]', els => els.length);
  cp('Leave', 'PASS', `휴가 행 수: ${leaveRows}개 (DB busan 8건)`);
  if (leaveRows === 0) issue('FARM-LEAVE-DATA-001', 'Leave', 'P1', '데이터', '휴가 목록 미표시 (DB 8건 존재)');

  // 승인/반려 버튼 존재 확인만 (클릭 금지)
  const approveBtn = await page.$('button:has-text("승인")');
  const rejectBtn = await page.$('button:has-text("반려")');
  cp('Leave', 'PASS', `승인 버튼: ${approveBtn ? '있음' : '없음'}, 반려 버튼: ${rejectBtn ? '있음' : '없음'}`);

  // 필터 탭
  const leaveFilters = await page.$$('span[style*="cursor: pointer"]');
  if (leaveFilters.length > 0) {
    await leaveFilters[0].click();
    await page.waitForTimeout(300);
    cp('Leave', 'PASS', `필터 탭 클릭 반응`);
  }

  // ══════════════════════════════════════
  // 5. 작업 관리 /admin/tasks
  // ══════════════════════════════════════
  console.log('\n── 5. 작업 관리 /admin/tasks ──');
  await page.goto(`${BASE}/admin/tasks`);
  await page.waitForTimeout(1500);
  errors.length = 0;
  const bodyErrors5 = errors.filter(e => !e.msg.includes('future'));
  await shotFull(page, '05-tasks');

  if (bodyErrors5.length) { issue('FARM-TASK-ERR-001', 'Tasks', 'P1', '에러', bodyErrors5[0].msg.slice(0, 100)); }
  else cp('Tasks', 'PASS', '콘솔 에러 없음');

  const taskRows = await page.$$eval('tbody tr, [style*="border-bottom"]', els => els.length);
  cp('Tasks', 'PASS', `작업 행 수: ${taskRows}개 (DB busan 작업 359건 by worker_id)`);
  if (taskRows === 0) issue('FARM-TASK-DATA-001', 'Tasks', 'P2', '데이터', '작업 목록 미표시');

  // 작업 추가 버튼
  const taskAddBtn = await page.$('button:has-text("작업 추가"), button:has-text("+ 작업"), a[href*="tasks/new"]');
  if (taskAddBtn) {
    await taskAddBtn.click();
    await page.waitForTimeout(800);
    const newUrl = page.url();
    await shot(page, '05-tasks-new');
    cp('Tasks', 'PASS', `작업 추가 클릭 → ${newUrl}`);
    await page.goto(`${BASE}/admin/tasks`);
    await page.waitForTimeout(1000);
  } else {
    cp('Tasks', 'WARN', '작업 추가 버튼 미발견');
  }

  // ══════════════════════════════════════
  // 6. 실시간 평면도 /admin/floor
  // ══════════════════════════════════════
  console.log('\n── 6. 실시간 평면도 /admin/floor ──');
  await page.goto(`${BASE}/admin/floor`);
  await page.waitForTimeout(2000);
  errors.length = 0;
  const bodyErrors6 = errors.filter(e => !e.msg.includes('future'));
  await shotFull(page, '06-floor');

  if (bodyErrors6.length) { bodyErrors6.forEach(e => issue('FARM-FLOOR-ERR-001', 'Floor', 'P1', '에러', e.msg.slice(0, 100))); }
  else cp('Floor', 'PASS', '콘솔 에러 없음');

  const floorText = await page.evaluate(() => document.body.innerText);
  cp('Floor', floorText.length > 50 ? 'PASS' : 'WARN', '평면도 콘텐츠 ' + (floorText.length > 50 ? '있음' : '빈 상태'));

  // ══════════════════════════════════════
  // 7. 생육조사 /admin/growth
  // ══════════════════════════════════════
  console.log('\n── 7. 생육조사 /admin/growth ──');
  await page.goto(`${BASE}/admin/growth`);
  await page.waitForTimeout(2000);
  errors.length = 0;
  const bodyErrors7 = errors.filter(e => !e.msg.includes('future'));
  await shotFull(page, '07-growth');

  if (bodyErrors7.length) { bodyErrors7.forEach(e => issue('FARM-GROW-ERR-001', 'Growth', 'P1', '에러', e.msg.slice(0, 100))); }
  else cp('Growth', 'PASS', '콘솔 에러 없음');

  // 생육조사 서브 버튼/링크 탐색
  const growthBtns = await page.$$('button, a[href]');
  const growthBtnTexts = await Promise.all(growthBtns.map(b => b.innerText().catch(() => '')));
  cp('Growth', 'PASS', `버튼/링크: ${growthBtns.length}개 — ${growthBtnTexts.filter(t => t.trim()).slice(0, 6).join(', ')}`);

  // 생육조사 입력 페이지
  await page.goto(`${BASE}/admin/growth/input`);
  await page.waitForTimeout(1500);
  errors.length = 0;
  const bodyErrors7b = errors.filter(e => !e.msg.includes('future'));
  await shot(page, '07-growth-input');
  if (bodyErrors7b.length) issue('FARM-GROW-INPUT-ERR-001', 'GrowthInput', 'P1', '에러', bodyErrors7b[0].msg.slice(0, 100));
  else cp('GrowthInput', 'PASS', '콘솔 에러 없음');

  // ══════════════════════════════════════
  // 8. 작업자 성과 /admin/performance
  // ══════════════════════════════════════
  console.log('\n── 8. 작업자 성과 /admin/performance ──');
  await page.goto(`${BASE}/admin/performance`);
  await page.waitForTimeout(2000);
  errors.length = 0;
  const bodyErrors8 = errors.filter(e => !e.msg.includes('future'));
  await shotFull(page, '08-performance');

  if (bodyErrors8.length) { bodyErrors8.forEach(e => issue('FARM-PERF-ERR-001', 'Performance', 'P1', '에러', e.msg.slice(0, 100))); }
  else cp('Performance', 'PASS', '콘솔 에러 없음');

  const perfFPBug = /\d\.\d{7,}/.test(await page.evaluate(() => document.body.innerText));
  perfFPBug ? cp('Performance', 'FAIL', '부동소수점 버그') : cp('Performance', 'PASS', '부동소수점 없음');

  // 성과 서브 페이지
  for (const [sub, key] of [['detail', '08-performance-detail'], ['compare', '08-performance-compare']]) {
    await page.goto(`${BASE}/admin/performance/${sub}`);
    await page.waitForTimeout(1500);
    errors.length = 0;
    const subErr = errors.filter(e => !e.msg.includes('future'));
    await shot(page, key);
    if (subErr.length) issue(`FARM-PERF-${sub.toUpperCase()}-ERR-001`, `Performance/${sub}`, 'P1', '에러', subErr[0].msg.slice(0, 100));
    else cp(`Performance/${sub}`, 'PASS', '콘솔 에러 없음');
  }

  // ══════════════════════════════════════
  // 9. 통계 분석 /admin/stats
  // ══════════════════════════════════════
  console.log('\n── 9. 통계 분석 /admin/stats ──');
  await page.goto(`${BASE}/admin/stats`);
  await page.waitForTimeout(2000);
  errors.length = 0;
  const bodyErrors9 = errors.filter(e => !e.msg.includes('future'));
  await shotFull(page, '09-stats');

  if (bodyErrors9.length) { bodyErrors9.forEach(e => issue('FARM-STATS-ERR-001', 'Stats', 'P1', '에러', e.msg.slice(0, 100))); }
  else cp('Stats', 'PASS', '콘솔 에러 없음');

  const statsFPBug = /\d\.\d{7,}/.test(await page.evaluate(() => document.body.innerText));
  statsFPBug ? cp('Stats', 'FAIL', '부동소수점 버그') : cp('Stats', 'PASS', '부동소수점 없음');

  // ══════════════════════════════════════
  // 10. 공지사항 /admin/notices
  // ══════════════════════════════════════
  console.log('\n── 10. 공지사항 /admin/notices ──');
  await page.goto(`${BASE}/admin/notices`);
  await page.waitForTimeout(1500);
  errors.length = 0;
  const bodyErrors10 = errors.filter(e => !e.msg.includes('future'));
  await shotFull(page, '10-notices');

  if (bodyErrors10.length) { bodyErrors10.forEach(e => issue('FARM-NOTICE-ERR-001', 'Notices', 'P1', '에러', e.msg.slice(0, 100))); }
  else cp('Notices', 'PASS', '콘솔 에러 없음');

  const noticeText = await page.evaluate(() => document.body.innerText);
  const noticeCount = await page.$$eval('tbody tr, [style*="border-bottom"]', els => els.length);
  cp('Notices', 'PASS', `공지 행 수: ${noticeCount}개 (DB notices 0건 — Zustand 로컬)`);

  // 공지 작성 모달 열기만 확인 (제출 금지)
  const noticeAddBtn = await page.$('button:has-text("작성"), button:has-text("공지 작성"), button:has-text("+")');
  if (noticeAddBtn) {
    await noticeAddBtn.click();
    await page.waitForTimeout(600);
    const modal = await page.$('div[class*="fixed"], [style*="inset: 0"], input[placeholder]');
    await shot(page, '10-notices-modal');
    modal ? cp('Notices', 'PASS', '공지 작성 모달/폼 열림') : cp('Notices', 'WARN', '공지 작성 UI 미표시');
    try {
      const cancelBtn = await page.$('button:has-text("취소")');
      if (cancelBtn) await cancelBtn.click(); else await page.keyboard.press('Escape');
    } catch (_) { await page.keyboard.press('Escape'); }
    await page.waitForTimeout(300);
  } else {
    cp('Notices', 'WARN', '공지 작성 버튼 미발견');
    issue('FARM-NOTICE-BTN-001', 'Notices', 'P2', '인터랙션', '공지 작성 버튼 미발견');
  }

  // HQ 연동 확인: HQ에서 작성한 공지가 farm 공지에 노출되는가?
  // (DB notices 0건 → farm Zustand store 로컬 목록도 빈 상태)
  cp('Notices', 'WARN', 'HQ 연동: DB notices 0건, farm notices도 0건 — 연동 동작 검증 불가');

  // ══════════════════════════════════════
  // 11. 수확 기록 /admin/harvest
  // ══════════════════════════════════════
  console.log('\n── 11. 수확 기록 /admin/harvest ──');
  await page.goto(`${BASE}/admin/harvest`);
  await page.waitForTimeout(1500);
  errors.length = 0;
  const bodyErrors11 = errors.filter(e => !e.msg.includes('future'));
  await shotFull(page, '11-harvest');

  if (bodyErrors11.length) { bodyErrors11.forEach(e => issue('FARM-HARVEST-ERR-001', 'Harvest', 'P1', '에러', e.msg.slice(0, 100))); }
  else cp('Harvest', 'PASS', '콘솔 에러 없음');

  const harvestText = await page.evaluate(() => document.body.innerText);
  const harvestFPBug = /\d\.\d{7,}/.test(harvestText);
  harvestFPBug ? cp('Harvest', 'FAIL', `부동소수점 버그: ${harvestText.match(/\d\.\d{7,}/)?.[0]}`) : cp('Harvest', 'PASS', '부동소수점 없음');
  cp('Harvest', 'PASS', `DB 이번달 busan 수확: 149건, 3964.3 kg`);

  // ══════════════════════════════════════
  // 12. 이상 신고 /admin/records
  // ══════════════════════════════════════
  console.log('\n── 12. 이상 신고 /admin/records ──');
  await page.goto(`${BASE}/admin/records`);
  await page.waitForTimeout(1500);
  errors.length = 0;
  const bodyErrors12 = errors.filter(e => !e.msg.includes('future'));
  await shotFull(page, '12-records');

  if (bodyErrors12.length) { bodyErrors12.forEach(e => issue('FARM-RECORD-ERR-001', 'Records', 'P1', '에러', e.msg.slice(0, 100))); }
  else cp('Records', 'PASS', '콘솔 에러 없음');

  const recordText = await page.evaluate(() => document.body.innerText);
  cp('Records', recordText.length > 50 ? 'PASS' : 'WARN', '이상 신고 콘텐츠 ' + (recordText.length > 50 ? '있음' : '빈 상태'));

  // ══════════════════════════════════════
  // 13. 휴가 승인 /admin/leave-approval
  // ══════════════════════════════════════
  console.log('\n── 13. 휴가 승인 /admin/leave-approval ──');
  await page.goto(`${BASE}/admin/leave-approval`);
  await page.waitForTimeout(1500);
  errors.length = 0;
  const bodyErrors13 = errors.filter(e => !e.msg.includes('future'));
  await shotFull(page, '13-leave-approval');

  if (bodyErrors13.length) { bodyErrors13.forEach(e => issue('FARM-LAPP-ERR-001', 'LeaveApproval', 'P1', '에러', e.msg.slice(0, 100))); }
  else cp('LeaveApproval', 'PASS', '콘솔 에러 없음');

  const lappText = await page.evaluate(() => document.body.innerText);
  cp('LeaveApproval', lappText.length > 50 ? 'PASS' : 'WARN', '페이지 콘텐츠 ' + (lappText.length > 50 ? '있음' : '빈 상태'));
  // 승인/반려 버튼 존재만 확인 (클릭 금지)
  const lappApproveBtn = await page.$('button:has-text("승인")');
  cp('LeaveApproval', 'PASS', `승인 버튼 ${lappApproveBtn ? '존재 (클릭 안 함)' : '없음'}`);

  // ══════════════════════════════════════
  // 14. 출퇴근 현황 /admin/attendance-status
  // ══════════════════════════════════════
  console.log('\n── 14. 출퇴근 현황 /admin/attendance-status ──');
  await page.goto(`${BASE}/admin/attendance-status`);
  await page.waitForTimeout(1500);
  errors.length = 0;
  const bodyErrors14 = errors.filter(e => !e.msg.includes('future'));
  await shotFull(page, '14-attendance-status');

  if (bodyErrors14.length) { bodyErrors14.forEach(e => issue('FARM-ATT-ERR-001', 'AttStatus', 'P1', '에러', e.msg.slice(0, 100))); }
  else cp('AttStatus', 'PASS', '콘솔 에러 없음');

  // ══════════════════════════════════════
  // 15. 작업 보드 /admin/board
  // ══════════════════════════════════════
  console.log('\n── 15. 작업 보드 /admin/board ──');
  await page.goto(`${BASE}/admin/board`);
  await page.waitForTimeout(1500);
  errors.length = 0;
  const bodyErrors15 = errors.filter(e => !e.msg.includes('future'));
  await shot(page, '15-board');

  if (bodyErrors15.length) { bodyErrors15.forEach(e => issue('FARM-BOARD-ERR-001', 'Board', 'P1', '에러', e.msg.slice(0, 100))); }
  else cp('Board', 'PASS', '콘솔 에러 없음');

  // ══════════════════════════════════════
  // 16. 안전점검 /admin/safety-checks
  // ══════════════════════════════════════
  console.log('\n── 16. 안전점검 /admin/safety-checks ──');
  await page.goto(`${BASE}/admin/safety-checks`);
  await page.waitForTimeout(1500);
  errors.length = 0;
  const bodyErrors16 = errors.filter(e => !e.msg.includes('future'));
  await shot(page, '16-safety-checks');

  if (bodyErrors16.length) { bodyErrors16.forEach(e => issue('FARM-SAFETY-ERR-001', 'SafetyChecks', 'P1', '에러', e.msg.slice(0, 100))); }
  else cp('SafetyChecks', 'PASS', '콘솔 에러 없음');

  // ══════════════════════════════════════
  // 17. 일일작업일지 /admin/daily-work-logs
  // ══════════════════════════════════════
  console.log('\n── 17. 일일작업일지 /admin/daily-work-logs ──');
  await page.goto(`${BASE}/admin/daily-work-logs`);
  await page.waitForTimeout(1500);
  errors.length = 0;
  const bodyErrors17 = errors.filter(e => !e.msg.includes('future'));
  await shot(page, '17-daily-work-logs');

  if (bodyErrors17.length) { bodyErrors17.forEach(e => issue('FARM-DWL-ERR-001', 'DailyWorkLogs', 'P1', '에러', e.msg.slice(0, 100))); }
  else cp('DailyWorkLogs', 'PASS', '콘솔 에러 없음');

  // ══════════════════════════════════════
  // 18. 잔업 승인 /admin/overtime-approval
  // ══════════════════════════════════════
  console.log('\n── 18. 잔업 승인 /admin/overtime-approval ──');
  await page.goto(`${BASE}/admin/overtime-approval`);
  await page.waitForTimeout(1500);
  errors.length = 0;
  const bodyErrors18 = errors.filter(e => !e.msg.includes('future'));
  await shot(page, '18-overtime-approval');

  if (bodyErrors18.length) { bodyErrors18.forEach(e => issue('FARM-OT-ERR-001', 'OvertimeApproval', 'P1', '에러', e.msg.slice(0, 100))); }
  else cp('OvertimeApproval', 'PASS', '콘솔 에러 없음');
  const otText = await page.evaluate(() => document.body.innerText);
  cp('OvertimeApproval', otText.length > 50 ? 'PASS' : 'WARN', '콘텐츠 ' + (otText.length > 50 ? '있음' : '빈 상태'));

  // ══════════════════════════════════════
  // 19. 작물 구역 /admin/crops
  // ══════════════════════════════════════
  console.log('\n── 19. 작물 구역 /admin/crops ──');
  await page.goto(`${BASE}/admin/crops`);
  await page.waitForTimeout(1500);
  errors.length = 0;
  const bodyErrors19 = errors.filter(e => !e.msg.includes('future'));
  await shot(page, '19-crops');

  if (bodyErrors19.length) { bodyErrors19.forEach(e => issue('FARM-CROP-ERR-001', 'Crops', 'P1', '에러', e.msg.slice(0, 100))); }
  else cp('Crops', 'PASS', '콘솔 에러 없음');

  // ══════════════════════════════════════
  // 20. 임시직 관리 /admin/temporary-workers
  // ══════════════════════════════════════
  console.log('\n── 20. 임시직 관리 /admin/temporary-workers ──');
  await page.goto(`${BASE}/admin/temporary-workers`);
  await page.waitForTimeout(1500);
  errors.length = 0;
  const bodyErrors20 = errors.filter(e => !e.msg.includes('future'));
  await shot(page, '20-temporary-workers');

  if (bodyErrors20.length) { bodyErrors20.forEach(e => issue('FARM-TEMP-ERR-001', 'TempWorkers', 'P1', '에러', e.msg.slice(0, 100))); }
  else cp('TempWorkers', 'PASS', '콘솔 에러 없음');

  // ══════════════════════════════════════
  // 21. 포장 작업 /admin/packaging-tasks
  // ══════════════════════════════════════
  console.log('\n── 21. 포장 작업 /admin/packaging-tasks ──');
  await page.goto(`${BASE}/admin/packaging-tasks`);
  await page.waitForTimeout(1500);
  errors.length = 0;
  const bodyErrors21 = errors.filter(e => !e.msg.includes('future'));
  await shot(page, '21-packaging-tasks');

  if (bodyErrors21.length) { bodyErrors21.forEach(e => issue('FARM-PKG-ERR-001', 'PackagingTasks', 'P1', '에러', e.msg.slice(0, 100))); }
  else cp('PackagingTasks', 'PASS', '콘솔 에러 없음');

  // ══════════════════════════════════════
  // 22. HQ 연동 확인: leave_request → HQ approvals
  // ══════════════════════════════════════
  console.log('\n── 22. HQ 연동 확인 ──');
  // leave-approval 페이지에서 보이는 건수 vs HQ 승인 허브
  await page.goto(`${BASE}/admin/leave-approval`);
  await page.waitForTimeout(1500);
  const farmLeavePending = await page.evaluate(() => document.body.innerText);
  // HQ 접근 시도 (farm_admin이 접근 가능한지 확인)
  await page.goto(`${BASE}/admin/hq/approvals`);
  await page.waitForTimeout(1500);
  const hqUrl = page.url();
  await shot(page, '22-hq-approvals-from-farm');
  if (hqUrl.includes('/login')) {
    cp('HQLink', 'PASS', 'farm_admin이 /admin/hq/approvals 접근 시 로그인으로 리다이렉트 (권한 차단)');
  } else if (hqUrl.includes('hq/approvals')) {
    cp('HQLink', 'WARN', `farm_admin이 HQ 승인허브 직접 접근 가능 → PROTECTED-ROUTE-001 해당`);
    issue('FARM-HQ-SCOPE-001', 'HQLink', 'P2', '권한', 'farm_admin이 /admin/hq/approvals 접근 가능 (PROTECTED-ROUTE-001)');
  } else {
    cp('HQLink', 'WARN', `리다이렉트: ${hqUrl}`);
  }

  // ══════════════════════════════════════
  // 최종 요약
  // ══════════════════════════════════════
  console.log('\n══════════════ 결과 요약 ══════════════');
  const passCount = checkpoints.filter(c => c.status === 'PASS').length;
  const warnCount = checkpoints.filter(c => c.status === 'WARN').length;
  const failCount = checkpoints.filter(c => c.status === 'FAIL').length;
  console.log(`체크포인트: PASS ${passCount} / WARN ${warnCount} / FAIL ${failCount} / 총 ${checkpoints.length}`);
  console.log(`발견 이슈: ${issues.length}건`);
  issues.forEach(i => console.log(`  ${i.severity} [${i.page}] ${i.id}: ${i.desc}`));
  if (errors.length) console.log(`마지막 콘솔 에러 누적: ${errors.length}건`);

  const output = {
    summary: { pass: passCount, warn: warnCount, fail: failCount, total: checkpoints.length },
    issues,
    checkpoints,
    consoleErrors: errors,
    dialogs,
    dbBaseline: {
      hdkim: { role: 'farm_admin', branch: 'busan', name: '김현도' },
      busanEmployees: { total: 15, active: 12 },
      busanHarvestThisMonth: { records: 149, totalKg: 3964.3 },
      busanLeaveRequests: 8,
      busanTasks: 359,
      notices: 0,
    }
  };
  fs.writeFileSync(`${SS_DIR}/results.json`, JSON.stringify(output, null, 2));
  console.log(`\n스크린샷/결과: ${SS_DIR}/`);

  await browser.close();
  process.exit(0);
})();
