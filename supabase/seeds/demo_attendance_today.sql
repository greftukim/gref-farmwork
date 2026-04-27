-- ============================================================================
-- 세션 74-F Track B-1: 오늘 날짜 출근 데모 시드
-- 목적: /admin 대시보드 "오늘 출근" KPI 0 → 9명 표시
-- 작성일: 2026-04-27
--
-- 범위:
--   · CURRENT_DATE 기준 — 날짜 하드코딩 없음 (교훈 77)
--   · 부산 작업자 9명만
--   · check_in: 07:55~08:07 (실제 출근 시각 변동 반영)
--   · check_out: null (현재 근무 중)
--
-- 멱등성:
--   · DELETE WHERE employee_id = ANY(w) AND date = CURRENT_DATE 후 재삽입
--   · 반복 실행 안전 (타 직원 및 타 날짜 무영향)
--
-- 롤백:
--   DELETE FROM attendance
--   WHERE employee_id IN (
--     SELECT id FROM employees
--     WHERE name = ANY(ARRAY['김선아','김옥희','김점숙','김태진','문영이',
--                             '윤화순','정경은','정은영','조혜숙'])
--   ) AND date = CURRENT_DATE;
-- ============================================================================

DO $$
DECLARE
  w   UUID[];   -- [1]=김선아 [2]=김옥희 ... [9]=조혜숙 (이름 순)
  d   DATE := CURRENT_DATE;
  cnt INT;
BEGIN

  -- 1. 작업자 UUID 수집
  SELECT ARRAY_AGG(id ORDER BY name) INTO w
  FROM employees
  WHERE name = ANY(ARRAY['김선아','김옥희','김점숙','김태진','문영이',
                          '윤화순','정경은','정은영','조혜숙']);

  IF array_length(w, 1) IS DISTINCT FROM 9 THEN
    RAISE EXCEPTION '작업자 UUID 9개 수집 실패: %개 반환됨', COALESCE(array_length(w,1), 0);
  END IF;

  -- 2. 멱등성: 오늘 해당 작업자 출근 삭제
  DELETE FROM attendance
  WHERE employee_id = ANY(w)
    AND date = d;

  -- 3. 출근 9건 삽입 (check_out = null → 근무 중)
  INSERT INTO attendance(employee_id, date, check_in, status, is_proxy) VALUES
  (w[1], d, d + '07:58:00'::time, 'normal', false),  -- 김선아
  (w[2], d, d + '08:03:00'::time, 'normal', false),  -- 김옥희
  (w[3], d, d + '07:55:00'::time, 'normal', false),  -- 김점숙
  (w[4], d, d + '08:07:00'::time, 'normal', false),  -- 김태진
  (w[5], d, d + '08:01:00'::time, 'normal', false),  -- 문영이
  (w[6], d, d + '07:59:00'::time, 'normal', false),  -- 윤화순
  (w[7], d, d + '08:05:00'::time, 'normal', false),  -- 정경은
  (w[8], d, d + '08:02:00'::time, 'normal', false),  -- 정은영
  (w[9], d, d + '07:57:00'::time, 'normal', false);  -- 조혜숙

  -- 4. 검증
  SELECT COUNT(*) INTO cnt
  FROM attendance
  WHERE employee_id = ANY(w) AND date = d;

  RAISE NOTICE '출근 시드 결과: %건 (예상 9)', cnt;

  IF cnt <> 9 THEN
    RAISE EXCEPTION '출근 건수 이상: %건 (예상 9)', cnt;
  END IF;

  RAISE NOTICE '검증 통과 ✓';

END $$;
