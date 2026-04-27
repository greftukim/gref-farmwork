-- ============================================================================
-- 세션 74-D: qr_scans.scan_type CHECK constraint 확장
-- pause, resume 추가 (현재: start/half/complete/switch 4종)
-- 작성일: 2026-04-27
-- Gate: 사용자 승인 후 apply_migration 실행
--
-- 롤백:
--   ALTER TABLE public.qr_scans DROP CONSTRAINT IF EXISTS qr_scans_scan_type_check;
--   ALTER TABLE public.qr_scans ADD CONSTRAINT qr_scans_scan_type_check
--     CHECK (scan_type IN ('start', 'half', 'complete', 'switch'));
-- ============================================================================

BEGIN;

ALTER TABLE public.qr_scans
  DROP CONSTRAINT IF EXISTS qr_scans_scan_type_check;

ALTER TABLE public.qr_scans
  ADD CONSTRAINT qr_scans_scan_type_check
  CHECK (scan_type IN ('start', 'half', 'complete', 'switch', 'pause', 'resume'));

-- 검증
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'qr_scans_scan_type_check'
      AND pg_get_constraintdef(oid) LIKE '%pause%'
  ) THEN
    RAISE EXCEPTION 'qr_scans_scan_type_check 업데이트 실패 — 롤백';
  END IF;
  RAISE NOTICE 'qr_scans_scan_type_check 확인: pause/resume 추가 완료';
END $$;

COMMIT;
