# 세션 27 핸드오버 — Phase 5

**날짜:** 2026-04-24
**세션:** Phase 5 Session 27
**작업자:** greftukim (Claude Code 협업)

---

## 완료 범위

harvest_records 시드 509건 투입 + harvestStore 신설 + Dashboard / HQBranchesScreen 실데이터 연결 + Dashboard 작물 탭 실 필터링 + 주별 바 차트 실데이터 연결. **커밋 3건 + 본 커밋.**

---

## 태우님 결정 (세션 27 시작 시)

- 기본 플랜 승인
- 선택지 C (목표치 생략) 채택 — 지점별 월간 목표치 트랙 분리, 이번 세션 대상 외
- Q1 HQSidebar 수확 메뉴 노출: 후속 정찰 이관 → **HQ-HARVEST-MENU-001** 신규 등록
- Q2 시드 방식: migrations 파일 기록 + 일회성 실행 (`DO $$ ... END $$`)
- Q3 목표치 트랙: 지금 결정 안 함, BACKLOG 등록만 → HARVEST-TABLE-001 → **HARVEST-TARGETS-001 rename**

---

## Task별 진행

### Task 1 — 시드 migration 파일 (실행 전 커밋)

- 파일: `supabase/migrations/20260423_session27_harvest_seed.sql` (115줄)
- 커밋: **9670823** (이전 세션 작성, 본 세션에 실행)
- 안전장치:
  - self-guard: `pre_count > 0` → `RAISE EXCEPTION` (재실행 방지)
  - 작물 6종 NULL 검증 (`RAISE EXCEPTION 'Required crops not found'`)
  - `ELSE CONTINUE`로 `management`/`seedlab`/`headquarters` branch worker 자동 스킵
  - 롤백 주석 헤더 포함 (`DELETE FROM harvest_records;`)

### Task 2 — 시드 실행 + 검증

태우님 "실행 OK" 승인 후 `mcp__supabase__execute_sql`로 DO 블록 실행.

pre-check `SELECT COUNT(*) FROM harvest_records` = 0 재확인 후 실행.

**검증 4종:**

| 검증 | 결과 |
|---|---|
| 총 건수 | **509건** (예상 480건 내외) |
| busan 건수 / kg | 195 / 5,224.7 |
| jinju 건수 / kg | 152 / 4,250.3 |
| hadong 건수 / kg | 162 / 2,401.8 |
| 토마토 (busan 메인) | 143건 / 4,449.0kg |
| 파프리카 (jinju 메인) | 119건 / 3,661.0kg |
| 딸기 (hadong 메인) | 121건 / 1,216.6kg |
| 방울토마토 + 미니파프리카 + 오이 (보조) | 126건 / 2,550.2kg |
| 메인 / 보조 비율 | 75.2% / 24.8% (기대 75/25 일치) |

**주별 bucket (DATE_TRUNC('week', ...) 월요일 시작, D-29~D 범위):**

| 주 시작일 | 건수 | kg |
|---|---|---|
| 2026-03-23 | 98 | 2,359.2 |
| 2026-03-30 | 115 | 2,567.9 |
| 2026-04-06 | 121 | 2,918.2 |
| 2026-04-13 | 108 | 2,475.1 |
| 2026-04-20 | 67 | 1,556.4 |

30일치가 월요일 경계 걸리면 5주 bucket 발생 정상. Dashboard 차트는 "최근 4주 rolling"이라 별 집계.

### Task 3 — harvestStore 신설

- 파일: `src/stores/harvestStore.js` (72줄)
- 커밋: **9fbb9d9**
- 기존 branchStore/cropStore 패턴 일치 (`zustand create` + default export)
- 인터페이스:
  - `records` / `loading` / `error`
  - `fetchCurrentMonth()` — 당월 1일 이후 records, employees·crops embed
  - `getTotalMonthly()` / `getByBranch()` / `getByCrop()` — 파생 집계 getter
  - `getByWeek(filter?)` — 최근 4주 rolling(index 3=현재 주), 선택적 records filter

### Task 4 — Dashboard + HQBranchesScreen store 연결

- 커밋: **9731ddc**
- inline `supabase.from('harvest_records')` 2곳 제거 (Dashboard.jsx L51, _pages.jsx L311)
- grep 검증: `supabase.from('harvest_records')` / `from.*supabase` in `src/pages/hq/` → **0건**
- `npm run build` **통과** (25.22s, 오류 없음)

**Dashboard.jsx 변경:**
- `supabase` import 제거, `useHarvestStore` 추가
- `monthlyHarvestByEmp`: `useState` + inline fetch → `harvestRecords` 기반 `useMemo`
- `cropFilteredRecords`: cropFilter 적용 파생 (D-T1 실 필터링)
- `branchWeekHarvest`: 지점 × 최근 4주 2차원 집계 `useMemo` (cropFilter 반영, D-D2)
- `weekMax`: 차트 공통 max 동적 계산
- 주별 바 차트 하드코딩 `weeks=[0,0,0,0]` + `max=360` 제거 → 실데이터 + `opacity` 유/무 분기 (`v > 0 ? 0.85 : 0.2`)
- 주 라벨 변경: `'1주'~'4주'` → `'3주 전', '2주 전', '지난주', '이번주'` (rolling 의미 명확화)
- BACKLOG 주석 `HARVEST-TABLE-001` → `HARVEST-TARGETS-001`

