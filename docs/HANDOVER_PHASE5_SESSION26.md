# 세션 26 핸드오버 — Phase 5

**날짜:** 2026-04-23
**세션:** Phase 5 Session 26
**작업자:** greftukim (Claude Code 협업)

---

## 완료 범위

J-CLEANUP-DEEP-001 해소 — 비활성/중복 직원 13명 전원 + 자식 데이터 전량 삭제. 단일 DO 블록 트랜잭션(원자적) + 사전 백업 + 사후 검증 완료. **커밋 1건.**

---

## 삭제 대상 13명

| # | 이름 | UUID (prefix) | 사유 |
|---|---|---|---|
| 1 | 김지현 | 33776062… | 활성 jhkim과 한글명 중복 (비활성) |
| 2 | 김현도 | 0832690f… | 활성 hdkim과 한글명 중복 (비활성) |
| 3 | 김민국 | 5f4cd3d7… | 활성 mkkim과 한글명 중복 (비활성) |
| 4 | 박민식 | e7cc0f5f… | 활성 mspark와 한글명 중복 (비활성) |
| 5 | 이강모 | 31b30af0… | 대응 활성 없음, 비활성 시드 |
| 6 | 최수진 | fbea7394… | 대응 활성 없음, 비활성 시드 |
| 7 | 시드_작업자04 | a00…004 | 시드 (01~03만 보존) |
| 8 | 시드_작업자05 | a00…005 | 시드 |
| 9 | 시드_작업자06 | a00…006 | 시드 |
| 10 | 시드_작업자07 | a00…007 | 시드 |
| 11 | 시드_작업자08 | a00…008 | 시드 |
| 12 | 시드_작업자09 | a00…009 | 시드 |
| 13 | 시드_작업자10 | a00…010 | 시드 |

---

## 태우님 결정 (세션 26 시작 시)

- Q1 김현도 notices 2건 → **삭제** (이관 아님)
- Q2 김민국 calls 60건 + tasks 5건 → **삭제**
- Q3 박민식 safety_checks 5건 → **삭제**
- Q4 시드_작업자 04~10 (~1,200행) → **CASCADE + 선제 DELETE 혼합 전량 삭제**

즉 13명 + 모든 자식 데이터 전량 삭제 (이관 경로 사용 안 함).

---

## 사전 조사 (조사 전용 단계)

### FK 매트릭스 (pg_constraint 직접 조회, LESSONS 35·37 준수)

employees 참조 FK 22건:

- **NO ACTION (17)**: attendance.employee_id, calls, growth_surveys, harvest_records, issues(×2), leave_balances, leave_requests(×4), notices, overtime_requests.reviewed_by, qr_scans, safety_checks.approved_by, schedules, tasks
- **RESTRICT (1)**: chatbot_feedback.employee_id
- **CASCADE (3)**: fcm_tokens, overtime_requests.employee_id, safety_checks.worker_id
- **SET NULL (1)**: attendance.input_by

### 계획 스키마 정정 사항 (실행 전 보정)

태우님 계획 SQL의 스키마 불일치를 pg_constraint 조회 결과 기반으로 보정:

| 계획 | 실제 | 처리 |
|---|---|---|
| `chatbot_feedback.user_id` | `employee_id` | 정정 |
| `issue_reports` 테이블 | 존재하지 않음 (→ `issues`) | 테이블·컬럼 교체 (worker_id + resolved_by) |
| `growth_surveys.surveyor_id` | `worker_id` | 정정 |
| `leave_requests.hq_reviewed_by` | `hr_reviewed_by` + `reviewed_by` | 4개 FK 전부 처리 |
| `name LIKE '시드_작업자 %'` (공백) | `시드_작업자04` (붙여쓰기) | 명시적 UUID 배열 사용 |

---

## 실행 단계

### Step 1 — 백업

- 파일: `/tmp/session26-backup/dump.json`
- 실경로: `C:\Users\김태우\AppData\Local\Temp\session26-backup\dump.json`
- 크기: **859.6 KB**
- 13명 + 22개 FK 경로 관련 행 전수 덤프

주요 백업 행수:

| 키 | 건수 |
|---|---|
| employees | 13 |
| attendance_by_employee | 408 |
| tasks | 814 |
| calls | 65 |
| overtime_requests_by_employee | 13 |
| leave_requests_by_employee | 11 |
| leave_balances | 11 |
| fcm_tokens | 11 |
| safety_checks_by_worker | 9 |
| safety_checks_by_approver | 5 |
| leave_requests_by_farm_reviewer | 3 |
| notices | 2 |
| issues_by_worker / issues_by_resolver | 2 / 2 |
| leave_requests_by_hr_reviewer | 1 |
| attendance_by_input · chatbot_feedback · growth_surveys · harvest_records · leave_requests_by_reviewer · overtime_requests_by_reviewer · qr_scans · schedules | null (대상자 참조 없음) |

### Step 2 — 단일 DO 블록 트랜잭션 삭제

Supabase MCP `execute_sql`은 문장별 독립 실행이므로 **PL/pgSQL DO 블록**으로 감싸 원자성 보장. 내부 검증 실패 시 `RAISE EXCEPTION`으로 전체 자동 롤백.

