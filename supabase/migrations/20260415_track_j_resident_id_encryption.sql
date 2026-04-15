BEGIN;

-- ═══════════════════════════════════════════════════════════════════════
-- resident_id 암호화 RPC 2종
-- - encrypt_resident_id(p_plaintext text) → text (Base64 암호문)
-- - decrypt_resident_id(p_employee_id uuid) → text (평문)
-- 의존: pgcrypto v1.3 + supabase_vault v0.3.1 (활성 확인 완료)
-- 의존: vault.secrets에 name='resident_id_encrypt_key' 등록 선행 필수
-- 권한: master + hr_admin 전용 (교훈 31 인라인 EXISTS 패턴)
-- 롤백: 본 파일 하단 인라인 주석 참조
-- ═══════════════════════════════════════════════════════════════════════

-- ── 함수 1: encrypt_resident_id ─────────────────────────────────────
-- 호출: 상세 모달 저장 시 hr_admin/master가 평문 입력 → RPC 호출 → 암호문 저장
-- VOLATILE: pgp_sym_encrypt 내부 랜덤 session key 생성 → 매 호출 결과 상이
CREATE OR REPLACE FUNCTION public.encrypt_resident_id(p_plaintext text)
RETURNS text
LANGUAGE plpgsql
VOLATILE SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  v_secret text;
BEGIN
  -- 권한 검증 (교훈 31 인라인 EXISTS 패턴)
  IF NOT EXISTS (
    SELECT 1 FROM employees
    WHERE auth_user_id = auth.uid()
      AND is_active = true
      AND role IN ('master', 'hr_admin')
  ) THEN
    RAISE EXCEPTION 'Permission denied: only master and hr_admin can encrypt resident_id';
  END IF;

  -- 평문 NULL 처리
  IF p_plaintext IS NULL THEN
    RETURN NULL;
  END IF;

  -- Vault key read + secret NULL 가드
  SELECT decrypted_secret INTO v_secret
  FROM vault.decrypted_secrets
  WHERE name = 'resident_id_encrypt_key';

  IF v_secret IS NULL THEN
    RAISE EXCEPTION 'Vault secret missing: resident_id_encrypt_key';
  END IF;

  -- pgp_sym_encrypt + Base64 encode (text 컬럼 저장용)
  RETURN encode(pgp_sym_encrypt(p_plaintext, v_secret), 'base64');
END;
$$;

-- ── 함수 2: decrypt_resident_id ─────────────────────────────────────
-- 호출: 상세 모달 오픈 시 hr_admin/master가 employee_id 전달 → 평문 반환
-- STABLE: 같은 암호문 + 같은 키 → 항상 같은 평문 (결정론적)
CREATE OR REPLACE FUNCTION public.decrypt_resident_id(p_employee_id uuid)
RETURNS text
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  v_encrypted text;
  v_secret    text;
BEGIN
  -- 권한 검증 (교훈 31 인라인 EXISTS 패턴)
  IF NOT EXISTS (
    SELECT 1 FROM employees
    WHERE auth_user_id = auth.uid()
      AND is_active = true
      AND role IN ('master', 'hr_admin')
  ) THEN
    RAISE EXCEPTION 'Permission denied: only master and hr_admin can decrypt resident_id';
  END IF;

  -- 암호화 값 조회 (SECURITY DEFINER → RLS 우회, 위 권한 검증이 대체)
  SELECT resident_id INTO v_encrypted
  FROM employees
  WHERE id = p_employee_id;

  -- 암호화 값 NULL 처리 (미등록 직원 또는 resident_id 미입력)
  IF v_encrypted IS NULL THEN
    RETURN NULL;
  END IF;

  -- Vault key read + secret NULL 가드
  SELECT decrypted_secret INTO v_secret
  FROM vault.decrypted_secrets
  WHERE name = 'resident_id_encrypt_key';

  IF v_secret IS NULL THEN
    RAISE EXCEPTION 'Vault secret missing: resident_id_encrypt_key';
  END IF;

  -- Base64 decode + pgp_sym_decrypt
  RETURN pgp_sym_decrypt(decode(v_encrypted, 'base64'), v_secret)::text;
END;
$$;

-- ── REVOKE + GRANT ───────────────────────────────────────────────────
-- PUBLIC 기본 부여 명시 철회 (anon 포함 미인증 호출 차단)
REVOKE EXECUTE ON FUNCTION public.encrypt_resident_id(text)   FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.decrypt_resident_id(uuid)   FROM PUBLIC;
-- authenticated 역할에만 허용 (함수 내부 role 검증이 2차 통제)
GRANT EXECUTE ON FUNCTION public.encrypt_resident_id(text)    TO authenticated;
GRANT EXECUTE ON FUNCTION public.decrypt_resident_id(uuid)    TO authenticated;

COMMIT;

-- ═══════════════════════════════════════════════════════════════════════
-- 롤백 (필요 시):
--   BEGIN;
--   DROP FUNCTION IF EXISTS public.encrypt_resident_id(text);
--   DROP FUNCTION IF EXISTS public.decrypt_resident_id(uuid);
--   COMMIT;
-- ═══════════════════════════════════════════════════════════════════════

-- ★ 검증 DO 블록 불포함 (교훈 16)
--   검증은 UI-0-D에서 별도 SELECT/SQL Editor 쿼리로 수행
