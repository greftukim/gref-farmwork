BEGIN;

-- ═══════════════════════════════════════════════════════════════════════
-- UI-0-B-2: resident_id 암호화 RPC search_path 정정
-- 원인: pgcrypto 함수 extensions 스키마 위치, 기존 search_path 미포함
--       → ERROR 42883 function pgp_sym_encrypt(text, text) does not exist
--       (UI-0-D 단계 3 D1·D2 round-trip 검증 시 발견)
-- 정정: ALTER FUNCTION SET search_path TO 'public', 'extensions', 'pg_temp'
-- 영향: 함수 본문 무변경, 권한 정책 보존, search_path 1속성만 변경
-- 의존: b425e87 (UI-0-B 기존 마이그레이션) 선행 적용 필수
-- 롤백: 본 파일 하단 인라인 주석 참조
-- ═══════════════════════════════════════════════════════════════════════

-- ── encrypt_resident_id search_path 정정 ────────────────────────────
ALTER FUNCTION public.encrypt_resident_id(text)
  SET search_path TO 'public', 'extensions', 'pg_temp';

-- ── decrypt_resident_id search_path 정정 ────────────────────────────
ALTER FUNCTION public.decrypt_resident_id(uuid)
  SET search_path TO 'public', 'extensions', 'pg_temp';

COMMIT;

-- ═══════════════════════════════════════════════════════════════════════
-- 롤백 (필요 시):
--   BEGIN;
--   ALTER FUNCTION public.encrypt_resident_id(text)
--     SET search_path TO 'public', 'pg_temp';
--   ALTER FUNCTION public.decrypt_resident_id(uuid)
--     SET search_path TO 'public', 'pg_temp';
--   COMMIT;
-- ═══════════════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════════════
-- 검증 (마이그레이션 적용 후 별도 SELECT 실행):
--   SELECT proname, proconfig FROM pg_proc
--   WHERE proname IN ('encrypt_resident_id', 'decrypt_resident_id');
--   기대: proconfig = ["search_path=public, extensions, pg_temp"]
--
-- ★ 검증 DO 블록 마이그레이션 파일 미포함 (교훈 16)
-- ═══════════════════════════════════════════════════════════════════════
