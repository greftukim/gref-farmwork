# DESIGN — HQ-FINANCE-001

**작성일:** 2026-04-25 (세션 51)  
**작성자:** Claude  
**상태:** 조사 완료 · 구현 대기 (Gate 결정 후 세션 52 진입 가능)

---

## 1. 현황 분석

### 1-1. 하드코딩 항목 전수 조사

`src/pages/hq/_pages.jsx:921` `HQFinanceScreen` 전체가 정적 데이터.  
`src/pages/hq/DashboardInteractive.jsx:722` `FinanceTrendCard`도 동일 수치로 하드코딩.

| 위젯 | 하드코딩 항목 |
|------|-------------|
| KPI 카드 4개 | 수확액 4.2억, 인건비 8,420만원, 이익률 23.4%, kg당 원가 2,740원 |
| 월별 수확액 vs 인건비 차트 | SVG path 좌표 고정, 레이블 10월~4월 |
| 지점별 수익성 (YTD) | 부산LAB 1.8억/42%, 진주HUB 1.4억/38%, 하동HUB 1.0억/29% |
| 비용 구조 도넛 | 총 3.22억, 인건비 46%, 자재 22%, 에너지 18%, 기타 14% |
| 예산 집행률 5개 항목 | 인건비/자재/에너지/유지보수/교육 전체 금액 고정 |
| Period 필터 | MTD / QTD / YTD / 2025 — UI 전환만, 실 필터링 없음 |
| FinanceTrendCard | 수확액 4.2억, 인건비율 20%, kg당 원가 2,740원 |

### 1-2. DB 현황

쿼리 결과 (세션 51 Supabase 직접 조회):

| 테이블 | 재무 관련 컬럼 | 활용 가능성 |
|--------|-------------|-----------|
| `harvest_records` | quantity, unit (없음: branch_id, unit_price) | 자동 수입 계산 불가 (FK = employee_id만) |
| `attendance` | work_minutes (없음: hourly_rate, wage) | 자동 인건비 계산 불가 |
| `employees` | (없음: salary, hourly_rate) | 임금 데이터 없음 |
| `branches` | monthly_harvest_target_kg | 수확 목표치만 존재 |

**결론:** 재무 테이블 전무. 수입·비용 모두 수동 입력 방식으로 신설 필요.

---

## 2. DB 설계

### 2-1. Table 1: `finance_monthly`

월별 지점별 수입/비용 실적 (수동 입력 기준).

```sql
CREATE TABLE finance_monthly (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id      uuid NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  year           integer NOT NULL CHECK (year >= 2024 AND year <= 2100),
  month          integer NOT NULL CHECK (month >= 1 AND month <= 12),
  revenue        bigint NOT NULL DEFAULT 0,      -- 수확 매출 (원 단위)
  labor_cost     bigint NOT NULL DEFAULT 0,      -- 인건비
  material_cost  bigint NOT NULL DEFAULT 0,      -- 자재·농약
  energy_cost    bigint NOT NULL DEFAULT 0,      -- 에너지 (전력·난방)
  maintenance_cost bigint NOT NULL DEFAULT 0,    -- 시설 유지보수
  training_cost  bigint NOT NULL DEFAULT 0,      -- 교육·안전
  other_cost     bigint NOT NULL DEFAULT 0,      -- 기타
  note           text,
  created_by     uuid REFERENCES employees(id),
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (branch_id, year, month)
);
```

**파생 컬럼 (코드에서 계산):**
- `total_cost = labor_cost + material_cost + energy_cost + maintenance_cost + training_cost + other_cost`
- `gross_profit = revenue - total_cost`
- `profit_rate = gross_profit / revenue * 100` (revenue > 0 조건)
- `cost_per_kg = total_cost / harvest_kg` (harvest_records JOIN 필요)

### 2-2. Table 2: `finance_budgets`

연간 예산 등록. hr_admin이 연초에 지점별로 입력.

```sql
CREATE TABLE finance_budgets (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id      uuid NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  year           integer NOT NULL CHECK (year >= 2024 AND year <= 2100),
  category       text NOT NULL CHECK (category IN (
                   'labor', 'material', 'energy', 'maintenance', 'training', 'other'
                 )),
  budget_amount  bigint NOT NULL CHECK (budget_amount >= 0),
  created_by     uuid REFERENCES employees(id),
  created_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (branch_id, year, category)
);
```

### 2-3. Table 3 (선택 — Phase 3): `crop_unit_prices`

작물별 판매단가를 등록하면 harvest_records에서 수입을 자동 계산 가능.  
**단, GATE-F-01 결정 전까지 보류. Phase 1·2는 finance_monthly.revenue 수동 입력으로 진행.**

```sql
CREATE TABLE crop_unit_prices (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  crop_id        uuid NOT NULL REFERENCES crops(id),
  effective_from date NOT NULL,
  price_per_kg   integer NOT NULL CHECK (price_per_kg >= 0),  -- 원/kg
  created_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (crop_id, effective_from)
);
```

---

## 3. 시드 데이터 계획

