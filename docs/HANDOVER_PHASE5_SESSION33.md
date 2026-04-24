# Phase 5 세션 33 인수인계

날짜: 2026-04-24  
작업자: Claude Code (세션 33)  
세션 목적: 모바일 worker 영역 전수조사 (390×844 viewport)  
마지막 커밋: 9b96034

---

## 세션 요약

세션 29(HQ), 세션 31(farm_admin) 패턴을 계승하여 `/worker/*` 16개 경로 전수조사 완료.  
**PASS 43 / FAIL 3 / WARN 1 / TOTAL 47**.  
신규 BACKLOG 1건(WORKER-M-STATIC-001), 교훈 58 추가.

---

## 조사 계정 선정 근거

- `is_active = true`인 worker 중 부산 지점 **윤화순** 선정
  - id: `581949b5-1a85-4429-ba26-19892ddc7240`
  - device_token: `5d607a37-e96e-432f-b472-85c01e89dc17`
- 시드_작업자 01/02/03 제외: `is_active = false` → `loginWithDeviceToken` RLS 통과 불가

---

## 핵심 발견 (FAIL 3건)

### WORKER-M-STATIC-001: `/worker/m/*` 정적 목업 (P2)

**파일:** `src/pages/mobile/_screens.jsx`

4개 화면 전부 실 스토어 미연결:

| 화면 | 하드코딩 내용 | 라인 |
|------|--------------|------|
| MobileHomeScreen | 이름 "김민국", 날짜 "2026년 4월 21일 화요일", 근무시간 | 14~23 |
| MobileCheckInScreen | 날짜 "4월 21일 화요일", 출근 "08:00", 퇴근 "17:00" | 231, 254, 267 |
| MobileAttendanceScreen | 과거 일자 기록 "4/17 목", "4/16 수" | 348~349 |
| MobileProfileScreen | 이름 "김민국", 사번 "GF-001" | 499, 665~666 |

→ `useAuthStore`, `useAttendanceStore`, `useTaskStore` 연결 후 동적 렌더링 필요.

---

## 긍정적 검증 항목

| 항목 | 결과 |
|------|------|
| 16개 경로 콘솔 에러 | 0건 전체 |
| worker scope 이탈 (타 지점 데이터 노출) | 없음 |
| ProtectedRoute worker→/admin 차단 | 작동 |
| 인증 지속성 (세션 간) | 유지 |
| BottomNav 4탭 (홈/작업/근태/공지사항) | 확인 |
| WorkerHome 이름·날짜 동적 표시 | 확인 ("윤화순", 당일) |

---

## 인프라 발견 (교훈 58)

**Playwright + Zustand persist 계정 주입 방식 확정:**

```js
// ❌ 실패: goto 후 localStorage 주입
await page.goto('/login');
await page.evaluate(() => localStorage.setItem('gref-auth', ...));
await page.goto('/worker'); // → /login 리다이렉트

// ✅ 성공: addInitScript (페이지 스크립트 실행 전 주입)
await page.addInitScript((auth) => {
  localStorage.setItem('gref-auth', JSON.stringify(auth));
}, WORKER_AUTH);
await page.goto('/worker'); // → /worker 정상 진입
```

원인: `initialize()` (App.jsx useEffect)가 Zustand persist를 통해 localStorage를 덮어씀.

---

## Playwright 결과

`scripts/audit_worker.cjs` — **43/47 PASS, 3 FAIL, 1 WARN**

스크린샷: `docs/regression_session33/` (16개)  
결과 JSON: `docs/regression_session33/results.json`

---

## BACKLOG 변경

| 변경 | 항목 |
|------|------|
| 신규 (P2 open) | WORKER-M-STATIC-001 |

---

## 교훈

- 교훈 58: Playwright Zustand persist localStorage 주입은 `addInitScript()` 필수 (LESSONS_LEARNED.md)

---

## 다음 세션 후보 (세션 34)

| 우선순위 | 항목 |
|---------|------|
| P2 | WORKER-M-STATIC-001: `/worker/m/*` 4개 화면 스토어 연결 |
| P2 | FARM-GROWTH-DB-001: Growth.jsx DB 연결 |
| P2 | FARM-PERF-DATA-001: Performance.jsx DB 연결 |
| P3 | FARM-DASH-EXPORT-001, FARM-AI-APPLY-001, FARM-AI-DETAIL-001 (기능 구현) |
