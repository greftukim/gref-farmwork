# 트랙 77 U12 라운드 보고서 — 작업자 세션 일시 오류 보호 (옵션 A) + U11 진단 로그 제거

**작성일**: 2026-05-02
**기준 커밋**: `a28ed35` (U11 진단 라운드)
**대상 파일**: `src/stores/authStore.js`, `src/main.jsx`, `src/App.jsx`

---

## 1. 작업 결과

### 1.1 변경 요약
- **옵션 A 적용 (2곳)**: `initialize()` worker 분기 + `revalidateWorkerToken()` — 무효화 조건 변경
  - 변경 전: `error || !data || mismatch || !active` (OR)
  - 변경 후: `!error && data && (mismatch || !active)` (명시적 불일치만)
- **U11 진단 로그 7건 일괄 제거** (G77-P 약속 이행)
- 빌드: `npm run build` exit 0 / 38.85s / PWA precache 13 entries

### 1.2 변경 통계
- `src/stores/authStore.js`: -27 / +5 (진단 로그 제거 + 옵션 A 변경)
- `src/main.jsx`: -5 / 0 (진단 로그 제거만)
- `src/App.jsx`: -10 / 0 (진단 로그 제거만)
- 합계: -42 / +5

## 2. 자산 보존 검증

| # | 자산 | 결과 |
|---|---|---|
| 1 | 출퇴근 v2 (WorkerHome.jsx 25-204) | ✅ byte-identical (diff 0 라인) |
| 2 | QR-CORE (QrScanPage.jsx onScanSuccess 45-118) | ✅ byte-identical |
| 3 | FCM (WorkerLayout.jsx 39-66) | ✅ 미변경 |
| 4 | 76-A 자산 | ✅ 미참조 |
| 5 | PWA 설치 안내 모달 | ✅ 미변경 |
| 6 | DB 스키마 | ✅ 변경 0건 (RLS 정책 미변경) |
| 7 | 기존 T 토큰 | ✅ 미변경 |

## 3. 자가 검증 결과 (C1~C9)

| C# | 항목 | 결과 |
|---|---|---|
| C1 | 빌드 통과 | ✅ exit 0 / 38.85s |
| C2 | 자산 보존 7건 미변경 | ✅ |
| C3 | U11 진단 로그 일괄 제거 | ✅ `grep TRACK77-U11-DIAG src/` → **0건** |
| C4 | U12 변경 마커 박제 | ✅ `grep TRACK77-U12 src/` → **2건** (authStore.js:49, :146) |
| C5 | 옵션 A 논리 — 정상 응답 + 일치 | ✅ §7.1 §7.1-A 박제 |
| C6 | 옵션 A 논리 — 정상 응답 + 명시적 불일치 | ✅ §7.1-B 박제 |
| C7 | 옵션 A 논리 — error 또는 data null | ✅ §7.1-C 박제 (**기존 상태 유지** — 본 fix 핵심) |
| C8 | git push origin main 성공 | (커밋 후 보고) |
| C9 | Vercel 배포 Ready 확인 | (push 후 안내) |

## 4. 결정 게이트 자율 처리 내역

### G77-Q (U12): 옵션 A 적용 범위 = **`initialize()` worker 분기 + `revalidateWorkerToken()` 2곳 모두**
- **권고 근거**: 두 함수 모두 동일 일시 오류 패턴에 노출 (HydrationGate가 매 mount마다 revalidate 호출, App mount마다 initialize 호출). 한 곳만 fix 시 다른 트리거에서 동일 회귀 잔존
- **대안**: revalidate만 fix (initialize는 mount당 1회 → 영향 적다는 가정) — 거부. PWA reload (SW controllerchange) 시 initialize도 동일 환경 부담

### G77-R (U12): U11 진단 로그 7건 일괄 제거 = **G77-P 약속 이행**
- **권고 근거**: U11에서 `[TRACK77-U11-DIAG]` 임시 삽입 명시 + U12 fix 시 grep 일괄 제거 약속
- 검증: `grep TRACK77-U11-DIAG src/` 0건

