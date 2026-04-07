-- 직원 테이블에 QR 디바이스 토큰 필드 추가
ALTER TABLE employees
  ADD COLUMN IF NOT EXISTS device_token TEXT UNIQUE;
