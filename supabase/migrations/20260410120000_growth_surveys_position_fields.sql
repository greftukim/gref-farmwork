-- ============================================================================
-- 트랙 C Phase C-2a: growth_surveys 스키마 확장
-- 1. crop_id 누락 보강 (기존 scripts/migration-growth-survey-crop.sql 승격)
-- 2. 부산LAB 세부 위치 필드 추가 (컴파트먼트/거터/구역)
-- 다른 지점은 NULL 유지, 기존 zone_id 그대로 사용
-- 작성일: 2026-04-10
-- ============================================================================

-- 1. crop_id 보강 (이전에 scripts 폴더에만 있고 실제 DB에 적용 안 됐던 것)
ALTER TABLE public.growth_surveys
  ADD COLUMN IF NOT EXISTS crop_id UUID REFERENCES public.crops(id) ON DELETE SET NULL;

-- 2. 부산LAB 세부 위치 필드
ALTER TABLE public.growth_surveys
  ADD COLUMN IF NOT EXISTS compartment INT,
  ADD COLUMN IF NOT EXISTS gutter_number INT,
  ADD COLUMN IF NOT EXISTS position_number INT;

COMMENT ON COLUMN public.growth_surveys.crop_id IS '작물 FK';
COMMENT ON COLUMN public.growth_surveys.compartment IS '컴파트먼트 번호 (부산LAB: 1~4, 다른 지점은 NULL)';
COMMENT ON COLUMN public.growth_surveys.gutter_number IS '거터 번호 (부산LAB 1/2/4cmp: 1~10, 3cmp: 1~8)';
COMMENT ON COLUMN public.growth_surveys.position_number IS '구역 번호 (부산LAB: 1~13)';

-- 3. 인덱스
-- 컴파트먼트별 조회
CREATE INDEX IF NOT EXISTS idx_growth_surveys_compartment
  ON public.growth_surveys(compartment)
  WHERE compartment IS NOT NULL;

-- 시계열 그래프 조회용 (작물 + 날짜)
CREATE INDEX IF NOT EXISTS idx_growth_surveys_crop_date
  ON public.growth_surveys(crop_id, survey_date)
  WHERE crop_id IS NOT NULL;