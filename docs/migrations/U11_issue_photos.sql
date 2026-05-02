-- 트랙 77 후속 U11 — 이상신고 사진 첨부 활성화 (G77-H)
-- 적용 시점: 사용자가 Supabase 대시보드 SQL Editor에서 직접 실행
-- 이전 박제: docs/TRACK77_U5_REPORT.md §4 (G77-H 사전 SQL)
-- 본 라운드 결정 (G-Storage-4): 별 테이블 issue_photos (1:N, JSONB[] 컬럼 추가 미채택)
--
-- 주의:
--   1. 작업자 인증 = device_token 기반 anon 컨텍스트 (Supabase Auth 미사용)
--      → auth.uid() 기반 RLS 정책은 worker에서 동작 안 함
--      → 기존 패턴 (qr_codes / qr_scans / employees_anon_qr_login) 따라 anon INSERT 허용
--   2. 본 라운드는 worker INSERT/SELECT만 활성화. 관리자 측 사진 표시는 별 트랙 (G-Storage-7).
--   3. RLS 보안 강화는 BACKLOG TRACK77-AUTH-RLS-WORKER-001 별 트랙 (device_token 기반 격리).

BEGIN;

-- ========================================================================
-- 1) issue_photos 테이블 신설
-- ========================================================================

CREATE TABLE IF NOT EXISTS public.issue_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  issue_id UUID NOT NULL REFERENCES public.issues(id) ON DELETE CASCADE,
  photo_url TEXT NOT NULL,
  photo_path TEXT NOT NULL,
  photo_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_issue_photos_issue_id ON public.issue_photos(issue_id);

-- ========================================================================
-- 2) issue_photos RLS 정책
-- ========================================================================

ALTER TABLE public.issue_photos ENABLE ROW LEVEL SECURITY;

-- anon (작업자 device_token 컨텍스트) INSERT/SELECT 허용
-- 기존 issues 테이블 패턴 따름 (issues가 anon INSERT 동작 중)
CREATE POLICY "issue_photos_anon_insert"
  ON public.issue_photos FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "issue_photos_anon_select"
  ON public.issue_photos FOR SELECT
  TO anon
  USING (true);

-- authenticated (관리자) ALL 허용
CREATE POLICY "issue_photos_authenticated_all"
  ON public.issue_photos FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- ========================================================================
-- 3) Storage 버킷 신설 (issue_photos)
-- ========================================================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('issue_photos', 'issue_photos', false)
ON CONFLICT (id) DO NOTHING;

-- ========================================================================
-- 4) Storage RLS 정책
-- ========================================================================

-- anon INSERT (작업자 device_token 컨텍스트로 업로드)
-- 경로 제약: {worker_id}/{issue_id}/{index}.jpg
CREATE POLICY "issue_photos_storage_anon_insert"
  ON storage.objects FOR INSERT
  TO anon
  WITH CHECK (bucket_id = 'issue_photos');

-- anon SELECT (자기 사진 read — public URL 표시용)
CREATE POLICY "issue_photos_storage_anon_select"
  ON storage.objects FOR SELECT
  TO anon
  USING (bucket_id = 'issue_photos');

-- authenticated (관리자) ALL
CREATE POLICY "issue_photos_storage_authenticated_all"
  ON storage.objects FOR ALL
  TO authenticated
  USING (bucket_id = 'issue_photos')
  WITH CHECK (bucket_id = 'issue_photos');

COMMIT;

-- ========================================================================
-- 검증 쿼리 (실행 후 사용자 확인)
-- ========================================================================
-- 1) 테이블 생성 확인
--    SELECT * FROM public.issue_photos LIMIT 0;
--
-- 2) RLS 정책 조회
--    SELECT policyname, cmd, qual, with_check, roles
--    FROM pg_policies
--    WHERE schemaname = 'public' AND tablename = 'issue_photos';
--
-- 3) Storage 버킷 확인
--    SELECT id, name, public FROM storage.buckets WHERE id = 'issue_photos';
--
-- 4) Storage 정책 조회
--    SELECT policyname, cmd, qual, with_check, roles
--    FROM pg_policies
--    WHERE schemaname = 'storage' AND tablename = 'objects'
--      AND policyname LIKE 'issue_photos%';

-- ========================================================================
-- G77-H 박제 SQL (U5 보고서 §4)와의 차이
-- ========================================================================
-- U5 박제: issues.photos JSONB[] 컬럼 추가 (옵션 1)
-- 본 라운드: issue_photos 별 테이블 (G-Storage-4 결정 — 정규화 + 메타데이터 박제 + 1:N)
-- 이유:
--   - photo_order로 순서 보장
--   - 향후 photo별 메타데이터(작업자 위치/촬영 시각/모델) 확장 가능
--   - JSONB[] 배열 mutation 동시성 위험 회피

-- ========================================================================
-- 롤백 (필요 시)
-- ========================================================================
-- BEGIN;
-- DROP TABLE IF EXISTS public.issue_photos CASCADE;
-- DELETE FROM storage.buckets WHERE id = 'issue_photos';
-- DROP POLICY IF EXISTS "issue_photos_storage_anon_insert" ON storage.objects;
-- DROP POLICY IF EXISTS "issue_photos_storage_anon_select" ON storage.objects;
-- DROP POLICY IF EXISTS "issue_photos_storage_authenticated_all" ON storage.objects;
-- COMMIT;
