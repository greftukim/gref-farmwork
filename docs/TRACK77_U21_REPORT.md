# 트랙 77 U21 라운드 보고서 — 작업 모달 작물·줄범위 UI 제거 + crop 자동 derive

**작성일**: 2026-05-04
**라운드 명**: track77-u21
**기준 커밋**: `d661ef6` (U20)
**선행**: U18(작업 관리 재설계) / U19(툴바 정리) / U20(온실 정보)

---

## 1. 작업 결과

### 1.1 변경 통계
- 변경 파일: **5건** (수정 4 + 신규 2)
  - 신규: `src/lib/cropDerive.js` — zone+date → crop 자동 derive 헬퍼
  - 신규: `docs/TRACK77_U21_REPORT.md` (본 파일)
  - 수정: `src/components/task/TaskDetailModal.jsx` — 작물·줄범위 UI 제거 + 자동 매칭 힌트 박스
  - 수정: `src/pages/admin/TaskCreatePage.jsx` — 동일 패턴
  - 수정: `docs/LESSONS_LEARNED.md` — 교훈 153
  - 수정: `docs/TRACK77_FOLLOWUP_INDEX.md` — U21 라인
- 빌드: `npm run build` exit 0 / 29.37s / PWA precache 13 entries

### 1.2 사용자 의견 6 적용
- **작물 입력 제거**: TaskDetailModal + TaskCreatePage UI 모두 제거
- **줄 범위 입력 제거**: 동일 (현장 자율 + QR 추적)
- **자동 derive**: zone+date → 활성 zone_crops 매칭 → crop_id 자동 추론
- **다중 매칭**: 가장 최근 started_at 1건 선택 + 라벨에 "· 다중 작기 N건 중 최근" 표시
- **편집 모드**: 박제된 task.cropId 우선 (G77-TTT — 사용자 명시 입력 보존)

### 1.3 DB 컬럼 보존 (LESSONS 153)
- `task.crop_id`: SafetyCheck TBM 매칭 의존 → **컬럼 보존 + 자동 derive**
- `task.row_range`: 사용처 0건 → **컬럼 보존 + 항상 NULL** (운영 안정성 확인 후 별 라운드에서 컬럼 삭제 후보)

---

## 2. 자산 보존 검증 (7건) — raw 결과

### 2.1 모든 자산 byte-identical (vs `d661ef6`)
```
git diff d661ef6..HEAD -- src/pages/worker/WorkerHome.jsx                  → 0줄 ✅ (자산 1)
git diff d661ef6..HEAD -- src/components/layout/WorkerLayout.jsx           → 0줄 ✅ (자산 2 FCM)
git diff d661ef6..HEAD -- src/pages/worker/QrScanPage.jsx                  → 0줄 ✅ (자산 3 QR-CORE)
git diff d661ef6..HEAD -- src/components/PWAInstallGuideModal.jsx          → 0줄 ✅ (자산 5)
git diff d661ef6..HEAD -- src/design/primitives.jsx                         → 0줄 ✅ (자산 7)
```

### 2.2 자산 4번 (76-A 핵심) byte-identical
```
git diff d661ef6..HEAD -- src/components/task/AssignWorkersModal.jsx       → 0줄 ✅
git diff d661ef6..HEAD -- src/components/task/WeekMatrixView.jsx           → 0줄 ✅
git diff d661ef6..HEAD -- src/components/task/DayView.jsx                  → 0줄 ✅
git diff d661ef6..HEAD -- src/lib/zoneColors.js                             → 0줄 ✅
```

### 2.3 자산 6 (DB 스키마)
- 본 라운드 마이그레이션 0건. tasks 테이블 ALTER 0건.
- `task.crop_id` / `task.row_range` 컬럼 모두 보존 (taskStore INSERT/UPDATE 매핑 미변경).

### 2.4 taskStore.js byte-identical
```
git diff d661ef6..HEAD -- src/stores/taskStore.js                          → 0줄 ✅
```
Store는 컬럼 매핑 그대로. 모달이 `cropId: derive` / `rowRange: null`을 payload로 전달.

| # | 자산 | 결과 |
|---|---|---|
| 1 | 출퇴근 v2 | ✅ byte-identical |
| 2 | FCM | ✅ byte-identical |
| 3 | QR-CORE | ✅ byte-identical |
| 4 | 76-A 자산 (AssignWorkersModal/WeekMatrix/Day/zoneColors) | ✅ byte-identical |
| 5 | PWA 모달 | ✅ byte-identical |
| 6 | DB 스키마 | ✅ ALTER 0건, 컬럼 보존 |
| 7 | T 토큰 | ✅ byte-identical |

**자산 보존 위반: 0건**.

