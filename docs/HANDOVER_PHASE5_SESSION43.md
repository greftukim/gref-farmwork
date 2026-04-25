# Phase 5 세션 43 인수인계

날짜: 2026-04-25  
작업자: Claude Code (세션 43)  
세션 목적: PROTECTED-ROUTE-001 — farm_admin HQ 라우트 직접 URL 접근 차단  
마지막 커밋: 037b9f6

---

## 세션 요약

Task 0(3건 BACKLOG 병렬 조사 + 자율 선택),
Task 1(PROTECTED-ROUTE-001 구현),
Task 2(Playwright **PASS 96 / FAIL 0 / WARN 1 / TOTAL 97**),
BACKLOG resolved 마킹, HANDOVER 완료.

---

## Task 0 — 조사 결과 및 선택 근거

| BACKLOG | 조사 결과 | 선택 여부 |
|---------|----------|----------|
| PROTECTED-ROUTE-001 | `ProtectedRoute`가 top-level 분기만 존재, HQ 하위 라우트 전부 노출 상태. 3파일 수정, DB 변경 없음 | **선택** |
| TASKS-WORKER-ID-MISMATCH-001 | `TaskCreatePage`는 이미 `activeWorkers` 기반 — 신규 등록 정상. 기존 296건 orphan은 DB 마이그레이션 필요(승인 게이트) | 보류 |
| BRANCH-WORK-SCHEDULE-UI-001 | DB 테이블 기존, UI 완전 신설 필요 (M 규모) | 보류 |

**선택 이유:** 최고 보안 임팩트 + 최소 범위(3파일) + DB 변경 없음 + 즉시 검증 가능.

---

## 구현 내용

### 변경 파일 3개

#### 1. `src/lib/permissions.js`

```js
// 신설
export const HQ_ROLES = ['hr_admin', 'supervisor', 'master', 'general'];  // HQ 전용 (farm_admin 제외)
```

#### 2. `src/App.jsx`

1. `Outlet` import 추가 (`react-router-dom`)
2. `HQ_ROLES` import 추가 (`./lib/permissions`)
3. `ProtectedRoute` — `redirectTo = '/login'` prop 추가:
   ```jsx
   function ProtectedRoute({ children, allowedRoles, redirectTo = '/login' }) {
     ...
     if (allowedRoles && !allowedRoles.includes(currentUser.role)) {
       return <Navigate to={redirectTo} replace />;
     }
     return children;
   }
   ```
4. 9개 flat HQ 라우트 → nested guarded group 재구성:
   ```jsx
   {/* HQ 전용 라우트 — farm_admin 직접 URL 접근 차단 (PROTECTED-ROUTE-001) */}
   <Route path="hq" element={
     <ProtectedRoute allowedRoles={HQ_ROLES} redirectTo="/admin"><Outlet /></ProtectedRoute>
   }>
     <Route index element={<HQDashboardScreen />} />
     <Route path="interactive" element={<HQDashboardInteractive />} />
     <Route path="growth" element={<HQGrowthCompareScreen />} />
     <Route path="performance" element={<HQPerformanceScreen />} />
     <Route path="approvals" element={<HQApprovalsScreen />} />
     <Route path="branches" element={<HQBranchesScreen />} />
     <Route path="employees" element={<HQEmployeesScreen />} />
     <Route path="finance" element={<HQFinanceScreen />} />
     <Route path="notices" element={<HQNoticesScreen />} />
   </Route>
   ```

**핵심 패턴:** React Router v6 nested route guard — 부모 `<Route>` element가 `ProtectedRoute`(`<Outlet />` 포함)를 렌더링. 자식 라우트는 부모 guard 통과 후에만 접근 가능.

---

## Playwright 결과

`scripts/audit_session43.cjs` — **96/97 PASS, 0 FAIL, 1 WARN**

| 섹션 | 검증 항목 | 결과 |
|------|-----------|------|
| A-1 | jhkim 로그인 | PASS (1항목) |
| B-1~7 | 성과 관리 4화면 + 라벨 (세션 40·41 회귀) | PASS (32항목) |
| C-1~4 | GrowthInputScreen + 생육 대시보드 + 작물 탭 + KPI (세션 39 회귀) | PASS (8항목) |
| D-1~5 | 메인 대시보드 + 근무 관리 + 직원 목록 + HQ + 콘솔 에러 (세션 28-38 회귀) | PASS (7항목) |
| E-1~4 | StatsPage 화이트 스크린 + KPI 3개 + 랭킹 + 권한 분기 (세션 41 회귀) | PASS 14 / WARN 1 |
| F-1~4 | WorkStatsPage 로드 + KPI 3개 + 테이블 실데이터 + 기간 필터 | PASS (11항목) |
| G-1~4 | BranchStatsPage 로드 + 3지점 카드 + KPI + 비교 섹션 | PASS (9항목) |
| H-1~2 | 앱 이름 FarmWork + 구 이름 제거 확인 | PASS (3항목) |
| I-1~9 | PROTECTED-ROUTE-001: hr_admin 허용 3건 + farm_admin 리디렉트 3건 + 비HQ 허용 2건 | PASS (9항목) |

스크린샷: `docs/regression_session43/`

---

## BACKLOG 변경

| 변경 | 항목 |
|------|------|
| resolved | PROTECTED-ROUTE-001 |

---

## 다음 세션 후보 (세션 44)

| 우선순위 | 항목 |
|---------|------|
| P2 | TASKS-WORKER-ID-MISMATCH-001: DB 마이그레이션으로 296건 orphan 정리 (태우님 승인 게이트 필요) |
| P2 | BRANCH-WORK-SCHEDULE-UI-001: 지점별 근무시간 설정 편집 UI (branch_work_schedule_config 테이블 기존) |
| P3 | APPROVAL-BUDGET-001, APPROVAL-HR-001, APPROVAL-MATERIAL-001 |
| P3 | HQ-ISSUE-PAGE-001: HQ 전용 이상 신고 페이지 |
| P3 | HARVEST-TARGETS-001: 지점별 월간 수확 목표치 설계 |
| P3 | HQ-GROWTH-001: GrowthCompare.jsx 실데이터 연결 |
