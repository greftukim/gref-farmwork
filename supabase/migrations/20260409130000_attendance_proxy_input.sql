-- ============================================================================
-- attendance 대리 입력 지원: 스키마 확장 + RLS INSERT 정책
-- 트랙 B 작업 1 (Phase 2 근태 기능 확장)
-- 작성일: 2026-04-09
-- 선행 작업: 20260408127000_rls_group_f2_attendance.sql
--
-- 목적:
-- 관리자가 attendance 레코드를 직접 INSERT할 수 있도록 지원한다.
-- 시나리오: 작업자가 앱으로 기록하지 못한 날(깜빡함, 기기 오류, 소급 입력 등)에
-- 관리자가 대리로 출퇴근 기록을 생성.
--
-- 설계 결정:
-- 1. input_method(VARCHAR) 대신 is_proxy(BOOLEAN)로 단순화.
--    admin_edit(기존 기록 시각 수정) 시나리오는 실운영 검증 전까지 보류.
-- 2. is_proxy = true 강제는 WITH CHECK에서 처리.
--    input_by = current_employee_id() 강제는 앱 레벨 가드 (RLS-DEBT-016).
-- 3. 기존 F2 정책 및 UPDATE/DELETE 경로는 건드리지 않음.
--
-- F2 마이그레이션(20260408127000) 주석에 RLS-DEBT-007로 언급된
-- "관리자 대리 입력 INSERT 정책"이 이 마이그레이션으로 해소됨.
-- (주: F2 주석의 RLS-DEBT-007 번호는 부록 A의 동일 번호와 충돌. 실제 해소
-- 대상은 "attendance authenticated INSERT 정책 부재"이며, 현재 부록 A의
-- RLS-DEBT-016으로 승계된다.)
--
-- 롤백: rollback_20260409130000_attendance_proxy_input.sql
-- ============================================================================

-- ═══════════════════ 1. 스키마 확장 ═══════════════════

ALTER TABLE public.attendance
  ADD COLUMN input_by UUID REFERENCES public.employees(id) ON DELETE SET NULL,
  ADD COLUMN is_proxy BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN public.attendance.input_by IS
'대리 입력자(관리자) employees.id. is_proxy=true일 때만 의미 있음.
대리 입력자가 삭제되면 NULL (ON DELETE SET NULL).';

COMMENT ON COLUMN public.attendance.is_proxy IS
'관리자 대리 입력 여부. false=작업자 앱 기록(기본), true=관리자가 대리 생성.
RLS authenticated INSERT 정책이 이 값을 true로 강제.';

-- ═══════════════════ 2. RLS INSERT 정책 신규 ═══════════════════

CREATE POLICY "attendance_authenticated_insert"
ON public.attendance
FOR INSERT
TO authenticated
WITH CHECK (
  -- is_proxy = true 강제: 관리자 INSERT는 반드시 대리 입력으로만
  is_proxy = true
  AND (
    -- farm_admin: 본인 지점 소속 작업자만 대리 입력
    (
      public.current_employee_role() = 'farm_admin'
      AND employee_id IN (
        SELECT id FROM public.employees WHERE branch = public.current_employee_branch()
      )
    )
    -- hr_admin, master: 전 지점 대리 입력
    OR public.current_employee_role() IN ('hr_admin', 'master')
  )
);

COMMENT ON POLICY "attendance_authenticated_insert" ON public.attendance IS
'관리자 대리 입력용 INSERT 정책. is_proxy=true 강제.
farm_admin: 본인 지점 작업자만. hr_admin/master: 전 지점. supervisor: 금지.
input_by = current_employee_id() 강제는 앱 레벨 가드 (RLS-DEBT-016).';
