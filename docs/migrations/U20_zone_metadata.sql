-- 트랙 77 후속 U20 — 온실 정보 관리 (별 트랙 TRACK77-FOLLOWUP-ZONE-METADATA-001)
-- 적용: node scripts/run-sql.cjs docs/migrations/U20_zone_metadata.sql
-- 본 라운드 범위: 1+2단계 (온실 물리 구조 + 식재 재식밀도)
-- 별 트랙: 자재 소요량(P2) + 발주(P3) — TRACK77-FOLLOWUP-MATERIAL-CALC-001
-- AI 학습 데이터 누적 인프라 (사용자 의도 박제)
--
-- 자산 6번(DB 스키마) 위반 아님: 기존 테이블 ALTER 0건. 신규 3테이블 + RLS 추가만.
-- 기존 crops 테이블 재사용 (G77-LLL-1) — display_name 미추가, name 직접 사용.
--   사유: crops는 이미 8 파일에서 사용 중 + 의미있는 한글 데이터 보유 (방울토마토/미니오이/딸기 등).

BEGIN;

-- ========================================================================
-- 1) zone_specs — 동별 물리 구조 (1동 1행, 영구 자산)
-- ========================================================================

CREATE TABLE IF NOT EXISTS public.zone_specs (
  zone_id UUID PRIMARY KEY REFERENCES public.zones(id) ON DELETE CASCADE,
  bay_length_m NUMERIC,
  bay_count INTEGER,
  bay_width_m NUMERIC,
  bay_width_count INTEGER,
  corridor_width_m NUMERIC,
  corridor_count INTEGER,
  notes TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ========================================================================
-- 2) zone_crops — 작기 (회차별, AI 학습 누적)
-- ========================================================================

CREATE TABLE IF NOT EXISTS public.zone_crops (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  zone_id UUID NOT NULL REFERENCES public.zones(id) ON DELETE CASCADE,
  crop_id UUID NOT NULL REFERENCES public.crops(id),
  cultivar TEXT,
  season_label TEXT,
  started_at DATE,
  ended_at DATE,
  rows_per_bay INTEGER,
  slab_length_cm NUMERIC,
  slab_width_cm NUMERIC,
  slab_height_cm NUMERIC,
  plants_per_slab INTEGER,
  stems_per_plant INTEGER,
  slab_gap_cm NUMERIC,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_zone_crops_zone ON public.zone_crops(zone_id);
CREATE INDEX IF NOT EXISTS idx_zone_crops_active ON public.zone_crops(zone_id) WHERE ended_at IS NULL;

-- ========================================================================
-- 3) zone_crop_events — 자유 시점 이벤트 (사용자 의견 4)
-- ========================================================================

CREATE TABLE IF NOT EXISTS public.zone_crop_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  zone_crop_id UUID NOT NULL REFERENCES public.zone_crops(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  event_label TEXT NOT NULL,
  event_date DATE NOT NULL,
  notes TEXT,
  created_by UUID REFERENCES public.employees(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_zone_crop_events_zc ON public.zone_crop_events(zone_crop_id);

-- ========================================================================
-- 4) RLS — farm_admin / master 단독 (사용자 결정 박제)
-- ========================================================================

ALTER TABLE public.zone_specs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.zone_crops ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.zone_crop_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "zone_specs_admin_all" ON public.zone_specs;
CREATE POLICY "zone_specs_admin_all" ON public.zone_specs
  FOR ALL TO authenticated
  USING (current_employee_role() = ANY (ARRAY['farm_admin'::text, 'master'::text]))
  WITH CHECK (current_employee_role() = ANY (ARRAY['farm_admin'::text, 'master'::text]));

DROP POLICY IF EXISTS "zone_crops_admin_all" ON public.zone_crops;
CREATE POLICY "zone_crops_admin_all" ON public.zone_crops
  FOR ALL TO authenticated
  USING (current_employee_role() = ANY (ARRAY['farm_admin'::text, 'master'::text]))
  WITH CHECK (current_employee_role() = ANY (ARRAY['farm_admin'::text, 'master'::text]));

DROP POLICY IF EXISTS "zone_crop_events_admin_all" ON public.zone_crop_events;
CREATE POLICY "zone_crop_events_admin_all" ON public.zone_crop_events
  FOR ALL TO authenticated
  USING (current_employee_role() = ANY (ARRAY['farm_admin'::text, 'master'::text]))
  WITH CHECK (current_employee_role() = ANY (ARRAY['farm_admin'::text, 'master'::text]));

COMMIT;
