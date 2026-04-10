-- ============================================================================
-- 트랙 E-2.1: TBM 위험 템플릿 부산LAB 현장 피드백 반영
-- 선행: 20260411100100_tbm_risk_templates_seed.sql
-- 변경 근거: 태우(부산LAB) 현장 검토 결과
--   1. EC 관련 4건 삭제 — 원액 취급 없음, 과장된 위험
--   2. 오이 유인: 사다리 → 리프트 (부산LAB은 사다리 미사용, 리프트 사용)
--   3. 딸기 러너: 가위 강제 → 맨손 작업 현실 반영
--   4. 토마토 수분: 블로워 소음 → 벌(호박벌) 쏘임
--   5. 미니파프리카 수확: 무게 → 칼 베임 (파프리카는 칼로 수확)
--   6. 공통 리프트 위험 신규 추가 (사다리 대체, 복수 작물 공통 사용)
--   7. 공통 '사다리' 위험 삭제 — 부산LAB 사다리 미사용, 리프트로 통일
-- 결과: 35건 → 32건
-- ============================================================================

BEGIN;

-- 1. EC 관련 4건 삭제
DELETE FROM tbm_risk_templates
WHERE task_keyword = 'EC';

-- 1-2. 공통 사다리 위험 삭제 (부산LAB 사다리 미사용)
DELETE FROM tbm_risk_templates
WHERE crop_id IS NULL AND task_keyword = '사다리';

-- 2. 오이 유인: 사다리 → 리프트
UPDATE tbm_risk_templates
SET risk_factor = '리프트 작업 중 낙하·전도',
    mitigation = '리프트 탑승 전 안전바 체결, 이동 시 완전 하강, 적재하중 준수, 2인 1조 권장',
    updated_at = now()
WHERE crop_id = (SELECT id FROM crops WHERE name = '오이')
  AND task_keyword = '유인';

-- 3. 딸기 러너: 가위 → 맨손 현실 반영
UPDATE tbm_risk_templates
SET risk_factor = '맨손 러너 제거 시 손가락 건초염·찰과상',
    mitigation = '목장갑 착용, 1시간 작업 후 5분 손목 스트레칭, 상처 발생 시 즉시 소독',
    updated_at = now()
WHERE crop_id = (SELECT id FROM crops WHERE name = '딸기')
  AND task_keyword = '러너';

-- 4. 토마토 수분: 블로워 → 벌 쏘임
UPDATE tbm_risk_templates
SET risk_factor = '수분용 벌(호박벌) 쏘임',
    mitigation = '벌통 주변 급격한 동작 금지, 향수·화장품 사용 금지, 벌 알레르기 이력자 작업 제외, 응급키트 위치 숙지',
    updated_at = now()
WHERE crop_id = (SELECT id FROM crops WHERE name = '토마토')
  AND task_keyword = '수분';

-- 5. 미니파프리카 수확: 무게 → 칼 베임
UPDATE tbm_risk_templates
SET risk_factor = '수확용 칼에 의한 손 베임',
    mitigation = '절단장갑 착용, 칼날 방향 항상 몸 바깥, 작업 중 대화 금지, 칼 전용 보관함 사용',
    updated_at = now()
WHERE crop_id = (SELECT id FROM crops WHERE name = '미니파프리카')
  AND task_keyword = '수확';

-- 6. 공통 리프트 위험 신규 추가
INSERT INTO tbm_risk_templates (crop_id, task_keyword, risk_factor, mitigation) VALUES
(NULL, '리프트', '고소작업 리프트 낙하·끼임·전도', '탑승 전 안전바 체결, 적재하중 준수, 이동 시 완전 하강, 하부 작업자 없음 확인, 일일 점검 필수');

-- 검증: 32건인지 확인
DO $$
DECLARE
  v_count INT;
BEGIN
  SELECT COUNT(*) INTO v_count FROM tbm_risk_templates;
  IF v_count <> 32 THEN
    RAISE EXCEPTION '템플릿 건수 불일치: 예상 32, 실제 %', v_count;
  END IF;
  RAISE NOTICE '✅ TBM 위험 템플릿 수정 완료 (32건)';
END $$;

COMMIT;

-- ============================================================================
-- 롤백 (참고용)
-- 이 마이그레이션은 DELETE·UPDATE가 섞여 있어 자동 롤백 불가.
-- 필요 시 20260411100100_tbm_risk_templates_seed.sql 재실행 후 다시 적용.
-- ============================================================================
