-- 트랙 76-A-2 / 마이그레이션 2: task_assignments 조인 테이블 + dual-write 백필
-- 적용 대상: task_assignments 신규 + 기존 tasks.worker_id 데이터 복사
-- 사전 조건: 76-A-1 추가 정찰에서 G18 다중 배정 = 조인 테이블 채택
-- 보존: tasks.worker_id 컬럼 유지 (dual-write 단계 — TASK-WORKER-ID-DROP-001로 추후 처리)
-- 롤백: rollback_20260428_session76a2_task_assignments.sql 참조

BEGIN;

-- ─── Step 1: task_assignments 조인 테이블 신설 ───
CREATE TABLE IF NOT EXISTS public.task_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  worker_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  role TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(task_id, worker_id)
);

CREATE INDEX IF NOT EXISTS idx_ta_task ON public.task_assignments(task_id);
CREATE INDEX IF NOT EXISTS idx_ta_worker ON public.task_assignments(worker_id);

-- ─── Step 2: 기존 tasks.worker_id → task_assignments 백필 ───
INSERT INTO public.task_assignments (task_id, worker_id, role)
SELECT id, worker_id, 'primary'
FROM public.tasks
WHERE worker_id IS NOT NULL
ON CONFLICT (task_id, worker_id) DO NOTHING;

-- 검증: tasks.worker_id 채워진 행 수와 task_assignments 행 수 일치
DO $$
DECLARE
  task_with_worker INT;
  ta_count INT;
BEGIN
  SELECT COUNT(*) INTO task_with_worker FROM public.tasks WHERE worker_id IS NOT NULL;
  SELECT COUNT(*) INTO ta_count FROM public.task_assignments;
  IF ta_count < task_with_worker THEN
    RAISE EXCEPTION 'task_assignments 백필 실패: tasks=%, ta=%', task_with_worker, ta_count;
  END IF;
END $$;

COMMIT;
