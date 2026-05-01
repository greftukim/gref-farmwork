# 트랙 77 U1 라운드 보고서

**작성일**: 2026-05-02
**기준 커밋**: `6183397` (U0 완료 시점)
**대상 파일**: `src/pages/worker/WorkerHome.jsx` (단일)
**산출**: track77-u1 단일 커밋 (예정)

---

## 1. 작업 결과

- 변경 파일: `src/pages/worker/WorkerHome.jsx` 1개
- 라인 통계: +168 / -188 (총 356 라인 영향)
- 시안 적용: `worker-screens-v2.jsx` ScreenHome 시각 구조 1:1 매핑
- 빌드: `npm run build` exit 0 / 30.64s / PWA precache 13 entries

## 2. 자산 보존 검증 (Sub-Agent 결과)

| # | 자산 | 검증 결과 | 비고 |
|---|---|---|---|
| 1 | 출퇴근 v2 인라인 함수 5종 | ✅ byte-identical | haversineDistance / getCurrentPosition / timeStrToTodayDate / verifyBranchAndGps / handlePunch |
| 2 | WorkerLayout (FCM/PWA) | ✅ 미변경 | git diff --stat 0건 |
| 3 | App.jsx (라우트) | ✅ 미변경 | |
| 4 | BottomNav | ✅ 미변경 | U4에서 처리 |
| 5 | primitives.jsx | ✅ 미변경 | T_worker는 U0a에서 추가 완료 |
| 6 | 76-A 자산 (components/task/**) | ✅ 미참조 | grep 0건 |
| 7 | DB 자산 | ✅ DB 변경 없음 | 코드만 변경 |

## 3. 시각 검증 결과 (C1~C9)

| C# | 항목 | 결과 |
|---|---|---|
| C1 | 빌드 통과 | ✅ exit 0 |
| C2 | 자산 보존 7건 검증 | ✅ |
| C3 | Q1 (4버튼 그리드 폐기) | ✅ `repeat(4, 1fr)` 0건, `QUICK_ACTION_ROUTES` 0건 |
| C4 | Q4 (알림 종 제거) | ✅ `icons.bell` 0건 (헤더) |
| C5 | Q16 (상태별 분기) | ✅ `isWorking` / `isDone` / `out` 분기 모두 존재 |
| C6 | T_worker 토큰 사용 | ✅ `T_worker as T` import |
| C7 | useNavigate 보존 (U0 산출물) | ✅ `onNavigate`/`onBack` prop 0건 |
| C8 | placeholder 주석 | ✅ `// TODO U4` 2건 (오늘의 작업 + 공지) |
| C9 | 사용자 검증 시나리오 (§4) | 사용자 확인 대기 |

## 4. 시안 매핑 적용 사항

- **헤더**: `linear-gradient(T.gradientFrom → T.gradientTo)` 그라디언트 + 아바타(반투명 흰색 인라인) + 인사말 + 이름 + 날짜 + 큰 시계(`HH:MM` ui-monospace 40px). 알림 종 제거 (Q4).
- **출퇴근 카드** (Q16):
  - `state === 'in'` (출근 중): 큰 초록 점 boxShadow + "출근 중" + `08:32 출근` 표시 + `퇴근하기` (T.primary, 52px) + `연장근무 신청` (T.infoSoft, 44px, U1 비활성)
  - `state === 'done'` (퇴근 완료): 보라 점 + "퇴근 완료" + 출근/퇴근 시각 grid + 근무 시간 (기존 자산 보존, 시안 외 분기)
  - `state === 'out'` (출근 전): 회색 점 + "출근 전" + `오늘 근무 HH:MM 시작` + `출근하기` 그라디언트 (52px, T.shadowMd)
- **QR 스캔 CTA**: 56px 그라디언트 풀 폭 버튼, `useNavigate('/worker/m/qr-scan')`. Q1 결정 — 4버튼 그리드 단독 진입점화.
- **오늘의 작업 미니카드**: 단일 카드 (accent T.warning), 실데이터 (`useTaskStore`) 첫 항목 + 추가 건수 표시. `// TODO U4: task_assignments 연동` 주석.
- **공지 미니카드**: 단일 카드, 실데이터 (`useNoticeStore`) 첫 항목 + 추가 건수. `// TODO U4: notices 연동` 주석.

## 5. 사용자 검증 시나리오 (안내)

1. `/worker` 진입 → 그라디언트 헤더 + 출퇴근 카드(상태 자동 분기) + QR CTA + 오늘의 작업 + 공지 표시 확인
2. 헤더 우상단 알림 종 **없음** 확인 (Q4)
3. 출근 전 상태에서 `출근하기` 클릭 → 기존 GPS 검증 + 시간대 검증 동작 (handlePunch v2 보존)
4. 출근 후 화면: "출근 중" + 출근 시각 + `퇴근하기` + `연장근무 신청` 표시 (연장근무는 비활성, U3에서 활성화)
5. `퇴근하기` 클릭 → 기존 일찍 퇴근 confirm 동작
6. 퇴근 후: "퇴근 완료" + 출근/퇴근 시각 grid + 근무 시간
7. `QR 스캔하기` 클릭 → `/worker/m/qr-scan` 이동 (U2에서 시각 재설계)
8. `오늘의 작업` 미니카드 클릭 → `/worker/tasks` 이동
9. `공지` 미니카드 클릭 → `/worker/notices` 이동
10. **4버튼 그리드 없음** 확인 (Q1)

## 6. 변경된 의도적 비대칭

- 시안 v2 SPEC은 'before'/'working' 두 상태만 정의. 코드는 'done' (퇴근 완료) 상태가 추가로 존재 → **기존 자산 보존**을 위해 'done' 분기 추가 (시각은 `T.primarySoft`/`T.primary` 톤). 시안 회귀 아님.
- 미니카드 placeholder는 SPEC상 하드코딩 권고였으나, 기존 실데이터 plumbing(`todayTasks`, `latestNotices`)을 보존하여 회귀 방지. 시각 구조는 v2와 동일, 데이터는 실시간. `// TODO U4` 주석으로 향후 시각/필드 보강 대상 표시.

## 7. 발견 사항 / 부수 이슈

- 미사용 import 정리: `Avatar`, `Dot` 제거 (인라인 div로 대체).
- `QUICK_ACTION_ROUTES` 변수 제거 (4버튼 그리드 폐기로 미사용).
- 30초 setInterval 유지 (시안의 1초 갱신은 디자인 의도 표현, 실제는 분 단위 시계 → 30초 충분).

## 8. 다음 라운드 진입 가능 여부

✅ **U2 진입 가능**.

U2 진입 시 결정 게이트 **G77-A** (카메라 권한 거부 시 다시 시도 동작: reload vs permissions 재요청)이 사용자 결정 필요.

---

**끝.**
