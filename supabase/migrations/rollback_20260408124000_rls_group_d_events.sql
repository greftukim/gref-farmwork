-- ============================================================================
-- 롤백: RLS Group D (calls, issues) 정책 제거 + 임시 정책 복원
-- ============================================================================

-- calls
DROP POLICY IF EXISTS "calls_anon_select" ON public.calls;
DROP POLICY IF EXISTS "calls_anon_insert" ON public.calls;
DROP POLICY IF EXISTS "calls_authenticated_select" ON public.calls;
DROP POLICY IF EXISTS "calls_authenticated_update" ON public.calls;

CREATE POLICY anon_full_access ON public.calls FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY anon_full_access_auth ON public.calls FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- issues
DROP POLICY IF EXISTS "issues_anon_select" ON public.issues;
DROP POLICY IF EXISTS "issues_anon_insert" ON public.issues;
DROP POLICY IF EXISTS "issues_authenticated_select" ON public.issues;
DROP POLICY IF EXISTS "issues_authenticated_update" ON public.issues;

CREATE POLICY anon_full_access ON public.issues FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY anon_full_access_auth ON public.issues FOR ALL TO authenticated USING (true) WITH CHECK (true);
