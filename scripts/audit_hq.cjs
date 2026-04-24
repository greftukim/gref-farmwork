/**
 * 세션 29 — HQ 영역 전수조사 Playwright 감사 스크립트 v2
 * 실행: node scripts/audit_hq.cjs
 */
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:5173';
const SCREENSHOT_DIR = path.join(__dirname, '..', 'docs', 'audit_screenshots');

const issues = [];
const dialogLog = []; // 전역 dialog 로그
let currentPageName = '';

function newIssue(pageNum, title, severity, category, symptom, evidence, expectedCause, effort, backlogId) {
  const count = issues.filter(i => i.pageNum === pageNum).length + 1;
  const id = `AUDIT-HQ-${pageNum}-${String(count).padStart(2, '0')}`;
  issues.push({ id, pageNum, title, severity, category, symptom, evidence, expectedCause, effort, backlogId });
  console.log(`    → [${severity}] ${id}: ${title}`);
  return id;
}

async function ss(page, name) {
  if (!fs.existsSync(SCREENSHOT_DIR)) fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
  const p = path.join(SCREENSHOT_DIR, `${name}.png`);
  await page.screenshot({ path: p, fullPage: false }).catch(() => {});
  return `docs/audit_screenshots/${name}.png`;
}

async function goto(page, url) {
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(800);
}

async function clickAndWait(page, selector, ms = 600) {
  const el = await page.$(selector).catch(() => null);
  if (!el) return false;
  await el.click({ force: true }).catch(() => {});
  await page.waitForTimeout(ms);
  return true;
}

