-- ============================================================
-- Track J Part B: 신규 시드 9건 INSERT + 기존 tukim UPDATE
-- 세션 16 (2026-04-15)
-- 실행 환경: Supabase SQL Editor
-- ============================================================

-- INSERT 1: 박민식 (mspark)
INSERT INTO employees (id, name, username, role, branch, job_type, job_title, job_rank, is_active, is_team_leader, auth_user_id)
VALUES (gen_random_uuid(), '박민식', 'mspark', 'general', 'headquarters', 'admin', '총괄', '대표', true, false, 'cf34e317-9250-4800-b9f4-6c37248d17f9');

-- INSERT 2: 김민국 (mkkim)
INSERT INTO employees (id, name, username, role, branch, job_type, job_title, job_rank, is_active, is_team_leader, auth_user_id)
VALUES (gen_random_uuid(), '김민국', 'mkkim', 'general', 'headquarters', 'admin', '총괄', '부장', true, false, '6b540482-025f-4da4-b3e8-338e1d3ad62d');

-- INSERT 3: 김지현 (jhkim)
INSERT INTO employees (id, name, username, role, branch, job_type, job_title, job_rank, is_active, is_team_leader, auth_user_id)
VALUES (gen_random_uuid(), '김지현', 'jhkim', 'hr_admin', 'management', 'admin', '관리팀', '사원', true, false, 'eefd7e02-7c91-4993-b797-d2c6767ccc42');

-- INSERT 4: 박세정 (sjpark)
INSERT INTO employees (id, name, username, role, branch, job_type, job_title, job_rank, is_active, is_team_leader, auth_user_id)
VALUES (gen_random_uuid(), '박세정', 'sjpark', 'hr_admin', 'management', 'admin', '관리팀', '과장', true, false, 'badbbe43-24ea-44dc-ad68-b08d038aef45');

-- INSERT 5: 김현도 (hdkim) — job_rank NULL (타회사 소속)
INSERT INTO employees (id, name, username, role, branch, job_type, job_title, job_rank, is_active, is_team_leader, auth_user_id)
VALUES (gen_random_uuid(), '김현도', 'hdkim', 'farm_admin', 'busan', 'admin', 'LAB장', NULL, true, false, '066bc686-163e-4dff-8616-b7c98673c663');

-- INSERT 6: 홍승표 (sphong)
INSERT INTO employees (id, name, username, role, branch, job_type, job_title, job_rank, is_active, is_team_leader, auth_user_id)
VALUES (gen_random_uuid(), '홍승표', 'sphong', 'farm_admin', 'busan', 'admin', '재배사', '사원', true, false, '6ecea1b1-6bef-410e-a91d-a2888d846c34');

-- INSERT 7: 김현회 (hhkim)
INSERT INTO employees (id, name, username, role, branch, job_type, job_title, job_rank, is_active, is_team_leader, auth_user_id)
VALUES (gen_random_uuid(), '김현회', 'hhkim', 'farm_admin', 'jinju', 'admin', 'HUB장', '사원', true, false, '91019541-9313-4280-b0c9-298493e3b886');

-- INSERT 8: 김도윤 (dykim)
INSERT INTO employees (id, name, username, role, branch, job_type, job_title, job_rank, is_active, is_team_leader, auth_user_id)
VALUES (gen_random_uuid(), '김도윤', 'dykim', 'farm_admin', 'hadong', 'admin', 'HUB장', '매니저', true, false, '84c530a6-5da1-4fca-9ea6-80ad4a8d0ed1');

-- INSERT 9: 백남훈 (nhbaek)
INSERT INTO employees (id, name, username, role, branch, job_type, job_title, job_rank, is_active, is_team_leader, auth_user_id)
VALUES (gen_random_uuid(), '백남훈', 'nhbaek', 'farm_admin', 'hadong', 'admin', '재배사', '사원', true, false, '4b3930c0-4c49-497d-8112-e94f1c311488');

-- UPDATE: 기존 tukim (master) — branch·username·job_type·job_title·job_rank·auth_user_id 갱신
UPDATE employees
SET branch       = 'seedlab',
    username     = 'tukim',
    job_type     = 'admin',
    job_title    = 'LAB장',
    job_rank     = '매니저',
    auth_user_id = 'e42d05e9-bec9-41f9-bff2-1434dde07b63'
WHERE role = 'master';
