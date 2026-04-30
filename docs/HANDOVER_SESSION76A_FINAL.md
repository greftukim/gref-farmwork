# HANDOVER — 트랙 76-A 최종 (76-A-1 ~ 출퇴근 hot-fix v2 + 교훈 133~137 박제 + 클로저)

**날짜**: 2026-05-01
**담당**: Claude (claude-opus-4-7)
**마지막 커밋**: 본 클로저 커밋 (해시 채움 직후)
**커버 범위**: 트랙 76-A — 작업 보드 재설계 ~ 출퇴근 검증 hot-fix v2 + 메타 교훈 5건 박제 + 클로저
**기준 커밋**: `6a4e884` (출퇴근 hot-fix v2, 본 클로저 직전)

---

## 세션 전체 요약

| 서브세션 | 주요 작업 | 결과 |
|----------|-----------|------|
| 76-A-2 (DB) | zones 보강 + greenhouse_id FK + task_assignments 백필 361건 | ✅ |
| 76-A-1 v2 | UI 재설계: zone 분류 + 우선순위 제거 + 컬럼 4→3 | ✅ |
| 76-A-3a | AssignWorkersModal + WeekView + FocusList + View 토글 | ✅ G33 임시 비활성 |
| 76-A-3b | MCP 검증 SQL 3건 모두 통과 (사용자 행동) | ✅ |
| 76-A-3c | onSave 활성화 (G33 해제) — C1 작업 배정 충족 | ✅ |
| QR 발급 hot-fix | 옵션 3 (.maybeSingle + UI alert) | ✅ |
| QR 로그인 hot-fix | 분기 C+H 처리 (.maybeSingle 3건 + signOut 직렬화) | ✅ |
| HQ QR 이식 | HQEmployeesScreen에 QR 발급 패턴 차용 | ✅ |
| 출퇴근 hot-fix v2 | 옵션 (나) 인프라 우회 — WorkerHome 단일 통합 | ✅ |
| 클로저 | LESSONS 133~137 박제 + ATTENDANCE-WORKDAYS-001 등록 + HANDOVER 작성 | ✅ |

---

## 커밋 목록 (트랙 76-A 14건)

| 해시 | 트랙 | 내용 |
|------|------|------|
| `95f39f8` | 76-A 진입 | docs(backlog): RECON-VARIABLE-NAME-BIAS-001 메타 부채 등록 |
| `6071bfb` | 76-A-2 DB | zones 보강 + greenhouse_id FK + 자연 매핑 백필 |
| `5ea7f07` | 76-A-2 DB | task_assignments 조인 테이블 + dual-write |
| `c4b1df9` | 76-A-2 docs | BACKLOG 일괄 (resolved 4 + open 7) |
| `7854ff3` | 76-A-1 v2 | 작업 보드 카드 재설계 — zone 분류 + 우선순위 제거 |
| `f639ea7` | 76-A-1 v2 docs | BACKLOG 일괄 (resolved 3 + open 2) |
| `6cce107` | 76-A-3a 모달 | AssignWorkersModal 신설 (UI만, onSave 비활성) |
| `6eaea86` | 76-A-3a 뷰 | WeekView + FocusList + View 토글 |
| `67bcb1b` | 76-A-3a docs | BACKLOG 일괄 (resolved 3 + open 3) |
| `3e78f32` | 76-A-3c | 다중 배정 모달 onSave 활성화 (G33 해제) |
| `2939139` | QR 발급 hot-fix | issueDeviceToken 406 차단 + UI error 분기 alert (옵션 3) |
| `b27519b` | QR 로그인 hot-fix | QR 스캔 후 자동 로그인 회귀 수정 (분기 C+H) |
| `57da63f` | HQ QR 이식 | HQEmployeesScreen에 QR 발급 기능 이식 |
| `6a4e884` | 출퇴근 hot-fix v2 | GPS·시간대 검증 통합 (옵션 나 — 인프라 우회) |

---

## 세션별 주요 작업 상세

### 76-A 진입 (메타 부채 등록)

**커밋**: `95f39f8` — RECON-VARIABLE-NAME-BIAS-001

본 채팅방 시작 시점에서 변수명·파일명만 보고 "있다/없다" 단정하는 정찰 편향을 메타 부채로 등록. 이후 모든 정찰에서 페이지 전수 grep + 시그니처·데이터 흐름까지 검증하는 패턴 적용.

### 76-A-2 (DB 자산 신설)

**커밋**: `6071bfb` + `5ea7f07` + `c4b1df9`

