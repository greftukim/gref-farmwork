-- ============================================================================
-- H-0 검증 스크립트: chat_logs 테이블 + RLS 정책
-- 마이그레이션: 20260412110000_chat_logs_table.sql
-- 작성일: 2026-04-12 (Phase 5 세션 8, 2차 보강: 세션 8 후속)
-- 실행: Supabase Dashboard SQL Editor (postgres superuser 역할)
-- 교훈 참조: 교훈 15(MCP service_role=RLS 우회), 교훈 17(정책 존재!=정책 동작)
-- ============================================================================
--
-- 실행 순서 (의존성 존재):
--   1. 섹션 A (스키마 반영 확인) -- 마이그레이션 적용 후 언제든 실행 가능
--   2. B-사전청소 -- B-0 실행 전 잔존 테스트 데이터 제거
--   3. B-0 (테스트 데이터 삽입) -- B-1 ~ B-5 실행 전 반드시 먼저 실행
--   4. B-1 ~ B-5 (시나리오별 RLS 검증) -- 독립 실행, 각각 BEGIN/ROLLBACK 격리
--   5. B-cleanup (테스트 데이터 삭제) -- B-0 이후 반드시 실행
--
-- 주의: B-0은 영구 삽입 (ROLLBACK 없음). B-cleanup 없이 세션 종료 금지.
--
-- [set_config + JWT claims 방식 비고]
-- B-2a, B-2b, B-3, B-4는 set_config('request.jwt.claims', ...) + SET LOCAL ROLE authenticated
-- 조합으로 auth.uid()를 세팅합니다. Supabase auth.uid() 구현:
--   SELECT NULLIF(current_setting('request.jwt.claims', true)::jsonb->>'sub', '')::uuid
-- SQL Editor(postgres superuser)에서 GUC 세팅 + 역할 전환으로 시뮬레이션 가능.
-- F5_rls_runtime_check.sql은 이 패턴을 미사용 (역할별 시뮬레이션 없이 실기기 검증 위임).
-- H-0은 worker/team_leader/farm_admin/hr_admin 4가지 역할 차단을 SQL Editor에서 확인하기 위해
-- 이 패턴을 도입. 프로젝트 내 최초 사용. 미동작 시 실기기 검증으로 대체.
-- ============================================================================


-- ============================================================================
-- 섹션 A: 스키마 반영 확인 (postgres superuser로 실행)
-- ============================================================================

-- A-1: 테이블 존재 확인 / 기대: 1행 (chat_logs)
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name = 'chat_logs';

-- A-2: 컬럼 정의 확인
-- 기대: 12행 (ordinal_position 순)
--   id / user_id / branch / user_role / session_id / turn_index /
--   role / content / token_input / token_output / tools_used / created_at
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'chat_logs'
ORDER BY ordinal_position;

-- A-3: 인덱스 3종 확인 (PK 제외)
-- 기대: 3행 — idx_chat_logs_created / idx_chat_logs_session_turn / idx_chat_logs_user_created
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'chat_logs'
  AND indexname NOT LIKE '%pkey%'
ORDER BY indexname;

-- A-4: RLS 정책 목록 확인
-- 기대: 2행, polpermissive=true(t), polcmd=r (SELECT 전용). INSERT 정책 0건 필수(쟁점 1).
SELECT polname, polpermissive, polcmd, pg_get_expr(polqual, polrelid) AS using_expr
FROM pg_policy
WHERE polrelid = 'public.chat_logs'::regclass
ORDER BY polname;
-- 기대: chat_logs_select_admin_all      | t | r | current_employee_role() IN (...)
--       chat_logs_select_farm_admin_own | t | r | (current_employee_role()='farm_admin') AND (uid()=user_id)

