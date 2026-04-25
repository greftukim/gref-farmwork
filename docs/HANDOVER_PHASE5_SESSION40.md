# Phase 5 세션 40 인수인계

날짜: 2026-04-25  
작업자: Claude Code (세션 40)  
세션 목적: FARM-PERF-DATA-001 — Performance.jsx DB 연결 (harvest_records 기반)  
마지막 커밋: (커밋 후 갱신 예정)

---

## 세션 요약

Task 0(조사 + 시나리오 B 승인), Task 1(usePerformanceData.js 전면 재작성),
Task 2+3(Performance.jsx 4개 화면 화이트 스크린 해소 + 라벨 변경),
Task 4(Playwright **PASS 49 / FAIL 0 / WARN 0 / TOTAL 49**),
Task 5(BACKLOG + LESSONS 68·69 + HANDOVER) 완료.

---

## 구현 내용

### Task 1: usePerformanceData.js 전면 재작성

**수정 파일:** `src/hooks/usePerformanceData.js`

기존: `sam_standards`만 fetch → `{ sam }` 반환  
신규: `employees` + `harvest_records` 집계 → `{ sam, workers, loading }` 반환

집계 로직:
- `employees`: role IN ('farm_admin','worker'), is_active=true
- `harvest_records` with crops(name) JOIN
- 직원별 총 수확량, 출근일(distinct dates), 작물별 수확량, 주차별 수확량 집계
- `harvestPct` = 개인 총량 / 전체 평균 × 100
- `efficiency` = harvestPct (SAM 기반 계산 불가, 교훈 69 참조)
- `stemsWeek` = 주간 평균 수확량 (kg/주)
- `attendance` = 출근일 / 30 × 100
- `weeklyTrend` = 최근 5주 주차별 {w, eff, harv, kg}
- `crop` = 가장 많이 수확한 작물명
- `pinned` = harvestPct >= 115
- `warn` = harvestPct < 80 OR attendance < 90

### Task 2+3: Performance.jsx 전면 개선

**수정 파일:** `src/pages/Performance.jsx`

#### 추가 상수
```js
const BRANCHES = [
  { id: 'busan', name: '부산LAB', c: T.primary },
  { id: 'jinju', name: '진주HUB', c: T.success },
  { id: 'hadong', name: '하동HUB', c: T.warning },
];
const CROPS_LIST = ['전체', '토마토', '딸기', '파프리카', '오이', '애호박', '방울토마토', '고추'];
```

#### Early return 제거
4개 화면 함수(HQPerformanceScreen, BranchPerformanceScreen, PerformanceDetailScreen,
PerformanceCompareScreen)의 `return <div>데이터가 없습니다</div>` 제거 → 로딩/빈데이터 분기로 교체

#### 라벨 변경 (사용자 요구 1번)
- "종합 효율 Top 5" (metric="efficiency") → **"수확 성과율 Top 5"** (metric="harvestPct")
- "작업 속도 Top 5" (metric="speedStem", unit="주/분") → **"주간 수확량 Top 5"** (metric="stemsWeek", unit="kg/주")
- PerfTable 컬럼: "효율" → "수확 성과율", "주요 작업 속도" → "주간 수확량 (kg)"
- PerfKPIs: "평균 효율" → "평균 수확 성과율"

#### PERF_DATA 참조 완전 제거
- `PERF_DATA.crops.map` → `CROPS_LIST.map`
- `PERF_DATA.branches.find(...)` → `BRANCHES.find(...)` (TopFiveCard, BottomFiveCard, PerfTable, CompareScreen)
- `PERF_DATA.branches.map(...)` → `BRANCHES.map(...)` (HQ 지점별 비교 테이블)
- `PERF_DATA.workers.*` → 훅 `workers` 배열

