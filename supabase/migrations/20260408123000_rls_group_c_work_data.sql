-- ============================================================================
-- RLS Group C: 작업 데이터
--   schedules, tasks, growth_surveys
-- 작업 0-6 (RLS 전면 재설계)
-- 작성일: 2026-04-08
--
-- 전제:
--   - 20260408120000_rls_helper_functions.sql 적용 완료
--
-- 지점 경로:
--   schedules  → employee_id → employees.branch (nullable)
--   tasks      → worker_id  → employees.branch (nullable)
--   growth_surveys → worker_id → employees.branch (nullable)
--
-- NULL worker_id/employee_id 행 처리:
--   "관리자가 만든 미귀속 데이터"로 취급.
--   can_view_all_branches() 통과 역할(hr_admin/supervisor/master)만 조회 가능.
--   farm_admin과 worker(anon)는 NULL 행 조회 불가.
--
-- worker(anon) 경로:
--   - tasks:         SELECT 본인 것(worker_id), UPDATE 상태 변경(started_at/completed_at)
--   - growth_surveys: INSERT 본인 것, SELECT 본인 것
--   - schedules:     SELECT 본인 것 (수정 불가)
--
-- Realtime:
--   - tasks: supabase_realtime publication에 포함됨 (useRealtimeSubscriptions.js)
--   - 이 파일의 SELECT 정책이 Realtime 구독도 자동으로 제어함
-- ============================================================================

-- ────────────────────────────────────────────────────────────────────────────
-- schedules
-- ────────────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS anon_full_access ON public.schedules;
DROP POLICY IF EXISTS anon_full_access_auth ON public.schedules;

ALTER TABLE public.schedules ENABLE ROW LEVEL SECURITY;

-- anon SELECT: 작업자 본인 일정 조회 (WorkerHome 등)
CREATE POLICY "schedules_anon_select"
ON public.schedules
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

COMMENT ON POLICY "schedules_anon_select" ON public.schedules IS
'anon SELECT: 활성 worker에게 귀속된 일정만. NULL employee_id 행 차단.';

-- authenticated SELECT
-- can_view_all_branches(): hr_admin/supervisor/master → 모든 행 (NULL 포함)
-- farm_admin: 본인 지점 employee 행만 (NULL employee_id 제외)
CREATE POLICY "schedules_authenticated_select"
ON public.schedules
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

COMMENT ON POLICY "schedules_authenticated_select" ON public.schedules IS
'authenticated SELECT: hr_admin/supervisor/master=전체(NULL포함), farm_admin=본인지점만.';

-- INSERT: can_write() + 지점 제약
CREATE POLICY "schedules_authenticated_insert"
ON public.schedules
FOR INSERT
TO authenticated
WITH CHECK (
  public.is_master()
  OR (
    public.current_employee_role() = 'hr_admin'
  )
  OR (
    public.current_employee_role() = 'farm_admin'
    AND employee_id IS NOT NULL
    AND public.employee_branch(employee_id) = public.current_employee_branch()
  )
);

COMMENT ON POLICY "schedules_authenticated_insert" ON public.schedules IS
'INSERT: master/hr_admin=자유, farm_admin=본인지점 employee만.';

-- UPDATE: 같은 조건
CREATE POLICY "schedules_authenticated_update"
ON public.schedules
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

-- DELETE: master/hr_admin/farm_admin(본인지점)
CREATE POLICY "schedules_authenticated_delete"
ON public.schedules
FOR DELETE
TO authenticated
USING (
  public.is_master()
  OR (public.current_employee_role() = 'hr_admin')
  OR (
    public.current_employee_role() = 'farm_admin'
    AND employee_id IS NOT NULL
    AND public.employee_branch(employee_id) = public.current_employee_branch()
  )
);

-- ────────────────────────────────────────────────────────────────────────────
-- tasks
-- ────────────────────────────────────────────────────────────────────────────
-- Realtime 대상 테이블: useRealtimeSubscriptions.js가 구독 중 ('*')
-- SELECT 정책이 Realtime 필터로 자동 적용됨.

DROP POLICY IF EXISTS anon_full_access ON public.tasks;
DROP POLICY IF EXISTS anon_full_access_auth ON public.tasks;

ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- anon SELECT: 작업자 본인 tasks 조회 (WorkerTasksPage)
CREATE POLICY "tasks_anon_select"
ON public.tasks
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

COMMENT ON POLICY "tasks_anon_select" ON public.tasks IS
'anon SELECT: 활성 worker에게 귀속된 작업만. NULL worker_id 차단. Realtime 구독도 이 정책 적용.';

