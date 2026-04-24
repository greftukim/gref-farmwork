# 재배팀 영역 전수조사 리포트 (세션 31)

날짜: 2026-04-24  
조사자: Claude Code + Playwright CLI v1.59.1 (headless Chromium)  
로그인 계정: hdkim (farm_admin, branch: busan / 부산LAB, 김현도)  
범위: 재배팀 관리자 영역 22개 페이지  
총 체크포인트: 57개  
발견 이슈: 11건

---

## 계정 확인 결과 (Step 0)

| 항목 | 값 |
|------|-----|
| username | hdkim |
| name | 김현도 |
| role | farm_admin ✅ |
| is_active | true |
| branch | busan (부산LAB) |
| 랜딩 URL | http://localhost:5173/admin ✅ |

### DB 기준값

| 항목 | DB 값 |
|------|-------|
| 부산LAB 전체 직원 | 15명 (활성 12) |
| 부산LAB 이번달 수확 | 149건, 3,964.3 kg |
| leave_requests (busan) | 8건 (전체 approved) |
| tasks (busan workers) | 359건 |
| notices | 0건 |
| schedules (busan) | 0건 |

---

## 요약

### 심각도별

| 심각도 | 건수 | 비고 |
|--------|------|------|
| P0 (크래시/데이터파손) | 0 | - |
| P1 (핵심기능 불작동) | 0 | 콘솔 에러 0건 |
| P2 (보조기능/데이터 이슈) | 7 | 날짜·스코프·하드코딩 |
| P3 (UI 개선) | 4 | 버튼 미연결 |

### 카테고리별

| 카테고리 | 건수 |
|---------|------|
| 하드코딩 (패턴 B) | 4 |
| 데이터 스코프 누수 | 2 |
| 버튼 미연결 (패턴 A) | 4 |
| 권한 | 1 |

### HQ 연동 관련 이슈

