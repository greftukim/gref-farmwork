# 트랙 77 U11 라운드 보고서 — 작업자 세션 만료 진단 (코드 fix 미포함)

**작성일**: 2026-05-02
**기준 커밋**: `09b9695` (U10 클로징)
**라운드 성격**: ⚠️ 진단 전용. 실제 fix는 U12에서 사용자 결정 후 진행.
**대상 파일**: `src/stores/authStore.js`, `src/main.jsx`, `src/App.jsx`

---

## 1. 작업 결과

- 변경 파일: 3개 (`+49` 라인, 진단 로그 7개 console.log + 5개 위치)
- 빌드: `npm run build` exit 0 / 27.00s / PWA precache 13 entries
- production 번들에 `TRACK77-U11-DIAG` 문자열 검출 — console.log 보존 확인

### 1.1 진단 로그 위치 (7개 console.log / 5개 지점)

| 파일 | 라인 | 위치 | 추적 대상 |
|---|---|---|---|
| authStore.js | 42-47 | initialize() worker 분기 진입 | D1: hasCurrentUser, role, hasWorkerToken |
| authStore.js | 56-64 | initialize() worker SELECT 결과 | D1: data/error/willInvalidate |
| authStore.js | 155-159 | revalidateWorkerToken() 진입 | D2: userId, timestamp |
| authStore.js | 167-175 | revalidateWorkerToken() 결과 | D2: data/error/willInvalidate |
| main.jsx | 10-14 | SW controllerchange | D3: alreadyReloaded |
| App.jsx | 104-107 | HydrationGate hydration 완료 | D2 트리거 시점 |
| App.jsx | 170-175 | App mount 시 initialize() | D1 트리거 시점 |

## 2. 자산 보존 검증

| # | 자산 | 결과 |
|---|---|---|
| 1 | 출퇴근 v2 (WorkerHome.jsx 25-204) | ✅ byte-identical (diff 결과 0 라인) |
| 2 | QR-CORE (QrScanPage.jsx onScanSuccess 45-118) | ✅ byte-identical |
| 3 | FCM (WorkerLayout.jsx 39-66) | ✅ 미변경 |
| 4 | 76-A 자산 | ✅ 미참조 |
| 5 | PWA 모달 | ✅ 미변경 |
| 6 | DB 스키마 | ✅ 변경 0건 (RLS는 점검만) |
| 7 | 기존 T 토큰 | ✅ 미변경 |

## 3. 자가 검증 결과 (C1~C7)

| C# | 항목 | 결과 |
|---|---|---|
| C1 | 빌드 통과 | ✅ exit 0 / 27.00s |
| C2 | 자산 보존 7건 미변경 | ✅ |
| C3 | TRACK77-U11-DIAG 5개 지점 / 7개 console.log 삽입 | ✅ |
| C4 | RLS 정책 SQL 조회 | ⚠️ **사용자 위임** (Supabase MCP 도구 미가용 — §7.1 SQL 박제 + 사용자 실행 부탁) |
| C5 | 빌드 산출물에 진단 로그 보존 | ✅ `dist/assets/index-*.js`에 prefix 검출 |
| C6 | git push origin main 성공 | (커밋 후 보고) |
| C7 | Vercel 배포 Ready 확인 | (push 후 안내) |

## 4. 결정 게이트 자율 처리 내역

### G77-M (U11): 진단 로그 prefix = `[TRACK77-U11-DIAG]` 통일
- 모든 7개 console.log에 일관 적용 → U12 fix 시 grep 일괄 제거 가능

### G77-N (U11): RLS 점검 SQL 결과 = **§7.1에 raw SQL 박제 + 사용자 위임**
- **사유**: Supabase MCP `execute_sql` / `list_tables` 등 deferred tool 미가용 (system reminder에는 supabase MCP 등재되어 있으나 실제 도구 비활성)
- **처리**: SQL 명령 보고서에 박제 → 사용자가 Supabase 대시보드 SQL Editor에서 실행 → 결과 캡처 박제
- **대안**: gh secret 기반 PostgREST API 호출 (서비스 키 노출 위험 → 채택 안 함)

### G77-O (U11): 진단 코드 main 브랜치 push = **자율 진행**
- 사용자 재현 환경 = Vercel 배포본 → main push 필수
- 진단 코드 임시 삽입 명시 + U12에서 일괄 제거 약속

