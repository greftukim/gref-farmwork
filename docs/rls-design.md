# GREF FarmWork RLS 재설계 문서

> **작업 식별자:** 작업 0-6 (RLS 전면 재설계)
> **작성일:** 2026-04-08
> **롤백 지점:** `pre-rls-redesign` 태그 (커밋 `e959ad9`)
> **선행 작업:** `pre-auth-migration` 이후의 Supabase Auth 이관 + role 기반 권한 재설계 (커밋 `74eeb37`)
> **현재 상태:** 파트 1 (설계) 완료. 파트 2 (테이블별 매트릭스 및 나머지 그룹 SQL) 미작성.

이 문서는 GREF FarmWork의 RLS(Row Level Security)를 프로토타입 단계의 "완전 공개"에서 역할 기반 접근 제어로 전환하는 작업의 설계 합의서다. 구현 전 모든 결정 사항을 고정하고, 실제 마이그레이션 SQL 작성의 기준으로 사용한다.

---

## 파트 1: 설계

### 1-A. 목표와 원칙

#### 배경

GREF FarmWork는 프로토타입 단계를 거치면서 모든 테이블에 `anon_full_access` / `anon_full_access_auth` 두 정책이 걸려 있는 상태다. 즉 로그인 여부와 무관하게 anon과 authenticated 양쪽 모두에게 모든 CRUD가 열려 있다. 2026-04-08 Supabase Auth 기반 관리자 인증 이관(커밋 `aa073ed`, `74eeb37`)을 마쳤으므로, 이제 이 "완전 공개" 상태를 청산하고 역할 기반 RLS로 전환할 때다.

#### 이번 작업의 목표

1. **관리자 데이터의 격리.** 인사 관련 테이블(`employees`, `attendance`, `leave_*`, `overtime_requests`)은 반드시 해당 역할만 접근할 수 있어야 한다. anon이 관리자 이메일, 연차 잔여, 근태 기록을 읽을 수 있는 현재 상태는 용납 불가.

2. **지점 격리 원칙.** `farm_admin`은 본인 지점(`busan`/`jinju`/`hadong`) 데이터에만 접근한다. 다른 지점의 직원·근태·작업을 보거나 수정할 수 없다.

3. **작업자 QR 로그인 흐름의 무결성 유지.** 작업자는 Supabase Auth를 쓰지 않고 `device_token`으로 로그인한다. 이 흐름은 anon role에서 작동하므로, `employees` 테이블에 anon SELECT를 어떤 형태로든 남겨두어야 한다. **이번 작업의 가장 까다로운 제약이다.**

4. **모든 정책은 역할 기반 SQL 헬퍼 함수로 통일.** 정책마다 `employees` 서브쿼리를 반복하는 대신 `current_employee_role()`, `current_employee_branch()` 같은 함수를 호출한다. 일관성과 유지보수성을 위해서다.

5. **점진적 적용.** 한 번에 16개 테이블을 모두 잠그지 않는다. 위험도 낮은 테이블부터 한 건씩 적용하고 기능 검증을 거친 뒤 다음 테이블로 넘어간다. 각 단계에 독립적인 롤백 경로가 있어야 한다.

#### 이번 작업의 비목표

- **완전한 보안 달성.** 이번 작업은 "프로토타입에서 벗어나는 첫 단계"이지 "운영 환경 준비"가 아니다. 아래 "허용되는 보안 부채" 참고.
- **QR 로그인 흐름 재설계.** `authStore.loginWithDeviceToken`의 구조 자체는 건드리지 않는다. Edge Function 이관은 별도 백로그 항목.
- **비밀번호 재설정 흐름 수정.** Site URL 설정 이슈는 이번 작업과 무관하므로 별도로 둔다.
- **감사 로그 테이블.** `audit_log` 신설 및 트리거 설치는 작업 L로 분리.
- **마스터 콘솔 UI.** 작업 M으로 분리.
- **Realtime publication 자체 재설정.** 이미 동작 중인 publication은 건드리지 않고, 정책이 publication과 호환되는지만 검증한다.

#### 허용되는 보안 부채 (명시적 타협)

**RLS-DEBT-001: 작업자 `device_token`의 anon 노출**

- **현상:** `authStore.loginWithDeviceToken`은 anon key로 `employees.device_token`을 WHERE 조건으로 쓴다. 이 흐름을 유지하려면 anon에게 `employees` SELECT 권한이 일부라도 있어야 한다.
- **결과:** 이번 작업 후에도 anon은 `employees` 중 `role='worker' AND is_active=true`인 행을 SELECT 할 수 있다.
- **완화 (이번 작업):** 관리자 행(`role IN ('farm_admin','hr_admin','supervisor','master')`)은 anon SELECT에서 **완전히 제외**한다. 그리고 `loginWithDeviceToken`의 `select('*')`를 필요한 컬럼만으로 축소하여 anon에 노출되는 필드를 실질적으로 줄인다.
- **해소 방법 (백로그):** 작업자 로그인을 Supabase Edge Function으로 이관한다. Edge Function이 service_role key로 `employees`를 조회하고 JWT를 발급하면, 클라이언트의 anon 직접 접근이 사라진다. 실사용 전환 준비 단계에서 수행한다.

**RLS-DEBT-002: 관리자 비밀번호가 전원 `rmfpvm001`**

- 이번 작업과 무관하지만 실사용 전 필수 변경 사항임을 재확인한다.

**RLS-DEBT-003: 감사 로그 없음**

- 관리자가 `attendance`, `employees`를 수정한 기록이 남지 않는다. 작업 L에서 해결.

**RLS-DEBT-004: `attendance` 범위 DELETE 애플리케이션 가드 부재**

- `attendanceStore.deleteRecords()`가 빈 파라미터로 호출되면 WHERE 없이 전체 삭제가 돼버린다. RLS가 farm_admin/hr_admin에는 자동 필터를 걸어주지만 master에서는 막지 않는다.
- **부분 완화 (F2 마이그레이션 적용):** `attendance_authenticated_delete` 정책으로 farm_admin=본인지점, hr_admin=전체 자동 필터. master만 앱 레벨 가드가 남아있다.
- 해결: `deleteRecords`에서 세 파라미터가 모두 없으면 throw 하도록 가드 추가. RLS 작업과 별개의 작은 코드 수정.

