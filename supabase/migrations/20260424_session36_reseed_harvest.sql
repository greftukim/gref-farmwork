-- Session 36 Task 2: harvest_records DELETE + 30일 재시드 (2026-04-24)
-- 태우님 승인 완료 (세션 36 스펙 메시지)
-- 이전: 509건 (session27 seed)
-- 이후: 30일치 신규 데이터
--   busan  → 토마토·방울토마토·완숙토마토 (균등 1/3 배분, ~70% 일별 확률)
--   jinju  → 미니오이 (100%)
--   hadong → 완숙토마토 (100%)
-- Rollback: 이 스크립트 실행 전 백업 없음 (시드 데이터 재생성 가능)

DO $$
DECLARE
  crop_tomato       UUID;
  crop_cherry       UUID;
  crop_ripe_tomato  UUID;
  crop_mini_cucumber UUID;

  worker_rec RECORD;
  target_date DATE;
  qty NUMERIC;
  chosen_crop UUID;
  crop_idx INT;
  day_offset INT;
BEGIN
  -- 작물 ID 조회
  SELECT id INTO crop_tomato        FROM crops WHERE name = '토마토';
  SELECT id INTO crop_cherry        FROM crops WHERE name = '방울토마토';
  SELECT id INTO crop_ripe_tomato   FROM crops WHERE name = '완숙토마토';
  SELECT id INTO crop_mini_cucumber FROM crops WHERE name = '미니오이';

  IF crop_tomato IS NULL OR crop_cherry IS NULL
     OR crop_ripe_tomato IS NULL OR crop_mini_cucumber IS NULL THEN
    RAISE EXCEPTION '필수 작물 ID 조회 실패 — 시드 중단 (Task 1 실행 확인 필요)';
  END IF;

  -- 기존 데이터 삭제 (태우님 승인)
  DELETE FROM harvest_records;

  -- 활성 worker 순회
  FOR worker_rec IN
    SELECT id, branch FROM employees
    WHERE role = 'worker' AND is_active = true
  LOOP
    FOR day_offset IN 0..29 LOOP
      IF random() < 0.70 THEN
        target_date := CURRENT_DATE - day_offset;

        CASE worker_rec.branch
          WHEN 'busan' THEN
            -- 균등 1/3 배분: 0=토마토, 1=방울토마토, 2=완숙토마토
            crop_idx := floor(random() * 3)::int;
            IF    crop_idx = 0 THEN chosen_crop := crop_tomato;
            ELSIF crop_idx = 1 THEN chosen_crop := crop_cherry;
            ELSE                     chosen_crop := crop_ripe_tomato;
            END IF;
            qty := CASE
              WHEN chosen_crop = crop_tomato      THEN 15 + random() * 30   -- 15~45
              WHEN chosen_crop = crop_cherry      THEN  8 + random() * 12   -- 8~20
              WHEN chosen_crop = crop_ripe_tomato THEN 20 + random() * 30   -- 20~50
              ELSE 15 + random() * 20
            END;

          WHEN 'jinju' THEN
            chosen_crop := crop_mini_cucumber;
            qty := 10 + random() * 20;  -- 10~30 kg

          WHEN 'hadong' THEN
            chosen_crop := crop_ripe_tomato;
            qty := 20 + random() * 30;  -- 20~50 kg

          ELSE CONTINUE;
        END CASE;

        INSERT INTO harvest_records (employee_id, crop_id, date, quantity, unit)
        VALUES (worker_rec.id, chosen_crop, target_date, ROUND(qty::numeric, 1), 'kg');
      END IF;
    END LOOP;
  END LOOP;

  RAISE NOTICE '재시드 완료 — harvest_records 새 행 수: %', (SELECT COUNT(*) FROM harvest_records);
END $$;

-- 사후 검증
SELECT e.branch, c.name AS crop, COUNT(*) AS records, ROUND(SUM(hr.quantity)::numeric, 1) AS total_kg
FROM harvest_records hr
JOIN employees e ON hr.employee_id = e.id
JOIN crops c ON hr.crop_id = c.id
GROUP BY e.branch, c.name
ORDER BY e.branch, c.name;