### G77-P (U12 위임): 진단 코드 grep 제거 = **U12 라운드에서 처리**
- `grep -rn "TRACK77-U11-DIAG" src/`로 발견된 모든 console.log 일괄 제거
- 본 라운드 범위 외

## 5. 사용자 검증 시나리오 (재현 협조 필요)

### 5.1 즉시 단계
1. Vercel 배포 Ready (`U11 SHA` 후 1~3분)
2. 강제 새로고침 또는 PWA 재설치
3. 작업자 QR 로그인 → 정상 진입
4. **개발자 도구 콘솔 열기** (Chrome remote debug / Safari Web Inspector / 또는 PC 브라우저로 동일 URL 진입)
5. 콘솔 로그 다음 2건 즉시 확인:
   - `[TRACK77-U11-DIAG] App mount → initialize()`
   - `[TRACK77-U11-DIAG] HydrationGate hydration finished → revalidateWorkerToken()`
   - 그리고 willInvalidate가 false인지 확인

### 5.2 재현 단계
1. 정상 사용 중 → 앱 백그라운드 전환 (홈 버튼 또는 다른 앱)
2. **20분 / 1시간 / 4시간 / 12시간** 후 포그라운드 복귀 (재현 시점 미확정이므로 가능한 시점에서)
3. 만약 로그인 화면 재현 시:
   - 직전에 출력된 `[TRACK77-U11-DIAG]` 로그 **1건이라도 캡처해서 박제**
   - 특히 `willInvalidate: true`인 로그가 D1~D4 식별 결정타

### 5.3 사용자 부담 최소화
- 모든 시점 다 시도할 필요 없음 — 재현 1회 콘솔 캡처면 충분
- 모바일 콘솔 접근 어려우면 PC 브라우저로 동일 PWA URL 진입 + Chrome DevTools 열고 짧게 사용
- localStorage `gref-auth` 키 값을 캡처해 박제하면 currentUser/workerToken 상태 동시 확인 가능 (token 값 노출 주의 — 박제 시 마스킹)

## 6. 배포 / 푸시 상태

- 로컬 SHA: (커밋 후 보고)
- git push origin main: (커밋 후 실행 예정)
- 원격 검증: (push 후 보고)
- Vercel webhook: 자동 트리거 예상

## 7. 발견 사항

### 7.1 RLS 정책 SQL (사용자 실행 부탁) ⚠️

**Supabase 대시보드 → SQL Editor**에서 다음 2개 쿼리 실행 후 결과를 사용자가 보고서에 박제 또는 운영 채팅방에 공유:

```sql
-- (A) employees 테이블 RLS 정책 전체 조회
SELECT policyname, cmd, qual, with_check, roles
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'employees'
ORDER BY policyname;

-- (B) RLS 활성 여부
SELECT relname, relrowsecurity
FROM pg_class
WHERE relname = 'employees';
```

**해석 가이드 (사용자 결과 받은 후 분석)**:
- (B) `relrowsecurity = true`이고 (A) `roles = '{anon}'` + `cmd = 'SELECT'` 정책이 **없으면** → anon이 employees SELECT 차단됨 → D4 확정 → U12 옵션 C (RLS 보강) 권고
- `cmd = 'SELECT'` `qual = '(device_token = current_setting(...))'` 같은 조건이 있으면 → device_token claim 기반 격리 정책 → 작업자 PWA에서 device_token이 헤더로 전달되어야 함 (PostgREST `Authorization: Bearer <jwt>` 또는 `apikey` 헤더 점검 필요)
- 정책 자체가 빈 배열이면 → RLS 활성이지만 정책 없음 → 모든 anon 차단 → D4 확정
- `roles = '{authenticated}'` 만 있으면 → anon은 차단됨 (작업자는 anon 컨텍스트로 동작) → D4 확정

### 7.2 employees 테이블 anon SELECT 권한 분석 (사용자 응답 후 박제 예정)

§7.1 결과 받은 후 본 §에 박제. 현재 코드 흐름은:
- `loginWithDeviceToken()`: `eq('device_token', token).eq('is_active', true).maybeSingle()` — anon 컨텍스트
- `revalidateWorkerToken()`: `eq('id', currentUser.id).maybeSingle()` — anon 컨텍스트
- `initialize()` worker 분기: 동일