**RLS-DEBT-006: `zones` 테이블에 branch 컬럼 추가**

- 현재 zones는 `branch` 관련 컬럼이 전혀 없다. 부산LAB/진주/하동이 zones 테이블을 공유하는 상태다.
- 이번 작업에서는 zones를 전 지점 공용 마스터로 확정한다. 장기적으로 지점별 분리가 필요할 수 있다.

**RLS-DEBT-007: master 계정 자기 비활성화 방지**

- 현재 정책은 master가 본인 `is_active`를 false로 바꾸는 것을 막지 않는다. 앱 수준 또는 트리거 수준 가드 필요.

**RLS-DEBT-008: master 계정이 자기 role을 변경하는 것 방지**

- master가 본인 role을 다른 값으로 바꾸면 master가 영구적으로 사라질 수 있다. 애플리케이션 가드 필요.

**RLS-DEBT-009: employees UPDATE 시 `auth_user_id` 변경 방지**

- 현재 WITH CHECK에서 `auth_user_id` 변경을 막지 않는다. 본인이 자기 `auth_user_id`를 다른 값으로 바꾸면 자기 프로필 접근 불가 + 다른 사람 계정 연결 가능성.

#### 설계 원칙

1. **기본은 거부.** 정책이 없는 테이블은 RLS가 활성화된 순간 접근이 막힌다. `ENABLE ROW LEVEL SECURITY`는 정책과 반드시 한 쌍으로 적용한다.

2. **역할별 정책을 분리해서 작성.** `FOR ALL TO authenticated`로 뭉치지 않고, `FOR SELECT TO authenticated` + `FOR INSERT TO authenticated` + ... 형태로 쪼갠다. CRUD마다 조건이 달라질 수 있기 때문이다.

3. **`USING`과 `WITH CHECK`를 명확히 구분.** UPDATE 정책은 두 절 다 작성한다. `USING`은 "어떤 행을 업데이트 대상으로 볼 수 있는가", `WITH CHECK`는 "업데이트 후 결과가 정책을 통과하는가"다.

4. **anon 정책은 "안전망이 있는 단일 용도"로만 작성.** 범용 anon 정책은 금지. anon SELECT는 오직 QR 로그인 흐름 지원용이며, 그 목적에 필요한 최소 컬럼 필터만 허용한다.

5. **`auth.uid()` 직접 호출 금지.** 정책 내부에서는 반드시 `current_employee_id()` 등 헬퍼 함수를 호출한다.

6. **지점 격리 대상 테이블은 `branch` 또는 `employee_id`/`worker_id` → `employees.branch` 경로로 판단.**

7. **`hr_admin`, `supervisor`, `master`는 전 지점 접근.** 이 세 역할은 지점 필터를 적용하지 않는다. 헬퍼 함수 `can_view_all_branches()`로 판단한다.

8. **`supervisor`는 읽기 전용.** 어떤 정책에서도 `supervisor`에게 INSERT/UPDATE/DELETE를 허용하지 않는다.

9. **`master`는 모든 것에 접근 가능.** 사실상 superuser 역할.

#### 5개 역할 × 16개 테이블 개괄

| 역할 | 지점 접근 | 쓰기 | 인사 데이터 | 비고 |
|---|---|---|---|---|
| `worker` | 본인 지점만 (간접) | 본인 것만 | 본인 것만 | anon 경로 포함 |
| `farm_admin` | 본인 지점만 | 본인 지점만 | 본인 지점만 | 재배팀장 |
| `hr_admin` | 전 지점 | 전 지점 | 전 지점 | 인사팀 |
| `supervisor` | 전 지점 | ❌ 없음 | 전 지점 (읽기만) | 총괄/이사 |
| `master` | 전 지점 | 전 지점 | 전 지점 | superuser |
| `anon` (QR용) | — | 제한적 | worker 행만 | RLS-DEBT-001 |

---

### 1-B. 헬퍼 함수 SQL 명세

#### 함수 설계 방침

**왜 헬퍼 함수가 필요한가:** 정책마다 `employees` 서브쿼리를 반복하면 (1) 로직 변경 시 수십 군데를 동시에 고쳐야 하고, (2) 서브쿼리가 매 row 평가마다 실행되며, (3) 버그 발생 시 추적이 어렵다. 해결: 모든 정책 로직을 함수에 위임하고, 정책은 함수 호출만 한다.

**SECURITY DEFINER 필수:** `SECURITY INVOKER`(기본값)로 만들면, 함수가 `employees`를 조회할 때 호출자의 권한을 쓴다. 그런데 호출자가 anon이면 `employees`에 대한 정책이 적용되고, 그 정책이 헬퍼 함수를 다시 호출할 수 있다 → **무한 재귀**. `SECURITY DEFINER`로 만들면 함수가 소유자 권한으로 실행되므로 정책을 우회한다. 재귀 문제 없음. 단, `search_path`를 명시적으로 고정해야 한다 (`SET search_path = public, pg_temp`). 안 하면 PostgreSQL 보안 경고가 뜨고 실제로 권한 에스컬레이션 벡터가 된다.

**STABLE 선언:** 같은 쿼리 내에서 같은 입력에 대해 같은 결과를 반환한다고 약속 → PostgreSQL이 결과를 캐시 가능. 한 쿼리에서 `current_employee_role()`이 수천 번 호출돼도 실제 employees 조회는 1회.

**anon 맥락 처리:** 작업자 QR 로그인은 anon role이다. 이 경우 `auth.uid()` → NULL → `employees.auth_user_id` 매칭 실패 → 함수가 NULL 반환. 정책에서는 이 NULL을 명시적으로 처리해야 한다.

#### 마이그레이션 파일: `20260408120000_rls_helper_functions.sql`

