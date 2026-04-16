BEGIN;

-- ═══════════════════════════════════════════════════════════════════════
-- J-4-BRANCHES-SEED-FIX: branches 테이블 4개 row 보완 (시드 누락 정정)
-- 원인: UI-A 단계 1.5 DB 실측에서 branches 테이블에 busan/jinju 2개 row만
--       존재 확인, CHECK 제약 6개 허용 vs 실 row 2건 → 4개 row 누락
-- 정정: INSERT 4 row (hadong/headquarters/management/seedlab)
--       위치 정보 NULL (미지정, GPS 검증 건너뛰기 의도)
-- 영향: branchNameMap 자동 반영 (src/lib/excelExport.js 7곳,
--       src/pages/admin/EmployeesPage.jsx 4곳, WorkStatsPage.jsx 2곳)
-- 의존: branches 기존 busan/jinju row (ON CONFLICT 회피)
-- 후속: BRANCHES-LOCATION-001 (박민식·김민국 답변 후 실 위치 UPDATE)
-- 롤백: 본 파일 하단 인라인 주석 참조
-- ═══════════════════════════════════════════════════════════════════════

INSERT INTO branches (code, name, latitude, longitude, radius_meters)
VALUES
  ('hadong', '하동HUB', NULL, NULL, NULL),
  ('headquarters', '총괄본사', NULL, NULL, NULL),
  ('management', '관리팀', NULL, NULL, NULL),
  ('seedlab', 'Seed LAB', NULL, NULL, NULL)
ON CONFLICT (code) DO NOTHING;

COMMIT;

-- ═══════════════════════════════════════════════════════════════════════
-- 롤백 (필요 시):
--   BEGIN;
--   DELETE FROM branches WHERE code IN ('hadong', 'headquarters', 'management', 'seedlab');
--   COMMIT;
--
-- 주의: 롤백 시 해당 지점 직원의 branchNameMap 라벨 미표시
--       (UI-A 단계 1.5 상태 복원, 실 운영 시 화면 결함 발생)
-- ═══════════════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════════════
-- 검증 (마이그레이션 적용 후 별도 SELECT 실행):
--   SELECT code, name, latitude, longitude, radius_meters
--   FROM branches ORDER BY code;
--   기대: 6행 (busan, hadong, headquarters, jinju, management, seedlab)
--         신규 4행의 latitude/longitude/radius_meters 모두 NULL
--
-- ★ 검증 DO 블록 마이그레이션 파일 미포함 (교훈 16)
-- ═══════════════════════════════════════════════════════════════════════
