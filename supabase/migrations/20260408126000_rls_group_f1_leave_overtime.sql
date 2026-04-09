-- ============================================================================
-- RLS Group F1: 인사 데이터 (휴가·연장근무)
--   leave_requests, leave_balances, overtime_requests
-- 작업 0-6 (RLS 전면 재설계)
-- 작성일: 2026-04-08
--
-- 전제:
--   - 20260408120000_rls_helper_functions.sql 적용 완료
--
-- 지점 경로:
--   leave_requests    → employee_id → employees.branch
--   leave_balances    → employee_id → employees.branch
--   overtime_requests → employee_id → employees.branch
--
-- worker(anon) 경로:
--   - leave_requests:    INSERT 본인 신청, SELECT 본인 내역, UPDATE 취소 불가(상태는 관리자가 변경)
--   - leave_balances:    SELECT 본인 잔여 (잔여일수 표시)
--   - overtime_requests: INSERT 본인 신청, SELECT 본인 내역
--
-- anon UPDATE:
--   - leave_requests:    작업자 취소 기능 없음(현재 앱에 없음) → anon UPDATE 금지
--   - overtime_requests: 작업자 취소 기능 없음 → anon UPDATE 금지
--
-- Realtime:
--   - overtime_requests: overtimeStore.js가 supabase_realtime 구독 중 ('*')
-- ============================================================================

-- ────────────────────────────────────────────────────────────────────────────
-- leave_requests
-- ────────────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS anon_full_access ON public.leave_requests;
DROP POLICY IF EXISTS anon_full_access_auth ON public.leave_requests;

ALTER TABLE public.leave_requests ENABLE ROW LEVEL SECURITY;

-- anon SELECT: 작업자 본인 휴가 신청 내역
CREATE POLICY "leave_requests_anon_select"
ON public.leave_requests
FOR SELECT
TO anon
USING (
  employee_id IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.employees
    WHERE id = employee_id
      AND role = 'worker'
      AND is_active = true
  )
);

-- anon INSERT: 작업자 휴가 신청
-- status는 반드시 'pending'으로만 생성 가능
CREATE POLICY "leave_requests_anon_insert"
ON public.leave_requests
FOR INSERT
TO anon
WITH CHECK (
  employee_id IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.employees
    WHERE id = employee_id
      AND role = 'worker'
      AND is_active = true
  )
  AND status = 'pending'
);

COMMENT ON POLICY "leave_requests_anon_insert" ON public.leave_requests IS
'anon INSERT: 활성 worker의 휴가 신청. status=pending 강제. RLS-DEBT-010 참조.';

-- authenticated SELECT
-- farm_admin: 본인 지점 worker의 신청만
-- hr_admin/supervisor/master: 전체
CREATE POLICY "leave_requests_authenticated_select"
ON public.leave_requests
FOR SELECT
TO authenticated
USING (
  public.can_view_all_branches()
  OR (
    public.current_employee_role() = 'farm_admin'
    AND employee_id IS NOT NULL
    AND public.employee_branch(employee_id) = public.current_employee_branch()
  )
);

-- authenticated UPDATE: 승인/반려 처리 (farm_admin만 — 파트 1 설계: 재배팀 단독 승인)
-- leaveStore.js의 approve/reject가 status + reviewed_by + reviewed_at + leave_balances 업데이트
CREATE POLICY "leave_requests_authenticated_update"
ON public.leave_requests
FOR UPDATE
TO authenticated
USING (
  public.is_master()
  OR (
    public.current_employee_role() = 'farm_admin'
    AND employee_id IS NOT NULL
    AND public.employee_branch(employee_id) = public.current_employee_branch()
  )
)
WITH CHECK (
  public.is_master()
  OR (
    public.current_employee_role() = 'farm_admin'
    AND employee_id IS NOT NULL
    AND public.employee_branch(employee_id) = public.current_employee_branch()
  )
);

COMMENT ON POLICY "leave_requests_authenticated_update" ON public.leave_requests IS
'UPDATE: farm_admin(본인지점 승인/반려) + master. hr_admin/supervisor는 조회만.';

-- DELETE: 금지 (기본 거부)

-- ────────────────────────────────────────────────────────────────────────────
-- leave_balances
-- ────────────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS anon_full_access ON public.leave_balances;
DROP POLICY IF EXISTS anon_full_access_auth ON public.leave_balances;

ALTER TABLE public.leave_balances ENABLE ROW LEVEL SECURITY;

-- anon SELECT: 작업자 본인 잔여 연차 조회 (WorkerLeavePage 표시)
CREATE POLICY "leave_balances_anon_select"
ON public.leave_balances
FOR SELECT
TO anon
USING (
  employee_id IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.employees
    WHERE id = employee_id
      AND role = 'worker'
      AND is_active = true
  )
);

-- authenticated SELECT
CREATE POLICY "leave_balances_authenticated_select"
ON public.leave_balances
FOR SELECT
TO authenticated
USING (
  public.can_view_all_branches()
  OR (
    public.current_employee_role() = 'farm_admin'
    AND employee_id IS NOT NULL
    AND public.employee_branch(employee_id) = public.current_employee_branch()
  )
);

-- INSERT: hr_admin/master (연차 초기 등록)
CREATE POLICY "leave_balances_authenticated_insert"
ON public.leave_balances
FOR INSERT
TO authenticated
WITH CHECK (
  public.is_master()
  OR public.current_employee_role() = 'hr_admin'
);

