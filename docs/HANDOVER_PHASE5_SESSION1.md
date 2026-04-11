# Phase 5 세션 1 인수인계 — 2026-04-11

> 부채는 [docs/BACKLOG.md](BACKLOG.md), 교훈은 [docs/LESSONS_LEARNED.md](LESSONS_LEARNED.md)에 누적 관리됨.

## 1. 개요

이 문서는 Phase 5 세션 1 (GREF FarmWork 트랙 E — 반장 승인 플로우 E-6 완성) 작업
종료 시점의 인수인계 문서입니다. 다음 세션에서 이 문서만 보고 곧바로 작업을 재개할
수 있도록 작성됐습니다.

**Phase 5 세션 1 목표:** Phase 4 종료(E-5c) 이후 한 세션에서 E-6 반장 승인 플로우
본체 완성. BUG-005·RLS-DEBT-018 사전 부채 청산 포함.

**진행 방식:** claude.ai 웹 세션(설계/지시문) + Claude Code 로컬(구현/빌드/커밋)
+ 태우(UI 검증/설계 피드백) 3자 협업.

**세션 내 인프라 변화:** 세션 종료 시점에 Supabase MCP 서버 연결 완료.
다음 세션부터 Claude Code가 DB 조회·검증을 자율 수행 → 태우는 UI 검증만.

---

## 2. 완료 커밋 표

| 커밋 | 단계 | 내용 |
|---|---|---|
| `9b43521` | E-6.0 / BUG-005 | `loginWithDeviceToken` select에 `is_team_leader` 추가 |
| `c7e7d86` | E-6.1 / RLS-DEBT-018 | farm_admin 본인 지점 safety_checks UPDATE 정책 추가 |
| `7cb487b` | E-6.2 | permissions.js 헬퍼 2개 + safetyCheckStore 가드 2곳 |
| `acd37a9` | E-6.3 | TeamLeaderApprovalCard 신규 + WorkerHome 통합 |
| `77cfabc` | E-6.4 | WorkerTasksPage 미승인 배너 + getTodayCheck status select |
| `7ef628e` | E-6.3/6.4 rework | 소프트 게이트 → 하드 게이트 전환 + 빈 상태 처리 + 쿼리 보강 |
| `c9482f6` | hotfix | employees FK 명시적 disambiguation + JS 레벨 branch 필터 |

**인프라 커밋 (E-6과 별도, 표 미포함):**

| 커밋 | 내용 |
|---|---|
| `556963b` | chore: .mcp.json gitignore 추가 |
| `251223e` | chore: supabase.mcp.json gitignore 추가 |
| `2ae20da` | chore: supabase.mcp.json gitignore 제거 (최종 구성) |

---

## 3. 트랙 E 진행률

```
트랙 E — TBM 시스템 고도화                          12/14 완료 (86%)
│
├── ✅ E-1    TBM v2 스키마 (safety_checks, tbm_risk_templates)
├── ✅ E-2    위험 템플릿 시드 35건 → 부산LAB 피드백 반영 32건 (E-2.1)
├── ✅ E-3    safetyCheckStore 확장 + cropIds 배열 지원 (E-3.1)
├── ✅ E-4    WorkerHome TBM 인터셉트 제거
├── ✅ E-5a   SafetyCheckBottomSheet 2단계 확장 (pre_task 모드 + 위험 팝업)
├── ✅ E-5b   WorkerTasksPage 첫 작업 TBM 인터셉트
├── ✅ E-5c   safety_checks anon self-update 정책 + confirmRisks 방어
├── ✅ E-6.0  BUG-005: loginWithDeviceToken is_team_leader select 추가
├── ✅ E-6.1  RLS-DEBT-018: farm_admin safety_checks UPDATE 정책 보강
├── ✅ E-6.2  permissions.js 헬퍼 + safetyCheckStore 가드
├── ✅ E-6.3/6.4  반장 승인 카드 + 하드 게이트 (rework 포함)
├── ✅ E-6 hotfix  Postgrest FK 명시 + JS branch 필터
├── ⏳ E-7    EmployeesPage 반장 토글 UI        ← 다음 세션 시작점 권장
└── ⏳ E-8    관리자 확장 + Excel 다운로드

[백로그] E-6.5  FCM 반장 알림 — RLS-DEBT-020 해결 후 착수
```

