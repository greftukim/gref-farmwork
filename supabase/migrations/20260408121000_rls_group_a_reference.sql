-- ============================================================================
-- RLS Group A: 공용 참조 테이블
--   branches, crops, zones, growth_survey_items
-- 작업 0-6 (RLS 전면 재설계)
-- 작성일: 2026-04-08
--
-- 전제:
--   - 20260408120000_rls_helper_functions.sql 적용 완료
--
-- 보안 결정:
--   - anon SELECT 허용: 이 4개 테이블은 전사 공용 마스터 데이터로 민감 정보 없음.
--     작업자(anon)가 작업 화면·생육조사 폼·구역 표시에 이 데이터를 필요로 함.
--     patr 1 설계 누락 사항 (RLS-DESIGN-NOTE: anon SELECT 추가).
--   - INSERT/UPDATE: can_write() — farm_admin/hr_admin/master만
--   - DELETE: branches만 master 전용, 나머지 금지 (기본 거부)
-- ============================================================================

-- ────────────────────────────────────────────────────────────────────────────
-- branches
-- ────────────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS anon_full_access ON public.branches;
DROP POLICY IF EXISTS anon_full_access_auth ON public.branches;

ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;

-- anon SELECT: 지점 이름·코드는 비민감 공용 데이터
CREATE POLICY "branches_anon_select"
ON public.branches
FOR SELECT
TO anon
USING (true);

COMMENT ON POLICY "branches_anon_select" ON public.branches IS
'anon SELECT: 지점 이름/코드는 비민감. 작업자 화면 표시에 필요.';

-- authenticated SELECT: 모든 관리자
CREATE POLICY "branches_authenticated_select"
ON public.branches
FOR SELECT
TO authenticated
USING (public.is_admin_level());

COMMENT ON POLICY "branches_authenticated_select" ON public.branches IS
'authenticated SELECT: 모든 관리자급(farm_admin/hr_admin/supervisor/master).';

-- INSERT: can_write() — farm_admin/hr_admin/master
CREATE POLICY "branches_authenticated_insert"
ON public.branches
FOR INSERT
TO authenticated
WITH CHECK (public.can_write());

COMMENT ON POLICY "branches_authenticated_insert" ON public.branches IS
'INSERT: farm_admin/hr_admin/master만. supervisor 금지.';

-- UPDATE: can_write()
CREATE POLICY "branches_authenticated_update"
ON public.branches
FOR UPDATE
TO authenticated
USING (public.can_write())
WITH CHECK (public.can_write());

COMMENT ON POLICY "branches_authenticated_update" ON public.branches IS
'UPDATE: farm_admin/hr_admin/master만.';

-- DELETE: master 전용
CREATE POLICY "branches_master_delete"
ON public.branches
FOR DELETE
TO authenticated
USING (public.is_master());

COMMENT ON POLICY "branches_master_delete" ON public.branches IS
'DELETE: master 전용. 지점 삭제는 최고 권한만.';

-- ────────────────────────────────────────────────────────────────────────────
-- crops
-- ────────────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS anon_full_access ON public.crops;
DROP POLICY IF EXISTS anon_full_access_auth ON public.crops;

ALTER TABLE public.crops ENABLE ROW LEVEL SECURITY;

-- anon SELECT: 작업 화면에서 cropMap[cropId].name 표시에 필수
CREATE POLICY "crops_anon_select"
ON public.crops
FOR SELECT
TO anon
USING (true);

COMMENT ON POLICY "crops_anon_select" ON public.crops IS
'anon SELECT: 작업자 작업 화면 작물명 표시에 필요. 비민감 마스터 데이터.';

-- authenticated SELECT
CREATE POLICY "crops_authenticated_select"
ON public.crops
FOR SELECT
TO authenticated
USING (public.is_admin_level());

-- INSERT
CREATE POLICY "crops_authenticated_insert"
ON public.crops
FOR INSERT
TO authenticated
WITH CHECK (public.can_write());

-- UPDATE
CREATE POLICY "crops_authenticated_update"
ON public.crops
FOR UPDATE
TO authenticated
USING (public.can_write())
WITH CHECK (public.can_write());