### 3-1. 시드 범위

- 지점 3개 (부산LAB, 진주HUB, 하동HUB)
- 기간: 2025-10 ~ 2026-04 (7개월) — 화면에 하드코딩된 기간과 일치
- `finance_budgets`: 3 지점 × 6 카테고리 = 18건 (2026년 연간 예산)

### 3-2. 시드 수치 설계 (하드코딩 수치 기반 역산)

현재 하드코딩: 전체 수확액 4.2억, 인건비 8,420만원, 이익률 23.4%, kg당 원가 2,740원

| 지점 | 월평균 수확액 | 월평균 인건비 | 이익률 |
|------|------------|------------|-------|
| 부산LAB | 약 2,600만원 | 1,060만원 | 42% |
| 진주HUB | 약 2,000만원 | 1,040만원 | 38% |
| 하동HUB | 약 1,400만원 | 830만원 | 29% |

### 3-3. 시드 SQL 패턴 (교훈 65: generate_series)

```sql
-- finance_monthly 시드 (부산LAB 예시)
DO $$
DECLARE
  busan_id uuid;
BEGIN
  SELECT id INTO busan_id FROM branches WHERE code = 'BUSAN';
  INSERT INTO finance_monthly (branch_id, year, month, revenue, labor_cost, material_cost, energy_cost)
  SELECT
    busan_id,
    EXTRACT(YEAR FROM d)::integer,
    EXTRACT(MONTH FROM d)::integer,
    (22000000 + floor(random() * 5000000))::bigint,  -- 2.2억 ± 0.5억
    (10000000 + floor(random() * 1500000))::bigint,  -- 1,000만원 ± 150
    (3000000  + floor(random() * 500000))::bigint,
    (2500000  + floor(random() * 300000))::bigint
  FROM generate_series('2025-10-01'::date, '2026-04-01'::date, '1 month'::interval) d
  ON CONFLICT (branch_id, year, month) DO NOTHING;
END $$;
```

---

## 4. UI 구조 계획

### 4-1. 진입 경로 (현재 구조 유지)

- `AdminLayout.jsx:32` → `finance: '/admin/hq/finance'` — 이미 연결됨
- `hq-shell.jsx:36` → 사이드바 "경영 지표" 메뉴 — 이미 연결됨
- `App.jsx:232` → `<Route path="finance" element={<HQFinanceScreen />} />` — 이미 연결됨

경로/메뉴 변경 불필요. `HQFinanceScreen` 내부만 수정.

### 4-2. 데이터 로딩 방식

Supabase 직접 쿼리 (기존 HQ 페이지 패턴 준수).

```jsx
// HQFinanceScreen 상단
const [monthlyData, setMonthlyData] = useState([]);
const [budgets, setBudgets] = useState([]);
const [loading, setLoading] = useState(true);

useEffect(() => {
  async function load() {
    const [{ data: m }, { data: b }] = await Promise.all([
      supabase.from('finance_monthly').select('*, branches(name, code)').order('year,month'),
      supabase.from('finance_budgets').select('*, branches(name, code)'),
    ]);
    setMonthlyData(m || []);
    setBudgets(b || []);
    setLoading(false);
  }
  load();
}, []);
```

### 4-3. Period 필터 실 적용 계획

| 필터 | 기간 정의 |
|------|--------|
| MTD | `year = 현재연도 AND month = 현재월` |
| QTD | `year = 현재연도 AND month IN 현재분기 3개월` |
| YTD | `year = 현재연도 AND month <= 현재월` |
| 2025 | `year = 2025` |

### 4-4. KPI 카드 계산 로직

```js
// period 필터 적용 후 filteredData
const totalRevenue = filteredData.reduce((s, r) => s + r.revenue, 0);
const totalLabor   = filteredData.reduce((s, r) => s + r.labor_cost, 0);
const totalCost    = filteredData.reduce((s, r) =>
  s + r.labor_cost + r.material_cost + r.energy_cost +
  r.maintenance_cost + r.training_cost + r.other_cost, 0
);
const profitRate   = totalRevenue > 0 ? ((totalRevenue - totalCost) / totalRevenue * 100).toFixed(1) : 0;
// kg당 원가: harvest_records 월별 집계와 JOIN 필요 (Phase 2)
```

### 4-5. 차트 → Recharts 교체 계획

현재 SVG 하드코딩 → Recharts `ComposedChart` (BarChart + LineChart) 교체.

```
월별 수확액 vs 인건비
  → ComposedChart: Bar(revenue) + Line(labor_cost)
  → X축: month 레이블, Y축: 원 단위 (억원 포맷)

지점별 수익성
  → BarChart: 지점별 revenue, total_cost 누적 스택

비용 구조 도넛
  → PieChart: labor/material/energy/maintenance/training/other 6 slices
```

---

## 5. RLS 계획

| 역할 | SELECT | INSERT/UPDATE | DELETE |
|------|--------|--------------|--------|
| master | 전체 | 전체 | 전체 |
| hr_admin | 전체 | 전체 | 전체 |
| farm_admin | 자기 지점만 | 자기 지점만 (GATE-F-03 대기) | 불가 |
| worker | 불가 | 불가 | 불가 |

