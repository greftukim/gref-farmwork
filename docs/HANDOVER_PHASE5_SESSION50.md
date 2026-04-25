# HANDOVER — Phase 5 세션 50

**날짜:** 2026-04-25  
**작업자:** Claude (세션 50)  
**이전 커밋:** 9c15add

---

## 세션 목표

1. **A1: Growth 핫픽스** — farm_admin /admin/growth ErrorBoundary 회귀 수정
2. **A2: 전체 메뉴 회귀 커버리지 점검** — farm_admin + hr_admin 전 메뉴 스캔
3. **A3: 세션 49 의문 3개 메우기** — WARN 3 분류, Dashboard 관계 결론, 교훈 번호 갭

---

## Task A1 — Growth 핫픽스

### 진단

| 항목 | 내용 |
|------|------|
| 에러 | `Cannot read properties of undefined (reading 'length')` |
| 위치 | `GrowthDashboardScreen` IIFE 내 `ts[ts.length - 1]` |
| 직접 원인 | `GR_DATA.timeseries['토마토'] = undefined` → `ts = undefined` → `ts.length` 크래시 |
| 근본 원인 | `growth_surveys` RLS SELECT 정책: `(can_view_all_branches() OR (farm_admin AND worker_id IS NOT NULL AND ...))` → `worker_id = NULL`인 모든 레코드(120건 전부) 차단 |
| 컨텍스트 | `growth_surveys`는 marker_plant 기반 조사 → worker_id = NULL이 정상 설계. RLS는 worker 기반 tasks 테이블 패턴을 잘못 적용 |

### 수정 2건

**1. DB: RLS 정책 교체 (마이그레이션: `fix_growth_surveys_rls_select`)**

```sql
-- 구: (can_view_all_branches() OR (farm_admin AND worker_id IS NOT NULL AND ...))
-- 신: is_admin_level() — marker_plants 정책과 동일
DROP POLICY growth_surveys_authenticated_select ON growth_surveys;
CREATE POLICY growth_surveys_authenticated_select ON growth_surveys
  FOR SELECT TO authenticated USING (is_admin_level());
```

**2. 코드: empty guard 추가 (`src/pages/Growth.jsx`)**

- `GrowthDashboardScreen`: `Object.keys(timeseries).length === 0` → "생육 조사 기록이 없습니다" 조기 반환
- `GrowthMarkerDetailScreen`: `ts = timeseries[p.crop] || []` + `!ts.length` 조기 반환

### 검증: Playwright P-1~P-7 PASS 10/10

---

## Task A2 — 전체 메뉴 회귀 커버리지 점검

### 결과 요약 (Section Q/Q2)

**farm_admin (hdkim) 13개 메뉴 전체 PASS:**
/admin, /admin/schedule, /admin/leave, /admin/tasks, /admin/board,
/admin/stats, /admin/work-stats, /admin/branch-stats, /admin/notices,
/admin/branch-settings, /admin/performance, /admin/attendance, /admin/crops

**hr_admin (jhkim) 14개 메뉴 전체 PASS:**
/admin, /admin/hq, /admin/hq/branches, /admin/hq/employees, /admin/hq/approvals,
/admin/hq/notices, /admin/hq/performance, /admin/hq/interactive, /admin/hq/issues,
/admin/hq/growth, /admin/hq/finance, /admin/stats, /admin/growth, /admin/branch-settings

**ErrorBoundary 노출: 0건 (Growth 핫픽스 후 전 메뉴 클린)**

---

## Task A3 — 세션 49 의문 메우기

### A3-1: WARN 3건 분류

| 세션 49 WARN | 분류 | 처리 |
|-------------|------|------|
| O-4: 미해결이슈 3건 (≥6 기대) | 데이터 상태 (이슈 해결됨) | R-1 재검증: 실측 8건 → PASS (기대값 수정) |
| O-6: 드릴다운 Recharts 클릭 미확인 | 환경 노이즈 (Recharts SVG Playwright 제약) | R-2 WARN 유지 (기능 동작은 수동 확인) |
| O-7: 지점 카드 모달 미확인 | 테스트 코드 오류 (locator API 잘못 사용) | R-3 수정 → PASS (지점 카드 클릭 모달 오픈 확인) |