---

## 4. 완료 내용 상세

### E-6.0 — BUG-005: authStore.js select 보강 (`9b43521`)

**증상:** `loginWithDeviceToken`(작업자 QR 로그인)의 `.select()` 컬럼 목록에
`is_team_leader`가 없어 `currentUser.isTeamLeader`가 항상 `undefined`.
반장 권한 판정 자체가 불가능한 근본 원인.

**수정:**
```js
// authStore.js — loginWithDeviceToken (line 108 근방)
// Before
.select('id, name, role, branch, is_active, device_token, auth_user_id, job_type, work_start_time, work_end_time')
// After
.select('id, name, role, branch, is_active, device_token, auth_user_id, job_type, work_start_time, work_end_time, is_team_leader')
```

`revalidateWorkerToken`에도 동일 컬럼 추가 (세션 갱신 시 값 유지).

---

### E-6.1 — RLS-DEBT-018: farm_admin 정책 추가 (`c7e7d86`)

**문제:** `safety_checks_authenticated_update` 정책이 `authenticated` 역할이지만
farm_admin의 지점 기반 UPDATE를 명시적으로 허용하지 않았음.
반장 승인 플로우에서 farm_admin이 safety_checks를 UPDATE해야 하는데 차단됨.

**수정:** 마이그레이션으로 `safety_checks_authenticated_update` 정책 재생성.
`current_employee_branch()` DB 함수를 재사용해 farm_admin이 본인 지점 worker의
safety_checks만 UPDATE 가능하도록 제한.

```sql
-- 정책 갱신 핵심 (USING 절)
USING (
  auth.role() = 'authenticated'
  AND (
    -- farm_admin: 본인 지점만
    (EXISTS (
      SELECT 1 FROM employees adm
      WHERE adm.auth_user_id = auth.uid()
        AND adm.role = 'farm_admin'
        AND adm.branch = current_employee_branch(safety_checks.worker_id)
    ))
    -- hr_admin / master: 전체
    OR EXISTS (
      SELECT 1 FROM employees adm
      WHERE adm.auth_user_id = auth.uid()
        AND adm.role IN ('hr_admin', 'master')
    )
  )
)
```

---

### E-6.2 — permissions.js 헬퍼 + safetyCheckStore 가드 (`7cb487b`)

**permissions.js 신규 헬퍼 2개:**

```js
// src/lib/permissions.js 추가분
export function isTeamLeader(user) {
  return user?.role === 'worker' && user?.isTeamLeader === true;
}

export function canApproveTBM(user) {
  return isTeamLeader(user) || isFarmAdmin(user) || canHrCrud(user);
}
```

`is_team_leader`는 role이 아닌 flag 패턴으로 처리 (DB 컬럼 boolean, ROLES 상수 미추가).

**safetyCheckStore 가드 2곳:**

| 함수 | 가드 내용 |
|---|---|
| `approveChecks(checkIds, approverId)` | `canApproveTBM(currentUser)` 사전 검사. 미충족 시 early return + console.error |
| `getPendingChecksForApproval(branch)` | `isTeamLeader(currentUser) \|\| isFarmAdmin(currentUser)` 검사 후 쿼리 실행 |

---

### E-6.3 — TeamLeaderApprovalCard 신규 + WorkerHome 통합 (`acd37a9`)

**신규 컴포넌트:** `src/components/safety/TeamLeaderApprovalCard.jsx`

- WorkerHome에 `isTeamLeader(currentUser)` 조건부로 렌더링
- 오늘 날짜 + 본인 지점의 `status='submitted'` TBM 목록 표시
- 체크박스 다중선택 + 일괄승인 버튼 (`approveChecks(checkIds, currentUser.id)`)
- `overtimeStore.bulkApprove` 패턴 참고해 배열 처리

---

### E-6.4 — 배너 + getTodayCheck status select (`77cfabc`)

**WorkerTasksPage 변경:**
- "오늘 TBM이 미승인 상태입니다" 배너 추가 (소프트 게이트 — 이 시점은 경고만)
- 배너 표시 조건: `todayCheck?.status === 'submitted'` (승인 대기 중)

