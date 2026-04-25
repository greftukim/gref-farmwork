# HANDOVER — Phase 5 세션 53

**날짜:** 2026-04-25  
**작업자:** Claude (세션 53)  
**커밋:** (세션 종료 후 갱신)

---

## 세션 목표

- **Task A**: regression 폴더 경로 의존성 grep 조사 → Gate 판정
- **Task B**: 세션 52 미결 항목 검증 (B1 Playwright count, B3 BACKLOG/LESSONS 무결성, B4 시드 합리성)
- **Task C**: HQ-FINANCE-002 Phase 2 구현 (차트 3개 + 예산집행률 + FinanceTrendCard + kg당 원가)
- **Task D**: Playwright 통합 감사 + BACKLOG/LESSONS/HANDOVER

---

## Task A — regression 폴더 Gate 판정

### 결과: Gate 충족 → 폴더 이동 중단

| 항목 | 결과 |
|------|------|
| untracked 폴더 | `docs/regression_session42/46/48/49/` 4개 |
| 분류-a (스크립트 OUT_DIR 하드코딩) | `audit_session42/46/48/49.cjs` 4건 |
| Gate 조건 | 분류-a ≥ 4건 → 정지 |
| 조치 | 폴더 이동 중단, 현재 naming 유지 |

**결론:** 히스토리 스크립트 19개에 `docs/regression_session{N}` 하드코딩 존재.
이름 변경 비용 > 정리 이득 → 현 구조 유지. 교훈 92 참조.

---

## Task B — 세션 52 미결 검증

### B1: Playwright PASS 39 범위 확인
- 세션 52 audit_session52.cjs: PASS 39 = 세션 52 전용 시나리오 (A/B/P/Q/R 섹션)
- 세션 49/50 감사 스크립트는 별도 파일 (audit_session49.cjs 등) — 세션 52 39건과 중복 없음
- 결론: 39건은 세션 52 신규+회귀 통합 범위, 이전 세션 스크립트는 미재실행

### B3: BACKLOG/LESSONS 무결성
| 항목 | 결과 |
|------|------|
| HQ-FINANCE-001 | Phase1 완료·Phase2 대기 ✓ |
| HQ-FINANCE-002 | open ✓ |
| HQ-FINANCE-003 | open (P3) ✓ |
| 교훈 88~90 연속성 | ✓ |
| BACKLOG 행 중복 | 0건 ✓ |

### B4: 시드 KPI 합리성
- DB 직접 조회: YTD(2026 1~4월) revenue=419,400,000원, profit_rate=37.5%, labor=117,200,000원
- 4.194억 → `toFixed(1)` → "4.2억원" (세션 52 교훈 90 확인: 우연 일치 의도된 설계)
- 37.5% 이익률: 온실 전문작물 고부가 기준 허용 범위, 시드 데이터 내부 일관성 ✓

---

## Task C — HQ-FINANCE-002 Phase 2 구현

### 변경 파일

| 파일 | 변경 내용 |
|------|---------|
| `src/pages/hq/_pages.jsx` | Recharts import 추가, HQFinanceScreen Phase 2 전체 |
| `src/pages/hq/DashboardInteractive.jsx` | Recharts import 추가, FinanceTrendCard 실데이터 |

### 추가된 기능

**`HQFinanceScreen` 변경 사항 (Phase 2):**

1. **harvestRecords 상태 + load()**: `harvest_records` 병렬 쿼리 추가
2. **useMemo 5개 신설**:
   - `totalHarvestKg`: filteredData 기간 harvest_records 합산
   - `monthlyChartData`: monthlyData 지점 합산 → `{label, revenue(만원), labor(만원)}`
   - `branchProfitData`: filteredData 지점별 수익성 집계 `{profit%, costPct%}`
   - `costStructureData`: 6 카테고리 PieChart 데이터
   - `budgetExecData`: budgets JOIN 예산 집행률 5행
