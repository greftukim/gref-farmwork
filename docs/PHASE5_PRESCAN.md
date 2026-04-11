# Phase 5 선행 조사 결과

> 조사 일자: 2026-04-11  
> 목적: E-6(반장 승인 플로우) 설계 결정 6개 확정을 위한 인프라 현황 파악  
> 제약: 코드 수정 0, 읽기 전용

---

## 1. 권한 헬퍼

### 현황

**`src/stores/authStore.js`**

| 로그인 경로 | select 컬럼 | is_team_leader 포함 여부 |
|---|---|---|
| 관리자 (`login`) | `select('*')` — employees 전체 | ✅ DB에 컬럼 존재 시 자동 fetch |
| 작업자 (`loginWithDeviceToken`) | 명시적 컬럼 목록 (10개) | ❌ **미포함** |

작업자 로그인(line 108):
```js
.select('id, name, role, branch, is_active, device_token, auth_user_id, job_type, work_start_time, work_end_time')
```
`is_team_leader` 가 목록에 없으므로 `currentUser`에 해당 필드가 없음.

---

**`src/lib/permissions.js`**

노출된 헬퍼 함수 전체 목록:

| 함수 | 검사 조건 |
|---|---|
| `isFarmAdmin(user)` | role === 'farm_admin' |
| `isAdminLevel(user)` | ADMIN_ROLES 포함 여부 |
| `canViewAllBranches(user)` | ALL_BRANCH_ROLES 포함 여부 |
| `canWrite(user)` | WRITE_ROLES 포함 여부 |
| `canHrCrud(user)` | HR_CRUD_ROLES 포함 여부 |
| `isSupervisor(user)` | role === 'supervisor' |
| `isMaster(user)` | role === 'master' |

**`isTeamLeader` 또는 `is_team_leader` 관련 헬퍼: 존재하지 않음.**  
ROLES 상수에도 `TEAM_LEADER` 항목 없음.

### is_team_leader 지원 상태

- DB 컬럼 존재 가능성: `employees` 테이블에 있을 것으로 추정 (E-1 스키마에서 추가됨)
- 프론트엔드 인식: **미지원** — 작업자 로그인 select에서 누락, 헬퍼 함수 없음
- `currentUser.isTeamLeader` 값: 항상 `undefined` (snakeToCamel 변환 후에도 fetch 자체가 안됨)

### 필요 작업

1. `loginWithDeviceToken` select에 `is_team_leader` 추가
2. `permissions.js`에 `isTeamLeader(user)` 헬퍼 추가
3. (선택) `revalidateWorkerToken` select에도 동일 추가

---

## 2. 라우팅

### 현재 구조

```
/login
/auth
/admin  ← ProtectedRoute(ADMIN_ROLES: farm_admin, hr_admin, supervisor, master)
  ├── index           → AdminDashboard
  ├── employees       → EmployeesPage
  ├── attendance      → AttendancePage
  ├── leave-approval  → LeaveApprovalRoute (farm_admin이면 승인, 아니면 상태조회)
  ├── overtime-approval → OvertimeApprovalPage
  ├── safety-checks   → SafetyChecksPage
  └── ... (총 22개 하위 라우트)
/worker  ← ProtectedRoute(['worker'])
  ├── index     → WorkerHome
  ├── tasks     → WorkerTasksPage
  ├── attendance → WorkerAttendancePage
  └── ... (총 9개 하위 라우트)
```

**핵심 제약**: `ProtectedRoute`는 `allowedRoles`를 `currentUser.role`로만 검사  
→ 반장(role='worker', is_team_leader=true)은 **현재 /worker에만 접근 가능**, /admin 접근 불가

### AdminLayout 사이드바/탭

`AdminLayout.jsx` 존재. FCM 초기화 3단계(서비스워커→권한요청→포그라운드 수신)를 담당.  
사이드바 nav 상세 항목은 별도 Sidebar 컴포넌트에 위임 (AdminLayout 자체에 하드코딩 없음).

### 반장 대시보드 권장 위치: **(c) WorkerHome 내 조건부 섹션**

| 옵션 | 분석 |
|---|---|
| (a) `/team-leader` 별도 라우트 | ProtectedRoute 확장 필요, WorkerLayout 복제 또는 공용화 필요. 과잉 구조. |
| (b) `/admin` 하위 탭 | role='worker' 는 ADMIN_ROLES에 없으므로 접근 자체 차단. ProtectedRoute 우회 필요 → 보안 설계 훼손. |
| **(c) WorkerHome 조건부 섹션** | **role='worker' + isTeamLeader=true** 조건만 추가하면 됨. 기존 WorkerLayout/WorkerHome 재사용. 라우트 추가 0. LeaveApprovalRoute처럼 역할에 따라 다른 UI를 같은 라우트에서 렌더링하는 기존 패턴과 일치. |

