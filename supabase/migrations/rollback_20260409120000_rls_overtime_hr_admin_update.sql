-- ============================================================================
-- 롤백: hr_admin 연장근무 시간 수정 정책 제거
-- 원본: 20260409120000_rls_overtime_hr_admin_update.sql
-- ============================================================================

DROP POLICY IF EXISTS overtime_requests_hr_admin_update ON public.overtime_requests;
