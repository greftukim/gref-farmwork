-- ============================================================================
-- 세션 74-E: 오늘 날짜 QR 스캔 데모 시드 데이터
-- 목적: /admin/floor 평면도 실시간 현황 시각화 테스트
-- 작성일: 2026-04-27
--
-- 범위:
--   · CURRENT_DATE 기준 — 날짜 하드코딩 없음 (교훈 77)
--   · 부산 작업자 9명: 김선아 김옥희 김점숙 김태진 문영이 윤화순 정경은 정은영 조혜숙
--   · 4동(1cmp/2cmp/3cmp/4cmp) 46골 총 98 row
--   · scan_type 분포: start=40, half=31, complete=23, pause=2, resume=2
--   · pause/resume 골: 1cmp-골2, 4cmp-골7
--
-- 멱등성:
--   · 실행 전 CURRENT_DATE + 해당 9명의 qr_scans 삭제 후 재삽입
--   · 반복 실행 안전 (오늘 이전 데이터 무영향)
--
-- 롤백 (수동):
--   DELETE FROM qr_scans
--   WHERE employee_id IN (
--     SELECT id FROM employees
--     WHERE name = ANY(ARRAY['김선아','김옥희','김점숙','김태진','문영이',
--                             '윤화순','정경은','정은영','조혜숙'])
--   ) AND scanned_at >= CURRENT_DATE AND scanned_at < CURRENT_DATE + 1;
-- ============================================================================

DO $$
DECLARE
  w            UUID[];   -- [1]=김선아 [2]=김옥희 [3]=김점숙 [4]=김태진 [5]=문영이
                         -- [6]=윤화순 [7]=정경은 [8]=정은영 [9]=조혜숙 (이름 순)
  g1           UUID;    -- 1cmp
  g2           UUID;    -- 2cmp
  g3           UUID;    -- 3cmp
  g4           UUID;    -- 4cmp
  d            DATE := CURRENT_DATE;
  total_cnt    INT;
  start_cnt    INT;
  half_cnt     INT;
  complete_cnt INT;
  pause_cnt    INT;
  resume_cnt   INT;