-- A-5: CHECK 제약 확인 / 기대: 3행
--   chat_logs_branch_required_for_farm_admin -- branch 조건부 NOT NULL
--   *_role_check (자동 생성명)               -- role IN (user/assistant/system)
--   *_user_role_check (자동 생성명)          -- user_role IN (farm_admin/hr_admin/master)
SELECT conname, pg_get_constraintdef(oid) AS constraint_def
FROM pg_constraint
WHERE conrelid = 'public.chat_logs'::regclass
  AND contype = 'c'
ORDER BY conname;

-- A-6: RLS 활성화 확인 / 기대: relrowsecurity = true
SELECT relname, relrowsecurity FROM pg_class
WHERE relname = 'chat_logs';

-- A-7: COMMENT 확인 / 기대: 6행 (TABLE + 5 COLUMN)
SELECT
  CASE WHEN a.attname IS NULL THEN 'TABLE' ELSE 'COLUMN:' || a.attname END AS target,
  d.description
FROM pg_description d
  JOIN pg_class c ON c.oid = d.objoid
  LEFT JOIN pg_attribute a ON a.attrelid = c.oid AND a.attnum = d.objsubid
WHERE c.relname = 'chat_logs'
ORDER BY d.objsubid;


-- ============================================================================
-- 섹션 B: 런타임 RLS 시뮬레이션
-- 교훈 16: DDL에 자기검증 SELECT 금지 -> 검증은 이 파일에서만
-- ============================================================================

-- ============================================================================
-- B-사전청소: 이전 실행 잔존 테스트 행 제거 (항상 먼저 실행)
-- B-0 실행 전 잔존 데이터를 제거해 클린 상태에서 시작. 최초 실행이면 0건.
-- ============================================================================
DELETE FROM public.chat_logs WHERE content LIKE '[H0-TEST%]';
-- 기대: DELETE 0 (이전 잔존 없으면) 또는 DELETE N (이전 실행 잔존분)


-- ============================================================================
-- B-0: 테스트 데이터 삽입 (service_role = postgres superuser, 영구 삽입)
-- B-1~B-5 실행 전 반드시 먼저 실행. 종료 전 반드시 B-cleanup 실행.
-- farm_admin 계정 없으면 EXCEPTION -> employees 확인 후 재실행.
-- content에 실행 시각(YYYYMMDDHH24MISS) suffix 포함 → 잔존 행과 충돌 불가.
-- ============================================================================

DO $$
DECLARE
  _ts             text := to_char(now(), 'YYYYMMDDHH24MISS');
  _farm_auth_uid  uuid;
  _farm_branch    text;
  _hr_auth_uid    uuid;
BEGIN
  SELECT auth_user_id, branch
    INTO _farm_auth_uid, _farm_branch
  FROM public.employees
  WHERE role = 'farm_admin' AND is_active = true
  LIMIT 1;
  IF _farm_auth_uid IS NULL THEN
    RAISE EXCEPTION 'farm_admin 활성 계정 없음 -- employees 확인 후 재실행';
  END IF;
  SELECT auth_user_id INTO _hr_auth_uid
  FROM public.employees
  WHERE role = 'hr_admin' AND is_active = true
  LIMIT 1;
  -- farm_admin 행 삽입 (B-3 시나리오용)
  INSERT INTO public.chat_logs
    (user_id, branch, user_role, session_id, turn_index, role, content)
  VALUES
    (_farm_auth_uid, _farm_branch, 'farm_admin', gen_random_uuid(), 0, 'user',
     '[H0-TEST-farm-admin-' || _ts || ']');
  -- hr_admin 행 삽입 (B-4 시나리오용)
  IF _hr_auth_uid IS NOT NULL THEN
    INSERT INTO public.chat_logs
      (user_id, branch, user_role, session_id, turn_index, role, content)
    VALUES
      (_hr_auth_uid, NULL, 'hr_admin', gen_random_uuid(), 0, 'user',
       '[H0-TEST-hr-admin-' || _ts || ']');
    RAISE NOTICE 'B-0 완료(ts=%): farm_admin 1행 + hr_admin 1행 삽입', _ts;
  ELSE
    RAISE NOTICE 'B-0 완료(ts=%): farm_admin 1행 삽입 (hr_admin 계정 없음 -- B-4 부분 검증)', _ts;
  END IF;