**Pre-flight 발견**:
- zones 테이블이 A/B/C 3행만 존재, D동 누락
- greenhouse_id FK 부재 (동 → 온실 매핑 불가)
- 단일 `tasks.worker_id` (다중 배정 불가)

**처리**:
- D동 추가 (4행 완성)
- `zones.greenhouse_id` FK 신설 (zones.A→greenhouses.1cmp 자연 매핑)
- `task_assignments` 조인 테이블 신설 (task_id × worker_id × role)
- 기존 361건 tasks → primary 역할로 백필
- dual-write: tasks.worker_id (legacy) ↔ task_assignments (정식) 동시 갱신

**76-A-3b 검증 결과** (사용자 행동, 2026-04-30):
- SQL #1 zones FK 매핑 4행 ✅ (A→1cmp / B→2cmp / C→3cmp / D→4cmp)
- SQL #2 task_assignments 백필 정합 ✅ (361=361)
- SQL #3 dual-write primary 정합 ✅ (mismatch=0)

### 76-A-1 v2 (UI 재설계)

**커밋**: `7854ff3` + `f639ea7`

**변경**:
- TaskBoardPage 308→134줄 (56% 감축)
- TaskCard / TaskColumn / TaskFilters 컴포넌트 분리
- zone 분류 (A/B/C/D 동 색 매핑 단일 소스 — `src/lib/zoneColors.js`)
- 우선순위 뱃지·필터 제거 (디자인 채팅 결정 D10)
- 컬럼 4개 → 3개 (plan / progress / done)
- 인라인+T 토큰 패턴 일관 적용

### 76-A-3a (모달 + 뷰)

**커밋**: `6cce107` + `6eaea86` + `67bcb1b`

**신규 컴포넌트**:
- `AssignWorkersModal` — worker 검색 + 다중 선택 + primary 지정
- `WeekView` — 7일 컬럼, 월~일 기준, ?view= URL 보존
- `FocusList` — 2열 그리드, 디자인 §1 C-3
- View 토글 칩 (칸반/주간/집중)

**G33 안전 분기**: MCP 단절 가능성으로 onSave는 임시 alert만. `G33-MCP-DISCONNECT-GUARD: BEGIN/END` 마커로 활성화 위치 명시 → 76-A-3c에서 1줄 변경 활성화.

### 76-A-3c (G33 해제)

**커밋**: `3e78f32`

**변경**:
- G33 BEGIN/END 블록 → `await assignWorkers(modalTask.id, workerIds)` 호출 + try/catch
- `assignWorkers` 액션이 자체적으로 fetchTasks() 호출하므로 추가 fetch 불필요
- 헤더 주석에 76-A-3c 흔적 + 76-A-3b 검증 통과 근거 명시
- **운영 오픈 C1 (작업 배정) 충족 ✅**

### QR 발급 hot-fix (옵션 3)

**커밋**: `2939139`

**발견 경위**: 사용자 보고 "QR 버튼 누르면 아무 일도 안 일어남" + 콘솔 캡처 `PATCH employees 406`.

**원인**: `employeeStore.issueDeviceToken`의 `.single()` + RLS UPDATE 0행 영향 → PostgREST 406 + UI 핸들러 error 분기 부재 → 사용자 시점 무반응. 73-C 시점부터 latent bug.

**처리**:
- `.single()` → `.maybeSingle()` + 0행 명시 에러 (`code: 'RLS_BLOCKED'`)
- EmployeesPage.handleIssueQr / handleReissueQr에 error 분기 alert 추가

**부수 BACKLOG**:
- `EMPLOYEE-RLS-UPDATE-001` open (4 계정 시도 결과 후 결정)
- `FCM-PERMISSION-UX-001` open (별 트랙)

### QR 로그인 hot-fix (분기 C+H)

**커밋**: `b27519b`

**발견 경위**: 사용자 보고 "QR 찍어서 모바일로 작업자계정 진입했는데 계속 로그인 화면이 뜬다".

**원인 (분기 C+H 혼합)**:
- (C) authStore의 `loginWithDeviceToken`/`revalidateWorkerToken`/`initialize`가 모두 `.single()` 사용 → RLS 0행 시 406 + Promise reject → AuthCallbackPage `.then()`만 사용 → catch 부재로 silent
- (H) 동일 PWA에 잔존하던 관리자 세션이 worker 세션을 덮어쓰는 경쟁 (initialize의 supabase.auth.getSession() 비동기로 worker set을 덮어씀)

**처리**:
- authStore 3건 `.single()` → `.maybeSingle()` + error 분기
- AuthCallbackPage: `loginWithToken` 호출 전 `supabase.auth.signOut()` 추가 + `.then()` → async/await + try/catch + result.error 메시지 표시