#### SAM 참조 수정
- `<SpeedMatrix sam={SAM}>` → `<SpeedMatrix sam={sam}>` (훅에서 로드한 DB 데이터)
- PerformanceDetailScreen KPI 카드 `SAM[w.crop]['유인']` 크래시 → stemsWeek 기반 카드로 교체

#### PerformanceDetailScreen
- 최고 harvestPct 작업자 자동 선택
- `weeklyTrend` (훅) → 주별 추이 차트 실데이터
- 작업유형별 레이더 차트: 정적 수치 → `w.harvestPct` 기반 비례 추정값

#### PerformanceCompareScreen
- `PERF_DATA.workers.find(w => w.id === ...)` (정적 ID) → `allWorkers.sort 상위 4명`

---

## Playwright 결과

`scripts/audit_session40.cjs` — **49/49 PASS, 0 FAIL, 0 WARN**

| 섹션 | 검증 항목 | 결과 |
|------|-----------|------|
| A-1 | jhkim 로그인 | PASS |
| B-1 | /admin/performance 화이트 스크린 해소 + 타이틀 | PASS (3항목) |
| B-2 | 부산LAB 순위 테이블 12행 + KPI 카드 4개 | PASS (5항목) |
| B-3 | /admin/hq/performance 화이트 스크린 해소 + jhkim 접근 허용 | PASS (4항목) |
| B-4 | HQ 전사 테이블 30행 + Top5 3개 + 지점 3개 | PASS (7항목) |
| B-5 | PerformanceDetailScreen 화이트 스크린 해소 + KPI 4개 | PASS (6항목) |
| B-6 | PerformanceCompareScreen 화이트 스크린 해소 + 비교 타이틀 | PASS (4항목) |
| B-7 | 라벨 변경 확인 (주간 수확량/수확 성과율 Top 5, 구 라벨 제거) | PASS (3항목) |
| C-1~4 | GrowthInputScreen + 생육 대시보드 + 작물 탭 + KPI 회귀 | PASS (8항목) |
| D-1~4 | 메인 대시보드 BUG-F01 회귀 + 스케줄 + HQ 대시보드 + 콘솔 에러 | PASS (5항목) |

스크린샷: `docs/regression_session40/`  
결과 JSON: `docs/regression_session40/results.json`

**주의:** farm_admin 저장 플로우(실제 INSERT)는 jhkim(hr_admin)으로 테스트 불가. 교훈 66 참조.

---

## BACKLOG 변경

| 변경 | 항목 |
|------|------|
| resolved | FARM-PERF-DATA-001 |
| resolved | HQ-PERFORMANCE-001 |
| 신규 P2 | TASKS-WORKER-ID-MISMATCH-001 |

---

## 교훈

- 교훈 68: early return 뒤에 숨은 크래시 — 제거 전 dead code 전수 점검 (LESSONS_LEARNED.md)
- 교훈 69: tasks.worker_id가 시드 UUID에만 연결 → SAM efficiency 계산 불가, harvest_records 대리 지표 활용 (LESSONS_LEARNED.md)

---

## 다음 세션 후보 (세션 41)

| 우선순위 | 항목 |
|---------|------|
| P2 | TASKS-WORKER-ID-MISMATCH-001: 신규 작업 등록 시 실 직원 연결 (SCHED-REGISTER-001 선행) |
| P3 | APPROVAL-BUDGET-001, APPROVAL-HR-001, APPROVAL-MATERIAL-001 (도메인 확인 선행) |
| P3 | HQ-ISSUE-PAGE-001: HQ 전용 이상 신고 페이지 |
| P3 | HARVEST-TARGETS-001: 지점별 월간 수확 목표치 설계 |
| P3 | SCHED-REGISTER-001: 스케줄 등록 모달 구현 |
| P3 | FARM-HQ-NOTICE-001: 공지 연동 검증 (DB 공지 1건 삽입 후 양쪽 UI) |
| P3 | HQ-GROWTH-001: GrowthCompare.jsx 실데이터 연결 |
