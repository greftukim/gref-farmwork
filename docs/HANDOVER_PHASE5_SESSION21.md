# 세션 21 핸드오버 — Phase 5

**날짜:** 2026-04-22  
**세션:** Phase 5 Session 21  
**작업자:** greftukim (Claude Code 협업)

---

## 완료 범위

### AdminDashboard 실데이터 재연결

- `b93a5d4` 기준: 11개 store import, 4개 helper 함수, 11개 useMemo 블록 복원
- `7be8507` 기준: useState/useNavigate, handleApprove/handleReject, navigate onClick 6곳 복원
- `b88d033` 기준: currentUser?.id reviewer 파라미터, 에러 alert 복원
- fallback 하드코딩(taskRows / approvalRows / noticeRows) 제거 → 빈 상태 UI 교체

### 네비게이션 / 레이아웃 복원

- `Sidebar` (primitives.jsx): `onNavigate` prop 소비 + onClick 연결 (세션 21 이전 구버전은 prop 무시)
- 로그아웃 버튼: `div onClick` 연결 복원
- `HQSidebar` (hq-shell.jsx): `onNavigate` prop + 메뉴 onClick 신규 연결

### role 기반 분기

- LoginPage: `master` / `hr_admin` → `/admin/hq`, `farm_admin` 등 → `/admin`, `worker` → `/worker`
- LoginPage: `setTeam('hq' | 'farm')` 로그인 시점 즉시 호출 — useTeamStore persist 동기화

### 계정 표시 실데이터 바인딩

- Sidebar / HQSidebar 하단: `currentUser.name`, `currentUser.username(@표시)` 실데이터 표시
- employees 테이블에 email 컬럼 없음 → username으로 대체 (EMAIL-SKIP-001)

---

## 세션 20 대비 변경

| 항목 | 세션 20 | 세션 21 |
|---|---|---|
| AdminDashboard | 정적 목업 | 실데이터 + 기능 동작 |
| Sidebar 네비게이션 | 클릭 무반응 | handleNavigate → navigate 정상 |
| 로그아웃 | 클릭 무반응 | logout() + navigate('/login') |
| role 분기 | /admin 단일 경로 | role별 3갈래 분기 |
| 계정 표시 | "관리자" 고정 | currentUser.name/username |

---

## 커밋 해시 (세션 21 전체)

| 해시 | 설명 |
|---|---|
| `9de151b` | AdminDashboard 실데이터 재연결 (b93a5d4 기준) |
| `1d45c60` | AdminDashboard onClick 핸들러 복원 (7be8507 부분 이식) |
| `f2e18d0` | Sidebar 네비게이션 + 로그아웃 onClick 복원 |
| `45ee1b1` | 승인 후 store state 자동 갱신 + 에러 피드백 복원 |
| `20ae8f6` | 로그인 후 role 기반 리다이렉션 복원 |
| `3dea29e` | fallback 하드코딩 제거, 빈 상태 UI 표시 |
| `e7000f4` | role 분기 team store 동기화 + Sidebar/HQSidebar 실데이터 바인딩 |
| `0fc5a6d` | DEBUG 로그 제거 + 사이드바 username 표시 |

---

## 발견된 부채 (BACKLOG 등록 완료)

| ID | 요약 |
|---|---|
| EMAIL-SKIP-001 | employees.email 컬럼 미존재 → username 대체 (wontfix) |
| RECONNECT-OTHERS-001 | _others.jsx 실데이터 재연결 (우선순위 2) |
| PROTECTED-ROUTE-001 | role 기반 URL 직접 접근 차단 미구현 |
| DASHBOARD-PHASE2-001 | 주간 차트·스케줄 하드코딩 유지 중 |

---

## 발견된 교훈

| 번호 | 제목 |
|---|---|
| 교훈 49 | PWA Service Worker 캐시가 배포 반영을 막을 수 있음 |

---

## 다음 세션 시작점

**우선순위 2 — RECONNECT-OTHERS-001:**  
`src/pages/_others.jsx` 내 EmployeesScreen / LeaveScreen / TasksScreen 실데이터 재연결.  
- ScheduleScreen → `src/pages/admin/SchedulePage.jsx` 별도 존재, 제외  
- LoginScreen → `src/pages/LoginPage.jsx` 별도 존재, 제외  

세션 시작 전 CLAUDE.md 5번 절차 준수 (git log, BACKLOG, LESSONS 순독).
