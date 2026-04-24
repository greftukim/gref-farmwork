# Phase 5 세션 35 인수인계

날짜: 2026-04-24  
작업자: Claude Code (세션 35)  
세션 목적: UX 3건 구현 (모바일 하드코딩 제거 · KPI 드릴다운 · 직원 편집 모달)  
마지막 커밋: ed4eb36

---

## 세션 요약

세션 33에서 등록된 WORKER-M-STATIC-001, 세션 25에서 등록된 HQ-KPI-DRILLDOWN-001, 세션 24/35에서 누적된 HQ-EMPLOYEE-EDIT-MODAL-001을 모두 구현.  
**Playwright PASS 29 / FAIL 0 / WARN 0 / TOTAL 29**.  
신규 교훈 2건(60·61) 추가.

---

## 구현 내용

### Task 1: `src/pages/mobile/_screens.jsx` — WORKER-M-STATIC-001

하드코딩 "김민국" / "2026년 4월 21일 화요일" / "08:00" / "17:00" 전면 제거.

| 화면 | 변경 내용 |
|------|-----------|
| MobileHomeScreen | currentUser name/branch/isTeamLeader 동적, todayStr useMemo, 출퇴근 상태·시간 attendanceStore |
| MobileCheckInScreen | 주간 요약 실계산(이번 주 월요일 기준 7일), 최근 5일 기록 실데이터 |
| MobileAttendanceScreen | 월 KPI(출근일수/총근무시간/연장), 달력 monthStatusMap 동적, 신청 이력 leaveStore |
| MobileProfileScreen | currentUser 훅 추가, 아바타 이니셜·이름·지점·역할 동적 |

**버그 수정 (이전 세션 편집 결함):**
- `MobileAttendanceScreen` IIFE의 `return (...);` + `})()}` 누락 → 구문 오류 수정 (교훈 60)
- `useLeaveStore.getState()` 렌더 IIFE 안티패턴 → `useLeaveStore((s) => s.requests)` 컴포넌트 최상위 훅으로 이동 (교훈 61)

**새 imports:** `useLeaveStore` — `MobileAttendanceScreen` 최상위

### Task 2: `src/pages/hq/Dashboard.jsx` — HQ-KPI-DRILLDOWN-001

KPI 카드 배열에 `to` 필드 추가, `onClick` 분기 처리:

| KPI 카드 | 이전 | 이후 |
|----------|------|------|
| 전사 가동률 | `alert(...)` | `navigate('/admin/hq/employees')` |
| 월 수확량 | `alert(...)` | `navigate('/admin/hq/finance')` |
| 월 인건비 | `alert(...)` | `navigate('/admin/hq/finance')` |
| 미해결 이슈 | `alert(...)` | `alert('HQ 전용 이슈 페이지 준비 중입니다.')` (HQ-ISSUE-PAGE-001 미구현) |

### Task 3: HQ-EMPLOYEE-EDIT-MODAL-001

**신규 파일:** `src/components/employees/EmployeeEditModal.jsx`
- name / phone / jobTitle / isActive (전원 편집 가능, master/hr_admin 권한 기존 canEditEmployee 준수)
- master 전용: branch / role 추가 편집
- `updateEmployee(id, changes)` 호출 후 onClose

**수정 파일:** `src/pages/hq/_pages.jsx`
- `editEmployee` state 추가
- `EmployeeDetailModal`에 `onEdit={(e) => setEditEmployee(e)}` 전달
- `EmployeeEditModal` 조건부 렌더링 추가

---

## Playwright 결과

`scripts/audit_session35.cjs` — **29/29 PASS, 0 FAIL, 0 WARN**

| 섹션 | 검증 항목 | 결과 |
|------|-----------|------|
| A-1 | Worker 인증 주입 (addInitScript) | PASS |
| A-2 | MobileHomeScreen 하드코딩 없음·계정명 표시 | PASS |
| A-3 | MobileCheckInScreen 하드코딩 없음 | PASS |
| A-4 | MobileAttendanceScreen 계정명 표시 | PASS |
| A-5 | MobileProfileScreen "윤화순" 표시 | PASS |
| B-1 | jhkim 로그인 | PASS |
| B-2 | BUG-F01 부동소수점 회귀 없음 | PASS |
| B-3 | BUG-F02 작물 탭 회귀 없음 | PASS |
| B-4 | KPI 3개 navigate + 이슈 alert | PASS (4항목) |
| B-5 | 편집 모달 열림/폼 input 3개/취소 닫힘 | PASS (5항목) |
| B-6 | 벨 버튼 36×36 존재 (세션 34 회귀) | PASS |
| B-7 | 기간 탭 4개 (세션 34 회귀) | PASS |
| B-8 | HQ 콘솔 에러 0건 | PASS |

스크린샷: `docs/regression_session35/`  
결과 JSON: `docs/regression_session35/results.json`

---

## BACKLOG 변경

| 변경 | 항목 |
|------|------|
| resolved | WORKER-M-STATIC-001 |
| resolved | HQ-KPI-DRILLDOWN-001 |
| resolved (편집 구현) | HQ-EMPLOYEE-EDIT-MODAL-001 |

---

## 교훈

- 교훈 60: JSX IIFE `return (...);` + `})()}` 닫기 누락 → 빌드 구문 오류 (LESSONS_LEARNED.md)
- 교훈 61: `useLeaveStore.getState()` 렌더 IIFE 안티패턴 → 컴포넌트 최상위 훅 호출 필수 (LESSONS_LEARNED.md)

---

## 다음 세션 후보 (세션 36)

| 우선순위 | 항목 |
|---------|------|
| P2 | FARM-GROWTH-DB-001: Growth.jsx DB 연결 |
| P2 | FARM-PERF-DATA-001: Performance.jsx DB 연결 |
| P3 | APPROVAL-BUDGET-001, APPROVAL-HR-001, APPROVAL-MATERIAL-001 (도메인 확인 선행) |
| P3 | HQ-ISSUE-PAGE-001: HQ 전용 이상 신고 페이지 |
| P3 | FARM-DASH-EXPORT-001, FARM-AI-APPLY-001, FARM-AI-DETAIL-001 (기능 구현) |
