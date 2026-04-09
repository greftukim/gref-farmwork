-- ============================================================================
-- hr_admin 연장근무 시간 수정 정책 추가
-- 트랙 A 작업 3 (Phase 2 연장근무 기능 확장)
-- 작성일: 2026-04-09
-- 선행 작업: 20260408126000_rls_group_f1_leave_overtime.sql
--
-- 목적:
-- hr_admin에게 승인된(approved) overtime_requests의 시간 수정 권한을 부여한다.
-- 기존 F1 정책은 건드리지 않고 신규 정책만 추가한다.
-- 여러 RLS 정책은 OR로 결합되므로, hr_admin은 이 신규 정책 경로로 UPDATE 가능.
--
-- 제한:
-- - USING: status='approved' + hr_admin만
-- - WITH CHECK: status='approved' (수정 후에도 승인 상태 유지 강제)
-- - 컬럼 레벨 제한은 앱 레벨에서 (RLS-DEBT-015 신설)
--
-- 롤백: rollback_20260409120000_rls_overtime_hr_admin_update.sql
-- ============================================================================

-- hr_admin 전용 UPDATE 정책 추가
CREATE POLICY overtime_requests_hr_admin_update
ON public.overtime_requests
FOR UPDATE
TO authenticated
USING (
  public.current_employee_role() = 'hr_admin'
  AND status = 'approved'
)
WITH CHECK (
  public.current_employee_role() = 'hr_admin'
  AND status = 'approved'
);

COMMENT ON POLICY overtime_requests_hr_admin_update ON public.overtime_requests IS
'hr_admin이 승인된 연장근무의 hours/minutes를 사후 수정할 수 있도록 허용. 승인/반려 권한은 여전히 farm_admin 전속. 컬럼 레벨 제한은 앱 레벨 (RLS-DEBT-015).';
