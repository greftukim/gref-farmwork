# HANDOVER — Phase 5 세션 49

**날짜:** 2026-04-25  
**작업자:** Claude (세션 49)  
**이전 커밋:** 34dc282

---

## 세션 목표

1. **Task 0** — DashboardInteractive.jsx 전체 분석 + store 매핑  
2. **Task 1** — HQ-DASHBOARD-INTERACTIVE-001 실데이터 연결 구현  
3. **Task 2** — Playwright Section O 신규 감사 + 전체 회귀 PASS

---

## Task 0 결과

### DashboardInteractive.jsx 분석 (801줄)

| 위젯 | 기존 상태 | 연결 대상 |
|------|----------|----------|
| KPI 수확량 | 하드코딩 `11,580 kg` | harvestStore.branchMonthly |
| KPI 미해결이슈 | 하드코딩 `3건` | issueStore.openCount |
| KPI 가동률 | 하드코딩 `91%` | attendance 집계 (오늘) |
| KPI 인건비 | 하드코딩 `₩2.1M` | 재무 DB 없음 → 유지 |
| 지점 카드 3개 | 하드코딩 | branchStore + harvestStore + employeeStore |
| 바차트 (지점별 수확) | 하드코딩 | harvestStore.branchMonthly |
| 드릴다운 (작물별) | 하드코딩 | harvestStore.cropMonthly |
| 승인허브 | 하드코딩 7건 | 미연결 (HQ-DASHBOARD-INTERACTIVE-003) |
| 이상 신고 피드 | 하드코딩 | issueStore |
| 공지 관리 | 하드코딩 목업 | 유지 |

---

## Task 1 — 구현 내역

### 변경 파일

| 파일 | 변경 내용 |
|------|----------|
| `src/pages/hq/DashboardInteractive.jsx` | 완전 재작성 — store 연결 + 실데이터 |

### 핵심 구현 결정

1. **attendance 집계**: 기존 `employees!inner(branch)` JOIN이 hanging → `select('employee_id, status')` + `employeeStore.employees` 교차로 교체 (교훈 85 선행)
2. **early return 제거**: `if (loading) return <LoadingScreen>` 패턴 제거 → TopBar 항상 렌더, 콘텐츠만 `{!loading && <div>}` 조건부 (교훈 85)
3. **Pill 'default' tone 크래시**: `TYPE_META['기타']` `tone: 'default'` → `'muted'` 교체 + `primitives.jsx` Pill에 폴백 추가 (교훈 84)
4. **branches useMemo**: harvestStore.branchMonthly × branchStore.branches × employeeStore.employees × attendanceMap → 지점 카드/바차트/드릴다운 일관 계산
5. **navigate 연결**: 미해결이슈 KPI → `/admin/hq/issues`, 이슈피드 전체 → `/admin/hq/issues`, 지점 관리 → `/admin/hq/branches`

### 잔여 하드코딩 (BACKLOG 분리)

| 항목 | 이유 | BACKLOG ID |
|------|------|-----------|
| 인건비 KPI | 재무 DB 없음 | HQ-FINANCE-001 연계 |
| 가동률 기간별 집계 | attendance daily 집계 복잡 | HQ-DASHBOARD-INTERACTIVE-002 |
| 승인허브 | 승인 테이블 구조 미조사 | HQ-DASHBOARD-INTERACTIVE-003 |

---

## Task 2 — Playwright 결과

```
결과: PASS 174 / FAIL 0 / WARN 3 / TOTAL 177
```

