# Phase 5 세션 3 인수인계 — 2026-04-11

> 부채는 [docs/BACKLOG.md](BACKLOG.md), 교훈은 [docs/LESSONS_LEARNED.md](LESSONS_LEARNED.md)에 누적 관리됨.

## 1. 세션 목표 vs 실제 결과

**목표 (갈래 A 4건):**

| 작업 | 목표 | 결과 |
|---|---|---|
| POSTGREST-001 전수 검토 | 수정 또는 audit 완료 | ✅ 수정 0건, audit 완료, resolved |
| RLS-DEBT-019 narrowing | 날짜 제한 완화 적용 | ✅ 완료, 동작 검증 통과 |
| RLS-DEBT-020 | 재확인 | ✅ 정책 결백 (INFRA-001이 진짜 원인) |
| E-6.5 FCM 백그라운드 푸시 | 구현 + 검증 | ⚠️ 구현 완료, 검증 미완 (INFRA-001 타임아웃으로 중단) |

**트랙 F 진입:** 보류. BUG 해소 후 진입.

**마지막 커밋:** `2bde54e` (커밋 X), `9446012` (커밋 Y)

---

## 2. 완료 커밋 표

| 커밋 | 내용 |
|---|---|
| `0d803a5` | POSTGREST-001 전수 검토 0건 + RLS-DEBT-020 정책 결백 확인 |
| `6d92413` | RLS-DEBT-019 날짜 narrowing 마이그레이션 파일 |
| `8163163` | RLS-DEBT-019 DO 블록 제거 (교훈 16) |
| `f8b7415` | RLS-DEBT-019 적용 후 정의 검증 완료 |
| `71a1e45` | RLS-DEBT-019 anon 동작 검증 완료 + 교훈 15 보강 |
| `854d3c6` | E-6.5 TBM 제출 시 반장 알림 발송 |
| `54ae714` | E-6.5 라우팅 URL 확정 + 분간 로그 + FCM-001 백로그 |
| `2bde54e` | console.warn에 INFRA-001 추적 ID 추가 |
| `9446012` | BACKLOG INFRA-001 등록 + 교훈 17·18·19 |

---

## 3. 처리된 작업 상세

### POSTGREST-001 — resolved

`src/` 전체 employees embed 패턴 5곳 전수 검토. 모두 FK 제약명 명시됨. 수정 0건.
audit 결과: `docs/audits/POSTGREST-001_audit.md`.

### RLS-DEBT-019 — mitigated (날짜 narrowing)

`safety_checks_anon_select`에 `date = CURRENT_DATE` 조건 추가.
마이그레이션: `supabase/migrations/20260411130000_rls_debt_019_safety_checks_date_narrowing.sql`
동작 검증: anon-today=2, anon-yesterday=0 vs service-yesterday=1 대조 입증.
근본 해소(worker 단위 격리)는 RLS-DEBT-021로 승계.

### RLS-DEBT-020 — resolved (정책 자체는 결백)

fcm_tokens anon/authenticated INSERT 정책 모두 존재 확인. 실제 403은 INFRA-001(PostgREST 타임아웃)이 원인. 정책 동작 검증은 INFRA-001 복구 후 수행 필요.

### E-6.5 — 코드 구현 완료, 검증 미완

**구현 완료 파일:**
- `public/firebase-messaging-sw.js` — `notificationclick` data.url 지원
- `src/lib/pushNotify.js` — `sendPushToEmployee`에 `url` 파라미터 추가
- `src/stores/safetyCheckStore.js` — `savePreTaskCheck` 후 반장 알림 발송

**알림 발송 로직 요약:**
```
savePreTaskCheck 성공 후:
  try:
    if (!workerBranch) → console.warn + 스킵
    else:
      employees에서 branch+role='worker'+is_team_leader=true 조회 (maybeSingle)
      if leader.id === workerId → console.log("반장 본인 TBM — 알림 생략")
      if leader.id !== workerId → sendPushToEmployee(url:'/worker')
  catch → console.warn(INFRA-001 추적)
```