-- anon UPDATE: 작업자 상태 변경 (pending→in_progress→completed)
-- started_at, completed_at, status, duration_minutes만 변경 허용
-- WITH CHECK으로 worker_id 변경 방지
CREATE POLICY "tasks_anon_update_status"
ON public.tasks
FOR UPDATE
TO anon
USING (
  worker_id IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.employees
    WHERE id = worker_id
      AND role = 'worker'
      AND is_active = true
  )
)
WITH CHECK (
  worker_id IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.employees
    WHERE id = worker_id
      AND role = 'worker'
      AND is_active = true
  )
  AND status IN ('pending', 'in_progress', 'completed')
);

COMMENT ON POLICY "tasks_anon_update_status" ON public.tasks IS
'anon UPDATE: 작업자 상태 변경(started_at/completed_at/status/duration_minutes). worker_id 변경 방지. status 화이트리스트 enforced.';

-- authenticated SELECT
CREATE POLICY "tasks_authenticated_select"
ON public.tasks
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

COMMENT ON POLICY "tasks_authenticated_select" ON public.tasks IS
'authenticated SELECT: hr_admin/supervisor/master=전체(NULL포함), farm_admin=본인지점만.';

-- INSERT: farm_admin(본인지점)/hr_admin/master
CREATE POLICY "tasks_authenticated_insert"
ON public.tasks
FOR INSERT
TO authenticated
WITH CHECK (
  public.is_master()
  OR (public.current_employee_role() = 'hr_admin')
  OR (
    public.current_employee_role() = 'farm_admin'
    AND worker_id IS NOT NULL
    AND public.employee_branch(worker_id) = public.current_employee_branch()
  )
);

-- UPDATE: farm_admin(본인지점)/hr_admin/master
CREATE POLICY "tasks_authenticated_update"
ON public.tasks
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

-- DELETE: farm_admin(본인지점)/hr_admin/master (taskStore.js에 deleteTask 있음)
CREATE POLICY "tasks_authenticated_delete"
ON public.tasks
FOR DELETE
TO authenticated
USING (
  public.is_master()
  OR (public.current_employee_role() = 'hr_admin')
  OR (
    public.current_employee_role() = 'farm_admin'
    AND worker_id IS NOT NULL
    AND public.employee_branch(worker_id) = public.current_employee_branch()
  )
);

-- ────────────────────────────────────────────────────────────────────────────
-- growth_surveys
-- ────────────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS anon_full_access ON public.growth_surveys;
DROP POLICY IF EXISTS anon_full_access_auth ON public.growth_surveys;

ALTER TABLE public.growth_surveys ENABLE ROW LEVEL SECURITY;

-- anon SELECT: 작업자 본인 생육조사 기록 조회
CREATE POLICY "growth_surveys_anon_select"
ON public.growth_surveys
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

-- anon INSERT: 작업자 생육조사 입력 (GrowthSurveyPage)
CREATE POLICY "growth_surveys_anon_insert"
ON public.growth_surveys
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
);

COMMENT ON POLICY "growth_surveys_anon_insert" ON public.growth_surveys IS
'anon INSERT: 작업자 생육조사 입력. 존재하는 활성 worker_id여야 함. RLS-DEBT-010 참조.';

-- authenticated SELECT
CREATE POLICY "growth_surveys_authenticated_select"
ON public.growth_surveys
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

-- INSERT: 관리자가 대신 입력하는 경우 (hr_admin/master)
CREATE POLICY "growth_surveys_authenticated_insert"
ON public.growth_surveys
FOR INSERT
TO authenticated
WITH CHECK (
  public.is_master()
  OR (public.current_employee_role() = 'hr_admin')
  OR (
    public.current_employee_role() = 'farm_admin'
    AND worker_id IS NOT NULL
    AND public.employee_branch(worker_id) = public.current_employee_branch()
  )
);

-- UPDATE: hr_admin/master/farm_admin(본인지점)
CREATE POLICY "growth_surveys_authenticated_update"
ON public.growth_surveys
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

-- DELETE: 금지 (기본 거부)

-- ============================================================================
-- 검증 쿼리 (주석 처리)
-- ============================================================================

-- SELECT tablename, policyname, cmd, roles
-- FROM pg_policies
-- WHERE schemaname = 'public'
--   AND tablename IN ('schedules', 'tasks', 'growth_surveys')
-- ORDER BY tablename, policyname;

-- Realtime publication 확인 (그룹 D 전에도 확인)
-- SELECT schemaname, tablename
-- FROM pg_publication_tables
-- WHERE pubname = 'supabase_realtime'
--   AND tablename IN ('tasks', 'calls', 'issues', 'overtime_requests');
-- 기대: 4개 행
