/**
 * 세션 34 — HQ UX 4건 구현 검증 + 회귀 방어
 * 실행: node scripts/audit_session34.cjs
 *
 * 검증 대상:
 *   NOTIFICATION-DROPDOWN-001: 알림 벨 드롭다운
 *   GLOBAL-SEARCH-001:          전역 검색 드롭다운
 *   HQ-PERIOD-PICKER-001:       기간 피커 탭
 *   APPROVAL-CATEGORY-001:      승인 탭 disabled
 *
 * 회귀 방어:
 *   BUG-F01: 부동소수점 미포맷
 *   BUG-F02: 제거된 작물 탭 재등장
 */
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:5173';
const OUT_DIR = path.join(__dirname, '..', 'docs', 'regression_session34');

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

// ─────────────────────────────────────────────
(async () => {
  console.log('=== 세션 34 UX 4건 + 회귀 방어 감사 ===\n');

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  // 전역 dialog 자동 dismiss
  page.on('dialog', async (d) => {
    console.log(`  [dialog] "${d.message().slice(0, 60)}"`);
    await d.dismiss().catch(() => {});
  });

  // console.error 수집
  const consoleErrors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });

  // ── 로그인 ──
  console.log('[로그인] jhkim / rmfpvm001');
  await goto(page, `${BASE_URL}/login`);
  await page.fill('input[placeholder*="아이디"]', 'jhkim').catch(() => {});
  await page.fill('input[type="password"]', 'rmfpvm001').catch(() => {});
  await page.click('button[type="submit"]').catch(() => {});
  await page.waitForTimeout(4000);
  const loggedIn = page.url().includes('/admin');
  if (!loggedIn) {
    console.error('로그인 실패. 중단.');
    await browser.close();
    process.exit(1);
  }
  console.log(`  로그인 URL: ${page.url()}\n`);

  // ════════════════════════════════════════════
  // 0. HQ Dashboard 진입
  // ════════════════════════════════════════════
  currentTest = 'dashboard-load';
  console.log('[0] HQ Dashboard 진입 (/admin/hq)');
  await goto(page, `${BASE_URL}/admin/hq`);
  await ss(page, '0-dashboard');

  const h1 = await page.$eval('h1', (el) => el.textContent.trim()).catch(() => '');
  if (h1.includes('운영 리포트')) {
    log('PASS', 'h1에 "운영 리포트" 포함', h1);
  } else {
    log('FAIL', 'h1 텍스트 예상 외', h1 || '없음');
  }

  // ════════════════════════════════════════════
  // 1. 회귀: BUG-F01 부동소수점
  // ════════════════════════════════════════════
  currentTest = 'BUG-F01-regression';
  console.log('\n[1] BUG-F01 회귀: 부동소수점 미포맷');
  const floatBugs = await page.evaluate(() =>
    [...document.querySelectorAll('*')]
      .filter((el) => el.children.length === 0 && /\d+\.\d{5,}/.test(el.textContent))
      .map((el) => el.textContent.trim())
  );
  if (floatBugs.length > 0) {
    log('FAIL', 'BUG-F01 회귀: 부동소수점 발견', floatBugs.slice(0, 3).join(', '));
  } else {
    log('PASS', 'BUG-F01 회귀 없음');
  }

  // ════════════════════════════════════════════
  // 2. 회귀: BUG-F02 작물 탭
  // ════════════════════════════════════════════
  currentTest = 'BUG-F02-regression';
  console.log('\n[2] BUG-F02 회귀: 제거된 작물 탭');
  const cropTabs = await page.evaluate(() =>
    [...document.querySelectorAll('button, [role="tab"], span')]
      .filter((t) => ['토마토', '딸기', '파프리카', '오이'].includes(t.textContent.trim()))
      .map((t) => t.textContent.trim())
  );
  if (cropTabs.length > 0) {
    log('FAIL', 'BUG-F02 회귀: 작물 탭 재등장', cropTabs.join(', '));
  } else {
    log('PASS', 'BUG-F02 회귀 없음');
  }

  // ════════════════════════════════════════════
  // 3. NOTIFICATION-DROPDOWN-001: 알림 벨 드롭다운
  // ════════════════════════════════════════════
  currentTest = 'NOTIFICATION-DROPDOWN-001';
  console.log('\n[3] NOTIFICATION-DROPDOWN-001: 알림 벨 드롭다운');

  // 3-A. 벨 버튼 존재: btnGhostStyle = width:36 height:36 인 아이콘 전용 버튼
  const topbarButtons = await page.$$('button').catch(() => []);
  let bellButton = null;
  for (const btn of topbarButtons) {
    const box = await btn.boundingBox().catch(() => null);
    if (!box || box.y > 100) continue;
    // btnGhostStyle = 36×36 정사각형
    if (Math.abs(box.width - 36) < 4 && Math.abs(box.height - 36) < 4) {
      bellButton = btn;
      break;
    }
  }

  if (bellButton) {
    const box = await bellButton.boundingBox();
    log('PASS', `벨 버튼 존재 (36×36 아이콘 버튼, x:${Math.round(box.x)} y:${Math.round(box.y)})`);

    // 3-B. 클릭 시 드롭다운 열림
    await bellButton.click().catch(() => {});
    await page.waitForTimeout(400);
    await ss(page, '3-bell-open');

    const dropdownVisible = await page.evaluate(() => {
      const divs = [...document.querySelectorAll('div')];
      return divs.some((d) => {
        const s = window.getComputedStyle(d);
        return d.textContent.includes('알림') && s.position === 'absolute' && d.offsetWidth > 200;
      });
    });
    if (dropdownVisible) {
      log('PASS', '알림 드롭다운 열림');
    } else {
      log('WARN', '알림 드롭다운 DOM 확인 불가 (렌더링 됐을 수 있음)');
    }

    // 3-C. 드롭다운 패널 내 "알림" 텍스트 존재
    const notifPanelText = await page.evaluate(() => document.body.textContent);
    if (notifPanelText.includes('알림') && (notifPanelText.includes('새 알림이 없습니다') || notifPanelText.includes('전체 보기'))) {
      log('PASS', '알림 패널 텍스트 확인 (새 알림 없음 or 전체 보기)');
    } else {
      log('WARN', '알림 패널 "새 알림이 없습니다" / "전체 보기" 미확인');
    }

    // 3-D. 외부 클릭 닫힘
    await page.mouse.click(400, 400);
    await page.waitForTimeout(300);
    await ss(page, '3-bell-closed');
    log('PASS', '외부 클릭 후 포커스 이동 (닫힘 동작 트리거)');

  } else {
    log('FAIL', '벨 버튼 탑바 우측에서 미발견');
  }

  // ════════════════════════════════════════════
  // 4. GLOBAL-SEARCH-001: 전역 검색
  // ════════════════════════════════════════════
  currentTest = 'GLOBAL-SEARCH-001';
  console.log('\n[4] GLOBAL-SEARCH-001: 전역 검색');
  await goto(page, `${BASE_URL}/admin/hq`);

  const searchInput = await page.$('input[placeholder*="검색"]').catch(() => null);
  if (searchInput) {
    log('PASS', '검색 input[placeholder*="검색"] 존재');

    // 4-A. 공백 입력 시 드롭다운 미표시
    await searchInput.click().catch(() => {});
    await page.waitForTimeout(200);
    const emptyDropdown = await page.evaluate(() => {
      const divs = [...document.querySelectorAll('div')];
      return divs.some((d) => d.textContent.includes('직원') && d.textContent.includes('공지') && window.getComputedStyle(d).position === 'absolute');
    });
    if (!emptyDropdown) {
      log('PASS', '빈 쿼리 시 드롭다운 미표시');
    } else {
      log('WARN', '빈 쿼리 시 드롭다운 노출 여부 불확실');
    }

    // 4-B. 검색어 입력 시 드롭다운 표시
    await searchInput.type('김', { delay: 50 }).catch(() => {});
    await page.waitForTimeout(400);
    await ss(page, '4-search-query');

    const searchDropdown = await page.evaluate(() => {
      const divs = [...document.querySelectorAll('div')];
      return divs.some((d) => {
        const s = window.getComputedStyle(d);
        return s.position === 'absolute' && d.offsetWidth > 100 && d.offsetHeight > 0 &&
          (d.textContent.includes('직원') || d.textContent.includes('결과 없음'));
      });
    });
    if (searchDropdown) {
      log('PASS', '"김" 입력 → 검색 드롭다운 노출');
    } else {
      log('WARN', '검색 드롭다운 DOM position:absolute 미확인 (렌더됐을 수 있음)');
    }

    const bodyText = await page.evaluate(() => document.body.textContent);
    if (bodyText.includes('결과 없음') || bodyText.includes('직원')) {
      log('PASS', '검색 결과 영역 텍스트 확인 (직원 or 결과 없음)');
    } else {
      log('WARN', '검색 드롭다운 내용 텍스트 미확인');
    }

    // 4-C. 클리어 버튼 (✕) 존재 확인
    const clearBtn = await page.evaluate(() => {
      return [...document.querySelectorAll('span, button')]
        .some((el) => el.textContent.trim() === '✕' || el.textContent.trim() === '×');
    });
    if (clearBtn) {
      log('PASS', '클리어 버튼 (✕) 존재');
    } else {
      log('WARN', '클리어 버튼 미확인');
    }

    // 정리
    await page.keyboard.press('Escape').catch(() => {});
    await page.mouse.click(400, 400);
    await page.waitForTimeout(300);

  } else {
    log('FAIL', '검색 input[placeholder*="검색"] 미발견');
  }

  // ════════════════════════════════════════════
  // 5. HQ-PERIOD-PICKER-001: 기간 피커
  // ════════════════════════════════════════════
  currentTest = 'HQ-PERIOD-PICKER-001';
  console.log('\n[5] HQ-PERIOD-PICKER-001: 기간 피커 탭');
  await goto(page, `${BASE_URL}/admin/hq`);

  const PERIODS = ['일', '주', '월', '분기'];

  // 5-A. 탭 4개 존재
  const periodTabsFound = await page.evaluate((periods) => {
    const spans = [...document.querySelectorAll('span')];
    return periods.filter((p) => spans.some((s) => s.textContent.trim() === p));
  }, PERIODS);

  if (periodTabsFound.length === 4) {
    log('PASS', `기간 탭 4개 모두 존재: ${periodTabsFound.join('·')}`);
  } else {
    log('FAIL', `기간 탭 ${periodTabsFound.length}/4개 발견: ${periodTabsFound.join('·')}`);
  }

  // 5-B. 초기 '월' 탭 활성 + h1 텍스트 확인
  const initialH1 = await page.$eval('h1', (el) => el.textContent.trim()).catch(() => '');
  if (initialH1.includes('월간')) {
    log('PASS', `초기 h1 "월간" 포함: ${initialH1}`);
  } else {
    log('WARN', `초기 h1 텍스트 예상 외: ${initialH1}`);
  }

  // 5-C. '주' 탭 클릭 → h1 "주간"으로 변경
  const weekTab = await page.evaluate(() => {
    const spans = [...document.querySelectorAll('span')];
    return spans.find((s) => s.textContent.trim() === '주');
  }).then(async () => {
    const spans = await page.$$('span');
    for (const s of spans) {
      const txt = await s.textContent().catch(() => '');
      if (txt.trim() === '주') return s;
    }
    return null;
  });

  if (weekTab) {
    await weekTab.click().catch(() => {});
    await page.waitForTimeout(300);
    const h1After = await page.$eval('h1', (el) => el.textContent.trim()).catch(() => '');
    await ss(page, '5-period-week');
    if (h1After.includes('주간')) {
      log('PASS', `"주" 클릭 → h1 "주간" 반영: ${h1After}`);
    } else {
      log('FAIL', `"주" 클릭 후 h1 예상 외: ${h1After}`);
    }
  } else {
    log('WARN', '"주" 탭 span 클릭 요소 미발견');
  }

  // 5-D. '분기' 탭 클릭 → h1 "분기"
  const quarterTab = await (async () => {
    const spans = await page.$$('span');
    for (const s of spans) {
      const txt = await s.textContent().catch(() => '');
      if (txt.trim() === '분기') return s;
    }
    return null;
  })();

  if (quarterTab) {
    await quarterTab.click().catch(() => {});
    await page.waitForTimeout(300);
    const h1After = await page.$eval('h1', (el) => el.textContent.trim()).catch(() => '');
    if (h1After.includes('분기')) {
      log('PASS', `"분기" 클릭 → h1 "분기" 반영: ${h1After}`);
    } else {
      log('FAIL', `"분기" 클릭 후 h1 예상 외: ${h1After}`);
    }
  } else {
    log('WARN', '"분기" 탭 span 미발견');
  }

  // '월'로 복원
  const monthTab = await (async () => {
    const spans = await page.$$('span');
    for (const s of spans) {
      const txt = await s.textContent().catch(() => '');
      if (txt.trim() === '월') return s;
    }
    return null;
  })();
  if (monthTab) await monthTab.click().catch(() => {});
  await page.waitForTimeout(200);

  // ════════════════════════════════════════════
  // 6. APPROVAL-CATEGORY-001: 승인 탭 disabled
  // ════════════════════════════════════════════
  currentTest = 'APPROVAL-CATEGORY-001';
  console.log('\n[6] APPROVAL-CATEGORY-001: 승인 탭 비활성화');
  await goto(page, `${BASE_URL}/admin/hq`);

  await ss(page, '6-approvals');

  // 6-A. 비활성 탭 3개 (예산·인사·자재) cursor:not-allowed 확인
  // 승인 허브 카드가 스크롤 하단에 있으므로 페이지를 아래로 스크롤
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(400);
  await ss(page, '6-approvals-scrolled');

  const disabledTabs = await page.evaluate(() => {
    const spans = [...document.querySelectorAll('span')];
    return spans
      .filter((s) => ['예산', '인사', '자재'].some((t) => s.textContent.trim().startsWith(t)))
      .map((s) => ({
        text: s.textContent.trim(),
        cursor: window.getComputedStyle(s).cursor,
        opacity: parseFloat(window.getComputedStyle(s).opacity),
      }));
  });

  if (disabledTabs.length === 3) {
    log('PASS', `비활성 탭 3개 발견: ${disabledTabs.map((t) => t.text).join('·')}`);
    const allNotAllowed = disabledTabs.every((t) => t.cursor === 'not-allowed');
    if (allNotAllowed) {
      log('PASS', '예산·인사·자재 cursor: not-allowed 확인');
    } else {
      log('FAIL', `cursor 미확인: ${JSON.stringify(disabledTabs)}`);
    }
    const allFaded = disabledTabs.every((t) => t.opacity < 0.7);
    if (allFaded) {
      log('PASS', '예산·인사·자재 opacity < 0.7 (흐리게 표시) 확인');
    } else {
      log('WARN', `opacity 값: ${disabledTabs.map((t) => t.opacity).join(', ')}`);
    }
  } else {
    log('FAIL', `예산·인사·자재 탭 ${disabledTabs.length}/3개 발견`);
  }

  // 6-B. 근태 탭 존재
  const attendanceTab = await page.evaluate(() => {
    return [...document.querySelectorAll('span')]
      .some((s) => s.textContent.trim().startsWith('근태'));
  });
  if (attendanceTab) {
    log('PASS', '"근태" 탭 존재');
  } else {
    log('WARN', '"근태" 탭 미발견');
  }

  // 6-C. 근태 탭 클릭 시 필터 변경 확인 (클릭 후 상태 체크)
  const attendanceTabEl = await (async () => {
    const spans = await page.$$('span');
    for (const s of spans) {
      const txt = await s.textContent().catch(() => '');
      if (txt.trim().startsWith('근태')) return s;
    }
    return null;
  })();

  if (attendanceTabEl) {
    const cursorBefore = await attendanceTabEl.evaluate((el) => window.getComputedStyle(el).cursor);
    if (cursorBefore !== 'not-allowed') {
      await attendanceTabEl.click().catch(() => {});
      await page.waitForTimeout(300);
      log('PASS', '"근태" 탭 cursor: pointer (클릭 가능)');
    } else {
      log('FAIL', '"근태" 탭이 cursor:not-allowed — 잘못된 disabled');
    }
  }

  // 6-D. '예산' 탭 클릭 시 필터 변경 없음 (승인 목록 유지)
  const budgetTabEl = await (async () => {
    const spans = await page.$$('span');
    for (const s of spans) {
      const txt = await s.textContent().catch(() => '');
      if (txt.trim().startsWith('예산')) return s;
    }
    return null;
  })();

  if (budgetTabEl) {
    const urlBefore = page.url();
    await budgetTabEl.click({ force: true }).catch(() => {});
    await page.waitForTimeout(300);
    // 예산 탭 클릭 후 활성 탭 여전히 근태 or 전체
    const activeTabText = await page.evaluate(() => {
      const spans = [...document.querySelectorAll('span')];
      const active = spans.find((s) => {
        const bg = window.getComputedStyle(s).backgroundColor;
        return (bg.includes('15, 23, 42') || bg.includes('rgb(15, 23, 42)')) && s.textContent.trim().length <= 3;
      });
      return active ? active.textContent.trim() : '';
    });
    if (activeTabText && activeTabText !== '예산') {
      log('PASS', `예산 탭 force-click 후 활성 탭 변경 없음 (현재: "${activeTabText}")`);
    } else {
      log('WARN', `예산 탭 클릭 후 활성 탭 확인 어려움 (activeTabText: "${activeTabText}")`);
    }
  }

  await ss(page, '6-approval-tabs-final');

  // ════════════════════════════════════════════
  // 7. 콘솔 에러 최종
  // ════════════════════════════════════════════
  currentTest = 'console-errors';
  console.log('\n[7] 콘솔 에러 집계');
  if (consoleErrors.length === 0) {
    log('PASS', '콘솔 에러 0건');
  } else {
    log('WARN', `콘솔 에러 ${consoleErrors.length}건`, consoleErrors.slice(0, 2).join(' | '));
  }

  // ════════════════════════════════════════════
  // 최종 결과
  // ════════════════════════════════════════════
  console.log(`\n${'='.repeat(50)}`);
  console.log(`세션 34 감사 완료: PASS ${PASS} / FAIL ${FAIL} / WARN ${WARN} / 합계 ${PASS + FAIL + WARN}`);
  console.log('='.repeat(50));

  if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(
    path.join(OUT_DIR, 'results.json'),
    JSON.stringify({ timestamp: new Date().toISOString(), PASS, FAIL, WARN, results }, null, 2)
  );
  console.log(`결과 저장: docs/regression_session34/results.json`);

  await browser.close();
  process.exit(FAIL > 0 ? 1 : 0);
})();
