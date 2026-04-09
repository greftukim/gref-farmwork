-- ============================================================================
-- RLS Group B: notices (공지사항)
-- 작업 0-6 (RLS 전면 재설계)
-- 작성일: 2026-04-08
--
-- 전제:
--   - 20260408120000_rls_helper_functions.sql 적용 완료
--
-- 설계 결정:
--   - anon SELECT 허용: WorkerNoticePage에서 작업자(anon)가 공지를 읽어야 함.
--     notices는 전사 공용 공지이며 민감 정보 없음 (파트 1 설계 누락 보완).
--   - INSERT/UPDATE/DELETE: can_write() — farm_admin/hr_admin/master만
--   - SELECT에 지점 필터 없음: 전사 공지는 모든 역할이 전부 열람 가능.
-- ============================================================================

DROP POLICY IF EXISTS anon_full_access ON public.notices;
DROP POLICY IF EXISTS anon_full_access_auth ON public.notices;

ALTER TABLE public.notices ENABLE ROW LEVEL SECURITY;

-- anon SELECT: WorkerNoticePage 공지 목록 표시에 필수
CREATE POLICY "notices_anon_select"
ON public.notices
FOR SELECT
TO anon
USING (true);

COMMENT ON POLICY "notices_anon_select" ON public.notices IS
'anon SELECT: 작업자 공지사항 페이지 표시에 필요. 전사 공지는 비민감. 파트 1 누락 보완.';

-- authenticated SELECT: 모든 관리자
CREATE POLICY "notices_authenticated_select"
ON public.notices
FOR SELECT
TO authenticated
USING (public.is_admin_level());

COMMENT ON POLICY "notices_authenticated_select" ON public.notices IS
'authenticated SELECT: 모든 관리자급. 전 지점 공지 전부 열람 가능.';

-- INSERT: can_write() — farm_admin/hr_admin/master
CREATE POLICY "notices_authenticated_insert"
ON public.notices
FOR INSERT
TO authenticated
WITH CHECK (
  public.can_write()
  AND created_by = public.current_employee_id()
);

COMMENT ON POLICY "notices_authenticated_insert" ON public.notices IS
'INSERT: can_write() 역할만. created_by는 반드시 본인 employee_id여야 함.';

-- UPDATE: 본인이 작성한 공지 or master
CREATE POLICY "notices_authenticated_update"
ON public.notices
FOR UPDATE
TO authenticated
USING (
  public.is_master()
  OR (public.can_write() AND created_by = public.current_employee_id())
)
WITH CHECK (
  public.is_master()
  OR (public.can_write() AND created_by = public.current_employee_id())
);

COMMENT ON POLICY "notices_authenticated_update" ON public.notices IS
'UPDATE: 본인 작성 공지만 수정 가능(can_write 역할). master는 모든 공지 수정 가능.';

-- DELETE: 본인이 작성한 공지 or master
CREATE POLICY "notices_authenticated_delete"
ON public.notices
FOR DELETE
TO authenticated
USING (
  public.is_master()
  OR (public.can_write() AND created_by = public.current_employee_id())
);

COMMENT ON POLICY "notices_authenticated_delete" ON public.notices IS
'DELETE: 본인 작성 공지만. master는 전체 삭제 가능.';

-- ============================================================================
-- 검증 쿼리 (주석 처리)
-- ============================================================================

-- SELECT tablename, policyname, cmd, roles
-- FROM pg_policies
-- WHERE schemaname = 'public' AND tablename = 'notices'
-- ORDER BY policyname;
-- 기대: 5개 정책
