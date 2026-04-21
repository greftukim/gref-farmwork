-- ═══════════════════════════════════════════════════════════
-- Phase 3A: 온실 평면도 + QR 추적
-- Supabase SQL Editor에서 전체 선택 후 실행
-- ═══════════════════════════════════════════════════════════

-- ─── STEP 1: 누락 작물 추가 ───
INSERT INTO crops (name)
SELECT name FROM (VALUES ('파프리카'), ('애호박'), ('방울토마토'), ('고추')) AS nc(name)
WHERE name NOT IN (SELECT name FROM crops);

-- 확인
SELECT id, name FROM crops ORDER BY name;

-- ─── STEP 2: 온실 구조 테이블 ───
CREATE TABLE IF NOT EXISTS greenhouses (
  id             uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  branch         text    NOT NULL,
  code           text    NOT NULL,
  name           text    NOT NULL,
  crop_id        uuid    REFERENCES crops(id),
  gutters        int     NOT NULL,
  gols           int     NOT NULL,
  has_right_gol  bool    DEFAULT false,
  is_hanging     bool    DEFAULT false,
  gol_length_m   numeric DEFAULT 20,
  is_active      bool    DEFAULT true,
  created_at     timestamptz DEFAULT now(),
  UNIQUE(branch, code)
);

-- ─── STEP 3: QR 코드 인벤토리 ───
CREATE TABLE IF NOT EXISTS qr_codes (
  id             uuid  PRIMARY KEY DEFAULT gen_random_uuid(),
  greenhouse_id  uuid  NOT NULL REFERENCES greenhouses(id) ON DELETE CASCADE,
  gol            int   NOT NULL,
  side           text  NOT NULL CHECK (side IN ('F', 'B')),
  status         text  NOT NULL DEFAULT 'active'
                       CHECK (status IN ('active','damaged','lost','retired')),
  issued_at      date  DEFAULT CURRENT_DATE,
  note           text,
  created_at     timestamptz DEFAULT now(),
  UNIQUE(greenhouse_id, gol, side)
);

-- ─── STEP 4: QR 스캔 이벤트 ───
CREATE TABLE IF NOT EXISTS qr_scans (
  id           uuid  PRIMARY KEY DEFAULT gen_random_uuid(),
  qr_code_id   uuid  NOT NULL REFERENCES qr_codes(id),
  employee_id  uuid  NOT NULL REFERENCES employees(id),
  task_id      uuid  REFERENCES tasks(id),
  scanned_at   timestamptz NOT NULL DEFAULT now(),
  scan_type    text  CHECK (scan_type IN ('start','half','complete','switch'))
);
CREATE INDEX IF NOT EXISTS idx_qr_scans_time     ON qr_scans(scanned_at DESC);
CREATE INDEX IF NOT EXISTS idx_qr_scans_employee ON qr_scans(employee_id, scanned_at DESC);

-- ─── STEP 5: 작업자 속도 계수 컬럼 ───
ALTER TABLE employees ADD COLUMN IF NOT EXISTS speed_factor numeric DEFAULT 1.0;

-- ─── STEP 6: RLS ───
ALTER TABLE greenhouses ENABLE ROW LEVEL SECURITY;
ALTER TABLE qr_codes    ENABLE ROW LEVEL SECURITY;
ALTER TABLE qr_scans    ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='greenhouses' AND policyname='greenhouses_admin_all') THEN
    CREATE POLICY "greenhouses_admin_all"  ON greenhouses FOR ALL    USING (is_admin_level());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='greenhouses' AND policyname='greenhouses_anon_select') THEN
    CREATE POLICY "greenhouses_anon_select" ON greenhouses FOR SELECT TO anon USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='qr_codes' AND policyname='qr_codes_admin_all') THEN
    CREATE POLICY "qr_codes_admin_all"   ON qr_codes FOR ALL    USING (is_admin_level());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='qr_codes' AND policyname='qr_codes_anon_select') THEN
    CREATE POLICY "qr_codes_anon_select" ON qr_codes FOR SELECT TO anon USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='qr_scans' AND policyname='qr_scans_admin_all') THEN
    CREATE POLICY "qr_scans_admin_all"    ON qr_scans FOR ALL    USING (is_admin_level());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='qr_scans' AND policyname='qr_scans_anon_insert') THEN
    CREATE POLICY "qr_scans_anon_insert"  ON qr_scans FOR INSERT TO anon WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='qr_scans' AND policyname='qr_scans_anon_select') THEN
    CREATE POLICY "qr_scans_anon_select"  ON qr_scans FOR SELECT TO anon USING (true);
  END IF;
END $$;

-- ─── STEP 7: 부산LAB 4개 동 시드 ───
INSERT INTO greenhouses (branch, code, name, crop_id, gutters, gols, has_right_gol, is_hanging, gol_length_m)
VALUES
  ('busan','1cmp','1cmp',(SELECT id FROM crops WHERE name='토마토'),  10, 10, true,  false, 20),
  ('busan','2cmp','2cmp',(SELECT id FROM crops WHERE name='토마토'),  10, 10, true,  false, 20),
  ('busan','3cmp','3cmp',(SELECT id FROM crops WHERE name='딸기'),     8,  7,  false, false, 20),
  ('busan','4cmp','4cmp',(SELECT id FROM crops WHERE name='파프리카'), 20, 19, false, true,  20)
ON CONFLICT (branch, code) DO NOTHING;

-- ─── 확인 ───
SELECT branch, code, name, gutters, gols, has_right_gol, is_hanging FROM greenhouses ORDER BY code;
SELECT count(*) AS greenhouse_count FROM greenhouses;