```sql
-- ============================================================================
-- RLS 헬퍼 함수 설치
-- 작업 0-6 (RLS 전면 재설계) 1단계
-- 작성일: 2026-04-08
-- 롤백: pre-rls-redesign 태그
--
-- 이 마이그레이션은 테이블 정책을 건드리지 않는다.
-- 함수만 설치하므로 기존 동작에 영향 없음.
-- ============================================================================

-- 1. current_employee_id()
CREATE OR REPLACE FUNCTION public.current_employee_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT id
  FROM public.employees
  WHERE auth_user_id = auth.uid()
    AND is_active = true
  LIMIT 1;
$$;

COMMENT ON FUNCTION public.current_employee_id() IS
'RLS 헬퍼: 현재 로그인한 관리자의 employees.id 반환. anon이면 NULL.';

-- 2. current_employee_role()
CREATE OR REPLACE FUNCTION public.current_employee_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT role
  FROM public.employees
  WHERE auth_user_id = auth.uid()
    AND is_active = true
  LIMIT 1;
$$;

COMMENT ON FUNCTION public.current_employee_role() IS
'RLS 헬퍼: 현재 로그인한 관리자의 role 반환. anon이면 NULL.';

-- 3. current_employee_branch()
CREATE OR REPLACE FUNCTION public.current_employee_branch()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT branch
  FROM public.employees
  WHERE auth_user_id = auth.uid()
    AND is_active = true
  LIMIT 1;
$$;

COMMENT ON FUNCTION public.current_employee_branch() IS
'RLS 헬퍼: 현재 로그인한 관리자의 branch 반환. hr_admin/supervisor/master/anon은 NULL.';

-- 4. is_admin_level()
CREATE OR REPLACE FUNCTION public.is_admin_level()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.employees
    WHERE auth_user_id = auth.uid()
      AND is_active = true
      AND role IN ('farm_admin', 'hr_admin', 'supervisor', 'master')
  );
$$;

COMMENT ON FUNCTION public.is_admin_level() IS
'RLS 헬퍼: 현재 사용자가 관리자급(farm_admin/hr_admin/supervisor/master)인지.';

-- 5. can_view_all_branches()
CREATE OR REPLACE FUNCTION public.can_view_all_branches()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.employees
    WHERE auth_user_id = auth.uid()
      AND is_active = true
      AND role IN ('hr_admin', 'supervisor', 'master')
  );
$$;

COMMENT ON FUNCTION public.can_view_all_branches() IS
'RLS 헬퍼: 전 지점 데이터 조회 권한이 있는지 (hr_admin/supervisor/master).';

-- 6. can_write()
CREATE OR REPLACE FUNCTION public.can_write()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.employees
    WHERE auth_user_id = auth.uid()
      AND is_active = true
      AND role IN ('farm_admin', 'hr_admin', 'master')
  );
$$;

COMMENT ON FUNCTION public.can_write() IS
'RLS 헬퍼: 일반 관리 데이터에 쓰기 권한이 있는지 (farm_admin/hr_admin/master). supervisor 제외.';

-- 7. is_master()
CREATE OR REPLACE FUNCTION public.is_master()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.employees
    WHERE auth_user_id = auth.uid()
      AND is_active = true
      AND role = 'master'
  );
$$;

COMMENT ON FUNCTION public.is_master() IS
'RLS 헬퍼: 현재 사용자가 master 역할인지.';

-- 8. employee_branch(employee_uuid uuid)
CREATE OR REPLACE FUNCTION public.employee_branch(employee_uuid uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT branch
  FROM public.employees
  WHERE id = employee_uuid
  LIMIT 1;
$$;

COMMENT ON FUNCTION public.employee_branch(uuid) IS
'RLS 헬퍼: 주어진 employee_id의 branch 반환. employee_id/worker_id 기반 테이블의 지점 격리 정책용.';

-- 권한 부여
GRANT EXECUTE ON FUNCTION public.current_employee_id() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.current_employee_role() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.current_employee_branch() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin_level() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.can_view_all_branches() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.can_write() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_master() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.employee_branch(uuid) TO anon, authenticated;

-- ============================================================================
-- 설치 검증 쿼리 (실행 후 수동으로 돌려볼 것)
-- ============================================================================

-- 함수 목록 확인
-- SELECT proname, prosecdef, provolatile
-- FROM pg_proc
-- WHERE pronamespace = 'public'::regnamespace
--   AND proname IN (
--     'current_employee_id', 'current_employee_role', 'current_employee_branch',
--     'is_admin_level', 'can_view_all_branches', 'can_write', 'is_master', 'employee_branch'
--   )
-- ORDER BY proname;
-- 기대: 8개 함수, prosecdef=true (SECURITY DEFINER), provolatile='s' (STABLE)
```

#### 롤백 파일: `rollback_20260408120000_rls_helper_functions.sql`

```sql
-- ============================================================================
-- 롤백: RLS 헬퍼 함수 제거
-- ============================================================================

DROP FUNCTION IF EXISTS public.employee_branch(uuid);
DROP FUNCTION IF EXISTS public.is_master();
DROP FUNCTION IF EXISTS public.can_write();
DROP FUNCTION IF EXISTS public.can_view_all_branches();
DROP FUNCTION IF EXISTS public.is_admin_level();
DROP FUNCTION IF EXISTS public.current_employee_branch();
DROP FUNCTION IF EXISTS public.current_employee_role();
DROP FUNCTION IF EXISTS public.current_employee_id();
```

---

### 1-C. 테이블 분류, 적용 순서, Realtime 처리

#### 테이블 전수 목록과 지점 경로

| # | 테이블 | 지점 경로 | 경유 컬럼 | 메모 |
|---|---|---|---|---|
| 1 | `branches` | 자기 자신 | `code` | 마스터 |
| 2 | `crops` | 없음 (전사 공용) | — | |
| 3 | `zones` | 없음 (전사 공용) | — | RLS-DEBT-006 |
| 4 | `notices` | 없음 (전사 공지) | `created_by` | |
| 5 | `schedules` | 간접 | `employee_id → employees.branch` | nullable |
| 6 | `tasks` | 간접 | `worker_id → employees.branch` | nullable |
| 7 | `growth_surveys` | 간접 | `worker_id → employees.branch` | nullable |
| 8 | `growth_survey_items` | 없음 (전사 공용) | `crop_id`만 | 설정 마스터 |
| 9 | `calls` | 간접 | `worker_id → employees.branch` | nullable |
| 10 | `issues` | 간접 | `worker_id → employees.branch` | nullable |
| 11 | `fcm_tokens` | 간접 | `employee_id → employees.branch` | |
| 12 | `leave_requests` | 간접 | `employee_id → employees.branch` | |
| 13 | `leave_balances` | 간접 | `employee_id → employees.branch` | |
| 14 | `overtime_requests` | 간접 | `employee_id → employees.branch` | |
| 15 | `attendance` | 간접 | `employee_id → employees.branch` | 범위 DELETE |
| 16 | `employees` | 직접 | `branch` | anon 경로 포함 |

