-- ============================================================================
-- RLS Group D: 이벤트성 데이터
--   calls (긴급 호출), issues (이상 신고)
-- 작업 0-6 (RLS 전면 재설계)
-- 작성일: 2026-04-08
--
-- 전제:
--   - 20260408120000_rls_helper_functions.sql 적용 완료
--
-- 지점 경로:
--   calls  → worker_id → employees.branch (nullable)
--   issues → worker_id → employees.branch (nullable)
--
-- anon INSERT 설계 (Q3 답변 반영):
--   옵션 A 채택 + EXISTS 검증 패턴.
--   - worker_id가 존재하는 활성 worker의 id여야 함 → 가짜 UUID / 관리자 id 도용 차단
--   - is_confirmed / is_resolved는 INSERT 시점에 반드시 false여야 함
--   - 완벽한 본인 검증은 불가 (anon이므로) → RLS-DEBT-010 백로그
--
-- Realtime:
--   - calls:  supabase_realtime publication 포함 (INSERT 구독)
--   - issues: supabase_realtime publication 포함 (INSERT 구독)
--   SELECT 정책이 Realtime 필터로 자동 적용됨.
-- ============================================================================

-- ────────────────────────────────────────────────────────────────────────────
-- calls (긴급 호출)
-- ────────────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS anon_full_access ON public.calls;
DROP POLICY IF EXISTS anon_full_access_auth ON public.calls;

ALTER TABLE public.calls ENABLE ROW LEVEL SECURITY;

-- anon SELECT: 작업자 본인 호출 기록 조회
CREATE POLICY "calls_anon_select"
ON public.calls
FOR SELECT
TO anon
USING (
  worker_id IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.employees
    WHERE id = worker_id
      AND role = 'worker'
      AND is_active = true
  )
);

COMMENT ON POLICY "calls_anon_select" ON public.calls IS
'anon SELECT: 활성 worker에 귀속된 호출만. Realtime INSERT 구독에도 이 정책 적용.';

-- anon INSERT: 작업자 긴급 호출 생성
-- EXISTS로 실재하는 활성 worker id인지 검증
-- is_confirmed은 반드시 false (작업자가 이미 확인된 호출 생성 불가)
-- RLS-DEBT-010: anon INSERT 시 worker_id 본인 검증 부재 (Edge Function 이관 시 해소)
CREATE POLICY "calls_anon_insert"
ON public.calls
FOR INSERT
TO anon
WITH CHECK (
  worker_id IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.employees
    WHERE id = worker_id
      AND role = 'worker'
      AND is_active = true
  )
  AND (is_confirmed IS NULL OR is_confirmed = false)
);

COMMENT ON POLICY "calls_anon_insert" ON public.calls IS
'anon INSERT: 실재하는 활성 worker_id + is_confirmed=false 강제. RLS-DEBT-010 참조.';

-- authenticated SELECT: 관리자 호출 목록 (Realtime 구독 포함)
-- farm_admin: 본인 지점 worker의 호출만
-- hr_admin/supervisor/master: 전체 (NULL worker_id 포함)
CREATE POLICY "calls_authenticated_select"
ON public.calls
FOR SELECT
TO authenticated
USING (
  public.can_view_all_branches()
  OR (
    public.current_employee_role() = 'farm_admin'
    AND worker_id IS NOT NULL
    AND public.employee_branch(worker_id) = public.current_employee_branch()
  )
);

COMMENT ON POLICY "calls_authenticated_select" ON public.calls IS
'authenticated SELECT: hr_admin/supervisor/master=전체, farm_admin=본인지점. Realtime에도 적용.';

-- authenticated UPDATE: 호출 확인 처리 (is_confirmed 토글)
-- farm_admin: 본인 지점 호출만
-- hr_admin/master: 전체
-- supervisor: 읽기 전용 → UPDATE 정책 없음
CREATE POLICY "calls_authenticated_update"
ON public.calls
FOR UPDATE
TO authenticated
USING (
  public.is_master()
  OR (public.current_employee_role() = 'hr_admin')
  OR (
    public.current_employee_role() = 'farm_admin'
    AND worker_id IS NOT NULL
    AND public.employee_branch(worker_id) = public.current_employee_branch()
  )
)
WITH CHECK (
  public.is_master()
  OR (public.current_employee_role() = 'hr_admin')
  OR (
    public.current_employee_role() = 'farm_admin'
    AND worker_id IS NOT NULL
    AND public.employee_branch(worker_id) = public.current_employee_branch()
  )
);

