-- ============================================================
-- Track J-4-SEED: 기존 worker 비활성화 + 신규 worker 24명 INSERT + 기존 admin 10명 UPDATE 보강
-- 세션 16 (2026-04-15)
-- 실행 환경: Supabase SQL Editor
-- ============================================================

-- ============================================================
-- ① 기존 worker 14건 비활성화
-- ============================================================
UPDATE employees SET is_active = false WHERE role = 'worker';

-- ============================================================
-- ② 기존 admin 10건 UPDATE 보강 (엑셀 데이터)
-- ============================================================

-- 박민식 (mspark) — hire_date: 엑셀 "대표이사" 비고라 NULL 유지
UPDATE employees SET
  birth_date = '1972-08-12', phone = '010-9006-4178',
  work_start_time = '07:30', work_end_time = '16:30'
WHERE username = 'mspark';

-- 김민국 (mkkim) — hire_date: 엑셀 "대한제강 소속" 비고라 NULL 유지
UPDATE employees SET
  birth_date = '1975-10-09', phone = '010-7765-1492',
  work_start_time = '07:30', work_end_time = '16:30'
WHERE username = 'mkkim';

-- 박세정 (sjpark)
UPDATE employees SET
  birth_date = '1976-04-21', phone = '010-3938-2917',
  hire_date = '2025-01-01', work_start_time = '07:30', work_end_time = '16:30'
WHERE username = 'sjpark';

-- 김지현 (jhkim)
UPDATE employees SET
  birth_date = '1997-01-12', phone = '010-3262-9712',
  hire_date = '2025-05-12', work_start_time = '07:30', work_end_time = '16:30'
WHERE username = 'jhkim';

-- 김현도 (hdkim) — hire_date: 엑셀 "대한제강 소속" 비고라 NULL 유지
UPDATE employees SET
  birth_date = '1997-09-06', phone = '010-3030-9574',
  work_start_time = '07:30', work_end_time = '16:30'
WHERE username = 'hdkim';

-- 김도윤 (dykim)
UPDATE employees SET
  birth_date = '1996-04-09', phone = '010-9282-1041',
  hire_date = '2024-01-01', work_start_time = '07:30', work_end_time = '16:30'
WHERE username = 'dykim';

-- 김태우 (tukim) — name 보강 ("태우" → "김태우")
UPDATE employees SET
  name = '김태우',
  birth_date = '1999-05-02', phone = '010-6651-5707',
  hire_date = '2024-01-01', work_start_time = '07:30', work_end_time = '16:30'
WHERE username = 'tukim';

-- 백남훈 (nhbaek)
UPDATE employees SET
  birth_date = '2000-06-16', phone = '010-2249-9259',
  hire_date = '2025-07-10', work_start_time = '07:30', work_end_time = '16:30'
WHERE username = 'nhbaek';

-- 김현회 (hhkim)
UPDATE employees SET
  birth_date = '2000-09-28', phone = '010-4049-8851',
  hire_date = '2025-05-12', work_start_time = '07:30', work_end_time = '16:30'
WHERE username = 'hhkim';

-- 홍승표 (sphong)
UPDATE employees SET
  birth_date = '1998-04-08', phone = '010-4736-2497',
  hire_date = '2025-09-01', work_start_time = '07:30', work_end_time = '16:30'
WHERE username = 'sphong';

-- ============================================================
-- ③ 신규 worker 24명 INSERT
-- ============================================================

-- 한국인 작업자 (10명)
INSERT INTO employees (id, name, role, branch, job_type, is_active, is_team_leader, birth_date, hire_date, contract_end_date, phone, work_start_time, work_end_time)
VALUES (gen_random_uuid(), '이나연', 'worker', 'hadong', 'worker', true, true, '1993-08-11', '2024-06-24', '2026-06-23', '010-2888-8259', '07:30', '16:30');

INSERT INTO employees (id, name, role, branch, job_type, is_active, is_team_leader, birth_date, hire_date, contract_end_date, phone, work_start_time, work_end_time)
VALUES (gen_random_uuid(), '김점숙', 'worker', 'busan', 'worker', true, false, '1968-01-01', '2023-09-04', NULL, '010-3406-0059', '07:30', '16:30');

