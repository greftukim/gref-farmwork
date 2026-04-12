-- ============================================================================
-- 트랙 F-0: daily_work_logs 테이블 + RLS 정책
-- 작성일: 2026-04-12
-- 도메인 노트: docs/DOMAIN_DAILY_WORKERS.md
-- ============================================================================
-- [컨벤션] RLS는 프로젝트 헬퍼 함수 사용 (20260408120000_rls_helper_functions.sql)
--   current_employee_role()   — 현재 로그인 관리자의 role
--   current_employee_branch() — 현재 로그인 관리자의 branch
-- ============================================================================

-- ----------------------------------------------------------------------------
-- [TEMP-DECISION-1] payment_status enum
-- 임시 결정: 2단계 (pending / paid)
-- 사유: 박민식·김민국 미수신. 단순 시작 후 운영 피드백으로 확장.
-- 도메인 노트 원안: text NOT NULL default 'unpaid' (unpaid/paid_daily/paid_monthly 3단계)
-- 답 수신 시 수정 위치: 이 ENUM 정의만 ALTER TYPE으로 확장 + 도메인 노트 동기화
-- ----------------------------------------------------------------------------
CREATE TYPE payment_status AS ENUM ('pending', 'paid');

-- ----------------------------------------------------------------------------
-- daily_work_logs 테이블
-- ----------------------------------------------------------------------------
-- [컬럼 설계] 도메인 노트와 1:1 일치. 임시 결정은 TEMP-DECISION 마커로만 표시.
-- work_minutes, daily_wage: GENERATED ALWAYS AS STORED (PostgreSQL 12+ 지원, Supabase 15)
--   — GENERATED 컬럼은 다른 GENERATED 컬럼을 참조 불가 → daily_wage는 공식 인라인
-- ----------------------------------------------------------------------------
CREATE TABLE daily_work_logs (
  id               UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  work_date        DATE         NOT NULL,  -- 도메인 노트 원안 'date'. PostgreSQL 예약어 회피
  branch           TEXT         NOT NULL
                                CHECK (branch IN ('busan', 'jinju', 'hadong')),
  worker_name      TEXT         NOT NULL,
  worker_phone     TEXT,                   -- nullable. 일별 지급 시 계좌이체용

  start_time       TIME         NOT NULL,  -- 협의 출근 시각
  end_time         TIME         NOT NULL   CHECK (end_time > start_time),

  -- [TEMP-DECISION-2] break_minutes
  -- 임시 결정: NULL 허용 (입력 없음 = 휴게 미기록, COALESCE 0으로 계산)
  -- 도메인 노트 원안: int NOT NULL default 0
  -- 답 수신 시 수정 위치: 이 컬럼만 ALTER COLUMN SET NOT NULL SET DEFAULT 0 + 도메인 노트 동기화
  break_minutes    INTEGER      CHECK (break_minutes IS NULL OR break_minutes >= 0),

  -- 자동 계산: (end_time - start_time)을 분으로 환산 - break_minutes
  -- GENERATED 컬럼은 INSERT/UPDATE 시 직접 값 지정 불가 (DB가 자동 산출)
  work_minutes     INTEGER      GENERATED ALWAYS AS (
                                  (
                                    EXTRACT(EPOCH FROM (end_time - start_time))::NUMERIC / 60
                                    - COALESCE(break_minutes, 0)
                                  )::INTEGER
                                ) STORED,

  hourly_wage      INTEGER      NOT NULL CHECK (hourly_wage > 0),

  -- [TEMP-DECISION-4] daily_wage 반올림 정책
  -- 임시 결정: ROUND() 일반 반올림 (0.5이상 올림, PostgreSQL 기본)
  -- 사유: 박민식·김민국 미확인 항목 ① (도메인 노트 §8)
  -- 도메인 노트 원안: "일반 반올림 (5이상 올림) — 실제 운영에서 다르면 재확인"
  -- 답 수신 시 수정 위치: 이 GENERATED 식의 ROUND()만 교체 + 도메인 노트 동기화
  -- NOTE: GENERATED 컬럼은 다른 GENERATED 컬럼(work_minutes) 참조 불가 → 공식 인라인
  daily_wage       INTEGER      GENERATED ALWAYS AS (
                                  ROUND(
                                    hourly_wage::NUMERIC
                                    * (
                                        EXTRACT(EPOCH FROM (end_time - start_time))::NUMERIC / 60.0
                                        - COALESCE(break_minutes, 0)::NUMERIC
                                      )
                                    / 60.0
                                  )::INTEGER
                                ) STORED,

  work_description TEXT,                   -- nullable. "포장 보조", "수확" 등
  payment_status   payment_status NOT NULL DEFAULT 'pending',
  paid_at          DATE,                   -- nullable. 지급일
  created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_daily_work_logs_branch_date
  ON daily_work_logs (branch, work_date DESC);

CREATE INDEX idx_daily_work_logs_payment_status
  ON daily_work_logs (payment_status);

-- ----------------------------------------------------------------------------
-- RLS 활성화
-- ----------------------------------------------------------------------------
ALTER TABLE daily_work_logs ENABLE ROW LEVEL SECURITY;

-- ----------------------------------------------------------------------------
-- [TEMP-DECISION-3] branch 허용 범위
-- 임시 결정: busan / jinju / hadong 3개 지점 모두 허용
-- 사유: 진주·하동 운영 여부 미확인. 안 쓰면 데이터 0건일 뿐.
-- 답 수신 시 수정 위치: 아래 정책의 USING/WITH CHECK 절 (필요 시 branch 제한 추가)
-- ----------------------------------------------------------------------------

-- farm_admin: 자기 branch만 ALL (SELECT / INSERT / UPDATE / DELETE)
CREATE POLICY "daily_work_logs_farm_admin"
  ON daily_work_logs
  FOR ALL
  TO authenticated
  USING (
    public.current_employee_role() = 'farm_admin'
    AND public.current_employee_branch() = daily_work_logs.branch
  )
  WITH CHECK (
    public.current_employee_role() = 'farm_admin'
    AND public.current_employee_branch() = daily_work_logs.branch
  );

-- hr_admin / master: 전 지점 ALL
CREATE POLICY "daily_work_logs_hr_admin_master"
  ON daily_work_logs
  FOR ALL
  TO authenticated
  USING (
    public.current_employee_role() IN ('hr_admin', 'master')
  )
  WITH CHECK (
    public.current_employee_role() IN ('hr_admin', 'master')
  );

-- worker / anon: 정책 없음 = 묵시적 거부

-- ----------------------------------------------------------------------------
-- updated_at 자동 갱신 트리거
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION update_daily_work_logs_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_daily_work_logs_updated_at
  BEFORE UPDATE ON daily_work_logs
  FOR EACH ROW
  EXECUTE FUNCTION update_daily_work_logs_updated_at();

-- ----------------------------------------------------------------------------
-- 테이블/컬럼 주석
-- ----------------------------------------------------------------------------
COMMENT ON TABLE daily_work_logs IS
  '일용직/시급제 근무 기록. 도메인: docs/DOMAIN_DAILY_WORKERS.md';

COMMENT ON COLUMN daily_work_logs.work_date IS
  '근무 일자. 도메인 노트 원안 컬럼명 date 에서 PostgreSQL 예약어 충돌 회피를 위해 변경';

COMMENT ON COLUMN daily_work_logs.break_minutes IS
  'NULL 허용 임시. 박민식·김민국 답 수신 시 NOT NULL DEFAULT 0 전환 가능';

COMMENT ON COLUMN daily_work_logs.work_minutes IS
  'GENERATED: (end_time - start_time)분 - COALESCE(break_minutes, 0). 직접 입력 불가';

COMMENT ON COLUMN daily_work_logs.daily_wage IS
  'GENERATED: ROUND(hourly_wage * work_minutes / 60). 반올림 정책 임시';

COMMENT ON COLUMN daily_work_logs.payment_status IS
  '2단계 enum(pending/paid) 임시. 박민식·김민국 답 수신 시 ALTER TYPE 확장 가능';