COMMENT ON POLICY "calls_authenticated_update" ON public.calls IS
'authenticated UPDATE: 호출 확인(is_confirmed) 처리. farm_admin=본인지점, supervisor=금지.';

-- DELETE: 금지 (기본 거부)

-- ────────────────────────────────────────────────────────────────────────────
-- issues (이상 신고)
-- ────────────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS anon_full_access ON public.issues;
DROP POLICY IF EXISTS anon_full_access_auth ON public.issues;

ALTER TABLE public.issues ENABLE ROW LEVEL SECURITY;

-- anon SELECT: 작업자 본인 이상 신고 조회
CREATE POLICY "issues_anon_select"
ON public.issues
FOR SELECT
TO anon
USING (
  worker_id IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.employees
    WHERE id = worker_id
      AND role = 'worker'
      AND is_active = true
  )
);

-- anon INSERT: 작업자 이상 신고 생성
-- is_resolved는 반드시 false (작업자가 이미 해결된 이슈 생성 불가)
-- RLS-DEBT-010 참조
CREATE POLICY "issues_anon_insert"
ON public.issues
FOR INSERT
TO anon
WITH CHECK (
  worker_id IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.employees
    WHERE id = worker_id
      AND role = 'worker'
      AND is_active = true
  )
  AND (is_resolved IS NULL OR is_resolved = false)
);

COMMENT ON POLICY "issues_anon_insert" ON public.issues IS
'anon INSERT: 실재하는 활성 worker_id + is_resolved=false 강제. RLS-DEBT-010 참조.';

-- authenticated SELECT
CREATE POLICY "issues_authenticated_select"
ON public.issues
FOR SELECT
TO authenticated
USING (
  public.can_view_all_branches()
  OR (
    public.current_employee_role() = 'farm_admin'
    AND worker_id IS NOT NULL
    AND public.employee_branch(worker_id) = public.current_employee_branch()
  )
);

-- authenticated UPDATE: 이슈 해결 처리 (is_resolved 토글, resolved_by/resolved_at 기록)
CREATE POLICY "issues_authenticated_update"
ON public.issues
FOR UPDATE
TO authenticated
USING (
  public.is_master()
  OR (public.current_employee_role() = 'hr_admin')
  OR (
    public.current_employee_role() = 'farm_admin'
    AND worker_id IS NOT NULL
    AND public.employee_branch(worker_id) = public.current_employee_branch()
  )
)
WITH CHECK (
  public.is_master()
  OR (public.current_employee_role() = 'hr_admin')
  OR (
    public.current_employee_role() = 'farm_admin'
    AND worker_id IS NOT NULL
    AND public.employee_branch(worker_id) = public.current_employee_branch()
  )
);

COMMENT ON POLICY "issues_authenticated_update" ON public.issues IS
'authenticated UPDATE: 이슈 해결(is_resolved/resolved_by/resolved_at). supervisor=금지.';

-- DELETE: 금지 (기본 거부)

-- ============================================================================
-- 검증 쿼리 (주석 처리)
-- ============================================================================

-- SELECT tablename, policyname, cmd, roles
-- FROM pg_policies
-- WHERE schemaname = 'public'
--   AND tablename IN ('calls', 'issues')
-- ORDER BY tablename, policyname;
-- 기대:
--   calls: 4개 (anon_select, anon_insert, authenticated_select, authenticated_update)
--   issues: 4개 (동일)

-- Realtime publication 포함 여부 확인
-- SELECT schemaname, tablename
-- FROM pg_publication_tables
-- WHERE pubname = 'supabase_realtime'
--   AND tablename IN ('calls', 'issues');
-- 기대: 2개 행