**_pages.jsx HQBranchesScreen 변경:**
- `supabase` import 제거 (파일 전체에서 유일한 사용처였음)
- `useHarvestStore` 추가
- `monthlyHarvestByEmp`: `useState` + inline fetch → `harvestRecords` 기반 `useMemo`

### Task 5 — BACKLOG + HANDOVER

- 본 커밋 (Task 5)
- BACKLOG 변경 4건 (아래 표 참조)
- HANDOVER 문서 신규 작성

---

## 커밋 해시 (세션 27)

| 해시 | 설명 |
|---|---|
| `9670823` | Task 1 — harvest_records 시드 migration 작성 (실행 전, 이전 세션) |
| `9fbb9d9` | Task 3 — harvestStore 신설 (월/주/지점/작물 집계) |
| `9731ddc` | Task 4 — Dashboard + HQBranchesScreen 수확 데이터 store 연결 |
| (본 커밋) | Task 5 — BACKLOG 상태 변경 + SESSION27 HANDOVER |

---

## BACKLOG 변경

| ID | 변경 | 비고 |
|---|---|---|
| HARVEST-TABLE-001 | **rename** → HARVEST-TARGETS-001 | 설명 재정의 (목표치 트랙 전용). harvest_records 0건 이슈는 시드 509건으로 해소. |
| HARVEST-WEEKLY-001 | open → **resolved** | 커밋 9731ddc, branchWeekHarvest 2차원 집계 + 동적 max |
| HARVEST-CROP-FILTER-001 | open → **resolved** | 커밋 9731ddc, cropFilteredRecords useMemo 연쇄 |
| HQ-HARVEST-MENU-001 | **신규 open** | HQSidebar 수확 메뉴 노출 조사 (후속 정찰) |

---

## 태우님 브라우저 검증 포인트

1. **HQ Dashboard `/admin/hq`**
   - 월 수확량 KPI 카드: 약 **11,877 kg** 표시 (지점별 합계)
   - 지점별 운영 현황 카드 3개:
     - 부산LAB `수확 5,225kg`
     - 진주HUB `수확 4,250kg`
     - 하동HUB `수확 2,402kg`
   - **이번 달 지점별 수확량 차트**:
     - 주별 바 4개 (3주 전/2주 전/지난주/이번주) 실데이터
     - 작물 탭 전환 시 bar 즉시 갱신 — `토마토` 탭 → 부산만 bar 있음(진주·하동 0)
     - `파프리카` 탭 → 진주만 bar 있음
     - `딸기` 탭 → 하동만 bar 있음
     - `오이` 탭 → 하동 보조 작물 bar
2. **HQ Branches `/admin/hq/branches`**
   - 전사 요약 카드 `월 수확량` 약 **11,877 kg**
   - 지점별 카드 `수확` 값 Dashboard와 일치
3. **재배팀 `/admin/harvest`** (기존 입력 UI, 금지 사항으로 본 세션 미수정)
   - 정상 접근 가능 확인 (회귀 없음)

---

## 새 교훈

**없음.** 이번 세션에서 새로 박제할 교훈 없음.
기존 교훈 20 (BACKLOG ID 무결성), 교훈 22 (LESSONS 즉시 append), 교훈 35·37 (DB 직접 조회 우선) 준수.

---

## 다음 세션 후보

- **후보 A — HQ 이월 4개 페이지 실데이터 연결** (HQ-FINANCE-001, HQ-GROWTH-001, HQ-PERFORMANCE-001, HQ-DASHBOARD-INTERACTIVE-001)
- **후보 B — HQ-HARVEST-MENU-001** (HQSidebar 수확 메뉴 노출 조사, 세션 27 파생)
- **후보 C — HARVEST-TARGETS-001** (지점별 월간 수확 목표치 설계, 박민식·김민국 답변 선행)
- **후보 D — HQ-ISSUE-PAGE-001** (HQ 전용 이상 신고 페이지 신설, 세션 25 파생)
- **후보 E — 짧은 부채 정리 세션** (FCM-001, UX-009, RLS-DEBT-021)

세션 시작 전 CLAUDE.md 5번 절차 준수 (git log, BACKLOG, LESSONS 순독).

---

## 참고

- 시드 실행은 Supabase 원본 DB에서 직접 수행됨 (브랜치 없음). 재실행 시 self-guard로 차단.
- `ScheduleWakeup` 등 백그라운드 자동화 미사용. 모든 SQL은 대화 턴 내 명시적 실행.
- 시드 마이그레이션 파일은 기록용 (`supabase db push` 대상 아님). 재실행 방지를 위해 실행 상태 주석(Status: 실행 완료 2026-04-24) 후속 커밋에서 업데이트 권장.
