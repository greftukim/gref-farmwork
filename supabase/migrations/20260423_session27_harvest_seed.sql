-- Session 27 Harvest Records Seed (2026-04-23)
-- Purpose: Dashboard 수확 관련 수치 작동 확인용 테스트 시드
-- Scope: 30일치 (D-29 ~ D), 활성 worker(busan/jinju/hadong) × 일별 약 70% 확률 = 약 480건
-- Status: 파일 작성 완료 (2026-04-23). 실행은 태우님 승인 후.
-- WARNING: 중복 실행 방지 — 선행 COUNT(*) 검사로 self-guard.
-- Rollback: DELETE FROM harvest_records; (시드 전 row_count = 0)

-- 지점별 작물 분배:
--   busan  → 토마토(메인) · 방울토마토(보조)
--   jinju  → 파프리카(메인) · 미니파프리카(보조)
--   hadong → 딸기(메인)   · 오이(보조)
-- 메인 75% / 보조 25% 확률
-- 수량 범위:
--   토마토·파프리카 계열: 15~45 kg
--   딸기: 5~15 kg
--   오이·방울토마토·미니파프리카: 8~40 kg

DO $$
DECLARE
  crop_tomato         UUID;
  crop_cherry_tomato  UUID;
  crop_strawberry     UUID;
  crop_paprika        UUID;
  crop_mini_paprika   UUID;
  crop_cucumber       UUID;

  worker_rec RECORD;
  target_date DATE;
  qty NUMERIC;
  main_crop UUID;
  sub_crop UUID;
  day_offset INT;

  pre_count INT;
BEGIN
  -- 재실행 방지: 이미 데이터가 있으면 중단
  SELECT COUNT(*) INTO pre_count FROM harvest_records;
  IF pre_count > 0 THEN
    RAISE EXCEPTION 'harvest_records already has % rows — seed aborted (재실행 방지)', pre_count;
  END IF;

  -- 작물 ID 조회
  SELECT id INTO crop_tomato         FROM crops WHERE name = '토마토';
  SELECT id INTO crop_cherry_tomato  FROM crops WHERE name = '방울토마토';
  SELECT id INTO crop_strawberry     FROM crops WHERE name = '딸기';
  SELECT id INTO crop_paprika        FROM crops WHERE name = '파프리카';
  SELECT id INTO crop_mini_paprika   FROM crops WHERE name = '미니파프리카';
  SELECT id INTO crop_cucumber       FROM crops WHERE name = '오이';

  IF crop_tomato IS NULL OR crop_cherry_tomato IS NULL
     OR crop_strawberry IS NULL OR crop_paprika IS NULL
     OR crop_mini_paprika IS NULL OR crop_cucumber IS NULL THEN
    RAISE EXCEPTION 'Required crops not found — 시드 중단';
  END IF;

  -- 활성 worker 순회
  FOR worker_rec IN
    SELECT id, branch FROM employees
    WHERE role = 'worker' AND is_active = true
  LOOP
    -- 지점별 메인/보조 작물 할당
    CASE worker_rec.branch
      WHEN 'busan'  THEN main_crop := crop_tomato;     sub_crop := crop_cherry_tomato;
      WHEN 'jinju'  THEN main_crop := crop_paprika;    sub_crop := crop_mini_paprika;
      WHEN 'hadong' THEN main_crop := crop_strawberry; sub_crop := crop_cucumber;
      ELSE CONTINUE;
    END CASE;

    -- 30일 중 약 70% 확률로 기록 (평균 21건/명)
    FOR day_offset IN 0..29 LOOP
      IF random() < 0.70 THEN
        target_date := CURRENT_DATE - day_offset;

        IF random() < 0.75 THEN
          -- 메인 작물
          qty := CASE
            WHEN main_crop = crop_tomato     THEN 15 + random() * 30   -- 15~45
            WHEN main_crop = crop_paprika    THEN 15 + random() * 30   -- 15~45
            WHEN main_crop = crop_strawberry THEN  5 + random() * 10   -- 5~15
            ELSE 20 + random() * 20
          END;

          INSERT INTO harvest_records (employee_id, crop_id, date, quantity, unit)
          VALUES (worker_rec.id, main_crop, target_date, ROUND(qty::numeric, 1), 'kg');
        ELSE
          -- 보조 작물
          qty := CASE
            WHEN sub_crop = crop_cherry_tomato THEN  8 + random() * 12  -- 8~20
            WHEN sub_crop = crop_mini_paprika  THEN 10 + random() * 15  -- 10~25
            WHEN sub_crop = crop_cucumber      THEN 20 + random() * 20  -- 20~40
            ELSE 10 + random() * 15
          END;

          INSERT INTO harvest_records (employee_id, crop_id, date, quantity, unit)
          VALUES (worker_rec.id, sub_crop, target_date, ROUND(qty::numeric, 1), 'kg');
        END IF;
      END IF;
    END LOOP;
  END LOOP;

  RAISE NOTICE 'Session 27 harvest seed 완료';
END $$;

-- 사후 검증 (Task 2에서 별도 SELECT로 재수행)
-- SELECT COUNT(*) FROM harvest_records;
-- SELECT e.branch, COUNT(*), SUM(hr.quantity)
--   FROM harvest_records hr JOIN employees e ON hr.employee_id = e.id
--   GROUP BY e.branch;
-- SELECT c.name, COUNT(*), SUM(hr.quantity)
--   FROM harvest_records hr JOIN crops c ON hr.crop_id = c.id
--   GROUP BY c.name ORDER BY SUM(hr.quantity) DESC;
-- SELECT DATE_TRUNC('week', date) AS week, COUNT(*), SUM(quantity)
--   FROM harvest_records WHERE date >= CURRENT_DATE - 29
--   GROUP BY DATE_TRUNC('week', date) ORDER BY week;
