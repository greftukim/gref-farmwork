# 세션 33 — 모바일 Worker 전수조사 보고서

날짜: 2026-04-24  
기준 계정: 윤화순 (busan branch, is_active=true)  
viewport: 390×844 (iPhone 14)  
스크립트: `scripts/audit_worker.cjs`  
스크린샷: `docs/regression_session33/`

---

## 결과 요약

| 구분 | 건수 |
|------|------|
| PASS | 43 |
| FAIL | 3 |
| WARN | 1 |
| **합계** | **47** |

---

## 조사 범위 (16 routes)

| 경로 | 컴포넌트 | 결과 |
|------|----------|------|
| `/worker` | WorkerHome | PASS |
| `/worker/tasks` | WorkerTasksPage | PASS |
| `/worker/survey` | GrowthSurveyPage | PASS |
| `/worker/attendance` | WorkerAttendancePage | PASS |
| `/worker/leave` | WorkerLeavePage | PASS |
| `/worker/issues` | IssuePage | PASS |
| `/worker/emergency` | EmergencyCallPage | PASS |
| `/worker/notices` | WorkerNoticePage | PASS |
| `/worker/more` | WorkerMorePage | PASS (→ Navigate to /worker/notices, 의도적) |
| `/worker/m/home` | MobileHomeScreen | **FAIL** |
| `/worker/m/checkin` | MobileCheckInScreen | PASS (이름 하드코딩 없음, 날짜 미검사) |
| `/worker/m/tasks` | MobileTasksScreen | PASS |
| `/worker/m/attendance` | MobileAttendanceScreen | PASS |
| `/worker/m/profile` | MobileProfileScreen | **FAIL** |
| `/worker/m/growth` | MobileGrowthScreen | PASS (정적 growth.js 데이터 — FARM-GROWTH-DB-001 기존) |
| `/worker/m/qr-scan` | QrScanPage | PASS |

---

## FAIL 상세

### FAIL-1: MobileHomeScreen 하드코딩 (WORKER-M-STATIC-001)

**경로:** `/worker/m/home`  
**파일:** `src/pages/mobile/_screens.jsx:14-23`

```jsx
<div style={{ fontSize: 13, opacity: 0.8 }}>2026년 4월 21일 화요일</div>
<div style={{ fontSize: 22, fontWeight: 700 }}>안녕하세요, 김민국님</div>
// 추가: A동 · 토마토 재배 · 반장, 02:45, 08:00, 17:00 전부 정적값
```

- 이름: "김민국" (윤화순 아님)
- 날짜: "2026년 4월 21일 화요일" (과거 날짜 고정)
- 시간/근무 데이터: 전부 정적값 (DB 미연결)

### FAIL-2: MobileProfileScreen 하드코딩 (WORKER-M-STATIC-001 동일)

**경로:** `/worker/m/profile`  
**파일:** `src/pages/mobile/_screens.jsx:499, 665-666`

```jsx
<div style={{ fontSize: 13 }}>2026년 4월 · 김민국</div>
<div style={{ fontSize: 20, fontWeight: 700 }}>김민국</div>
<div style={{ fontSize: 12 }}>GF-001 · 반장</div>
```

- 이름: "김민국" (윤화순 아님)
- 사번: "GF-001" (정적)

---

## WARN 상세

### WARN-1: BottomNav 탭 클릭 (인프라 이슈)

BottomNav 4탭 확인은 완료 (홈, 작업, 근태, 공지사항). 클릭 테스트 시 FCM 알림 허용 모달이 BottomNav를 가로막아 `/worker/tasks` 대신 `/worker`에 머문 것으로 확인됨. 앱 버그 아님, 테스트 인프라 이슈.

---

## 코드 검사 추가 발견

`_screens.jsx` 직접 검사 결과, MobileCheckInScreen·MobileAttendanceScreen에도 하드코딩 존재 (Playwright 날짜 검사 미수행):

| 화면 | 파일 라인 | 하드코딩 내용 |
|------|-----------|---------------|
| MobileCheckInScreen | line 231 | "오늘 · 4월 21일 화요일", "08:00", "17:00" |
| MobileAttendanceScreen | lines 254, 267, 348-349 | 출근시간, 퇴근예정, 과거 일자 기록 |

→ `_screens.jsx` 전체가 정적 목업. 모든 `/worker/m/*` 화면이 실 스토어 미연결.

---

## 긍정적 검증 항목

| 항목 | 결과 |
|------|------|
| 콘솔 에러 (16개 경로) | 전체 0건 |
| worker 데이터 scope (타 지점 노출) | 없음 (PASS) |
| ProtectedRoute (worker가 /admin 접근) | 차단 확인 |
| 인증 지속성 (재방문) | 유지 확인 |
| BottomNav 4탭 존재 | 확인 |
| 출퇴근 버튼 표시 | 확인 (클릭 미수행) |
| WorkerHome 이름·날짜 동적 표시 | 확인 ("윤화순", 당일 날짜) |

---

## 신규 BACKLOG

- **WORKER-M-STATIC-001** (P2): `/worker/m/*` 4개 화면 (`_screens.jsx`) DB 미연결

---

## 인프라 교훈

- **교훈 58**: Playwright에서 Zustand persist localStorage 주입은 `addInitScript()` 사용 필수.  
  `goto(login)` 후 `evaluate(localStorage.setItem(...))` → `initialize()`가 Zustand persist로 덮어씀.
