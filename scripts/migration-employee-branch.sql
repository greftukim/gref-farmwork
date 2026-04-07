-- employees 테이블에 근무 지점 및 근무 시간 컬럼 추가
-- branch: 근무 지점 코드 (busan / jinju / hadong)
-- work_start_time: 출근 기준 시간 (지각 판단)
-- work_end_time: 퇴근 가능 시간 (조기 퇴근 차단)

ALTER TABLE employees
  ADD COLUMN IF NOT EXISTS branch TEXT CHECK (branch IN ('busan', 'jinju', 'hadong')),
  ADD COLUMN IF NOT EXISTS work_start_time TIME,
  ADD COLUMN IF NOT EXISTS work_end_time TIME;

COMMENT ON COLUMN employees.branch          IS '근무 지점 (busan/jinju/hadong)';
COMMENT ON COLUMN employees.work_start_time IS '출근 기준 시간 — 이후 출근 시 지각 처리';
COMMENT ON COLUMN employees.work_end_time   IS '퇴근 가능 시간 — 이전 퇴근 시도 시 차단';