실행 순서:
1. precheck: `count(*) WHERE id = ANY(target_ids) = 13` 아니면 EXCEPTION
2. RESTRICT 선제: `chatbot_feedback` DELETE (0건)
3. SET NULL: `attendance.input_by` UPDATE NULL (0건)
4. NO ACTION 선제 DELETE: attendance / calls / tasks / issues / leave_requests(by employee, by reviewer) / overtime_requests.reviewed_by / notices / safety_checks.approved_by / leave_balances / schedules / harvest_records / growth_surveys / qr_scans
5. `employees` DELETE → CASCADE 자동 (fcm_tokens / overtime_requests.employee_id / safety_checks.worker_id)
6. 내부 검증 3종: target_remaining=0, seed_01_03_survived=3, active_initials_intact=4 — 실패 시 EXCEPTION

결과: 예외 없이 완료 = 모든 검증 통과.

### Step 3 — 사후 검증

| 점검 | 값 | 기대 | 판정 |
|---|---|---|---|
| target_remaining | 0 | 0 | ✔ |
| seed_01_03_survived | 3 | 3 | ✔ |
| active_initials_intact (jhkim/hdkim/mkkim/mspark) | 4 | 4 | ✔ |
| orphan_attendance_employee_id | 0 | 0 | ✔ |
| orphan_tasks_worker_id | 0 | 0 | ✔ |
| orphan_leave_requests_employee_id | 0 | 0 | ✔ |
| orphan_leave_balances | 0 | 0 | ✔ |
| total_employees | 41 | 54−13 | ✔ |
| active_employees | 38 | — | farm_admin 8 + general 2 + hr_admin 3 + master 1 + worker 24 |
| total_attendance | 175 | — | 삭제 전 583 |
| total_tasks | 359 | — | 삭제 전 1,173 |
| total_calls | 0 | — | 삭제 대상만 보유 |
| total_notices | 0 | — | 김현도 2건이 전부 |
| total_safety_checks | 2 | — | 승인자 정리 후 잔존 |
| remaining_inactive | 3 | — | 시드_01/02/03만 |

### Step 4 — BACKLOG / HANDOVER / 커밋

- BACKLOG.md L126: J-CLEANUP-DEEP-001 `open` → `resolved` (세션 26 완료, 영향 행수 기록, 백업 경로 링크, HANDOVER 참조)
- 본 핸드오버 작성
- 단일 커밋 + push

---

## 생존 계정 요약 (active 38명)

| role | 인원 | 비고 |
|---|---|---|
| master | 1 | tukim (김태우) |
| farm_admin | 8 | dykim, farm_busan/hadong/jinju, hdkim, hhkim, nhbaek, sphong |
| general | 2 | mkkim (김민국), mspark (박민식) |
| hr_admin | 3 | hr_admin, jhkim (김지현), sjpark (박세정) |
| worker | 24 | 캄보디아 14명 + 한국 10명 |

비활성 3명: 시드_작업자 01/02/03 (의도적 보존)

---

## 에스컬레이션 없음

모든 단계 기대 조건 충족. 태우님 에스컬레이션 기준 4건 모두 비해당:
- Step 1 백업 크기 정상 (859.6 KB)
- Step 2-1 대상 수 = 13 (precheck 통과)
- 중간 DELETE FK 에러 없음 (pg_constraint 기반 선제 정리)
- 사후 검증 불일치 없음

---

## 커밋 해시 (세션 26)

| 해시 | 설명 |
|---|---|
| (예정) | J-CLEANUP-DEEP-001 resolve + SESSION26 HANDOVER |

---

## BACKLOG 변경

| ID | 변경 |
|---|---|
| J-CLEANUP-DEEP-001 | open → **resolved** (세션 26) |

신규 BACKLOG: 없음.

---

## 태우님 브라우저 검증 포인트

1. HQ Dashboard 숫자 변화: 가동률·월 수확량·승인 대기 (삭제 대상이 속했던 집계)
2. 직원 리스트: 13명 없어졌는지 (시드_작업자 04~10, 한글명 6명)
3. 이니셜 계정들 (jhkim/hdkim/mkkim/mspark) 여전히 로그인 가능
4. 비활성 표시: 시드_작업자 01/02/03만 노출 (이외 비활성 없음)
5. HQ Approvals: 13명 관련 leave/overtime 요청이 사라졌는지

---

## 다음 세션 후보

- **후보 A — HQ 이월 4개 페이지 실데이터 연결** (HQ-FINANCE-001, HQ-GROWTH-001, HQ-PERFORMANCE-001, HQ-DASHBOARD-INTERACTIVE-001)
- **후보 B — HQ-ISSUE-PAGE-001** (세션 25 파생, HQ 전용 이상 신고 페이지 신설)
- **후보 C — 재배팀 `_others.jsx` 실데이터 연결** (RECONNECT-OTHERS-001)
- **후보 D — 짧은 부채 정리 세션** (FCM-001, UX-009, RLS-DEBT-021)

세션 시작 전 CLAUDE.md 5번 절차 준수 (git log, BACKLOG, LESSONS 순독).

---

## 참고

- 백업 파일은 로컬 임시 폴더(`%LOCALAPPDATA%\Temp\session26-backup\dump.json`)에 저장. 장기 보관 필요 시 태우님이 안전한 위치로 복사.
- 삭제 작업은 Supabase 원본 DB에서 실행됨. 브랜치 없이 직접 적용.
- 교훈 반영: LESSONS 35·37(pg_constraint 우선), 교훈 20(BACKLOG ID 무결성).