**`worker_id`/`employee_id` NULL 처리 방침:** NULL 행은 "관리자가 만든 특정 지점 미귀속 데이터"로 취급. `can_view_all_branches()` 통과한 역할(hr_admin/supervisor/master)만 조회 가능. farm_admin과 worker는 NULL 행을 보지 못한다.

#### 6개 그룹 정의

**그룹 A: 공용 참조** (`branches`, `crops`, `zones`, `growth_survey_items`)
- SELECT: 모든 authenticated 허용
- INSERT/UPDATE: `can_write()` 통과
- DELETE: `branches`는 master 전용, 나머지는 미작성

**그룹 B: 공지** (`notices`)
- SELECT: 모든 authenticated 허용
- INSERT/UPDATE/DELETE: `can_write()` 통과

**그룹 C: 작업 데이터** (`schedules`, `tasks`, `growth_surveys`)
- SELECT: `can_view_all_branches()` OR (`farm_admin` AND 본인 지점 worker_id) OR (`worker` AND 본인 것) — worker 경로는 anon이므로 별도 처리
- INSERT/UPDATE/DELETE: 권한별 지점 필터

**그룹 D: 이벤트성** (`calls`, `issues`)
- SELECT: 본인 지점 worker들이 만든 것
- INSERT: worker가 본인 worker_id로만
- UPDATE: 본인 지점 관리자만 (is_confirmed, is_resolved 토글)
- DELETE: 미작성

**그룹 E: 시스템** (`fcm_tokens`)
- INSERT: 본인 employee_id로만
- SELECT/UPDATE/DELETE: 서버(service_role)만

**그룹 F: 인사 데이터** (`leave_requests`, `leave_balances`, `overtime_requests`, `attendance`, `employees`)
- 가장 민감. `attendance`와 `employees`는 별도 파일로 분리.

#### 마이그레이션 파일 분할 (9개 + 롤백 9개 = 18개)
supabase/migrations/
├── 20260408120000_rls_helper_functions.sql          # 1-B (헬퍼 함수만)
├── 20260408121000_rls_group_a_reference.sql          # branches, crops, zones, growth_survey_items
├── 20260408122000_rls_group_b_notices.sql            # notices
├── 20260408123000_rls_group_c_work_data.sql          # schedules, tasks, growth_surveys
├── 20260408124000_rls_group_d_events.sql             # calls, issues
├── 20260408125000_rls_group_e_system.sql             # fcm_tokens
├── 20260408126000_rls_group_f1_leave_overtime.sql    # leave_requests, leave_balances, overtime_requests
├── 20260408127000_rls_group_f2_attendance.sql        # attendance (단독 분리)
└── 20260408128000_rls_group_f3_employees.sql         # employees (단독 분리, 가장 위험)

각 파일마다 `rollback_<원본파일명>.sql` 짝.

#### 적용 순서와 게이트

1. **헬퍼 함수 설치** → 함수 8개 확인 + master 계정으로 호출 테스트
2. **그룹 A** → 로그인 후 지점/작물/구역 표시 확인, admin 수정 확인
3. **그룹 B** → 공지 목록·작성 확인
4. **그룹 C** → 작업자/관리자 양쪽에서 일정·작업·생육조사 표시 및 수정 범위 확인
5. **그룹 D** → 작업자 호출/이슈 작성 + 관리자 Realtime 수신 확인 (Realtime 회귀 포인트)
6. **그룹 E** → 푸시 토큰 저장 동작 확인
7. **그룹 F1** → 휴가·연장근무 신청/승인 지점 격리 확인
8. **그룹 F2** → 출퇴근 기록/엑셀/범위 DELETE 확인
9. **그룹 F3** → QR 로그인 + 관리자 로그인 + 직원 목록 지점 격리 확인

각 게이트에서 실패하면 해당 파일의 rollback을 실행하고 설계 수정. 다음 그룹 금지.

#### Realtime 처리 방침

Supabase Realtime은 RLS를 존중한다. 조건:
1. 테이블이 `supabase_realtime` publication에 포함됨
2. RLS 활성화됨
3. SELECT 정책 정의됨
4. 구독 클라이언트의 role이 SELECT 정책 통과

결론: 정책이 authenticated에 SELECT를 허용하면 Realtime도 자동으로 그 정책을 따른다. 별도 설정 불필요.

**그룹 D 적용 전 publication 확인 SQL:**

```sql
SELECT schemaname, tablename
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime'
  AND tablename IN ('tasks', 'calls', 'issues', 'overtime_requests');
```

기대: 4개 행 반환. 아니면 Realtime이 깨져 있다는 뜻 → 별도 이슈로 처리.

**Realtime 구독처 (코드 전수조사 결과):**
- `src/hooks/useRealtimeSubscriptions.js`: `tasks` (`*`), `calls` (INSERT), `issues` (INSERT)
- `src/stores/overtimeStore.js`: `overtime_requests` (`*`)

---

### 1-D. `employees` 테이블 특례 설계

`employees`는 이번 작업의 가장 복잡한 테이블. anon 경로 + 관리자 본인 프로필 + 지점 격리 + 직원 관리 페이지 + 엑셀 내보내기 + 비활성 계정 참조 무결성이 한 테이블에 공존.

#### 접근 경로 인벤토리