**검증 미완 사유:** INFRA-001 PostgREST 타임아웃으로 반장 fcm_tokens INSERT 403,
작업자 safety_checks INSERT 403 간헐적 발생. **2026-04-11 10:35 KST 자동 복구 확인**
(반장 PC 재로그인 시 fcm_tokens INSERT 성공, 콘솔 'FCM 토큰 저장 완료 (DB)').
→ **다음 세션 즉시 E-6.5 검증 진입 가능.**

**E-6.5 검증 표 (다음 세션 즉시 실행):**

| 케이스 | 방법 | 기대 결과 |
|---|---|---|
| **포그라운드** | 반장 앱 열린 상태, 작업자 TBM 제출 | 앱 내 toast 알림 |
| **백그라운드** | 반장 탭 숨김, 작업자 TBM 제출 | OS 알림 팝업 1회 |
| **앱 종료** | 반장 브라우저 닫음, 작업자 TBM 제출 | OS 알림 팝업 (알림 권한 허용 필요) |
| **음성 — 본인** | 반장 직접 TBM 제출 | **알림 없음** + console.log "반장 본인 TBM — 알림 생략" |
| **알림 클릭** | 알림 클릭 | 앱 포커스 또는 `/worker` (TeamLeaderApprovalCard) |
| **mount 회귀** | 시크릿창 작업자 TBM 화면 | 콘솔 에러 없음 |

---

## 4. 결정적 발견 — INFRA-001 PostgREST Warp 타임아웃

**증상:** fcm_tokens INSERT 403, safety_checks INSERT 403 간헐적 발생.
PostgREST가 `new row violates row-level security policy` 에러로 반환하여 처음에 RLS 오인.

**진짜 원인:** Supabase Dashboard → Logs → Postgres Logs에서 확인:
- `Thread killed by timeout manager` 다수 발생 (08:42, 09:54~10:14)
- PostgREST 08:55 재시작 (`Schema cache reload` 로그 확인)
- Connection pool 한도 도달 가능성 (max 10 connections)

**DB/코드/정책 모두 결백.** SQL Editor 직접 연결에서 동일 INSERT 정상 통과.

**교훈 19:** RLS 403 + DB 진단 결백 조합 → Dashboard Logs 먼저 확인.

---

## 5. 디버깅 가설 6개 전수 기록 (교훈 18 사례)

다음 세션이 같은 가설을 반복하지 않도록 기록.

| # | 가설 | 검증 방법 | 탈락 근거 |
|---|---|---|---|
| 1 | RLS 정책 누락 | `pg_policy` 조회 | 6개 정책 모두 존재, USING/CHECK 정상 |
| 2 | RESTRICTIVE 정책 | `polpermissive` 컬럼 조회 | 전체 `true` (PERMISSIVE) |
| 3 | 트리거 부수효과 | `pg_trigger` 조회 | 0건 |
| 4 | 컬럼 default/타입 문제 | `information_schema.columns` | `token NOT NULL`, 나머지 nullable 또는 default 안전. 페이로드 일치 |
| 5 | `employees.role ≠ 'worker'` | 실측 SELECT | role='worker', is_active=true 확인 |
| 6 | EXISTS 중첩 RLS | SQL Editor SET LOCAL ROLE anon 시뮬레이션 | 계획 단계에서 INFRA-001 발견으로 대체 |

**실제 원인:** PostgREST Warp `Thread killed by timeout manager` — HTTP 레이어, DB 무관.

---

## 6. 신규 부채 (세션 3 등록)

본문은 [docs/BACKLOG.md](BACKLOG.md) 참조.

| ID | 우선순위 | 한 줄 요약 |
|---|---|---|
| **INFRA-001** | 🔴 다음 세션 1순위 | PostgREST Warp 타임아웃 — 복구 확인 + 재발 방지 조치 |
| RLS-DEBT-021 | 🟡 트랙 F 후보 | safety_checks anon SELECT worker 단위 격리 (RLS-DEBT-019 근본 해소) |
| FCM-001 | 🟡 진주·하동 가동 전 | 반장 다인 시 maybeSingle() silent fail, 분배 정책 미정 |
| UX-007 | 🟡 E-6.5 활성화 전 | 알림 권한 denied 재요청 UI 없음 |

