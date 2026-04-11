-- RLS-DEBT-019: safety_checks_anon_select 날짜 narrowing (완화 — 근본 해소 아님)
-- 목적: 과거 TBM 기록의 anon 노출 표면 축소.
--       branch/worker 단위 격리는 anon 모델(auth.uid()=null)에서 DB 레벨 구현 불가.
--       근본 해소(worker 단위 격리)는 device_token claim 기반 RLS 재설계 필요 → RLS-DEBT-021.
-- timezone 검증 완료: CURRENT_DATE = KST 날짜 (UTC+9 부산LAB 운영시간 내 일치)
-- 클라이언트 영향: getTodayCheck는 .eq('date', today) 사용 → 단일 등호 조건 통과, 회귀 없음.
-- 검증 방법: 외부 SELECT로 분리 (docs/_snapshots/session3_rls_debt_019_verification.md)

BEGIN;

DROP POLICY IF EXISTS safety_checks_anon_select ON safety_checks;

CREATE POLICY safety_checks_anon_select ON safety_checks
  FOR SELECT
  TO anon
  USING (
    date = CURRENT_DATE
    AND EXISTS (
      SELECT 1 FROM employees
      WHERE employees.id = safety_checks.worker_id
        AND employees.role = 'worker'
        AND employees.is_active = true
    )
  );

COMMIT;

-- ── 롤백 ──────────────────────────────────────────────────────────────────
-- DROP POLICY IF EXISTS safety_checks_anon_select ON safety_checks;
-- CREATE POLICY safety_checks_anon_select ON safety_checks
--   FOR SELECT TO anon
--   USING (
--     EXISTS (
--       SELECT 1 FROM employees
--       WHERE employees.id = safety_checks.worker_id
--         AND employees.role = 'worker'
--         AND employees.is_active = true
--     )
--   );