---

## 3. FCM

### 현재 함수 (`src/lib/pushNotify.js`)

| 함수 | 대상 | edge function 파라미터 |
|---|---|---|
| `sendPushToAdmins` | 관리자 전체 | `targetRole: 'admin'` |
| `sendPushToWorkers` | 작업자 (지점/직무 필터 가능) | `targetRole: 'worker'`, `targetBranch?`, `targetJobType?` |
| `sendPushToEmployee` | 특정 직원 1명 | `targetEmployeeId` |

### 토큰 저장 위치

`src/lib/firebase.js` 기준: **`fcm_tokens` 별도 테이블**  
저장 구조: `{ employee_id, token, device_info, updated_at }`  
(employees.fcm_token 컬럼 방식 아님)

### 백그라운드 푸시 상태

AdminLayout에서 `onForegroundMessage()` 등록 확인. 백그라운드 수신은 Service Worker에서 처리되어야 하나, 별도 구현 흔적 없음 → **포그라운드 전용 동작 중** (인수인계 메모 내용과 일치).

### `sendPushToTeamLeader(teamLeaderId, branch)` 추가 난이도: **하**

반장은 개인 단위로 FCM 토큰이 등록되므로 `sendPushToEmployee` 를 그대로 재사용 가능:

```js
// 신규 함수 추가 예시 (E-6 구현 시)
export async function sendPushToTeamLeader({ teamLeaderId, title, body, type = 'tbm_approval' }) {
  return sendPushToEmployee({ employeeId: teamLeaderId, title, body, type });
}
```

edge function(`send-push`) 수정 없이 클라이언트 래퍼만으로 충분.

---

## 4. RLS-DEBT-018

### 조회 결과

> ⚠️ **Supabase MCP 도구가 이 세션에서 사용 불가**  
> 아래 쿼리를 Supabase Dashboard → SQL Editor에서 직접 실행 필요:

```sql
SELECT polname, polroles::regrole[], polcmd, 
       pg_get_expr(polqual, polrelid) AS using_clause,
       pg_get_expr(polwithcheck, polrelid) AS check_clause
FROM pg_policy 
WHERE polrelid = 'safety_checks'::regclass
ORDER BY polname;
```

### 커밋 이력 기반 추정 (실측 대체)

E-5c 커밋(b08f1d0) 메시지: `"safety_checks anon self-update 정책 + confirmRisks 방어 코드"`  
E-1 커밋(e632d53): `"TBM v2 스키마"` — safety_checks 테이블 및 초기 RLS 정책 생성

CLAUDE.md 활성 백로그:
> **RLS-DEBT-018**: `safety_checks_team_leader_update` 정책 역할 오류 (E-6에서 수정)

### 문제점 추정

`safety_checks_team_leader_update` 정책의 `polroles`가 `{anon}` 으로 잘못 설정된 것으로 추정.  
반장이 safety_checks를 `UPDATE`(승인)하려면 해당 정책의 역할이 `authenticated`이어야 하나,  
E-5c에서 anon self-update 정책 추가 시 team_leader_update 정책도 anon으로 덮어쓰였을 가능성.

### 수정안 초안 (실측 후 확정 필요)

```sql
BEGIN;

-- 기존 정책 제거
DROP POLICY IF EXISTS safety_checks_team_leader_update ON safety_checks;

-- 재생성: authenticated 역할, 반장 본인 지점 작업자만 승인 가능
CREATE POLICY safety_checks_team_leader_update ON safety_checks
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM employees tl
      WHERE tl.auth_user_id = auth.uid()
        AND tl.is_team_leader = true
        AND tl.branch = (
          SELECT branch FROM employees w WHERE w.id = safety_checks.worker_id
        )
    )
  )
  WITH CHECK (
    status = 'approved'
    AND approved_by IS NOT NULL
  );

-- 검증
DO $$
BEGIN
  ASSERT (SELECT COUNT(*) FROM pg_policy 
          WHERE polrelid='safety_checks'::regclass 
          AND polname='safety_checks_team_leader_update'
          AND 'authenticated'::regrole = ANY(polroles)) = 1,
    'team_leader_update 정책 역할 검증 실패';
END $$;

COMMIT;
-- 롤백: DROP POLICY safety_checks_team_leader_update ON safety_checks; (재생성 전 상태로 복구)
```

---

## 5. 기존 승인 패턴

### 발견 여부: ✅ 3개 도메인에서 발견

