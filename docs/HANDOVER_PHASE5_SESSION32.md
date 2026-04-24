# Phase 5 세션 32 인수인계

날짜: 2026-04-24  
작업자: Claude Code (세션 32)  
세션 목적: 재배팀(farm_admin) 영역 버그 수정 — 세션 31 발견 이슈 6건 해소  
마지막 커밋: 94e62bc

---

## 세션 요약

세션 31에서 발견한 재배팀 이슈 중 6건을 수정.  
Playwright 회귀 18/18 PASS (hdkim farm_admin + jhkim HQ regression).  
**수정 6건, 신규 BACKLOG 3건, 교훈 57 추가.**

---

## 수정 내역

### Task 1 + 2: 대시보드 날짜/스케줄 하드코딩 제거 (FARM-DASH-DATE-001, FARM-DASH-SCHED-HARDCODE-001)

**파일:** `src/pages/admin/AdminDashboard.jsx`

- `useMemo` 2개 추가: `todayStr` (TopBar 날짜 문자열), `weekDays` (현재 주 7일 배열)
- TopBar `title={todayStr}` 동적 변경
- 스케줄 그리드 → `weekDays.map((day, i) => ...)` + `day.isToday`/`day.label` 사용
- **주의 (교훈 57):** 내부 `.map()` 잔류 `isToday` 참조 1건 발견 → 수동 제거. 런타임 에러 유발(ErrorBoundary 화면).

```jsx
const todayStr = useMemo(() => {
  const d = new Date();
  const wd = ['일','월','화','수','목','금','토'][d.getDay()];
  return `${d.getFullYear()}년 ${d.getMonth()+1}월 ${d.getDate()}일 ${wd}요일`;
}, []);

const weekDays = useMemo(() => {
  const today = new Date();
  const mondayOffset = (today.getDay() + 6) % 7;
  const monday = new Date(today);
  monday.setDate(today.getDate() - mondayOffset);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday); d.setDate(monday.getDate() + i);
    return { label: `${['월','화','수','목','금','토','일'][i]} ${d.getDate()}`, isToday: d.toDateString() === today.toDateString() };
  });
}, []);
```

---

### Task 3: 대시보드 버튼 onClick (FARM-DASH-BTN-001)

**파일:** `src/pages/admin/AdminDashboard.jsx`

| 버튼 | 처리 |
|------|------|
| 내보내기 | `() => alert('대시보드 내보내기 기능 준비 중입니다.')` |
| 새 작업 등록 | `() => navigate('/admin/tasks/new')` (기존 navigate 사용) |
| AI 적용하기 | `() => alert('AI 제안 적용 기능 준비 중입니다.')` |
| AI 자세히 | `() => alert('AI 제안 상세 기능 준비 중입니다.')` |

신규 BACKLOG: FARM-DASH-EXPORT-001, FARM-AI-APPLY-001, FARM-AI-DETAIL-001 (open, 별 트랙)

---

### Task 4: TaskPlanPage 작업 추가 버튼 (FARM-TASK-ADD-001)

**파일:** `src/pages/admin/TaskPlanPage.jsx`

- `useNavigate` + `btnPrimary` import 추가
- TopBar actions에 `btnPrimary('작업 추가', icons.plus, () => navigate('/admin/tasks/new'))` 연결
- 라우트: `/admin/tasks` (App.jsx:189 `path="tasks"`)

---

### Task 5: leaveStore branch 필터 (FARM-LEAVE-SCOPE-001)

**파일:** `src/stores/leaveStore.js`

```js
fetchRequests: async (currentUser) => {
  let query = supabase.from('leave_requests').select('*').order('created_at', { ascending: false });
  if (currentUser?.role === 'farm_admin' && currentUser?.branch) {
    const { data: branchEmps } = await supabase.from('employees').select('id').eq('branch', currentUser.branch);
    const empIds = (branchEmps || []).map(e => e.id);
    if (empIds.length > 0) query = query.in('employee_id', empIds);
  }
  const { data } = await query;
  if (data) set({ requests: data.map(snakeToCamel) });
},
```

부가 변경: `farmReview` 내부 전체 재조회(무필터) 코드 제거 → 로컬 state update로 충분.

---

### Task 6: taskStore/issueStore/attendanceStore branch 필터 + useDataLoader 업데이트 (FARM-TASK-SCOPE-001)

**패턴 (employeeStore 동일):**
- `fetchTasks(currentUser)` → `worker_id IN (busan 직원 IDs)`
- `fetchIssues(currentUser)` → `worker_id IN (busan 직원 IDs)`
- `fetchRecords(currentUser)` → `employee_id IN (busan 직원 IDs)`

**`src/hooks/useDataLoader.js`:**
```js
fetchRecords(currentUser);
fetchRequests(currentUser);
fetchTasks(currentUser);
fetchIssues(currentUser);
```

**HQ 안전성:** HQ 페이지는 `currentUser` 미전달 → 기존 전체 조회 유지 (regression PASS 확인).

---

## Playwright 회귀 결과

`scripts/regression_session32.cjs` — **18/18 PASS, 0 FAIL, 0 WARN**

| 검증 항목 | 결과 |
|-----------|------|
| hdkim 로그인 + 랜딩 /admin | PASS |
| 대시보드 날짜 "2026년 4월 24일 금요일" | PASS |
| 스케줄 그리드 "오늘" + "금 24" 뱃지 | PASS |
| 버튼 onClick alert (내보내기·AI 2개) | PASS ×3 |
| TaskPlanPage "작업 추가" + navigate | PASS ×2 |
| 휴가 신청 페이지 branch 필터 로드 | PASS |
| 이상 신고/근태 페이지 branch 필터 로드 | PASS ×2 |
| jhkim HQ 대시보드 + 전체 지점 scope 확인 | PASS ×2 |
| HQ 직원 목록 | PASS |
| HQ 휴가 승인 (scope 필터 미영향) | PASS |

---

## BACKLOG 변경

| 변경 | 항목 |
|------|------|
| resolved | FARM-DASH-DATE-001, FARM-DASH-SCHED-HARDCODE-001 |
| resolved | FARM-DASH-BTN-001, FARM-LEAVE-SCOPE-001 |
| resolved | FARM-TASK-SCOPE-001, FARM-TASK-ADD-001 |
| 신규 (P3 open) | FARM-DASH-EXPORT-001, FARM-AI-APPLY-001, FARM-AI-DETAIL-001 |

---

## 교훈

- 교훈 57: 중첩 클로저 변수 교체 시 잔류 참조 grep 확인 필수 (LESSONS_LEARNED.md)

---

## 다음 세션 후보 (세션 33)

| 우선순위 | 항목 |
|---------|------|
| P0 | 세션 33: mobile worker 전수조사 (390×844 viewport) |
| 또는 P2 | FARM-GROWTH-DB-001 (Growth DB 연결) |
| 또는 P2 | FARM-PERF-DATA-001 (Performance DB 연결) |

### 세션 33 (mobile worker) 준비 메모

- worker 계정: `SELECT username FROM employees WHERE role = 'worker' LIMIT 5`
- `/worker/*` 라우트: `src/App.jsx:239~` WorkerLayout
- 모바일 viewport: `{ width: 390, height: 844 }`
- worker는 auth_user_id = NULL 가능 (CURL-WORKER-SKIP-001, RLS-WORKER-ROLE-TEST-001 참조)
- worker 로그인: loginWithDeviceToken 또는 일반 form 확인 필요
