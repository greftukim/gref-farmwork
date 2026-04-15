# 트랙 J — 계정 생성 + 직원 관리 표 재구성 도메인 노트

**작성일**: 2026-04-15  
**세션**: 16  
**관련 BACKLOG**: Track J (in-progress)

---

## §1 본질·범위

**본질**: 실 운영 계정 10건 발급 + 직원 관리 표 재구성 (신규 기능 #2 + #4 통합)

**통합 근거**:
- 두 작업 모두 `employees` 테이블·직책/직급 도메인·관리팀 권한 영역
- 분리 진입 시 마이그레이션·UI 중복 작업 발생
- 단, 단위는 도메인·기능별로 분리하여 GO 신호 분리

**범위 외**:
- 트랙 K (승인 위임 체인) — J 마감 후 별도 진입
- 트랙 L (거터 QR 작업 흐름) — 도메인 추가 확인 후 진입
- 챗봇 H-4~H-7 — 별도 트랙

---

## §2 단위 분리 + GO 신호

| 단위 | 내용 | 의도 층 | 커밋 종류 | 블로커 |
|---|---|---|---|---|
| **J-0** | 도메인 노트 작성 (본 파일) | docs | docs(track-j) | 없음 |
| **J-1** | 마이그레이션 (직책·직급 컬럼 + branch·role 확장 + 시드 10건) | DB | feat(db) | 없음 (즉시 가능) |
| **J-2** | RLS 정책 갱신 (general role 추가) | RLS | feat(rls) | J-1 완료 |
| **J-3** | 챗봇 노출 role 확장 (general 추가) | UI/Edge | feat(chat) | J-1 완료 |
| **J-4** | 직원관리 표 재구성 (헤더·상세 모달·직책·직급·일반화) | UI | feat(employees) | J-1 완료 |

각 단위 사이 GO 신호 분리. J-1은 쓰기 작업이므로 BEGIN/COMMIT + 검증 DO 블록 + 롤백 주석 필수.

---

## §3 스키마 현황 (실측 기반)

> **교훈 32**: 정의 추정 금지. 아래 모든 값은 실측(MCP SQL) 결과.

### §3.1 employees 테이블 전체 컬럼 (세션 16 기준, 20컬럼)

| 컬럼 | 타입 | Nullable | 비고 |
|---|---|---|---|
| id | uuid | NOT NULL | PK |
| name | varchar | NOT NULL | |
| emp_no | varchar | YES | |
| phone | varchar | YES | |
| role | varchar | NOT NULL | CHECK 제약 없음 |
| job_type | varchar | YES | 현재 값: '재배'(13), '관리'(3), NULL(7) |
| hire_date | date | YES | |
| work_hours_per_week | int | YES | |
| annual_leave_days | int | YES | |
| pin_code | varchar | YES | |
| is_active | boolean | YES | |
| created_at | timestamptz | YES | |
| username | text | YES | |
| password | text | YES | |
| branch | text | YES | CHECK 제약 없음 |
| work_start_time | time | YES | |
| work_end_time | time | YES | |
| device_token | text | YES | |
| auth_user_id | uuid | YES | NULLABLE (worker 계정은 NULL 의도적) |
| is_team_leader | boolean | NOT NULL | |

**직책·직급 컬럼**: 없음 → J-1에서 신규 추가 필요

### §3.2 role 현행 값 (실측)

| 값 | 한국어 | 현행 코드 상수 |
|---|---|---|
| `worker` | 작업자 | `ROLES.WORKER` |
| `farm_admin` | 재배팀 | `ROLES.FARM_ADMIN` |
| `hr_admin` | 관리팀 | `ROLES.HR_ADMIN` |
| `supervisor` | 총괄 | `ROLES.SUPERVISOR` |
| `master` | 마스터 | `ROLES.MASTER` |
| **`general`** | 총괄(신규) | J-1에서 추가 |

- 타입: `character varying NOT NULL` (pg_enum 아님, CHECK 제약 0건)
- `supervisor` = role 값, 별도 컬럼 없음. 현재 DB에 `총괄1`, `총괄2` 계정 2건 (branch NULL, is_active=true)

### §3.3 branch 현행 값 (실측)

| 값 | 한국어 | 비고 |
|---|---|---|
| `busan` | 부산LAB | 기존 |
| `jinju` | 진주 | 기존 |
| `hadong` | 하동 | 기존 |
| **`headquarters`** | 총괄 본사 | J-1에서 추가 |
| **`management`** | 관리팀 | J-1에서 추가 |
| **`seedlab`** | Seed LAB | J-1에서 추가 |

- 타입: `text NULLABLE` (CHECK 제약 없음)
- 기존 master 계정 1건 branch=NULL

### §3.4 supervisor vs is_team_leader

- `supervisor`: role 값 (문자열). "총괄" 계층. AdminLayout 진입 허용, 챗봇 FAB 현행 미노출.
- `is_team_leader`: boolean NOT NULL 컬럼. 작업자/farm_admin의 TBM 반장 여부 플래그. supervisor와 완전 별개.

---

## §4 마이그레이션 계획 (J-1)

### §4.1 신규 컬럼 추가 — 직책·직급

```sql
ALTER TABLE public.employees
  ADD COLUMN IF NOT EXISTS job_title  text,   -- 직책 (LAB장, HUB장, 재배사, 과장 등)
  ADD COLUMN IF NOT EXISTS job_grade  text;   -- 직급 (대표, 부장, 매니저, 사원 등 / NULL 허용)
```

- 두 컬럼 모두 NULLABLE (직급 NULL 허용 — 김현도(타회사 소속) 등)
- 작업자(role='worker')는 job_title=NULL, job_grade=NULL → UI에서 '-' 표시

### §4.2 job_type NULL 7건 처리

기존 값: `'재배'`(13건), `'관리'`(3건), NULL(7건)

J-1 진입 시 신규 직무 체계 반영하여 일반화:
- `'재배'` → `'작업자'`로 rename
- `'관리'` → `'관리자'`로 rename  
- NULL → role 분포 확인 후 확정

```sql
UPDATE employees SET job_type = '작업자' WHERE job_type = '재배';
UPDATE employees SET job_type = '관리자' WHERE job_type = '관리';
-- NULL 처리는 사전 검증 결과 후 확정 (아래 참조)
```

> **J-1 사전 검증**: 마이그레이션 실행 전 `SELECT role, COUNT(*) FROM employees WHERE job_type IS NULL GROUP BY role;` 실행하여 NULL 7건의 role 분포 확인 후 UPDATE 문 확정.

### §4.3 auth.users 생성 절차

auth.users 생성은 **마이그레이션 SQL이 아닌 별도 작업**. 순서 엄수:

1. Supabase Dashboard → Authentication → Users 또는 Admin API로 각 계정 auth.users 생성
2. 생성된 `auth.users.id` 확보 (Dashboard에서 직접 확인)
3. employees INSERT 시 `auth_user_id = 위 id` 매핑 (서브쿼리로 연결)
4. 태우가 외부(Dashboard 또는 이메일 초대)에서 비밀번호 설정

> **주의**: 비밀번호(`rmfpvm001`)는 커밋 메시지·코드·채팅창에 노출 금지 (교훈 27 원칙 준용). 마이그레이션 SQL에 평문 삽입 금지. Dashboard에서만 설정.

> **추후 필수**: 트랙 J 마감 후 계정별 비밀번호 변경 (BACKLOG `EMPLOYEE-PASSWORD-FIRST-LOGIN-001`).

### §4.4 신규 시드 10건

| login_id | name | branch | role | job_type | job_title | job_grade | 비고 |
|---|---|---|---|---|---|---|---|
| `mspark` | 박민식 | headquarters | general | 관리자 | 총괄 | 대표 | |
| `mkkim` | 김민국 | headquarters | general | 관리자 | 총괄 | 부장 | |
| `jhkim` | 김지현 | management | hr_admin | 관리자 | 관리팀 | 사원 | |
| `sjpark` | 박세정 | management | hr_admin | 관리자 | 관리팀 | 과장 | |
| `hdkim` | 김현도 | busan | farm_admin | 관리자 | LAB장 | NULL | 타회사 소속, 직급 NULL |
| `sphong` | 홍승표 | busan | farm_admin | 관리자 | 재배사 | 사원 | |
| `hhkim` | 김현회 | jinju | farm_admin | 관리자 | HUB장 | 사원 | |
| `dykim` | 김도윤 | hadong | farm_admin | 관리자 | HUB장 | 매니저 | |
| `nhbaek` | 백남훈 | hadong | farm_admin | 관리자 | 재배사 | 사원 | |
| `tukim` | 김태우 | seedlab | master | 관리자 | LAB장 | 매니저 | 마스터 계정 + Seed LAB장 겸직 |

**시드 SQL 원칙**:
- UUID 하드코딩 금지 — `gen_random_uuid()` 사용
- auth_user_id는 auth.users 생성 후 서브쿼리로 매핑
- DO 블록 + BEGIN/COMMIT 래핑

### §4.5 기존 supervisor 계정 처리

신규 10건 발급 + 동작 검증 완료 후:

```sql
UPDATE employees
SET is_active = false
WHERE role IN ('supervisor', 'farm_admin', 'hr_admin', 'master')
  AND name IN ('총괄1', '총괄2')  -- 기존 더미 계정
  AND id IN ('0bf972ca-...', 'f68c9342-...');
-- 기타 기존 더미 admin 계정도 동일 처리
```

> **주의**: 삭제 금지 (FK 참조 데이터 무결성 보존). `is_active = false`로만 처리.

---

## §5 RLS 정책 설계 (J-2)

### §5.1 general role 특성

- **가시성**: 전 지점 (branch 무관) — master/hr_admin과 동등
- **쓰기**: 읽기 전용 (INSERT/UPDATE/DELETE 전 차단)
- **챗봇**: 가능 (J-3에서 추가)

### §5.2 갱신 대상 정책

| 테이블 | 정책 종류 | 조치 |
|---|---|---|
| employees | SELECT (admin) | `general` 추가 |
| attendance | SELECT (admin) | `general` 추가 |
| leave_requests | SELECT (admin) | `general` 추가 |
| overtime_requests | SELECT (admin) | `general` 추가 |
| safety_checks | SELECT (admin) | `general` 추가 |
| daily_work_logs | SELECT (admin) | `general` 추가 |
| task_logs | SELECT (admin) | `general` 추가 (존재 시) |
| 모든 쓰기 정책 | INSERT/UPDATE/DELETE | `general` 제외 유지 |

### §5.3 ALL_BRANCH_ROLES 확장

`src/lib/permissions.js`:
```js
// 현재
export const ALL_BRANCH_ROLES = ['hr_admin', 'supervisor', 'master'];
// J-2 후
export const ALL_BRANCH_ROLES = ['hr_admin', 'supervisor', 'master', 'general'];
```

### §5.4 RLS 정책 템플릿 (general 추가 패턴)

```sql
-- 기존 admin SELECT 정책에 general 추가 예시
CREATE POLICY <table>_select_admin ON <table>
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM employees
      WHERE auth_user_id = auth.uid()
        AND role IN ('farm_admin', 'hr_admin', 'supervisor', 'master', 'general')
        AND (
          role IN ('hr_admin', 'supervisor', 'master', 'general')  -- 전 지점
          OR branch = <table>.<branch_column>                       -- farm_admin: 본인 지점
        )
    )
  );
```

> **교훈 31 참조**: RLS INSERT 정책 employees 조인 경유 패턴.

---

## §6 직원관리 표 재구성 (J-4)

### §6.1 신규 헤더

`이름 | 직무 | 직책 | 직급 | 근무 지점 | 근무 시간 | 연락처 | 입사일 | 상태 | QR | 반장`

### §6.2 직무 표시 규칙

| role | job_type 표시 |
|---|---|
| worker | '작업자' |
| farm_admin / hr_admin / supervisor / master / general | '관리자' |

### §6.3 직책·직급 표시 규칙

| 조건 | 직책 | 직급 |
|---|---|---|
| job_type = '작업자' | `-` | `-` |
| job_type = '관리자' | job_title 값 또는 `—` | job_grade 값 또는 `—` |

### §6.4 수정 권한

| role | 수정 가능 범위 |
|---|---|
| hr_admin | 전 직원 정보 수정 (관리팀 운영 권한) |
| master | 전 직원 전체 수정 가능 (시스템 관리자 본질) |
| farm_admin | 반장(is_team_leader) 부여·해제만 |
| general | 읽기 전용 (수정 불가) |
| supervisor | 읽기 전용 (수정 불가, 현행 유지) |

### §6.5 상세 모달

- 표 행 클릭 → 상세 모달 오픈
- 주민번호 등 개인정보는 모달 내 별도 탭 또는 토글로 노출 (평상시 마스킹)
- 수정 폼은 권한에 따라 활성/비활성

---

## §7 챗봇 role 확장 (J-3)

### §7.1 노출 조건 변경

| 구분 | 현행 | J-3 후 |
|---|---|---|
| FAB 노출 | farm_admin / hr_admin / master (3종) | farm_admin / hr_admin / master / **general** (4종) |
| Edge Function 허용 | farm_admin / hr_admin / master (3종) | farm_admin / hr_admin / master / **general** (4종) |

### §7.2 갱신 위치

| 위치 | 현재 라인 | 변경 내용 |
|---|---|---|
| `src/components/chatbot/ChatbotFab.jsx:25` | `CHATBOT_ALLOWED_ROLES = ['farm_admin', 'hr_admin', 'master']` | `'general'` 추가 |
| `supabase/functions/chatbot-query/index.ts` | `ALLOWED_ROLES` 배열 | `'general'` 추가 |
| `docs/DOMAIN_CHATBOT_V1.md §7` | H-3 행 role 3종 | 4종으로 갱신 |

> **BACKLOG `CHATBOT-ROLES-EXTRACT-001`**: J-3 진입 시 permissions.js 공통화 검토 (우선순위 낮음, 선택적).

---

## §8 미확정 도메인 항목 (TEMP·BACKLOG 추적)

| ID | 내용 | 결정 시점 |
|---|---|---|
| `GENERAL-DASHBOARD-ITEMS-001` | general role 대시보드 노출 항목 정의 — 박민식·김민국 답변 대기 | 답변 수신 시 |
| `EMPLOYEE-PASSWORD-FIRST-LOGIN-001` | 트랙 J 마감 후 계정별 비밀번호 변경 강제 정책 | 트랙 J 마감 직후 |
| `TEMP-DECISION-3` | daily_work_logs branch CHECK — 신규 3종 포함 여부 | J-1 진입 시 검토 |

---

## §9 코드 파일 영향 범위 (J-4 참조용)

| 파일 | 영향 내용 |
|---|---|
| `src/lib/permissions.js` | `ALL_BRANCH_ROLES`에 `general` 추가, `ROLES.GENERAL` 상수 추가, `ROLE_LABELS.general` 추가 |
| `src/hooks/useAuth.js` | `ADMIN_ROLES`에 `general` 추가 (permissions.js와 동기화 또는 import 전환) |
| `src/components/chatbot/ChatbotFab.jsx` | `CHATBOT_ALLOWED_ROLES`에 `general` 추가 |
| `src/pages/admin/EmployeesPage.jsx` | 헤더 재구성, 상세 모달, 직책·직급 컬럼 렌더링 |
| `src/stores/safetyCheckStore.js` | `BRANCH_NAMES` 신규 3종 추가 |
| `src/pages/admin/AttendancePage.jsx` | `BRANCH_LABEL`, `BRANCH_ORDER` 신규 3종 추가 |
| `src/pages/admin/DailyWorkLogsPage.jsx` | `BRANCH_OPTIONS`, `BRANCH_LABEL` 신규 3종 추가 |
| `src/components/dailyWorkLogs/DailyWorkLogFormModal.jsx` | `BRANCH_OPTIONS` 신규 3종 추가 |
| `src/pages/admin/SafetyChecksPage.jsx` | `BRANCH_LABEL` 신규 3종 추가 |
| `supabase/functions/chatbot-query/index.ts` | `ALLOWED_ROLES`에 `general` 추가 |

> **참고**: branch 상수는 코드 곳곳에 하드코딩. J-4 진입 시 갱신 필요 파일 실측 후 일괄 처리.