BEGIN

  -- ---- 1. 작업자 UUID 수집 (이름 순 정렬 → 배열 인덱스 고정) ----
  SELECT ARRAY_AGG(id ORDER BY name) INTO w
  FROM employees
  WHERE name = ANY(ARRAY['김선아','김옥희','김점숙','김태진','문영이',
                          '윤화순','정경은','정은영','조혜숙']);

  IF array_length(w, 1) IS DISTINCT FROM 9 THEN
    RAISE EXCEPTION '작업자 UUID 9개 수집 실패: %개 반환됨', COALESCE(array_length(w,1), 0);
  END IF;

  -- ---- 2. 온실 UUID 수집 ----
  SELECT id INTO g1 FROM greenhouses WHERE code = '1cmp';
  SELECT id INTO g2 FROM greenhouses WHERE code = '2cmp';
  SELECT id INTO g3 FROM greenhouses WHERE code = '3cmp';
  SELECT id INTO g4 FROM greenhouses WHERE code = '4cmp';

  IF g1 IS NULL OR g2 IS NULL OR g3 IS NULL OR g4 IS NULL THEN
    RAISE EXCEPTION '온실 UUID 수집 실패 (g1=% g2=% g3=% g4=%)', g1, g2, g3, g4;
  END IF;

  -- ---- 3. 멱등성: 오늘 해당 작업자 스캔 전체 삭제 ----
  DELETE FROM qr_scans
  WHERE employee_id = ANY(w)
    AND scanned_at >= d
    AND scanned_at < d + 1;

  RAISE NOTICE '기존 스캔 삭제 완료. 신규 98건 삽입 시작.';

  -- ============================================================
  -- 4. 1cmp (w[1]=김선아, w[2]=김옥희) — 골 1~10
  --    골1~5 complete, 골6~7 half, 골8~9 start, 골10 idle
  --    골2에 pause/resume 포함 (5건)
  -- ============================================================

  -- 골 1: complete (3건)
  INSERT INTO qr_scans(qr_code_id,employee_id,scan_type,scanned_at)
  SELECT id,w[1],'start',   d+'07:31:00'::time FROM qr_codes WHERE greenhouse_id=g1 AND gol=1 AND side='F' AND status='active';
  INSERT INTO qr_scans(qr_code_id,employee_id,scan_type,scanned_at)
  SELECT id,w[2],'half',    d+'09:05:00'::time FROM qr_codes WHERE greenhouse_id=g1 AND gol=1 AND side='B' AND status='active';
  INSERT INTO qr_scans(qr_code_id,employee_id,scan_type,scanned_at)
  SELECT id,w[1],'complete',d+'10:45:00'::time FROM qr_codes WHERE greenhouse_id=g1 AND gol=1 AND side='F' AND status='active';

  -- 골 2: complete + pause/resume (5건)
  INSERT INTO qr_scans(qr_code_id,employee_id,scan_type,scanned_at)
  SELECT id,w[2],'start',   d+'07:36:00'::time FROM qr_codes WHERE greenhouse_id=g1 AND gol=2 AND side='F' AND status='active';
  INSERT INTO qr_scans(qr_code_id,employee_id,scan_type,scanned_at)
  SELECT id,w[2],'pause',   d+'08:20:00'::time FROM qr_codes WHERE greenhouse_id=g1 AND gol=2 AND side='F' AND status='active';
  INSERT INTO qr_scans(qr_code_id,employee_id,scan_type,scanned_at)
  SELECT id,w[2],'resume',  d+'08:55:00'::time FROM qr_codes WHERE greenhouse_id=g1 AND gol=2 AND side='F' AND status='active';
  INSERT INTO qr_scans(qr_code_id,employee_id,scan_type,scanned_at)
  SELECT id,w[1],'half',    d+'09:10:00'::time FROM qr_codes WHERE greenhouse_id=g1 AND gol=2 AND side='B' AND status='active';
  INSERT INTO qr_scans(qr_code_id,employee_id,scan_type,scanned_at)
  SELECT id,w[2],'complete',d+'10:50:00'::time FROM qr_codes WHERE greenhouse_id=g1 AND gol=2 AND side='B' AND status='active';

  -- 골 3: complete (3건)
  INSERT INTO qr_scans(qr_code_id,employee_id,scan_type,scanned_at)
  SELECT id,w[1],'start',   d+'07:41:00'::time FROM qr_codes WHERE greenhouse_id=g1 AND gol=3 AND side='F' AND status='active';
  INSERT INTO qr_scans(qr_code_id,employee_id,scan_type,scanned_at)
  SELECT id,w[2],'half',    d+'09:15:00'::time FROM qr_codes WHERE greenhouse_id=g1 AND gol=3 AND side='B' AND status='active';
  INSERT INTO qr_scans(qr_code_id,employee_id,scan_type,scanned_at)
  SELECT id,w[1],'complete',d+'10:55:00'::time FROM qr_codes WHERE greenhouse_id=g1 AND gol=3 AND side='F' AND status='active';

  -- 골 4: complete (3건)
  INSERT INTO qr_scans(qr_code_id,employee_id,scan_type,scanned_at)
  SELECT id,w[2],'start',   d+'07:46:00'::time FROM qr_codes WHERE greenhouse_id=g1 AND gol=4 AND side='F' AND status='active';
  INSERT INTO qr_scans(qr_code_id,employee_id,scan_type,scanned_at)
  SELECT id,w[1],'half',    d+'09:20:00'::time FROM qr_codes WHERE greenhouse_id=g1 AND gol=4 AND side='B' AND status='active';
  INSERT INTO qr_scans(qr_code_id,employee_id,scan_type,scanned_at)
  SELECT id,w[2],'complete',d+'11:00:00'::time FROM qr_codes WHERE greenhouse_id=g1 AND gol=4 AND side='F' AND status='active';

  -- 골 5: complete (3건)
  INSERT INTO qr_scans(qr_code_id,employee_id,scan_type,scanned_at)
  SELECT id,w[1],'start',   d+'07:51:00'::time FROM qr_codes WHERE greenhouse_id=g1 AND gol=5 AND side='F' AND status='active';
  INSERT INTO qr_scans(qr_code_id,employee_id,scan_type,scanned_at)
  SELECT id,w[2],'half',    d+'09:25:00'::time FROM qr_codes WHERE greenhouse_id=g1 AND gol=5 AND side='B' AND status='active';
  INSERT INTO qr_scans(qr_code_id,employee_id,scan_type,scanned_at)
  SELECT id,w[1],'complete',d+'11:05:00'::time FROM qr_codes WHERE greenhouse_id=g1 AND gol=5 AND side='F' AND status='active';

  -- 골 6: half (2건)
  INSERT INTO qr_scans(qr_code_id,employee_id,scan_type,scanned_at)
  SELECT id,w[2],'start',   d+'13:31:00'::time FROM qr_codes WHERE greenhouse_id=g1 AND gol=6 AND side='F' AND status='active';
  INSERT INTO qr_scans(qr_code_id,employee_id,scan_type,scanned_at)
  SELECT id,w[1],'half',    d+'14:10:00'::time FROM qr_codes WHERE greenhouse_id=g1 AND gol=6 AND side='B' AND status='active';

  -- 골 7: half (2건)
  INSERT INTO qr_scans(qr_code_id,employee_id,scan_type,scanned_at)
  SELECT id,w[1],'start',   d+'13:45:00'::time FROM qr_codes WHERE greenhouse_id=g1 AND gol=7 AND side='F' AND status='active';
  INSERT INTO qr_scans(qr_code_id,employee_id,scan_type,scanned_at)
  SELECT id,w[2],'half',    d+'14:25:00'::time FROM qr_codes WHERE greenhouse_id=g1 AND gol=7 AND side='B' AND status='active';

  -- 골 8: start (1건)
  INSERT INTO qr_scans(qr_code_id,employee_id,scan_type,scanned_at)
  SELECT id,w[1],'start',   d+'15:05:00'::time FROM qr_codes WHERE greenhouse_id=g1 AND gol=8 AND side='F' AND status='active';

  -- 골 9: start (1건)
  INSERT INTO qr_scans(qr_code_id,employee_id,scan_type,scanned_at)
  SELECT id,w[2],'start',   d+'15:30:00'::time FROM qr_codes WHERE greenhouse_id=g1 AND gol=9 AND side='F' AND status='active';

  -- 골 10: idle (삽입 없음)

  RAISE NOTICE '1cmp 완료 (23건 예상)';

  -- ============================================================
  -- 5. 2cmp (w[3]=김점숙, w[4]=김태진) — 골 1~10
  --    골1~5 complete, 골6~8 half, 골9~10 start
  -- ============================================================

  -- 골 1: complete (3건)
  INSERT INTO qr_scans(qr_code_id,employee_id,scan_type,scanned_at)
  SELECT id,w[3],'start',   d+'07:32:00'::time FROM qr_codes WHERE greenhouse_id=g2 AND gol=1 AND side='F' AND status='active';
  INSERT INTO qr_scans(qr_code_id,employee_id,scan_type,scanned_at)
  SELECT id,w[4],'half',    d+'09:06:00'::time FROM qr_codes WHERE greenhouse_id=g2 AND gol=1 AND side='B' AND status='active';
  INSERT INTO qr_scans(qr_code_id,employee_id,scan_type,scanned_at)
  SELECT id,w[3],'complete',d+'10:46:00'::time FROM qr_codes WHERE greenhouse_id=g2 AND gol=1 AND side='F' AND status='active';

  -- 골 2: complete (3건)
  INSERT INTO qr_scans(qr_code_id,employee_id,scan_type,scanned_at)
  SELECT id,w[4],'start',   d+'07:37:00'::time FROM qr_codes WHERE greenhouse_id=g2 AND gol=2 AND side='F' AND status='active';
  INSERT INTO qr_scans(qr_code_id,employee_id,scan_type,scanned_at)
  SELECT id,w[3],'half',    d+'09:11:00'::time FROM qr_codes WHERE greenhouse_id=g2 AND gol=2 AND side='B' AND status='active';
  INSERT INTO qr_scans(qr_code_id,employee_id,scan_type,scanned_at)
  SELECT id,w[4],'complete',d+'10:51:00'::time FROM qr_codes WHERE greenhouse_id=g2 AND gol=2 AND side='F' AND status='active';

  -- 골 3: complete (3건)
  INSERT INTO qr_scans(qr_code_id,employee_id,scan_type,scanned_at)
  SELECT id,w[3],'start',   d+'07:42:00'::time FROM qr_codes WHERE greenhouse_id=g2 AND gol=3 AND side='F' AND status='active';
  INSERT INTO qr_scans(qr_code_id,employee_id,scan_type,scanned_at)
  SELECT id,w[4],'half',    d+'09:16:00'::time FROM qr_codes WHERE greenhouse_id=g2 AND gol=3 AND side='B' AND status='active';
  INSERT INTO qr_scans(qr_code_id,employee_id,scan_type,scanned_at)
  SELECT id,w[3],'complete',d+'10:56:00'::time FROM qr_codes WHERE greenhouse_id=g2 AND gol=3 AND side='F' AND status='active';

  -- 골 4: complete (3건)
  INSERT INTO qr_scans(qr_code_id,employee_id,scan_type,scanned_at)
  SELECT id,w[4],'start',   d+'07:47:00'::time FROM qr_codes WHERE greenhouse_id=g2 AND gol=4 AND side='F' AND status='active';
  INSERT INTO qr_scans(qr_code_id,employee_id,scan_type,scanned_at)
  SELECT id,w[3],'half',    d+'09:21:00'::time FROM qr_codes WHERE greenhouse_id=g2 AND gol=4 AND side='B' AND status='active';
  INSERT INTO qr_scans(qr_code_id,employee_id,scan_type,scanned_at)
  SELECT id,w[4],'complete',d+'11:01:00'::time FROM qr_codes WHERE greenhouse_id=g2 AND gol=4 AND side='F' AND status='active';

  -- 골 5: complete (3건)
  INSERT INTO qr_scans(qr_code_id,employee_id,scan_type,scanned_at)
  SELECT id,w[3],'start',   d+'07:52:00'::time FROM qr_codes WHERE greenhouse_id=g2 AND gol=5 AND side='F' AND status='active';
  INSERT INTO qr_scans(qr_code_id,employee_id,scan_type,scanned_at)
  SELECT id,w[4],'half',    d+'09:26:00'::time FROM qr_codes WHERE greenhouse_id=g2 AND gol=5 AND side='B' AND status='active';
  INSERT INTO qr_scans(qr_code_id,employee_id,scan_type,scanned_at)
  SELECT id,w[3],'complete',d+'11:06:00'::time FROM qr_codes WHERE greenhouse_id=g2 AND gol=5 AND side='F' AND status='active';

  -- 골 6: half (2건)
  INSERT INTO qr_scans(qr_code_id,employee_id,scan_type,scanned_at)
  SELECT id,w[4],'start',   d+'13:32:00'::time FROM qr_codes WHERE greenhouse_id=g2 AND gol=6 AND side='F' AND status='active';
  INSERT INTO qr_scans(qr_code_id,employee_id,scan_type,scanned_at)
  SELECT id,w[3],'half',    d+'14:11:00'::time FROM qr_codes WHERE greenhouse_id=g2 AND gol=6 AND side='B' AND status='active';

  -- 골 7: half (2건)
  INSERT INTO qr_scans(qr_code_id,employee_id,scan_type,scanned_at)
  SELECT id,w[3],'start',   d+'13:46:00'::time FROM qr_codes WHERE greenhouse_id=g2 AND gol=7 AND side='F' AND status='active';
  INSERT INTO qr_scans(qr_code_id,employee_id,scan_type,scanned_at)
  SELECT id,w[4],'half',    d+'14:26:00'::time FROM qr_codes WHERE greenhouse_id=g2 AND gol=7 AND side='B' AND status='active';

  -- 골 8: half (2건)
  INSERT INTO qr_scans(qr_code_id,employee_id,scan_type,scanned_at)
  SELECT id,w[4],'start',   d+'13:58:00'::time FROM qr_codes WHERE greenhouse_id=g2 AND gol=8 AND side='F' AND status='active';
  INSERT INTO qr_scans(qr_code_id,employee_id,scan_type,scanned_at)
  SELECT id,w[3],'half',    d+'14:38:00'::time FROM qr_codes WHERE greenhouse_id=g2 AND gol=8 AND side='B' AND status='active';

  -- 골 9: start (1건)
  INSERT INTO qr_scans(qr_code_id,employee_id,scan_type,scanned_at)
  SELECT id,w[3],'start',   d+'15:06:00'::time FROM qr_codes WHERE greenhouse_id=g2 AND gol=9 AND side='F' AND status='active';

  -- 골 10: start (1건)
  INSERT INTO qr_scans(qr_code_id,employee_id,scan_type,scanned_at)
  SELECT id,w[4],'start',   d+'15:31:00'::time FROM qr_codes WHERE greenhouse_id=g2 AND gol=10 AND side='F' AND status='active';

  RAISE NOTICE '2cmp 완료 (23건 예상)';

  -- ============================================================
  -- 6. 3cmp (w[5]=문영이, w[6]=윤화순) — 골 1~7
  --    골1~4 complete, 골5 half, 골6~7 start
  -- ============================================================

  -- 골 1: complete (3건)
  INSERT INTO qr_scans(qr_code_id,employee_id,scan_type,scanned_at)
  SELECT id,w[5],'start',   d+'07:33:00'::time FROM qr_codes WHERE greenhouse_id=g3 AND gol=1 AND side='F' AND status='active';
  INSERT INTO qr_scans(qr_code_id,employee_id,scan_type,scanned_at)
  SELECT id,w[6],'half',    d+'09:07:00'::time FROM qr_codes WHERE greenhouse_id=g3 AND gol=1 AND side='B' AND status='active';
  INSERT INTO qr_scans(qr_code_id,employee_id,scan_type,scanned_at)
  SELECT id,w[5],'complete',d+'10:47:00'::time FROM qr_codes WHERE greenhouse_id=g3 AND gol=1 AND side='F' AND status='active';

  -- 골 2: complete (3건)
  INSERT INTO qr_scans(qr_code_id,employee_id,scan_type,scanned_at)
  SELECT id,w[6],'start',   d+'07:38:00'::time FROM qr_codes WHERE greenhouse_id=g3 AND gol=2 AND side='F' AND status='active';
  INSERT INTO qr_scans(qr_code_id,employee_id,scan_type,scanned_at)
  SELECT id,w[5],'half',    d+'09:12:00'::time FROM qr_codes WHERE greenhouse_id=g3 AND gol=2 AND side='B' AND status='active';
  INSERT INTO qr_scans(qr_code_id,employee_id,scan_type,scanned_at)
  SELECT id,w[6],'complete',d+'10:52:00'::time FROM qr_codes WHERE greenhouse_id=g3 AND gol=2 AND side='F' AND status='active';

  -- 골 3: complete (3건)
  INSERT INTO qr_scans(qr_code_id,employee_id,scan_type,scanned_at)
  SELECT id,w[5],'start',   d+'07:43:00'::time FROM qr_codes WHERE greenhouse_id=g3 AND gol=3 AND side='F' AND status='active';
  INSERT INTO qr_scans(qr_code_id,employee_id,scan_type,scanned_at)
  SELECT id,w[6],'half',    d+'09:17:00'::time FROM qr_codes WHERE greenhouse_id=g3 AND gol=3 AND side='B' AND status='active';
  INSERT INTO qr_scans(qr_code_id,employee_id,scan_type,scanned_at)
  SELECT id,w[5],'complete',d+'10:57:00'::time FROM qr_codes WHERE greenhouse_id=g3 AND gol=3 AND side='F' AND status='active';

  -- 골 4: complete (3건)
  INSERT INTO qr_scans(qr_code_id,employee_id,scan_type,scanned_at)
  SELECT id,w[6],'start',   d+'07:48:00'::time FROM qr_codes WHERE greenhouse_id=g3 AND gol=4 AND side='F' AND status='active';
  INSERT INTO qr_scans(qr_code_id,employee_id,scan_type,scanned_at)
  SELECT id,w[5],'half',    d+'09:22:00'::time FROM qr_codes WHERE greenhouse_id=g3 AND gol=4 AND side='B' AND status='active';
  INSERT INTO qr_scans(qr_code_id,employee_id,scan_type,scanned_at)
  SELECT id,w[6],'complete',d+'11:02:00'::time FROM qr_codes WHERE greenhouse_id=g3 AND gol=4 AND side='F' AND status='active';

  -- 골 5: half (2건)
  INSERT INTO qr_scans(qr_code_id,employee_id,scan_type,scanned_at)
  SELECT id,w[5],'start',   d+'13:33:00'::time FROM qr_codes WHERE greenhouse_id=g3 AND gol=5 AND side='F' AND status='active';
  INSERT INTO qr_scans(qr_code_id,employee_id,scan_type,scanned_at)
  SELECT id,w[6],'half',    d+'14:12:00'::time FROM qr_codes WHERE greenhouse_id=g3 AND gol=5 AND side='B' AND status='active';

  -- 골 6: start (1건)
  INSERT INTO qr_scans(qr_code_id,employee_id,scan_type,scanned_at)
  SELECT id,w[5],'start',   d+'15:07:00'::time FROM qr_codes WHERE greenhouse_id=g3 AND gol=6 AND side='F' AND status='active';

  -- 골 7: start (1건)
  INSERT INTO qr_scans(qr_code_id,employee_id,scan_type,scanned_at)
  SELECT id,w[6],'start',   d+'15:32:00'::time FROM qr_codes WHERE greenhouse_id=g3 AND gol=7 AND side='F' AND status='active';

  RAISE NOTICE '3cmp 완료 (16건 예상)';

  -- ============================================================
  -- 7. 4cmp (w[7]=정경은, w[8]=정은영, w[9]=조혜숙) — 골 1~19
  --    골1~9 complete, 골10~11 half, 골12~14 start, 골15~19 idle
  --    골7에 pause/resume 포함 (5건)
  -- ============================================================

  -- 골 1: complete (3건)
  INSERT INTO qr_scans(qr_code_id,employee_id,scan_type,scanned_at)
  SELECT id,w[7],'start',   d+'07:34:00'::time FROM qr_codes WHERE greenhouse_id=g4 AND gol=1 AND side='F' AND status='active';
  INSERT INTO qr_scans(qr_code_id,employee_id,scan_type,scanned_at)
  SELECT id,w[8],'half',    d+'09:08:00'::time FROM qr_codes WHERE greenhouse_id=g4 AND gol=1 AND side='B' AND status='active';
  INSERT INTO qr_scans(qr_code_id,employee_id,scan_type,scanned_at)
  SELECT id,w[9],'complete',d+'10:48:00'::time FROM qr_codes WHERE greenhouse_id=g4 AND gol=1 AND side='F' AND status='active';

  -- 골 2: complete (3건)
  INSERT INTO qr_scans(qr_code_id,employee_id,scan_type,scanned_at)
  SELECT id,w[8],'start',   d+'07:38:00'::time FROM qr_codes WHERE greenhouse_id=g4 AND gol=2 AND side='F' AND status='active';
  INSERT INTO qr_scans(qr_code_id,employee_id,scan_type,scanned_at)
  SELECT id,w[9],'half',    d+'09:12:00'::time FROM qr_codes WHERE greenhouse_id=g4 AND gol=2 AND side='B' AND status='active';
  INSERT INTO qr_scans(qr_code_id,employee_id,scan_type,scanned_at)
  SELECT id,w[7],'complete',d+'10:52:00'::time FROM qr_codes WHERE greenhouse_id=g4 AND gol=2 AND side='F' AND status='active';

  -- 골 3: complete (3건)
  INSERT INTO qr_scans(qr_code_id,employee_id,scan_type,scanned_at)
  SELECT id,w[9],'start',   d+'07:42:00'::time FROM qr_codes WHERE greenhouse_id=g4 AND gol=3 AND side='F' AND status='active';
  INSERT INTO qr_scans(qr_code_id,employee_id,scan_type,scanned_at)
  SELECT id,w[7],'half',    d+'09:16:00'::time FROM qr_codes WHERE greenhouse_id=g4 AND gol=3 AND side='B' AND status='active';
  INSERT INTO qr_scans(qr_code_id,employee_id,scan_type,scanned_at)
  SELECT id,w[8],'complete',d+'10:56:00'::time FROM qr_codes WHERE greenhouse_id=g4 AND gol=3 AND side='F' AND status='active';

  -- 골 4: complete (3건)
  INSERT INTO qr_scans(qr_code_id,employee_id,scan_type,scanned_at)
  SELECT id,w[7],'start',   d+'07:46:00'::time FROM qr_codes WHERE greenhouse_id=g4 AND gol=4 AND side='F' AND status='active';
  INSERT INTO qr_scans(qr_code_id,employee_id,scan_type,scanned_at)
  SELECT id,w[8],'half',    d+'09:20:00'::time FROM qr_codes WHERE greenhouse_id=g4 AND gol=4 AND side='B' AND status='active';
  INSERT INTO qr_scans(qr_code_id,employee_id,scan_type,scanned_at)
  SELECT id,w[9],'complete',d+'11:00:00'::time FROM qr_codes WHERE greenhouse_id=g4 AND gol=4 AND side='F' AND status='active';

  -- 골 5: complete (3건)
  INSERT INTO qr_scans(qr_code_id,employee_id,scan_type,scanned_at)
  SELECT id,w[8],'start',   d+'07:50:00'::time FROM qr_codes WHERE greenhouse_id=g4 AND gol=5 AND side='F' AND status='active';
  INSERT INTO qr_scans(qr_code_id,employee_id,scan_type,scanned_at)
  SELECT id,w[9],'half',    d+'09:24:00'::time FROM qr_codes WHERE greenhouse_id=g4 AND gol=5 AND side='B' AND status='active';
  INSERT INTO qr_scans(qr_code_id,employee_id,scan_type,scanned_at)
  SELECT id,w[7],'complete',d+'11:04:00'::time FROM qr_codes WHERE greenhouse_id=g4 AND gol=5 AND side='F' AND status='active';

  -- 골 6: complete (3건)
  INSERT INTO qr_scans(qr_code_id,employee_id,scan_type,scanned_at)
  SELECT id,w[9],'start',   d+'07:54:00'::time FROM qr_codes WHERE greenhouse_id=g4 AND gol=6 AND side='F' AND status='active';
  INSERT INTO qr_scans(qr_code_id,employee_id,scan_type,scanned_at)
  SELECT id,w[7],'half',    d+'09:28:00'::time FROM qr_codes WHERE greenhouse_id=g4 AND gol=6 AND side='B' AND status='active';
  INSERT INTO qr_scans(qr_code_id,employee_id,scan_type,scanned_at)
  SELECT id,w[8],'complete',d+'11:08:00'::time FROM qr_codes WHERE greenhouse_id=g4 AND gol=6 AND side='F' AND status='active';

  -- 골 7: complete + pause/resume (5건)
  INSERT INTO qr_scans(qr_code_id,employee_id,scan_type,scanned_at)
  SELECT id,w[7],'start',   d+'07:58:00'::time FROM qr_codes WHERE greenhouse_id=g4 AND gol=7 AND side='F' AND status='active';
  INSERT INTO qr_scans(qr_code_id,employee_id,scan_type,scanned_at)
  SELECT id,w[7],'pause',   d+'08:40:00'::time FROM qr_codes WHERE greenhouse_id=g4 AND gol=7 AND side='F' AND status='active';
  INSERT INTO qr_scans(qr_code_id,employee_id,scan_type,scanned_at)
  SELECT id,w[7],'resume',  d+'09:00:00'::time FROM qr_codes WHERE greenhouse_id=g4 AND gol=7 AND side='F' AND status='active';
  INSERT INTO qr_scans(qr_code_id,employee_id,scan_type,scanned_at)
  SELECT id,w[8],'half',    d+'09:32:00'::time FROM qr_codes WHERE greenhouse_id=g4 AND gol=7 AND side='B' AND status='active';
  INSERT INTO qr_scans(qr_code_id,employee_id,scan_type,scanned_at)
  SELECT id,w[9],'complete',d+'11:12:00'::time FROM qr_codes WHERE greenhouse_id=g4 AND gol=7 AND side='F' AND status='active';

  -- 골 8: complete (3건)
  INSERT INTO qr_scans(qr_code_id,employee_id,scan_type,scanned_at)
  SELECT id,w[8],'start',   d+'08:02:00'::time FROM qr_codes WHERE greenhouse_id=g4 AND gol=8 AND side='F' AND status='active';
  INSERT INTO qr_scans(qr_code_id,employee_id,scan_type,scanned_at)
  SELECT id,w[9],'half',    d+'09:36:00'::time FROM qr_codes WHERE greenhouse_id=g4 AND gol=8 AND side='B' AND status='active';
  INSERT INTO qr_scans(qr_code_id,employee_id,scan_type,scanned_at)
  SELECT id,w[7],'complete',d+'11:16:00'::time FROM qr_codes WHERE greenhouse_id=g4 AND gol=8 AND side='F' AND status='active';

  -- 골 9: complete (3건)
  INSERT INTO qr_scans(qr_code_id,employee_id,scan_type,scanned_at)
  SELECT id,w[9],'start',   d+'08:06:00'::time FROM qr_codes WHERE greenhouse_id=g4 AND gol=9 AND side='F' AND status='active';
  INSERT INTO qr_scans(qr_code_id,employee_id,scan_type,scanned_at)
  SELECT id,w[7],'half',    d+'09:40:00'::time FROM qr_codes WHERE greenhouse_id=g4 AND gol=9 AND side='B' AND status='active';
  INSERT INTO qr_scans(qr_code_id,employee_id,scan_type,scanned_at)
  SELECT id,w[8],'complete',d+'11:20:00'::time FROM qr_codes WHERE greenhouse_id=g4 AND gol=9 AND side='F' AND status='active';

  -- 골 10: half (2건)
  INSERT INTO qr_scans(qr_code_id,employee_id,scan_type,scanned_at)
  SELECT id,w[7],'start',   d+'13:34:00'::time FROM qr_codes WHERE greenhouse_id=g4 AND gol=10 AND side='F' AND status='active';
  INSERT INTO qr_scans(qr_code_id,employee_id,scan_type,scanned_at)
  SELECT id,w[8],'half',    d+'14:13:00'::time FROM qr_codes WHERE greenhouse_id=g4 AND gol=10 AND side='B' AND status='active';

  -- 골 11: half (2건)
  INSERT INTO qr_scans(qr_code_id,employee_id,scan_type,scanned_at)
  SELECT id,w[8],'start',   d+'13:48:00'::time FROM qr_codes WHERE greenhouse_id=g4 AND gol=11 AND side='F' AND status='active';
  INSERT INTO qr_scans(qr_code_id,employee_id,scan_type,scanned_at)
  SELECT id,w[9],'half',    d+'14:28:00'::time FROM qr_codes WHERE greenhouse_id=g4 AND gol=11 AND side='B' AND status='active';

  -- 골 12: start (1건)
  INSERT INTO qr_scans(qr_code_id,employee_id,scan_type,scanned_at)
  SELECT id,w[7],'start',   d+'15:08:00'::time FROM qr_codes WHERE greenhouse_id=g4 AND gol=12 AND side='F' AND status='active';

  -- 골 13: start (1건)
  INSERT INTO qr_scans(qr_code_id,employee_id,scan_type,scanned_at)
  SELECT id,w[8],'start',   d+'15:20:00'::time FROM qr_codes WHERE greenhouse_id=g4 AND gol=13 AND side='F' AND status='active';

  -- 골 14: start (1건)
  INSERT INTO qr_scans(qr_code_id,employee_id,scan_type,scanned_at)
  SELECT id,w[9],'start',   d+'15:35:00'::time FROM qr_codes WHERE greenhouse_id=g4 AND gol=14 AND side='F' AND status='active';

  -- 골 15~19: idle (삽입 없음)

  RAISE NOTICE '4cmp 완료 (36건 예상)';

  -- ============================================================
  -- 8. 검증
  -- ============================================================
  SELECT COUNT(*) INTO total_cnt
  FROM qr_scans
  WHERE employee_id = ANY(w)
    AND scanned_at >= d
    AND scanned_at < d + 1;

  SELECT COUNT(*) INTO start_cnt
  FROM qr_scans WHERE employee_id = ANY(w) AND scanned_at >= d AND scanned_at < d+1 AND scan_type = 'start';

  SELECT COUNT(*) INTO half_cnt
  FROM qr_scans WHERE employee_id = ANY(w) AND scanned_at >= d AND scanned_at < d+1 AND scan_type = 'half';

  SELECT COUNT(*) INTO complete_cnt
  FROM qr_scans WHERE employee_id = ANY(w) AND scanned_at >= d AND scanned_at < d+1 AND scan_type = 'complete';

  SELECT COUNT(*) INTO pause_cnt
  FROM qr_scans WHERE employee_id = ANY(w) AND scanned_at >= d AND scanned_at < d+1 AND scan_type = 'pause';

  SELECT COUNT(*) INTO resume_cnt
  FROM qr_scans WHERE employee_id = ANY(w) AND scanned_at >= d AND scanned_at < d+1 AND scan_type = 'resume';

  RAISE NOTICE '검증 결과 — 총 %건 (start=%, half=%, complete=%, pause=%, resume=%)',
    total_cnt, start_cnt, half_cnt, complete_cnt, pause_cnt, resume_cnt;

  IF total_cnt NOT BETWEEN 85 AND 110 THEN
    RAISE EXCEPTION '총 스캔 건수 이상: %건 (예상 85~110)', total_cnt;
  END IF;
  IF start_cnt < 35 THEN
    RAISE EXCEPTION 'start 건수 부족: %건 (예상 ≥35)', start_cnt;
  END IF;
  IF complete_cnt < 18 THEN
    RAISE EXCEPTION 'complete 건수 부족: %건 (예상 ≥18)', complete_cnt;
  END IF;
  IF pause_cnt < 2 OR resume_cnt < 2 THEN
    RAISE EXCEPTION 'pause/resume 건수 부족: pause=%건, resume=%건 (각 ≥2 필요)', pause_cnt, resume_cnt;
  END IF;

  RAISE NOTICE '검증 통과 ✓';

END $$;