### G77-S (U12): 변경 의도 주석 `[TRACK77-U12]` prefix 박제 = **2건 적용**
- authStore.js:49 (initialize) + authStore.js:146 (revalidate)
- 향후 grep 추적 + 다음 라운드 검수 시 변경 위치 즉시 식별 가능

### G77-T (U12): 빈 분기 보존 = **`else { set({ loading: false }) }` 유지**
- 세션 부재 + worker 아님(또는 token 없음) 정상 흐름 — loading false 처리 필수

## 5. 사용자 검증 시나리오

### 5.1 즉시 검증 (S1~S3)

| # | 시나리오 | 기대 |
|---|---|---|
| S1 | Vercel Ready 후 PWA 강제 새로고침 | 작업자 홈 정상 진입 (직전 세션 살아있다면 재로그인 강제 X) |
| S2 | 작업자 QR 로그인 → 정상 사용 | 기존 흐름 회귀 없음 (출퇴근 / QR 스캔 / 근태 / 휴가 등) |
| S3 | 콘솔 — `[TRACK77-U11-DIAG]` 로그 미출력 | 진단 로그 제거 확인 |

### 5.2 운영 모니터링 (1주일 내, S4~S6)

| # | 시나리오 | 기대 |
|---|---|---|
| S4 | 작업자 PWA 백그라운드 → 임의 시점 후 포그라운드 | **로그인 화면 비노출** (옵션 A 효과 — 본 fix 핵심) |
| S5 | 다른 디바이스에서 동일 작업자 QR 스캔 (device_token 갱신) | 기존 디바이스: 다음 정상 응답에서 무효화 → 로그인 화면 (정상 동작) |
| S6 | 작업자 비활성화 (관리자가 is_active=false) | 다음 정상 응답에서 무효화 → 로그인 화면 (정상 동작) |

### 5.3 재발 시 행동
옵션 A 적용 후에도 일정 시간 후 강제 로그아웃이 재현되면:
- 본 채팅방에 보고
- D1/D2/일시 오류 계열 외 다른 시나리오 (옵션 D Storage / 시나리오 G SW reload + race / 기타) 추가 진단 라운드 진입

## 6. 배포 / 푸시 상태

- 로컬 SHA: (커밋 후 보고)
- git push origin main: (커밋 후 실행 예정)
- 원격 검증: (push 후 보고)
- Vercel webhook: 자동 트리거 예상

## 7. 발견 사항

### 7.1 옵션 A 논리 검증 결과 (3개 케이스)

옵션 A 핵심 조건: `!error && data && (data.device_token !== workerToken || !data.is_active)` → 이 식이 true일 때만 무효화

#### 7.1-A. 정상 응답 + 일치 (정상 사용)
- `error = null`, `data = { device_token: <match>, is_active: true }`
- 평가: `!null && {data} && (false || false)` = `true && true && false` = **false**
- 결과: **무효화 X** (loading false 처리만) ✅
- 기대 동작: 정상 사용 시 무효화 없이 통과

#### 7.1-B. 정상 응답 + 명시적 불일치
- 케이스 ①: token 갱신 (`data.device_token !== workerToken`)
  - 평가: `!null && {data} && (true || false)` = `true && true && true` = **true**
  - 결과: **무효화 O** ✅
- 케이스 ②: is_active=false
  - 평가: `!null && {data} && (false || true)` = `true && true && true` = **true**
  - 결과: **무효화 O** ✅
- 기대 동작: 명시적 불일치만 무효화

#### 7.1-C. error 또는 data null (본 fix 핵심)
- 케이스 ③: error 발생 (`error = { code, message }`, data = null)
  - 평가: `!{error} && null && ...` = `false && ...` = **false**
  - 결과: **무효화 X** (기존 상태 유지) ✅
- 케이스 ④: data null만 (`error = null`, data = null)
  - 평가: `!null && null && ...` = `true && false && ...` = **false**
  - 결과: **무효화 X** (기존 상태 유지) ✅
- 기대 동작: 일시 오류 시 기존 인증 상태 보존 → **본 fix가 해결하는 핵심 시나리오**

#### 종합
- 케이스 ①②: 의도된 무효화 보존 ✅
- 케이스 ③④: 의도되지 않은 무효화 차단 ✅ (이전 버전 회귀 해소)

