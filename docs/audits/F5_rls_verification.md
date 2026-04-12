# F-5 RLS 권한 회귀 검증

작성일: 2026-04-12  
대상: `daily_work_logs` (트랙 F)  
관련: BACKLOG F-5, 교훈 13/15/17  
마이그레이션: `supabase/migrations/20260412100000_track_f_daily_work_logs.sql`

---

## 검증 방법

| 방법 | 수행자 | 수단 | 상태 |
|---|---|---|---|
| A: pg_policy 정책 정의 정적 검증 | Claude Code | MCP execute_sql | ✅ 완료 |
| B: 헬퍼 함수 동작 검증 | Claude Code | MCP execute_sql | ✅ 완료 |
| C: 런타임 시뮬레이션 SQL | 태우 | Dashboard SQL Editor | ⏳ 대기 |
| D: 앱 실기기 시나리오 | 태우 | 실기기 | ⏳ 대기 |

---

## 방법 A — pg_policy 정책 정의 정적 검증 (MCP)

### 쿼리 결과

| polname | polpermissive | polcmd | polroles | using_expr | with_check_expr |
|---|---|---|---|---|---|
| daily_work_logs_farm_admin | true (PERMISSIVE) | `*` (ALL) | `{authenticated}` | `(current_employee_role() = 'farm_admin' AND current_employee_branch() = branch)` | 동일 |
| daily_work_logs_hr_admin_master | true (PERMISSIVE) | `*` (ALL) | `{authenticated}` | `(current_employee_role() = ANY (ARRAY['hr_admin', 'master']))` | 동일 |

### 판정

**✅ 정책 정의 정상**

| 검증 항목 | 기대 | 실측 | 판정 |
|---|---|---|---|
| 정책 수 | 2개 | 2개 | ✅ |
| farm_admin USING | `role='farm_admin' AND branch 일치` | 동일 | ✅ |
| farm_admin WITH CHECK | USING와 동일 | 동일 (INSERT/UPDATE branch 강제) | ✅ |
| hr_admin/master USING | `role IN ('hr_admin','master')` | 동일 | ✅ |
| hr_admin/master WITH CHECK | USING와 동일 | 동일 (전 지점 쓰기) | ✅ |
| worker/anon 정책 | 없음 (묵시적 거부) | 없음 | ✅ |
| polcmd | ALL (`*`) — SELECT/INSERT/UPDATE/DELETE 통합 | `*` | ✅ |
| 대상 role | `authenticated` | `authenticated` | ✅ |

**특이사항:** 두 정책 모두 PERMISSIVE이며 authenticated role에만 적용. anon에 대한 정책 없음 → anon은 묵시적 거부.

---

## 방법 B — 헬퍼 함수 동작 검증 (MCP)

### 쿼리 결과

| role_result | branch_result | pg_current_user |
|---|---|---|
| NULL | NULL | `supabase_read_only_user` |

### 판정

**✅ 헬퍼 함수 동작 정상 (NULL 반환 = 의도된 동작)**

- MCP 연결 역할: `supabase_read_only_user` (service_role 아님)
- `auth.uid()` = NULL (인증된 사용자 없음) → `current_employee_role()` / `current_employee_branch()` 모두 NULL 반환
- NULL이 `'farm_admin'` 또는 `'hr_admin'`과 같지 않으므로 정책 USING = false → **데이터 차단**

**교훈 15 보완 주석:**  
MCP의 실제 pg 역할은 `service_role`이 아니라 `supabase_read_only_user`임이 확인됨.  
MCP SELECT 쿼리가 data를 반환하는 것은 이 역할에 BYPASS RLS 또는 SELECT 권한이 부여됐기 때문.  
정책 동작 검증(anon/authenticated INSERT 거부)은 여전히 방법 C SQL Editor로 수행 필요.

---

## 방법 C — 런타임 시뮬레이션 (태우 실행 완료)

스크립트: `docs/audits/F5_rls_runtime_check.sql`  
실행 방법: Supabase Dashboard → SQL Editor

### 결과

| 테스트 | 기대 | 실측 | 판정 |
|---|---|---|---|
| T1.1 anon SELECT | COUNT=0 | 0행 (정책 없음, 묵시적 거부) | ✅ PASS |
| T1.2 anon INSERT | 거부됨 NOTICE | ✅ PASS (거부됨) | ✅ PASS |
| T2.1 auth(no uid) SELECT | COUNT=0 | 0행 | ✅ PASS |
| T2.2 auth(no uid) INSERT | 거부됨 NOTICE | ✅ PASS (거부됨) | ✅ PASS |
| T3 service_role INSERT/SELECT/DELETE | 1행 통과 후 정리 | 1행 통과 (RLS 우회 — 대조군 검증 정상) | ✅ PASS |
| T4 polroles 확인 | authenticated만 | authenticated 2개 정책 확인 | ✅ PASS |

---

## 방법 D — 앱 실기기 시나리오 (태우 실행 완료)

| 시나리오 | 기대 | 실측 | 판정 |
|---|---|---|---|
| D-1: farm_admin(부산) → 부산 row 조회 | 표시됨 | 표시됨 | ✅ PASS |
| D-2: farm_admin(부산) → 진주/하동 선택 시도 | BranchFilter 자기 branch 고정, 옵션 없음 | 진주/하동 옵션 없음 | ✅ PASS |
| D-3: hr_admin/master → 3개 branch 전환 | 모두 조회 가능 | 3개 branch 전환 가능 | ✅ PASS |
| D-4: worker 로그인 → 사이드바 | "일용직/시급제" 메뉴 없음 | 메뉴 없음 | ✅ PASS |
| D-5: worker → URL 직접 진입 (/admin/daily-work-logs) | ProtectedRoute ADMIN_ROLES 가드 → /login 리다이렉트 | /login 리다이렉트 확인 | ✅ PASS |

---

## 종합 판정 — F-5 통과 ✅

| 레이어 | 검증 상태 | 판정 |
|---|---|---|
| 정책 정의 (방법 A) | 완료 | ✅ 2개 정책, USING/WITH CHECK 의도대로 |
| 헬퍼 함수 (방법 B) | 완료 | ✅ NULL 반환 = anon/uid없는 역할 차단 확인 |
| 런타임 거부 (방법 C) | 완료 | ✅ 6/6 통과 |
| 앱 레이어 가드 (방법 D) | 완료 | ✅ 5/5 통과 |

**검증 8개 항목 전부 통과. BACKLOG F-5 resolved.**

---

## 참고 — 관련 교훈

- **교훈 13**: 빌드 통과 ≠ 런타임 안전 → mount 검증과 RLS 동작 검증은 별개
- **교훈 15**: service_role MCP는 RLS 우회 → 정책 동작은 SQL Editor anon 시뮬레이션으로 검증
- **교훈 17**: 정책 존재 확인 ≠ 정책 동작 확인 → resolved 전 INSERT 시도 통과 필수

---

## 미해결 항목 / 후속 작업

- **RLS-DEBT-021**: safety_checks anon SELECT의 worker 단위 격리 — F-5 범위 외, 별도 추적 유지
- **TEMP-DECISION-1~4**: 박민식·김민국 5개 확인 항목 답 수신 후 일괄 해소 예정
