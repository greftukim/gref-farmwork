-- ═══════════════════════════════════════════════════════════
-- Phase 3C: 작업자 성과
-- p3a.sql 실행 완료 후 실행할 것 (crops 테이블 필요)
-- ═══════════════════════════════════════════════════════════

-- ─── STEP 1: SAM 표준공수 테이블 ───
CREATE TABLE IF NOT EXISTS sam_standards (
  id                  uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  crop_id             uuid    NOT NULL REFERENCES crops(id),
  task_type           text    NOT NULL,
  minutes_per_plant   numeric NOT NULL,
  created_at          timestamptz DEFAULT now(),
  UNIQUE(crop_id, task_type)
);

-- ─── STEP 2: 수확 기록 테이블 ───
CREATE TABLE IF NOT EXISTS harvest_records (
  id           uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id  uuid    NOT NULL REFERENCES employees(id),
  crop_id      uuid    NOT NULL REFERENCES crops(id),
  date         date    NOT NULL,
  quantity     numeric NOT NULL,
  unit         text    NOT NULL DEFAULT 'kg',
  created_at   timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_harvest_employee_date ON harvest_records(employee_id, date);

-- ─── STEP 3: RLS ───
ALTER TABLE sam_standards   ENABLE ROW LEVEL SECURITY;
ALTER TABLE harvest_records ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='sam_standards' AND policyname='sam_standards_admin_all') THEN
    CREATE POLICY "sam_standards_admin_all"    ON sam_standards FOR ALL    USING (is_admin_level());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='sam_standards' AND policyname='sam_standards_anon_select') THEN
    CREATE POLICY "sam_standards_anon_select"  ON sam_standards FOR SELECT TO anon USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='harvest_records' AND policyname='harvest_records_admin_all') THEN
    CREATE POLICY "harvest_records_admin_all"    ON harvest_records FOR ALL    USING (is_admin_level());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='harvest_records' AND policyname='harvest_records_anon_insert') THEN
    CREATE POLICY "harvest_records_anon_insert"  ON harvest_records FOR INSERT TO anon WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='harvest_records' AND policyname='harvest_records_anon_select') THEN
    CREATE POLICY "harvest_records_anon_select"  ON harvest_records FOR SELECT TO anon USING (true);
  END IF;
END $$;

