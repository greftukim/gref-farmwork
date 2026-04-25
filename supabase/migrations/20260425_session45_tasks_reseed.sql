-- session45: TASKS-WORKER-ID-MISMATCH-001 해소
-- 전략 B: 시드 작업자 orphan tasks 358건 DELETE + 활성 worker 24명 × 15건 신규 시드 INSERT
--
-- 배경: tasks.worker_id 가 is_active=false 시드_작업자01~03(branch=busan) UUID만 가리켜
--       SchedulePage(busan/jinju/hadong), TaskBoardPage 에 worker 연결 불가
--       활성 worker: busan 9 / jinju 7 / hadong 8 = 합 24명
--
-- zone_id: A동(983dc563) / B동(760ad29d) / C동(c6d1e535) 순환
-- date 범위: CURRENT_DATE-21 ~ CURRENT_DATE+21 (gs*3일 간격)
-- status: 과거(-1일 이전) = completed, 최근(-1~+1) = in_progress, 미래 = pending
-- estimated_minutes: 작업유형별 현실적 값 (수확180 / 적엽120 / 유인150 / 병해충60 / 러너90)
--
-- ROLLBACK:
--   INSERT INTO tasks ... SELECT ... (위 INSERT 에 사용한 worker 목록 × 15건 DELETE 필요)
--   또는 특정 날짜 이후 created_at 으로 삭제

BEGIN;

-- ─────────────────────────────────────────
-- STEP 1: 사전 카운트 (검증용)
-- ─────────────────────────────────────────
DO $$
DECLARE cnt INT;
BEGIN
  SELECT COUNT(*) INTO cnt FROM tasks;
  RAISE NOTICE '사전 tasks 총 건수: %', cnt;
  IF cnt != 359 THEN
    RAISE WARNING '예상 359건과 다름: %건 — 계속 진행', cnt;
  END IF;
END $$;

-- ─────────────────────────────────────────
-- STEP 2: 시드 작업자 orphan tasks DELETE (358건 예상)
-- ─────────────────────────────────────────
DELETE FROM tasks
WHERE worker_id IN (
  'a0000001-0000-4000-8000-000000000001',
  'a0000001-0000-4000-8000-000000000002',
  'a0000001-0000-4000-8000-000000000003'
);

DO $$
DECLARE cnt INT;
BEGIN
  SELECT COUNT(*) INTO cnt FROM tasks;
  RAISE NOTICE 'DELETE 후 tasks 건수: % (예상: 1 — 윤화순 1건 잔존)', cnt;
  IF cnt > 5 THEN
    RAISE EXCEPTION 'orphan DELETE 미완: %건 잔존, ROLLBACK', cnt;
  END IF;
END $$;

-- ─────────────────────────────────────────
-- STEP 3: 활성 worker 24명 × 15건 INSERT (360건)
-- ─────────────────────────────────────────
INSERT INTO tasks (
  worker_id, title, date, task_type, zone_id,
  status, estimated_minutes, assigned_at, created_at
)
SELECT
  w.id AS worker_id,

  -- title: 구역 + 작업유형
  CASE ((gs - 1) % 3)
    WHEN 0 THEN 'A동 '
    WHEN 1 THEN 'B동 '
    ELSE        'C동 '
  END
  ||
  CASE ((gs - 1) % 5)
    WHEN 0 THEN '수확'
    WHEN 1 THEN '적엽'
    WHEN 2 THEN '유인·결속'
    WHEN 3 THEN '병해충 예찰'
    ELSE        '러너 정리'
  END
  AS title,

  -- date: today-21 ~ today+21 (3일 간격)
  (CURRENT_DATE - 21 + (gs - 1) * 3)::date AS date,

  -- task_type
  CASE ((gs - 1) % 5)
    WHEN 0 THEN '수확'
    WHEN 1 THEN '적엽'
    WHEN 2 THEN '유인·결속'
    WHEN 3 THEN '병해충 예찰'
    ELSE        '러너 정리'
  END AS task_type,

  -- zone_id: A/B/C동 순환
  (ARRAY[
    '983dc563-0f37-417e-9805-da588db28e9f'::uuid,
    '760ad29d-8405-4a9d-a2ae-5e1a758c29cf'::uuid,
    'c6d1e535-b99f-4fdb-9fa2-56ccba22ebd0'::uuid
  ])[((gs - 1) % 3) + 1] AS zone_id,

  -- status: 날짜 기반
  CASE
    WHEN (CURRENT_DATE - 21 + (gs - 1) * 3)::date < CURRENT_DATE - 1 THEN 'completed'
    WHEN (CURRENT_DATE - 21 + (gs - 1) * 3)::date <= CURRENT_DATE + 1  THEN 'in_progress'
    ELSE 'pending'
  END AS status,

  -- estimated_minutes: 작업유형별 현실적 값
  CASE ((gs - 1) % 5)
    WHEN 0 THEN 180   -- 수확
    WHEN 1 THEN 120   -- 적엽
    WHEN 2 THEN 150   -- 유인·결속
    WHEN 3 THEN 60    -- 병해충 예찰
    ELSE        90    -- 러너 정리
  END AS estimated_minutes,

  now() AS assigned_at,

  -- created_at: 시간적 분산 (오래된 작업일수록 earlier)
  now() - ((15 - gs) * INTERVAL '1 day') AS created_at