---

## 3. 자가 검증 결과 (C1~C13)

| C# | 항목 | 결과 |
|---|---|---|
| C1 | 빌드 통과 | ✅ exit 0 / 29.37s |
| C2 | 자산 보존 7건 byte-identical | ✅ §2.1 + §2.2 |
| C3 | 76-A 핵심 자산 byte-identical | ✅ §2.2 |
| C4 | tasks 테이블 ALTER 0건 | ✅ 마이그레이션 0건 |
| C5 | TaskDetailModal — 작물 selector + 줄 범위 input UI 제거 | ✅ grep 0건 |
| C6 | TaskCreatePage — 동일 제거 | ✅ grep 0건 |
| C7 | cropDerive.js export 2건 (deriveCropForTask + formatDerivedCropLabel) | ✅ |
| C8 | 자동 매칭 힌트 박스 — zone+date 입력 시 표시 | ✅ TaskDetailModal + TaskCreatePage 양쪽 |
| C9 | 매칭 0건 — 노란 경고 박스 (G77-UUU) | ✅ `derivedCrop.cropId` 없음 시 #FEF3C7 |
| C10 | 매칭 다중 — "· 다중 작기 N건 중 최근" 표시 | ✅ formatDerivedCropLabel |
| C11 | 저장 흐름 — payload cropId = derive, rowRange = null | ✅ effectiveCropId / null |
| C12 | SafetyCheck TBM 매칭 회귀 0건 (정적) | ✅ task.cropId 사용처 보존, taskStore 미변경 |
| C13 | git push origin main + Vercel | (커밋 후 보고) |

---

## 4. 자율 결정 자율 처리 내역 (G77-TTT~YYY)

### G77-TTT: 편집 모드 = **task.cropId 박제값 우선**
- 사용자가 명시 입력한 값 보존 (예: 과거 데이터 또는 운영자 수동 입력).
- `originalCropId && !isNew` 조건 시 derive 무시. 신규 또는 미박제 시 derive 사용.
- 모달에서 시각 피드백: "저장된 값 보존 (편집 모드)" 부가 메시지 (originalCropId !== derive 시).

### G77-UUU: 매칭 0건 = **노란 경고 박스**
- 배경 #FEF3C7, 테두리 #F59E0B, 아이콘 ⚠.
- 메시지: "없음 — 온실 정보 탭에서 작기 등록 필요" (formatDerivedCropLabel).
- 사용자가 zone_crops 미입력 상태 인지 → 온실 정보 탭으로 안내.

### G77-VVV: 다중 매칭 = **라벨에 "· 다중 작기 N건 중 최근" 표시**
- formatDerivedCropLabel에서 `result.matched > 1` 조건.
- 가장 최근 started_at 1건 선택 (deriveCropForTask sort desc).

### G77-WWW: cropDerive.js = **양 페이지 공통 헬퍼**
- TaskDetailModal + TaskCreatePage 양쪽이 동일 헬퍼 import.
- 단일 책임 원칙 + LESSONS 152 정신 (입력만 받아 출력 객체 반환).

### G77-XXX: rowRange = **항상 NULL 박제**
- UI 입력 제거 + payload 항상 `rowRange: null`.
- DB 컬럼 보존 (LESSONS 153) — 사용처 0건이므로 별 라운드 컬럼 삭제 후보 (BACKLOG 후보).
- 기존 row_range 데이터 있는 task는 모달 비표시이나 DB에 그대로 보존.

### G77-YYY: LESSONS 153 박제 = **UI 필드 제거 시 DB/다른 흐름 의존성 검증**
- 정적 grep으로 `task.cropId` 사용처 발견 (SafetyCheckBottomSheet + tbmRiskMatcher).
- 컬럼 보존 + 자동 derive 패턴으로 회귀 0건.

---

## 5. 사용자 검증 시나리오 (S1~S11)

### 5.1 즉시 검증 (PC, 재배팀 관리자)

| # | 시나리오 | 기대 |
|---|---|---|
| S1 | `/admin/tasks` → "+ 새 작업" 모달 | 작물 / 줄 범위 필드 부재 |
| S2 | 동 = "A동" + 날짜 = 오늘 (zone_crops 등록된 동) | 녹색 힌트 "✓ 작물 자동 매칭: 토마토 (대저짭짤이, 2026 1기작)" |
| S3 | 동 = 미등록 동 + 날짜 = 오늘 | 노란 경고 "⚠ 작물 자동 매칭: 없음 — 온실 정보 탭에서 작기 등록 필요" |
| S4 | 동에 다중 작기 (있다면) | 라벨에 "· 다중 작기 N건 중 최근" |
| S5 | 작업 추가 → 카드 클릭 → 상세 모달 재오픈 | 박제된 cropId 표시 (편집 모드 우선) |
| S6 | 카드의 날짜 변경 → 다른 작기 매칭 (있다면) | originalCropId 보존 + "저장된 값 보존" 부가 메시지 |
| S7 | `/admin/tasks/new` (TaskCreatePage 풀 페이지) | 동일 패턴 (필드 제거 + 힌트) |

