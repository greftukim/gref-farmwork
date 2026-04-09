-- ============================================================================
-- RLS Group F2: attendance (출퇴근 기록)
-- 작업 0-6 (RLS 전면 재설계)
-- 작성일: 2026-04-08
--
-- 전제:
--   - 20260408120000_rls_helper_functions.sql 적용 완료
--
-- 지점 경로: employee_id → employees.branch
--
-- 중요 특이사항:
--   1. worker(anon) INSERT: 작업자 출퇴근 기록 생성 (check_in, check_out, GPS)
--   2. worker(anon) UPDATE: 퇴근 기록 추가 (check_out, check_out_lat/lng, work_minutes, status)
--   3. attendanceStore.js에 deleteRecord(id)와 deleteRecords(범위) 두 개의 DELETE 존재
--      - deleteRecord: 개별 삭제 (관리자용 수정 대용)
--      - deleteRecords: 범위 삭제 (관리팀 데이터 정리용)
--   4. 범위 DELETE: RLS-DEBT-004 — master에서 가드 없음. 이 파일에서 master DELETE 허용.
--      RLS-DEBT-004 완화: farm_admin/hr_admin은 본인 범위로 자동 필터, master는 앱 레벨 가드 필요.
--
-- excelExport.js 접근:
--   authenticated가 employee_id, date, check_in, check_out, work_minutes, status 등을 SELECT.
--   역할별 지점 필터가 이 SELECT에도 자동 적용됨.
-- ============================================================================

DROP POLICY IF EXISTS anon_full_access ON public.attendance;
DROP POLICY IF EXISTS anon_full_access_auth ON public.attendance;

ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;

-- ────────────────────────────────────────────────────────────────────────────
-- anon 정책 (worker 출퇴근)
-- ────────────────────────────────────────────────────────────────────────────

-- anon SELECT: 작업자 본인 출퇴근 기록 조회 (WorkerAttendancePage)
CREATE POLICY "attendance_anon_select"
ON public.attendance
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

COMMENT ON POLICY "attendance_anon_select" ON public.attendance IS
'anon SELECT: 활성 worker의 출퇴근 기록. WorkerAttendancePage 표시용.';

-- anon INSERT: 작업자 출근 기록 (check_in + GPS + date)
-- attendanceStore.js의 checkIn 흐름
CREATE POLICY "attendance_anon_insert"
ON public.attendance
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
  AND check_out IS NULL  -- INSERT 시점에 check_out은 NULL이어야 함
);

COMMENT ON POLICY "attendance_anon_insert" ON public.attendance IS
'anon INSERT: 출근 기록. check_out=NULL 강제. RLS-DEBT-010 참조.';

-- anon UPDATE: 작업자 퇴근 기록 추가 (check_out, work_minutes, status 갱신)
-- attendanceStore.js의 checkOut 흐름
CREATE POLICY "attendance_anon_update"
ON public.attendance
FOR UPDATE
TO anon
USING (
  employee_id IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.employees
    WHERE id = employee_id
      AND role = 'worker'
      AND is_active = true
  )
)
WITH CHECK (
  employee_id IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.employees
    WHERE id = employee_id
      AND role = 'worker'
      AND is_active = true
  )
);

COMMENT ON POLICY "attendance_anon_update" ON public.attendance IS
'anon UPDATE: 작업자 퇴근 등록(check_out/work_minutes/status). employee_id 변경 방지.';

-- ────────────────────────────────────────────────────────────────────────────
-- authenticated 정책 (관리자)
-- ────────────────────────────────────────────────────────────────────────────

-- authenticated SELECT: 역할별 지점 필터
-- excelExport.js의 fetchExcelData도 이 정책 적용
CREATE POLICY "attendance_authenticated_select"
ON public.attendance
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

COMMENT ON POLICY "attendance_authenticated_select" ON public.attendance IS
'authenticated SELECT: hr_admin/supervisor/master=전체, farm_admin=본인지점. 엑셀 내보내기에도 적용.';

-- authenticated UPDATE: 출퇴근 기록 수정 (작업 C — 관리자 시간 조정)
-- farm_admin: 본인 지점만, hr_admin/master: 전체
CREATE POLICY "attendance_authenticated_update"
ON public.attendance
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

COMMENT ON POLICY "attendance_authenticated_update" ON public.attendance IS
'authenticated UPDATE: 관리자 출퇴근 시간 수정. farm_admin=본인지점, supervisor=금지.';

-- authenticated DELETE: 개별 + 범위 삭제
-- farm_admin: 본인 지점만 (RLS 자동 필터 — deleteRecords 범위가 자동 좁혀짐)
-- hr_admin: 전체 (deleteRecords 범위 내에서)
-- master: 전체 (RLS-DEBT-004 — 앱 레벨 가드 필요)
-- supervisor: 금지
CREATE POLICY "attendance_authenticated_delete"
ON public.attendance
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

COMMENT ON POLICY "attendance_authenticated_delete" ON public.attendance IS
'authenticated DELETE: farm_admin=본인지점 자동필터, hr_admin=전체, master=전체(RLS-DEBT-004). supervisor=금지.';

-- ============================================================================
-- 검증 쿼리 (주석 처리)
-- ============================================================================

-- SELECT tablename, policyname, cmd, roles
-- FROM pg_policies
-- WHERE schemaname = 'public' AND tablename = 'attendance'
-- ORDER BY policyname;
-- 기대: 6개 정책
--   anon: select, insert, update (3개)
--   authenticated: select, update, delete (3개)
