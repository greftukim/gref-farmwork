-- ============================================================================
-- RLS Group E: 시스템 데이터
--   fcm_tokens (FCM 푸시 토큰)
-- 작업 0-6 (RLS 전면 재설계)
-- 작성일: 2026-04-08
--
-- 전제:
--   - 20260408120000_rls_helper_functions.sql 적용 완료
--
-- 클라이언트 접근 경로 (firebase.js saveTokenToSupabase):
--   1. SELECT: employee_id + token 기준 중복 확인 (upsert 패턴)
--   2. UPDATE: existing.id 기준 updated_at/device_info 갱신
--   3. INSERT: 신규 토큰 저장
--   호출자: worker(anon) + 관리자(authenticated) 양쪽 모두
--
-- 서버 접근 경로 (send-push Edge Function):
--   service_role → RLS 무시 → 별도 정책 불필요
--
-- anon 정책 설계:
--   anon은 current_employee_id()가 NULL → employee_id = current_employee_id() 불가
--   EXISTS 검증 패턴 사용: employee_id가 실재하는 활성 worker인지 확인
--   (Q3과 동일한 패턴, Q4 답변 반영)
--
-- 파트 1 원문: "SELECT/UPDATE/DELETE: 서버(service_role)만"
--   → 수정: 클라이언트 접근 경로 재확인 결과, anon + authenticated 모두 필요.
--     서버(service_role)는 별도 정책 없이 RLS 무시로 처리.
-- ============================================================================

DROP POLICY IF EXISTS anon_full_access ON public.fcm_tokens;
DROP POLICY IF EXISTS anon_full_access_auth ON public.fcm_tokens;

ALTER TABLE public.fcm_tokens ENABLE ROW LEVEL SECURITY;

-- ────────────────────────────────────────────────────────────────────────────
-- anon 정책 (worker 경로)
-- ────────────────────────────────────────────────────────────────────────────

-- anon SELECT: 중복 토큰 확인 (upsert 패턴의 첫 단계)
CREATE POLICY "fcm_tokens_anon_select"
ON public.fcm_tokens
FOR SELECT
TO anon
USING (
  employee_id IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.employees
    WHERE id = employee_id
      AND role = 'worker'
      AND is_active = true
  )
);

COMMENT ON POLICY "fcm_tokens_anon_select" ON public.fcm_tokens IS
'anon SELECT: firebase.js upsert 패턴의 중복 확인용. 활성 worker의 토큰만.';

-- anon INSERT: 신규 토큰 저장
CREATE POLICY "fcm_tokens_anon_insert"
ON public.fcm_tokens
FOR INSERT
TO anon
WITH CHECK (
  employee_id IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.employees
    WHERE id = employee_id
      AND role = 'worker'
      AND is_active = true
  )
);

COMMENT ON POLICY "fcm_tokens_anon_insert" ON public.fcm_tokens IS
'anon INSERT: 실재하는 활성 worker의 employee_id로만. RLS-DEBT-010 참조.';

-- anon UPDATE: 토큰 갱신 (updated_at, device_info)
CREATE POLICY "fcm_tokens_anon_update"
ON public.fcm_tokens
FOR UPDATE
TO anon
USING (
  employee_id IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.employees
    WHERE id = employee_id
      AND role = 'worker'
      AND is_active = true
  )
)
WITH CHECK (
  employee_id IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.employees
    WHERE id = employee_id
      AND role = 'worker'
      AND is_active = true
  )
);

COMMENT ON POLICY "fcm_tokens_anon_update" ON public.fcm_tokens IS
'anon UPDATE: 활성 worker의 토큰 갱신(updated_at/device_info). employee_id 변경 방지.';

-- ────────────────────────────────────────────────────────────────────────────
-- authenticated 정책 (관리자 경로)
-- ────────────────────────────────────────────────────────────────────────────

-- authenticated SELECT: 본인 토큰만 (upsert 패턴)
CREATE POLICY "fcm_tokens_authenticated_select"
ON public.fcm_tokens
FOR SELECT
TO authenticated
USING (
  employee_id = public.current_employee_id()
);

COMMENT ON POLICY "fcm_tokens_authenticated_select" ON public.fcm_tokens IS
'authenticated SELECT: 본인 employee_id의 토큰만. firebase.js upsert 중복 확인용.';

-- authenticated INSERT: 본인 토큰 저장
CREATE POLICY "fcm_tokens_authenticated_insert"
ON public.fcm_tokens
FOR INSERT
TO authenticated
WITH CHECK (
  employee_id = public.current_employee_id()
);

-- authenticated UPDATE: 본인 토큰 갱신
CREATE POLICY "fcm_tokens_authenticated_update"
ON public.fcm_tokens
FOR UPDATE
TO authenticated
USING (employee_id = public.current_employee_id())
WITH CHECK (employee_id = public.current_employee_id());

-- DELETE: 금지 (기본 거부 — 토큰 만료는 DB 직접 또는 Edge Function에서 처리)

-- ============================================================================
-- 검증 쿼리 (주석 처리)
-- ============================================================================

-- SELECT tablename, policyname, cmd, roles
-- FROM pg_policies
-- WHERE schemaname = 'public' AND tablename = 'fcm_tokens'
-- ORDER BY policyname;
-- 기대: 6개 정책
--   anon: select, insert, update (3개)
--   authenticated: select, insert, update (3개)
