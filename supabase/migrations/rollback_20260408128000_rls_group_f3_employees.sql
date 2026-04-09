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