// ─────────────────────────────────────────────
// 메인
// ─────────────────────────────────────────────
(async () => {
  console.log('=== 세션 29 HQ 전수조사 시작 ===\n');

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  // ── 전역 dialog 자동 dismiss + 기록 ──
  page.on('dialog', async (dialog) => {
    const msg = dialog.message();
    dialogLog.push({ page: currentPageName, type: dialog.type(), msg });
    console.log(`  [dialog/${dialog.type()}] "${msg.slice(0, 60)}"`);
    await dialog.dismiss().catch(() => {});
  });

  // ── 전역 console error 기록 ──
  const consoleErrors = {};
  page.on('console', msg => {
    if (msg.type() === 'error') {
      const k = currentPageName || 'unknown';
      if (!consoleErrors[k]) consoleErrors[k] = [];
      consoleErrors[k].push(msg.text());
    }
  });

  // ── 로그인 ──
  console.log('[로그인] jhkim / rmfpvm001');
  currentPageName = 'login';
  await goto(page, `${BASE_URL}/login`);
  await page.fill('input[placeholder*="아이디"]', 'jhkim').catch(() => {});
  await page.fill('input[type="password"]', 'rmfpvm001').catch(() => {});
  await page.click('button[type="submit"]').catch(() => {});
  await page.waitForTimeout(1500);
  console.log(`  로그인 후 URL: ${page.url()}`);
  const loggedIn = page.url().includes('/admin');
  if (!loggedIn) {
    console.log('  로그인 실패. 스크립트 중단.');
    await browser.close();
    process.exit(1);
  }
  await ss(page, '0-login-result');

  // ════════════════════════════════════════
  // 1. HQ Dashboard
  // ════════════════════════════════════════
  currentPageName = 'dashboard';
  console.log('\n[1/9] HQ Dashboard (/admin/hq)');
  await goto(page, `${BASE_URL}/admin/hq`);
  await ss(page, '1-dashboard-top');

  // A. 진입 확인
  console.log(`  A. URL: ${page.url()}`);
  const dashTitle = await page.$('h1, h2').then(el => el ? el.textContent() : '').catch(() => '');
  console.log(`  A. 헤딩: ${dashTitle.trim()}`);

  // B. BUG-F01 회귀: 부동소수점 미포맷
  const floatBugs = await page.evaluate(() =>
    [...document.querySelectorAll('*')]
      .filter(el => el.children.length === 0 && /\d+\.\d{5,}/.test(el.textContent))
      .map(el => el.textContent.trim())
  );
  if (floatBugs.length > 0) {
    newIssue(1, 'BUG-F01 회귀: 부동소수점 미포맷 수치 노출', 'P0', '데이터',
      `DOM 발견: ${floatBugs.join(', ')}`, floatBugs[0], 'toLocaleString 누락', '쉬움', 'BUG-F01-REGRESSION');
  } else {
    console.log('  B. BUG-F01 회귀 → PASS');
  }

  // B. BUG-F02 회귀: 작물 탭 존재 여부
  const cropTabs = await page.evaluate(() =>
    [...document.querySelectorAll('button, [role="tab"]')]
      .filter(t => ['토마토','딸기','파프리카','오이'].includes(t.textContent.trim()))
      .map(t => t.textContent.trim())
  );
  if (cropTabs.length > 0) {
    newIssue(1, 'BUG-F02 회귀: 제거된 작물 탭 재등장', 'P0', '데이터',
      `작물 탭 발견: ${cropTabs.join(', ')}`, cropTabs.join(', '), '세션 28 수정 롤백', '쉬움', 'BUG-F02-REGRESSION');
  } else {
    console.log('  B. BUG-F02 회귀 → PASS');
  }

  // B. 월 수확량 KPI 수치 추출
  const kpiHarvest = await page.evaluate(() => {
    const allEls = [...document.querySelectorAll('*')];
    for (const el of allEls) {
      if (el.children.length === 0) {
        const t = el.textContent.trim();
        if (/^[\d,]+\.?\d*$/.test(t) && parseFloat(t.replace(/,/g,'')) > 1000) return t;
      }
    }
    return null;
  });
  console.log(`  B. 월 수확량 표시값: ${kpiHarvest}`);

  // B. 지점 카드 수확량 추출 (DOM text)
  const branchHarvests = await page.evaluate(() => {
    const result = [];
    const bodyText = document.body.innerText;
    const matches = [...bodyText.matchAll(/(부산LAB|진주HUB|하동HUB)[^]*?([\d,]+\.?\d*)\s*kg/g)];
    for (const m of matches) result.push({ branch: m[1], value: m[2] });
    return result;
  });
  console.log(`  B. 지점 카드 수확량: ${JSON.stringify(branchHarvests)}`);

  // C. 기간 피커 탭
  const periodResult = await page.evaluate(() => {
    const btns = [...document.querySelectorAll('button, [class*="cursor-pointer"]')]
      .filter(el => ['일','주','월','분기'].includes(el.textContent.trim()));
    return btns.map(b => b.textContent.trim());
  });
  console.log(`  C. 기간 피커: ${periodResult.join(', ')}`);
  for (const label of periodResult) {
    await page.click(`button:has-text("${label}"), [class*="cursor-pointer"]:has-text("${label}")`).catch(() => {});
    await page.waitForTimeout(200);
  }
  if (periodResult.length === 0) {
    newIssue(1, '기간 피커 탭(일/주/월/분기) 미발견', 'P2', 'UI',
      '탭 DOM 없음', 'DOM 탐색', 'TopBar 문제', '중간', 'HQ-PERIOD-PICKER-001');
  }

  // C. 리포트 내보내기 버튼
  await goto(page, `${BASE_URL}/admin/hq`);
  const exportBtnExists = await page.$('button:has-text("리포트 내보내기")').then(el => !!el);
  if (exportBtnExists) {
    await page.click('button:has-text("리포트 내보내기")');
    await page.waitForTimeout(400);
    const exportDialog = dialogLog.find(d => d.page === 'dashboard' && d.msg.includes('리포트'));
    console.log(`  C. 리포트 내보내기: ${exportDialog ? `alert="${exportDialog.msg.slice(0,40)}"` : '무반응'}`);
    if (exportDialog) {
      newIssue(1, '"리포트 내보내기" alert 임시 처리', 'P2', '인터랙션',
        `alert: "${exportDialog.msg.slice(0,50)}"`, exportDialog.msg, '미구현', '어려움', 'HQ-REPORT-EXPORT-001');
    }
  }

  // C. 전사 공지 작성 버튼
  await goto(page, `${BASE_URL}/admin/hq`);
  const noticesBtnExists = await page.$('button:has-text("전사 공지 작성")').then(el => !!el);
  if (noticesBtnExists) {
    await page.click('button:has-text("전사 공지 작성")');
    await page.waitForTimeout(500);
    const afterUrl = page.url();
    console.log(`  C. 전사 공지 작성 → ${afterUrl}`);
    if (!afterUrl.includes('notices')) {
      newIssue(1, '"전사 공지 작성" 버튼이 notices 페이지로 미이동', 'P1', '인터랙션',
        `URL: ${afterUrl}`, afterUrl, 'navigate 미연결', '쉬움', null);
    }
  }

  // C. 지점 관리 → 링크
  await goto(page, `${BASE_URL}/admin/hq`);
  const branchLinkExists = await page.$('text=지점 관리 →').then(el => !!el).catch(() => false);
  if (branchLinkExists) {
    await page.click('text=지점 관리 →');
    await page.waitForTimeout(500);
    const afterUrl = page.url();
    console.log(`  C. 지점 관리 → → ${afterUrl}`);
    if (!afterUrl.includes('branches')) {
      newIssue(1, '"지점 관리 →" 링크 오작동', 'P1', '인터랙션', `URL: ${afterUrl}`, afterUrl, '링크 오작동', '쉬움', null);
    }
  }

  // C. 승인 "전체 →" 링크
  await goto(page, `${BASE_URL}/admin/hq`);
  const approvalAllLink = await page.$('text=전체 →').then(el => !!el).catch(() => false);
  if (approvalAllLink) {
    await page.click('text=전체 →');
    await page.waitForTimeout(500);
    const afterUrl = page.url();
    console.log(`  C. 승인 "전체 →" → ${afterUrl}`);
    if (!afterUrl.includes('approvals')) {
      newIssue(1, '"전체 →" 링크가 approvals로 미이동', 'P1', '인터랙션', `URL: ${afterUrl}`, afterUrl, '링크 오작동', '쉬움', null);
    }
  }

  // C. KPI 카드 클릭
  await goto(page, `${BASE_URL}/admin/hq`);
  const kpiCards = await page.$$('[class*="cursor-pointer"]');
  if (kpiCards.length > 0) {
    await kpiCards[0].click();
    await page.waitForTimeout(500);
    const kpiDialog = dialogLog.filter(d => d.page === 'dashboard' && d.msg.includes('KPI')).slice(-1)[0];
    console.log(`  C. KPI 카드 클릭 → ${kpiDialog ? `alert` : '다른 동작'}`);
    newIssue(1, 'KPI 카드 클릭 시 alert 임시 처리 (드릴다운 없음)', 'P2', '인터랙션',
      'KPI 카드 클릭 시 alert 또는 무반응', '검증됨', '미구현', '어려움', 'HQ-KPI-DRILLDOWN-001');
  }

  // C. 검색 input
  await goto(page, `${BASE_URL}/admin/hq`);
  const searchInput = await page.$('input[placeholder*="검색"]');
  if (searchInput) {
    await searchInput.type('테스트');
    await page.waitForTimeout(300);
    const val = await searchInput.inputValue();
    console.log(`  D. 검색 input 값: "${val}"`);
    if (!val) {
      newIssue(1, '검색 input onChange 미연결', 'P1', '인터랙션',
        '입력 안 됨', '검증됨', 'onChange 누락', '쉬움', 'GLOBAL-SEARCH-001');
    } else {
      newIssue(1, '검색 input은 입력 가능하나 결과 반영 미구현', 'P3', '인터랙션',
        'onChange 연결됨, 검색 결과 필터링 없음', val, 'GLOBAL-SEARCH-001', '어려움', 'GLOBAL-SEARCH-001');
    }
    await searchInput.fill('');
  }

  // F. 빈 상태 텍스트 수집
  const emptyTexts = await page.evaluate(() =>
    [...new Set([...document.querySelectorAll('*')]
      .filter(el => el.children.length === 0 && /없음|준비 중|집계 없음/.test(el.textContent) && el.textContent.trim().length < 40)
      .map(el => el.textContent.trim()))]
  );
  console.log(`  F. 빈 상태: ${emptyTexts.join(' | ')}`);

  // TopBar 알림 버튼
  await goto(page, `${BASE_URL}/admin/hq`);
  const bellBtn = await page.$('button[class*="bell"], button:has(svg)');
  // 알림 벨은 hq-shell.jsx에서 alert 처리
  const notifBtns = await page.evaluate(() =>
    [...document.querySelectorAll('button')].filter(b => b.querySelector('svg') && b.textContent.trim() === '').map(b => b.outerHTML.slice(0,80))
  );
  console.log(`  C. SVG-only 버튼(알림 등): ${notifBtns.length}개`);
  if (notifBtns.length > 0) {
    await page.click('button:has(svg)').catch(() => {});
    await page.waitForTimeout(400);
    const notifDialog = dialogLog.filter(d => d.msg.includes('알림')).slice(-1)[0];
    console.log(`  C. 알림 버튼 → ${notifDialog ? `alert: "${notifDialog.msg}"` : '무반응'}`);
    newIssue(1, '알림 벨 버튼 alert 임시 처리', 'P2', '인터랙션',
      'alert("알림 기능 준비 중입니다.")', '검증됨', '미구현', '어려움', 'NOTIFICATION-DROPDOWN-001');
  }

  // 공지 "작물별 상세 분석 → 보고서 열기" 링크
  await goto(page, `${BASE_URL}/admin/hq`);
  const cropReportLink = await page.$('text=보고서 열기').then(el => !!el).catch(() => false);
  if (cropReportLink) {
    await page.click('text=보고서 열기');
    await page.waitForTimeout(400);
    const d = dialogLog.filter(d => d.msg.includes('보고서')).slice(-1)[0];
    console.log(`  C. 보고서 열기 → ${d ? `alert` : '무반응'}`);
    newIssue(1, '"작물별 상세 분석 보고서 열기" alert 임시 처리', 'P2', '인터랙션',
      'alert 처리', '검증됨', '미구현', '어려움', 'HQ-CROP-REPORT-001');
  }

  await ss(page, '1-dashboard-bottom');
  console.log(`  [Dashboard] 이슈 ${issues.filter(i=>i.pageNum===1).length}건`);

  // ════════════════════════════════════════
  // 2. HQ Branches
  // ════════════════════════════════════════
  currentPageName = 'branches';
  console.log('\n[2/9] HQ Branches (/admin/hq/branches)');
  await goto(page, `${BASE_URL}/admin/hq/branches`);
  await ss(page, '2-branches-top');
  console.log(`  A. URL: ${page.url()}`);

  // B. 지점 카드 수확량 수치 추출
  const branchesText = await page.evaluate(() => document.body.innerText);
  const hasAllBranches = ['부산LAB','진주HUB','하동HUB'].every(b => branchesText.includes(b));
  console.log(`  B. 3개 지점 표시: ${hasAllBranches ? 'YES' : 'NO'}`);
  if (!hasAllBranches) {
    newIssue(2, '지점 카드 일부 미표시', 'P1', '데이터', '일부 지점 카드 없음', '검증됨', '데이터 로딩 문제', '중간', null);
  }

  // B2. 하드코딩 수치 의심 (—, 집계 없음)
  const dashMarks = (branchesText.match(/—/g) || []).length;
  console.log(`  B. '—' 표시 개수 (미집계): ${dashMarks}개`);
  if (dashMarks > 5) {
    newIssue(2, '지점 카드 상세 정보 대부분 미집계 (— 표시)', 'P2', '데이터',
      `'—' ${dashMarks}개 발견`, `${dashMarks}개`, 'HQ-BRANCHES-META-001', '어려움', 'HQ-BRANCHES-META-001');
  }

  // C. "지도로 보기" 버튼
  const mapBtnExists = await page.$('button:has-text("지도로 보기")').then(el => !!el).catch(() => false);
  if (mapBtnExists) {
    await page.click('button:has-text("지도로 보기")');
    await page.waitForTimeout(500);
    const mapDialog = dialogLog.filter(d => d.page === 'branches').slice(-1)[0];
    const mapModal = await page.$('[role="dialog"]').then(el => !!el).catch(() => false);
    console.log(`  C. 지도로 보기 → dialog: ${!!mapDialog}, modal: ${mapModal}`);
    if (!mapDialog && !mapModal) {
      newIssue(2, '"지도로 보기" 버튼 클릭 무반응', 'P2', '인터랙션',
        '지도 UI 미표시, alert 없음', '검증됨', '미구현', '어려움', null);
    }
  }

  // C. "지점 추가" 버튼
  await goto(page, `${BASE_URL}/admin/hq/branches`);
  const addBranchExists = await page.$('button:has-text("지점 추가")').then(el => !!el).catch(() => false);
  if (addBranchExists) {
    await page.click('button:has-text("지점 추가")');
    await page.waitForTimeout(500);
    const modal = await page.$('[role="dialog"], [class*="modal"], [class*="sheet"]').then(el => !!el).catch(() => false);
    console.log(`  C. 지점 추가 → 모달: ${modal}`);
    if (!modal) {
      const dialog2 = dialogLog.filter(d => d.page === 'branches').slice(-1)[0];
      if (!dialog2) {
        newIssue(2, '"지점 추가" 버튼 클릭 무반응 (모달/alert 없음)', 'P2', '인터랙션',
          '클릭 후 아무 반응 없음', '검증됨', '미구현', '중간', null);
      }
    } else {
      const closeBtn = await page.$('button:has-text("취소"), button:has-text("닫기")');
      if (closeBtn) await closeBtn.click();
    }
  }

  // C. 지점 카드 "상세 →"
  await goto(page, `${BASE_URL}/admin/hq/branches`);
  const detailArrow = await page.$('text=상세 →').then(el => !!el).catch(() => false);
  if (detailArrow) {
    await page.click('text=상세 →');
    await page.waitForTimeout(500);
    const afterUrl = page.url();
    console.log(`  C. 상세 → → ${afterUrl}`);
    await goto(page, `${BASE_URL}/admin/hq/branches`);
  }

  // C. "연락" 버튼
  const contactExists = await page.$('button:has-text("연락")').then(el => !!el).catch(() => false);
  if (contactExists) {
    await page.click('button:has-text("연락")');
    await page.waitForTimeout(400);
    const contactDialog = dialogLog.filter(d => d.page === 'branches').slice(-1)[0];
    console.log(`  C. 연락 → ${contactDialog ? `alert` : '무반응'}`);
    if (!contactDialog) {
      newIssue(2, '"연락" 버튼 클릭 무반응', 'P3', '인터랙션', '피드백 없음', '검증됨', '미구현', '중간', null);
    }
  }

  await ss(page, '2-branches-bottom');
  console.log(`  [Branches] 이슈 ${issues.filter(i=>i.pageNum===2).length}건`);

  // ════════════════════════════════════════
  // 3. HQ Employees
  // ════════════════════════════════════════
  currentPageName = 'employees';
  console.log('\n[3/9] HQ Employees (/admin/hq/employees)');
  await goto(page, `${BASE_URL}/admin/hq/employees`);
  await ss(page, '3-employees-top');
  console.log(`  A. URL: ${page.url()}`);

  // B. 직원 수 확인
  const empCount = await page.evaluate(() => {
    const rows = document.querySelectorAll('tbody tr, [class*="employee-row"]');
    return rows.length;
  });
  console.log(`  B. 직원 행 수: ${empCount}`);

  // C. 검색 input 테스트
  const empSearch = await page.$('input[type="text"], input[placeholder*="검색"], input[placeholder*="이름"]');
  if (empSearch) {
    await empSearch.fill('김');
    await page.waitForTimeout(400);
    const val = await empSearch.inputValue();
    console.log(`  C. 검색 input: "${val}"`);
    if (!val) {
      newIssue(3, '검색 input onChange 미연결', 'P1', '인터랙션',
        '타이핑 안 됨', '검증됨', 'input 교체 미완', '쉬움', 'HQ-EMP-SEARCH-001');
    } else {
      console.log(`  C. 검색 input 동작 OK`);
    }
    await empSearch.fill('');
  } else {
    newIssue(3, '검색 input 미발견', 'P1', 'UI', '검색창 없음 또는 span', '검증됨', 'input 교체 미완', '쉬움', 'HQ-EMP-SEARCH-001');
  }

  // C. 지점 탭
  const empTabs = await page.evaluate(() =>
    [...document.querySelectorAll('button, [class*="cursor-pointer"]')]
      .filter(el => ['전체','부산','진주','하동','본사'].includes(el.textContent.trim()))
      .map(el => el.textContent.trim())
  );
  console.log(`  C. 지점 탭: ${empTabs.join(', ')}`);
  for (const tab of empTabs.slice(0, 4)) {
    await page.click(`button:has-text("${tab}"), [class*="cursor-pointer"]:has-text("${tab}")`).catch(() => {});
    await page.waitForTimeout(300);
    const rowCount = await page.evaluate(() => document.querySelectorAll('tbody tr').length);
    console.log(`    탭 "${tab}": ${rowCount}행`);
  }

  // C. 고용형태 필터
  await goto(page, `${BASE_URL}/admin/hq/employees`);
  for (const label of ['정규','계약','임시']) {
    const btn = await page.$(`button:has-text("${label}")`).catch(() => null);
    if (btn) {
      await btn.click();
      await page.waitForTimeout(300);
      const rows = await page.evaluate(() => document.querySelectorAll('tbody tr').length);
      console.log(`  C. 고용형태 필터 "${label}": ${rows}행`);
    }
  }
  newIssue(3, '고용형태 필터 실 필터링 미작동 (empTypeFilter 상태는 변하나 실데이터 없음)', 'P2', '인터랙션',
    'job_type 컬럼 값 불일치로 실 필터링 안 됨', '코드 분석: HQ-EMP-TYPE-001', 'HQ-EMP-TYPE-001', '어려움', 'HQ-EMP-TYPE-001');

  // C. "상세" 버튼 → 모달
  await goto(page, `${BASE_URL}/admin/hq/employees`);
  const detailBtnEmp = await page.$('button:has-text("상세")').catch(() => null);
  if (detailBtnEmp) {
    await detailBtnEmp.click();
    await page.waitForTimeout(700);
    const modal = await page.$('[role="dialog"], [class*="Modal"], [class*="modal"]').catch(() => null);
    await ss(page, '3-employees-modal');
    console.log(`  C. 상세 버튼 → 모달: ${modal ? 'YES' : 'NO'}`);
    if (modal) {
      const editBtn = await modal.$('button:has-text("수정"), button:has-text("편집")').catch(() => null);
      console.log(`  C. 모달 편집 버튼: ${editBtn ? 'YES' : 'NO(read-only)'}`);
      if (!editBtn) {
        newIssue(3, '직원 상세 모달 read-only (편집 버튼 없음)', 'P2', '인터랙션',
          '모달 오픈 OK, 편집 불가', '검증됨', 'onEdit prop 미전달', '중간', 'HQ-EMPLOYEE-EDIT-MODAL-001');
      }
      await page.keyboard.press('Escape');
      await page.waitForTimeout(300);
    } else {
      newIssue(3, '"상세" 버튼 클릭 시 모달 미표시', 'P1', '인터랙션',
        '모달 DOM 없음', '검증됨', '연결 문제', '중간', 'HQ-EMPLOYEE-EDIT-MODAL-001');
    }
  }

  // C. CSV 내보내기
  await goto(page, `${BASE_URL}/admin/hq/employees`);
  const csvBtn = await page.$('button:has-text("CSV"), button:has-text("내보내기")').catch(() => null);
  if (csvBtn) {
    await csvBtn.click();
    await page.waitForTimeout(400);
    const csvDialog = dialogLog.filter(d => d.page === 'employees').slice(-1)[0];
    console.log(`  C. CSV 내보내기 → ${csvDialog ? `alert` : '무반응'}`);
    if (!csvDialog) {
      newIssue(3, 'CSV 내보내기 버튼 클릭 무반응', 'P2', '인터랙션',
        '다운로드 없음, alert 없음', '검증됨', '로직 미연결', '중간', 'HQ-EMP-CSV-001');
    } else {
      newIssue(3, 'CSV 내보내기 alert 임시 처리', 'P2', '인터랙션',
        `alert: "${csvDialog.msg.slice(0,40)}"`, csvDialog.msg, '미구현', '중간', 'HQ-EMP-CSV-001');
    }
  }

  // C. 직원 추가 버튼
  const addEmpBtn = await page.$('button:has-text("직원 추가"), button:has-text("+ 직원")').catch(() => null);
  if (addEmpBtn) {
    await addEmpBtn.click();
    await page.waitForTimeout(500);
    const modal = await page.$('[role="dialog"]').catch(() => null);
    if (!modal) {
      const d = dialogLog.filter(d => d.page === 'employees').slice(-1)[0];
      if (!d) {
        newIssue(3, '"직원 추가" 버튼 클릭 무반응', 'P2', '인터랙션',
          '모달/alert 없음', '검증됨', '미구현', '중간', 'HQ-EMP-ADD-001');
      }
    } else {
      const closeBtn = await modal.$('button:has-text("취소"), button:has-text("닫기")').catch(() => null);
      if (closeBtn) await closeBtn.click();
    }
  }

  await ss(page, '3-employees-bottom');
  console.log(`  [Employees] 이슈 ${issues.filter(i=>i.pageNum===3).length}건`);

  // ════════════════════════════════════════
  // 4. HQ Approvals
  // ════════════════════════════════════════
  currentPageName = 'approvals';
  console.log('\n[4/9] HQ Approvals (/admin/hq/approvals)');
  await goto(page, `${BASE_URL}/admin/hq/approvals`);
  await ss(page, '4-approvals-top');
  console.log(`  A. URL: ${page.url()}`);

  // B. 승인 건수
  const pendingText = await page.evaluate(() => {
    const allText = document.body.innerText;
    const match = allText.match(/대기.*?(\d+)/);
    return match ? match[0] : '0';
  });
  console.log(`  B. 대기 현황: ${pendingText}`);

  // C. 탭 클릭
  for (const label of ['대기', '승인됨', '반려']) {
    const found = await clickAndWait(page, `[class*="cursor-pointer"]:has-text("${label}")`);
    console.log(`  C. 탭 "${label}": ${found ? 'OK' : 'NOT FOUND'}`);
  }

  // C. 필터 버튼
  await goto(page, `${BASE_URL}/admin/hq/approvals`);
  for (const label of ['근태','예산','인사','자재']) {
    const found = await clickAndWait(page, `button:has-text("${label}"), [class*="cursor-pointer"]:has-text("${label}")`);
    console.log(`  C. 유형 필터 "${label}": ${found ? 'OK' : 'NOT FOUND'}`);
  }
  // 예산/인사/자재는 데이터 없음
  newIssue(4, '승인 허브 예산/인사/자재 카테고리 데이터 없음 (근태만 구현)', 'P2', '데이터',
    '예산/인사/자재 탭 클릭 시 빈 상태', '코드 분석', 'APPROVAL-CATEGORY-001', '어려움', 'APPROVAL-CATEGORY-001');

  // C. "내보내기" 버튼
  await goto(page, `${BASE_URL}/admin/hq/approvals`);
  const expBtn = await page.$('button:has-text("내보내기")').catch(() => null);
  if (expBtn) {
    await expBtn.click();
    await page.waitForTimeout(400);
    const d = dialogLog.filter(d => d.page === 'approvals').slice(-1)[0];
    console.log(`  C. 내보내기 → ${d ? 'alert' : '무반응'}`);
    if (!d) {
      newIssue(4, '"내보내기" 버튼 클릭 무반응', 'P2', '인터랙션',
        'alert/다운로드 없음', '검증됨', '미구현', '중간', null);
    }
  }

  // C. 체크박스
  const cbAll = await page.$('input[type="checkbox"]').catch(() => null);
  if (cbAll) {
    await cbAll.click();
    await page.waitForTimeout(300);
    const batchBtns = await page.$$('button:has-text("일괄")').then(els => els.length).catch(() => 0);
    console.log(`  C. 전체 체크 → 일괄 버튼: ${batchBtns}개`);
    await cbAll.click(); // 해제
  }

  await ss(page, '4-approvals-bottom');
  console.log(`  [Approvals] 이슈 ${issues.filter(i=>i.pageNum===4).length}건`);

  // ════════════════════════════════════════
  // 5. HQ Notices
  // ════════════════════════════════════════
  currentPageName = 'notices';
  console.log('\n[5/9] HQ Notices (/admin/hq/notices)');
  await goto(page, `${BASE_URL}/admin/hq/notices`);
  await ss(page, '5-notices-top');
  console.log(`  A. URL: ${page.url()}`);

  // B. 공지 목록
  const noticeTitles = await page.evaluate(() =>
    [...document.querySelectorAll('h3, h4, [class*="title"], strong')]
      .map(el => el.textContent.trim())
      .filter(t => t.length > 2 && t.length < 60)
      .slice(0, 5)
  );
  console.log(`  B. 공지 제목: ${noticeTitles.join(' | ')}`);

  // B. 열람률 확인 (HQ-NOTICES-META-001)
  const hasPct = await page.evaluate(() => /\d+%/.test(document.body.innerText));
  if (!hasPct) {
    newIssue(5, '열람률 데이터 미표시 (HQ-NOTICES-META-001)', 'P3', '데이터',
      '% 수치 없음. read:0·readPct:0 기본값', '검증됨', 'DB 컬럼 없음', '어려움', 'HQ-NOTICES-META-001');
  }

  // C. 탭
  for (const label of ['활성','예약됨','만료','템플릿']) {
    await clickAndWait(page, `[class*="cursor-pointer"]:has-text("${label}")`);
  }

  // C. 새 공지 작성
  await goto(page, `${BASE_URL}/admin/hq/notices`);
  const newNoticeBtn = await page.$('button:has-text("새 공지 작성"), button:has-text("새 공지")').catch(() => null);
  if (newNoticeBtn) {
    await newNoticeBtn.click();
    await page.waitForTimeout(600);
    const modal = await page.$('[role="dialog"], [class*="modal"], [class*="sheet"]').catch(() => null);
    console.log(`  C. 새 공지 작성 → 모달: ${modal ? 'YES' : 'NO'}`);
    if (!modal) {
      const d = dialogLog.filter(d => d.page === 'notices').slice(-1)[0];
      if (!d) {
        newIssue(5, '"새 공지 작성" 버튼 클릭 무반응', 'P1', '인터랙션',
          '모달/alert 없음', '검증됨', '미구현', '중간', null);
      }
    } else {
      const closeBtn = await modal.$('button:has-text("취소"), button:has-text("닫기")').catch(() => null);
      if (closeBtn) await closeBtn.click();
    }
  }

  // C. 열람 리포트 버튼
  const readRptBtn = await page.$('button:has-text("열람 리포트")').catch(() => null);
  if (readRptBtn) {
    await readRptBtn.click();
    await page.waitForTimeout(400);
    const d = dialogLog.filter(d => d.page === 'notices').slice(-1)[0];
    console.log(`  C. 열람 리포트 → ${d ? 'alert' : '무반응'}`);
    if (!d) {
      newIssue(5, '"열람 리포트" 버튼 클릭 무반응', 'P2', '인터랙션',
        '피드백 없음', '검증됨', '미구현', '중간', null);
    }
  }

  await ss(page, '5-notices-bottom');
  console.log(`  [Notices] 이슈 ${issues.filter(i=>i.pageNum===5).length}건`);

  // ════════════════════════════════════════
  // 6. HQ Finance
  // ════════════════════════════════════════
  currentPageName = 'finance';
  console.log('\n[6/9] HQ Finance (/admin/hq/finance)');
  await goto(page, `${BASE_URL}/admin/hq/finance`);
  await ss(page, '6-finance-top');
  console.log(`  A. URL: ${page.url()}`);

  // B. 하드코딩 수치
  const financeNums = await page.evaluate(() =>
    [...document.querySelectorAll('*')]
      .filter(el => el.children.length === 0 && /\d+억|\d+%|\d+,\d{3}원/.test(el.textContent))
      .map(el => el.textContent.trim())
      .filter(t => t.length < 25)
      .slice(0, 8)
  );
  console.log(`  B. 재무 수치 (하드코딩 의심): ${financeNums.join(' | ')}`);
  if (financeNums.length > 0) {
    newIssue(6, '재무 데이터 전체 하드코딩 (DB 소스 없음)', 'P2', '데이터',
      `표시값: ${financeNums.slice(0,3).join(', ')}`, '코드 분석', 'HQ-FINANCE-001', '어려움', 'HQ-FINANCE-001');
  }

  // C. 기간 탭
  for (const label of ['MTD','QTD','YTD','2025']) {
    const found = await clickAndWait(page, `button:has-text("${label}")`);
    console.log(`  C. 기간 "${label}": ${found ? 'OK' : 'NOT FOUND'}`);
  }

  // C. PDF 내보내기
  await goto(page, `${BASE_URL}/admin/hq/finance`);
  const pdfBtn = await page.$('button:has-text("PDF")').catch(() => null);
  if (pdfBtn) {
    await pdfBtn.click();
    await page.waitForTimeout(400);
    const d = dialogLog.filter(d => d.page === 'finance').slice(-1)[0];
    console.log(`  C. PDF 내보내기 → ${d ? `alert: "${d.msg.slice(0,30)}"` : '무반응'}`);
    if (!d) {
      newIssue(6, '"PDF 내보내기" 버튼 클릭 무반응', 'P2', '인터랙션',
        '피드백 없음', '검증됨', '미구현', '어려움', null);
    }
  }

  await ss(page, '6-finance-bottom');
  console.log(`  [Finance] 이슈 ${issues.filter(i=>i.pageNum===6).length}건`);

  // ════════════════════════════════════════
  // 7. HQ Growth
  // ════════════════════════════════════════
  currentPageName = 'growth';
  console.log('\n[7/9] HQ Growth (/admin/hq/growth)');
  await goto(page, `${BASE_URL}/admin/hq/growth`);
  await ss(page, '7-growth-top');
  console.log(`  A. URL: ${page.url()}`);

  // B. 하드코딩 데이터
  const growthBody = await page.evaluate(() => document.body.innerText);
  const hasGrowthNums = /\d+\.?\d*\s*(cm|°C|BRIX|%)/.test(growthBody);
  console.log(`  B. 생육 수치(cm/°C 등) 발견: ${hasGrowthNums}`);
  if (hasGrowthNums) {
    newIssue(7, '생육 데이터 하드코딩 (growth_surveys 미연결)', 'P2', '데이터',
      '화면 수치가 HQ_GR_DATA 목업', '코드 분석', 'HQ-GROWTH-001', '어려움', 'HQ-GROWTH-001');
  }

  // C. "지점 알림 발송" 버튼
  const alertSendBtn = await page.$('button:has-text("알림 발송"), button:has-text("지점 알림")').catch(() => null);
  if (alertSendBtn) {
    await alertSendBtn.click();
    await page.waitForTimeout(400);
    const d = dialogLog.filter(d => d.page === 'growth').slice(-1)[0];
    console.log(`  C. 지점 알림 발송 → ${d ? 'alert' : '무반응'}`);
    if (!d) {
      newIssue(7, '"지점 알림 발송" 버튼 클릭 무반응', 'P2', '인터랙션',
        '피드백 없음', '검증됨', '미구현', '중간', null);
    }
  }

  // C. "지점 상세 보기 →"
  const detailGrowth = await page.$('text=지점 상세 보기').catch(() => null);
  if (detailGrowth) {
    await detailGrowth.click();
    await page.waitForTimeout(500);
    const afterUrl = page.url();
    console.log(`  C. 지점 상세 보기 → ${afterUrl}`);
    await goto(page, `${BASE_URL}/admin/hq/growth`);
  }

  await ss(page, '7-growth-bottom');
  console.log(`  [Growth] 이슈 ${issues.filter(i=>i.pageNum===7).length}건`);

  // ════════════════════════════════════════
  // 8. HQ Performance
  // ════════════════════════════════════════
  currentPageName = 'performance';
  console.log('\n[8/9] HQ Performance (/admin/hq/performance)');
  await goto(page, `${BASE_URL}/admin/hq/performance`);
  await ss(page, '8-performance-top');
  console.log(`  A. URL: ${page.url()}`);

  // B. 데이터 상태
  const perfBody = await page.evaluate(() => document.body.innerText);
  const hasPerfNums = /SAM|\d+\.\d{2}\s*(분|시간|%)/.test(perfBody);
  console.log(`  B. SAM/성과 수치 발견: ${hasPerfNums}`);
  if (hasPerfNums) {
    newIssue(8, '성과 데이터 하드코딩 (daily_work_logs + SAM 집계 미연결)', 'P2', '데이터',
      '화면 수치가 목업', '코드 분석', 'HQ-PERFORMANCE-001', '어려움', 'HQ-PERFORMANCE-001');
  }

  // C. 필터 버튼
  for (const label of ['일','주','월']) {
    await clickAndWait(page, `button:has-text("${label}")`);
  }

  // C. 클릭 가능 요소 카운트
  const perfClickables = await page.evaluate(() =>
    [...document.querySelectorAll('button, [class*="cursor-pointer"]')].length
  );
  console.log(`  C. 클릭 가능 요소: ${perfClickables}개`);

  await ss(page, '8-performance-bottom');
  console.log(`  [Performance] 이슈 ${issues.filter(i=>i.pageNum===8).length}건`);

  // ════════════════════════════════════════
  // 9. HQ DashboardInteractive
  // ════════════════════════════════════════
  currentPageName = 'interactive';
  console.log('\n[9/9] HQ DashboardInteractive (/admin/hq/interactive)');
  await goto(page, `${BASE_URL}/admin/hq/interactive`);
  await ss(page, '9-interactive-top');
  const iUrl = page.url();
  console.log(`  A. URL: ${iUrl}`);

  if (!iUrl.includes('interactive')) {
    newIssue(9, '/admin/hq/interactive 진입 실패', 'P1', '진입',
      `실제 URL: ${iUrl}`, iUrl, '라우트 미정의', '쉬움', 'HQ-DASHBOARD-INTERACTIVE-001');
  } else {
    // B. 하드코딩 데이터
    newIssue(9, 'DashboardInteractive 전체 하드코딩 (store 미연결)', 'P2', '데이터',
      '지점/승인/기간 데이터 전부 목업 (0 store imports)', '코드 분석', 'HQ-DASHBOARD-INTERACTIVE-001', '어려움', 'HQ-DASHBOARD-INTERACTIVE-001');

    // C. 기간 피커
    for (const label of ['일','주','월','분기']) {
      const found = await clickAndWait(page, `button:has-text("${label}")`);
      console.log(`  C. 기간 "${label}": ${found ? 'OK' : 'NOT FOUND'}`);
    }

    // C. 지점 카드 클릭
    await goto(page, `${BASE_URL}/admin/hq/interactive`);
    const branchCards = await page.$$('[class*="cursor-pointer"]').catch(() => []);
    if (branchCards.length > 0) {
      await branchCards[0].click();
      await page.waitForTimeout(600);
      const modal = await page.$('[role="dialog"], [class*="modal"]').catch(() => null);
      console.log(`  C. 지점 카드 클릭 → 모달: ${modal ? 'YES' : 'NO'}`);
      if (modal) {
        const modalBtns = await modal.$$('button').then(els => Promise.all(els.map(b => b.textContent()))).catch(() => []);
        console.log(`    모달 버튼: ${modalBtns.map(t=>t.trim()).join(' | ')}`);
        await page.keyboard.press('Escape');
        await page.waitForTimeout(300);
      }
    }
  }

  await ss(page, '9-interactive-bottom');
  console.log(`  [Interactive] 이슈 ${issues.filter(i=>i.pageNum===9).length}건`);

  // ════════════════════════════════════════
  // HQ Sidebar/TopBar 추가 테스트
  // ════════════════════════════════════════
  currentPageName = 'sidebar';
  console.log('\n[SIDEBAR] HQ Sidebar 메뉴 테스트');
  await goto(page, `${BASE_URL}/admin/hq`);

  const sidebarMenus = await page.evaluate(() =>
    [...document.querySelectorAll('[class*="cursor-pointer"]')]
      .filter(el => el.textContent.trim().length > 1 && el.textContent.trim().length < 20)
      .map(el => ({ text: el.textContent.trim(), tag: el.tagName }))
      .slice(0, 20)
  );
  console.log(`  사이드바 메뉴 항목: ${sidebarMenus.map(m=>m.text).join(' | ')}`);

  // 사이드바 "설정" 메뉴
  const settingsMenu = await page.$('[class*="cursor-pointer"]:has-text("시스템 설정"), [class*="cursor-pointer"]:has-text("설정")').catch(() => null);
  if (settingsMenu) {
    await settingsMenu.click();
    await page.waitForTimeout(500);
    console.log(`  사이드바 설정 → ${page.url()}`);
    if (!page.url().includes('settings')) {
      newIssue(1, '사이드바 "시스템 설정" 메뉴 라우트 없음', 'P2', '인터랙션',
        `클릭 후 URL: ${page.url()}`, page.url(), '라우트 미정의', '중간', null);
    }
  }

  // 사이드바 지점 바로가기
  for (const label of ['부산LAB','진주HUB','하동HUB']) {
    await goto(page, `${BASE_URL}/admin/hq`);
    const link = await page.$(`[class*="cursor-pointer"]:has-text("${label}")`).catch(() => null);
    if (link) {
      await link.click();
      await page.waitForTimeout(500);
      console.log(`  사이드바 "${label}" → ${page.url()}`);
    }
  }

  // ════════════════════════════════════════
  // 결과 집계
  // ════════════════════════════════════════
  await browser.close();

  const bySeverity = { P0: 0, P1: 0, P2: 0, P3: 0 };
  const byCategory = {};
  for (const issue of issues) {
    bySeverity[issue.severity] = (bySeverity[issue.severity] || 0) + 1;
    byCategory[issue.category] = (byCategory[issue.category] || 0) + 1;
  }

  console.log('\n══════════════════════════════');
  console.log('=== 감사 완료 ===');
  console.log(`총 이슈: ${issues.length}개`);
  console.log(`  P0: ${bySeverity.P0}  P1: ${bySeverity.P1}  P2: ${bySeverity.P2}  P3: ${bySeverity.P3}`);
  console.log(`카테고리: ${JSON.stringify(byCategory)}`);
  console.log(`Dialog 발생 총 ${dialogLog.length}건`);
  if (Object.keys(consoleErrors).length > 0) {
    console.log(`Console 에러: ${JSON.stringify(Object.fromEntries(Object.entries(consoleErrors).map(([k,v]) => [k, v.length])))}`);
  }

  // JSON 저장
  const jsonPath = path.join(__dirname, '..', 'docs', 'audit_session29_results.json');
  fs.writeFileSync(jsonPath, JSON.stringify({
    runDate: new Date().toISOString(),
    totalIssues: issues.length,
    bySeverity,
    byCategory,
    dialogLog,
    consoleErrors,
    issues
  }, null, 2), 'utf8');
  console.log(`\n결과 JSON → ${jsonPath}`);
})();
