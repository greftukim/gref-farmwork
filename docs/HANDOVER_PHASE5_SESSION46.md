# Phase 5 세션 46 인수인계

날짜: 2026-04-25  
작업자: Claude Code (세션 46)  
세션 목적: HARVEST-TARGETS-001 — 지점별 월간 수확 목표치 설계·연결  
마지막 커밋: 9ffbf50

---

## 세션 요약

Task 0(조사 및 마이그레이션 안 확정),
Task 1(DB 마이그레이션 적용 + UI 4파일 수정),
Task 2(Playwright **PASS 149 / FAIL 0 / WARN 0 / TOTAL 149**),
BACKLOG resolved, LESSONS 갱신, HANDOVER 완료.

---

## Task 0 — 조사 결과

| 항목 | 결과 |
|------|------|
| 스키마 방안 | Option A (branches 단일 컬럼) 채택 — 단순, 기존 harvestT 슬롯 재활용 가능 |
| RLS 확인 | branches UPDATE 정책 = can_write() → hr_admin 포함 → 별도 정책 불필요 |
| 달성률 데이터 소스 | `usePerformanceData` 제외 → `harvestStore.fetchCurrentMonth()` 사용 |
| 기존 harvestT 슬롯 | HQBranchesScreen line 463 이미 존재, `harvestT: 0` 하드코딩만 교체 |
| AdminDashboard | `목표 대비 87%` 하드코딩 → 실데이터 교체 대상 |

---

## Task 1a — 마이그레이션

**파일:** `supabase/migrations/20260425_session46_harvest_targets.sql`

```sql
BEGIN;
-- STEP 1: branches.monthly_harvest_target_kg ADD COLUMN IF NOT EXISTS NUMERIC DEFAULT 0
-- STEP 2: 운영 3지점 시드
--   busan=5000 / jinju=3000 / hadong=5500 (2026-04 실적 기반 stretch 목표)
-- STEP 3: 최종 검증 DO 블록
COMMIT;
```

**적용 결과:** `{"success":true}` — 컬럼 추가 + 시드 완료

---

## Task 1b — UI 4파일 수정

### `src/pages/admin/BranchSettingsPage.jsx`
- `targetKg / targetLoading / targetSaving` 상태 추가
- `useEffect`: `branches.select('monthly_harvest_target_kg').eq('code', selected.code).single()` 로드
- `handleTargetSave`: `branches.update({ monthly_harvest_target_kg }).eq('code', selected.code)`
- JSX: 근무시간 카드와 가이드 카드 사이에 "월 수확 목표" 카드 추가
  - hr_admin: 숫자 입력 + "목표 저장" 버튼
  - farm_admin: "읽기 전용" 배지, 버튼 없음

### `src/pages/hq/_pages.jsx` (HQBranchesScreen)
- `import { supabase }` 추가
- `useState({})` branchTargets + fetchCurrentMonth와 병렬로 branches 쿼리
- `harvestT: 0` → `harvestT: branchTargets[code] || 0`
- 기존 달성 metric 슬롯 (line ~463): `b.harvestT > 0 ? Math.round(b.harvest / b.harvestT * 100) : '—'` — 변경 없음

### `src/pages/admin/BranchStatsPage.jsx`
- `useEffect/useState useHarvestStore supabase` 추가
- `monthlyHarvestByBranch` useMemo: harvestRecords → employees.branch 조인
- `branchStats` useMemo에 `monthlyHarvest / targetKg / achievePct` 추가
- KPI 메트릭 배열에 `'이번 달 달성률'` 행 추가

### `src/pages/admin/AdminDashboard.jsx`
- `useEffect useHarvestStore supabase` 추가
- `harvestAchievePct` state: branches + harvestRecords 연산 (currentUser.branch 기반 분기)
- `'목표 대비 87%'` → `'이번 달 목표 대비 ' + (harvestAchievePct !== null ? harvestAchievePct + '%' : '—')`

---

## Task 2 — Playwright 결과

`scripts/audit_session46.cjs` — **149/149 PASS, 0 FAIL, 0 WARN**

| 섹션 | 검증 항목 | 결과 |
|------|-----------|------|
| A-1 | jhkim 로그인 | PASS (1항목) |
| B-1~7 | 성과 관리 4화면 + 라벨 회귀 | PASS (32항목) |
| C-1~4 | GrowthInputScreen + 생육 대시보드 + 작물 탭 + KPI | PASS (8항목) |
| D-1~5 | 메인 대시보드 + 근무 관리 + 직원 목록 + HQ + 콘솔 에러 | PASS (7항목) |
| E-1~4 | StatsPage + KPI + 랭킹 + farm_admin 필터 실증 | PASS (14항목) |
| F-1~4 | WorkStatsPage 회귀 | PASS (11항목) |
| G-1~4 | BranchStatsPage 회귀 | PASS (9항목) |
| H-1~2 | 앱 이름 FarmWork 회귀 | PASS (3항목) |
| I-1~9 | PROTECTED-ROUTE-001 회귀 | PASS (9항목) |
| J-1~6 | BRANCH-WORK-SCHEDULE-UI-001 회귀 | PASS (13항목) |
| K-1~7 | TASKS-WORKER-ID-MISMATCH-001 회귀 | PASS (15항목) |
| L-1~7 | HARVEST-TARGETS-001 신규 | PASS (17항목) |

스크린샷: `docs/regression_session46/`

---

## BACKLOG 변경

| 변경 | 항목 |
|------|------|
| resolved | HARVEST-TARGETS-001 |

---

## LESSONS 변경

| 변경 | 내용 |
|------|------|
| 교훈 74 신설 | usePerformanceData는 ALL-TIME 집계 — 달성률엔 harvestStore.fetchCurrentMonth 사용 |
| 교훈 75 신설 | branches UPDATE RLS = can_write() 포함 → 별도 정책 불필요 |

---

## 다음 세션 후보 (세션 47)

### Tier 2 진입 후보 비교

| 항목 | ID | 복잡도 | 가치 | 추천 |
|------|-----|--------|------|------|
| HQ 재무 화면 실데이터 연결 | HQ-DASHBOARD-INTERACTIVE-001 | 중-높음 | 중 | 보류 |
| HQ 이상 신고 페이지 | HQ-ISSUE-PAGE-001 | 낮음 | 중 | 후보 |
| AdminDashboard 주간 그래프 실데이터 | DASHBOARD-PHASE2-001 | 중 | 중 | 후보 |
| 결재 워크플로 트랙 | APPROVAL-*-001 | 높음 | 높음 | 별 세션 |

**Claude Code 추천: DASHBOARD-PHASE2-001 선행**
- AdminDashboard "이번 주 작업 성과" 카드의 주간 바 차트 (현재 하드코딩 7개 막대)를 attendance_records 실데이터로 연결
- 주간 출근률 바 + 3,280 kg 수치를 실 harvestStore 이번 주 집계로 교체
- 마이그레이션 불필요, UI 수정만 — 단일 세션 완결 가능