**getTodayCheck 쿼리 보강:**
- `.select('id, status, check_type, ...')` — `status` 컬럼이 select에 없어 배너
  조건 판정 불가했던 문제 수정

---

### E-6.3/6.4 rework — 하드 게이트 전환 (`7ef628e`)

**설계 정정:** 소프트 게이트(경고 배너) → 하드 게이트(작업 진입 차단).

**전환 근거:** 산업안전보건법상 작업 전 안전점검(TBM)은 작업 개시 전 완료가 원칙.
"반장 부재 시 현장 마비" 우려는 부산LAB 규모(분 단위 지연)에서 과장. 사후 승인은
기록 위조와 다름없음. — 태우 지적으로 rework 결정.

**변경 사항:**

1. **하드 게이트 적용:** `WorkerTasksPage`에서 `status !== 'approved'`이면 작업
   목록 진입 차단. "반장 승인 후 작업 시작 가능합니다" 안내 표시.

2. **카드 빈 상태 처리:** `TeamLeaderApprovalCard`에서 대기 목록이 0건일 때
   "오늘 승인할 TBM이 없습니다" 빈 상태 UI 추가. 이전 구현에서 빈 배열 시
   컴포넌트 언마운트 후 재오픈 시 크래시하던 버그 수정.

3. **`getPendingChecksForApproval` 쿼리 보강:**

```js
// safetyCheckStore.js
getPendingChecksForApproval: async (branch) => {
  const { data, error } = await supabase
    .from('safety_checks')
    .select('id, status, worker_id, workers:employees!safety_checks_worker_id_fkey(name, branch)')
    .eq('check_type', 'pre_task')   // ← check_type 필터 추가 (이전엔 누락)
    .eq('status', 'submitted')
    // branch 필터는 JS 레벨로 이동 (hotfix에서 처리)
  if (error) { console.error('getPendingChecksForApproval error:', error); return []; }  // ← console.error 추가
  ...
}
```

---

### E-6 hotfix — Postgrest FK 명시 (`c9482f6`)

**문제:** `safety_checks` 테이블이 `employees`를 참조하는 FK가 2개
(`worker_id` → employees, `approved_by` → employees). Postgrest의 `!inner` embed
문법에서 FK 모호성 에러: `"more than one relationship was found"`.

**수정:**
```js
// Before (모호)
.select('..., workers:employees!inner(name, branch)')

// After (FK 제약명 명시)
.select('..., workers:employees!safety_checks_worker_id_fkey!inner(name, branch)')
```

**JS 레벨 branch 필터 추가:**
Nested 필터 (`.eq('workers.branch', branch)`)도 FK 모호성 영향을 받아 제거.
대신 JS 레벨에서 `data.filter(c => c.workers?.branch === branch)`로 처리.

```js
// hotfix 이후 안전 패턴
const filtered = (data || []).filter(c => c.workers?.branch === branch);
```

---

## 5. DB 상태 (세션 종료 시점 실측)

**조회 일시:** 2026-04-11 (Supabase MCP)

| 항목 | 실측값 | 비고 |
|---|---|---|
| `safety_checks` 오늘(2026-04-11) pre_task | approved 2건 | 세션 중 검증용 데이터 |
| `tbm_risk_templates` is_active=true | 32건 | E-2.1 이후 유지 |
| `employees` busan + is_team_leader=true | 1명 | 시드_작업자01 (SQL 임시 지정) |
| `safety_checks` RLS 정책 수 | 6개 | 아래 목록 참조 |

**safety_checks RLS 정책 6개 (현행):**

| 정책명 | 설명 |
|---|---|
| `safety_checks_anon_confirm_risks` | 작업자 위험 확인 단계 UPDATE |
| `safety_checks_anon_insert` | 작업자 TBM 신규 제출 |
| `safety_checks_anon_select` | 작업자 본인 기록 조회 |
| `safety_checks_authenticated_select` | 관리자 전체 조회 |
| `safety_checks_authenticated_update` | farm_admin/hr_admin/master UPDATE (E-6.1에서 보강) |
| `safety_checks_team_leader_update` | 반장 승인 UPDATE |

