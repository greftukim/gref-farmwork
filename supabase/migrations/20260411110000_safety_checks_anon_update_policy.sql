-- ============================================================================
-- 트랙 E-5c 핫픽스: safety_checks 작업자 self-update 정책 추가
-- 배경: E-1에서 anon UPDATE 정책 누락. confirmRisks가 조용히 실패하여
--       shown_risks/risks_confirmed_at이 NULL로 남는 버그 발생.
-- 원칙: worker_id 일치하는 pre_task 레코드에 한해 위험 확인 필드만 갱신 허용.
--       승인 관련 필드(status, approved_by, approved_at)는 기존 정책 유지.
-- ============================================================================

BEGIN;

CREATE POLICY "safety_checks_anon_confirm_risks" ON safety_checks
  FOR UPDATE
  TO anon
  USING (
    check_type = 'pre_task'
    AND status = 'submitted'
    AND date >= CURRENT_DATE - INTERVAL '1 day'  -- 오늘/어제만, 과거 조작 방지
  )
  WITH CHECK (
    check_type = 'pre_task'
    AND status = 'submitted'  -- 승인 후에는 수정 불가
  );

COMMIT;

-- ============================================================================
-- 롤백
-- BEGIN;
-- DROP POLICY IF EXISTS "safety_checks_anon_confirm_risks" ON safety_checks;
-- COMMIT;
-- ============================================================================
