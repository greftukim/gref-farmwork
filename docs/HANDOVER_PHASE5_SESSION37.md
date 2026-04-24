# Phase 5 세션 37 인수인계

날짜: 2026-04-24  
작업자: Claude Code (세션 37)  
세션 목적: 근무 관리 탭 UI 목업 이식 (SchedulePage 전면 재작성)  
마지막 커밋: f3dce23

---

## 세션 요약

Task 0(SchedulePage 현황 조사 + tasks 스키마 확인), Task 1(SchedulePage 전면 재작성), Task 2(schema skip — Case A 확인), Task 3(interactions 완성), Task 4(빌드 통과), Task 5(Playwright **PASS 30 / FAIL 0 / WARN 1 / TOTAL 31**), Task 6(BACKLOG + LESSONS + HANDOVER) 완료.  
신규 교훈 1건(63) 추가. 신규 BACKLOG 2건 등록(1 resolved, 1 open).

---

## 구현 내용

### Task 0: 현황 조사 및 스키마 진단

- `src/pages/admin/SchedulePage.jsx` (74줄) — 단순 날짜 피커 + 2그룹 리스트. Gantt 없음.
- `docs/mockups/screen-others.jsx` L110–250 — ScheduleScreen 목업 확인 (주 선택 바 + 타임라인)
- tasks 테이블 MCP 조회 → `started_at TIMESTAMPTZ`, `completed_at TIMESTAMPTZ` 확인 → **Case A: 스키마 변경 불필요**
- leaveStore: `requests[].date` (단일 DATE), `requests[].employeeId`, `requests[].status`
- taskStore: `tasks[].startedAt`, `tasks[].completedAt`, `tasks[].estimatedMinutes`, `tasks[].workerId`, `tasks[].taskType`

### Task 1: SchedulePage 전면 재작성 — SCHEDULE-PAGE-S37-001

**수정 파일:** `src/pages/admin/SchedulePage.jsx` (전면 재작성)

| 항목 | 내용 |
|------|------|
| 뷰 모드 | 일간 / 주간 / 월간 (useState: `viewMode`) |
| 날짜 네비 | ‹/› 버튼으로 날짜 이동 (일/주/월 단위) |
| 주 선택 바 | 날짜·주차 표시, 주간 뷰에서 요일 탭 7개 |
| 타임라인 | HOURS 08~17, 10컬럼 Gantt, 높이 64px |
| NOW 선 | 오늘 + 08~17 범위에서만 실시간 표시 (1분 주기 갱신) |
| 점심 해치 | 12:00~13:00 (offset 4~5) 사선 패턴 |
| task 바 | `startedAt` 기준 offset, `completedAt` 없으면 +estimated_minutes(없으면 +1h) |
| leave 바 | approved leave → `warningSolid` 풀바 (0~HOUR_COUNT) |
| task_type → tone | TBM→primary, 수확→success, EC/pH·적엽·유인·결속→info, 병해충·수분→warning |
| 월간 뷰 | 월 캘린더 그리드, 날짜 클릭 → 일간 뷰 이동, leave·task 도트 표시 |
| TopBar | "출퇴근 기록" → navigate('/admin/attendance-status'), "스케줄 등록" → alert |
| 데이터 페치 | useEffect → fetchEmployees·fetchTasks·fetchRequests |
| Avatar 색상 | AVATAR_COLORS 배열 순환 (indigo, emerald, rose, amber, slate) |

### Task 2: tasks 스키마 — SKIP

Case A 확인 (started_at, completed_at 존재). 마이그레이션 불필요.

---

## Playwright 결과

`scripts/audit_session37.cjs` — **30/31 PASS, 0 FAIL, 1 WARN**

| 섹션 | 검증 항목 | 결과 |
|------|-----------|------|
| A-1 | jhkim 로그인 | PASS |
| B-1 | 근무 관리 타이틀·출퇴근 기록·스케줄 등록 버튼 | PASS (3항목) |
| B-2 | 일간/주간/월간 탭 존재 | PASS (3항목) |
| B-3 | 08:00~17:00 시간 헤더·타임라인 헤더·시간 범위 | PASS (4항목) |
| B-4 | 범례 TBM·수확·측정·이상 | PASS (4항목) |
| B-5 | ‹/› 버튼 2개 + 날짜 변경 | PASS (2항목) |
| B-6 | 주간 뷰 요일 탭 7개·주차 표시 | PASS (2항목) |
| B-7 | 월간 캘린더 헤더·셀 30개 | PASS (2항목) + WARN 1 (셀 클릭 selector 미확인) |
| B-8 | "출퇴근 기록" → /admin/attendance-status 이동 | PASS |
| B-9 | "스케줄 등록" → alert("준비 중") | PASS |
| C-1 | BUG-F01 부동소수점 회귀 없음 | PASS |
| C-2 | BUG-F02 작물 탭 회귀 없음 | PASS |
| C-3 | Dashboard 차트 3지점 표시 회귀 없음 | PASS (3항목) |
| C-4 | HQ 사이드바 "로그아웃" 텍스트 회귀 없음 | PASS |
| C-5 | HQ 콘솔 에러 0건 | PASS |

스크린샷: `docs/regression_session37/`  
결과 JSON: `docs/regression_session37/results.json`

---

## BACKLOG 변경

| 변경 | 항목 |
|------|------|
| resolved | SCHEDULE-PAGE-S37-001 (SchedulePage 목업 이식) |
| open (신규) | SCHED-REGISTER-001 (스케줄 등록 모달 — P3) |

---

## 교훈

- 교훈 63: Gantt 바는 started_at 기준; NULL이면 스킵, completed_at NULL이면 estimated_minutes로 종료 대체 (LESSONS_LEARNED.md)

---

## 다음 세션 후보 (세션 38)

| 우선순위 | 항목 |
|---------|------|
| P2 | FARM-GROWTH-DB-001: Growth.jsx DB 연결 (standard_curves·marker_plants·growth_surveys) |
| P2 | FARM-PERF-DATA-001: Performance.jsx DB 연결 |
| P3 | APPROVAL-BUDGET-001, APPROVAL-HR-001, APPROVAL-MATERIAL-001 (도메인 확인 선행) |
| P3 | HQ-ISSUE-PAGE-001: HQ 전용 이상 신고 페이지 |
| P3 | HARVEST-TARGETS-001: 지점별 월간 수확 목표치 설계 (박민식·김민국 답변 선행) |
| P3 | SCHED-REGISTER-001: 스케줄 등록 모달 구현 |
