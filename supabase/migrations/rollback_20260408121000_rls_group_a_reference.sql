-- ============================================================================
-- 롤백: RLS Group A (branches, crops, zones, growth_survey_items) 정책 제거
-- 임시 완전 공개 정책 복원
-- ============================================================================

-- branches
DROP POLICY IF EXISTS "branches_anon_select" ON public.branches;
DROP POLICY IF EXISTS "branches_authenticated_select" ON public.branches;
DROP POLICY IF EXISTS "branches_authenticated_insert" ON public.branches;
DROP POLICY IF EXISTS "branches_authenticated_update" ON public.branches;
DROP POLICY IF EXISTS "branches_master_delete" ON public.branches;

CREATE POLICY anon_full_access ON public.branches FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY anon_full_access_auth ON public.branches FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- crops
DROP POLICY IF EXISTS "crops_anon_select" ON public.crops;
DROP POLICY IF EXISTS "crops_authenticated_select" ON public.crops;
DROP POLICY IF EXISTS "crops_authenticated_insert" ON public.crops;
DROP POLICY IF EXISTS "crops_authenticated_update" ON public.crops;

CREATE POLICY anon_full_access ON public.crops FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY anon_full_access_auth ON public.crops FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- zones
DROP POLICY IF EXISTS "zones_anon_select" ON public.zones;
DROP POLICY IF EXISTS "zones_authenticated_select" ON public.zones;
DROP POLICY IF EXISTS "zones_authenticated_insert" ON public.zones;
DROP POLICY IF EXISTS "zones_authenticated_update" ON public.zones;

CREATE POLICY anon_full_access ON public.zones FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY anon_full_access_auth ON public.zones FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- growth_survey_items
DROP POLICY IF EXISTS "growth_survey_items_anon_select" ON public.growth_survey_items;
DROP POLICY IF EXISTS "growth_survey_items_authenticated_select" ON public.growth_survey_items;
DROP POLICY IF EXISTS "growth_survey_items_authenticated_insert" ON public.growth_survey_items;
DROP POLICY IF EXISTS "growth_survey_items_authenticated_update" ON public.growth_survey_items;

CREATE POLICY anon_full_access ON public.growth_survey_items FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY anon_full_access_auth ON public.growth_survey_items FOR ALL TO authenticated USING (true) WITH CHECK (true);
