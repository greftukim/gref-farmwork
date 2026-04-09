-- ============================================================================
-- 롤백: RLS Group F2 (attendance) 정책 제거 + 임시 정책 복원
-- ============================================================================

DROP POLICY IF EXISTS "attendance_anon_select" ON public.attendance;
DROP POLICY IF EXISTS "attendance_anon_insert" ON public.attendance;
DROP POLICY IF EXISTS "attendance_anon_update" ON public.attendance;
DROP POLICY IF EXISTS "attendance_authenticated_select" ON public.attendance;
DROP POLICY IF EXISTS "attendance_authenticated_update" ON public.attendance;
DROP POLICY IF EXISTS "attendance_authenticated_delete" ON public.attendance;

CREATE POLICY anon_full_access ON public.attendance FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY anon_full_access_auth ON public.attendance FOR ALL TO authenticated USING (true) WITH CHECK (true);
