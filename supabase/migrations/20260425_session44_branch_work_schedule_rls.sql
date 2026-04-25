-- session44: branch_work_schedule_config RLS 정책 신설
-- RLS enabled (true) 상태이나 policy 0건 → 전면 접근 차단 상태였음
-- SELECT: is_admin_level() (farm_admin 포함 모든 관리자 읽기)
-- UPDATE: can_view_all_branches() (hr_admin/supervisor/master/general — HQ_ROLES 일치)
-- INSERT/DELETE 불필요: 세션 42 시드 3행(busan/jinju/hadong) 고정
-- ROLLBACK: DROP POLICY if exists (아래 롤백 주석 참조)

BEGIN;

-- SELECT 정책: 모든 관리자 레벨 읽기 허용
CREATE POLICY "branch_work_schedule_admin_select"
  ON branch_work_schedule_config
  FOR SELECT
  TO authenticated
  USING (is_admin_level());

-- UPDATE 정책: HQ 역할만 수정 허용 (can_view_all_branches = HQ_ROLES)
CREATE POLICY "branch_work_schedule_hq_update"
  ON branch_work_schedule_config
  FOR UPDATE
  TO authenticated
  USING (can_view_all_branches())
  WITH CHECK (can_view_all_branches());

-- 검증
DO $$
DECLARE
  policy_count INT;
BEGIN
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE tablename = 'branch_work_schedule_config';

  IF policy_count < 2 THEN
    RAISE EXCEPTION '정책 신설 실패: expected >= 2, got %', policy_count;
  END IF;
  RAISE NOTICE 'OK: branch_work_schedule_config 정책 % 건', policy_count;
END $$;

COMMIT;

-- ROLLBACK:
-- DROP POLICY IF EXISTS "branch_work_schedule_admin_select" ON branch_work_schedule_config;
-- DROP POLICY IF EXISTS "branch_work_schedule_hq_update" ON branch_work_schedule_config;
