-- 작업 3: 연장근무 신청 기능 - overtime_requests 테이블 신설

CREATE TABLE overtime_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  date date NOT NULL,
  hours int NOT NULL DEFAULT 0 CHECK (hours >= 0 AND hours <= 12),
  minutes int NOT NULL DEFAULT 0 CHECK (minutes IN (0, 15, 30, 45)),
  reason text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by uuid REFERENCES employees(id),
  reviewed_at timestamptz,
  adjusted_by_reviewer boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- 같은 날 pending/approved 중복 방지 (rejected는 여러 개 허용)
CREATE UNIQUE INDEX overtime_requests_active_unique
  ON overtime_requests (employee_id, date)
  WHERE status IN ('pending', 'approved');

-- 조회 성능 인덱스
CREATE INDEX overtime_requests_employee_date_idx
  ON overtime_requests (employee_id, date);

CREATE INDEX overtime_requests_status_idx
  ON overtime_requests (status);

-- RLS: 다른 테이블과 동일하게 anon_full_access (RLS 전면 재설계는 별도 작업)
ALTER TABLE overtime_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY anon_full_access ON overtime_requests
  FOR ALL
  TO anon
  USING (true)
  WITH CHECK (true);
