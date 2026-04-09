-- ============================================================================
-- 롤백: RLS Group B (notices) 정책 제거 + 임시 정책 복원
-- ============================================================================

DROP POLICY IF EXISTS "notices_anon_select" ON public.notices;
DROP POLICY IF EXISTS "notices_authenticated_select" ON public.notices;
DROP POLICY IF EXISTS "notices_authenticated_insert" ON public.notices;
DROP POLICY IF EXISTS "notices_authenticated_update" ON public.notices;
DROP POLICY IF EXISTS "notices_authenticated_delete" ON public.notices;

CREATE POLICY anon_full_access ON public.notices FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY anon_full_access_auth ON public.notices FOR ALL TO authenticated USING (true) WITH CHECK (true);
