# 트랙 77 라운드 1 (U0 인프라) 보고서

**작성일**: 2026-05-01
**기준 커밋**: `6a4e884` (작업 시작 시점 main HEAD)
**대상 라운드**: U0 — T_worker 신설 + 7개 페이지 useNavigate 변환
**다음 라운드**: U1 (WorkerHome 재설계)

---

## 1. 작업 1 — T_worker 토큰

### 1.1 변경 위치
[src/design/primitives.jsx](src/design/primitives.jsx) — 기존 T 객체(line 7-30) 직후에 T_worker 객체 신설.

### 1.2 추가된 export
```
export { T, T_worker, Card, Pill, Dot, Icon, icons, Avatar, Sidebar, TopBar, btnPrimary, btnSecondary, btnGhostStyle };
```
T_worker 위치는 T 직후. 기존 export 항목 순서·이름 변경 0.

### 1.3 추가된 토큰 항목 (지시문 §3.3 박제)
- 표면: bg, surface, surfaceAlt, border, borderSoft
- 텍스트: text, muted, mutedSoft
- 브랜드: primary, primaryDark, primarySoft, primaryText
- 상태: success/successSoft, warning/warningSoft, danger/dangerSoft, info/infoSoft
- 의미 별칭: holidayText, holidaySoft, saturdayText
- 그라데이션: gradientFrom, gradientTo
- 그림자: shadowSm, shadowMd, shadowLg

### 1.4 기존 T 변경 0 검증
`git diff src/design/primitives.jsx` 결과: T 객체 본문(line 7-30) 변경 라인 0. T_worker 추가 47라인 + export 1라인 변경(named export 추가).

---

## 2. 작업 2 — useNavigate 변환

### 2.1 페이지별 변환 사실

| # | 페이지 | 제거된 prop | 추가된 import/hook | 변환된 호출 수 |
|---|---|---|---|---|
| 1 | [WorkerHome.jsx](src/pages/worker/WorkerHome.jsx) | `{ onNavigate }` | (이미 있음) | 4건 (notice 종 / 4버튼 그리드 / 전체 보기 / 공지 전체) |
| 2 | [WorkerTasksPage.jsx](src/pages/worker/WorkerTasksPage.jsx) | `{ onNavigate }` | `useNavigate` import + hook | 1건 (뒤로가기) |
| 3 | [WorkerAttendancePage.jsx](src/pages/worker/WorkerAttendancePage.jsx) | `{ onNavigate }` | `useNavigate` import + hook | 1건 (뒤로가기) |
| 4 | [WorkerLeavePage.jsx](src/pages/worker/WorkerLeavePage.jsx) | `{ onBack }` | `useNavigate` import + hook | 1건 (뒤로가기) |
| 5 | [WorkerNoticePage.jsx](src/pages/worker/WorkerNoticePage.jsx) | `{ onBack }` | `useNavigate` import + hook | 1건 (뒤로가기) |
| 6 | [IssuePage.jsx](src/pages/worker/IssuePage.jsx) | `{ onBack }` | `useNavigate` import + hook | 1건 (뒤로가기) |
| 7 | [EmergencyCallPage.jsx](src/pages/worker/EmergencyCallPage.jsx) | `{ onBack }` | `useNavigate` import + hook | 1건 (뒤로가기) |

총 **7개 페이지 / 10건의 onClick 변환**.

### 2.2 변환된 라우트 매핑 (지시문 §4.4 대조)

| 출처 페이지 | 원래 호출 | 변환 후 |
|---|---|---|
| WorkerHome 알림 종 | `onNavigate?.('notice')` | `navigate('/worker/notices')` |
| WorkerHome 4버튼 (tasks) | `onNavigate?.('tasks')` | `navigate('/worker/tasks')` (QUICK_ACTION_ROUTES 매핑) |
| WorkerHome 4버튼 (attendance) | `onNavigate?.('attendance')` | `navigate('/worker/attendance')` |
| WorkerHome 4버튼 (leave) | `onNavigate?.('leave')` | `navigate('/worker/leave')` |
| WorkerHome 4버튼 (overtime) | `onNavigate?.('overtime')` | **무동작 보존** (라우트 부재 — U3 모달 진입 예정. QUICK_ACTION_ROUTES에 미포함, `if (r) navigate(r)` 가드) |
| WorkerHome '전체 보기' | `onNavigate?.('tasks')` | `navigate('/worker/tasks')` |
| WorkerHome '공지 전체' | `onNavigate?.('notice')` | `navigate('/worker/notices')` |
| WorkerTasksPage 뒤로 | `onNavigate?.('home')` | `navigate('/worker')` |
| WorkerAttendancePage 뒤로 | `onNavigate?.('home')` | `navigate('/worker')` |
| WorkerLeavePage 뒤로 | `onBack` | `navigate(-1)` |
| WorkerNoticePage 뒤로 | `onBack` | `navigate(-1)` |
| IssuePage 뒤로 | `onBack` | `navigate(-1)` |
| EmergencyCallPage 뒤로 | `onBack` | `navigate(-1)` |