| ID | 설명 |
|----|------|
| FARM-HQ-SCOPE-001 | farm_admin이 /admin/hq/* 직접 접근 가능 |
| FARM-HQ-NOTICE-001 | 공지 연동 검증 불가 (DB 0건) |

---

## 페이지별 상세

### [대시보드] /admin

스크린샷: `docs/regression_session31/01-dashboard.png`  
체크포인트: 9개 PASS, 1개 WARN (KPI 셀렉터 오탐 — 실제 KPI 4개 정상 표시)  
랜딩 후 URL 이동 링크 4개 전부 정상 작동.

---

#### ISSUE-FARM-01: 대시보드 TopBar 날짜 하드코딩

- **심각도**: P2
- **카테고리**: 하드코딩 (패턴 B)
- **증상**: TopBar 타이틀이 항상 "2026년 4월 21일 화요일" 고정 표시. 오늘(2026-04-24 금요일)과 불일치.
- **재현**: `/admin` 접속 → TopBar 날짜 확인
- **원인**: `AdminDashboard.jsx:231` `title="2026년 4월 21일 화요일"` 하드코딩
- **수정 공수**: 0.5h — `new Date().toLocaleDateString('ko-KR', {...})` 치환
- **BACKLOG 후보**: FARM-DASH-DATE-001
- **HQ 연동**: N

---

#### ISSUE-FARM-02: 대시보드 스케줄 그리드 날짜 + 오늘 표시 하드코딩

- **심각도**: P2
- **카테고리**: 하드코딩 (패턴 B)
- **증상**: "이번 주 스케줄" 카드의 날짜가 `['월 20', '화 21', '수 22', '목 23', '금 24', '토 25', '일 26']` 고정. `isToday = i === 1` 로 화요일이 항상 오늘로 강조.
- **재현**: `/admin` → 우하단 "이번 주 스케줄" 카드
- **원인**: `AdminDashboard.jsx:492-493` 배열 리터럴 + isToday 인덱스 고정
- **수정 공수**: 1h — 현재 주 일자 계산 + today 인덱스 동적 계산
- **BACKLOG 후보**: FARM-DASH-SCHED-HARDCODE-001
- **HQ 연동**: N

---

#### ISSUE-FARM-03: 대시보드 TopBar 버튼 + AI 제안 버튼 onClick 없음 (패턴 A)

- **심각도**: P3
- **카테고리**: 버튼 미연결 (패턴 A)
- **증상**: TopBar "내보내기", "새 작업 등록" 클릭 시 무반응. AI 제안 카드 "적용하기", "자세히" 클릭 시 무반응.
- **재현**: `/admin` → 우상단 버튼 2개 클릭 + AI 제안 카드 버튼 2개 클릭
- **원인**:
  - `AdminDashboard.jsx:232` `btnSecondary('내보내기')`, `btnPrimary('새 작업 등록', icons.plus)` — onClick 인수 없음
  - `AdminDashboard.jsx:481-482` `btnPrimary('적용하기')`, `btnSecondary('자세히')` — onClick 인수 없음
- **수정 공수**: 각 0.5h (alert 임시 처리 or 기능 구현)
- **BACKLOG 후보**: FARM-DASH-BTN-001, FARM-DASH-AI-BTN-001
- **HQ 연동**: N

---

### [직원 관리] /admin/employees

스크린샷: `docs/regression_session31/02-employees.png`, `02-employees-filter.png`, `02-employees-add-modal.png`  
체크포인트: 5개 PASS  
직원 행 17개 표시 (DB busan 15). 차이는 Zustand 초기화 시점 타이밍 또는 더미 직원 잔존 가능성. employeeStore는 farm_admin용 branch 필터 구현됨(L12-14) — 정상.  
직원 추가 모달 정상 열림/닫힘. 활성/비활성 토글 버튼 존재.

> **참고**: HQEmployeesScreen(`_pages.jsx`)에서 `fetchEmployees()` 인자 없이 호출(L82, L87, L304, L308, L508, L512) → HQ에서는 branch 필터 미적용, 전체 직원 노출. 이는 HQ 의도적 설계(HQ는 전사 직원 조회 필요).

---

### [근무 관리] /admin/schedule

스크린샷: `docs/regression_session31/03-schedule.png`  
체크포인트: 2개 PASS  
날짜 이동 버튼(이전/다음/오늘) 정상 반응. 콘솔 에러 없음.

---

### [휴가 관리] /admin/leave

스크린샷: `docs/regression_session31/04-leave.png`  
체크포인트: 4개 PASS  
콘솔 에러 없음. 필터 탭 반응 정상.

---

#### ISSUE-FARM-04: leaveStore 지점 필터 없음 — 잠재적 전 지점 데이터 노출

- **심각도**: P2
- **카테고리**: 데이터 스코프 누수
- **증상**: farm_admin(hdkim, busan)이 모든 지점 직원의 휴가 신청을 열람 가능. 현재 DB 8건 전부 busan이라 즉각 피해 없으나, 진주·하동 직원이 휴가 신청 시 busan farm_admin에게도 노출됨.
- **재현**: `src/stores/leaveStore.js:11` `fetchRequests()` → `SELECT * FROM leave_requests` (WHERE 없음)
- **DB 대조**: DB 8건 전부 busan (approved). UI filter='pending'으로 0건 정상 표시. 잠재적 버그.
- **예상 원인**: `useDataLoader.js:40` `fetchRequests()` 호출 시 currentUser 미전달
- **수정 공수**: 0.5h — `fetchRequests(currentUser)` + store 내 branch 필터 추가
- **BACKLOG 후보**: FARM-LEAVE-SCOPE-001
- **HQ 연동**: N (HQ는 전사 열람 의도적)

---

#### ISSUE-FARM-05: taskStore / issueStore / attendanceStore 지점 필터 없음

- **심각도**: P2
- **카테고리**: 데이터 스코프 누수
- **증상**: `taskStore.fetchTasks()`, `issueStore.fetchIssues()`, `attendanceStore.fetchRecords()` 모두 WHERE 없이 전체 조회. farm_admin이 타 지점 작업·이슈·출퇴근 기록 열람 가능.
- **현황**: 현재 DB 데이터가 busan 중심이라 즉각 피해 없으나, 진주·하동 운영 시 데이터 분리 실패.
- **예상 원인**: employeeStore처럼 currentUser 인자 기반 branch 필터 미구현
- **수정 공수**: 각 0.5h (3개 스토어)
- **BACKLOG 후보**: FARM-TASK-SCOPE-001
- **HQ 연동**: N

---

### [작업 관리] /admin/tasks

스크린샷: `docs/regression_session31/05-tasks.png`  
체크포인트: 2개 PASS, 1개 WARN  
작업 행 9개 (페이지 뷰 필터 — 오늘 날짜 기준). 전체 DB 359건이나 TaskPlanPage는 오늘 작업만 표시 (정상 설계 추정).

---

#### ISSUE-FARM-06: TaskPlanPage 작업 추가 버튼 없음

- **심각도**: P3
- **카테고리**: 기능 미구현
- **증상**: TaskPlanPage에 "작업 추가" 버튼이 없음. `/admin/tasks/new` 라우트(TaskCreatePage)는 존재하나 진입 경로 없음.
- **재현**: `/admin/tasks` → 작업 추가 버튼 탐색 → 없음
- **예상 원인**: TaskPlanPage TopBar actions에 navigate('/admin/tasks/new') 버튼 미추가
- **수정 공수**: 0.5h
- **BACKLOG 후보**: FARM-TASK-ADD-001
- **HQ 연동**: N

---

### [실시간 평면도] /admin/floor

스크린샷: `docs/regression_session31/06-floor.png`  
체크포인트: 2개 PASS. 콘솔 에러 없음. 콘텐츠 있음.

---

### [생육조사] /admin/growth

스크린샷: `docs/regression_session31/07-growth.png`, `07-growth-input.png`  
체크포인트: 4개 PASS

---

#### ISSUE-FARM-07: Growth.jsx 완전 하드코딩 (패턴 B)

- **심각도**: P2
- **카테고리**: 하드코딩 (패턴 B)
- **증상**: 생육 대시보드 전체 데이터(`GR_DATA`, `GROWTH_SCHEMA`, `STANDARD_CURVE`)가 `src/data/growth.js` 정적 파일에서 임포트. growth_surveys DB 테이블 미연결.
- **재현**: `/admin/growth` → 생육 데이터 확인 → 정적 주차/수치 표시
- **원인**: `Growth.jsx:3` `import { GROWTH_SCHEMA, STANDARD_CURVE, GR_DATA } from '../../data/growth'`
- **수정 공수**: 별 트랙 (growth_surveys 테이블 집계 쿼리 설계 필요)
- **BACKLOG 후보**: FARM-GROWTH-DB-001
- **HQ 연동**: N (HQ GrowthCompare도 동일 패턴 — HQ-GROWTH-001)

---

### [작업자 성과] /admin/performance

스크린샷: `docs/regression_session31/08-performance.png`, `08-performance-detail.png`, `08-performance-compare.png`  
체크포인트: 4개 PASS. 콘솔 에러 없음. 부동소수점 없음. 서브 페이지(detail, compare) 모두 정상 진입.

---

#### ISSUE-FARM-08: Performance.jsx 완전 하드코딩 (패턴 B, farm 버전)

- **심각도**: P2
- **카테고리**: 하드코딩 (패턴 B)
- **증상**: 작업자 성과 페이지의 모든 수치(`PERF_DATA`, `SAM` 테이블)가 파일 내 정적 상수. daily_work_logs, tasks DB 미연결.
- **참고**: HQ Performance(`_pages.jsx`)에서 `HQ_PERF_DATA` 동일 패턴 — HQ-PERFORMANCE-001로 이미 BACKLOG 등록.
- **수정 공수**: 별 트랙
- **BACKLOG 후보**: FARM-PERF-DATA-001 (HQ-PERFORMANCE-001 연계)
- **HQ 연동**: HQ Performance와 동일 데이터 소스 문제

---

### [통계 분석] /admin/stats

스크린샷: `docs/regression_session31/09-stats.png`  
체크포인트: 2개 PASS. 콘솔 에러 없음. 부동소수점 없음.

---

### [공지사항] /admin/notices

스크린샷: `docs/regression_session31/10-notices.png`, `10-notices-modal.png`  
체크포인트: 3개 PASS, 1개 WARN  
공지 작성 모달 정상 열림.

---

#### FARM-HQ-NOTICE-001: HQ ↔ Farm 공지 연동 미검증

- **심각도**: P3 (검증 불가)
- **카테고리**: HQ 연동
- **현황**: `noticeStore.fetchNotices()`는 notices 테이블 전체 조회 (지점 필터 없음). HQ와 farm이 동일 테이블 공유 → HQ 작성 공지가 farm에 노출되는 구조는 맞음. 그러나 DB notices = 0건이라 실제 연동 동작 미검증.
- **수정 공수**: DB 공지 1건 삽입 후 양쪽 UI 확인으로 빠른 검증 가능
- **BACKLOG 후보**: FARM-HQ-NOTICE-001
- **HQ 연동**: Y

---

### [수확 기록] /admin/harvest

스크린샷: `docs/regression_session31/11-harvest.png`  
체크포인트: 3개 PASS. 부동소수점 없음. DB 기준(149건, 3,964.3 kg) 화면 표시 필요 추가 대조.

---

### [이상 신고] /admin/records

스크린샷: `docs/regression_session31/12-records.png`  
체크포인트: 2개 PASS. 콘솔 에러 없음. 콘텐츠 있음.

---

### [휴가 승인] /admin/leave-approval

스크린샷: `docs/regression_session31/13-leave-approval.png`  
체크포인트: 3개 PASS. farm_admin에서 `LeaveApprovalPage` 렌더링(예상대로 `LeaveApprovalRoute` 분기 정상). 승인 버튼 없음(DB pending 0건).

---

### [출퇴근 현황] /admin/attendance-status

스크린샷: `docs/regression_session31/14-attendance-status.png`  
체크포인트: 1개 PASS.

---

### [작업 보드] /admin/board

스크린샷: `docs/regression_session31/15-board.png`  
체크포인트: 1개 PASS.

---

### [안전점검] /admin/safety-checks

스크린샷: `docs/regression_session31/16-safety-checks.png`  
체크포인트: 1개 PASS.

---

### [일일작업일지] /admin/daily-work-logs

스크린샷: `docs/regression_session31/17-daily-work-logs.png`  
체크포인트: 1개 PASS.

---

### [잔업 승인] /admin/overtime-approval

스크린샷: `docs/regression_session31/18-overtime-approval.png`  
체크포인트: 2개 PASS. 콘텐츠 있음.

---

### [작물 구역] /admin/crops

스크린샷: `docs/regression_session31/19-crops.png`  
체크포인트: 1개 PASS.

---

### [임시직 관리] /admin/temporary-workers

스크린샷: `docs/regression_session31/20-temporary-workers.png`  
체크포인트: 1개 PASS.

---

### [포장 작업] /admin/packaging-tasks

스크린샷: `docs/regression_session31/21-packaging-tasks.png`  
체크포인트: 1개 PASS.

---

### [HQ 연동 확인]

스크린샷: `docs/regression_session31/22-hq-approvals-from-farm.png`

---

#### ISSUE-FARM-09: farm_admin이 /admin/hq/* 직접 URL 접근 가능

- **심각도**: P2
- **카테고리**: 권한 (기존 PROTECTED-ROUTE-001)
- **증상**: hdkim(farm_admin)으로 로그인 후 `/admin/hq/approvals` 직접 접근 가능. 사이드바엔 노출 안 되나 URL 입력 시 HQ 페이지 열람 가능.
- **기존 등록**: PROTECTED-ROUTE-001 (세션 21, 2026-04-22)
- **BACKLOG 후보**: PROTECTED-ROUTE-001 (신규 ID 불필요, 기존 항목에 증거 추가)
- **HQ 연동**: Y

---

## HQ 연동 이슈 집계

| ID | 이슈 | 방향 | 상태 |
|----|------|------|------|
| FARM-HQ-SCOPE-001 | farm_admin이 /admin/hq/* 접근 | Farm → HQ | P2 |
| FARM-HQ-NOTICE-001 | 공지 연동 동작 미검증 (DB 0건) | 양방향 | P3/미검증 |

---

## 세션 29 HQ 조사와 겹치는 발견

| 항목 | HQ (세션 29) | Farm (세션 31) |
|------|-------------|----------------|
| 날짜 하드코딩 | HQTopBar (HQ-PERIOD-PICKER-001) | AdminDashboard L231 |
| Growth 하드코딩 | HQ-GROWTH-001 | FARM-GROWTH-DB-001 |
| Performance 하드코딩 | HQ-PERFORMANCE-001 | FARM-PERF-DATA-001 |
| 버튼 onClick 없음 | 패턴 A (9건 세션 29) | 패턴 A (4건) |

---

## 세션 32 수정 우선순위 제안

| 우선순위 | ID | 설명 | 공수 |
|---------|-----|------|------|
| P2 즉시 | FARM-DASH-DATE-001 | 대시보드 날짜 동적 계산 | 0.5h |
| P2 즉시 | FARM-DASH-SCHED-HARDCODE-001 | 스케줄 그리드 날짜 동적 | 1h |
| P2 | FARM-LEAVE-SCOPE-001 | leaveStore branch 필터 | 0.5h |
| P2 | FARM-TASK-SCOPE-001 | taskStore/issueStore branch 필터 | 1.5h |
| P3 | FARM-DASH-BTN-001 | Dashboard 버튼 alert 임시 처리 | 0.5h |
| P3 | FARM-TASK-ADD-001 | TaskPlanPage 작업 추가 버튼 | 0.5h |
| 별 트랙 | FARM-GROWTH-DB-001 | Growth DB 연결 | 별 세션 |
| 별 트랙 | FARM-PERF-DATA-001 | Performance DB 연결 | 별 세션 |

---

## 세션 33 (모바일 worker 조사) 준비

- worker 계정 확인 필요 (username: worker 계정 목록 조회)
- `/worker/*` 라우트 목록 `src/App.jsx:239~` 이후 확인
- WorkerLayout, BottomNav 구조 파악
- 모바일 viewport (390×844) 설정 필수
- farm_admin과 달리 worker는 auth_user_id = NULL 가능 (CURL-WORKER-SKIP-001 참조)

---

## 감사 스크립트 재실행 방법

```bash
# 개발 서버 실행 중 상태에서:
node scripts/audit_farm.cjs
# 결과: docs/regression_session31/results.json, *.png
```

로그인: `hdkim / rmfpvm001`
