-- ============================================================================
-- 트랙 E-1: TBM v2 스키마 (반장/위험템플릿/승인 워크플로우)
-- 작성일: 2026-04-11
-- 선행: 20260410100000_safety_checks.sql, 20260408120000_rls_helper_functions.sql
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. 레거시 데이터 정리
-- 트랙 D v1 테스트 데이터(2026-04-09 1일치) 전량 삭제, 태우 확인 완료
-- ============================================================================
TRUNCATE safety_check_results, safety_checks RESTART IDENTITY CASCADE;

-- ============================================================================
-- 2. employees.is_team_leader
-- ============================================================================
ALTER TABLE public.employees
  ADD COLUMN is_team_leader BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX idx_employees_team_leader
  ON public.employees(branch) WHERE is_team_leader = true;

-- ============================================================================
-- 3. safety_checks 확장
-- ============================================================================

-- 3-1. check_type CHECK 제약 동적 삭제 (제약명 추측 금지 → pg_constraint 조회)
DO $$
DECLARE
  _con_name text;
BEGIN
  SELECT con.conname INTO _con_name
  FROM pg_constraint con
    JOIN pg_attribute att ON att.attnum = ANY(con.conkey)
      AND att.attrelid = con.conrelid
  WHERE con.conrelid = 'public.safety_checks'::regclass
    AND con.contype = 'c'          -- CHECK 제약
    AND att.attname = 'check_type'
  LIMIT 1;

  IF _con_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.safety_checks DROP CONSTRAINT %I', _con_name);
  END IF;
END;
$$;

-- 3-2. check_type CHECK 재생성 (pre_task 추가)
ALTER TABLE public.safety_checks
  ADD CONSTRAINT safety_checks_check_type_check
  CHECK (check_type IN ('pre_work', 'post_work', 'pre_task'));

-- 3-3. 신규 컬럼 추가
ALTER TABLE public.safety_checks
  ADD COLUMN status TEXT NOT NULL DEFAULT 'submitted'
    CHECK (status IN ('submitted', 'approved')),
  ADD COLUMN approved_by UUID REFERENCES public.employees(id),
  ADD COLUMN approved_at TIMESTAMPTZ,
  ADD COLUMN shown_risks JSONB,
  ADD COLUMN risks_confirmed_at TIMESTAMPTZ,
  ADD COLUMN task_ids UUID[];

-- ============================================================================
-- 4. tbm_risk_templates 테이블 신규
-- ============================================================================
CREATE TABLE public.tbm_risk_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  crop_id UUID REFERENCES public.crops(id) ON DELETE CASCADE,  -- NULL=공통
  task_keyword TEXT,                                            -- NULL=모든 작업
  risk_factor TEXT NOT NULL,
  mitigation TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_tbm_risk_crop_keyword
  ON public.tbm_risk_templates(crop_id, task_keyword) WHERE is_active = true;

-- ============================================================================
-- 5. RLS — tbm_risk_templates
-- ============================================================================
ALTER TABLE public.tbm_risk_templates ENABLE ROW LEVEL SECURITY;

-- 5-1. SELECT: anon + authenticated 전체 허용 (마스터 데이터)
CREATE POLICY "tbm_risk_templates_select_all"
ON public.tbm_risk_templates FOR SELECT
TO anon, authenticated
USING (true);

-- 5-2. INSERT: authenticated (hr_admin/master)
CREATE POLICY "tbm_risk_templates_authenticated_insert"
ON public.tbm_risk_templates FOR INSERT
TO authenticated
WITH CHECK (
  public.is_master()
  OR (public.current_employee_role() = 'hr_admin')
);

-- 5-3. UPDATE: authenticated (hr_admin/master)
CREATE POLICY "tbm_risk_templates_authenticated_update"
ON public.tbm_risk_templates FOR UPDATE
TO authenticated
USING (
  public.is_master()
  OR (public.current_employee_role() = 'hr_admin')
)
WITH CHECK (
  public.is_master()
  OR (public.current_employee_role() = 'hr_admin')
);

