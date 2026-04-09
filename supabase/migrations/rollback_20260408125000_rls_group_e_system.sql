-- ============================================================================
-- 롤백: RLS Group E (fcm_tokens) 정책 제거 + 임시 정책 복원
-- ============================================================================

DROP POLICY IF EXISTS "fcm_tokens_anon_select" ON public.fcm_tokens;
DROP POLICY IF EXISTS "fcm_tokens_anon_insert" ON public.fcm_tokens;
DROP POLICY IF EXISTS "fcm_tokens_anon_update" ON public.fcm_tokens;
DROP POLICY IF EXISTS "fcm_tokens_authenticated_select" ON public.fcm_tokens;
DROP POLICY IF EXISTS "fcm_tokens_authenticated_insert" ON public.fcm_tokens;
DROP POLICY IF EXISTS "fcm_tokens_authenticated_update" ON public.fcm_tokens;

CREATE POLICY anon_full_access ON public.fcm_tokens FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY anon_full_access_auth ON public.fcm_tokens FOR ALL TO authenticated USING (true) WITH CHECK (true);