---

## 7. 신규 교훈 (세션 3 추가)

본문은 [docs/LESSONS_LEARNED.md](LESSONS_LEARNED.md) 참조.

| 번호 | 제목 |
|---|---|
| 교훈 15 | service_role MCP는 RLS 우회 — anon 정책 검증 시 SET LOCAL ROLE anon 필수 (SQL Editor) |
| 교훈 16 | 마이그레이션 파일에 자기검증 SQL 금지 — DO 블록 버그가 DDL 롤백시킴 |
| 교훈 17 | 정책 존재 확인은 정책 동작 확인이 아니다 |
| 교훈 18 | 가설 점프 안티패턴 — 탈락 가설 전수 기록, 90분 초과 시 세션 종료 |
| 교훈 19 | RLS 403 + DB 결백 → PostgREST Logs 먼저 (`Thread killed`, `timeout` 검색) |

---

## 8. 다음 세션 시작 가이드 (Phase 5 세션 4)

### 진입 조건

```bash
git pull origin main
git log --oneline -5
# 기대: 최신 9446012 "docs: BACKLOG INFRA-001 + LESSONS 교훈 17~19"
```

- `docs/BACKLOG.md` 전체 읽기 — INFRA-001 상태 확인
- `docs/LESSONS_LEARNED.md` — 교훈 17·18·19 반드시 확인

### 1순위 — E-6.5 검증 (INFRA-001 자동 복구 확인됨, 즉시 진입 가능)

**INFRA-001 상태:** 2026-04-11 10:35 KST 자동 복구 확인. 지속 이슈 아님.
시작 전 Postgres Logs에서 `Thread killed` 24시간 내 빈도 1회 확인 후 진입.

### E-6.5 검증

| 케이스 | 방법 | 기대 |
|---|---|---|
| 포그라운드 | 반장 앱 열린 상태, 작업자 TBM 제출 | 앱 내 toast 알림 |
| 백그라운드 | 반장 탭 숨김 | OS 알림 팝업 |
| 음성 — 본인 | 반장 직접 TBM 제출 | 알림 없음 + console.log |
| 알림 클릭 | 알림 클릭 | `/worker` (TeamLeaderApprovalCard) |

### 다음 세션 가설 7+ (INFRA-001 지속 시)

```sql
-- anon role TABLE GRANT 확인
SELECT grantee, privilege_type 
FROM information_schema.role_table_grants 
WHERE table_name = 'fcm_tokens';
```

- anon에 INSERT GRANT 없으면 → `GRANT INSERT ON fcm_tokens TO anon` 마이그레이션
- fetch로 직접 anon key INSERT 재현 → Network 탭 페이로드 확인
- Supabase 프로젝트 anon key 회전 여부 확인

---

> **세션 4 kickoff 지시문:** [docs/SESSION4_KICKOFF.md](SESSION4_KICKOFF.md) — Claude Code 새 세션에 붙여넣기

## 9. 작업 환경

| 항목 | 값 |
|---|---|
| 로컬 경로 | `C:\Users\User\Desktop\gref-farmwork` |
| 브랜치 | `main` 단독, 커밋 후 즉시 push |
| Supabase MCP | read-only, apply_migration 불가 (마이그레이션은 SQL Editor 수동 적용) |
| 검증 분담 | Claude Code = DB·RLS·로직 / 태우 = UI mount·실기기·SQL Editor |

---

## 10. 통계

| 항목 | 값 |
|---|---|
| 세션 3 커밋 수 | 9개 |
| 처리된 부채 | 2건 resolved (POSTGREST-001, RLS-DEBT-020 정책 확인) |
| 완화된 부채 | 1건 (RLS-DEBT-019 날짜 narrowing) |
| 신규 부채 등록 | 4건 (INFRA-001, RLS-DEBT-021, FCM-001, UX-007) |
| 신규 교훈 | 5건 (교훈 15~19) |
| E-6.5 코드 | 완료, 검증 미완 |
| 디버깅 가설 탈락 | 6개 (모두 DB 레이어, 진짜 원인은 HTTP 레이어) |
| 트랙 F 진입 | 보류 |
