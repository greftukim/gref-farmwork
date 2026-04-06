-- 지점(사업장) 관리 마이그레이션
-- 실행: Supabase SQL Editor에서 실행

-- 1. branches 테이블
CREATE TABLE IF NOT EXISTS branches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code VARCHAR(20) NOT NULL UNIQUE,
  name VARCHAR(50) NOT NULL,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  radius_meters INT DEFAULT 200,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS
ALTER TABLE branches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "branches_all" ON branches FOR ALL USING (true) WITH CHECK (true);

-- 시드 데이터: 3개 지점
INSERT INTO branches (code, name, latitude, longitude, radius_meters) VALUES
  ('busan', '부산LAB', 35.1796, 129.0756, 200),
  ('jinju', '진주', 35.1800, 128.1076, 200),
  ('hadong', '하동', 35.0674, 127.7514, 200)
ON CONFLICT (code) DO NOTHING;

-- 2. employees 테이블에 branch 필드 추가
ALTER TABLE employees
  ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES branches(id);

-- 3. zones 테이블에 branch 필드 추가
ALTER TABLE zones
  ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES branches(id);

-- 기존 직원/구역을 부산LAB으로 설정
UPDATE employees SET branch_id = (SELECT id FROM branches WHERE code = 'busan') WHERE branch_id IS NULL;
UPDATE zones SET branch_id = (SELECT id FROM branches WHERE code = 'busan') WHERE branch_id IS NULL;