---

## 6. 백로그 현황

### 해결됨 ✅

| ID | 내용 | 처리 커밋 |
|---|---|---|
| RLS-DEBT-018 | safety_checks_team_leader_update 정책 역할 오류 | `c7e7d86` (E-6.1) |
| BUG-005 | loginWithDeviceToken select is_team_leader 누락 | `9b43521` (E-6.0) |

### 신규 백로그 (3건)

| ID | 내용 | 우선순위 | 착수 시점 |
|---|---|---|---|
| RLS-DEBT-019 | `safety_checks_anon_select` 정책이 지점 격리 없이 전체 조회 허용 — 보안 느슨 | 🟡 보통 | E 트랙 종료 후 보안 트랙 |
| RLS-DEBT-020 | `fcm_tokens` 테이블 INSERT 정책 누락 — 반장 FCM 토큰 등록 불가 | 🟡 보통 | **E-6.5 착수 전 필수 fix** |
| POSTGREST-001 | `employees` JOIN이 있는 다른 스토어에서 동일 FK 모호성 패턴 잠재 — 일괄 검토 필요 | 🟡 보통 | E 트랙 종료 후 리팩터링 트랙 |

---

## 7. 트랙 E 남은 작업

### E-6.5 — FCM 반장 알림 (백로그 이관)

- RLS-DEBT-020(`fcm_tokens` INSERT 정책) 해결 선행 필수
- `sendPushToEmployee(teamLeaderId, ...)` 래퍼 재사용으로 edge function 수정 없음
- E-7 이후로 미룰 수 있음 (기능 완성도에 영향 없음)

### E-7 — EmployeesPage 반장 토글 UI (다음 세션 시작점 권장)

- 작업자 행에 "반장" 토글 컬럼 추가
- 권한: hr_admin/master는 전체 지점, farm_admin은 본인 지점만
- 새 반장 지정 시 기존 반장 자동 해제 (앱 레벨 트랜잭션, DB 제약 X)
- `employees.is_team_leader` 컬럼 이미 존재 — 스키마 마이그레이션 불필요
- 현재 부산LAB 반장(시드_작업자01)은 SQL 임시 지정 상태 → E-7 UI 완성 후 정식 전환

### E-8 — 관리자 확장 + Excel 다운로드

- SafetyChecksPage (관리자)에서 TBM 기록 전체 조회 + 필터
- Excel 다운로드 (대한제강 표준 양식 적용)

---

## 8. 세션 교훈

### 교훈 1–9 (Phase 4 이전 문서 참조)

Phase 2 인수인계(`docs/handoff/2026-04-09.md`) 및 Phase 4 이전 문서에 수록.

---

### 교훈 10 — 인증 컨텍스트는 sb 토큰 존재로 결정

PWA에서 Supabase RLS 정책이 `anon`으로 평가될지 `authenticated`로 평가될지는
`employee` 객체나 Zustand state가 아니라 `localStorage`의 `sb-{ref}-auth-token`
존재 여부로 결정된다.

- 디바이스 토큰만 쓰는 작업자(`authUserId=null`)는 → `anon` role
- Supabase Auth로 로그인한 farm_admin/hr_admin은 → `authenticated` role
- 같은 PC에 둘이 공존하면 → `authenticated`가 우선

**RLS 검증은 모바일 또는 시크릿 창에서, 또는 sb 토큰 명시적 삭제 후 진행할 것.**

**발생:** Phase 5 세션 1 E-6.0 검증 시 PC localStorage에 sb 토큰이 잔존해 한때
인증 모델 오해 → 정정.

---

### 교훈 11 — 산업안전 도메인 설계는 법령·업무 본질 우선

기술적 편의("반장 부재 시 현장 마비 회피")를 근거로 안전 절차의 게이트를 약화하지
말 것. TBM은 작업 전 위험 인지·승인 절차이며 사후 승인은 기록 위조와 다를 게 없음.
산업안전보건법상 안전점검은 작업 개시 전 완료가 원칙. 부산LAB 규모에서 반장 승인
지연은 분 단위 → "현장 마비"는 과장된 우려. **안전 도메인 설계 결정은 항상 규정
준수가 첫 기준.**

