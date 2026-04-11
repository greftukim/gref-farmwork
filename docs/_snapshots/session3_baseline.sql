-- Phase 5 세션 3 작업 전 RLS 정책 베이스라인
-- 조회 일시: 2026-04-11
-- 테이블: safety_checks, fcm_tokens, employees

-- ── employees ─────────────────────────────────────────────────────────────
-- employees_anon_qr_login (anon, SELECT)
--   USING: role='worker' AND is_active=true

-- employees_authenticated_insert (authenticated, INSERT)
--   CHECK: current_employee_role() IN ('hr_admin','master')
--          OR (current_employee_role()='farm_admin' AND branch=current_employee_branch() AND role='worker')

-- employees_authenticated_select (authenticated, SELECT)
--   USING: auth_user_id=auth.uid() OR can_view_all_branches()
--          OR (current_employee_role()='farm_admin' AND branch=current_employee_branch())

-- employees_authenticated_update (authenticated, UPDATE)
--   USING/CHECK: auth_user_id=auth.uid() OR is_master()
--               OR (role()='hr_admin' AND role<>'master')
--               OR (role()='farm_admin' AND branch=current_employee_branch() AND role='worker')

-- ── fcm_tokens ─────────────────────────────────────────────────────────────
-- fcm_tokens_anon_insert (anon, INSERT)
--   CHECK: employee_id IS NOT NULL
--          AND EXISTS(SELECT 1 FROM employees WHERE id=fcm_tokens.employee_id AND role='worker' AND is_active=true)

-- fcm_tokens_anon_select (anon, SELECT)
--   USING: employee_id IS NOT NULL
--          AND EXISTS(SELECT 1 FROM employees WHERE id=fcm_tokens.employee_id AND role='worker' AND is_active=true)

-- fcm_tokens_anon_update (anon, UPDATE)
--   USING/CHECK: 동일 (employee_id IS NOT NULL + active worker EXISTS)

-- fcm_tokens_authenticated_insert (authenticated, INSERT)
--   CHECK: employee_id = current_employee_id()

-- fcm_tokens_authenticated_select (authenticated, SELECT)
--   USING: employee_id = current_employee_id()

-- fcm_tokens_authenticated_update (authenticated, UPDATE)
--   USING/CHECK: employee_id = current_employee_id()

-- ── safety_checks ──────────────────────────────────────────────────────────
-- safety_checks_anon_confirm_risks (anon, UPDATE)
--   USING: check_type='pre_task' AND status='submitted' AND date >= CURRENT_DATE-'1 day'
--   CHECK: check_type='pre_task' AND status='submitted'

-- safety_checks_anon_insert (anon, INSERT)
--   CHECK: worker_id IS NOT NULL
--          AND EXISTS(... role='worker' AND is_active=true)
--          AND date >= CURRENT_DATE-'1 day' AND date <= CURRENT_DATE+'1 day'

-- safety_checks_anon_select (anon, SELECT)  ← RLS-DEBT-019 대상
--   USING: EXISTS(SELECT 1 FROM employees WHERE id=safety_checks.worker_id AND role='worker' AND is_active=true)
--   ※ branch 격리 없음 — 모든 지점 anon에게 전체 조회 허용

-- safety_checks_authenticated_select (authenticated, SELECT)
--   USING: is_master() OR role()='hr_admin'
--          OR (role()='farm_admin' AND employee_branch(worker_id)=current_employee_branch())

-- safety_checks_authenticated_update (authenticated, UPDATE)
--   USING/CHECK: 동일

-- safety_checks_team_leader_update (anon, UPDATE)
--   USING: EXISTS(SELECT 1 FROM employees leader WHERE leader.id=safety_checks.approved_by
--                  AND leader.is_team_leader=true AND leader.is_active=true
--                  AND leader.branch=employee_branch(safety_checks.worker_id))
--   CHECK: status='approved' AND approved_by IS NOT NULL AND approved_at IS NOT NULL AND 동일 EXISTS
