-- 트랙 76-A-2 / 마이그레이션 1: zones 보강 + greenhouse_id FK + 자연 매핑 백필
-- 적용 대상: zones 테이블 (D동 신규 시드 + greenhouse_id 컬럼 추가 + busan 매핑)
-- 사전 조건: 76-A-1 추가 정찰에서 시나리오 Y' 확정 (zones.greenhouse_id 부재 + D동 zones 누락 + greenhouses 4행 정상)
-- 위임 결정값: D7~D12 (76-A-2 지시문 §1)
-- 롤백: rollback_20260428_session76a2_zones_greenhouse_fk.sql 참조

BEGIN;

-- ─── Step 1: D동 신규 시드 추가 (D8·D9·D12) ───
-- 멱등성: 이름이 'D동'인 zones가 없을 때만 INSERT
INSERT INTO public.zones (id, name, description, row_count, plant_count, created_at)
SELECT
  gen_random_uuid(),
  'D동',
  '재배 작물 미정',  -- D9 placeholder, ZONE-D-CROP-VERIFY-001로 추후 정정
  20,                -- D12 A/B/C 평균 (20+16+24)/3=20
  NULL,              -- D12 plant_count NULLABLE 확인됨, 운영 진입 시 실측값 UPDATE
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM public.zones WHERE name = 'D동'
);

-- 검증: zones 4행 도달
DO $$
DECLARE
  zone_count INT;
BEGIN
  SELECT COUNT(*) INTO zone_count FROM public.zones;
  IF zone_count <> 4 THEN
    RAISE EXCEPTION 'zones 행 수 비정상: 기대 4, 실제 %', zone_count;
  END IF;
END $$;

-- ─── Step 2: zones.greenhouse_id FK 컬럼 추가 ───
ALTER TABLE public.zones
  ADD COLUMN greenhouse_id UUID REFERENCES public.greenhouses(id);

CREATE INDEX IF NOT EXISTS idx_zones_greenhouse ON public.zones(greenhouse_id);

-- ─── Step 3: 자연 순서 매핑 백필 (D11) ───
-- A동→1cmp / B동→2cmp / C동→3cmp / D동→4cmp
-- ZONE-CMP-MAPPING-VERIFY-001로 추후 정정 가능
UPDATE public.zones z
SET greenhouse_id = g.id
FROM public.greenhouses g
WHERE g.branch = 'busan'
  AND (
    (z.name = 'A동' AND g.name = '1cmp') OR
    (z.name = 'B동' AND g.name = '2cmp') OR
    (z.name = 'C동' AND g.name = '3cmp') OR
    (z.name = 'D동' AND g.name = '4cmp')
  );

-- 검증: 모든 zones가 매핑됨
DO $$
DECLARE
  unmapped_count INT;
BEGIN
  SELECT COUNT(*) INTO unmapped_count FROM public.zones WHERE greenhouse_id IS NULL;
  IF unmapped_count > 0 THEN
    RAISE EXCEPTION 'zones 매핑 실패: % 행 unmapped', unmapped_count;
  END IF;
END $$;

-- ─── Step 4: tasks.zone_id NULL 1건 처리 (Q1 결과: "토마토 유인·결속" → A동) ───
-- 시드 결함 + 단서 있음 (title 'A동' 단서는 없으나 task_type='유인·결속'+title '토마토'가 A동(토마토 재배동)와 일치)
UPDATE public.tasks
SET zone_id = (SELECT id FROM public.zones WHERE name = 'A동')
WHERE zone_id IS NULL
  AND title = '토마토 유인·결속';

-- 검증: zone_id NULL 0건
DO $$
DECLARE
  null_zone_count INT;
BEGIN
  SELECT COUNT(*) INTO null_zone_count FROM public.tasks WHERE zone_id IS NULL;
  IF null_zone_count > 0 THEN
    RAISE EXCEPTION 'tasks.zone_id NULL 잔존: % 행', null_zone_count;
  END IF;
END $$;

COMMIT;