-- ─── STEP 4: SAM 시드 (7작물 × 10작업 = 70행) ───
-- Performance.jsx의 SAM 상수 그대로 반영
INSERT INTO sam_standards (crop_id, task_type, minutes_per_plant) VALUES
-- 토마토
((SELECT id FROM crops WHERE name='토마토'), '정식',     0.30),
((SELECT id FROM crops WHERE name='토마토'), '유인',     0.24),
((SELECT id FROM crops WHERE name='토마토'), '적엽',     0.18),
((SELECT id FROM crops WHERE name='토마토'), '적화',     0.22),
((SELECT id FROM crops WHERE name='토마토'), '적과',     0.20),
((SELECT id FROM crops WHERE name='토마토'), '수확',     0.28),
((SELECT id FROM crops WHERE name='토마토'), '줄 내리기', 0.12),
((SELECT id FROM crops WHERE name='토마토'), '측지제거',  0.16),
((SELECT id FROM crops WHERE name='토마토'), '선별·포장', 0.15),
((SELECT id FROM crops WHERE name='토마토'), '방제',     0.08),
-- 딸기
((SELECT id FROM crops WHERE name='딸기'), '정식',     0.28),
((SELECT id FROM crops WHERE name='딸기'), '유인',     0.20),
((SELECT id FROM crops WHERE name='딸기'), '적엽',     0.14),
((SELECT id FROM crops WHERE name='딸기'), '적화',     0.18),
((SELECT id FROM crops WHERE name='딸기'), '적과',     0.18),
((SELECT id FROM crops WHERE name='딸기'), '수확',     0.24),
((SELECT id FROM crops WHERE name='딸기'), '줄 내리기', 0.10),
((SELECT id FROM crops WHERE name='딸기'), '측지제거',  0.14),
((SELECT id FROM crops WHERE name='딸기'), '선별·포장', 0.18),
((SELECT id FROM crops WHERE name='딸기'), '방제',     0.08),
-- 파프리카
((SELECT id FROM crops WHERE name='파프리카'), '정식',     0.32),
((SELECT id FROM crops WHERE name='파프리카'), '유인',     0.26),
((SELECT id FROM crops WHERE name='파프리카'), '적엽',     0.20),
((SELECT id FROM crops WHERE name='파프리카'), '적화',     0.22),
((SELECT id FROM crops WHERE name='파프리카'), '적과',     0.22),
((SELECT id FROM crops WHERE name='파프리카'), '수확',     0.30),
((SELECT id FROM crops WHERE name='파프리카'), '줄 내리기', 0.14),
((SELECT id FROM crops WHERE name='파프리카'), '측지제거',  0.18),
((SELECT id FROM crops WHERE name='파프리카'), '선별·포장', 0.16),
((SELECT id FROM crops WHERE name='파프리카'), '방제',     0.09),
-- 오이
((SELECT id FROM crops WHERE name='오이'), '정식',     0.30),
((SELECT id FROM crops WHERE name='오이'), '유인',     0.28),
((SELECT id FROM crops WHERE name='오이'), '적엽',     0.22),
((SELECT id FROM crops WHERE name='오이'), '적화',     0.20),
((SELECT id FROM crops WHERE name='오이'), '적과',     0.20),
((SELECT id FROM crops WHERE name='오이'), '수확',     0.26),
((SELECT id FROM crops WHERE name='오이'), '줄 내리기', 0.14),
((SELECT id FROM crops WHERE name='오이'), '측지제거',  0.20),
((SELECT id FROM crops WHERE name='오이'), '선별·포장', 0.14),
((SELECT id FROM crops WHERE name='오이'), '방제',     0.08),
-- 애호박
((SELECT id FROM crops WHERE name='애호박'), '정식',     0.32),
((SELECT id FROM crops WHERE name='애호박'), '유인',     0.26),
((SELECT id FROM crops WHERE name='애호박'), '적엽',     0.22),
((SELECT id FROM crops WHERE name='애호박'), '적화',     0.22),
((SELECT id FROM crops WHERE name='애호박'), '적과',     0.22),
((SELECT id FROM crops WHERE name='애호박'), '수확',     0.30),
((SELECT id FROM crops WHERE name='애호박'), '줄 내리기', 0.14),
((SELECT id FROM crops WHERE name='애호박'), '측지제거',  0.18),
((SELECT id FROM crops WHERE name='애호박'), '선별·포장', 0.18),
((SELECT id FROM crops WHERE name='애호박'), '방제',     0.09),
-- 방울토마토
((SELECT id FROM crops WHERE name='방울토마토'), '정식',     0.28),
((SELECT id FROM crops WHERE name='방울토마토'), '유인',     0.22),
((SELECT id FROM crops WHERE name='방울토마토'), '적엽',     0.16),
((SELECT id FROM crops WHERE name='방울토마토'), '적화',     0.20),
((SELECT id FROM crops WHERE name='방울토마토'), '적과',     0.18),
((SELECT id FROM crops WHERE name='방울토마토'), '수확',     0.32),
((SELECT id FROM crops WHERE name='방울토마토'), '줄 내리기', 0.11),
((SELECT id FROM crops WHERE name='방울토마토'), '측지제거',  0.15),
((SELECT id FROM crops WHERE name='방울토마토'), '선별·포장', 0.20),
((SELECT id FROM crops WHERE name='방울토마토'), '방제',     0.08),
-- 고추
((SELECT id FROM crops WHERE name='고추'), '정식',     0.26),
((SELECT id FROM crops WHERE name='고추'), '유인',     0.20),
((SELECT id FROM crops WHERE name='고추'), '적엽',     0.14),
((SELECT id FROM crops WHERE name='고추'), '적화',     0.18),
((SELECT id FROM crops WHERE name='고추'), '적과',     0.18),
((SELECT id FROM crops WHERE name='고추'), '수확',     0.26),
((SELECT id FROM crops WHERE name='고추'), '줄 내리기', 0.10),
((SELECT id FROM crops WHERE name='고추'), '측지제거',  0.14),
((SELECT id FROM crops WHERE name='고추'), '선별·포장', 0.14),
((SELECT id FROM crops WHERE name='고추'), '방제',     0.08)

ON CONFLICT (crop_id, task_type) DO NOTHING;

-- ─── 확인 ───
SELECT count(*) AS sam_rows FROM sam_standards;
SELECT count(*) AS harvest_rows FROM harvest_records;
SELECT c.name, s.task_type, s.minutes_per_plant
FROM sam_standards s JOIN crops c ON c.id = s.crop_id
ORDER BY c.name, s.task_type;
