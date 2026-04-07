-- growth_surveys 테이블에 작물 ID 컬럼 추가
-- 생육 조사 시 어떤 작물에 대한 조사인지 연결

ALTER TABLE growth_surveys
  ADD COLUMN IF NOT EXISTS crop_id UUID REFERENCES crops(id) ON DELETE SET NULL;

COMMENT ON COLUMN growth_surveys.crop_id IS '조사 대상 작물 (crops 테이블 참조)';