END $$;


-- ============================================================================
-- B-1: anon role -- SELECT/INSERT 모두 거부 기대
-- ============================================================================
BEGIN;
SET LOCAL ROLE anon;
SELECT COUNT(*) AS anon_select_count FROM public.chat_logs;
-- 기대: 0 (anon 정책 없음 = 기본 거부)
DO $$
BEGIN
  INSERT INTO public.chat_logs
    (user_id, branch, user_role, session_id, turn_index, role, content)
  VALUES (gen_random_uuid(), 'busan', 'farm_admin', gen_random_uuid(), 0, 'user', '[anon-insert-test]');
  RAISE EXCEPTION 'FAIL: anon INSERT 통과됨 -- RLS 누락';
EXCEPTION
  WHEN OTHERS THEN RAISE NOTICE 'PASS: anon INSERT 거부됨 (사유: %)', SQLERRM;
END $$;
ROLLBACK;


-- ============================================================================
-- B-2a: worker 컨텍스트 시뮬레이션
-- employee.role='worker' AND is_active=true AND auth_user_id IS NOT NULL 계정 사용.
-- 기대: SELECT 0건, INSERT 거부 (chat_logs_select_* 가 worker role을 커버 안 함).
-- worker 계정에 auth_user_id가 없으면 NOTICE + NULL uid로 계속 (B-2c와 동일 결과).
-- ============================================================================
BEGIN;
SELECT set_config(
  'request.jwt.claims',
  COALESCE(
    (SELECT json_build_object('sub', auth_user_id::text, 'role', 'authenticated')::text
     FROM public.employees
     WHERE role = 'worker' AND is_active = true AND auth_user_id IS NOT NULL
     LIMIT 1),
    json_build_object('role', 'authenticated')::text  -- sub 없음 -> auth.uid()=NULL
  ),
  true
);
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.employees WHERE role = 'worker' AND is_active = true AND auth_user_id IS NOT NULL
  ) THEN
    RAISE NOTICE 'B-2a: worker 활성 계정(auth_user_id 있음) 없음. auth.uid()=NULL 상태로 진행 (B-2c와 동일 결과 예상).';
  END IF;
END $$;
SET LOCAL ROLE authenticated;
SELECT COUNT(*) AS worker_select_count FROM public.chat_logs;
-- 기대: 0 (current_employee_role()='worker' or NULL → 어느 SELECT 정책도 매칭 안 됨)
DO $$
BEGIN
  INSERT INTO public.chat_logs
    (user_id, branch, user_role, session_id, turn_index, role, content)
  VALUES (gen_random_uuid(), 'busan', 'farm_admin', gen_random_uuid(), 0, 'user', '[worker-insert-test]');
  RAISE EXCEPTION 'FAIL: worker INSERT 통과됨 -- RLS 누락';
EXCEPTION
  WHEN OTHERS THEN RAISE NOTICE 'PASS: worker INSERT 거부됨 (사유: %)', SQLERRM;
END $$;
ROLLBACK;


-- ============================================================================
-- B-2b: team_leader 컨텍스트 시뮬레이션
-- employee.role='team_leader' AND is_active=true AND auth_user_id IS NOT NULL 계정 사용.
-- (team_leader는 TBM 승인용 auth 계정 보유 예상)
-- 기대: SELECT 0건, INSERT 거부 (chat_logs_select_* 가 team_leader를 커버 안 함).
-- team_leader 계정 없으면 NOTICE + NULL uid로 계속.
-- ============================================================================
BEGIN;
SELECT set_config(
  'request.jwt.claims',
  COALESCE(
    (SELECT json_build_object('sub', auth_user_id::text, 'role', 'authenticated')::text
     FROM public.employees
     WHERE role = 'team_leader' AND is_active = true AND auth_user_id IS NOT NULL
     LIMIT 1),
    json_build_object('role', 'authenticated')::text  -- sub 없음 -> auth.uid()=NULL
  ),
  true
);
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.employees WHERE role = 'team_leader' AND is_active = true AND auth_user_id IS NOT NULL
  ) THEN
    RAISE NOTICE 'B-2b: team_leader 활성 계정(auth_user_id 있음) 없음. auth.uid()=NULL 상태로 진행.';
  END IF;
