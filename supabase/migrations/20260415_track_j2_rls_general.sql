-- ============================================================
-- Track J-2: RLS general role 추가
-- 세션 16 (2026-04-15)
-- 실행 환경: Supabase SQL Editor (이미 실행 완료 — 파일은 기록용)
-- ============================================================

-- ① 헬퍼 함수 갱신: is_admin_level() — general 추가
CREATE OR REPLACE FUNCTION public.is_admin_level()
RETURNS boolean LANGUAGE sql SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.employees
    WHERE auth_user_id = auth.uid()
      AND is_active = true
      AND role IN ('farm_admin', 'hr_admin', 'supervisor', 'master', 'general')
  );
$$;

-- ② 헬퍼 함수 갱신: can_view_all_branches() — general 추가
CREATE OR REPLACE FUNCTION public.can_view_all_branches()
RETURNS boolean LANGUAGE sql SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.employees
    WHERE auth_user_id = auth.uid()
      AND is_active = true
      AND role IN ('hr_admin', 'supervisor', 'master', 'general')
  );
$$;

-- ③ 정책 직접 수정: chat_logs_select_admin_all — general 추가
DROP POLICY IF EXISTS chat_logs_select_admin_all ON public.chat_logs;
CREATE POLICY chat_logs_select_admin_all ON public.chat_logs
  FOR SELECT TO authenticated
  USING (current_employee_role() = ANY (ARRAY['hr_admin', 'master', 'general']));

-- ④ 정책 직접 수정: safety_checks_authenticated_select — general 추가
DROP POLICY IF EXISTS safety_checks_authenticated_select ON public.safety_checks;
CREATE POLICY safety_checks_authenticated_select ON public.safety_checks
  FOR SELECT TO authenticated
  USING (
    is_master()
    OR (current_employee_role() = 'hr_admin')
    OR (current_employee_role() = 'general')
    OR (current_employee_role() = 'farm_admin' AND employee_branch(worker_id) = current_employee_branch())
  );

-- 정책 직접 수정: safety_check_results_authenticated_select — general 추가
DROP POLICY IF EXISTS safety_check_results_authenticated_select ON public.safety_check_results;
CREATE POLICY safety_check_results_authenticated_select ON public.safety_check_results
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM safety_checks sc
      WHERE sc.id = safety_check_results.check_id
        AND (
          is_master()
          OR (current_employee_role() = 'hr_admin')
          OR (current_employee_role() = 'general')
          OR (current_employee_role() = 'farm_admin' AND employee_branch(sc.worker_id) = current_employee_branch())
        )
    )
  );

-- ⑤ 신규 정책: daily_work_logs_general_select — general READ-ONLY
CREATE POLICY daily_work_logs_general_select ON public.daily_work_logs
  FOR SELECT TO authenticated
  USING (current_employee_role() = 'general');