**발생:** Phase 5 세션 1 E-6 설계 시 소프트 게이트 권장 → 태우 지적으로 하드
게이트 전환 → rework 1회.

---

### 교훈 12 — Postgrest는 같은 테이블 다중 FK에서 명시적 disambiguation 필요

한 테이블에 동일 외부 테이블을 참조하는 FK가 2개 이상이면 `embed!inner` 문법은
모호성 에러를 던짐: `"more than one relationship was found"`.

**해결:** `employees!fk_constraint_name!inner` 형태로 FK 제약 이름을 명시.
nested 필터(`.eq('embed.col', val)`)도 동일 영향 → JS 레벨 필터로 대체.

**안전 패턴:**
```js
// FK 제약명 명시 + JS 레벨 필터
.select('..., workers:employees!safety_checks_worker_id_fkey!inner(name, branch)')
// nested filter 대신:
const filtered = (data || []).filter(c => c.workers?.branch === branch);
```

**발생:** Phase 5 세션 1 E-6.3/6.4 rework 후 `safety_checks ↔ employees` 조회에서
발견 (`worker_id_fkey`, `approved_by_fkey` 두 FK 공존).

---

## 9. 다음 세션 시작 가이드 (Phase 5 세션 2)

### 환경 변화

| 항목 | 이전 세션 | 이번 세션 이후 |
|---|---|---|
| DB 조회 | 태우가 SQL Editor 직접 실행 | **Supabase MCP로 Claude Code 자율 수행** |
| RLS 검증 | 추정 → 태우 실행 결과 대기 | Claude Code가 `information_schema` 직접 조회 |
| 마이그레이션 | 파일 생성 → 태우 수동 실행 | 동일 (apply_migration MCP 도구 있으나 수동 실행 유지 권장) |
| 태우 검증 범위 | DB + UI | **UI만** |

### E-7 선행 준비 (이미 완료)

- `employees.is_team_leader` 컬럼: DB에 존재 ✅
- 부산LAB 반장 임시 지정 SQL: 적용됨 (시드_작업자01) ✅
- 지점당 1명 제약: DB 제약 없음, 앱 레벨로 (race condition 회피 설계) ✅

### E-7 작업 범위

```
EmployeesPage (src/pages/admin/EmployeesPage.jsx)
  └── 작업자 행에 "반장" 토글 컬럼 추가
       ├── 권한: hr_admin/master → 전체 지점
       │         farm_admin → 본인 지점만
       ├── 새 반장 지정 시 기존 반장 자동 해제 (SELECT → UPDATE 순, 앱 레벨)
       └── 저장 후 is_team_leader 실시간 반영
```

### 새 세션 시작 체크리스트

```bash
# 1. 최신 코드 동기화
git pull origin main

# 2. 현재 상태 확인
git log --oneline -5
# 기대: 최신 커밋이 2ae20da "chore: remove supabase.mcp.json from .gitignore"

# 3. Supabase MCP DB 상태 확인 (Claude Code 자율 수행 가능)
-- SELECT COUNT(*) FROM employees WHERE branch = 'busan' AND is_team_leader = true;
-- 기대: 1 (시드_작업자01)

# 4. E-7 작업 시작
```

---

## 10. 통계

| 항목 | 값 |
|---|---|
| Phase 5 세션 1 구현 커밋 | 7개 (E-6.0 ~ hotfix) |
| 인프라 커밋 | 3개 (Supabase MCP 설정) |
| 소요 | 1 세션 (장시간) |
| 신규 DB 마이그레이션 | 1개 (safety_checks_authenticated_update 정책 교체) |
| 해결 버그 | 4건 (BUG-005, RLS-DEBT-018, 카드 빈 상태 언마운트, Postgrest FK 모호성) |
| 설계 정정 | 1건 (소프트 게이트 → 하드 게이트) |
| 신규 백로그 | 3건 (RLS-DEBT-019, RLS-DEBT-020, POSTGREST-001) |
| 인프라 업그레이드 | Supabase MCP 연결 완료 (read-only, project-ref 스코프) |
| 트랙 E 진행률 | 12/14 완료 (86%) |
