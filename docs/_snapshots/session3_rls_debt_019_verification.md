# RLS-DEBT-019 검증 기록 — Phase 5 세션 3

> 작성 일시: 2026-04-11  
> 마이그레이션 파일: `supabase/migrations/20260411130000_rls_debt_019_safety_checks_date_narrowing.sql`

---

## 검증 방법 시도 결과

### 방법 A — SET LOCAL ROLE anon (시도, 실패)

```sql
BEGIN;
SET LOCAL ROLE anon;
SELECT date, COUNT(*) FROM safety_checks WHERE date = CURRENT_DATE GROUP BY date;
COMMIT;
```

**결과:** `ERROR: 42501: permission denied to set role "anon"`

**원인:** Supabase MCP는 service_role로 연결되며, service_role은 anon으로 ROLE 전환 불가.
**함의:** MCP `execute_sql`로는 anon RLS 정책 동작을 직접 시뮬레이션할 수 없음.
→ **교훈 추가 대상** (LESSONS_LEARNED.md 참조).

---

### 방법 B — polqual 텍스트 확인 (성공)

#### 적용 전 (2026-04-11 baseline)

```sql
SELECT polname, pg_get_expr(polqual, polrelid) AS using_clause
FROM pg_policy
WHERE polrelid = 'safety_checks'::regclass
  AND polname = 'safety_checks_anon_select';
```

**결과:**
```
polname: safety_checks_anon_select
using_clause: (EXISTS ( SELECT 1
   FROM employees
  WHERE ((employees.id = safety_checks.worker_id)
    AND ((employees.role)::text = 'worker'::text)
    AND (employees.is_active = true))))
```

`CURRENT_DATE` 없음 → 마이그레이션 **미적용** 확인 ✅

#### 적용 후 — 1차 확인 (2026-04-11, 마이그레이션 미적용 확인됨)

```sql
SELECT polname,
       pg_get_expr(polqual, polrelid) AS using_clause,
       pg_get_expr(polqual, polrelid) LIKE '%CURRENT_DATE%' AS has_current_date
FROM pg_policy
WHERE polrelid = 'safety_checks'::regclass
  AND polname = 'safety_checks_anon_select';
```

**결과:**
```
polname: safety_checks_anon_select
has_current_date: false
using_clause: (EXISTS ( SELECT 1
   FROM employees
  WHERE ((employees.id = safety_checks.worker_id)
    AND ((employees.role)::text = 'worker'::text)
    AND (employees.is_active = true))))
```

**`has_current_date = false` → 마이그레이션 미적용.**
using_clause가 적용 전과 동일. 태우 SQL Editor 실행 필요.

#### 적용 후 — 2차 확인 (2026-04-11, 태우 SQL Editor 실행 후)

**쿼리 1 — 정의 검증 (service_role MCP):**
```sql
SELECT polname,
       pg_get_expr(polqual, polrelid) AS using_clause,
       pg_get_expr(polqual, polrelid) LIKE '%CURRENT_DATE%' AS has_current_date
FROM pg_policy
WHERE polrelid = 'safety_checks'::regclass
  AND polname = 'safety_checks_anon_select';
```

**결과:**
```
polname:          safety_checks_anon_select
has_current_date: true   ← 정책 교체 확인 ✅
using_clause:     ((date = CURRENT_DATE) AND (EXISTS ( SELECT 1
                     FROM employees
                    WHERE ((employees.id = safety_checks.worker_id)
                      AND ((employees.role)::text = 'worker'::text)
                      AND (employees.is_active = true)))))
```

**쿼리 2 — 테스트 데이터 존재 확인 (service_role 기준, 정책 동작 입증 아님):**
```sql
SELECT 
  COUNT(*) FILTER (WHERE date = CURRENT_DATE)     AS today_rows,
  COUNT(*) FILTER (WHERE date = CURRENT_DATE - 1) AS yesterday_rows
FROM safety_checks
WHERE EXISTS (
  SELECT 1 FROM employees 
  WHERE employees.id = safety_checks.worker_id
    AND employees.role = 'worker' AND employees.is_active = true
);
```

**결과:**
```
today_rows:     2   ← 오늘 데이터 존재 ✅
yesterday_rows: 1   ← 어제 데이터 존재 ✅ (anon 동작 검증의 음성 케이스 재료)
```

→ 두 쿼리 모두 통과. 정의 검증 완료.

**⚠️ 주의:** 위 카운트는 service_role(RLS 우회) 기준. 실제 anon 정책 동작은 아래 단계에서 확인 필요.

---

## 데이터 기반 검증 계획 (마이그레이션 적용 후)

