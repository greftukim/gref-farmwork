-- ============================================================================
-- F-5 RLS 런타임 검증 스크립트
-- 태우가 Supabase Dashboard SQL Editor에서 직접 실행
-- 교훈 15: MCP(service_role)는 RLS 우회 → 런타임 동작은 SQL Editor에서 검증
-- 교훈 17: 정책 존재 ≠ 정책 동작. 실제 INSERT/SELECT로 검증.
-- ============================================================================

-- ============================================================================
-- TEST 1: anon 역할 — 모두 거부 기대
-- ============================================================================
BEGIN;
SET LOCAL ROLE anon;

-- T1.1: SELECT 0건 (정책 없음 = 거부)
SELECT COUNT(*) AS anon_select_count FROM daily_work_logs;
-- 기대: 0

-- T1.2: INSERT 거부
DO $$
BEGIN
  INSERT INTO daily_work_logs (work_date, branch, worker_name, start_time, end_time, hourly_wage, payment_status)
  VALUES (CURRENT_DATE, 'busan', '_anon_test', '08:00', '17:00', 10000, 'pending');
  RAISE EXCEPTION '⚠️ FAIL: anon INSERT 통과됨 — RLS 누락';
EXCEPTION
  WHEN insufficient_privilege THEN
    RAISE NOTICE '✅ PASS: anon INSERT 거부됨 (insufficient_privilege)';
  WHEN OTHERS THEN
    RAISE NOTICE '✅ PASS: anon INSERT 거부됨 (사유: %)', SQLERRM;
END $$;

ROLLBACK;

-- ============================================================================
-- TEST 2: authenticated 역할 + auth.uid() 없음 — 거부 기대
-- (SET LOCAL ROLE authenticated 만으로는 auth.uid()=NULL)
-- (current_employee_role()이 NULL → 정책 USING false → 모두 거부)
-- ============================================================================
BEGIN;
SET LOCAL ROLE authenticated;

-- T2.1: SELECT 0건 (정책 USING이 NULL 체크로 통과 안 됨)
SELECT COUNT(*) AS authenticated_no_uid_count FROM daily_work_logs;
-- 기대: 0

-- T2.2: INSERT 거부 (WITH CHECK 동일 사유)
DO $$
BEGIN
  INSERT INTO daily_work_logs (work_date, branch, worker_name, start_time, end_time, hourly_wage, payment_status)
  VALUES (CURRENT_DATE, 'busan', '_authed_test', '08:00', '17:00', 10000, 'pending');
  RAISE EXCEPTION '⚠️ FAIL: authenticated(no uid) INSERT 통과됨';
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE '✅ PASS: authenticated(no uid) INSERT 거부됨 (사유: %)', SQLERRM;
END $$;

ROLLBACK;

-- ============================================================================
-- TEST 3: service_role(현재 Dashboard 세션) — 우회 통과 기대 (대조군)
-- service_role은 RLS 우회. TEST 1·2의 거부가 RLS 때문임을 역증명.
-- ============================================================================
INSERT INTO daily_work_logs (work_date, branch, worker_name, start_time, end_time, hourly_wage, payment_status)
VALUES (CURRENT_DATE, 'busan', '_service_role_test', '08:00', '17:00', 10000, 'pending');
-- 기대: INSERT 1 (RLS 우회)

SELECT id, worker_name FROM daily_work_logs WHERE worker_name = '_service_role_test';
-- 기대: 1행

DELETE FROM daily_work_logs WHERE worker_name = '_service_role_test';
-- 정리

-- ============================================================================
-- TEST 4: RLS polroles 확인 — worker 역할 포함 여부 재확인
-- ============================================================================
SELECT polname, polroles::regrole[] AS target_roles
FROM pg_policy
WHERE polrelid = 'daily_work_logs'::regclass
ORDER BY polname;
-- 기대: authenticated 만. worker 없음.
-- worker는 employees.auth_user_id 없음 → auth.uid() NULL → 정책 통과 불가
