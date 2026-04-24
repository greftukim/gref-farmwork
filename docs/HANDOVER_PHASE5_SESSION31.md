# Phase 5 세션 31 인수인계

날짜: 2026-04-24  
작업자: Claude Code (세션 31)  
세션 목적: 재배팀(farm_admin) 영역 전수조사 — 발견만, 수정 없음  
마지막 커밋: 057007d (세션 30)

---

## 세션 요약

hdkim(farm_admin, busan)으로 재배팀 영역 22개 페이지 전수조사.  
Playwright CLI v1.59.1 (headless Chromium) + Supabase MCP DB 대조.  
**수정 0건, 발견 11건** (P0:0, P1:0, P2:7, P3:4).

---

## 계정 확인 결과

| 항목 | 값 |
|------|-----|
| username | hdkim |
| name | 김현도 |
| role | farm_admin ✅ |
| branch | busan (부산LAB) |
| 랜딩 URL | /admin |

---

## 주요 발견

### DB 기준값 vs UI

| 항목 | DB | UI | 판정 |
|------|----|----|------|
| 부산 직원 수 | 15 (활성 12) | 17행 표시 | ⚠️ 조사 필요 |
| 이번달 수확량 | 149건, 3,964.3 kg | 미대조 | - |
| 휴가 신청 (busan) | 8건 (approved) | 3행 (pending) | ⚠️ 필터 기본값 = pending |
| 공지 | 0건 | 3행 (Zustand 로컬) | ⚠️ 더미 확인 필요 |

### P2 이슈 7건

| ID | 페이지 | 설명 |
|----|--------|------|
| FARM-DASH-DATE-001 | Dashboard | TopBar 날짜 하드코딩 "2026년 4월 21일 화요일" |
| FARM-DASH-SCHED-HARDCODE-001 | Dashboard | 스케줄 그리드 날짜 + isToday 하드코딩 |
| FARM-LEAVE-SCOPE-001 | Leave | leaveStore branch 필터 없음 (잠재적 전 지점 노출) |
| FARM-TASK-SCOPE-001 | Tasks/Issues/Att | taskStore · issueStore · attendanceStore branch 필터 없음 |
| FARM-GROWTH-DB-001 | Growth | GR_DATA 하드코딩, growth_surveys DB 미연결 |
| FARM-PERF-DATA-001 | Performance | PERF_DATA 하드코딩, daily_work_logs DB 미연결 |
| FARM-HQ-SCOPE-001 | HQ 연동 | farm_admin이 /admin/hq/* 직접 접근 가능 (PROTECTED-ROUTE-001) |

### P3 이슈 4건

| ID | 페이지 | 설명 |
|----|--------|------|
| FARM-DASH-BTN-001 | Dashboard | TopBar+AI버튼 4개 onClick 없음 (패턴 A) |
| FARM-TASK-ADD-001 | Tasks | TaskPlanPage 작업 추가 버튼 없음 |
| FARM-HQ-NOTICE-001 | Notices | HQ↔Farm 공지 연동 미검증 (DB 0건) |
| — | Performance | FARM-PERF-DATA-001과 동일 선상 |

---

## 코드 분석 핵심 발견

### employeeStore vs 기타 스토어 불일치

| 스토어 | branch 필터 | 비고 |
|--------|-------------|------|
| employeeStore | ✅ farm_admin 시 `.eq('branch', currentUser.branch)` | L12-14 |
| leaveStore | ❌ 없음 | fetchRequests() 전체 조회 |
| taskStore | ❌ 없음 | fetchTasks() 전체 조회 |
| issueStore | ❌ 없음 | fetchIssues() 전체 조회 |
| attendanceStore | ❌ 없음 | fetchRecords() 전체 조회 |

→ employeeStore만 branch 필터 구현됨. 나머지 스토어는 동일 패턴 적용 필요.

### AdminDashboard 하드코딩 2종

```jsx
// AdminDashboard.jsx:231 — 날짜 하드코딩
title="2026년 4월 21일 화요일"

// AdminDashboard.jsx:492-493 — 스케줄 그리드 하드코딩
['월 20', '화 21', '수 22', '목 23', '금 24', '토 25', '일 26'].map((d, i) => {
  const isToday = i === 1; // 화요일 고정
```

---

## 생성 파일

| 파일 | 설명 |
|------|------|
| `docs/AUDIT_SESSION31_FARM.md` | 재배팀 전수조사 리포트 (11개 이슈 상세) |
| `docs/regression_session31/results.json` | Playwright 원시 결과 JSON |
| `scripts/audit_farm.cjs` | Playwright 감사 스크립트 |
| `docs/regression_session31/*.png` | 22개 스크린샷 |

---

## BACKLOG 변경

| 변경 | 항목 |
|------|------|
| 신규 등록 (P2) | FARM-DASH-DATE-001, FARM-DASH-SCHED-HARDCODE-001 |
| 신규 등록 (P2) | FARM-LEAVE-SCOPE-001, FARM-TASK-SCOPE-001 |
| 신규 등록 (P2) | FARM-GROWTH-DB-001, FARM-PERF-DATA-001 |
| 신규 등록 (P3) | FARM-DASH-BTN-001, FARM-TASK-ADD-001, FARM-HQ-NOTICE-001 |

---

## 태우님 결정 필요

### Q1. 데이터 스코프 우선순위 (FARM-LEAVE-SCOPE-001, FARM-TASK-SCOPE-001)

현재 DB 데이터가 busan 중심이라 즉각 문제 없음. 진주·하동 운영 시작 전에 수정이 필요한지,  
또는 운영 시작 후 처리해도 되는지 우선순위 결정 필요.

### Q2. 대시보드 날짜 즉시 수정 여부 (FARM-DASH-DATE-001)

"2026년 4월 21일 화요일" 하드코딩은 매일 오표시. 세션 32에서 즉시 수정(0.5h) 가능.  
수정 진행 여부 확인.

---

## 다음 세션 후보 (세션 32)

| 우선순위 | 항목 |
|---------|------|
| P2 즉시 | FARM-DASH-DATE-001 + FARM-DASH-SCHED-HARDCODE-001 (날짜 하드코딩 2건, 1.5h) |
| P2 | FARM-LEAVE-SCOPE-001 + FARM-TASK-SCOPE-001 (스토어 branch 필터 3개, 2h) |
| P3 묶음 | FARM-DASH-BTN-001 + FARM-TASK-ADD-001 (패턴 A, 1h) |
| 별 세션 | FARM-GROWTH-DB-001, FARM-PERF-DATA-001 (DB 연결, 각 별 트랙) |
| 또는 | 세션 33 mobile worker 전수조사 선진행 |

---

## 세션 33 (모바일 worker) 준비 메모

- worker 계정 확인 필요 (`SELECT username FROM employees WHERE role = 'worker' LIMIT 5`)
- `/worker/*` 라우트: `src/App.jsx:239~` 이후 WorkerLayout
- 모바일 viewport 설정 필수 (390×844)
- worker는 auth_user_id = NULL 가능 (CURL-WORKER-SKIP-001, RLS-WORKER-ROLE-TEST-001 참조)