service_role MCP 쿼리는 RLS 우회하므로 정책 **동작** 검증 불가.
아래 두 방법 중 하나로 실제 anon 동작 확인 필요:

---

## 방법 C — anon role SQL Editor 실행 결과 (태우, 2026-04-11)

```sql
-- anon role로 실행
BEGIN;
SET LOCAL ROLE anon;
SELECT 'today'     AS label, COUNT(*) FROM safety_checks WHERE date = CURRENT_DATE;
SELECT 'yesterday' AS label, COUNT(*) FROM safety_checks WHERE date = CURRENT_DATE - 1;
COMMIT;

-- service_role 대조군 (별도 실행)
SELECT
  COUNT(*) FILTER (WHERE date = CURRENT_DATE)     AS service_today,
  COUNT(*) FILTER (WHERE date = CURRENT_DATE - 1) AS service_yesterday
FROM safety_checks
WHERE EXISTS (SELECT 1 FROM employees WHERE employees.id = safety_checks.worker_id AND employees.role='worker' AND employees.is_active=true);
```

**결과:**

| role | 오늘(2026-04-11) | 어제(2026-04-10) |
|---|---|---|
| anon | **2** | **0** |
| service_role | 2 | 1 |

**해석:** anon-yesterday=0 vs service-yesterday=1 — 동일 데이터에서 role 차이로만 발생.
`CURRENT_DATE` 정책이 어제 row를 차단함을 직접 증명. 교훈 14 충족 ✅

---

## 방법 D — 시크릿창 PWA mount 검증 (태우, 2026-04-11)

- **계정:** 시드_작업자07 QR 로그인
- **오늘의 작업 카드:** "토마토 유인·결속" 정상 표시 ✅
- **반장 승인 대기 안내:** 표시 ✅
- **콘솔 에러:** 없음 ✅
- **알림 권한 denied:** 별건 (E-6.5 변수), 회귀와 무관
- **[FCM SW] 로그:** install·activate 완료 — SW 이미 등록 상태

→ 교훈 13 이행 완료 (시크릿 창 + 실기기 mount 검증)

---

## 최종 판정

| 검증 단계 | 방법 | 결과 |
|---|---|---|
| 정의 검증 (polqual) | 방법 B (MCP) | ✅ has_current_date=true |
| 동작 검증 (anon 차단) | 방법 C (SQL Editor) | ✅ anon-yesterday=0 |
| 회귀 검증 (PWA mount) | 방법 D (시크릿창) | ✅ 오늘 작업 카드 정상 |

**RLS-DEBT-019 날짜 narrowing 완전 검증 완료.**

---

## 다음 단계 — anon 동작 검증 (태우 담당)

정의 검증(방법 B)은 완료. 실제 anon 세션에서의 정책 **동작** 검증은 태우가 수행:

### 방법 C — Supabase Dashboard API Tester (anon key)

Dashboard → API → Auth: anon key 선택 후 아래 요청:
```
GET /rest/v1/safety_checks?select=date,count&date=eq.2026-04-11
GET /rest/v1/safety_checks?select=date,count&date=eq.2026-04-10
```

기대:
- 오늘(2026-04-11): 2건 반환 → 정상
- 어제(2026-04-10): 0건 반환 → 정책 차단 (데이터 0 아닌 정책 차단 — 교훈 14)

### 방법 D — 작업자 PWA 시크릿 창 (태우 담당)

1. 시크릿 창에서 작업자 QR 로그인
2. TBM 화면 mount → `getTodayCheck` 정상 동작 확인 (오늘자 기록 보임)
3. 회귀 없음 = 게이트 통과

---

## 적용 절차 (태우)

1. `supabase/migrations/20260411130000_rls_debt_019_safety_checks_date_narrowing.sql` 전체 내용을
   Supabase Dashboard → SQL Editor에서 실행
2. 방법 B (polqual 확인) 재실행 → `CURRENT_DATE` 포함 확인
3. 방법 C 또는 D 중 하나로 동작 검증
4. Claude Code에 "RLS-DEBT-019 마이그레이션 적용 완료 + 검증 OK" 보고

---

## MCP 제약 정리

| 검증 방법 | MCP 가능 여부 | 이유 |
|---|---|---|
| polqual 텍스트 확인 | ✅ 가능 | pg_policy 조회는 service_role 허용 |
| SET LOCAL ROLE anon | ❌ 불가 | permission denied (service_role → anon 전환 차단) |
| apply_migration DDL | ❌ 불가 | MCP read-only 모드 |
| anon 동작 시뮬레이션 | ❌ 불가 | service_role은 RLS 우회 |
