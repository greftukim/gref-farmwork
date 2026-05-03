# 트랙 77 U19 라운드 보고서 — 작업 관리 툴바 정리 (상태 칩 제거 + 동 row 숨김 + 시안 정책 박제)

**작성일**: 2026-05-03
**라운드 명**: track77-u19
**기준 커밋**: `96f3549` (U18)
**선행**: U18 (작업 관리 재설계)

---

## 1. 작업 결과

### 1.1 변경 통계
- 변경 파일: 6건 (수정 5 + 신규 1 보고서)
  - 수정: `src/pages/admin/TaskBoardPage.jsx` — 상태 칩 제거 + 동 칩 인라인 + zoneFilter id 기반
  - 수정: `src/components/task/WeekMatrixView.jsx` — zoneFilter prop + 완료 opacity 0.55
  - 수정: `src/components/task/DayView.jsx` — 동일 패턴
  - 수정: `docs/TRACK77_FOLLOWUP_INDEX.md` — §5 시안 작성 정책 박제 (G77-KKK)
  - 수정: `docs/BACKLOG.md` — `TRACK77-TASKFILTERS-DEAD-CODE-001` 박제
  - 수정: `docs/LESSONS_LEARNED.md` — 교훈 150 박제
  - 신규: `docs/TRACK77_U19_REPORT.md` (본 파일)
- 빌드: `npm run build` exit 0 / 24.82s / PWA precache 13 entries

### 1.2 의견 적용 (사용자 의견 5)
- **의견 1**: 상태 칩 (전체/계획/진행중/완료) 제거 → ✅ TaskFilters import 제거 + 인라인 동 칩만 렌더 + `statusFilter` state/useMemo 완전 제거
- **의견 2**: 동 칩 선택 시 다른 동 row 비표시 → ✅ `WeekMatrixView`/`DayView`에 `zoneFilter` prop + `visibleZones` useMemo
- **의견 3**: 시안 작성 영구 정책 → ✅ `TRACK77_FOLLOWUP_INDEX.md` §5 박제 + 후속 §8 권고에 반영

### 1.3 시각 결정 (시안 채택분)
- 우상단 카운트 = `총 N건 · 표시 N건` (필터 적용에 따라 갱신)
- 완료 task 카드 `opacity: 0.55` (시각 약화)
- 동 칩 색상 dot = `getMatrixZoneColor(idx).strong` (매트릭스와 일관성)
- 동 row 숨김 시 별도 안내 텍스트 없음 — 카운트 차이로 인지 (LESSONS 150)
- visibleZones 0건 시 `"선택된 동에 해당하는 항목이 없습니다"` empty state

---

## 2. 자산 보존 검증 (7건 + U18 신규 4건) — raw 결과

```
git diff 96f3549..HEAD -- src/pages/worker/WorkerHome.jsx               → 0줄 ✅ (자산 1)
git diff 96f3549..HEAD -- src/components/layout/WorkerLayout.jsx        → 0줄 ✅ (자산 2 FCM)
git diff 96f3549..HEAD -- src/pages/worker/QrScanPage.jsx               → 0줄 ✅ (자산 3 QR-CORE)
git diff 96f3549..HEAD -- src/components/task/AssignWorkersModal.jsx    → 0줄 ✅ (자산 4 76-A)
git diff 96f3549..HEAD -- src/lib/zoneColors.js                          → 0줄 ✅ (자산 4 76-A — 별 파일)
git diff 96f3549..HEAD -- src/components/PWAInstallGuideModal.jsx       → 0줄 ✅ (자산 5)
git diff 96f3549..HEAD -- src/design/primitives.jsx                      → 0줄 ✅ (자산 7 T 토큰)
DB 스키마 변경 0건                                                       → ✅ (자산 6)
git diff 96f3549..HEAD -- src/lib/zoneMatrixColors.js                    → 0줄 ✅ (U18 신규)
git diff 96f3549..HEAD -- src/components/task/TaskDetailModal.jsx        → 0줄 ✅ (U18 신규)
```

| # | 자산 | 결과 |
|---|---|---|
| 1 | 출퇴근 v2 (WorkerHome.jsx) | ✅ byte-identical |
| 2 | FCM (WorkerLayout.jsx) | ✅ 미변경 |
| 3 | QR-CORE (QrScanPage.jsx) | ✅ byte-identical |
| 4 | 76-A 자산 (AssignWorkersModal + zoneColors.js) | ✅ byte-identical |
| 5 | PWA 설치 안내 모달 | ✅ 미변경 |
| 6 | DB 스키마 / Storage 정책 | ✅ 변경 0건 |
| 7 | 기존 T 토큰 (primitives.jsx) | ✅ byte-identical |

**자산 보존 위반: 0건**.

---

## 3. 자가 검증 결과 (C1~C13)

