-- ============================================================
-- Track J-4-DB: 신규 3컬럼 추가 (생년월일, 계약만료일, 주민번호)
-- 세션 16 (2026-04-15)
-- 실행 환경: Supabase SQL Editor (이미 실행 완료 — 파일은 기록용)
-- ============================================================

ALTER TABLE employees ADD COLUMN birth_date date;
ALTER TABLE employees ADD COLUMN contract_end_date date;
ALTER TABLE employees ADD COLUMN resident_id text;

COMMENT ON COLUMN employees.birth_date IS '생년월일 (목록·상세 모달 표시)';
COMMENT ON COLUMN employees.contract_end_date IS '계약만료일 (정규직은 NULL, 계약직은 만료 date)';
COMMENT ON COLUMN employees.resident_id IS '주민등록번호 (상세 모달에서만 입력/표시, 보안 민감)';