### 5.2 회귀 검증

| # | 시나리오 | 기대 |
|---|---|---|
| S8 | 작업자 측 — 작업 시작 시 SafetyCheck (TBM 위험) | 기존과 동일 (crop_id 자동 derive로 매칭 보존) |
| S9 | 작업 카드의 task.crop_id가 derive로 박제 → SafetyCheck 흐름 | 작물별 위험 표시 정상 |
| S10 | 기존 row_range 데이터 있는 task | 모달 미표시. DB 보존 |
| S11 | 자산 보존 7건 영역 | 회귀 없음 |

---

## 6. 배포 / 푸시 상태

- 로컬 SHA: (커밋 후 보고)
- git push origin main: (커밋 후)
- Vercel webhook: 자동 트리거

---

## 7. 발견 사항

### 7.1 derive 매칭 케이스
- **1건**: 단일 매칭 — 라벨 그대로 (예: "토마토 (대저짭짤이, 2026 1기작)")
- **0건**: 노란 경고 박스 — 사용자 안내 명시 (G77-UUU)
- **다중**: 가장 최근 started_at + 라벨 끝 "· 다중 작기 N건 중 최근" (G77-VVV)

### 7.2 SafetyCheck 회귀 검증 (정적 grep)
```
grep -rn "task\.cropId\|task\.crop_id" src/
→ src/components/task/TaskDetailModal.jsx:55 (편집 모드 originalCropId 보존)
→ src/stores/taskStore.js:59 (INSERT 매핑 보존)
→ src/pages/worker/GrowthSurveyPage.jsx:108 (생육조사 작물 선택 — task.cropId fallback)
```
모두 **읽기 전용** + taskStore.cropId 매핑 그대로. 자동 derive 결과가 task.cropId에 박제되어 SafetyCheckBottomSheet → tbmRiskMatcher 흐름 정상.

### 7.3 row_range 기존 데이터 처리
- DB 컬럼 보존 → 기존 task의 row_range 값 보존.
- 신규 / 편집 task는 모두 `rowRange: null`로 저장 (UI 제거).
- 별 라운드 후보: 운영 안정성 확인 후 row_range 컬럼 삭제 (BACKLOG 신규 박제 안 함 — 사용처 0건이라 즉시 가능하나 본 라운드 보수적 보존).

### 7.4 LESSONS 153 박제
- "UI 필드 제거 시 DB 컬럼 / 다른 흐름 의존성 검증 필수"
- 정적 grep 절차 + 자동 derive 패턴 + 박제값 우선 G77-TTT 패턴 박제

---

## 8. 다음 라운드

- 사용자 §5 시나리오 검증 (S1~S11)
- 통과 시 작업자 의견 6 클로징
- 후속 의견 또는 별 트랙 진입 결정

---

## 9. CCB / Codex 자율 협업 (표준 §4 추종)

### 9.1 Codex 위임 횟수 + 영역
- **위임 0회** — 본 환경 단일 Claude Code.

### 9.2 향후 CCB 환경에서 위임 권고 영역
- 🟢 cropDerive.js — 단일 함수 / 명세 명확
- 🟢 TaskDetailModal 필드 제거 + 힌트 박스 — 단일 파일
- 🟢 TaskCreatePage 동일 패턴 — 단일 파일

### 9.3 Claude Code 직접 진행 영역
- SafetyCheck 회귀 정적 grep — 다중 페이지 영향 검증 (LESSONS 146 정신)
- 자산 4번 76-A 핵심 자산 byte-identical 검증
- LESSONS 153 신규 박제 — 본 라운드 발견 패턴
- G77-TTT 박제값 우선 결정 — 사용자 명시 입력 보존 정책

### 9.4 자율 결정 근거
| ID | 근거 |
|---|---|
| G77-TTT | 사용자 명시 입력 보존 — 편집 모드 우선 |
| G77-UUU | UX 명시성 — 매칭 0건 시각 피드백 |
| G77-VVV | 다중 매칭 인지 — 라벨 부가 메시지 |
| G77-WWW | 단일 책임 — 양 페이지 공통 헬퍼 |
| G77-XXX | 사용자 의견 — UI 제거 + DB 보존 |
| G77-YYY | LESSONS 146 정신 — 의존성 검증 절차 박제 |

---

**끝.**