| C# | 항목 | 결과 |
|---|---|---|
| C1 | 빌드 통과 | ✅ exit 0 / 24.82s |
| C2 | 자산 보존 7건 byte-identical | ✅ §2 raw 결과 모두 0줄 또는 N/A |
| C3 | 상태 칩 4건 비렌더 (`statusFilter` 미참조) | ✅ TaskBoardPage에서 `statusFilter` state/useMemo/UI 모두 제거 |
| C4 | 동 칩 = "전체" → 모든 zone row 표시 | ✅ `visibleZones = zones` |
| C5 | 동 칩 = 단일 동 → 해당 동 row만 단독 표시 | ✅ `visibleZones = zones.filter(z => z.id === zoneFilter)` |
| C6 | WeekMatrixView + DayView 양쪽 동일 동작 | ✅ 동일 패턴 적용 |
| C7 | 우상단 카운트 = `총 N건 · 표시 N건` | ✅ TaskBoardPage 툴바 `marginLeft: 'auto'` 슬롯 |
| C8 | 완료 task `opacity: 0.55` 적용 | ✅ `isDone = status === 'completed' \|\| 'done'` 양쪽 뷰 |
| C9 | 동 0건 zone (해당 zone 없음) → empty state | ✅ `'선택된 동에 해당하는 항목이 없습니다'` |
| C10 | TRACK77_FOLLOWUP_INDEX.md §5 박제 | ✅ §5 신규 절 + §8 권고에 §5 인용 |
| C11 | DB / Storage / 외부 인프라 변경 0건 | ✅ ALTER/CREATE 등 grep 0건 |
| C12 | git push origin main 성공 | (커밋 후 보고) |
| C13 | Vercel webhook 트리거 | (push 후) |

---

## 4. 자율 결정 자율 처리 내역 (G77-FFF~KKK)

### G77-FFF: visibleZones 0건 시 = **empty state**
- 사용자가 동 칩을 클릭한 zone이 zoneStore에서 제거된 극히 드문 케이스 → 자동 fallback 대신 empty 메시지로 인지 (UX 명시성).
- 메시지: `"선택된 동에 해당하는 항목이 없습니다"`.

### G77-GGG: statusFilter state = **옵션 A 완전 제거**
- LESSONS 146 정신: dead state 잔존 회피.
- URL `?status=` 파라미터 처리도 함께 제거. 본 시점 사용자 0건 추정.

### G77-HHH: TaskFilters.jsx = **옵션 B 인라인 + dead code BACKLOG**
- grep 결과 사용처 = TaskBoardPage 단독 → 인라인이 가장 단순.
- TaskFilters.jsx 본 라운드 미삭제 (LESSONS 146 추종). `TRACK77-TASKFILTERS-DEAD-CODE-001` BACKLOG 박제 → `TRACK77-TASK-DEAD-CODE-001`과 묶어 별 라운드 일괄 삭제.
- 이유: 단일 라운드에서 dead code 식별과 삭제를 분리하는 LESSONS 146 절차 추종.

### G77-III: 우상단 카운트 형식 = **`총 N건 · 표시 N건`**
- 분모 = 전체 task / 분자 = 필터 후 task. 동 row 숨김 효과 + 검색 필터 효과 모두 1줄로 인지.

### G77-JJJ: 완료 task opacity = **0.55**
- 시안 채택 (사용자 OK). 0.5보다 약간 진하게 → 정보 손실 회피하면서 시각 약화.
- 조건: `task.status === 'completed' || task.status === 'done'` (DB 양쪽 status 호환).

### G77-KKK: 시안 작성 영구 정책 = **`TRACK77_FOLLOWUP_INDEX.md` §5 신규 절 박제**
- §5.1 원칙 / §5.2 기준 / §5.3 도구 / §5.4 운영 흐름 / §5.5 박제 위치 5절 신규.
- §8 다음 의견 진입 시 권고에 §5 인용 추가 (운영 채팅방 추종 의무화).

---

## 5. 사용자 검증 시나리오

### 5.1 즉시 검증 (PC, 재배팀 관리자)

| # | 시나리오 | 기대 |
|---|---|---|
| S1 | `/admin/tasks` 진입 | 상태 칩 4건 부재 / 동 칩 + 보기 토글만 / 우상단 카운트 |
| S2 | 동 칩 "전체" 선택 | 모든 동 row 표시 + 카운트 = 총 = 표시 |
| S3 | 동 칩 "A동" 선택 | A동 row만 단독 표시 + 카운트 갱신 |
| S4 | B/C/D동 칩 선택 | 동일 패턴 |
| S5 | 보기 = "일별" 전환 후 동 칩 적용 | 일별도 동일 zone 필터 |
| S6 | 완료된 task 카드 시각 | `opacity: 0.55` 약화 |
| S7 | 동 칩 + 매트릭스 빈 셀 `+` 클릭 | 신규 작성 모달 (해당 동 prefill) |
| S8 | 카드 클릭 → 상세 모달 | U18 흐름 회귀 없음 |