```sql
-- finance_monthly SELECT
CREATE POLICY finance_monthly_select ON finance_monthly
  FOR SELECT TO authenticated
  USING (
    can_view_all_branches()  -- hr_admin + master
    OR branch_id IN (
      SELECT id FROM branches WHERE code = (
        SELECT branch FROM employees WHERE auth_user_id = auth.uid()
      )
    )
  );

-- finance_monthly INSERT/UPDATE (farm_admin: 자기 지점만)
CREATE POLICY finance_monthly_write ON finance_monthly
  FOR ALL TO authenticated
  USING (is_admin_level())
  WITH CHECK (
    can_view_all_branches()
    OR branch_id IN (
      SELECT id FROM branches WHERE code = (
        SELECT branch FROM employees WHERE auth_user_id = auth.uid()
      )
    )
  );
```

---

## 6. 세션 분할 계획

### Phase 1 — 세션 52 (약 3시간 추정)

- [ ] DB 마이그레이션: `finance_monthly` + `finance_budgets`
- [ ] RLS 정책 (SELECT + WRITE)
- [ ] 시드 데이터: 3 지점 × 7개월 + 2026 예산 18건
- [ ] `HQFinanceScreen` KPI 카드 4개 실데이터 연결
- [ ] Period 필터 useMemo 연결
- [ ] Playwright 세션 52 감사

### Phase 2 — 세션 53 (약 3시간 추정)

- [ ] 월별 수확액 vs 인건비 → Recharts ComposedChart 교체
- [ ] 지점별 수익성 → Recharts BarChart 실데이터
- [ ] 비용 구조 도넛 → Recharts PieChart 실데이터
- [ ] 예산 집행률 → finance_budgets JOIN 실데이터
- [ ] FinanceTrendCard (DashboardInteractive.jsx:722) 실데이터 연결
- [ ] HQ-DASHBOARD-INTERACTIVE-002 부분 해소 (인건비 연결)

### Phase 3 — 세션 54 (GATE-F-03 해소 후)

- [ ] 월별 재무 입력 폼 (farm_admin 자기 지점 입력)
- [ ] 예산 수정 UI (hr_admin)
- [ ] `crop_unit_prices` 테이블 추가 + 자동 수입 계산 (GATE-F-01 결정 후)

---

## 7. Gate Conditions — 비즈니스 결정 필요 항목

| ID | 질문 | 기본값 (결정 전 진행 방향) |
|----|------|------------------------|
| GATE-F-01 | 수입 소스: 수확액만인가? harvest_records × 단가 자동 계산 원하는가? | 수동 입력 (Phase 1·2 진행), crop_unit_prices는 Phase 3 검토 |
| GATE-F-02 | 인건비 산출: 수동 입력인가, employees.hourly_rate 추가 후 attendance 자동 계산인가? | 수동 입력 (employees에 임금 데이터 없음) |
| GATE-F-03 | farm_admin 입력 권한: 자기 지점 재무 데이터 입력 허용인가? | hr_admin만 우선 허용 (Phase 3에서 farm_admin 확대 여부 결정) |
| GATE-F-04 | 금액 입력 단위: 만원 입력 / 원 DB 저장인가, 만원 그대로 저장인가? | 원 단위 DB 저장, UI는 만원 표시 (1억 = 100,000,000) |
| GATE-F-05 | 예산 등록 UI: 매년 hr_admin이 수정 가능한 UI 필요한가, 아니면 시드 고정인가? | Phase 1은 시드 고정, Phase 3에서 수정 UI 추가 여부 결정 |

**세션 52 진입 최소 조건:**  
GATE-F-01 · GATE-F-02 결정 없이도 `수동 입력 + 원 단위 저장` 기본값으로 진행 가능.  
Phase 1·2 전체 구현 가능. Phase 3 시작 전에 GATE-F-03 결정 필요.

---

## 8. 연관 BACKLOG

| ID | 상태 | 관계 |
|----|------|------|
| HQ-FINANCE-001 | open → 세션 52 목표 | 본 설계 대상 |
| HQ-FINANCE-PDF-EXPORT-001 | partial | Phase 2 이후 선정 |
| HQ-DASHBOARD-INTERACTIVE-002 | open | Phase 2에서 인건비 연결로 부분 해소 |
| APPROVAL-BUDGET-001 | open | 별도 트랙 (예산 결재 워크플로우) — 본 설계와 무관 |

---

## 부록: HQFinanceScreen 코드 위치

| 항목 | 위치 |
|------|------|
| HQFinanceScreen 전체 | `src/pages/hq/_pages.jsx:921-1118` |
| FinanceTrendCard | `src/pages/hq/DashboardInteractive.jsx:722-764` |
| Router 등록 | `src/App.jsx:232` |
| AdminLayout 경로 상수 | `src/components/layout/AdminLayout.jsx:32` |
| HQ 사이드바 메뉴 | `src/design/hq-shell.jsx:36` |
