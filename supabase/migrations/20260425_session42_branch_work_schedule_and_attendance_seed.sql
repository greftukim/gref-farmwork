-- Migration: 세션 42 — branch_work_schedule_config 신설 + attendance 시드 재구성
-- branch_work_schedule_config: 지점별 근무시간/근무요일 설정 테이블 신설
-- attendance: 시드_작업자01~03 175건 DELETE + 실 직원 24명 4월 시드 INSERT
-- 롤백: DROP TABLE branch_work_schedule_config CASCADE;
--       (attendance 시드 복원 불가 — 실행 전 pg_dump 권장)

BEGIN;

-- ─── 1. branch_work_schedule_config 테이블 신설 ───────────────────────────────
CREATE TABLE IF NOT EXISTS branch_work_schedule_config (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch     TEXT NOT NULL UNIQUE CHECK (branch IN ('busan', 'jinju', 'hadong')),
  start_time TIME NOT NULL DEFAULT '07:30',
  end_time   TIME NOT NULL DEFAULT '16:30',
  workdays   JSONB NOT NULL DEFAULT '["mon","tue","wed","thu","fri"]',
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES employees(id)
);

INSERT INTO branch_work_schedule_config (branch, start_time, end_time, workdays)
VALUES
  ('busan',  '07:30', '16:30', '["mon","tue","wed","thu","fri","sat"]'::jsonb),
  ('jinju',  '07:30', '16:30', '["mon","tue","wed","thu","fri"]'::jsonb),
  ('hadong', '07:30', '16:30', '["mon","tue","wed","thu","fri","sat"]'::jsonb)
ON CONFLICT (branch) DO NOTHING;

-- ─── 2. 시드_작업자01~03 attendance 175건 삭제 ────────────────────────────────
-- (is_active=false 비활성 시드, 세션 26 비활성화 후 의미 없는 레코드)
DELETE FROM attendance
WHERE employee_id IN (
  'a0000001-0000-4000-8000-000000000001'::uuid,
  'a0000001-0000-4000-8000-000000000002'::uuid,
  'a0000001-0000-4000-8000-000000000003'::uuid
);

-- ─── 3. 실 직원 24명 × 4월 근무일 attendance 시드 ────────────────────────────
-- busan/hadong: 월~토 22일, jinju: 월~금 18일
-- check_in: start_time ± ~5~23분 (정상) / +30~62분 (지각 10%)
-- check_out: end_time + 0~45분
-- seq % 10 = 0 → 지각, 나머지 → 정상
INSERT INTO attendance (employee_id, date, check_in, check_out, work_minutes, status, is_proxy)
WITH workers AS (
  SELECT
    e.id,
    e.branch,
    bwsc.start_time,
    bwsc.end_time,
    bwsc.workdays,
    ROW_NUMBER() OVER (ORDER BY e.branch, e.name) AS wr
  FROM employees e
  JOIN branch_work_schedule_config bwsc ON bwsc.branch = e.branch
  WHERE e.role = 'worker' AND e.is_active = true
),
calendar AS (
  SELECT
    d::date AS work_date,
    ROW_NUMBER() OVER (ORDER BY d) AS dr
  FROM generate_series('2026-04-01'::date, '2026-04-25'::date, '1 day'::interval) d
),
cross_join AS (
  SELECT
    w.id,
    w.branch,
    w.start_time,
    w.end_time,
    w.workdays,
    c.work_date,
    w.wr,
    c.dr,
    CASE EXTRACT(DOW FROM c.work_date)
      WHEN 0 THEN 'sun'
      WHEN 1 THEN 'mon'
      WHEN 2 THEN 'tue'
      WHEN 3 THEN 'wed'
      WHEN 4 THEN 'thu'
      WHEN 5 THEN 'fri'
      WHEN 6 THEN 'sat'
    END AS dow_abbr
  FROM workers w
  CROSS JOIN calendar c
),
filtered AS (
  SELECT
    cj.*,
    ROW_NUMBER() OVER (ORDER BY cj.wr, cj.dr) AS seq
  FROM cross_join cj
  WHERE cj.workdays ? cj.dow_abbr
)
SELECT
  id           AS employee_id,
  work_date    AS date,
  -- check_in (KST → UTC)
  CASE WHEN seq % 10 = 0
    -- 지각: start_time + 30~62분
    THEN (work_date + start_time + ((30 + (seq % 5) * 8) * INTERVAL '1 minute')) AT TIME ZONE 'Asia/Seoul'
    -- 정상: start_time - 5 ~ +23분
    ELSE (work_date + start_time + ((-5 + (seq % 15) * 2) * INTERVAL '1 minute')) AT TIME ZONE 'Asia/Seoul'
  END          AS check_in,
  -- check_out (KST → UTC): end_time + 0~45분
  (work_date + end_time + ((seq % 10) * 5 * INTERVAL '1 minute')) AT TIME ZONE 'Asia/Seoul' AS check_out,
  NULL::int    AS work_minutes,
  CASE WHEN seq % 10 = 0 THEN 'late' ELSE 'working' END AS status,
  false        AS is_proxy
FROM filtered;

-- ─── 4. 검증 ─────────────────────────────────────────────────────────────────
DO $$
DECLARE
  v_cfg   INT;
  v_total INT;
  v_late  INT;
  v_branches INT;
BEGIN
  SELECT COUNT(*) INTO v_cfg   FROM branch_work_schedule_config;
  SELECT COUNT(*) INTO v_total FROM attendance;
  SELECT COUNT(*) INTO v_late  FROM attendance WHERE status = 'late';
  SELECT COUNT(DISTINCT e.branch) INTO v_branches
    FROM attendance a JOIN employees e ON e.id = a.employee_id;

  ASSERT v_cfg     = 3,   'config 행 오류: '      || v_cfg;
  ASSERT v_total  >= 480, 'attendance 부족: '     || v_total;
  ASSERT v_late   >= 40,  '지각 레코드 부족: '    || v_late;
  ASSERT v_branches = 3,  '지점 3개 미만: '       || v_branches;

  RAISE NOTICE 'Migration OK — config=%, attendance=%, late=%, branches=%',
    v_cfg, v_total, v_late, v_branches;
END;
$$;

COMMIT;
