-- ============================================================
-- Track J Part A: DDL + DML (컬럼 추가 + 기존 데이터 정리)
-- 세션 16 (2026-04-15)
-- 실행 환경: Supabase SQL Editor
-- ============================================================

-- DDL: 직책·직급 컬럼 추가
ALTER TABLE employees ADD COLUMN job_title text;
ALTER TABLE employees ADD COLUMN job_rank text;

-- DML-1: job_type 영문 통일
UPDATE employees SET job_type = 'worker' WHERE job_type = '재배';
UPDATE employees SET job_type = 'admin' WHERE job_type = '관리';

-- DML-2: job_type NULL 처리 (사전 검증 결과: 7건 전부 admin 계열, worker 0건)
UPDATE employees SET job_type = 'admin'
  WHERE job_type IS NULL
  AND role IN ('farm_admin', 'hr_admin', 'master', 'supervisor');

UPDATE employees SET job_type = 'worker'
  WHERE job_type IS NULL
  AND role = 'worker';

-- DML-3: supervisor 비활성화 (2건: 총괄1, 총괄2)
UPDATE employees SET is_active = false WHERE role = 'supervisor';