INSERT INTO employees (id, name, role, branch, job_type, is_active, is_team_leader, birth_date, hire_date, contract_end_date, phone, work_start_time, work_end_time)
VALUES (gen_random_uuid(), '김선아', 'worker', 'busan', 'worker', true, false, '1974-09-12', '2024-08-20', '2026-08-19', '010-5117-2663', '07:30', '16:30');

INSERT INTO employees (id, name, role, branch, job_type, is_active, is_team_leader, birth_date, hire_date, contract_end_date, phone, work_start_time, work_end_time)
VALUES (gen_random_uuid(), '조혜숙', 'worker', 'busan', 'worker', true, false, '1970-10-10', '2026-02-01', '2027-02-01', '010-5040-4780', '07:30', '16:30');

INSERT INTO employees (id, name, role, branch, job_type, is_active, is_team_leader, birth_date, hire_date, contract_end_date, phone, work_start_time, work_end_time)
VALUES (gen_random_uuid(), '김태진', 'worker', 'busan', 'worker', true, true, '1960-05-26', '2026-02-13', '2027-02-12', '010-2558-7915', '07:30', '16:30');

INSERT INTO employees (id, name, role, branch, job_type, is_active, is_team_leader, birth_date, hire_date, contract_end_date, phone, work_start_time, work_end_time)
VALUES (gen_random_uuid(), '문영이', 'worker', 'busan', 'worker', true, false, '1964-06-27', '2025-01-13', '2026-06-30', '010-9235-6923', '07:30', '16:30');

INSERT INTO employees (id, name, role, branch, job_type, is_active, is_team_leader, birth_date, hire_date, contract_end_date, phone, work_start_time, work_end_time)
VALUES (gen_random_uuid(), '김옥희', 'worker', 'busan', 'worker', true, false, '1979-07-09', '2025-03-24', '2026-06-30', '010-9996-1398', '07:30', '16:30');

INSERT INTO employees (id, name, role, branch, job_type, is_active, is_team_leader, birth_date, hire_date, contract_end_date, phone, work_start_time, work_end_time)
VALUES (gen_random_uuid(), '윤화순', 'worker', 'busan', 'worker', true, false, '1978-07-22', '2025-04-09', '2026-03-30', '010-6594-5153', '07:30', '16:30');

INSERT INTO employees (id, name, role, branch, job_type, is_active, is_team_leader, birth_date, hire_date, contract_end_date, phone, work_start_time, work_end_time)
VALUES (gen_random_uuid(), '정경은', 'worker', 'busan', 'worker', true, false, '1979-10-13', '2025-08-06', '2026-06-30', '010-9868-1685', '07:30', '16:30');

INSERT INTO employees (id, name, role, branch, job_type, is_active, is_team_leader, birth_date, hire_date, contract_end_date, phone, work_start_time, work_end_time)
VALUES (gen_random_uuid(), '정은영', 'worker', 'busan', 'worker', true, false, '1974-02-25', '2025-08-01', '2026-07-31', '010-7734-5341', '07:30', '16:30');

-- 캄보디아 작업자 (14명)
INSERT INTO employees (id, name, role, branch, job_type, is_active, is_team_leader, birth_date, hire_date, contract_end_date, phone, work_start_time, work_end_time)
VALUES (gen_random_uuid(), 'KIN SREYNET (킨스레이넷)', 'worker', 'jinju', 'worker', true, false, '1998-05-10', '2025-02-10', '2027-07-22', '010-7604-5877', '07:30', '16:30');

INSERT INTO employees (id, name, role, branch, job_type, is_active, is_team_leader, birth_date, hire_date, contract_end_date, phone, work_start_time, work_end_time)
VALUES (gen_random_uuid(), 'VOY SOPHEAP (보이솝히엡)', 'worker', 'jinju', 'worker', true, false, '1996-07-10', '2025-02-10', '2027-01-15', '010-5969-8092', '07:30', '16:30');

INSERT INTO employees (id, name, role, branch, job_type, is_active, is_team_leader, birth_date, hire_date, contract_end_date, phone, work_start_time, work_end_time)
VALUES (gen_random_uuid(), 'UK SOKCHEA (욱속체아)', 'worker', 'jinju', 'worker', true, false, '1994-04-18', '2025-02-10', '2027-09-08', '010-8184-7320', '07:30', '16:30');

