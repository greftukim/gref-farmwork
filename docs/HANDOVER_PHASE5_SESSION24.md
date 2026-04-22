# 세션 24 핸드오버 — Phase 5

**날짜:** 2026-04-23  
**세션:** Phase 5 Session 24  
**작업자:** greftukim (Claude Code 협업)

---

## 완료 범위

세션 23에서 이월된 HQ 버그 4건 + 공통 버튼 수정 1건. 총 5개 Task, 커밋 5건.

---

## Task 1 — btnPrimary/btnSecondary onClick 파라미터 추가 (`327e26a`)

**파일:** `src/design/primitives.jsx`

**원인:** btnPrimary/btnSecondary가 helper 함수(컴포넌트 아님) 형태로 선언되어 있었으나 onClick 파라미터가 없어, 렌더된 `<button>`에 이벤트 핸들러 전달 불가.

**수정:** 3번째 파라미터에 `onClick` 추가. 기존 55개 호출처는 파라미터 미전달 시 undefined → no-op이므로 하위 호환 유지.

```js
const btnPrimary = (label, iconD, onClick) => (
  <button onClick={onClick} ...>
const btnSecondary = (label, iconD, onClick) => (
  <button onClick={onClick} ...>
```

---

## Task 2 — HQTopBar 검색 input 교체 + 알림 벨 onClick (`f00590d`)

**파일:** `src/design/hq-shell.jsx` (HQTopBar, L122~)

**수정 1:** `<span>검색</span>` → `<input placeholder="검색" onChange={/* BACKLOG: GLOBAL-SEARCH-001 */} ...>`  
**수정 2:** 알림 벨 `<button>` → `onClick={() => alert('알림 기능 준비 중입니다.')}`  
**비수정:** 기간 피커(일/주/월/분기) `<span>` × 4 — 클릭 이벤트 미연결 유지 (BACKLOG: HQ-PERIOD-PICKER-001)

---

## Task 3 — HQEmployeesScreen 직원 상세 모달 연결 (`58c45b7`)

**파일:** `src/pages/hq/_pages.jsx`

**수정:**
- `import EmployeeDetailModal from '../../components/employees/EmployeeDetailModal'` 추가
- `const [selectedEmployee, setSelectedEmployee] = useState(null)` 추가
- `branchNameMap` 런타임 계산: `Object.fromEntries(Object.entries(BRANCH_META).map(([k, v]) => [k, v.name]))`
- "상세" 버튼 `onClick={() => setSelectedEmployee(e)}` 연결
- 모달 렌더: `onEdit` prop 미전달 (read-only, BACKLOG: HQ-EMPLOYEE-EDIT-MODAL-001)

---

## Task 4 — HQEmployeesScreen 연락처 컬럼 추가 (`714619f`)

**파일:** `src/pages/hq/_pages.jsx`

**수정:** 테이블 헤더·바디에 `연락처` 컬럼 추가. `{e.phone || '—'}` — `snakeToCamel()` 통과 후 `e.phone`으로 접근 (employees.phone VARCHAR 컬럼 실존 확인).

---

## Task 5 — Dashboard 승인허브 위젯 탭 클릭 가능 (`91b10e6`)

**파일:** `src/pages/hq/Dashboard.jsx`

**원인:** 필터 탭 배열이 `on: true` 하드코딩, `<span>`에 onClick 없어 탭 전환 불가.

**수정:**
- `const [approvalFilter, setApprovalFilter] = useState('all')` 추가
- pills 배열에 `k` 키 추가 (all/attendance/budget/hr/material)
- `onClick={() => setApprovalFilter(p.k)}` + `const on = approvalFilter === p.k` 동적 활성
- 본문 필터: `all`·`attendance` → pendingLeave 렌더, 나머지 → "해당 카테고리 데이터 없음"

---

## 커밋 해시 (세션 24)

| 해시 | 설명 |
|---|---|
| `327e26a` | btnPrimary/btnSecondary onClick 파라미터 추가 |
| `f00590d` | HQTopBar 검색창 input 교체 + 알림 벨 onClick 임시 처리 |
| `58c45b7` | HQEmployeesScreen 직원 상세 모달 연결 (읽기 전용) |
| `714619f` | HQEmployeesScreen 연락처 컬럼 추가 |
| `91b10e6` | Dashboard 승인허브 위젯 탭 클릭 가능 (시각 전환) |

---

## BACKLOG 변경 (세션 24)

| ID | 변경 |
|---|---|
| HQ-EMP-SEARCH-001 | open → **resolved** (세션 24 Task 3) |
| NOTIFICATION-DROPDOWN-001 | **신규** — 알림 드롭다운 미구현 |
| GLOBAL-SEARCH-001 | **신규** — HQTopBar 전역 검색 미구현 |
| HQ-PERIOD-PICKER-001 | **신규** — HQTopBar 기간 피커 onClick 미연결 |
| APPROVAL-CATEGORY-001 | **신규** — Dashboard 승인허브 예산/인사/자재 데이터 없음 |
| HQ-EMPLOYEE-EDIT-MODAL-001 | **신규** — 직원 상세 모달 편집 기능 미연결 |

---

## 다음 세션 후보

**후보 A — HQ 이월 4개 페이지:**
- HQFinanceScreen: 재무 DB 트랙 신설 or wontfix 결정 (BACKLOG: HQ-FINANCE-001)
- GrowthCompare: growth_surveys 집계 쿼리 설계 필요 (BACKLOG: HQ-GROWTH-001)
- Performance: daily_work_logs + SAM 집계 로직 설계 필요 (BACKLOG: HQ-PERFORMANCE-001)
- DashboardInteractive (801줄): 단독 처리 권장 (BACKLOG: HQ-DASHBOARD-INTERACTIVE-001)

**후보 B — 재배팀 _others.jsx 실데이터 연결:**
- EmployeesScreen · LeaveScreen · TasksScreen (BACKLOG: RECONNECT-OTHERS-001)

세션 시작 전 CLAUDE.md 5번 절차 준수 (git log, BACKLOG, LESSONS 순독).
