-- session46: HARVEST-TARGETS-001 해소
-- branches 테이블에 monthly_harvest_target_kg 컬럼 추가 (비파괴적)
-- 운영 지점 3곳 (busan/jinju/hadong) 현실적 stretch 목표치 시드
--
-- 근거 (2026-04 실적):
--   busan: 4,148 kg 실적 → 목표 5,000 (달성률 ~83%)
--   jinju: 2,405 kg 실적 → 목표 3,000 (달성률 ~80%)
--   hadong: 4,803 kg 실적 → 목표 5,500 (달성률 ~87%)
--
-- 비파괴적: ADD COLUMN IF NOT EXISTS + DEFAULT 0
-- branches UPDATE RLS: can_write() = farm_admin/hr_admin/master 포함 → 별도 정책 불필요
--
-- ROLLBACK:
--   ALTER TABLE branches DROP COLUMN IF EXISTS monthly_harvest_target_kg;

BEGIN;

-- ─────────────────────────────────────────
-- STEP 1: 컬럼 추가 (비파괴적)
-- ─────────────────────────────────────────
ALTER TABLE branches
  ADD COLUMN IF NOT EXISTS monthly_harvest_target_kg NUMERIC DEFAULT 0;

-- 컬럼 생성 검증
DO $$
DECLARE col_exists BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'branches'
      AND column_name = 'monthly_harvest_target_kg'
  ) INTO col_exists;
  IF NOT col_exists THEN
    RAISE EXCEPTION 'FAIL: monthly_harvest_target_kg 컬럼 미생성 → ROLLBACK';
  END IF;
  RAISE NOTICE 'STEP 1 완료: monthly_harvest_target_kg 컬럼 확인';
END $$;

-- ─────────────────────────────────────────
-- STEP 2: 운영 지점 3곳 목표치 시드
-- ─────────────────────────────────────────
UPDATE branches SET monthly_harvest_target_kg = 5000 WHERE code = 'busan';
UPDATE branches SET monthly_harvest_target_kg = 3000 WHERE code = 'jinju';
UPDATE branches SET monthly_harvest_target_kg = 5500 WHERE code = 'hadong';

-- ─────────────────────────────────────────
-- STEP 3: 최종 검증
-- ─────────────────────────────────────────
DO $$
DECLARE
  busan_t  NUMERIC;
  jinju_t  NUMERIC;
  hadong_t NUMERIC;
BEGIN
  SELECT monthly_harvest_target_kg INTO busan_t  FROM branches WHERE code = 'busan';
  SELECT monthly_harvest_target_kg INTO jinju_t  FROM branches WHERE code = 'jinju';
  SELECT monthly_harvest_target_kg INTO hadong_t FROM branches WHERE code = 'hadong';

  IF busan_t IS DISTINCT FROM 5000 THEN
    RAISE EXCEPTION 'FAIL: busan 목표치 % (예상 5000) → ROLLBACK', busan_t;
  END IF;
  IF jinju_t IS DISTINCT FROM 3000 THEN
    RAISE EXCEPTION 'FAIL: jinju 목표치 % (예상 3000) → ROLLBACK', jinju_t;
  END IF;
  IF hadong_t IS DISTINCT FROM 5500 THEN
    RAISE EXCEPTION 'FAIL: hadong 목표치 % (예상 5500) → ROLLBACK', hadong_t;
  END IF;

  RAISE NOTICE '=== 검증 통과 ===';
  RAISE NOTICE '목표치: busan=% kg / jinju=% kg / hadong=% kg', busan_t, jinju_t, hadong_t;
END $$;

COMMIT;
