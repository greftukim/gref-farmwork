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