| # | 위치 | role | 필터 | select | 목적 |
|---|---|---|---|---|---|
| 1 | `authStore.js:23` | authenticated | `auth_user_id = <uid>` | `*` | 본인 프로필 로드 |
| 2 | `authStore.js:44` | anon | `id = <본인>` | `device_token, is_active` | 워커 토큰 재검증 |
| 3 | `authStore.js:80` | authenticated | `auth_user_id = <uid>` | `*` | 로그인 후 프로필 |
| 4 | `authStore.js:107` | **anon** | `device_token AND is_active` | **축소 예정** | QR 로그인 |
| 5 | `authStore.js:135` | anon | `id = <본인>` | `device_token` | 토큰 재검증 |
| 6 | `employeeStore.js:11` | authenticated | 없음 | `*` | 관리자 직원 목록 |
| 7 | `employeeStore.js:18` | authenticated | — | — | 직원 추가 |
| 8 | `employeeStore.js:26` | authenticated | `id = <대상>` | — | 직원 수정 |
| 9 | `employeeStore.js:35` | authenticated | `id = <대상>` | — | 비활성화 |
| 10 | `excelExport.js:128` | authenticated | `role = 'worker'` | 8개 컬럼 | 엑셀 출력 |

#### 접근 가능 매트릭스

| role | SELECT 범위 | INSERT | UPDATE | DELETE |
|---|---|---|---|---|
| `anon` | `role='worker' AND is_active=true` 행만 | ❌ | ❌ | ❌ |
| `worker` (authenticated 안 씀) | — | — | — | — |
| `farm_admin` | 본인 지점 직원 전체 + 본인 프로필 | 본인 지점 worker만 | 본인 지점 worker만 | ❌ |
| `hr_admin` | 전 직원 | 전 직원 | 전 직원 (master 제외) | ❌ |
| `supervisor` | 전 직원 (읽기만) | ❌ | ❌ | ❌ |
| `master` | 전 직원 | 전 직원 | 전 직원 | ❌ |

**설계 결정:**
- worker는 authenticated로 접근하지 않는다 (전부 anon 경로)
- DELETE는 아무도 못 한다 (참조 무결성 + 비활성 admin 2명 보존 + 프론트 부재)
- farm_admin은 관리자급 직원 수정 불가 (본인 지점 worker만)
- hr_admin은 master 수정 불가
- master는 자기 자신도 수정 가능 (단 RLS-DEBT-007, 008 가드 필요)

#### `loginWithDeviceToken` 코드 수정 (사전 작업)

정책 적용 전에 `src/stores/authStore.js`의 `loginWithDeviceToken`을 수정한다.

```javascript
// Before (line 107-111)
loginWithDeviceToken: async (token) => {
  const { data, error } = await supabase
    .from('employees')
    .select('*')
    .eq('device_token', token)
    .eq('is_active', true)
    .single();
```

```javascript
// After
loginWithDeviceToken: async (token) => {
  const { data, error } = await supabase
    .from('employees')
    .select('id, name, role, branch, is_active, device_token, auth_user_id, job_type, work_start_time, work_end_time')
    .eq('device_token', token)
    .eq('is_active', true)
    .single();
```

**제외한 컬럼:** `pin_code`, `phone`, `hire_date`, `annual_leave_days`, `emp_no`, `work_hours_per_week`, `password`, `created_at`, `username`

**사전 검증 grep:** UI에서 `currentUser.phone` 등을 직접 참조하는 코드가 있으면 깨진다.

```powershell
Get-ChildItem -Path src -Recurse -File -Include *.js,*.jsx | Select-String -Pattern "currentUser\.(phone|pinCode|hireDate|annualLeaveDays|empNo|workHoursPerWeek)"
```

나머지 `authStore` 접근 경로(initialize, login, revalidateWorkerToken)는 수정 없이 유지.

#### 마이그레이션 파일: `20260408128000_rls_group_f3_employees.sql`

```sql
-- ============================================================================
-- RLS Group F3: employees 테이블 정책
-- 작업 0-6 RLS 재설계의 마지막 단계 (최고 위험)
--
-- 전제:
--   - 20260408120000_rls_helper_functions.sql 적용 완료
--   - authStore.loginWithDeviceToken select 축소 적용 완료
--   - 관리자 7명 전원 auth_user_id 세팅 완료
-- ============================================================================

-- 기존 임시 정책 제거
DROP POLICY IF EXISTS anon_full_access ON public.employees;
DROP POLICY IF EXISTS anon_full_access_auth ON public.employees;

ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;

-- anon 정책: QR 로그인 지원
CREATE POLICY "employees_anon_qr_login"
ON public.employees
FOR SELECT
TO anon
USING (
  role = 'worker'
  AND is_active = true
);

COMMENT ON POLICY "employees_anon_qr_login" ON public.employees IS
'QR 로그인 지원: anon은 활성 worker 행만 조회 가능. 관리자 계정 전부 차단. RLS-DEBT-001 참조.';

-- authenticated SELECT
CREATE POLICY "employees_authenticated_select"
ON public.employees
FOR SELECT
TO authenticated
USING (
  auth_user_id = auth.uid()
  OR public.can_view_all_branches()
  OR (
    public.current_employee_role() = 'farm_admin'
    AND branch = public.current_employee_branch()
  )
);

COMMENT ON POLICY "employees_authenticated_select" ON public.employees IS
'authenticated SELECT: 본인 프로필 + 권한별 범위. farm_admin은 본인 지점만.';

-- authenticated INSERT
CREATE POLICY "employees_authenticated_insert"
ON public.employees
FOR INSERT
TO authenticated
WITH CHECK (
  public.current_employee_role() IN ('hr_admin', 'master')
  OR (
    public.current_employee_role() = 'farm_admin'
    AND branch = public.current_employee_branch()
    AND role = 'worker'
  )
);

COMMENT ON POLICY "employees_authenticated_insert" ON public.employees IS
'authenticated INSERT: hr_admin/master=전권, farm_admin=본인지점 worker만, supervisor=금지.';

-- authenticated UPDATE
CREATE POLICY "employees_authenticated_update"
ON public.employees
FOR UPDATE
TO authenticated
USING (
  auth_user_id = auth.uid()
  OR public.is_master()
  OR (
    public.current_employee_role() = 'hr_admin'
    AND role != 'master'
  )
  OR (
    public.current_employee_role() = 'farm_admin'
    AND branch = public.current_employee_branch()
    AND role = 'worker'
  )
)
WITH CHECK (
  (auth_user_id = auth.uid())
  OR public.is_master()
  OR (
    public.current_employee_role() = 'hr_admin'
    AND role != 'master'
  )
  OR (
    public.current_employee_role() = 'farm_admin'
    AND branch = public.current_employee_branch()
    AND role = 'worker'
  )
);

COMMENT ON POLICY "employees_authenticated_update" ON public.employees IS
'authenticated UPDATE: 본인+권한별. hr_admin은 master 불가침, farm_admin은 본인지점 worker만.';

-- DELETE 정책 없음 (기본 거부)

-- ============================================================================
-- 검증 쿼리 (주석 처리)
-- ============================================================================

-- 정책 목록 확인
-- SELECT policyname, cmd, roles, qual, with_check
-- FROM pg_policies
-- WHERE schemaname = 'public' AND tablename = 'employees'
-- ORDER BY policyname;
-- 기대: 4개 정책

-- RLS 활성화 확인
-- SELECT relname, relrowsecurity
-- FROM pg_class
-- WHERE relname = 'employees';
-- 기대: relrowsecurity = true
```

