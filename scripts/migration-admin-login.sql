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

-- 기존 관리자 계정에 기본 아이디/비밀번호 설정 (운영 전 반드시 변경)
UPDATE employees
  SET username = 'admin', password = 'admin1234'
  WHERE role = 'admin' AND username IS NULL;
