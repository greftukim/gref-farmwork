# Phase 5 세션 38 인수인계

날짜: 2026-04-24  
작업자: Claude Code (세션 38)  
세션 목적: GROWTH-SURVEYS-001 — Growth.jsx DB 연결 (화이트 스크린 해소 + 샘플 설정 UI)  
마지막 커밋: (세션 38 커밋 후 갱신)

---

## 세션 요약

Task 0(DB 현황 조사 + 승인 게이트), Task 1(DDL 마이그레이션), Task 2(시드 실행), Task 3+4(useGrowthData 훅 전면 재작성 + Growth.jsx 실데이터 연결), Task 5(샘플 설정 UI), Task 6(Playwright **PASS 26 / FAIL 0 / WARN 0 / TOTAL 26**), BACKLOG + LESSONS + HANDOVER 완료.  
신규 교훈 2건(64·65) 추가. BACKLOG 2건 resolved(FARM-GROWTH-DB-001, GROWTH-SURVEYS-001), 신규 2건 등록(GROWTH-INPUT-SESSION39-001).

---

## 구현 내용

### Task 0: DB 현황 조사

- marker_plants: `branch TEXT NOT NULL` 이미 존재 → ALTER 불필요
- marker_plants: `marker_number` 컬럼 없음 → ADD 필요
- growth_surveys: `week_number` 컬럼 없음 → ADD 필요
- crops: `category` 컬럼 없음 → ADD 필요
- 데이터: marker_plants 0건, growth_surveys 156건(구조 불일치), growth_survey_items 40건(UI 미사용)

### Task 1: DDL 마이그레이션 — migration: session38_growth_schema_ddl

| 변경 | 내용 |
|------|------|
| crops.category | TEXT ADD (토마토/오이/파프리카/방울토마토/미니오이/미니파프리카/완숙토마토/토마지노 분류) |
| growth_surveys.week_number | INT ADD |
| marker_plants.marker_number | INT ADD |
| branch_crop_sample_config | 신규 테이블 (branch, crop_id, sample_count, UNIQUE 제약) |
| branch_crop_sample_config 초기값 | 3 지점 × 3 작물 = 9건, sample_count=5 |

### Task 2: 시드 실행

- DELETE: growth_survey_items 40건, growth_surveys 156건, marker_plants 0건(빈 테이블)
- INSERT marker_plants: 15건 (3 지점 × [토마토 2 + 오이 2 + 파프리카 1] = 5/지점)
- INSERT growth_surveys: 120건 (15 × 8주, 2026-03-03 기준 주간)
  - measurements JSONB: GROWTH_SCHEMA 기반 표준곡선 값 (ARRAY[] 1-indexed 서브스크립트 활용)

### Task 3+4: useGrowthData 훅 전면 재작성 — GROWTH-SURVEYS-001

**수정 파일:** `src/hooks/useGrowthData.js` (전면 재작성)

| 함수 | 변경 내용 |
|------|-----------|
| `buildMarkerPlants` | `p.gol/label` → `p.bed/row_label/start_date/marker_number` 수정. 표시 ID 생성: `T-A-01` 형식 |
| `buildTimeseries` | **신규.** crop×week 집계 → 평균 metrics. timeseries[cropName] 배열 반환 |
| `buildCrops` | **신규.** crops 탭 배열 생성. surveyPlants, deviation, lastSurvey, summary 포함 |
| `buildStandardCurve` | 유지 (DB + SC_DEFAULT merge) |
| 쿼리 | `crops(name, category)` embed 추가. 주차별 집계를 위해 `ascending: true` order |
| grData | `currentWeek=maxWeek`, `calendarWeek=ISO주차`, `crops=[...]`, `timeseries={...}` 완전 채움 |

**결과:** 화이트 스크린("데이터가 없습니다") 완전 해소. GrowthDashboardScreen/InputScreen/MarkerDetailScreen/HeatmapScreen 모두 실데이터로 렌더링.

### Task 5: 샘플 설정 UI

**수정 파일:** `src/pages/admin/MarkerPlantManagePage.jsx`

- `SampleConfigCard` 컴포넌트 신규 추가 (파일 내 inline)
- branch_crop_sample_config에서 3지점 × 3작물 = 9행 읽기
- 숫자 입력 → 저장 버튼으로 `sample_count` 업데이트
- 경로: `/admin/growth/markers` 하단에 표시

---

## Playwright 결과

`scripts/audit_session38.cjs` — **26/26 PASS, 0 FAIL, 0 WARN**

| 섹션 | 검증 항목 | 결과 |
|------|-----------|------|
| A-1 | jhkim 로그인 | PASS |
| B-1 | 생육 대시보드 로드 (화이트 스크린 해소) | PASS (3항목) |
| B-2 | 작물 탭 3개 (토마토/오이/파프리카) | PASS (3항목) |
| B-3 | KPI 카드 4개 | PASS (4항목) |
| B-4 | 개화 화방 높이 추이 차트 | PASS |
| B-5 | 표식주 테이블 행 6개 | PASS |
| B-6 | 주별 입력 페이지 타이틀 | PASS |
| B-7 | 히트맵 페이지 타이틀 | PASS |
| B-8 | 표식주 관리 + 샘플 설정 섹션 + 지점 3개 | PASS (5항목) |
| C-1 | BUG-F01 부동소수점 회귀 없음 | PASS |
| C-2 | BUG-F02 작물 탭 회귀 없음 | PASS |
| C-3 | SchedulePage 타이틀·타임라인 회귀 없음 | PASS (2항목) |
| C-4 | HQ 사이드바 로그아웃 유지 | PASS |
| C-5 | HQ 콘솔 에러 0건 | PASS |

스크린샷: `docs/regression_session38/`  
결과 JSON: `docs/regression_session38/results.json`

---

## BACKLOG 변경

| 변경 | 항목 |
|------|------|
| resolved | FARM-GROWTH-DB-001 (Growth.jsx DB 연결 전체) |
| resolved | GROWTH-SURVEYS-001 (세션 38 구현 세부) |
| open (신규) | GROWTH-INPUT-SESSION39-001 (주별 입력 실제 저장 — P2) |

---

## 교훈

- 교훈 64: 훅 함수가 존재하지 않는 컬럼 참조 시 무증상 실패 (LESSONS_LEARNED.md)
- 교훈 65: JSONB 시드는 generate_series × ARRAY[] 리터럴로 단발 처리 (LESSONS_LEARNED.md)

---

## 다음 세션 후보 (세션 39)

| 우선순위 | 항목 |
|---------|------|
| P2 | GROWTH-INPUT-SESSION39-001: 주별 생육 기록 입력 실제 저장 (GrowthInputScreen INSERT 구현) |
| P2 | FARM-PERF-DATA-001: Performance.jsx DB 연결 |
| P3 | APPROVAL-BUDGET-001, APPROVAL-HR-001, APPROVAL-MATERIAL-001 (도메인 확인 선행) |
| P3 | HQ-ISSUE-PAGE-001: HQ 전용 이상 신고 페이지 |
| P3 | HARVEST-TARGETS-001: 지점별 월간 수확 목표치 설계 |
| P3 | SCHED-REGISTER-001: 스케줄 등록 모달 구현 |
