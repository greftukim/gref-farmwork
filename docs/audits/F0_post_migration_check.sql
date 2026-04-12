-- ============================================================================
-- F-0 적용 후 검증 쿼리
-- 태우가 Supabase Dashboard SQL Editor에서 직접 실행할 것
-- 마이그레이션: 20260412100000_track_f_daily_work_logs.sql
-- 기대 컬럼 수: 16개 (id 포함)
-- ============================================================================

-- 1. 테이블 존재 확인 (결과: 1행)
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name = 'daily_work_logs';

-- 2. 컬럼 정의 확인 (결과: 16행, 순서대로)
--    id / work_date / branch / worker_name / worker_phone /
--    start_time / end_time / break_minutes / work_minutes /
--    hourly_wage / daily_wage / work_description / payment_status /
--    paid_at / created_at / updated_at
SELECT column_name, data_type, is_nullable, column_default, is_generated
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'daily_work_logs'
ORDER BY ordinal_position;

-- 3. GENERATED 컬럼 확인 (결과: 2행 — work_minutes, daily_wage)
SELECT column_name, generation_expression
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'daily_work_logs'
  AND is_generated = 'ALWAYS'
ORDER BY ordinal_position;

-- 4. RLS 활성화 확인 (결과: relrowsecurity = true)
SELECT relname, relrowsecurity
FROM pg_class
WHERE relname = 'daily_work_logs';

-- 5. RLS 정책 확인 (결과: 2행 — farm_admin, hr_admin_master)
SELECT polname, polpermissive, polcmd
FROM pg_policy
WHERE polrelid = 'daily_work_logs'::regclass
ORDER BY polname;

-- 6. payment_status enum 값 확인 (결과: 2행 — pending, paid)
SELECT enumlabel
FROM pg_enum
WHERE enumtypid = 'payment_status'::regtype
ORDER BY enumsortorder;

-- 7. 인덱스 확인 (결과: 2행 — branch_date, payment_status)
SELECT indexname
FROM pg_indexes
WHERE tablename = 'daily_work_logs'
ORDER BY indexname;

-- 8. 트리거 확인 (결과: 1행 — trg_daily_work_logs_updated_at)
SELECT trigger_name, event_manipulation, action_timing
FROM information_schema.triggers
WHERE event_object_table = 'daily_work_logs'
ORDER BY trigger_name;

-- 9. GENERATED 컬럼 계산 동작 검증 (service_role로 실행, RLS 우회)
--    아래 INSERT 후 work_minutes=450, daily_wage=75000 인지 확인
--    (08:00~16:30, 휴게 30분 → 450분, 10000원/시 → 75000원)
-- INSERT INTO daily_work_logs
--   (work_date, branch, worker_name, start_time, end_time, break_minutes, hourly_wage, payment_status)
-- VALUES
--   (CURRENT_DATE, 'busan', '테스트작업자', '08:00', '16:30', 30, 10000, 'pending');
-- SELECT worker_name, work_minutes, daily_wage FROM daily_work_logs WHERE worker_name = '테스트작업자';
-- DELETE FROM daily_work_logs WHERE worker_name = '테스트작업자';

-- 10. RLS 동작 검증 — service_role(MCP)은 RLS 우회이므로 앱 실기기로 검증 권고 (교훈 15)
--     farm_admin 계정 로그인 후: 본인 branch INSERT 성공, 타 branch INSERT 실패 기대
--     hr_admin / master: 전 branch 접근 성공 기대
--     worker / anon: 모든 접근 실패 기대
