# HANDOVER — Phase 5 세션 52

**날짜:** 2026-04-25  
**작업자:** Claude (세션 52)  
**커밋:** 888f996

---

## 세션 목표

- **Task 0**: 사전 조사 재확인 (Gate 결정 반영, 코드/DB 현황)
- **Task 1**: DB 마이그레이션 + 시드 (finance_monthly + finance_budgets)
- **Task 2**: KPI 카드 실데이터 연결 (HQFinanceScreen Phase 1)
- **Task 3**: Playwright 검증 + 문서 정리

---

## Task 0 — 사전 조사 결과

| 항목 | 결과 |
|------|------|
| Gate 5건 | DESIGN_HQ_FINANCE_001.md 상단에 결정 메모 추가 |
| 재무 테이블 | 전무 확인 (세션 51 결과 유지) |
| RLS 헬퍼 | `can_view_all_branches()`: hr_admin+master+supervisor+general, `can_write()`: farm_admin+hr_admin+master |
| branches 코드 | `busan` / `jinju` / `hadong` (운영 3개) |
| supabase 임포트 | `_pages.jsx:10` — 이미 존재 |

---

## Task 1 — DB 마이그레이션 + 시드

### 마이그레이션: `session52_finance_tables`

**테이블 2개 신설:**

```sql
-- finance_monthly: 월별 지점별 수입/비용 (원 단위, Gate-F-04 A안)
CREATE TABLE finance_monthly (
  id, branch_id FK, year, month, revenue, labor_cost, material_cost,
  energy_cost, maintenance_cost, training_cost, other_cost,
  note, created_by, created_at, updated_at,
  UNIQUE(branch_id, year, month)
);

-- finance_budgets: 연간 예산
CREATE TABLE finance_budgets (
  id, branch_id FK, year, category('labor'|'material'|'energy'|'maintenance'|'training'|'other'),
  budget_amount, created_by, created_at,
  UNIQUE(branch_id, year, category)
);
```

**RLS 정책:**

| 테이블 | 정책 | 조건 |
|--------|------|------|
| finance_monthly | SELECT | can_view_all_branches() OR 자기 지점 |
| finance_monthly | ALL(write) | hr_admin + master (Gate-F-03 A안) |
| finance_budgets | SELECT | can_view_all_branches() OR 자기 지점 |
| finance_budgets | ALL(write) | hr_admin + master |

**시드 결과:**

| 테이블 | 행 수 | 범위 |
|--------|------|------|
| finance_monthly | 21 | 3지점 × 7개월 (2025-10~2026-04) |
| finance_budgets | 18 | 3지점 × 6카테고리 × 2026년도 |

**YTD(2026-01~04) 검증:**
- 총 수확액: 4.194억 ≈ 4.2억
- 총 인건비: 1.172억 = 11,720만원
- 이익률: 37.5%

---

## Task 2 — KPI 실데이터 연결

### 변경 파일: `src/pages/hq/_pages.jsx:921`

**추가 코드 (HQFinanceScreen 상단):**

```jsx
// 데이터 로딩
const [monthlyData, setMonthlyData] = useState([]);
const [budgets, setBudgets] = useState([]);
const [loading, setLoading] = useState(true);

useEffect(() => {
  async function load() {
    const [{ data: m }, { data: b }] = await Promise.all([
      supabase.from('finance_monthly').select('*, branches(name, code)').order('year,month'),
      supabase.from('finance_budgets').select('*, branches(name, code)'),
    ]);
    setMonthlyData(m || []); setBudgets(b || []); setLoading(false);
  }
  load();
}, []);

// Period 필터 useMemo
const filteredData = useMemo(() => {
  switch (period) {
    case 'MTD': year=현재연도 AND month=현재월
    case 'QTD': year=현재연도 AND 현재분기 3개월
    case 'YTD': year=현재연도 AND month<=현재월
    case '2025': year=2025
  }
}, [monthlyData, period, ...]);

// KPI 계산
totalRevenue, totalLabor, totalCost, profitRate
laborBudget (finance_budgets JOIN), laborExecPct
```