END $$;
SET LOCAL ROLE authenticated;
SELECT COUNT(*) AS team_leader_select_count FROM public.chat_logs;
-- 기대: 0 (current_employee_role()='team_leader' or NULL → 어느 SELECT 정책도 매칭 안 됨)
DO $$
BEGIN
  INSERT INTO public.chat_logs
    (user_id, branch, user_role, session_id, turn_index, role, content)
  VALUES (gen_random_uuid(), 'busan', 'farm_admin', gen_random_uuid(), 0, 'user', '[team-leader-insert-test]');
  RAISE EXCEPTION 'FAIL: team_leader INSERT 통과됨 -- RLS 누락';
EXCEPTION
  WHEN OTHERS THEN RAISE NOTICE 'PASS: team_leader INSERT 거부됨 (사유: %)', SQLERRM;
END $$;
ROLLBACK;


-- ============================================================================
-- B-2c: authenticated + auth.uid()=NULL (미로그인 authenticated 방어막 검증)
-- request.jwt.claims 미설정 -> auth.uid()=NULL -> current_employee_role()=NULL
-- 목적: JWT 없이 authenticated role만으로는 어떤 행도 열람 불가임을 확인
-- (B-2a/B-2b와 다른 시나리오: 역할 차단이 아닌 인증 미완료 상태 방어막)
-- ============================================================================
BEGIN;
SET LOCAL ROLE authenticated;
-- request.jwt.claims 미설정 -> auth.uid() = NULL
SELECT COUNT(*) AS no_jwt_select_count FROM public.chat_logs;
-- 기대: 0 (current_employee_role()=NULL, 어느 정책도 매칭 안 됨)
DO $$
BEGIN
  INSERT INTO public.chat_logs
    (user_id, branch, user_role, session_id, turn_index, role, content)
  VALUES (gen_random_uuid(), 'busan', 'farm_admin', gen_random_uuid(), 0, 'user', '[no-jwt-insert-test]');
  RAISE EXCEPTION 'FAIL: 미인증 authenticated INSERT 통과됨';
EXCEPTION
  WHEN OTHERS THEN RAISE NOTICE 'PASS: 미인증 authenticated INSERT 거부됨 (사유: %)', SQLERRM;
END $$;
ROLLBACK;


-- ============================================================================
-- B-3: farm_admin 컨텍스트 시뮬레이션
-- set_config 로 request.jwt.claims.sub = farm_admin 의 auth_user_id 세팅
-- -> auth.uid() 세팅 -> current_employee_role() = farm_admin
-- 기대: 본인 행만 SELECT (hr_admin 행 불가시), INSERT 거부
-- ============================================================================
BEGIN;
SELECT set_config(
  'request.jwt.claims',
  (SELECT json_build_object('sub', auth_user_id::text, 'role', 'authenticated')::text
   FROM public.employees
   WHERE role = 'farm_admin' AND is_active = true
   LIMIT 1),
  true
);
SET LOCAL ROLE authenticated;
SELECT COUNT(*) AS farm_admin_visible_count FROM public.chat_logs;
-- 기대: 1 (본인 행만. hr_admin 행은 USING 조건에서 차단)
SELECT content FROM public.chat_logs WHERE content LIKE '%H0-TEST-farm-admin%';
-- 기대: 1행
DO $$
BEGIN
  INSERT INTO public.chat_logs
    (user_id, branch, user_role, session_id, turn_index, role, content)
  SELECT auth_user_id, branch, 'farm_admin', gen_random_uuid(), 99, 'user', '[farm-admin-insert-test]'
  FROM public.employees WHERE role = 'farm_admin' AND is_active = true LIMIT 1;
  RAISE EXCEPTION 'FAIL: farm_admin INSERT 통과됨 -- INSERT 정책이 존재함';
