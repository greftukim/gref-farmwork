-- ============================================================================
-- 세션 74-F Track B-2: 이번 주 수확량 데모 시드
-- 목적: /admin 대시보드 "이번 주 수확량" KPI 0 → 실수치 표시
-- 작성일: 2026-04-27
--
-- 범위:
--   · CURRENT_DATE 기준 (교훈 77) — 날짜 하드코딩 없음
--   · 부산 작업자 3명 (작물별 1명 배정)
--   · 작물 3종: 토마토 95kg / 딸기 38kg / 파프리카 72kg
--
-- 멱등성:
--   · DELETE WHERE employee_id = ANY(w)
--             AND date >= date_trunc('week', CURRENT_DATE)::date
--             AND date <= CURRENT_DATE 후 재삽입
--   · 반복 실행 안전 (타 직원·타 날짜 무영향)
--
-- 롤백:
--   DELETE FROM harvest_records
--   WHERE employee_id IN (
--     SELECT id FROM employees
--     WHERE name = ANY(ARRAY['김선아','김옥희','김점숙'])
--   ) AND date >= date_trunc('week', CURRENT_DATE)::date
--     AND date <= CURRENT_DATE;
-- ============================================================================

DO $$
DECLARE
  w     UUID[];   -- [1]=김선아 [2]=김옥희 [3]=김점숙
  c_tom UUID;
  c_str UUID;
  c_pap UUID;
  d     DATE := CURRENT_DATE;
  wk_start DATE := date_trunc('week', CURRENT_DATE)::date;
  cnt   INT;
BEGIN

  -- 1. 작업자 UUID 수집 (이름 순 정렬, 3명)
  SELECT ARRAY_AGG(id ORDER BY name) INTO w
  FROM employees
  WHERE name = ANY(ARRAY['김선아','김옥희','김점숙'])
    AND is_active = true;

  IF array_length(w, 1) IS DISTINCT FROM 3 THEN
    RAISE EXCEPTION '작업자 UUID 3개 수집 실패: %개 반환됨', COALESCE(array_length(w,1), 0);
  END IF;

  -- 2. 작물 UUID 수집
  SELECT id INTO c_tom FROM crops WHERE name = '토마토' AND is_active = true LIMIT 1;
  SELECT id INTO c_str FROM crops WHERE name = '딸기'   AND is_active = true LIMIT 1;
  SELECT id INTO c_pap FROM crops WHERE name = '파프리카' AND is_active = true LIMIT 1;

  IF c_tom IS NULL THEN RAISE EXCEPTION '토마토 crop 미발견'; END IF;
  IF c_str IS NULL THEN RAISE EXCEPTION '딸기 crop 미발견'; END IF;
  IF c_pap IS NULL THEN RAISE EXCEPTION '파프리카 crop 미발견'; END IF;

  -- 3. 멱등성: 이번 주 해당 작업자 수확량 삭제
  DELETE FROM harvest_records
  WHERE employee_id = ANY(w)
    AND date >= wk_start
    AND date <= d;

  -- 4. 수확량 3건 삽입 (작물별 1명)
  INSERT INTO harvest_records(employee_id, crop_id, date, quantity, unit) VALUES
  (w[1], c_tom, d, 95, 'kg'),   -- 김선아 / 토마토
  (w[2], c_str, d, 38, 'kg'),   -- 김옥희 / 딸기
  (w[3], c_pap, d, 72, 'kg');   -- 김점숙 / 파프리카

  -- 5. 검증
  SELECT COUNT(*) INTO cnt
  FROM harvest_records
  WHERE employee_id = ANY(w)
    AND date >= wk_start
    AND date <= d;

  RAISE NOTICE '수확량 시드 결과: %건 (예상 3)', cnt;

  IF cnt <> 3 THEN
    RAISE EXCEPTION '수확량 건수 이상: %건 (예상 3)', cnt;
  END IF;

  RAISE NOTICE '검증 통과 ✓ (토마토 95kg + 딸기 38kg + 파프리카 72kg = 합계 205kg)';

END $$;
