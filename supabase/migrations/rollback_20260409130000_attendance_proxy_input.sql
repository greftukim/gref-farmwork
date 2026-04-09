-- ============================================================================
-- 롤백: attendance 대리 입력 스키마 + 정책 제거
-- 원본: 20260409130000_attendance_proxy_input.sql
--
-- 주의: 이 롤백은 is_proxy=true인 기존 대리 입력 레코드가 있을 경우
-- 해당 정보(input_by, is_proxy)를 영구 손실한다. 실제 운영 중 롤백은
-- 신중히 판단해야 한다.
-- ============================================================================

-- 1. RLS INSERT 정책 제거
DROP POLICY IF EXISTS "attendance_authenticated_insert" ON public.attendance;

-- 2. 컬럼 제거
ALTER TABLE public.attendance
  DROP COLUMN IF EXISTS is_proxy,
  DROP COLUMN IF EXISTS input_by;