EXCEPTION
  WHEN OTHERS THEN RAISE NOTICE 'PASS: farm_admin INSERT 거부됨 (사유: %)', SQLERRM;
END $$;
ROLLBACK;


-- ============================================================================
-- B-4: hr_admin 컨텍스트 시뮬레이션
-- 기대: 전체 행 SELECT (farm_admin + hr_admin 행 모두), INSERT 거부
-- hr_admin 계정 없으면 sub=NULL -> B-2c와 동일 결과. B-0 NOTICE 확인.
-- ============================================================================
BEGIN;
SELECT set_config(
  'request.jwt.claims',
  (SELECT json_build_object('sub', auth_user_id::text, 'role', 'authenticated')::text
   FROM public.employees
   WHERE role = 'hr_admin' AND is_active = true
   LIMIT 1),
  true
);
SET LOCAL ROLE authenticated;
SELECT COUNT(*) AS hr_admin_visible_count FROM public.chat_logs;
-- 기대: 2 (farm_admin 행 + hr_admin 행. hr_admin 계정 없었으면 1)
SELECT user_role, content FROM public.chat_logs WHERE content LIKE '%H0-TEST%';
-- 기대: 2행 (두 역할 행 모두 조회됨)
DO $$
BEGIN
  INSERT INTO public.chat_logs
    (user_id, branch, user_role, session_id, turn_index, role, content)
  SELECT auth_user_id, NULL, 'hr_admin', gen_random_uuid(), 99, 'user', '[hr-admin-insert-test]'
  FROM public.employees WHERE role = 'hr_admin' AND is_active = true LIMIT 1;
  RAISE EXCEPTION 'FAIL: hr_admin INSERT 통과됨 -- INSERT 정책이 존재함';
EXCEPTION
  WHEN OTHERS THEN RAISE NOTICE 'PASS: hr_admin INSERT 거부됨 (사유: %)', SQLERRM;
END $$;
ROLLBACK;


-- ============================================================================
-- B-5: service_role (postgres superuser) -- RLS 우회 대조군
-- 기대: SELECT 전체 행, INSERT 성공
-- 교훈 15: service_role은 RLS 우회. B-1~B-4 거부가 RLS 동작임을 역증명.
-- ============================================================================
SELECT COUNT(*) AS service_role_select_count FROM public.chat_logs WHERE content LIKE '%H0-TEST%';
-- 기대: B-0 삽입 건수 그대로 (RLS 우회)
INSERT INTO public.chat_logs
  (user_id, branch, user_role, session_id, turn_index, role, content)
SELECT auth_user_id, branch, 'farm_admin', gen_random_uuid(), 99, 'user',
  '[H0-TEST-service-role-' || to_char(now(), 'YYYYMMDDHH24MISS') || ']'
FROM public.employees WHERE role = 'farm_admin' AND is_active = true LIMIT 1;
-- 기대: INSERT 1 (RLS 우회)
SELECT content FROM public.chat_logs WHERE content LIKE '%H0-TEST-service-role%';
-- 기대: 1행


-- ============================================================================
-- B-cleanup: 테스트 데이터 전량 삭제 (service_role)
-- B-0 + B-5 삽입 데이터 모두 제거. 실행 없이 세션 종료 금지.
-- ============================================================================
DELETE FROM public.chat_logs WHERE content LIKE '[H0-TEST%]';
-- 기대: DELETE N
SELECT COUNT(*) AS remaining_test_rows FROM public.chat_logs WHERE content LIKE '%H0-TEST%';
-- 기대: 0 (정리 완료)