**KPI 카드 결과 (YTD 기준):**

| KPI | 이전 (하드코딩) | 현재 (실데이터) |
|-----|--------------|--------------|
| 누적 수확액 | 4.2억원 | 4.2억원 (실측 4.194억) |
| 누적 인건비 | 8,420만원 | 11,720만원 |
| 영업 이익률 | 23.4% | 37.5% |
| kg당 생산원가 | 2,740원 | — (Phase 2 예정) |

**Phase 2 유지 (하드코딩 보존):**
- 월별 수확액 vs 인건비 차트 (SVG 하드코딩)
- 지점별 수익성 차트
- 비용 구조 도넛
- 예산 집행률

---

## Playwright 결과

```
결과: PASS 39 / FAIL 0 / WARN 0 / TOTAL 39
```

| 섹션 | 내용 | 결과 |
|------|------|------|
| A | 로그인 (jhkim) | PASS 1 |
| B | 세션 51 회귀 (Growth/Interactive/Dashboard) | PASS 7 |
| P | HQFinanceScreen 실데이터 검증 (P-1~P-7) | PASS 18 |
| Q | farm_admin 권한 검증 (Q-1~Q-3) | PASS 3 |
| R | HQ 전체 메뉴 회귀 (10개) | PASS 10 |

**P-2 오탐 수정 이력:** 시드 수치(4.194억) toFixed(1) → "4.2억원"이 구 하드코딩과 우연 일치.
→ 테스트를 "인건비 8,420 제거" + "이익률 23.4 제거"로 교체 (교훈 90).

---

## BACKLOG 변경

| ID | 이전 | 이후 |
|----|------|------|
| HQ-FINANCE-001 | 조사완료·구현대기 | Phase1 완료·Phase2 대기 |
| HQ-FINANCE-002 | (신설) | open — Phase 2 차트 실데이터 |
| HQ-FINANCE-003 | (신설) | open (P3) — Phase 3 입력 UI |

---

## LESSONS 추가

| 번호 | 제목 |
|------|------|
| 교훈 90 | 시드 수치가 하드코딩 표시값과 우연히 일치하면 Playwright "제거 확인" 오탐 발생 |

---

## Gate 현황 (Phase 3 진입 전 결정 필요)

| Gate | 결정 | 잔여 |
|------|------|------|
| F-01 매출 소스 | A안 완료 | Phase 3에서 crop_unit_prices 검토 |
| F-02 인건비 소스 | A안 완료 | — |
| F-03 farm_admin 입력 | A안 (hr_admin 전담) | Phase 3 진입 시 재검토 |
| F-04 금액 단위 | A안 완료 | — |
| F-05 예산 수정 UI | A안 (시드 고정) | Phase 3 진입 시 재검토 |

---

## 세션 53 추천: HQ-FINANCE-002 Phase 2 구현

### 세션 53 범위

1. **차트 1**: 월별 수확액 vs 인건비 → Recharts `ComposedChart` (Bar + Line)  
2. **차트 2**: 지점별 수익성 → Recharts `BarChart` 실데이터  
3. **차트 3**: 비용 구조 도넛 → Recharts `PieChart` 실데이터  
4. **예산 집행률**: `finance_budgets` JOIN 실데이터  
5. **FinanceTrendCard** (`DashboardInteractive.jsx:722`): 실데이터 연결  
6. **kg당 생산원가**: harvest_records JOIN 집계  
7. HQ-DASHBOARD-INTERACTIVE-002 인건비 부분 해소

### 세션 53 진입 시 확인 필수

- [ ] `docs/BACKLOG.md` 전체 읽기
- [ ] `docs/LESSONS_LEARNED.md` 교훈 86~90 숙지
- [ ] `docs/DESIGN_HQ_FINANCE_001.md` Phase 2 섹션 확인
- [ ] `src/pages/hq/_pages.jsx:921` HQFinanceScreen 현재 상태 확인 (Phase 1 연결 부분)
- [ ] `src/pages/hq/DashboardInteractive.jsx:722` FinanceTrendCard 구조 확인