#### 롤백 파일: `rollback_20260408128000_rls_group_f3_employees.sql`

```sql
-- ============================================================================
-- 롤백: employees RLS 정책 제거 + 임시 정책 복원
-- ============================================================================

DROP POLICY IF EXISTS "employees_anon_qr_login" ON public.employees;
DROP POLICY IF EXISTS "employees_authenticated_select" ON public.employees;
DROP POLICY IF EXISTS "employees_authenticated_insert" ON public.employees;
DROP POLICY IF EXISTS "employees_authenticated_update" ON public.employees;

CREATE POLICY anon_full_access ON public.employees
  FOR ALL TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY anon_full_access_auth ON public.employees
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);
```

#### 검증 체크리스트 (17개)

**기능 테스트**

- [CHECK 1] master 로그인 (`greftukim@gmail.com`) → 프로필 로드 → `currentUser.role === 'master'`
- [CHECK 2] farm_admin 로그인 (`farm_busan@gref.local`) → `role === 'farm_admin'` AND `branch === 'busan'`
- [CHECK 3] hr_admin 로그인 (`hr_admin@gref.local`) → 프로필 로드
- [CHECK 4] supervisor 로그인 (`supervisor1@gref.local`) → 프로필 로드
- [CHECK 5] 작업자 QR 로그인 → `currentUser`에 `name, role='worker', branch, jobType, workStartTime, workEndTime` 존재, `phone`/`pinCode`는 undefined

**권한 격리 테스트**

- [CHECK 6] master → 직원 관리: 전 직원 9명 표시 (비활성 2명 포함)
- [CHECK 7] hr_admin → 직원 관리: 전 직원 표시, master 수정 시도 실패, worker 수정 성공
- [CHECK 8] supervisor → 직원 관리: 전 직원 표시, 어떤 수정도 실패
- [CHECK 9] farm_busan → 직원 관리: busan 소속만 + 본인
- [CHECK 10] farm_busan → busan worker 수정 성공, busan farm_admin 수정 실패, jinju worker 수정 실패
- [CHECK 11] farm_busan → busan worker 추가 성공, jinju worker 추가 실패, farm_admin 추가 실패
- [CHECK 12] QR 로그인 상태에서 콘솔: `supabase.from('employees').select('*').eq('role', 'master')` → 빈 배열
- [CHECK 13] master → 월별 근태기록부 엑셀: 전 지점 worker 포함
- [CHECK 14] farm_busan → 월별 근태기록부 엑셀: busan worker만 포함 (RLS 자동 필터)
- [CHECK 15] 브라우저 새로고침 → 세션 복원 → 프로필 재로드
- [CHECK 16] 로그아웃 → 재로그인 흐름 전 역할에서 확인
- [CHECK 17] hr_admin → 본인 계정 role을 'master'로 변경 시도 → UPDATE 실패 (WITH CHECK `role != 'master'`)

#### 주요 리스크와 완화책

**리스크 1:** 관리자 중 `auth_user_id`가 세팅되지 않은 사람 → 로그인 후 빈 화면.

```sql
-- 사전 확인
SELECT email, auth_user_id FROM auth.users
FULL OUTER JOIN employees ON employees.auth_user_id = auth.users.id
WHERE employees.role IN ('farm_admin', 'hr_admin', 'supervisor', 'master');
```

**리스크 2:** farm_admin의 branch가 NULL이면 정책 불성립.

```sql
SELECT email, role, branch FROM employees WHERE role = 'farm_admin';
```

**리스크 3:** `loginWithDeviceToken` select 축소로 다른 코드가 깨짐. 위 grep으로 사전 확인.

**리스크 4:** RLS 적용 순간 진행 중 쿼리 실패. 트래픽 적은 시간에 실행.

**리스크 5:** `auth_user_id` UNIQUE 제약 충돌. 프론트 폼이 이 필드를 노출하지 않는지 확인.

#### 작업 순서 요약

1. 1-B 헬퍼 함수 설치 완료
2. 그룹 A~F2 마이그레이션 완료
3. 앱 기능 전반 정상 동작 확인
4. 관리자 7명 `auth_user_id` 세팅 재확인 (리스크 1)
5. `currentUser.phone` 등 참조 grep (리스크 3)
6. `authStore.loginWithDeviceToken` select 축소 커밋
7. 앱 빌드 및 배포 → QR 로그인 정상 동작 확인
8. employees 정책 마이그레이션 실행
9. 1-D 체크리스트 17개 실행
10. 모두 통과 시 작업 0-6 완료

---

## 파트 2: 테이블별 상세 매트릭스 및 나머지 그룹 SQL

> **작성일:** 2026-04-09
> **상태:** 완료. 18개 파일 전부 생성.

### 2-A. 파트 1 설계 보완 사항 (파트 2 작성 과정에서 확정)

**누락 발견 1: 그룹 A anon SELECT**
- 파트 1은 그룹 A(branches/crops/zones/growth_survey_items) SELECT를 "모든 authenticated"로만 정의했으나, 작업자(anon)가 이 테이블들을 필요로 함.
  - `cropMap[cropId].name`: WorkerTasksPage 작업 목록 작물명
  - `zones`: 출퇴근 GPS 검증
  - `growth_survey_items`: GrowthSurveyPage 폼