FROM employees w
CROSS JOIN generate_series(1, 15) AS gs
WHERE w.role = 'worker' AND w.is_active = true;

-- ─────────────────────────────────────────
-- STEP 4: 최종 검증 DO 블록
-- ─────────────────────────────────────────
DO $$
DECLARE
  total_cnt  INT;
  busan_cnt  INT;
  jinju_cnt  INT;
  hadong_cnt INT;
  orphan_cnt INT;
  comp_cnt   INT;
  pend_cnt   INT;
  prog_cnt   INT;
BEGIN
  SELECT COUNT(*) INTO total_cnt  FROM tasks;
  SELECT COUNT(*) INTO orphan_cnt FROM tasks
    WHERE worker_id IN (
      'a0000001-0000-4000-8000-000000000001',
      'a0000001-0000-4000-8000-000000000002',
      'a0000001-0000-4000-8000-000000000003'
    );
  SELECT COUNT(*) INTO busan_cnt  FROM tasks t JOIN employees e ON t.worker_id = e.id WHERE e.branch='busan'  AND e.is_active=true;
  SELECT COUNT(*) INTO jinju_cnt  FROM tasks t JOIN employees e ON t.worker_id = e.id WHERE e.branch='jinju'  AND e.is_active=true;
  SELECT COUNT(*) INTO hadong_cnt FROM tasks t JOIN employees e ON t.worker_id = e.id WHERE e.branch='hadong' AND e.is_active=true;
  SELECT COUNT(*) INTO comp_cnt   FROM tasks WHERE status='completed';
  SELECT COUNT(*) INTO pend_cnt   FROM tasks WHERE status='pending';
  SELECT COUNT(*) INTO prog_cnt   FROM tasks WHERE status='in_progress';

  -- 검증
  IF orphan_cnt > 0 THEN
    RAISE EXCEPTION 'FAIL: 시드 orphan %건 잔존 → ROLLBACK', orphan_cnt;
  END IF;
  IF total_cnt < 355 THEN
    RAISE EXCEPTION 'FAIL: 총 tasks %건 (355 이상 예상) → ROLLBACK', total_cnt;
  END IF;
  IF busan_cnt < 125 THEN
    RAISE EXCEPTION 'FAIL: busan tasks %건 부족 → ROLLBACK', busan_cnt;
  END IF;
  IF jinju_cnt < 95 THEN
    RAISE EXCEPTION 'FAIL: jinju tasks %건 부족 → ROLLBACK', jinju_cnt;
  END IF;
  IF hadong_cnt < 110 THEN
    RAISE EXCEPTION 'FAIL: hadong tasks %건 부족 → ROLLBACK', hadong_cnt;
  END IF;

  RAISE NOTICE '=== 검증 통과 ===';
  RAISE NOTICE 'tasks 총 %건 (busan=%, jinju=%, hadong=%)', total_cnt, busan_cnt, jinju_cnt, hadong_cnt;
  RAISE NOTICE 'status: completed=% / in_progress=% / pending=%', comp_cnt, prog_cnt, pend_cnt;
  RAISE NOTICE 'orphan 잔존: %건', orphan_cnt;
END $$;

COMMIT;
