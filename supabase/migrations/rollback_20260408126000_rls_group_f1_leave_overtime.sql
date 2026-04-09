-- ============================================================================
-- 롤백: RLS Group F1 (leave_requests, leave_balances, overtime_requests) 정책 제거
-- ============================================================================

-- leave_requests
DROP POLICY IF EXISTS "leave_requests_anon_select" ON public.leave_requests;
DROP POLICY IF EXISTS "leave_requests_anon_insert" ON public.leave_requests;
DROP POLICY IF EXISTS "leave_requests_authenticated_select" ON public.leave_requests;
DROP POLICY IF EXISTS "leave_requests_authenticated_update" ON public.leave_requests;

CREATE POLICY anon_full_access ON public.leave_requests FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY anon_full_access_auth ON public.leave_requests FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- leave_balances
DROP POLICY IF EXISTS "leave_balances_anon_select" ON public.leave_balances;
DROP POLICY IF EXISTS "leave_balances_authenticated_select" ON public.leave_balances;
DROP POLICY IF EXISTS "leave_balances_authenticated_insert" ON public.leave_balances;
DROP POLICY IF EXISTS "leave_balances_authenticated_update" ON public.leave_balances;

CREATE POLICY anon_full_access ON public.leave_balances FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY anon_full_access_auth ON public.leave_balances FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- overtime_requests
DROP POLICY IF EXISTS "overtime_requests_anon_select" ON public.overtime_requests;
DROP POLICY IF EXISTS "overtime_requests_anon_insert" ON public.overtime_requests;
DROP POLICY IF EXISTS "overtime_requests_authenticated_select" ON public.overtime_requests;
DROP POLICY IF EXISTS "overtime_requests_authenticated_update" ON public.overtime_requests;

CREATE POLICY anon_full_access ON public.overtime_requests FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY anon_full_access_auth ON public.overtime_requests FOR ALL TO authenticated USING (true) WITH CHECK (true);