- **결정:** 그룹 A 4개 테이블 전부 `FOR SELECT TO anon USING (true)` 추가.
- **근거:** 전사 공용 마스터 데이터이며 민감 정보 없음.

**누락 발견 2: notices anon SELECT**
- WorkerNoticePage가 notices를 읽으므로 anon SELECT 필요.
- **결정:** `FOR SELECT TO anon USING (true)` 추가.

**Q3 (calls/issues anon INSERT) 결정:**
- 옵션 A 채택: `EXISTS` 검증 패턴 + 상태 컬럼 false 강제.
- `calls_anon_insert`: `worker_id IS NOT NULL AND EXISTS(활성 worker) AND is_confirmed=false`
- `issues_anon_insert`: `worker_id IS NOT NULL AND EXISTS(활성 worker) AND is_resolved=false`
- **RLS-DEBT-010 신설:** anon INSERT 시 worker_id 본인 검증 부재 → Edge Function 이관 시 해소.
- **RLS-DEBT-011 신설:** 작업자 간 task 교차 수정 가능 (tasks_anon_update_status USING이 worker_id 귀속 확인만 하고 본인 여부를 확인하지 않음). status IN 화이트리스트 추가로 부분 완화. Edge Function 이관 시 해소.
- **RLS-DEBT-012 신설:** 작업자가 다른 작업자의 미완료 출근 기록에 퇴근 대신 찍기 가능 (attendance_anon_update USING이 employee_id 귀속 확인만 하고 본인 여부를 확인하지 않음). date=±1일+check_out IS NULL 제약 추가로 부분 완화. Edge Function 이관 시 해소.
- **RLS-DEBT-013 신설:** 작업자가 다른 worker_id로 휴가/연장근무 요청 제출 가능 (leave_requests/overtime_requests anon INSERT가 EXISTS 검증만 하고 본인 여부를 확인하지 않음). 관리자 승인 단계에서 발각 가능하므로 심각도 낮음. Edge Function 이관 시 해소.
- **RLS-DEBT-014 신설:** attendance.date 컬럼이 UTC 기준으로 저장되는 상태에서 정책의 타임존 변환 제약은 KST 아침 시간대 출근에서 불일치가 발생한다. ±1일 범위로 완화하여 모든 경계 시간을 수용한다. 근본 해결은 date 컬럼을 KST 기준으로 마이그레이션하거나, 날짜 판단 자체를 SECURITY DEFINER 서버 함수로 이관하는 것.

**Q4 (fcm_tokens) 결론:**
- `pushNotify.js`: `supabase.functions.invoke('send-push')` → Edge Function → service_role → 클라이언트 SELECT 불필요.
- `firebase.js saveTokenToSupabase`: 클라이언트 직접 SELECT + UPDATE + INSERT (anon + authenticated 양쪽).
- **결정:** anon + authenticated 양쪽에 SELECT/INSERT/UPDATE 정책 필요. EXISTS 검증 패턴 동일 적용.

### 2-B. 전체 CRUD 매트릭스

| 테이블 | anon SELECT | anon INSERT | anon UPDATE | auth SELECT | auth INSERT | auth UPDATE | auth DELETE |
|---|---|---|---|---|---|---|---|
| branches | ✅ true | ❌ | ❌ | admin_level | can_write | can_write | master |
| crops | ✅ true | ❌ | ❌ | admin_level | can_write | can_write | ❌ |
| zones | ✅ true | ❌ | ❌ | admin_level | can_write | can_write | ❌ |
| growth_survey_items | ✅ true | ❌ | ❌ | admin_level | can_write | can_write | ❌ |
| notices | ✅ true | ❌ | ❌ | admin_level | can_write+본인 | can_write+본인 | can_write+본인 |
| schedules | worker귀속 | ❌ | ❌ | 지점필터 | 지점필터 | 지점필터 | 지점필터 |
| tasks | worker귀속 | ❌ | 상태변경 | 지점필터 | 지점필터 | 지점필터 | 지점필터 |
| growth_surveys | worker귀속 | worker귀속 | ❌ | 지점필터 | 지점필터 | 지점필터 | ❌ |
| calls | worker귀속 | EXISTS+false | ❌ | 지점필터 | ❌ | 지점필터(확인) | ❌ |
| issues | worker귀속 | EXISTS+false | ❌ | 지점필터 | ❌ | 지점필터(해결) | ❌ |
| fcm_tokens | worker귀속 | worker EXISTS | worker EXISTS | 본인만 | 본인만 | 본인만 | ❌ |
| leave_requests | worker귀속 | EXISTS+pending | ❌ | 지점필터 | ❌ | farm+master | ❌ |
| leave_balances | worker귀속 | ❌ | ❌ | 지점필터 | hr+master | 지점필터 | ❌ |
| overtime_requests | worker귀속 | EXISTS+pending | ❌ | 지점필터 | ❌ | farm+master | ❌ |
| attendance | worker귀속 | EXISTS+null_out | EXISTS | 지점필터 | ❌ | 지점필터 | 지점필터 |
| employees | role=worker | ❌ | ❌ | 역할별 | 역할별 | 역할별 | ❌ |

**범례:**
- `worker귀속` = `EXISTS(employees WHERE id=worker_id AND role='worker' AND is_active=true)`
- `지점필터` = `can_view_all_branches() OR (farm_admin AND 본인지점)`
- `farm+master` = farm_admin(본인지점) + master
- `hr+master` = hr_admin + master

### 2-C. 생성된 파일 목록

```
supabase/migrations/
├── 20260408120000_rls_helper_functions.sql         ← 파트 1 설계 → 파일화
├── rollback_20260408120000_rls_helper_functions.sql
├── 20260408121000_rls_group_a_reference.sql        ← 파트 2 신규
├── rollback_20260408121000_rls_group_a_reference.sql
├── 20260408122000_rls_group_b_notices.sql
├── rollback_20260408122000_rls_group_b_notices.sql
├── 20260408123000_rls_group_c_work_data.sql
├── rollback_20260408123000_rls_group_c_work_data.sql
├── 20260408124000_rls_group_d_events.sql
├── rollback_20260408124000_rls_group_d_events.sql
├── 20260408125000_rls_group_e_system.sql
├── rollback_20260408125000_rls_group_e_system.sql
├── 20260408126000_rls_group_f1_leave_overtime.sql
├── rollback_20260408126000_rls_group_f1_leave_overtime.sql
├── 20260408127000_rls_group_f2_attendance.sql
├── rollback_20260408127000_rls_group_f2_attendance.sql
├── 20260408128000_rls_group_f3_employees.sql       ← 파트 1 설계 → 파일화
└── rollback_20260408128000_rls_group_f3_employees.sql
```

