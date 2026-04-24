// 세션 30 회귀 테스트
const { chromium } = require('playwright');
const fs = require('fs');

const BASE = 'http://localhost:5173';
const SS_DIR = 'docs/regression_session30';
if (!fs.existsSync(SS_DIR)) fs.mkdirSync(SS_DIR, { recursive: true });

async function shot(page, name) {
  await page.screenshot({ path: `${SS_DIR}/${name}.png`, fullPage: false });
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  const errors = [];
  const dialogs = [];
  page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
  page.on('dialog', async d => { dialogs.push({ type: d.type(), msg: d.message().slice(0, 80) }); await d.dismiss(); });

  const results = [];
  const pass = (name, note = '') => { results.push({ name, status: 'PASS', note }); console.log(`✅ ${name}${note ? ' — ' + note : ''}`); };
  const fail = (name, note = '') => { results.push({ name, status: 'FAIL', note }); console.log(`❌ ${name}${note ? ' — ' + note : ''}`); };

  // 로그인
  await page.goto(`${BASE}/login`);
  await page.waitForSelector('input[placeholder*="아이디"]', { timeout: 10000 });
  await page.fill('input[placeholder*="아이디"]', 'jhkim');
  await page.fill('input[placeholder*="비밀번호"]', 'rmfpvm001');
  await page.click('button[type="submit"]');
  await page.waitForURL('**/admin/**', { timeout: 10000 });
  await page.waitForTimeout(1500);
  console.log('✅ 로그인 완료');

  // ── 세션 28 회귀: BUG-F01 / BUG-F02 ──
  await page.goto(`${BASE}/admin/hq`);
  await page.waitForTimeout(2000);
  await shot(page, '0-dashboard');
  const bodyText = await page.evaluate(() => document.body.innerText);
  // BUG-F01: 소수점 버그 확인
  const hasFPBug = /\d\.\d{7,}/.test(bodyText);
  hasFPBug ? fail('BUG-F01 회귀 (부동소수점)', bodyText.match(/\d\.\d{7,}/)?.[0]) : pass('BUG-F01 PASS (부동소수점 없음)');
  // BUG-F02: 작물 필터 탭 버튼 존재 여부 (차트 레이블은 SVG <text>이므로 button으로만 체크)
  const cropTabTomato = await page.$('button:has-text("토마토")');
  const cropTabStrawberry = await page.$('button:has-text("딸기")');
  const cropTabPaprika = await page.$('button:has-text("파프리카")');
  const hasCropTabBtns = !!(cropTabTomato || cropTabStrawberry || cropTabPaprika);
  hasCropTabBtns ? fail('BUG-F02 회귀 (작물 탭 버튼 잔존)') : pass('BUG-F02 PASS (작물 필터 탭 없음)');

  // ── Task 1: 검색창 input 확인 ──
  await page.goto(`${BASE}/admin/hq/employees`);
  await page.waitForTimeout(1500);
  await shot(page, '1-employees');
  const searchInput = await page.$('input[placeholder*="이름, 연락처"]');
  searchInput ? pass('Task1 검색창 input 존재') : fail('Task1 검색창 input 미발견');

  // 검색 타이핑 테스트
  if (searchInput) {
    const beforeCount = await page.$$eval('tbody tr', rows => rows.length);
    await searchInput.fill('김');
    await page.waitForTimeout(500);
    const afterCount = await page.$$eval('tbody tr', rows => rows.length);
    await shot(page, '1-employees-search');
    afterCount <= beforeCount ? pass(`Task1 필터 동작 (전체${beforeCount}→필터${afterCount})`) : fail('Task1 필터 미작동');
    await searchInput.fill('');
    await page.waitForTimeout(300);
  }

  // ── Task 2: 직원 상세 모달 ──
  const detailBtn = await page.$('button:has-text("상세")');
  if (detailBtn) {
    await detailBtn.click();
    await page.waitForTimeout(800);
    // Modal 컴포넌트: <div className="fixed inset-0 z-50 ..."> 구조
    const modal = await page.$('div[class*="fixed"][class*="z-50"]');
    await shot(page, '2-employee-modal');
    modal ? pass('Task2 직원 상세 모달 열림') : fail('Task2 직원 상세 모달 미표시');
    // 닫기 버튼 — EmployeeDetailModal에 <Button>닫기</Button> 존재
    try {
      const closeBtn = await page.$('button:has-text("닫기")');
      if (closeBtn) {
        await closeBtn.click({ timeout: 3000 });
      } else {
        await page.keyboard.press('Escape');
      }
    } catch (_) {
      await page.keyboard.press('Escape');
    }
    await page.waitForTimeout(300);
  } else {
    fail('Task2 직원 상세 버튼 미발견');
  }

  // ── Task 3: 새 공지 작성 모달 ──
  await page.goto(`${BASE}/admin/hq/notices`);
  await page.waitForTimeout(1500);
  await shot(page, '3-notices');
  const noticeBtn = await page.$('button:has-text("새 공지 작성")');
  if (noticeBtn) {
    await noticeBtn.click();
    await page.waitForTimeout(600);
    const modal = await page.$('input[placeholder*="공지 제목"]');
    await shot(page, '3-notices-modal');
    modal ? pass('Task3 공지 작성 모달 열림') : fail('Task3 공지 작성 모달 미표시');
    // 취소
    try {
      const cancelBtn = await page.$('button:has-text("취소")');
      if (cancelBtn) await cancelBtn.click({ timeout: 3000 });
      else await page.keyboard.press('Escape');
    } catch (_) {
      await page.keyboard.press('Escape');
    }
    await page.waitForTimeout(300);
  } else {
    fail('Task3 새 공지 작성 버튼 미발견');
  }

  // ── Task 4: 패턴 A 버튼 alert 테스트 5개 ──
  const alertTests = [
    { url: `${BASE}/admin/hq/employees`, selector: 'button:has-text("CSV 내보내기")', name: 'Task4-CSV내보내기' },
    { url: `${BASE}/admin/hq/employees`, selector: 'button:has-text("직원 추가")', name: 'Task4-직원추가' },
    { url: `${BASE}/admin/hq/branches`, selector: 'button:has-text("지도로 보기")', name: 'Task4-지도보기' },
    { url: `${BASE}/admin/hq/branches`, selector: 'button:has-text("지점 추가")', name: 'Task4-지점추가' },
    { url: `${BASE}/admin/hq/approvals`, selector: 'button:has-text("내보내기")', name: 'Task4-승인내보내기' },
  ];

  let lastUrl = '';
  for (const t of alertTests) {
    if (t.url !== lastUrl) {
      await page.goto(t.url);
      await page.waitForTimeout(1200);
      lastUrl = t.url;
    }
    const btn = await page.$(t.selector);
    if (!btn) { fail(`${t.name} 버튼 미발견`); continue; }
    dialogs.length = 0;
    try {
      await btn.click({ timeout: 3000 });
      await page.waitForTimeout(400);
      dialogs.length > 0 ? pass(`${t.name} alert 반응 확인`) : fail(`${t.name} alert 없음 (무반응)`);
    } catch (e) {
      fail(`${t.name} 클릭 에러: ${e.message.slice(0, 60)}`);
    }
  }

  // ── Task 5: 지점 상세 버튼 alert ──
  await page.goto(`${BASE}/admin/hq/branches`);
  await page.waitForTimeout(1500);
  await shot(page, '5-branches');
  const branchDetailBtn = await page.$('button:has-text("상세 →")');
  if (branchDetailBtn) {
    dialogs.length = 0;
    try {
      await branchDetailBtn.click({ timeout: 3000 });
      await page.waitForTimeout(400);
      dialogs.length > 0 ? pass('Task5 지점 상세 → alert 반응') : fail('Task5 지점 상세 → 무반응');
    } catch (e) {
      fail(`Task5 클릭 에러: ${e.message.slice(0, 60)}`);
    }
  } else {
    fail('Task5 지점 상세 → 버튼 미발견');
  }

  // 최종 요약
  console.log('\n══════════════ 결과 요약 ══════════════');
  const passCount = results.filter(r => r.status === 'PASS').length;
  const failCount = results.filter(r => r.status === 'FAIL').length;
  console.log(`PASS: ${passCount} / FAIL: ${failCount} / 총: ${results.length}`);
  if (errors.length) console.log(`Console Errors: ${errors.length}건`);

  fs.writeFileSync(`${SS_DIR}/results.json`, JSON.stringify({ results, dialogs, errors }, null, 2));
  console.log(`스크린샷 저장: ${SS_DIR}/`);

  await browser.close();
  process.exit(failCount > 0 ? 1 : 0);
})();
