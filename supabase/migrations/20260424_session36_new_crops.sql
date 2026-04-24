-- Session 36 Task 1: 신규 작물 2종 추가 (2026-04-24)
-- 미니오이, 완숙토마토 — crops 테이블 INSERT
-- Rollback: DELETE FROM crops WHERE name IN ('미니오이', '완숙토마토');

BEGIN;

INSERT INTO crops (name, task_types, is_active)
SELECT '미니오이',
       '["수확","유인·결속","적엽","병해충 예찰","EC/pH 측정"]'::jsonb,
       true
WHERE NOT EXISTS (SELECT 1 FROM crops WHERE name = '미니오이');

INSERT INTO crops (name, task_types, is_active)
SELECT '완숙토마토',
       '["수확","유인·결속","적엽","병해충 예찰","EC/pH 측정","수분 작업"]'::jsonb,
       true
WHERE NOT EXISTS (SELECT 1 FROM crops WHERE name = '완숙토마토');

-- 검증
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM crops WHERE name = '미니오이') THEN
    RAISE EXCEPTION '미니오이 INSERT 실패';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM crops WHERE name = '완숙토마토') THEN
    RAISE EXCEPTION '완숙토마토 INSERT 실패';
  END IF;
  RAISE NOTICE '신규 작물 2종 추가 완료: 미니오이, 완숙토마토';
END $$;

COMMIT;