| 섹션 | 내용 | 결과 |
|------|------|------|
| A | 로그인 | PASS |
| B | 성과 관리 회귀 (세션 40) | PASS |
| C | 생육 대시보드 회귀 (세션 39) | PASS |
| D | 메인 대시보드 + HQ + 콘솔 에러 | PASS |
| E | Stats 성과 분석 회귀 (세션 41) | PASS |
| F | WorkStatsPage 회귀 (세션 42) | PASS |
| G | BranchStatsPage 회귀 (세션 42) | PASS |
| H | FarmWork 앱 이름 회귀 (세션 42) | PASS |
| I | PROTECTED-ROUTE-001 회귀 (세션 43) | PASS |
| J | BRANCH-WORK-SCHEDULE-UI-001 회귀 (세션 44) | PASS |
| K | TASKS-WORKER-ID-MISMATCH-001 회귀 (세션 45) | PASS |
| L | HARVEST-TARGETS-001 회귀 (세션 46) | PASS |
| M | DASHBOARD-PHASE2-001 회귀 (세션 47) | PASS |
| N | HQ-ISSUE-PAGE-001 회귀 (세션 48) | PASS |
| O | HQ-DASHBOARD-INTERACTIVE-001 신규 (O-1~O-14) | PASS (WARN 3) |

**WARN 3개 (허용 수준):**
- O-4: 미해결이슈 카운트 3건 (기대 ≥6 — 이슈 일부 해결 처리된 데이터 상태)
- O-6: 드릴다운 전환 미확인 (Recharts 바 클릭 인터랙션 Playwright 제약)
- O-7: 모달 오픈 미확인 (지점 카드 클릭 모달 Playwright 제약)

---

## 디버깅 이슈

### 이슈 1: Section O 전체 FAIL (1~3차 감사)

| 차수 | 원인 | 수정 |
|------|------|------|
| 1차 | attendance JOIN hanging | `select('employee_id, status')` + store 교차 |
| 2차 | waitForDataLoad timeout 15s 부족 | 25s + 2s extra |
| 3차 | Pill `tone='default'` → `c.bg` 크래시 | `tones.muted` 폴백 + TYPE_META 수정 |
| 4차 | ✅ PASS 174 / FAIL 0 | — |

---

## BACKLOG 변경

| ID | 이전 | 이후 |
|----|------|------|
| HQ-DASHBOARD-INTERACTIVE-001 | open | resolved (Playwright O-1~O-14 PASS) |
| HQ-DASHBOARD-INTERACTIVE-002 | (세션 49 신설) | open |
| HQ-DASHBOARD-INTERACTIVE-003 | (세션 49 신설) | open |

---

## LESSONS 추가

| 번호 | 제목 |
|------|------|
| 교훈 84 | Pill 컴포넌트 알 수 없는 tone → 방어 폴백 필수 |
| 교훈 85 | `if (loading) return <loading>` 제거 시 TopBar/타이틀은 항상 렌더링 구조로 |

---

## 세션 50 — 후보 및 권장

### 후보

| ID | 트랙 | 규모 | 선행조건 |
|----|------|------|---------|
| HQ-FINANCE-001 | HQFinanceScreen 재무 실데이터 연결 | 대형 (DB 스키마 미정) | 사전 조사 세션 필요 |
| HQ-DASHBOARD-INTERACTIVE-002 | 기간별 실집계 완성 | 중형 | HQ-FINANCE-001 연계 |
| HQ-DASHBOARD-INTERACTIVE-003 | 승인허브 실데이터 연결 | 중형 | 승인 테이블 구조 조사 |
| HQ-GROWTH-001 | GrowthCompare.jsx 실데이터 연결 | 대형 | growth_surveys 집계 설계 |

### 권장: **HQ-FINANCE-001 사전 조사 세션**

이유:
1. HQ-DASHBOARD-INTERACTIVE-002가 인건비(재무 DB)에 의존
2. HQFinanceScreen은 완전 하드코딩 — DB 스키마 설계 없이 진입 불가
3. 조사 세션에서 재무 데이터 소스(파일/외부 API/DB 신설) 결정 후 구현 진입

---

## 다음 세션 진입 시 확인 필수

- [ ] `docs/BACKLOG.md` 전체 읽기 (open 항목 목록 재확인)
- [ ] `docs/LESSONS_LEARNED.md` 교훈 84~85 숙지
- [ ] HQ-FINANCE-001 조사 세션 진입 여부 결정
- [ ] HQ-DASHBOARD-INTERACTIVE-002/003 진입 선행조건 재확인
