-- ============================================================================
-- 트랙 H-0: chat_logs 테이블 + RLS 정책
-- 작성일: 2026-04-12
-- 도메인 노트: docs/DOMAIN_CHATBOT_V1.md §2
-- ============================================================================
-- [컨벤션] RLS는 프로젝트 헬퍼 함수 사용 (20260408120000_rls_helper_functions.sql)
--   current_employee_role()  — 현재 로그인 관리자의 role 반환 (employees.role)
--   current_employee_id()    — 현재 로그인 관리자의 employees.id 반환
-- ============================================================================
-- [설계 쟁점 확정 — Phase 5 세션 8]
-- 쟁점 1 — INSERT 정책 없음: Edge Function이 service_role로 INSERT 수행.
--          사용자 직접 INSERT는 정책 부재로 기본 거부.
-- 쟁점 2 — user_role CHECK: farm_admin / hr_admin / master 3개만 허용.
--          worker·team_leader는 chat_logs 접근 자체 불가 (§1.2 설계 의도).
-- 쟁점 3 — branch 조건부 NOT NULL: farm_admin은 NOT NULL 강제,
--          hr_admin·master는 NULL 허용 (§2.1 주석 반영).
-- 쟁점 4 — token_input / token_output / tools_used: NULL 허용, CHECK 없음.
-- ============================================================================

CREATE TABLE public.chat_logs (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid        NOT NULL REFERENCES auth.users(id),
  branch       text,
  user_role    text        NOT NULL
                             CHECK (user_role IN ('farm_admin', 'hr_admin', 'master')),
  session_id   uuid        NOT NULL,
  turn_index   int         NOT NULL,
  role         text        NOT NULL
                             CHECK (role IN ('user', 'assistant', 'system')),
  content      text        NOT NULL,
  token_input  int,
  token_output int,
  tools_used   jsonb,
  created_at   timestamptz NOT NULL DEFAULT now(),

  -- 쟁점 3: farm_admin은 지점 소속 필수, hr_admin·master는 전 지점 담당으로 NULL 허용
  CONSTRAINT chat_logs_branch_required_for_farm_admin CHECK (
    (user_role = 'farm_admin' AND branch IS NOT NULL)
    OR (user_role IN ('hr_admin', 'master'))
  )
);

-- ----------------------------------------------------------------------------
-- 인덱스 3종 (도메인 노트 §2.1)
-- ----------------------------------------------------------------------------
-- 본인 이력 조회용
CREATE INDEX idx_chat_logs_user_created
  ON public.chat_logs (user_id, created_at DESC);

-- 관리자 모니터링 시간순 조회용
CREATE INDEX idx_chat_logs_created
  ON public.chat_logs (created_at DESC);

-- 세션 단위 조회용
CREATE INDEX idx_chat_logs_session_turn
  ON public.chat_logs (session_id, turn_index);

-- ----------------------------------------------------------------------------
-- RLS 활성화
-- ----------------------------------------------------------------------------
ALTER TABLE public.chat_logs ENABLE ROW LEVEL SECURITY;

-- ----------------------------------------------------------------------------
-- SELECT 정책 (도메인 노트 §2.2)
-- 정책명 컨벤션: 기존 마이그레이션 패턴 ("테이블명_역할") 준수
-- 권한 판정 근거: chat_logs.user_role(스냅샷)이 아닌 current_employee_role()(현재 요청자 실제 role)
-- ----------------------------------------------------------------------------

-- farm_admin: 본인 user_id 행만 SELECT
CREATE POLICY "chat_logs_select_farm_admin_own"
  ON public.chat_logs
  FOR SELECT
  TO authenticated
  USING (
    public.current_employee_role() = 'farm_admin'
    AND auth.uid() = user_id
  );

-- hr_admin·master: 전체 행 SELECT (모니터링 목적, 도메인 노트 §2.2)
CREATE POLICY "chat_logs_select_admin_all"
  ON public.chat_logs
  FOR SELECT
  TO authenticated
  USING (
    public.current_employee_role() IN ('hr_admin', 'master')
  );

-- worker·team_leader: 정책 없음 = 묵시적 거부
-- INSERT 정책: 없음 — service_role이 INSERT 수행 (쟁점 1, 도메인 노트 §2.2 하단 문장)

-- ----------------------------------------------------------------------------
-- 테이블·컬럼 주석
-- ----------------------------------------------------------------------------
COMMENT ON TABLE public.chat_logs IS
  '인앱 챗봇 v1 대화 로그. admin 전용 (farm_admin/hr_admin/master). 도메인: docs/DOMAIN_CHATBOT_V1.md';

COMMENT ON COLUMN public.chat_logs.user_role IS
  '행 기록 시점 사용자 역할 스냅샷. farm_admin | hr_admin | master 만 허용. RLS 판정 근거 아님 — 판정은 current_employee_role() 사용.';

COMMENT ON COLUMN public.chat_logs.branch IS
  '사용자 소속 지점 스냅샷. farm_admin은 NOT NULL 강제(CHECK 제약), hr_admin·master는 전 지점 담당으로 NULL 허용.';

COMMENT ON COLUMN public.chat_logs.session_id IS
  '동일 대화 묶음 식별자. 챗 패널 열릴 때 클라이언트에서 gen_random_uuid()로 발급. 닫으면 클라이언트 메모리 폐기, 재열기 시 새 세션.';

COMMENT ON COLUMN public.chat_logs.turn_index IS
  '세션 내 턴 순서. 0부터 시작. (session_id, turn_index) 인덱스로 세션 단위 전체 조회 지원.';

COMMENT ON COLUMN public.chat_logs.tools_used IS
  'assistant 턴에서 호출한 도구 목록 (jsonb). v1은 조회 도구만. v2 쓰기 도구 확장 대비용 컬럼.';