세 곳 모두 anon으로 employees SELECT — RLS가 anon SELECT 허용해야 정상 작동.

### 7.3 RLS 차단 시 별 트랙 권고

§7.1 결과로 RLS가 anon SELECT를 차단 중이면:
- 신규 BACKLOG 항목: `TRACK77-AUTH-RLS-WORKER-001`
- 해소 방안: anon이 device_token으로 자기 row만 SELECT 허용하는 정책 추가 + revalidate 시점에 token을 explicit하게 query에 포함
- 본 라운드 미진행 (자산 보존 §2.4 DB 정책 = 별 트랙 권고)

### 7.4 그 외 발견점

- **localStorage 영속**: zustand persist의 `partialize`가 currentUser/isAuthenticated/workerToken만 저장 → 기본적으로 영구 보관. localStorage 자체는 사용자가 명시적으로 지우지 않는 한 유지.
- **session: null**: persist에 포함 안 됨 — Supabase Auth 세션은 별도 (worker는 사용 안 함). 작업자 흐름은 workerToken만 의존.
- **HydrationGate가 매 mount마다 revalidateWorkerToken 호출**: PWA 재진입 시 매번 실행. 일시 네트워크 오류 1회만으로 토큰 무효화 → 가장 의심스러운 D2.
- **`partialize`에 loading 미포함**: hydration 후 `loading: true`로 시작 → `initialize()` 완료 후 false. 영향 미미.
- **service worker `controllerchange`**: 새 SW 활성화 시 1회 reload → sessionStorage `sw-reloaded`로 다중 reload 방지. 백그라운드에서 SW 업데이트가 발생하면 포그라운드 복귀 시 reload 가능 → 그 직후 initialize() → 일시 네트워크 오류 시 D1 fail.

**가장 의심스러운 시나리오**: **D2 (revalidateWorkerToken 일시 fail)** > D1 (initialize fail) > D3 (SW reload 직후 D1) > D4 (RLS 차단)

§7.1 결과가 RLS 차단 = false이면 D2가 단연 1순위.

## 8. 다음 라운드 (U12 fix 옵션 후보 — 사용자 결정 대기)

### 옵션 A — 보수적 fix (권고)
`revalidateWorkerToken()` / `initialize()`의 error 분기에서 토큰 무효화 제거. 일시 네트워크 오류 시 기존 인증 상태 유지. device_token 변경(다른 디바이스 QR)은 다음 정상 응답 시 감지.
- **회귀 위험**: 낮음
- **대가**: 무효화된 토큰이 잠시 살아있을 수 있음 (수 초~분, 사실상 무시 가능)
- **변경 라인**: ~6 라인 (error 분기 조건 완화)

### 옵션 B — 재시도 fix
1차 실패 시 2~3회 지수 백오프 재시도. 모두 실패 시에만 무효화.
- **회귀 위험**: 중 (재시도 로직 자체 버그 가능)
- **대가**: 코드 복잡도 ↑
- **변경 라인**: ~30 라인

### 옵션 C — RLS 정책 보강 (별 트랙)
employees 테이블에 anon SELECT 정책 추가 또는 device_token으로 자기 row 조회 정책.
- **별 트랙 권고** (DB 정책 영역, 자산 보존 §2.4)
- §7.1 결과로 RLS 차단 확정 시 필수

### 본 채팅방 권고: **§7.1 결과 + 사용자 콘솔 캡처 받은 후 옵션 A + (필요 시) 옵션 C 별 트랙 병행**.

옵션 A는 RLS 결과 무관하게 안전한 보강. 옵션 C는 RLS 차단 확정 시 별 트랙으로 분리.

## 9. 발견 즉시 신규 BACKLOG 후보

§7.1 결과 받은 후 결정. 잠정:
- `TRACK77-AUTH-RLS-WORKER-001` (RLS 차단 확정 시) — 별 트랙

## 10. U12 라운드 후보 진입 시점

1. 사용자가 §7.1 SQL 실행 결과 박제
2. 사용자가 §5 시나리오 재현 → 콘솔 캡처 박제
3. 본 채팅방이 D1~D4 중 트리거 식별
4. U12 옵션 A/B/C 중 사용자 결정
5. U12 진행 (`[TRACK77-U11-DIAG]` 일괄 제거 + fix 적용)

---

**끝.**
