# 세션 22 핸드오버 — Phase 5

**날짜:** 2026-04-22  
**세션:** Phase 5 Session 22  
**작업자:** greftukim (Claude Code 협업)

---

## 완료 범위

### RECONNECT-OTHERS-001 부분 완료 (5/9)

HQ 9개 페이지 중 5개 실데이터 재연결 완료.

#### 공통 모듈 신설 (`src/pages/hq/_pages.jsx` 상단)

- `BRANCH_META`: employees.branch 코드값 → 표시명·dot색·avatar색 매핑 (6종)
- `HQ_BRANCHES`: 본사 그룹 코드 배열 `['headquarters', 'management', 'seedlab']`
- `ROLE_LABEL`: role → 한국어 표시명 매핑
- `hireDisplay()`: hire_date → 'YYYY.MM' 포맷 유틸

#### 1. HQEmployeesScreen

- `useEmployeeStore.fetchEmployees()` 마운트 시 fetch
- tab 필터 (전체/부산LAB/진주HUB/하동HUB/본사) → `useMemo` 기반 분기
- KPI (전체인원·재직중·신규입사·지점수) 실계산
- 직원 테이블 행: branch 표시명·역할·고용형태·재직상태 실데이터 바인딩
- **DB 실태**: `job_type` = 'admin'/'worker' 2종만 존재 → 고용형태 필터는 `HQ-EMP-TYPE-001`로 이월

#### 2. HQApprovalsScreen

- `useLeaveStore.fetchRequests()` + `useEmployeeStore.fetchEmployees()` 병행 fetch
- 대기/승인/반려 탭 카운트 실데이터 (`requests.filter`)
- `tabItems` useMemo: request → employee join → branch명·역할 표시
- 단건 승인/반려: `farmReview(id, true/false, currentUser?.id)`
- 일괄 승인/반려: `handleBatchApprove` / `handleBatchReject`
- tab==='pending' 아닌 경우 Pill(승인됨/반려됨) 표시

#### 3. HQ Dashboard (`src/pages/hq/Dashboard.jsx`)

- 5개 store 연결: `employeeStore` · `leaveStore` · `issueStore` · `noticeStore` · `authStore`
- 지점 카드: `bwc(code)` — 활성 직원 수 실계산 (수확량/출근률은 하드코딩 유지)
- KPI `미해결이슈`: 하드코딩 7 → `openIssues.length`
- 승인허브 배지: 하드코딩 12 → `requests.filter(pending).length`
- `pendingLeave` useMemo: 최대 5건, 승인/반려 버튼 onClick 연결
- `issueFeed` useMemo: openIssues 최대 4건, workerId → employee → branch 매핑
- `noticeItems` useMemo: notices 최대 4건, priority → 태그/톤 매핑
- 각 패널 빈 상태 UI 추가

#### 4. HQBranchesScreen

- `useEmployeeStore` 재사용 (fetch는 employees.length===0 조건부)
- `bwc(code)` 헬퍼: 지점별 활성 직원 수 실계산
- KPI: 운영지점 `branches.length`, 총인원 `branches.reduce sum`
- **DB 실태**: branches 테이블에 지점장/수확량/면적/작물 컬럼 없음 → `HQ-BRANCHES-META-001` 이월

#### 5. HQNoticesScreen

- `useNoticeStore.fetchNotices()` 마운트 시 fetch
- `notices.priority` = 'important'|'normal' → 태그/톤 매핑
- KPI: 활성공지 `notices.length`, 탭 카운트 실수
- **DB 실태**: 열람률/만료일/대상 컬럼 없음 → `HQ-NOTICES-META-001` 이월

---

## 이월 페이지 (4개)

| 페이지 | 이유 | BACKLOG ID |
|---|---|---|
| HQFinanceScreen | 수익/비용/이익률 DB 소스 없음, 완전 하드코딩 | HQ-FINANCE-001 |
| GrowthCompare | HQ_GR_DATA 완전 하드코딩, growth_surveys 집계 복잡 | HQ-GROWTH-001 |
| Performance | usePerformanceData는 sam_standards만 fetch, 성과 데이터 모두 하드코딩 | HQ-PERFORMANCE-001 |
| DashboardInteractive | 801줄, 0 store imports, path="hq/interactive" 연결됨 | HQ-DASHBOARD-INTERACTIVE-001 |

---

## 발견된 DB 실태

| 항목 | 실제 상태 | 조치 |
|---|---|---|
| `employees.job_type` | 'admin'/'worker' 2종만 존재 | HQ-EMP-TYPE-001 BACKLOG |
| `branches` 테이블 | code/name/lat/lng/radius만 있음 (지점장·수확량 없음) | HQ-BRANCHES-META-001 BACKLOG |
| `notices` 테이블 | id/title/body/priority/created_by/created_at/author_team만 있음 | HQ-NOTICES-META-001 BACKLOG |
| `issues` 데이터 | 2건, 모두 is_resolved=true → openIssues.length = 0 | 정상 (데이터 부재) |
| `notices` 데이터 | 2건 | 정상 (데이터 부재) |

---

## 커밋 해시 (세션 22)

| 해시 | 설명 |
|---|---|
| `feb589b` | HQEmployeesScreen + HQApprovalsScreen 실데이터 재연결 |
| `153d49c` | HQ Dashboard 실데이터 재연결 |
| `dcce220` | HQBranchesScreen 실데이터 재연결 |
| `0951389` | HQNoticesScreen 실데이터 재연결 |

---

## 등록된 BACKLOG (세션 22)

| ID | 요약 |
|---|---|
| HQ-EMP-TYPE-001 | 고용형태 필터 DB 컬럼 없음 |
| HQ-EMP-SEARCH-001 | 검색창 span→input 교체 필요 (목업 수정 에스컬레이션) |
| HQ-EMP-CSV-001 | CSV 내보내기 미구현 |
| HQ-EMP-ADD-001 | HQ 직원 추가 모달 미연결 |
| HQ-BRANCHES-META-001 | 지점 카드 상세 정보 DB 미지원 |
| HQ-NOTICES-META-001 | 공지 열람률/만료일/대상 DB 미지원 |
| HQ-FINANCE-001 | 경영 지표 전체 DB 소스 없음 |
| HQ-GROWTH-001 | GrowthCompare 실데이터 연결 이월 |
| HQ-PERFORMANCE-001 | Performance 실데이터 전면 교체 이월 |
| HQ-DASHBOARD-INTERACTIVE-001 | DashboardInteractive 연결 이월 |
| RECONNECT-OTHERS-001 | 5/9 partial 업데이트 |

---

## 다음 세션 시작점

**후보 A — HQ 이월 4개 페이지 처리:**
- HQFinanceScreen: 재무 DB 트랙 신설 또는 wontfix 결정 필요 (박민식·김민국 도메인 답변 대기)
- GrowthCompare + Performance: growth_surveys/daily_work_logs 집계 쿼리 설계 필요
- DashboardInteractive: 단독 세션 처리 권장 (801줄)

**후보 B — 재배팀 _others.jsx 재연결 (원 RECONNECT-OTHERS-001 목표):**
- EmployeesScreen · LeaveScreen · TasksScreen 실데이터 연결
- 세션 21 핸드오버 기준 원 우선순위 2

세션 시작 전 CLAUDE.md 5번 절차 준수 (git log, BACKLOG, LESSONS 순독).
