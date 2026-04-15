-- ============================================================
-- Track J: CHECK 제약 확장 (branch 3→6종, role 5→6종)
-- 세션 16 (2026-04-15)
-- 실행 환경: Supabase SQL Editor
-- ============================================================

-- branch CHECK 제약 확장 (3종 → 6종)
ALTER TABLE employees DROP CONSTRAINT employees_branch_check;
ALTER TABLE employees ADD CONSTRAINT employees_branch_check
  CHECK (branch = ANY (ARRAY['busan', 'jinju', 'hadong', 'headquarters', 'management', 'seedlab']));

-- role CHECK 제약 확장 (5종 → 6종)
ALTER TABLE employees DROP CONSTRAINT employees_role_check;
ALTER TABLE employees ADD CONSTRAINT employees_role_check
  CHECK (role = ANY (ARRAY['worker', 'farm_admin', 'hr_admin', 'supervisor', 'master', 'general']));
