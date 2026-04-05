-- FCM 토큰 저장 테이블
CREATE TABLE IF NOT EXISTS fcm_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
  token TEXT NOT NULL,
  device_info TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(employee_id, token)
);

CREATE INDEX IF NOT EXISTS idx_fcm_tokens_emp ON fcm_tokens(employee_id);

-- RLS
ALTER TABLE fcm_tokens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anon_full_access" ON fcm_tokens FOR ALL TO anon USING (true) WITH CHECK (true);

-- Supabase Realtime 활성화 (tasks, calls, issues)
ALTER PUBLICATION supabase_realtime ADD TABLE tasks;
ALTER PUBLICATION supabase_realtime ADD TABLE calls;
ALTER PUBLICATION supabase_realtime ADD TABLE issues;

SELECT 'FCM migration complete!' AS result;