COMMENT ON POLICY "leave_balances_authenticated_insert" ON public.leave_balances IS
'INSERT: hr_admin/master만. 연차 초기 등록 및 수기 등록.';

-- UPDATE: farm_admin(used_days 감소 — 휴가 승인 시) + hr_admin/master(total_days 포함 모두)
-- leaveStore.js의 approveLeave에서 used_days + 1 처리
CREATE POLICY "leave_balances_authenticated_update"
ON public.leave_balances
FOR UPDATE
TO authenticated
USING (
  public.is_master()
  OR (public.current_employee_role() = 'hr_admin')
  OR (
    public.current_employee_role() = 'farm_admin'
    AND employee_id IS NOT NULL
    AND public.employee_branch(employee_id) = public.current_employee_branch()
  )
)
WITH CHECK (
  public.is_master()
  OR (public.current_employee_role() = 'hr_admin')
  OR (
    public.current_employee_role() = 'farm_admin'
    AND employee_id IS NOT NULL
    AND public.employee_branch(employee_id) = public.current_employee_branch()
  )
);

COMMENT ON POLICY "leave_balances_authenticated_update" ON public.leave_balances IS
'UPDATE: farm_admin=본인지점(used_days 조정), hr_admin/master=전체(total_days 포함).';

-- DELETE: 금지 (기본 거부)

-- ────────────────────────────────────────────────────────────────────────────
-- overtime_requests
-- ────────────────────────────────────────────────────────────────────────────
-- Realtime: overtimeStore.js가 supabase_realtime 구독 중 ('*')
-- SELECT 정책이 Realtime 필터로 자동 적용됨.

DROP POLICY IF EXISTS anon_full_access ON public.overtime_requests;
DROP POLICY IF EXISTS anon_full_access_auth ON public.overtime_requests;

ALTER TABLE public.overtime_requests ENABLE ROW LEVEL SECURITY;

-- anon SELECT: 작업자 본인 연장근무 신청 내역
CREATE POLICY "overtime_requests_anon_select"
ON public.overtime_requests
FOR SELECT
TO anon
USING (
  employee_id IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.employees
    WHERE id = employee_id
      AND role = 'worker'
      AND is_active = true
  )
);

-- anon INSERT: 작업자 연장근무 신청
-- status는 반드시 'pending'으로만 생성
-- UNIQUE 인덱스 (employee_id, date) WHERE status IN ('pending', 'approved') 는 DB 레벨에서 처리
CREATE POLICY "overtime_requests_anon_insert"
ON public.overtime_requests
FOR INSERT
TO anon
WITH CHECK (
  employee_id IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.employees
    WHERE id = employee_id
      AND role = 'worker'
      AND is_active = true
  )
  AND status = 'pending'
);

COMMENT ON POLICY "overtime_requests_anon_insert" ON public.overtime_requests IS
'anon INSERT: 활성 worker의 연장근무 신청. status=pending 강제. RLS-DEBT-010 참조.';

-- authenticated SELECT
-- farm_admin: 본인 지점만 (Realtime 구독 포함)
-- hr_admin/supervisor/master: 전체
CREATE POLICY "overtime_requests_authenticated_select"
ON public.overtime_requests
FOR SELECT
TO authenticated
USING (
  public.can_view_all_branches()
  OR (
    public.current_employee_role() = 'farm_admin'
    AND employee_id IS NOT NULL
    AND public.employee_branch(employee_id) = public.current_employee_branch()
  )
);

COMMENT ON POLICY "overtime_requests_authenticated_select" ON public.overtime_requests IS
'authenticated SELECT: Realtime 구독 포함. farm_admin=본인지점, hr_admin/supervisor/master=전체.';

-- authenticated UPDATE: 승인/반려/시간조정 (farm_admin 단독 — 재배팀 승인 원칙)
-- overtimeStore.js: approve, reject, adjustAndApprove
CREATE POLICY "overtime_requests_authenticated_update"
ON public.overtime_requests
FOR UPDATE
TO authenticated
USING (
  public.is_master()
  OR (
    public.current_employee_role() = 'farm_admin'
    AND employee_id IS NOT NULL
    AND public.employee_branch(employee_id) = public.current_employee_branch()
  )
)
WITH CHECK (
  public.is_master()
  OR (
    public.current_employee_role() = 'farm_admin'
    AND employee_id IS NOT NULL
    AND public.employee_branch(employee_id) = public.current_employee_branch()
  )
);

COMMENT ON POLICY "overtime_requests_authenticated_update" ON public.overtime_requests IS
'UPDATE: farm_admin(본인지점 승인/반려/시간조정) + master. hr_admin/supervisor는 조회만.';

-- DELETE: 금지 (기본 거부)

-- ============================================================================
-- 검증 쿼리 (주석 처리)
-- ============================================================================

-- SELECT tablename, policyname, cmd, roles
-- FROM pg_policies
-- WHERE schemaname = 'public'
--   AND tablename IN ('leave_requests', 'leave_balances', 'overtime_requests')
-- ORDER BY tablename, policyname;
-- 기대:
--   leave_requests:    4개 (anon_select, anon_insert, authenticated_select, authenticated_update)
--   leave_balances:    4개 (anon_select, authenticated_select, insert, update)
--   overtime_requests: 4개 (anon_select, anon_insert, authenticated_select, authenticated_update)

-- Realtime overtime_requests 구독 확인
-- SELECT schemaname, tablename
-- FROM pg_publication_tables
-- WHERE pubname = 'supabase_realtime' AND tablename = 'overtime_requests';
-- 기대: 1개 행
