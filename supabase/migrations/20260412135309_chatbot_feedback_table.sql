-- ============================================================================
-- 세션 13 (2026-04-13) Track H H-2.5 — chatbot_feedback 테이블 신설
--
-- 도메인 노트: docs/DOMAIN_CHATBOT_V1.md §3.4.2 submit_feedback (도구 6)
--             커밋 c30762e 스펙과 1:1 정합 (교훈 14: 단일 출처 원칙)
--
-- 적용 방법: Supabase 대시보드 SQL Editor 수동 실행
--           (교훈 16: DDL only, DO 블록/PL/pgSQL/information_schema 검증 쿼리 없음)
--
-- FK 대상: employees(id), chat_logs(id) — 교훈 28에 따라 runtime 검증 필수
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1) 테이블
--    교훈 28: employees·chat_logs FK는 실제 DB 반영 필수 —
--            마이그레이션 적용 직후 information_schema.table_constraints로
--            FK 실재 runtime 검증 (단위 3-B 체크리스트 (c))
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.chatbot_feedback (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id     uuid        NOT NULL REFERENCES public.employees(id) ON DELETE RESTRICT,
  feedback_type   text        NOT NULL CHECK (feedback_type IN ('bug', 'feature_request', 'general')),
  content         text        NOT NULL CHECK (char_length(content) BETWEEN 1 AND 2000),
  chat_log_id     uuid        REFERENCES public.chat_logs(id) ON DELETE SET NULL,
  session_id      uuid,
  turn_index      integer,
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- 2) 인덱스 4종
-- ----------------------------------------------------------------------------
CREATE INDEX idx_chatbot_feedback_employee_id
  ON public.chatbot_feedback(employee_id);

CREATE INDEX idx_chatbot_feedback_created_at
  ON public.chatbot_feedback(created_at DESC);

CREATE INDEX idx_chatbot_feedback_type
  ON public.chatbot_feedback(feedback_type);

CREATE INDEX idx_chatbot_feedback_session_id
  ON public.chatbot_feedback(session_id)
  WHERE session_id IS NOT NULL;

-- ----------------------------------------------------------------------------
-- 3) RLS 활성화 + 정책 3종
--    교훈 17: 정의만으로 닫지 말 것 — 단위 3-B에서 pg_policy polpermissive,
--            pg_class rowsecurity 실측 확인 (체크리스트 (e), (f))
-- ----------------------------------------------------------------------------
ALTER TABLE public.chatbot_feedback ENABLE ROW LEVEL SECURITY;

-- INSERT: admin 3종(farm_admin, hr_admin, master) 본인 employee row만
CREATE POLICY chatbot_feedback_insert_own
  ON public.chatbot_feedback
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.employees
      WHERE id = chatbot_feedback.employee_id
        AND auth_user_id = auth.uid()
        AND role IN ('farm_admin', 'hr_admin', 'master')
    )
  );

-- SELECT 1: 본인 피드백
CREATE POLICY chatbot_feedback_select_own
  ON public.chatbot_feedback
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.employees
      WHERE id = chatbot_feedback.employee_id
        AND auth_user_id = auth.uid()
    )
  );

-- SELECT 2: master 전체
CREATE POLICY chatbot_feedback_select_master
  ON public.chatbot_feedback
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.employees
      WHERE auth_user_id = auth.uid()
        AND role = 'master'
    )
  );

-- UPDATE/DELETE: 정책 없음 → RLS 기본 거부로 전면 차단

-- ----------------------------------------------------------------------------
-- 테이블·컬럼 주석
-- ----------------------------------------------------------------------------
COMMENT ON TABLE public.chatbot_feedback IS
  '인앱 챗봇 v1 관리자 피드백 저장. 도메인: docs/DOMAIN_CHATBOT_V1.md §3.4.2 도구 6';

COMMENT ON COLUMN public.chatbot_feedback.employee_id IS
  '피드백 제출자의 employees.id (FK → employees.id ON DELETE RESTRICT)';

COMMENT ON COLUMN public.chatbot_feedback.feedback_type IS
  '피드백 종류: bug | feature_request | general';

COMMENT ON COLUMN public.chatbot_feedback.content IS
  '피드백 본문. 1~2000자 CHECK 제약';

COMMENT ON COLUMN public.chatbot_feedback.chat_log_id IS
  '연결된 챗봇 대화 로그 ID (FK → chat_logs.id ON DELETE SET NULL). NULL 허용 — 역추적 불가 시나리오 대비';

COMMENT ON COLUMN public.chatbot_feedback.session_id IS
  '챗봇 세션 UUID. chat_log_id와 함께 대화 컨텍스트 역추적용. NULL 허용';

COMMENT ON COLUMN public.chatbot_feedback.turn_index IS
  '챗봇 세션 내 user turn index. NULL 허용';