INSERT INTO employees (id, name, role, branch, job_type, is_active, is_team_leader, birth_date, hire_date, contract_end_date, phone, work_start_time, work_end_time)
VALUES (gen_random_uuid(), 'ANG SAMATH (앙사마트)', 'worker', 'jinju', 'worker', true, false, '1987-04-11', '2025-06-16', '2027-07-13', '010-5726-8704', '07:30', '16:30');

INSERT INTO employees (id, name, role, branch, job_type, is_active, is_team_leader, birth_date, hire_date, contract_end_date, phone, work_start_time, work_end_time)
VALUES (gen_random_uuid(), 'HEL CHANNY (해장리)', 'worker', 'jinju', 'worker', true, false, '1993-12-08', '2025-07-24', '2027-09-08', '010-7113-9312', '07:30', '16:30');

INSERT INTO employees (id, name, role, branch, job_type, is_active, is_team_leader, birth_date, hire_date, contract_end_date, phone, work_start_time, work_end_time)
VALUES (gen_random_uuid(), 'TES SREYLANG (스렐랑)', 'worker', 'jinju', 'worker', true, false, '1989-01-16', '2025-08-05', '2028-02-24', '010-2260-6540', '07:30', '16:30');

INSERT INTO employees (id, name, role, branch, job_type, is_active, is_team_leader, birth_date, hire_date, contract_end_date, phone, work_start_time, work_end_time)
VALUES (gen_random_uuid(), 'CHOEM SREY KHUOCH (코이)', 'worker', 'jinju', 'worker', true, false, '1997-08-07', '2025-08-12', '2027-06-24', '010-3063-1660', '07:30', '16:30');

INSERT INTO employees (id, name, role, branch, job_type, is_active, is_team_leader, birth_date, hire_date, contract_end_date, phone, work_start_time, work_end_time)
VALUES (gen_random_uuid(), 'MEAS VEASNA (비스나)', 'worker', 'hadong', 'worker', true, false, '2003-04-28', '2025-12-15', '2028-06-09', '010-5538-5613', '07:30', '16:30');

INSERT INTO employees (id, name, role, branch, job_type, is_active, is_team_leader, birth_date, hire_date, contract_end_date, phone, work_start_time, work_end_time)
VALUES (gen_random_uuid(), 'THOL NIMORL (니몰)', 'worker', 'hadong', 'worker', true, false, '1994-04-14', '2025-12-15', '2026-11-04', '010-4897-6734', '07:30', '16:30');

INSERT INTO employees (id, name, role, branch, job_type, is_active, is_team_leader, birth_date, hire_date, contract_end_date, phone, work_start_time, work_end_time)
VALUES (gen_random_uuid(), 'IM NARIN (나린)', 'worker', 'hadong', 'worker', true, false, '1985-03-06', '2025-12-15', '2026-10-29', '010-5962-6048', '07:30', '16:30');

INSERT INTO employees (id, name, role, branch, job_type, is_active, is_team_leader, birth_date, hire_date, contract_end_date, phone, work_start_time, work_end_time)
VALUES (gen_random_uuid(), 'LY YUON (윤씨)', 'worker', 'hadong', 'worker', true, false, '1996-04-05', '2025-12-15', '2027-08-06', '010-7436-4440', '07:30', '16:30');

INSERT INTO employees (id, name, role, branch, job_type, is_active, is_team_leader, birth_date, hire_date, contract_end_date, phone, work_start_time, work_end_time)
VALUES (gen_random_uuid(), 'PANG SOVANDAV (라우)', 'worker', 'hadong', 'worker', true, false, '2000-03-14', '2025-12-17', '2028-01-14', '010-9976-0280', '07:30', '16:30');

INSERT INTO employees (id, name, role, branch, job_type, is_active, is_team_leader, birth_date, hire_date, contract_end_date, phone, work_start_time, work_end_time)
VALUES (gen_random_uuid(), 'MIN RUNTORN (민)', 'worker', 'hadong', 'worker', true, false, '1993-04-02', '2025-12-17', '2028-06-23', '010-5953-6540', '07:30', '16:30');

INSERT INTO employees (id, name, role, branch, job_type, is_active, is_team_leader, birth_date, hire_date, contract_end_date, phone, work_start_time, work_end_time)
VALUES (gen_random_uuid(), 'BOUN SOPHA (소파)', 'worker', 'hadong', 'worker', true, false, '1997-05-08', '2026-03-02', '2027-12-09', '010-2813-5545', '07:30', '16:30');