### A3-2: AdminDashboard vs DashboardInteractive 관계 결론

| 항목 | AdminDashboard | DashboardInteractive |
|------|---------------|---------------------|
| 경로 | /admin | /admin/hq/interactive |
| 접근 권한 | 모든 admin role | HQ_ROLES (master, hr_admin) 전용 |
| 범위 | 단일 지점 (farm_admin) / 전체 (hr_admin) | 다지점 통합 운영 리포트 |
| 주요 위젯 | 주간 수확 바차트, 스케줄, KPI | 지점별 수확 비교, 드릴다운, 승인허브, 이슈 피드 |
| 관계 | **독립적 보완** — deprecated 계획 없음 | 교훈 81 참조 |

### A3-3: 교훈 번호 갭 검증

세션 49 확인: 81→82→83→84→85 연속. 세션 50: 86→87 추가. 갭 없음.

---

## Playwright 최종 결과

### 세션 50 감사 (audit_session50.cjs)

```
결과: PASS 58 / FAIL 0 / WARN 1 / TOTAL 59
```

| 섹션 | 내용 | 결과 |
|------|------|------|
| A | 로그인 | PASS |
| B-N snap | 세션 49 회귀 대표 체크 | PASS |
| P | GROWTH-RLS-001 핫픽스 검증 | PASS 10 |
| Q | 전체 메뉴 farm_admin (13개) | PASS 13 |
| Q2 | 전체 메뉴 hr_admin (14개) | PASS 14 |
| R | 세션 49 WARN 3건 재분류 | PASS 4 / WARN 1 |
| S | AdminDashboard vs DashboardInteractive | PASS 4 |

WARN 1: R-2 드릴다운 Recharts SVG Playwright 클릭 제약 (기능 동작 이상 아님)

### 누적 (세션 49 + 세션 50)

| 세션 | 감사 파일 | 결과 |
|------|----------|------|
| 세션 49 | audit_session49.cjs | PASS 174 / FAIL 0 / WARN 3 |
| 세션 50 신규 | audit_session50.cjs | PASS 58 / FAIL 0 / WARN 1 |

---

## BACKLOG 변경

| ID | 이전 | 이후 |
|----|------|------|
| GROWTH-RLS-001 | (세션 50 신설) | resolved |

---

## LESSONS 추가

| 번호 | 제목 |
|------|------|
| 교훈 86 | growth_surveys RLS: worker_id IS NOT NULL 조건이 marker_plant 기반 surveys를 차단 |
| 교훈 87 | 데이터 집계 결과가 empty일 때 컴포넌트 early guard 필수 |

---

## AdminDashboard vs DashboardInteractive 운영 정책 (A3-2 결론)

- **AdminDashboard** (`/admin`): 전 role 공통. 지점 스케줄/수확 KPI 주중심.
- **DashboardInteractive** (`/admin/hq/interactive`): HQ 전용. 다지점 통합 운영 리포트.
- **둘은 독립적 보완 관계**. 한쪽이 다른 쪽을 대체하지 않음. deprecated 계획 없음.
- DashboardInteractive 실데이터 미완 항목: HQ-DASHBOARD-INTERACTIVE-002/003 (open)

---

## 세션 51 추천: HQ-FINANCE-001 사전 조사 단독 세션

### 이유

1. HQ-DASHBOARD-INTERACTIVE-002가 인건비(재무 DB)에 의존
2. HQFinanceScreen 완전 하드코딩 — DB 스키마 설계 없이 구현 진입 불가
3. 조사 세션 단독으로: 재무 데이터 소스(파일/외부 API/DB 신설) 결정 + DB 설계 → 다음 세션 구현

### 세션 51 진입 시 확인 필수

- [ ] `docs/BACKLOG.md` 전체 읽기
- [ ] `docs/LESSONS_LEARNED.md` 교훈 86~87 숙지
- [ ] HQFinanceScreen 현재 상태 분석 (하드코딩 항목 목록 작성)
- [ ] GREF 실제 재무 구조 파악 (박민식/김민국 도메인 확인)