3. **4th KPI 카드**: `costPerKg = totalCost / totalHarvestKg` 실계산 (원/kg 단위)
4. **Chart 1**: SVG → Recharts `ComposedChart` (Bar: revenue, Line: labor, YAxis 만원/억 포맷)
5. **Chart 2**: 하드코딩 3지점 → `branchProfitData` 실데이터 (progress bar 유지)
6. **Chart 3**: SVG 도넛 → Recharts `PieChart` (6 슬라이스 + 범례 리스트)
7. **예산 집행률**: 하드코딩 5행 → `budgetExecData` 실데이터 (category별 used/budget/pct/tone)
8. **Period 필터**: 지점별·비용구조·예산 타이틀에 현재 period 표시 (`{period}`)

**`FinanceTrendCard` (DashboardInteractive.jsx:722) 변경 사항:**
- 기존: 완전 하드코딩 SVG + "4.2억"/"20%"/"2,740원" 정적 통계
- 이후: 자체 `useEffect` → `finance_monthly` + `harvest_records` 직접 로드
  - 최근 7개월 ComposedChart (Bar: revenue, Line: labor, 만원 단위)
  - 통계 3개: 수확액(YTD), 인건비율(YTD), kg당 원가 모두 실데이터

**HQ-DASHBOARD-INTERACTIVE-002 부분 해소**: FinanceTrendCard 인건비 연결 완료. 잔여: 가동률 기간 집계, 일/주/분기 수확 집계.

---

## Playwright 결과

```
결과: PASS 48 / FAIL 0 / WARN 0 / TOTAL 48
```

| 섹션 | 내용 | 결과 |
|------|------|------|
| A | 로그인 (jhkim) | PASS 1 |
| B | 세션 52 회귀 (KPI 보존 / Growth / DashboardInteractive) | PASS 8 |
| P | HQFinanceScreen Phase 2 검증 (P-1~P-8) | PASS 27 |
| Q | DashboardInteractive FinanceTrendCard 실데이터 (Q-1~Q-3) | PASS 7 |
| R | HQ 전체 메뉴 회귀 (10개) | PASS 10 |
| S | 전체 콘솔 에러 | PASS 1 |

**P-4 Recharts SVG 확인:** 23건 (headless 환경에서 정상 렌더링 확인 — 교훈 91).

---

## BACKLOG 변경

| ID | 이전 | 이후 |
|----|------|------|
| HQ-FINANCE-001 | Phase1 완료·Phase2 대기 | Phase1+2 완료·Phase3 대기 |
| HQ-FINANCE-002 | open | resolved |
| HQ-DASHBOARD-INTERACTIVE-002 | open | partial (FinanceTrendCard 인건비 해소) |

---

## LESSONS 추가

| 번호 | 제목 |
|------|------|
| 교훈 91 | Recharts headless 환경: SVG 요소 0건이 아닌 실제 렌더링 확인 |
| 교훈 92 | regression 폴더 이름 변경 시 스크립트 OUT_DIR 하드코딩이 게이트가 됨 |

---

## 세션 54 추천: HQ-FINANCE-003 Phase 3 또는 HQ-DASHBOARD-INTERACTIVE 잔여

### 세션 54 후보 A: HQ-FINANCE-003 Phase 3 (입력 UI)

- **선행 조건**: Gate-F-03 (farm_admin 입력 권한 확정), Gate-F-05 (예산 수정 UI 여부) 결정
- **범위**: 월별 재무 입력 폼 (hr_admin 전용), 예산 수정 UI
- **우선순위**: 낮음 (운영 구조 미확정)

### 세션 54 후보 B: HQ-DASHBOARD-INTERACTIVE-002 잔여

- 가동률 기간별 attendance 집계 (오늘 이외 날짜)
- 일/주/분기별 수확 집계 (현재 월×mult 근사값 교체)

### 세션 54 진입 시 확인 필수

- [ ] `docs/BACKLOG.md` 전체 읽기
- [ ] `docs/LESSONS_LEARNED.md` 교훈 88~92 숙지
- [ ] `src/pages/hq/_pages.jsx:921` HQFinanceScreen 현재 상태 (Phase 2 완료 코드)
- [ ] `src/pages/hq/DashboardInteractive.jsx:722` FinanceTrendCard 실데이터 상태
