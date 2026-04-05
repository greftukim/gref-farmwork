-- GREF FarmWork DB Migration
-- Supabase SQL Editor에서 실행하세요

-- 1. UUID 확장 활성화
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. employees (직원)
CREATE TABLE IF NOT EXISTS employees (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(50) NOT NULL,
  emp_no VARCHAR(20),
  phone VARCHAR(20),
  role VARCHAR(10) NOT NULL CHECK (role IN ('admin','worker')),
  job_type VARCHAR(50),
  hire_date DATE,
  work_hours_per_week INT DEFAULT 40,
  annual_leave_days INT DEFAULT 15,
  pin_code VARCHAR(6),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. attendance (출퇴근)
CREATE TABLE IF NOT EXISTS attendance (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID REFERENCES employees(id),
  date DATE NOT NULL,
  check_in TIMESTAMPTZ,
  check_out TIMESTAMPTZ,
  work_minutes INT,
  status VARCHAR(20) DEFAULT 'normal',
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(employee_id, date)
);

-- 4. leave_requests (휴가 신청)
CREATE TABLE IF NOT EXISTS leave_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID REFERENCES employees(id),
  date DATE NOT NULL,
  type VARCHAR(20) NOT NULL,
  reason TEXT NOT NULL,
  status VARCHAR(20) DEFAULT 'pending',
  reviewed_by UUID REFERENCES employees(id),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. leave_balances (휴가 잔여)
CREATE TABLE IF NOT EXISTS leave_balances (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID REFERENCES employees(id),
  year INT NOT NULL,
  total_days DECIMAL(4,1),
  used_days DECIMAL(4,1) DEFAULT 0,
  UNIQUE(employee_id, year)
);

-- 6. zones (구역)
CREATE TABLE IF NOT EXISTS zones (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(50) NOT NULL,
  description TEXT,
  row_count INT,
  plant_count INT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 7. crops (작물)
CREATE TABLE IF NOT EXISTS crops (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(50) NOT NULL,
  task_types JSONB NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 8. tasks (작업)
CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  worker_id UUID REFERENCES employees(id),
  title VARCHAR(200) NOT NULL,
  date DATE NOT NULL,
  zone_id UUID REFERENCES zones(id),
  row_range VARCHAR(20),
  crop_id UUID REFERENCES crops(id),
  task_type VARCHAR(50),
  description TEXT,
  estimated_minutes INT,
  quantity DECIMAL(10,2),
  quantity_unit VARCHAR(20),
  status VARCHAR(20) DEFAULT 'pending',
  assigned_at TIMESTAMPTZ DEFAULT now(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  duration_minutes INT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 9. growth_surveys (생육 조사)
CREATE TABLE IF NOT EXISTS growth_surveys (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  worker_id UUID REFERENCES employees(id),
  survey_date DATE NOT NULL,
  zone_id UUID REFERENCES zones(id),
  row_number INT,
  plant_number INT,
  plant_height DECIMAL(6,1),
  stem_diameter DECIMAL(5,1),
  leaf_count INT,
  truss_number INT,
  fruit_count INT,
  fruit_weight DECIMAL(6,1),
  notes TEXT,
  photos JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 10. issues (이상 신고)
CREATE TABLE IF NOT EXISTS issues (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  worker_id UUID REFERENCES employees(id),
  zone_id UUID REFERENCES zones(id),
  type VARCHAR(50) NOT NULL,
  comment TEXT,
  photo TEXT,
  is_resolved BOOLEAN DEFAULT false,
  resolved_by UUID REFERENCES employees(id),
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 11. calls (긴급 호출)
CREATE TABLE IF NOT EXISTS calls (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  worker_id UUID REFERENCES employees(id),
  type VARCHAR(50) NOT NULL,
  memo TEXT,
  is_confirmed BOOLEAN DEFAULT false,
  confirmed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 12. notices (공지사항)
CREATE TABLE IF NOT EXISTS notices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title VARCHAR(200) NOT NULL,
  body TEXT NOT NULL,
  priority VARCHAR(20) DEFAULT 'normal',
  created_by UUID REFERENCES employees(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 13. schedules (주간 일정)
CREATE TABLE IF NOT EXISTS schedules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID REFERENCES employees(id),
  date DATE NOT NULL,
  start_time VARCHAR(5),
  end_time VARCHAR(5),
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(employee_id, date)
);

-- 14. 인덱스
CREATE INDEX IF NOT EXISTS idx_attendance_emp_date ON attendance(employee_id, date);
CREATE INDEX IF NOT EXISTS idx_tasks_worker_date ON tasks(worker_id, date);
CREATE INDEX IF NOT EXISTS idx_tasks_status_date ON tasks(status, date);
CREATE INDEX IF NOT EXISTS idx_leave_requests_emp ON leave_requests(employee_id, status);
CREATE INDEX IF NOT EXISTS idx_growth_surveys_date ON growth_surveys(survey_date, zone_id);

-- 15. RLS 활성화
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE leave_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE leave_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE crops ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE growth_surveys ENABLE ROW LEVEL SECURITY;
ALTER TABLE issues ENABLE ROW LEVEL SECURITY;
ALTER TABLE calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE notices ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedules ENABLE ROW LEVEL SECURITY;

-- 16. RLS 정책: anon 사용자에게 전체 접근 허용 (사내 앱, 10명 이내)
-- 향후 Supabase Auth 연동 시 세분화
CREATE POLICY "anon_full_access" ON employees FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_full_access" ON attendance FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_full_access" ON leave_requests FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_full_access" ON leave_balances FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_full_access" ON zones FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_full_access" ON crops FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_full_access" ON tasks FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_full_access" ON growth_surveys FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_full_access" ON issues FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_full_access" ON calls FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_full_access" ON notices FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_full_access" ON schedules FOR ALL TO anon USING (true) WITH CHECK (true);

-- 17. 시드 데이터: 직원
INSERT INTO employees (name, emp_no, phone, role, job_type, hire_date, work_hours_per_week, annual_leave_days, pin_code, is_active) VALUES
  ('관리자', 'A001', '010-1234-0000', 'admin', '관리', '2024-01-15', 40, 15, '000000', true),
  ('김민국', 'W001', '010-1234-1111', 'worker', '재배', '2024-03-01', 40, 15, '111111', true),
  ('이강모', 'W002', '010-1234-2222', 'worker', '재배', '2024-03-01', 40, 15, '222222', true),
  ('박민식', 'W003', '010-1234-3333', 'worker', '재배', '2024-04-15', 40, 15, '333333', true),
  ('최수진', 'W004', '010-1234-4444', 'worker', '관리', '2024-06-01', 40, 15, '444444', true);

-- 18. 시드 데이터: 작물
INSERT INTO crops (name, task_types, is_active) VALUES
  ('토마토', '["수확", "유인·결속", "적엽", "병해충 예찰", "EC/pH 측정", "수분 작업"]', true),
  ('오이', '["수확", "유인·결속", "적엽", "병해충 예찰", "EC/pH 측정"]', true),
  ('미니파프리카', '["수확", "유인·결속", "적엽", "병해충 예찰", "EC/pH 측정", "수분 작업"]', true),
  ('딸기', '["수확", "러너 정리", "적엽", "병해충 예찰", "EC/pH 측정"]', true);

-- 19. 시드 데이터: 구역
INSERT INTO zones (name, description, row_count, plant_count) VALUES
  ('A동', '토마토 재배동', 20, 400),
  ('B동', '오이·파프리카 재배동', 16, 320),
  ('C동', '딸기 재배동', 24, 600);

-- 20. 시드 데이터: 휴가 잔여 (직원 ID를 서브쿼리로 참조)
INSERT INTO leave_balances (employee_id, year, total_days, used_days)
SELECT id, 2026, 15, 3 FROM employees WHERE emp_no = 'W001'
UNION ALL
SELECT id, 2026, 15, 2 FROM employees WHERE emp_no = 'W002'
UNION ALL
SELECT id, 2026, 15, 1 FROM employees WHERE emp_no = 'W003'
UNION ALL
SELECT id, 2026, 15, 4 FROM employees WHERE emp_no = 'W004';

-- 21. 시드 데이터: 공지사항
INSERT INTO notices (title, body, priority, created_by, created_at)
SELECT '4월 방제 일정 안내', '4월 8일(화) 오전 6시~8시 전 동 일제 방제 예정입니다. 방제 후 2시간 동안 온실 출입을 자제해 주세요.', 'important', id, now() - interval '2 days'
FROM employees WHERE emp_no = 'A001'
UNION ALL
SELECT '안전 장비 착용 안내', '작업 시 반드시 장갑, 안전화를 착용해 주세요. 미착용 시 작업 참여가 제한될 수 있습니다.', 'normal', id, now() - interval '5 days'
FROM employees WHERE emp_no = 'A001'
UNION ALL
SELECT '긴급: 내일 태풍 대비', '내일 오후부터 강풍이 예상됩니다. 오전 중 온실 문 잠금 및 외부 자재 정리를 완료해 주세요.', 'urgent', id, now() - interval '1 day'
FROM employees WHERE emp_no = 'A001';

SELECT 'Migration complete!' AS result;