판단 기준: `onNavigate?.('home')` 명시 의도 → `navigate('/worker')`. `onBack` 일반 의도 → `navigate(-1)` (브라우저 기본).

### 2.3 잔존 onNavigate/onBack grep 결과
```
src/pages/worker/WorkerHome.jsx:66: // 트랙 77 U0: onNavigate prop → useNavigate 일괄 변환 (Router prop 미전달 결함 해소)
```
유일한 잔존은 변환 사유를 기록한 **주석 1건**. 코드 내 prop 시그니처·핸들러 호출 0건 (지시문 C3 통과).

---

## 3. 자산 보존 검증 (지시문 §5)

| # | 자산 | 검증 | 결과 |
|---|---|---|---|
| 1 | 출퇴근 v2 (WorkerHome.jsx:25-204 인라인 함수) | `git diff WorkerHome.jsx` 변경 라인이 시그니처/onClick 변환만, handlePunch / verifyBranchAndGps / haversineDistance / getCurrentPosition / timeStrToTodayDate 본문 미변경 | ✅ |
| 2 | FCM 시스템 (WorkerLayout.jsx:39-66) | `git status` WorkerLayout.jsx 미변경 | ✅ |
| 3 | QR 핵심 흐름 (QrScanPage.jsx) | `git status` QrScanPage.jsx 미변경 (이미 useNavigate 사용) | ✅ |
| 4 | 76-A 자산 (src/components/task/**) | `git status src/components/task` 미변경 | ✅ |
| 5 | 시드 자산 DB | DB 변경 0 (본 라운드 SQL 미실행) | ✅ |
| 6 | 기존 T 토큰 (primitives.jsx) | `git diff` T 객체 본문 라인 변경 0 | ✅ |
| 7 | PWA 모달 (WorkerLayout.jsx:24-37) | `git status` WorkerLayout.jsx 미변경 | ✅ |

추가 보존 영역:
- App.jsx — 미변경 (지시문 §4.7 대로 라우트 변경 본 라운드 비대상)
- 관리자 페이지 (src/pages/admin/**) — 미변경
- BottomNav / TopBar / WorkerLayout — 미변경
- GrowthSurveyPage — 미변경 (이미 정상 패턴)

---

## 4. 회귀 검증

### 4.1 빌드 (지시문 6.1)
```
npm run build → built in 27.59s, exit 0
PWA v0.21.2 generateSW, precache 13 entries (3116.56 KiB)
```
✅ 통과. 청크 크기 경고는 사전 존재(본 변경 무관, code-splitting 권고는 별건).

### 4.2 라우팅 진입 시나리오 (지시문 6.2 — 빌드 산출물 기준)
빌드 통과 = 모든 페이지 컴파일 정상. 9 라우트 모두 빌드에 포함됨.

| # | 시나리오 | 비고 |
|---|---|---|
| 1 | `/worker` → WorkerHome | 빌드 OK |
| 2 | `/worker/tasks` → WorkerTasksPage | 빌드 OK |
| 3 | `/worker/attendance` → WorkerAttendancePage | 빌드 OK |
| 4 | `/worker/leave` → WorkerLeavePage | 빌드 OK |
| 5 | `/worker/notices` → WorkerNoticePage | 빌드 OK |
| 6 | `/worker/m/qr-scan` → QrScanPage | 변환 비대상 |
| 7 | `/worker/survey` → GrowthSurveyPage | 변환 비대상 |
| 8 | `/worker/issues` → IssuePage | 빌드 OK |
| 9 | `/worker/emergency` → EmergencyCallPage | 빌드 OK |

런타임 검증은 사용자 실기기 시나리오(§6)에서 확정.

### 4.3 시각 회귀 (지시문 6.5)
T_worker 사용처 0 (U1~U5에서 사용 예정) → 시각 변경 0 기대. 본 라운드 변경은 모두 prop/import/onClick 핸들러로 시각 영향 없음.

---

## 5. 자가 검증 (지시문 §7)

| C# | 검증 | 결과 |
|---|---|---|
| C1 | T_worker 토큰 신설 + named export | ✅ §1.1, §1.2 |
| C2 | 기존 T 토큰 변경 0 | ✅ §1.4 (T 본문 라인 변경 0 git diff 확인) |
| C3 | 7개 페이지 onNavigate/onBack 변환 | ✅ §2.3 (잔존 1건은 주석) |
| C4 | navigate 경로가 §4.4 표와 일치 | ✅ §2.2 |
| C5 | 자산 보존 영역 변경 0 | ✅ §3 (7건 모두 ✅) |
| C6 | 빌드 통과 | ✅ §4.1 |
| C7 | 라우팅 시나리오 9건 (빌드 기준) | ✅ §4.2 (런타임은 §6에서) |
| C8 | 회귀 시나리오 6건 | 빌드 통과로 정적 검증. 런타임은 §6 |
| C9 | 라우팅 동작 시나리오 | 코드상 정상. 런타임은 §6 |
| C10 | 시각 회귀 0 | ✅ §4.3 |

C1~C10 모두 정적 통과. C7~C9의 동적 검증은 사용자 실기기 시나리오(§6)에서 확정.

---

## 6. 사용자 검증 시나리오 (Claude Code 보고 후 사용자 수행)

지시문 §9 8개 시나리오 그대로:

| # | 시나리오 | 기대 동작 |
|---|---|---|
| 1 | `/worker` 진입 | WorkerHome 정상 렌더 + 출근/퇴근 버튼 정상 작동 (출퇴근 v2 보존 확인) |
| 2 | WorkerHome 4버튼 클릭 | tasks/attendance/leave 각 경로 이동 / overtime 무동작 OK (U3 모달) |
| 3 | WorkerHome 알림 종 클릭 | `/worker/notices` 이동 (U1에서 종 제거 예정) |
| 4 | WorkerHome QR 스캔 카드 클릭 | `/worker/m/qr-scan` 이동 |
| 5 | 각 페이지 뒤로가기 클릭 | 이전 페이지 또는 홈 이동 |
| 6 | BottomNav 4탭 클릭 | 각 페이지 정상 이동 (변환 무관) |
| 7 | QR 스캔 (변환 비대상) | 정상 작동 (회귀 X) |
| 8 | 출근→퇴근 (출퇴근 v2 검증) | GPS·시간대 검증 정상 작동 (보존 확인) |

검증 결과 양식: `시나리오 #N: 통과 / 실패 — [실패 시 현상]`

8 시나리오 통과 → U0 완료 → U1 진입.
일부 실패 → U0 hot-fix 후 재검증.

---

## 7. 다음 라운드 (U1) 진입 가능 여부

**✅ 가능 (사용자 §6 실기기 검증 통과 가정)**

사유:
- 인프라 결함 해소: 모든 작업자 페이지에서 onClick 핸들러가 정상 동작 → U1 이후 시안 적용 시 라우팅 결함 누적 방지
- T_worker 신설로 U1~U5에서 작업자 디자인 격리 적용 가능 (관리자 영향 0)
- 자산 보존 영역 7건 모두 미변경 → 출퇴근 v2 / FCM / QR / 76-A / 시드 / 기존 T / PWA 모달 모두 안전

선조건: 사용자 §6 실기기 검증 통과 보고 수령 후 U1 진입.

---

## 8. 발견 사항 / 부수 이슈

### 8.1 WorkerHome.jsx의 useNavigate 사전 존재
WorkerHome.jsx는 이미 `import { useNavigate } from 'react-router-dom';`(line 5)와 `const navigate = useNavigate();`(line 67)를 보유. 이는 출퇴근 v2 핫픽스(커밋 `6a4e884`) 또는 그 이전 작업에서 QR CTA용으로 도입된 것으로 보임. 본 라운드는 import/hook 추가 없이 prop 시그니처 제거 + 4건 onNavigate 변환만 수행.

### 8.2 4버튼의 overtime 처리
지시문 §4.4 권고 "navigate 호출 추가하지 말고 onClick 비활성 또는 TODO 주석"을 반영하여 `QUICK_ACTION_ROUTES` 객체 매핑에서 overtime을 의도적으로 제외하고 `if (r) navigate(r)` 가드. overtime 버튼 클릭 시 무동작이 보장됨. U3 라운드에서 모달 진입 로직으로 교체 예정.

### 8.3 WorkerMorePage.jsx
지시문 §4.2에서 변환 대상 제외(5줄 리디렉트 컴포넌트). 본 라운드 변경 0.

### 8.4 GrowthSurveyPage.jsx
지시문 §4.2에서 변환 비대상. 이미 `useNavigate()` 직접 사용(정찰 §1)으로 정상 패턴. 본 라운드 변경 0.

### 8.5 CRLF 경고
git diff 시 `LF will be replaced by CRLF` 경고 발생. Windows 환경 표준 동작이며 본 변경의 정확성에 영향 없음.

### 8.6 onClick 회귀 분석
변환된 7페이지의 onClick은 이전에 모두 무동작(undefined prop 단락). 변환 후 모두 정상 동작 → **회귀 0건, 미작동 결함만 해소**. 시각 / 데이터 흐름 / 자산 영향 0.

---

## 9. 산출물

### 9.1 코드 변경 8개 파일
- src/design/primitives.jsx (T_worker 신설)
- src/pages/worker/WorkerHome.jsx
- src/pages/worker/WorkerTasksPage.jsx
- src/pages/worker/WorkerAttendancePage.jsx
- src/pages/worker/WorkerLeavePage.jsx
- src/pages/worker/WorkerNoticePage.jsx
- src/pages/worker/IssuePage.jsx
- src/pages/worker/EmergencyCallPage.jsx

총 +85 / -18 라인 (8개 파일).

### 9.2 커밋 (분리 권고 적용)
- `track77-u0a`: T_worker 토큰 신설 (primitives.jsx)
- `track77-u0b`: worker 7페이지 onNavigate→useNavigate 변환

분리 사유: 롤백 단위 명확. T_worker만 신설은 시각 영향 0이며 사용처 없으므로 단독 롤백 가능. 변환 7건도 단독 롤백 시 페이지별 회귀 없이 prop 시그니처 복원 가능.

### 9.3 보고서
본 파일: `docs/TRACK77_U0_REPORT.md`

---

**끝.**