-- DELETE: 금지 (기본 거부 — 작물 삭제는 is_active=false 비활성화로 처리)

-- ────────────────────────────────────────────────────────────────────────────
-- zones
-- ────────────────────────────────────────────────────────────────────────────
-- RLS-DEBT-006: zones에 branch 컬럼 없음.
-- 이번 작업에서는 zones를 전 지점 공용 마스터로 확정.
-- 지점별 분리는 별도 스키마 변경 작업에서.

DROP POLICY IF EXISTS anon_full_access ON public.zones;
DROP POLICY IF EXISTS anon_full_access_auth ON public.zones;

ALTER TABLE public.zones ENABLE ROW LEVEL SECURITY;

-- anon SELECT: 구역 이름·GPS 표시에 필요 (출퇴근 GPS 검증 포함)
CREATE POLICY "zones_anon_select"
ON public.zones
FOR SELECT
TO anon
USING (true);

COMMENT ON POLICY "zones_anon_select" ON public.zones IS
'anon SELECT: 작업자 구역명 표시 및 출퇴근 GPS 검증에 필요. RLS-DEBT-006 참조.';

-- authenticated SELECT
CREATE POLICY "zones_authenticated_select"
ON public.zones
FOR SELECT
TO authenticated
USING (public.is_admin_level());

-- INSERT
CREATE POLICY "zones_authenticated_insert"
ON public.zones
FOR INSERT
TO authenticated
WITH CHECK (public.can_write());

-- UPDATE
CREATE POLICY "zones_authenticated_update"
ON public.zones
FOR UPDATE
TO authenticated
USING (public.can_write())
WITH CHECK (public.can_write());

-- DELETE: 금지 (기본 거부)

-- ────────────────────────────────────────────────────────────────────────────
-- growth_survey_items
-- ────────────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS anon_full_access ON public.growth_survey_items;
DROP POLICY IF EXISTS anon_full_access_auth ON public.growth_survey_items;

ALTER TABLE public.growth_survey_items ENABLE ROW LEVEL SECURITY;

-- anon SELECT: GrowthSurveyPage 폼 로드에 필요
CREATE POLICY "growth_survey_items_anon_select"
ON public.growth_survey_items
FOR SELECT
TO anon
USING (true);

COMMENT ON POLICY "growth_survey_items_anon_select" ON public.growth_survey_items IS
'anon SELECT: 작업자 생육조사 입력 폼 로드에 필요. 설정 마스터 데이터.';

-- authenticated SELECT
CREATE POLICY "growth_survey_items_authenticated_select"
ON public.growth_survey_items
FOR SELECT
TO authenticated
USING (public.is_admin_level());

-- INSERT
CREATE POLICY "growth_survey_items_authenticated_insert"
ON public.growth_survey_items
FOR INSERT
TO authenticated
WITH CHECK (public.can_write());

-- UPDATE
CREATE POLICY "growth_survey_items_authenticated_update"
ON public.growth_survey_items
FOR UPDATE
TO authenticated
USING (public.can_write())
WITH CHECK (public.can_write());

-- DELETE: 금지 (기본 거부)

-- ============================================================================
-- 검증 쿼리 (주석 처리 — 실행 후 수동으로 돌려볼 것)
-- ============================================================================

-- 정책 목록 확인
-- SELECT tablename, policyname, cmd, roles
-- FROM pg_policies
-- WHERE schemaname = 'public'
--   AND tablename IN ('branches', 'crops', 'zones', 'growth_survey_items')
-- ORDER BY tablename, policyname;
-- 기대:
--   branches: 5개 정책 (anon_select, authenticated_select, insert, update, master_delete)
--   crops: 4개 정책 (anon_select, authenticated_select, insert, update)
--   zones: 4개 정책
--   growth_survey_items: 4개 정책

-- RLS 활성화 확인
-- SELECT relname, relrowsecurity
-- FROM pg_class
-- WHERE relname IN ('branches', 'crops', 'zones', 'growth_survey_items');
-- 기대: 4개 행 모두 relrowsecurity = true
