-- ============================================================================
-- 트랙 D: TBM 안전점검 시스템
-- safety_check_items / safety_checks / safety_check_results
-- 작성일: 2026-04-10
-- ============================================================================

-- safety_check_items (마스터: 9개 점검 항목)
CREATE TABLE public.safety_check_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_no INT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  sort_order INT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO public.safety_check_items (item_no, label, sort_order) VALUES
  (1, '작업자 건강상태', 1),
  (2, '보호구 & 작업복장의 착용 및 성능유지 상태', 2),
  (3, '기계·기구 방호장치 / 작업공구의 관리상태', 3),
  (4, '유해성·위험물질 취급의 안전관리상태', 4),
  (5, '유해화학물질의 누출 및 용기 밀폐보관 상태', 5),
  (6, '유해화학물질 취급시설의 누출감지장치, 안전밸브 및 온도·압력계기의 정상작동상태', 6),
  (7, '중량물 취급 및 보관 과정의 관리 상태', 7),
  (8, '작업안전수칙 이행 / 안전표지판 부착상태', 8),
  (9, '작업장 환경(정리, 정돈, 청소) 이상유무', 9);

-- safety_checks (헤더: 작업자별 일별 점검 기록)
CREATE TABLE public.safety_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  check_type TEXT NOT NULL CHECK (check_type IN ('pre_work', 'post_work')),
  completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(worker_id, date, check_type)
);

CREATE INDEX idx_safety_checks_worker_date ON public.safety_checks(worker_id, date);
CREATE INDEX idx_safety_checks_date ON public.safety_checks(date);

-- safety_check_results (라인: 항목별 체크 결과)
CREATE TABLE public.safety_check_results (
  check_id UUID NOT NULL REFERENCES public.safety_checks(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES public.safety_check_items(id),
  checked BOOLEAN NOT NULL DEFAULT false,
  PRIMARY KEY (check_id, item_id)
);

-- ── RLS 활성화 ──────────────────────────────────────────────────────────────
ALTER TABLE public.safety_check_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.safety_checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.safety_check_results ENABLE ROW LEVEL SECURITY;

-- ── safety_check_items: 전체 SELECT ─────────────────────────────────────────
CREATE POLICY "safety_check_items_select_all"
ON public.safety_check_items FOR SELECT
TO anon, authenticated
USING (true);

-- ── safety_checks: anon INSERT (작업자 본인, 오늘 ±1일) ─────────────────────
CREATE POLICY "safety_checks_anon_insert"
ON public.safety_checks FOR INSERT
TO anon
WITH CHECK (
  worker_id IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.employees
    WHERE id = worker_id AND role = 'worker' AND is_active = true
  )
  AND date >= CURRENT_DATE - INTERVAL '1 day'
  AND date <= CURRENT_DATE + INTERVAL '1 day'
);

-- ── safety_checks: anon SELECT (작업자 본인 기록) ────────────────────────────
CREATE POLICY "safety_checks_anon_select"
ON public.safety_checks FOR SELECT
TO anon
USING (
  EXISTS (
    SELECT 1 FROM public.employees
    WHERE id = worker_id AND role = 'worker' AND is_active = true
  )
);

-- ── safety_checks: authenticated SELECT (관리자) ─────────────────────────────
CREATE POLICY "safety_checks_authenticated_select"
ON public.safety_checks FOR SELECT
TO authenticated
USING (
  public.is_master()
  OR (public.current_employee_role() = 'hr_admin')
  OR (
    public.current_employee_role() = 'farm_admin'
    AND public.employee_branch(worker_id) = public.current_employee_branch()
  )
);

-- ── safety_check_results: anon INSERT (해당 check 소유 확인) ─────────────────
CREATE POLICY "safety_check_results_anon_insert"
ON public.safety_check_results FOR INSERT
TO anon
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.safety_checks sc
    WHERE sc.id = check_id
      AND sc.date >= CURRENT_DATE - INTERVAL '1 day'
      AND sc.date <= CURRENT_DATE + INTERVAL '1 day'
  )
);

-- ── safety_check_results: anon SELECT ────────────────────────────────────────
CREATE POLICY "safety_check_results_anon_select"
ON public.safety_check_results FOR SELECT
TO anon
USING (true);

-- ── safety_check_results: authenticated SELECT ───────────────────────────────
CREATE POLICY "safety_check_results_authenticated_select"
ON public.safety_check_results FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.safety_checks sc
    WHERE sc.id = check_id
      AND (
        public.is_master()
        OR (public.current_employee_role() = 'hr_admin')
        OR (
          public.current_employee_role() = 'farm_admin'
          AND public.employee_branch(sc.worker_id) = public.current_employee_branch()
        )
      )
  )
);