### HQ QR 이식

**커밋**: `57da63f`

**발견 경위**: 박민식·김지현 hr_admin 계정에서 QR 발급 화면 부재 보고. 본 채팅방 정찰로 AdminLayout 라우팅 분기가 HQ 사용자를 별 화면(HQEmployeesScreen)으로 보내고 있음 확인 → 가설 폐기 후 G62 옵션 A 채택.

**처리**:
- HQEmployeesScreen에 EmployeesPage QR 패턴 그대로 이식
- import: QRCodeSVG / state: qrTarget·qrLoading / handler: handleIssueQr·handleReissueQr / UI: 액션 컬럼 +QR 버튼 + 발급 모달

**부수 BACKLOG**:
- `TASK-QR-HELPER-EXTRACT-001` open (운영 오픈 후 공용 컴포넌트 추출)

### 출퇴근 hot-fix v2 (옵션 나 — 인프라 우회)

**커밋**: `6a4e884`

**발견 경위**: 사용자 보고 "GPS 반경 무관 + 시간대 무관 출퇴근 처리됨".

**v1 정찰 정지 (Q3·Q6 본질 결함)**:
- Q3: `judgeAttendanceStatus`가 임계값 인자 없음 (1분 늦어도 'late') → 정책 G67(5분 후 지각) 적용 불가
- Q6: `locationStore`가 hardcoded 단일 좌표(부산LAB 35.0956/128.9746/200m)이며 운영 시드(35.08755/128.959102/500m)와 1.6km 차이 + branches 테이블 데이터 무시

**G71 옵션 (나) 채택**: WorkerHome 인프라 우회. 인프라 본체 변경 0건.

**처리**:
- `useGpsVerify`/`locationStore`/`judgeAttendanceStatus` 사용 0건 (의도적 우회)
- WorkerHome.jsx 단일 파일에 직접 통합:
  - 헬퍼 inline: `haversineDistance` / `getCurrentPosition` / `timeStrToTodayDate`
  - `verifyBranchAndGps`: branches 직접 SELECT + GPS 거리 계산
  - 출근 분기: GPS 검증 → 시간대 status(30분 전/5분 후) → checkIn(id, gps, status)
  - 퇴근 분기: GPS 검증 → 일찍 퇴근 confirm → checkOut(id, gps)

**정책 (G66·G67·G68 채택)**:
- 반경 외 → 차단 + alert "반경 밖입니다, ~m 떨어져 있습니다"
- 일찍 출근 30분 전부터 허용 / 5분 후부터 'late' 자동
- 일찍 퇴근 → confirm
- NULL 지점 (hadong/HQ/management/seedlab) → 자동 검증 스킵

**부수 BACKLOG**:
- `LOCATION-STORE-MULTI-BRANCH-001` open (G73 운영 후 별 트랙)
- `JUDGE-ATTENDANCE-THRESHOLD-001` open (G73 운영 후 별 트랙)
- `ATTENDANCE-BUTTON-RACE-001` open (G69 사용자 재현 시)

---

## 사용자 결정 게이트 누계 (G1~G76)

본 채팅방의 핵심 결정값:

| 게이트 | 결정 | 적용 트랙 |
|---|---|---|
| G33 | MCP 단절 시 onSave 임시 비활성 + 마커 명시 | 76-A-3a/c |
| G34·G46·G64 | 클로저 시 누적 교훈 일괄 박제 | 본 클로저 |
| G43 | QR 발급 옵션 3 (.maybeSingle + alert) | 2939139 |
| G44 | RLS 진단 동시 진행 | 2939139 |
| G45 | FCM 권한 BACKLOG 등록만 | 2939139 |
| G52 | hr_admin도 QR 발급 가능 (옵션 I) | 가설 폐기 후 G62로 환원 |
| G62 | HQ 화면 QR 이식 즉시 진행 (옵션 A) | 57da63f |
| G63 | 사용자 4 계정 시도·모바일 검증 병렬 | 사용자 행동 |
| G66 | 반경 외 차단 + alert | 6a4e884 |
| G67 | 30분 전 허용 / 5분 후 지각 / 일찍 퇴근 confirm | 6a4e884 |
| G68 | NULL 지점 자동 스킵 | 6a4e884 |
| G69 | 결함 #3 (race) 별 트랙 | ATTENDANCE-BUTTON-RACE-001 |
| G70 | 운영팀 사실 확인 → 코드 판단 | BranchSettingsPage 사후 조정 |
| G71 | 출퇴근 hot-fix 옵션 나 (인프라 우회) | 6a4e884 |
| G72 | 부채 BACKLOG 즉시 등록 | LOCATION-STORE / JUDGE-ATTENDANCE |
| G73 | 인프라 보강은 운영 후 별 트랙 | follow-up agent |
| G74 | follow-up agent 1주 후 등록 안내 | 본 클로저 §6 |
| G75 | ATTENDANCE-WORKDAYS-001 등록 | 본 클로저 |
| G76 | 클로저는 검증과 병렬 진행 가능 | 본 클로저 |

