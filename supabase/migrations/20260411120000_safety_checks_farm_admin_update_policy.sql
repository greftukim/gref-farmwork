-- ============================================================================
-- RLS-DEBT-018: safety_checks_authenticated_update 에 farm_admin 추가
-- 기존: is_master() OR hr_admin
-- 신규: 위 + farm_admin (본인 지점 worker 한정)
-- 작성일: 2026-04-11
-- ============================================================================

BEGIN;

DROP POLICY IF EXISTS "safety_checks_authenticated_update" ON public.safety_checks;

CREATE POLICY "safety_checks_authenticated_update"
ON public.safety_checks FOR UPDATE
TO authenticated
USING (
  public.is_master()
  OR public.current_employee_role() = 'hr_admin'
  OR (
    public.current_employee_role() = 'farm_admin'
    AND public.employee_branch(worker_id) = public.current_employee_branch()
  )
)
WITH CHECK (
  public.is_master()
  OR public.current_employee_role() = 'hr_admin'
  OR (
    public.current_employee_role() = 'farm_admin'
    AND public.employee_branch(worker_id) = public.current_employee_branch()
  )
);

-- 검증
DO $$
DECLARE
  policy_count INT;
BEGIN
  SELECT COUNT(*) INTO policy_count
  FROM pg_policy
  WHERE polrelid = 'safety_checks'::regclass
    AND polname = 'safety_checks_authenticated_update';
  IF policy_count != 1 THEN
    RAISE EXCEPTION 'safety_checks_authenticated_update 정책 수가 1이 아님: %', policy_count;
  END IF;
  RAISE NOTICE 'RLS-DEBT-018 수정 완료: farm_admin 본인 지점 UPDATE 허용';
END $$;

COMMIT;

-- ============================================================================
-- 롤백 SQL
-- ============================================================================
/*
BEGIN;

DROP POLICY IF EXISTS "safety_checks_authenticated_update" ON public.safety_checks;

CREATE POLICY "safety_checks_authenticated_update"
ON public.safety_checks FOR UPDATE
TO authenticated
USING (
  public.is_master()
  OR (public.current_employee_role() = 'hr_admin')
)
WITH CHECK (
  public.is_master()
  OR (public.current_employee_role() = 'hr_admin')
);

COMMIT;
*/
