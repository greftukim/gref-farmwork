-- ============================================================
-- 근태 승인 권한 이관: 2단계 → 1단계 (재배팀 단독 승인)
-- 실행 위치: Supabase SQL Editor
-- ============================================================

-- 1. 기존 farm_approved / hr_approved 상태를 approved로 통합
UPDATE leave_requests
SET status = 'approved'
WHERE status IN ('farm_approved', 'hr_approved');

-- 2. hr_reviewed_by, hr_reviewed_at 컬럼은 과거 데이터 보존을 위해 그대로 유지 (NULL 허용)

-- ============================================================
-- RLS 정책 재작성
-- ※ 아래 DROP POLICY 이름은 실제 DB 정책명과 다를 수 있음.
--   Supabase Dashboard > Authentication > Policies 에서 확인 후 맞게 수정.
-- ============================================================

-- 기존 관리팀 UPDATE 권한 정책 삭제 (있는 경우)
DROP POLICY IF EXISTS "관리팀 근태 승인" ON leave_requests;
DROP POLICY IF EXISTS "관리팀 근태 수정" ON leave_requests;
DROP POLICY IF EXISTS "hr 근태 최종 승인" ON leave_requests;

-- 관리팀은 SELECT만 허용 (전체 지점 조회)
CREATE POLICY "관리팀 근태 전체 조회" ON leave_requests
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM employees
      WHERE employees.id = auth.uid()
        AND employees.team = '관리팀'
    )
  );

-- 재배팀 UPDATE 정책 (farm_reviewed_by/at + status 업데이트)
-- 기존 정책이 있으면 재생성
DROP POLICY IF EXISTS "재배팀 근태 1차 승인" ON leave_requests;
DROP POLICY IF EXISTS "재배팀 근태 승인" ON leave_requests;

CREATE POLICY "재배팀 근태 승인" ON leave_requests
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM employees
      WHERE employees.id = auth.uid()
        AND employees.team = '재배팀'
    )
  );