**결정권자 단일화 원칙 (교훈 130)**: 박민식·김민국 답변 대기 분류 영구 폐기. 본 채팅방의 모든 결정은 사용자 단일.

---

## 운영 오픈 카운트다운 (현 시점)

```
✅ C1 작업 배정     (76-A-3c, 3e78f32)
🔄 C2 출퇴근       (코드 작업 완료, 사용자 검증 대기)
   ✅ QR 발급 옵션 3                              2939139
   ✅ QR 로그인 회귀 (분기 C + H)                   b27519b
   ✅ HQ 화면 QR 이식                                57da63f
   ✅ 출퇴근 GPS·시간대 검증 (옵션 나)               6a4e884
   🔲 사용자 작업자 계정 실기기 검증 (시나리오 A~H)
   🔲 사용자 4 계정 QR 발급 시도 (조건부 RLS 결함)
   🔲 사용자 모바일 실기기 QR 스캔 검증
   🔲 (조건부) 결함 #3 race 별 트랙 (사용자 재현 시)
✅ C3 TBM           (트랙 D+E 14/14)
```

**판정**: 운영 오픈 코드 작업 종료. 사용자 검증 단계 진입.

---

## 사용자 검증 권고 (병렬 진행)

### 시나리오 A~H (출퇴근 — busan worker 권장)

- **A** 정상 출근 (반경 내 + 시간 정상) → status='working'
- **B** 지각 출근 (5분 후) → alert "지각으로 기록" + status='late'
- **C** 일찍 출근 차단 (30분 전 이전) → alert "출근 가능 시간이 아닙니다"
- **D** 반경 외 차단 → alert "반경 밖입니다, ~m 떨어져 있습니다"
- **E** 정상 퇴근
- **F** 일찍 퇴근 confirm
- **G** 반경 외 퇴근 차단
- **H** 정책 미설정 지점 worker → 검증 우회

### QR 4 계정 시도 (RLS 결함 자연 확정)

- 김현도 (farm_admin busan) → /admin/employees → 부산 worker QR
- 박민식 (hr_admin headquarters) → /admin/hq/employees → 임의 worker QR
- 김지현 (hr_admin management) → /admin/hq/employees → 임의 worker QR
- 김태우 (master seedlab) → /admin/hq/employees → 임의 worker QR

### 모바일 QR 스캔 (b27519b 분기 H 확정)

- 발급된 QR을 모바일 기기로 스캔 → `/auth?token=...` 진입 → 자동 로그인 → /worker

---

## 부채 BACKLOG (운영 후 별 트랙)

본 트랙에서 등록·미해소된 부채 종합:

| ID | 분류 | 우선순위 | 트리거 |
|---|---|---|---|
| `LOCATION-STORE-MULTI-BRANCH-001` | 인프라 부채 (G73) | M | 운영 1주 후 |
| `JUDGE-ATTENDANCE-THRESHOLD-001` | 인프라 부채 (G73) | M | 운영 1주 후 |
| `ATTENDANCE-WORKDAYS-001` | 운영 정책 (G75) | L | 비근무일 출근 발견 시 |
| `ATTENDANCE-BUTTON-RACE-001` | BUG (G69) | M | 사용자 재현 시 |
| `EMPLOYEE-RLS-UPDATE-001` | 보안/DB 부채 | M | 4 계정 시도 결과 |
| `FCM-PERMISSION-UX-001` | UX 부채 | L | 운영 후 검증 |
| `RLS-AUDIT-001` | 보안 부채 | L | 다지점 확장 시 |
| `TASK-WORKER-ID-DROP-001/002` | DB 정리 | L | dual-write 1주 안정 |
| `TASK-CMP-BRANCH-001` | 다지점 확장 | L | 진주 운영 |
| `ZONE-BRANCH-COLUMN-001` | 다지점 확장 | L | 같음 |
| `ZONE-D-NAME/CROP/METRICS-VERIFY-001` | 운영 진입 | S | D동 운영 진입 시 |
| `ZONE-CMP-MAPPING-VERIFY-001` | 같음 | S | 같음 |
| `TASK-QR-HELPER-EXTRACT-001` | 리팩터링 | L | 운영 오픈 후 |
| `TASK-ASSIGN-MODAL-DESIGN-001` | 디자인 후처리 | S | 디자인 채팅 |
| `RECON-VARIABLE-NAME-BIAS-001` | 메타 부채 | - | 정찰 패턴 (영구 적용) |

