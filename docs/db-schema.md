# DB 스키마 (Supabase PostgreSQL)

## employees (직원)
```sql
CREATE TABLE employees (
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
```

## attendance (출퇴근)
```sql
CREATE TABLE attendance (
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
```

## leave_requests (휴가 신청)
```sql
CREATE TABLE leave_requests (
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
```

## leave_balances (휴가 잔여)
```sql
CREATE TABLE leave_balances (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID REFERENCES employees(id),
  year INT NOT NULL,
  total_days DECIMAL(4,1),
  used_days DECIMAL(4,1) DEFAULT 0,
  remaining_days DECIMAL(4,1) GENERATED ALWAYS AS (total_days - used_days) STORED,
  UNIQUE(employee_id, year)
);
```

## zones (구역)
```sql
CREATE TABLE zones (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(50) NOT NULL,
  description TEXT,
  row_count INT,
  plant_count INT,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

## crops (작물)
```sql
CREATE TABLE crops (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(50) NOT NULL,
  task_types JSONB NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

## tasks (작업)
```sql
CREATE TABLE tasks (
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
```

## growth_surveys (생육 조사)
```sql
CREATE TABLE growth_surveys (
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
```

## issues (이상 신고)
```sql
CREATE TABLE issues (
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
```

## calls (긴급 호출)
```sql
CREATE TABLE calls (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  worker_id UUID REFERENCES employees(id),
  type VARCHAR(50) NOT NULL,
  memo TEXT,
  is_confirmed BOOLEAN DEFAULT false,
  confirmed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

## notices (공지사항)
```sql
CREATE TABLE notices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title VARCHAR(200) NOT NULL,
  body TEXT NOT NULL,
  priority VARCHAR(20) DEFAULT 'normal',
  created_by UUID REFERENCES employees(id),
  created_at TIMESTAMPTZ DEFAULT now()
);
```

## ai_suggestions (AI 작업 제안 — 향후)
```sql
CREATE TABLE ai_suggestions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  suggestion_date DATE,
  task_type VARCHAR(50),
  zone_id UUID REFERENCES zones(id),
  recommended_qty DECIMAL(10,2),
  quantity_unit VARCHAR(20),
  confidence DECIMAL(3,2),
  reasoning TEXT,
  model_version VARCHAR(50),
  status VARCHAR(20) DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT now()
);
```

## 인덱스
```sql
CREATE INDEX idx_attendance_emp_date ON attendance(employee_id, date);
CREATE INDEX idx_tasks_worker_date ON tasks(worker_id, date);
CREATE INDEX idx_tasks_status_date ON tasks(status, date);
CREATE INDEX idx_leave_requests_emp ON leave_requests(employee_id, status);
CREATE INDEX idx_growth_surveys_date ON growth_surveys(survey_date, zone_id);
```
