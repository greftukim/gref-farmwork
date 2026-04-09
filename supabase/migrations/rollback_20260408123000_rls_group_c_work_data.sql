-- ============================================================================
-- 롤백: RLS Group C (schedules, tasks, growth_surveys) 정책 제거 + 임시 정책 복원
-- ============================================================================

-- schedules
DROP POLICY IF EXISTS "schedules_anon_select" ON public.schedules;
DROP POLICY IF EXISTS "schedules_authenticated_select" ON public.schedules;
DROP POLICY IF EXISTS "schedules_authenticated_insert" ON public.schedules;
DROP POLICY IF EXISTS "schedules_authenticated_update" ON public.schedules;
DROP POLICY IF EXISTS "schedules_authenticated_delete" ON public.schedules;

CREATE POLICY anon_full_access ON public.schedules FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY anon_full_access_auth ON public.schedules FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- tasks
DROP POLICY IF EXISTS "tasks_anon_select" ON public.tasks;
DROP POLICY IF EXISTS "tasks_anon_update_status" ON public.tasks;
DROP POLICY IF EXISTS "tasks_authenticated_select" ON public.tasks;
DROP POLICY IF EXISTS "tasks_authenticated_insert" ON public.tasks;
DROP POLICY IF EXISTS "tasks_authenticated_update" ON public.tasks;
DROP POLICY IF EXISTS "tasks_authenticated_delete" ON public.tasks;

CREATE POLICY anon_full_access ON public.tasks FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY anon_full_access_auth ON public.tasks FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- growth_surveys
DROP POLICY IF EXISTS "growth_surveys_anon_select" ON public.growth_surveys;
DROP POLICY IF EXISTS "growth_surveys_anon_insert" ON public.growth_surveys;
DROP POLICY IF EXISTS "growth_surveys_authenticated_select" ON public.growth_surveys;
DROP POLICY IF EXISTS "growth_surveys_authenticated_insert" ON public.growth_surveys;
DROP POLICY IF EXISTS "growth_surveys_authenticated_update" ON public.growth_surveys;

CREATE POLICY anon_full_access ON public.growth_surveys FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY anon_full_access_auth ON public.growth_surveys FOR ALL TO authenticated USING (true) WITH CHECK (true);