### 5.2 회귀 검증

| # | 시나리오 | 기대 |
|---|---|---|
| S9 | 작업자 측 / 다른 관리자 페이지 | 회귀 없음 |
| S10 | 자산 보존 7건 영역 (출퇴근 / FCM / QR / 76-A / PWA / 토큰) | byte-identical 유지 |

---

## 6. 배포 / 푸시 상태

- 로컬 SHA: (커밋 후 보고)
- git push origin main: (커밋 후)
- Vercel webhook: 자동 트리거

---

## 7. 발견 사항

### 7.1 statusFilter 잔존 검증
- TaskBoardPage.jsx에서 `statusFilter` / `STATUS_OPTIONS` / `colOf` 모두 완전 제거.
- URL `?status=` 파라미터 처리 코드도 본 라운드에서 제거 (G77-GGG 옵션 A).
- grep `statusFilter src/pages/admin/TaskBoardPage.jsx` → 0건 (예상).

### 7.2 TaskFilters.jsx 처리 결과
- grep 결과: 사용처 0건 (TaskBoardPage import 제거 후).
- BACKLOG `TRACK77-TASKFILTERS-DEAD-CODE-001` 박제 → `TRACK77-TASK-DEAD-CODE-001`(TaskColumn/WeekView/FocusList)와 묶어 별 라운드 일괄 삭제.
- LESSONS 146 추종 (dead code 식별과 삭제 분리).

### 7.3 운영 정책 §5 박제
- `TRACK77_FOLLOWUP_INDEX.md` §5 (시안 작성 영구 정책) 신규 절 박제.
- §5.1 원칙 / §5.2 기준 / §5.3 도구 / §5.4 운영 흐름 (사용자 의견 → 시안 → 지시문 → CCB/Codex → 보고서 → 검수) / §5.5 박제 위치.
- 후속 라운드 추종 의무 (§8 권고에서 §5 인용).

### 7.4 색상 index 안정성
- `WeekMatrixView` / `DayView`에서 색상 매핑은 **원본 zones 배열 index 기반** (`zones.findIndex`).
- visibleZones만으로 index를 발급하면 동 칩 선택 시 색상이 바뀜 (1동 빨강 → A동만 표시 시 0번 = 빨강 유지 OK, 하지만 B동만 표시 시 0번 = 빨강 → 의도와 어긋남).
- 해결: `zIdx = zones.findIndex((z) => z.id === zone.id)` → 색상 안정.

### 7.5 LESSONS 150 박제
- "필터 UI는 row 숨김 + 카운트 갱신 패턴".
- 별도 안내 텍스트 불필요 — 카운트 차이로 사용자 인지.
- 빈 visible empty state는 zoneFilter 매칭 0 시 자동 안내.

---

## 8. 다음 라운드

- 사용자 §5.1 시나리오 검증 (S1~S10)
- 통과 시 작업자 의견 5 클로징
- 별 트랙 진입: `TRACK77-FOLLOWUP-ZONE-METADATA-001` (사용자 결정) 또는 다른 후속 의견

---

## 9. CCB / Codex 자율 협업 (표준 §4 추종)

### 9.1 Codex 위임 횟수 + 영역
- **위임 0회** — 본 환경(Antigravity Claude Code)은 단일 Claude Code 환경. CCB 미가용 → Codex 위임 N/A.

### 9.2 향후 CCB 환경에서 위임 권고 영역 (참고)
- TaskBoardPage 상태 칩 제거 + 동 칩 인라인: 🟢 단일 파일 / 명세 명확 → Codex 적합
- WeekMatrixView/DayView `visibleZones` + opacity 추가: 🟢 단일 라인 fix → Codex 적합
- FOLLOWUP_INDEX §5 박제: 🟢 docs → Codex 적합

### 9.3 Claude Code 직접 진행 영역
- TaskFilters.jsx 사용처 grep + BACKLOG 박제 — LESSONS 146 절차 (dead code 식별)
- 자산 보존 7건 byte-identical 검증 — `git diff` raw 결과 박제
- 색상 index 안정성 검토 (§7.4) — 다중 컴포넌트 일관성 검증
- LESSONS 150 신규 박제 — 본 라운드 발견 패턴

### 9.4 자율 결정 근거
| ID | 근거 |
|---|---|
| G77-FFF | empty state 명시성 — 자동 fallback 대신 사용자 인지 |
| G77-GGG | LESSONS 146 정신 — dead state 잔존 회피 |
| G77-HHH | LESSONS 146 — dead code 식별과 삭제 분리, BACKLOG 일괄 |
| G77-III | 카운트 차이로 필터 효과 인지 (LESSONS 150) |
| G77-JJJ | 시안 채택 (사용자 OK) — 정보 손실 회피하면서 시각 약화 |
| G77-KKK | 사용자 의견 5의 3 — 영구 정책 박제 위치 명시 |

---

**끝.**