---

## follow-up agent (G74 채택)

본 클로저 시점에 LOCATION-STORE-MULTI-BRANCH-001 + JUDGE-ATTENDANCE-THRESHOLD-001 두 부채는 **운영 1주 후 자동 환원** 트리거 권고:

- **트리거**: 운영 오픈 + 7일 경과
- **동작**: 새 채팅방에서 두 인프라 부채 환원 트랙 진입
- **등록 방법**: 사용자가 `/schedule` 명령 또는 외부 캘린더로 1주 후 알림 설정 (코드는 자동 등록 불가)

운영 오픈 + 7일 시점에 사용자가 본 클로저 + HANDOVER + 두 BACKLOG 항목을 새 채팅방에 첨부하여 환원 트랙 시작.

---

## 신규 교훈 박제 (LESSONS_LEARNED.md 교훈 133~137)

본 클로저에서 5건 일괄 append (G34·G46·G64 채택):

| 번호 | 제목 | 적용 시점 |
|---|---|---|
| 133 | G33 안전 분기 패턴: 외부 의존 부재 시 write 비활성 + 활성화 마커 | 76-A-3a/c |
| 134 | Supabase RLS UPDATE/SELECT + .single() latent bug | QR 발급·로그인 hot-fix |
| 135 | PWA + Zustand persist + 다중 역할 인증 경쟁 조건 | QR 로그인 hot-fix |
| 136 | 사용자 답변으로 정찰 단축 위험 | HQ QR 이식 (가설 폐기) |
| 137 | 정찰 깊이: 시그니처 불일치는 표면 grep으로 안 보임 | 출퇴근 hot-fix v1→v2 |

---

## 다음 채팅방 입력 (사용자 검증 종료 후)

본 클로저 시점에서 다음 단계는:

1. **사용자 검증 (병렬 진행)**: 시나리오 A~H + 4 계정 QR + 모바일 QR 스캔
2. **검증 통과 시**: 운영 오픈 결정 (본 채팅방 또는 새 채팅방)
3. **운영 오픈 후 1주**: follow-up agent 트리거 → 인프라 부채 환원 트랙
4. **차후 채팅방**: 작업자 계정 수정 트랙 (또는 사용자 결정 트랙명)

새 채팅방 시작 시 첨부 권장:
- 본 HANDOVER (`docs/HANDOVER_SESSION76A_FINAL.md`)
- `docs/BACKLOG.md` 부채 BACKLOG 섹션
- `docs/LESSONS_LEARNED.md` 교훈 130~137

---

## 자산 보존 종합

| 자산 | 상태 |
|------|------|
| 76-A-2 DB 자산 (zones / FK / task_assignments) | ✅ 보존 |
| 76-A-1 v2 컴포넌트 (TaskCard / Column / Filters / zoneColors) | ✅ 보존 |
| 76-A-3a 컴포넌트 (AssignWorkersModal / WeekView / FocusList) | ✅ 보존 |
| QR hot-fix maybeSingle 4건 (employeeStore + authStore 3건) | ✅ 보존 |
| 출퇴근 v2 인라인 헬퍼 (WorkerHome.jsx) | ✅ 보존 |
| useGpsVerify / locationStore / judgeAttendanceStatus 인프라 | ✅ 변경 0 (운영 후 별 트랙 환원 예정) |
| RLS 정책 | ✅ 변경 0 |
| 시드 자산 | ✅ 변경 0 |
| `tasks.priority` / `tasks.worker_id` (legacy) | ✅ dual-write 보존 |

---

## 클로저 판정

- **판정**: GO
- **사유**: 76-A 트랙 14 커밋 모두 운영 오픈 직전 상태로 도달. 코드 작업 종료. 사용자 검증 단계 진입. 부채 BACKLOG 명시 + 교훈 5건 박제 + follow-up agent 1주 후 환원 안내 완료.
- **다음 단계 분기**:
  1. 사용자 검증 GO → 운영 오픈
  2. 사용자 검증 결함 발견 → 본 채팅방 또는 새 채팅방에서 조건부 hot-fix
  3. 운영 오픈 + 7일 → 인프라 부채 환원 트랙

---

**끝.**