### 7.2 잔여 risk 박제

#### Risk 1: token 갱신 + 일시 오류 동시 발생 시 무효화 지연
- **시나리오**: 다른 디바이스에서 동일 worker QR 재발급 → device_token 갱신. 동시에 기존 디바이스에서 revalidate 호출 시 일시 네트워크 오류
- **현재 fix 동작**: error 시 무효화 X → 기존 디바이스가 갱신된 token 모르고 잠시 살아있음 (수 초 ~ 분)
- **자동 회복**: 다음 정상 응답에서 token 불일치 감지 → 정상 무효화
- **운영 영향**: 무시 가능 수준 (수 초 ~ 분 지연만 + worker는 1인 1디바이스 운영 가정)

#### Risk 2: 다른 시나리오 (옵션 D / SW race / 기타)
- **시나리오**: 만약 bug 원인이 D1/D2/일시 오류 계열이 아닌 다른 영역(Storage 소실 / SW reload + race / Zustand persist hydration 실패 등)이었으면 옵션 A로도 미해결
- **검증**: 운영 1주일 모니터링 — S4 시나리오 재현 빈도 추적
- **재발 시**: 추가 진단 라운드 (옵션 D / 시나리오 G 등)

### 7.3 U11 D4 (RLS 차단) 약화 박제

U11 진단 캡처 결과 사용자 보고:
- `employees_anon_qr_login` 정책 존재 — anon이 worker AND is_active=true row SELECT 가능
- D4 약화 → `TRACK77-AUTH-RLS-WORKER-001` BACKLOG 등록 **미진입**

### 7.4 U11 시나리오 F (logged-out 상태 박제) 처리

U11 Image 1 분석 결과:
- `hasCurrentUser: false, hasGrefAuth: true` — 직전 세션에서 무효화된 상태가 localStorage에 박제
- **옵션 A로 해결 가능**: 무효화 자체가 일시 오류로 발생했다면 향후 발생 빈도 ↓
- 현재 박제된 logged-out 상태는 사용자 재로그인 1회로 정상화

### 7.5 G77-P 약속 이행 검증

U11 G77-P: "U12 fix 시 `[TRACK77-U11-DIAG]` 로그 일괄 grep 제거"
- `grep -rn "TRACK77-U11-DIAG" src/` → **0건** ✅
- 약속 이행 완료

## 8. 다음 라운드 / 모니터링

### 8.1 운영 1주일 모니터링
- S4 시나리오 (백그라운드 → 포그라운드 후 강제 로그아웃) **재현 빈도 추적**
- 재현 0건 시 → 작업자 의견 1 클로징
- 재현 발생 시 → 추가 진단 라운드 (옵션 D / SW race / 기타)

### 8.2 BACKLOG 신규 후보 (보고서 §9)

| ID | 한 줄 |
|---|---|
| TRACK77-AUTH-RETRY-001 | revalidateWorkerToken 재시도 로직 (옵션 B 보강) — 옵션 A 후에도 재현 시 |
| TRACK77-AUTH-STORAGE-001 | Zustand persist storage 영속성 강화 (IndexedDB 검토) — 옵션 D, 시나리오 E 재발 시 |
| TRACK77-AUTH-DIAG-OPTIONAL-001 | 운영 환경 옵셔널 진단 로그 (localStorage debug 플래그) — 향후 재진단 라운드 빠르게 |

세 항목 모두 **현재 미등록 (재발 시 등록 검토)**. 본 라운드에서는 옵션 A 효과 검증이 우선.

## 9. 핵심 요약 (5줄)

1. U11 진단 결과 D4·E 약화, D1/D2 공동 1순위 → **옵션 A 선제 적용 완료**.
2. `initialize()` + `revalidateWorkerToken()` error 분기에서 무효화 제거 (-27 / +5 라인).
3. U11 진단 로그 7건 일괄 제거 (G77-P 약속 이행 ✅).
4. 자산 보존 7건 영향 0건. DB 변경 0건. 출퇴근 v2 + QR-CORE byte-identical.
5. 운영 1주일 모니터링 후 재발 미발생 시 작업자 의견 1 클로징.

---

**끝.**