-- 5-4. DELETE: authenticated (hr_admin/master)
CREATE POLICY "tbm_risk_templates_authenticated_delete"
ON public.tbm_risk_templates FOR DELETE
TO authenticated
USING (
  public.is_master()
  OR (public.current_employee_role() = 'hr_admin')
);

-- ============================================================================
-- 6. safety_checks RLS 재검토
-- ============================================================================

-- 6-1. 기존 anon INSERT 정책 확인:
--   safety_checks_anon_insert는 check_type 조건 없이 worker_id/date만 검증.
--   → 'pre_task' INSERT도 기존 정책으로 정상 통과. 변경 불필요.

-- 6-2. 반장 승인 UPDATE 정책 (RLS-DEBT-017 해결)
-- 반장(is_team_leader=true)은 본인 지점 작업자의 safety_checks.status를
-- 'approved'로 변경 가능. approved_by, approved_at 함께 갱신.
CREATE POLICY "safety_checks_team_leader_update"
ON public.safety_checks FOR UPDATE
TO anon
USING (
  EXISTS (
    SELECT 1 FROM public.employees leader
    WHERE leader.id = (
      -- anon 환경에서 worker_id 기반 지점 확인
      -- 승인 요청 시 approved_by에 반장 id가 세팅됨
      safety_checks.approved_by
    )
    AND leader.is_team_leader = true
    AND leader.is_active = true
    AND leader.branch = public.employee_branch(safety_checks.worker_id)
  )
)
WITH CHECK (
  status = 'approved'
  AND approved_by IS NOT NULL
  AND approved_at IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.employees leader
    WHERE leader.id = safety_checks.approved_by
      AND leader.is_team_leader = true
      AND leader.is_active = true
      AND leader.branch = public.employee_branch(safety_checks.worker_id)
  )
);

-- 6-3. authenticated 관리자 UPDATE (hr_admin/master는 전체 승인 가능)
CREATE POLICY "safety_checks_authenticated_update"
ON public.safety_checks FOR UPDATE
TO authenticated
USING (
  public.is_master()
  OR (public.current_employee_role() = 'hr_admin')
)
WITH CHECK (
  public.is_master()
  OR (public.current_employee_role() = 'hr_admin')
);

COMMIT;

-- ============================================================================
-- 롤백 SQL
-- ============================================================================
/*
BEGIN;

-- 6. safety_checks RLS 롤백
DROP POLICY IF EXISTS "safety_checks_authenticated_update" ON public.safety_checks;
DROP POLICY IF EXISTS "safety_checks_team_leader_update" ON public.safety_checks;

-- 5. tbm_risk_templates RLS + 테이블 롤백
DROP POLICY IF EXISTS "tbm_risk_templates_authenticated_delete" ON public.tbm_risk_templates;
DROP POLICY IF EXISTS "tbm_risk_templates_authenticated_update" ON public.tbm_risk_templates;
DROP POLICY IF EXISTS "tbm_risk_templates_authenticated_insert" ON public.tbm_risk_templates;
DROP POLICY IF EXISTS "tbm_risk_templates_select_all" ON public.tbm_risk_templates;
DROP TABLE IF EXISTS public.tbm_risk_templates;

-- 4. (테이블 삭제는 위에서 처리)

-- 3. safety_checks 확장 롤백
ALTER TABLE public.safety_checks
  DROP COLUMN IF EXISTS task_ids,
  DROP COLUMN IF EXISTS risks_confirmed_at,
  DROP COLUMN IF EXISTS shown_risks,
  DROP COLUMN IF EXISTS approved_at,
  DROP COLUMN IF EXISTS approved_by,
  DROP COLUMN IF EXISTS status;

ALTER TABLE public.safety_checks DROP CONSTRAINT IF EXISTS safety_checks_check_type_check;
ALTER TABLE public.safety_checks
  ADD CONSTRAINT safety_checks_check_type_check
  CHECK (check_type IN ('pre_work', 'post_work'));

-- 2. employees.is_team_leader 롤백
DROP INDEX IF EXISTS idx_employees_team_leader;
ALTER TABLE public.employees DROP COLUMN IF EXISTS is_team_leader;

-- 1. 레거시 데이터 복원 불가 (TRUNCATE는 비가역, 테스트 데이터이므로 무방)

COMMIT;
*/