| 도메인 | 파일 | 승인 함수 | DB 필드 | 특징 |
|---|---|---|---|---|
| 연차/휴가 | `leaveStore.js` | `farmReview(requestId, approved, reviewerId)` | `farm_reviewed_by`, `farm_reviewed_at`, `status` | 단건, pending→approved 직행 |
| 초과근무 | `overtimeStore.js` | `approveRequest`, `adjustAndApprove`, `bulkApprove` | `reviewed_by`, `reviewed_at`, `status` | 대량 승인(`bulkApprove`) + 조정+승인(`adjustAndApprove`) 패턴 |
| **안전점검** | `safetyCheckStore.js` | `approveChecks(checkIds, approverId)` | `approved_by`, `approved_at`, `status` | **배열 일괄 처리** + `status='submitted'` 전제조건 |

### E-6 참고 패턴: `safetyCheckStore.approveChecks` + `getPendingChecksForApproval`

```js
// safetyCheckStore.js:138 — 일괄 승인 (E-6 직접 재사용 가능)
approveChecks: async (checkIds, approverId) => {
  const { data, error } = await supabase
    .from('safety_checks')
    .update({ status: 'approved', approved_by: approverId, approved_at: new Date().toISOString() })
    .in('id', checkIds)
    .eq('status', 'submitted')  // 전제조건 guard
    .select('id');
  ...
  return (data || []).length;  // 실제 승인된 건수 반환
}

// safetyCheckStore.js:153 — 반장 지점별 대기 목록 조회 (E-6 직접 재사용 가능)
getPendingChecksForApproval: async (branch) => {
  // employees!inner 조인으로 지점 필터
  // status='submitted' + date=today + branch 조건
}
```

`approveChecks`는 이미 E-6 승인 핵심 로직으로 사용 가능. 별도 신규 함수 불필요.

---

## E-6 설계 결정 6개에 대한 사전 의견

### 1. 하드/소프트 게이트

**권장: 소프트 게이트**  
`getPendingChecksForApproval`이 이미 `status='submitted'` 필터를 가짐.  
반장이 미승인 상태에서 작업을 시작할 수 있도록 허용하되, WorkerTasksPage에서 "미승인 TBM 있음" 배너를 표시하는 방향이 현장 운용상 현실적.  
하드 게이트는 반장 본인의 TBM 처리 순서 문제(항목 5)와 충돌 가능.

### 2. 반장 UI 위치

**권장: (c) WorkerHome 내 조건부 섹션**  
`currentUser.isTeamLeader` 조건 추가만으로 구현 가능.  
별도 라우트 불필요, ProtectedRoute 수정 불필요.  
`LeaveApprovalRoute` 패턴(같은 경로에서 역할별 다른 컴포넌트 렌더링)을 WorkerHome 내부에서 적용.

### 3. FCM 알림

**권장: 구현 (난이도 하)**  
`sendPushToEmployee(teamLeaderId, ...)` 재사용으로 edge function 수정 없이 바로 추가 가능.  
작업자 TBM 제출 시(`savePreTaskCheck` 완료 후) 호출 포인트 1개.  
단, 백그라운드 푸시 미구현 상태이므로 반장이 앱을 열어둔 경우에만 즉시 수신 → "제출됨" 배지로 보완.

### 4. 반장 본인 TBM

**권장: 자기승인 불가 + 관리자 위임 승인**  
`approveChecks`에 `approved_by !== worker_id` 조건 추가.  
반장 자신의 TBM은 `SafetyChecksPage`(관리자)에서 승인하도록 플로우 분리.  
RLS-DEBT-018 수정 시 WITH CHECK에 자기승인 방지 조건도 포함.

### 5. 일괄 승인 UX

**권장: 체크박스 다중선택 + 일괄승인 버튼**  
`overtimeStore.bulkApprove` 패턴 참고. `approveChecks(checkIds[])` 가 이미 배열 처리를 지원.  
"전체 선택 → 승인" UX가 현장 반장의 실제 업무 흐름(아침 TBM 일괄 확인)과 일치.

### 6. 승인 취소

**권장: 미구현 (향후 백로그)**  
현재 leaveStore, overtimeStore, safetyCheckStore 모두 승인 취소 로직 없음.  
일관성 유지 차원에서 E-6 범위에서는 제외. UX-010(중도 닫기 재오픈)과 함께 UX 개선 단계에서 검토.

---

## 추가 발견 사항

| ID | 분류 | 내용 |
|---|---|---|
| BUG-005 | 작업자 로그인 | `loginWithDeviceToken` select에 `is_team_leader` 누락 — 반장 권한 판정 불가 원인 |
| UX-011 | FCM | 백그라운드 푸시 미구현으로 앱 닫힌 반장에게 알림 미전달 (알려진 제약, E-6 이후 대응) |
| ARCH-001 | permissions.js | `ROLES` 상수에 `TEAM_LEADER` 없음 — is_team_leader는 role이 아닌 flags 패턴 확인 필요 (DB 스키마 재확인) |
| DEBT-019 | RLS | RLS-DEBT-018 실측 전까지 team_leader_update 정책 실제 상태 미확인 — E-6 시작 전 SQL Editor 직접 확인 필수 |
