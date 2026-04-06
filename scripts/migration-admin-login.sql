-- 관리자용 아이디/비밀번호 로그인 지원을 위한 employees 테이블 확장
-- 실행: Supabase SQL Editor에서 실행

-- username, password 컬럼 추가
ALTER TABLE employees
  ADD COLUMN IF NOT EXISTS username TEXT,
  ADD COLUMN IF NOT EXISTS password TEXT;

-- username 유니크 인덱스 (NULL 허용 — 작업자는 username 없음)
CREATE UNIQUE INDEX IF NOT EXISTS idx_employees_username
  ON employees (username)
  WHERE username IS NOT NULL;

-- 기존 '관리자' 시드 계정을 재배팀 김현도로 변경
UPDATE employees
  SET name = '김현도', username = 'hyundo', password = '1234'
  WHERE emp_no = 'A001';

-- 관리팀 김지현: 이미 있으면 업데이트, 없으면 추가
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM employees WHERE emp_no = 'A002') THEN
    UPDATE employees SET name = '김지현', username = 'jihyun', password = '1234' WHERE emp_no = 'A002';
  ELSE
    INSERT INTO employees (name, emp_no, phone, role, job_type, hire_date, work_hours_per_week, annual_leave_days, pin_code, is_active, username, password)
    VALUES ('김지현', 'A002', '010-1234-0001', 'admin', '관리', '2024-01-15', 40, 15, '000001', true, 'jihyun', '1234');
  END IF;
END $$;