### 2-D. 적용 전 사전 작업 체크리스트

1. **`loginWithDeviceToken` select 축소 (파트 1 설계):**
   ```javascript
   // authStore.js — 현재 select('*') → 아래로 교체
   .select('id, name, role, branch, is_active, device_token, auth_user_id, job_type, work_start_time, work_end_time')
   ```
   사전 grep: `currentUser\.(phone|pinCode|hireDate|annualLeaveDays|empNo|workHoursPerWeek)` — 있으면 수정 필요.

2. **관리자 7명 `auth_user_id` 확인:**
   ```sql
   SELECT name, role, branch, auth_user_id IS NOT NULL AS linked
   FROM employees
   WHERE role IN ('farm_admin', 'hr_admin', 'supervisor', 'master');
   ```

3. **Realtime publication 확인 (그룹 D 적용 전):**
   ```sql
   SELECT tablename FROM pg_publication_tables
   WHERE pubname = 'supabase_realtime'
     AND tablename IN ('tasks', 'calls', 'issues', 'overtime_requests');
   -- 기대: 4개 행
   ```

### 2-E. 검증 게이트 요약

각 그룹 적용 후 실패 시 해당 rollback 파일 즉시 실행.

| 게이트 | 파일 | 핵심 확인 항목 |
|---|---|---|
| G0 | 120000 헬퍼 함수 | 함수 8개 존재 + SECURITY DEFINER |
| G1 | 121000 그룹 A | 로그인 후 지점/작물 표시 정상, 작업자 작물명 표시 |
| G2 | 122000 그룹 B | 공지 목록 관리자+작업자 양쪽 정상 |
| G3 | 123000 그룹 C | 작업자 작업목록, 관리자 지점 필터, Realtime tasks |
| G4 | 124000 그룹 D | 작업자 호출/이슈 생성, 관리자 Realtime 수신 |
| G5 | 125000 그룹 E | 관리자/작업자 푸시 토큰 저장 |
| G6 | 126000 그룹 F1 | 휴가/연장 신청, farm_admin 승인, hr_admin 조회 |
| G7 | 127000 그룹 F2 | 출퇴근 QR, 엑셀 다운로드 지점 필터 |
| G8 | 128000 그룹 F3 | QR 로그인, 관리자 직원 목록 지점 격리 |

---

## 부록 A: 백로그 보안 부채 목록

| ID | 내용 | 상태 | 해결 방법 |
|---|---|---|---|
| RLS-DEBT-001 | 작업자 device_token anon 노출 | 완화됨 (축소) | Edge Function 이관 |
| RLS-DEBT-002 | 관리자 비밀번호 공통 | 미해결 | 실사용 전 변경 |
| RLS-DEBT-003 | 감사 로그 없음 | 미해결 | 작업 L (audit_log) |
| RLS-DEBT-004 | attendance 범위 DELETE 가드 부재 | 부분 완화 (farm_admin/hr_admin 해소, master 앱 레벨 가드 필요) | `deleteRecords` master 가드 추가 |
| RLS-DEBT-005 | (결번) | — | 이번 작업에 통합됨 |
| RLS-DEBT-006 | zones에 branch 컬럼 없음 | 미해결 | 스키마 변경 + 마이그레이션 |
| RLS-DEBT-007 | master 자기 비활성화 가드 없음 | 미해결 | 앱/트리거 가드 |
| RLS-DEBT-008 | master 자기 role 변경 가드 없음 | 미해결 | 앱/트리거 가드 |
| RLS-DEBT-009 | employees UPDATE 시 auth_user_id 변경 가드 없음 | 미해결 | WITH CHECK 강화 |
| RLS-DEBT-010 | anon INSERT 시 worker_id 본인 검증 부재 (calls/issues/attendance/leave_requests/overtime_requests/fcm_tokens) | 완화됨 (EXISTS 검증) | Edge Function 이관 |
| RLS-DEBT-011 | 작업자 간 task 교차 수정 가능 (tasks_anon_update_status 본인 확인 불가) | 부분 완화 (status IN 화이트리스트) | Edge Function 이관 |
| RLS-DEBT-012 | 작업자가 다른 작업자 미완료 출근 기록에 퇴근 대신 찍기 가능 (attendance_anon_update 본인 확인 불가) | 부분 완화 (date=오늘+check_out IS NULL 제약) | Edge Function 이관 |
| RLS-DEBT-013 | 작업자가 다른 worker_id로 휴가/연장근무 요청 제출 가능 | 완화됨 (관리자 승인 단계 발각, 심각도 낮음) | Edge Function 이관 |
| RLS-DEBT-014 | attendance.date가 UTC 기준이라 정확한 "오늘" 판정 불가 | 완화됨 (±1일 범위) | date 컬럼 KST 마이그레이션 또는 서버 함수 이관 |

---

## 부록 B: 확정된 설계 결정 요약

- 작업자는 authenticated로 접근하지 않는다 (전부 anon)
- worker는 본인 지점 접근 (간접 employee_id/worker_id)
- farm_admin은 본인 지점만 (엄격)
- hr_admin/supervisor/master는 전 지점
- supervisor는 읽기 전용 (모든 테이블)
- master는 superuser (단 자기 보호 가드 부재)
- NULL worker_id/employee_id 행은 `can_view_all_branches()` 역할만 조회
- DELETE는 `branches`(master 전용)와 `attendance`(범위) 외에는 원칙적 거부
- Realtime은 정책만으로 커버 (별도 publication 설정 없음)
- 헬퍼 함수 8개 (SECURITY DEFINER + STABLE + search_path 고정)
- 9개 마이그레이션 + 9개 롤백 파일
- 점진 적용 (그룹 A → F3) + 각 단계 수동 검증 게이트