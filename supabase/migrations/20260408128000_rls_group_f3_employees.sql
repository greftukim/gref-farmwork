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
