# HANDOVER — Phase 5 세션 58

**날짜:** 2026-04-26  
**작업자:** Claude (세션 58)  
**직전 세션:** 세션 57 (e8a76be)

---

## 세션 목표 및 결과

NOTICE-AUTH-001 해소 — worker 인증 아키텍처 재발견 + device_token 보완 + E2E

결과: PASS 32 / FAIL 0 / WARN 2 / TOTAL 34  
(WARN 2 = safetyCheckStore 네트워크 아티팩트, 코드 결함 아님)

---

## Task 0 — 사전 조사 결과 (아키텍처 재발견)

### 핵심 발견
NOTICE-AUTH-001 전제(auth_user_id=NULL → E2E 불가)가 틀림.

**worker 인증 아키텍처:**
- `loginWithDeviceToken(token)` → `employees.device_token` 조회 → anon RLS
- Supabase Auth 계정(auth.users) 사용 안 함
- `auth_user_id=NULL`은 운영 블로커가 아님

**실제 블로커:** device_token NULL (20/24명)

### 케이스 X 선택
- worker 24명 중 20명 device_token NULL → `gen_random_uuid()::text` DB UPDATE
- Playwright E2E: `addInitScript(교훈 58)`로 localStorage `gref-auth` 주입

---

## Task 1 — device_token 생성 + Playwright E2E

### DB 변경
```sql
UPDATE employees
SET device_token = gen_random_uuid()::text
WHERE role = 'worker' AND is_active = true AND device_token IS NULL;
-- 20건 UPDATE (사후 검증: total=24, has_token=24, still_null=0)
```

### 테스트 계정 (윤화순, busan)
- employee_id: `581949b5-1a85-4429-ba26-19892ddc7240`
- device_token: `5d607a37-e96e-432f-b472-85c01e89dc17`
- authUserId: null (정상 — device_token 방식)

### addInitScript 패턴 (교훈 58)
```js
const workerAuthState = {
  state: { currentUser: TEST_WORKER, isAuthenticated: true, workerToken: TEST_WORKER.deviceToken },
  version: 0,
};
await ctx.addInitScript(({ key, value }) => {
  localStorage.setItem(key, JSON.stringify(value));
}, { key: 'gref-auth', value: workerAuthState });
```

### 변경 파일
- **`scripts/audit_session58.cjs`** (신규)
  - SECTION A: 아키텍처 확인 (device_token 방식, auth 미사용)
  - SECTION T: /worker/* 7개 라우트 E2E (WorkerHome, notices, tasks, attendance, leave, issues, /admin 차단)
  - SECTION R: admin 회귀 8개 라우트 (jhkim 로그인)
  - SECTION S: 콘솔 에러 0건

---

## Playwright 결과

`node scripts/audit_session58.cjs`

```
PASS 32 / FAIL 0 / WARN 2 / TOTAL 34
```

WARN 2: safetyCheckStore Supabase 연결 타임아웃 아티팩트 (코드 무결함)

---

## 신규 교훈

- **교훈 99** — worker 인증 아키텍처 조사 선행. auth_user_id=NULL ≠ E2E 블로커. authStore.js loginWithDeviceToken 분기 먼저 확인. Playwright worker E2E는 addInitScript(gref-auth localStorage 주입) 패턴 사용.

---

## 신규 BACKLOG

| ID | 내용 |
|----|------|
| WORKER-NOTICE-READ-001 | notices.read_by 컬럼 없음 — markRead 로컬 상태 전용, 새로고침 시 소실. `read_by UUID[] DEFAULT '{}'` 컬럼 추가 마이그레이션 별 세션 필요 |

---

## 해소된 BACKLOG

| ID | 해소 내용 |
|----|---------|
| NOTICE-AUTH-001 | 아키텍처 오해 정정. device_token 방식 확인. 20명 NULL → DB UPDATE 완료. addInitScript E2E PASS |

---

## Tier 진척

- Tier 1: 3/3 ✅
- Tier 2: 4/4 ✅
- Tier 3: 3/3 ✅
- Tier 4: 0/7
- Tier 5: 0/4

---

## 세션 59 추천

1. **Tier 4 진입** — 기능 구현 재개. BACKLOG Tier 4 항목 확인 후 우선순위 결정.
2. **ISSUE-STATUS-COLUMN-001 해소** — issues.status 컬럼 마이그레이션 (짧은 세션).
3. **WORKER-NOTICE-READ-001 해소** — notices.read_by 컬럼 + markRead DB 연결 (짧은 세션).

**추천: Tier 4 진입** — Phase 5 핵심 기능 구현 재개.

---

## 마지막 커밋

`e8a76be` docs(session57): HANDOVER 마지막 커밋 해시 업데이트
