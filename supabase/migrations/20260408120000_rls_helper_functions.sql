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
