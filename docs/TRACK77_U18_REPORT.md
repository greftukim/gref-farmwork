# 트랙 77 U18 라운드 보고서 — 작업 관리 재설계 (칸반 제거 + 주간 매트릭스 + 일별 뷰)

**작성일**: 2026-05-03
**라운드 명**: track77-u18
**기준 커밋**: `9885f97` (U17 cleanup)
**선행**: U17(cleanup) ← TRACK77_FOLLOWUP_INDEX.md 추종

---

## 1. 작업 결과

### 1.1 변경 통계
- 변경 파일: 5건 (수정 1 + 신규 4)
  - 수정: `src/pages/admin/TaskBoardPage.jsx` — 재설계 (칸반 제거, week/day 토글)
  - 신규: `src/lib/zoneMatrixColors.js` — 시안 매트릭스 동별 색상 (G77-YY)
  - 신규: `src/components/task/WeekMatrixView.jsx` — 동(row) × 7일(column) 매트릭스
  - 신규: `src/components/task/DayView.jsx` — 동(row) × 작업카드 가로 flex
  - 신규: `src/components/task/TaskDetailModal.jsx` — 카드 클릭 → 상세 + 날짜 편집
- 빌드: `npm run build` exit 0 / 20.05s / PWA precache 13 entries

### 1.2 시안 적용 (운영 채팅방 합의)
- 칸반 완전 제거 (TaskColumn / 기존 WeekView / FocusList → dead code 후보, 별 라운드 삭제)
- 주간: 동(row) × 날짜(column) 매트릭스 + 동별 색상 (1동 빨강 / 2동 노랑 / 3동 초록 / 4동 파랑) + 빈 셀 `+`
- 일별: 동(row) × 작업카드(가로 flex) + 카드(상태 Pill + 작업명 + 작물 + 시간 + 배정자 아바타 + 진행률) + `+ 작업 추가`
- 카드 클릭 → TaskDetailModal (날짜 필드 편집 = 카드 이동 흐름)

## 2. 자산 보존 검증 (7건) — raw 결과

```
diff 9885f97..HEAD WorkerHome.jsx[23-212]            → 0줄 ✅ (자산 1)
diff 9885f97..HEAD WorkerLayout.jsx                   → 0줄 ✅ (자산 2 FCM)
diff 9885f97..HEAD QrScanPage.jsx[45-118]             → 0줄 ✅ (자산 3 QR-CORE)
diff 9885f97..HEAD AssignWorkersModal.jsx             → 0줄 ✅ (자산 4 76-A)
diff 9885f97..HEAD zoneColors.js                      → 0줄 ✅ (자산 4 76-A — G77-YY)
diff 9885f97..HEAD PWAInstallGuideModal.jsx           → 0줄 ✅ (자산 5)
DB 스키마 변경 0건                                    → ✅ (자산 6)
diff 9885f97..HEAD primitives.jsx                     → 0줄 ✅ (자산 7 T 토큰)
```

| # | 자산 | 결과 |
|---|---|---|
| 1 | 출퇴근 v2 (WorkerHome.jsx 25-204) | ✅ byte-identical |
| 2 | FCM (WorkerLayout.jsx 39-66) | ✅ 미변경 |
| 3 | QR-CORE (QrScanPage.jsx 45-118) | ✅ byte-identical |
| 4 | 76-A 자산 (AssignWorkersModal + zoneColors.js) | ✅ byte-identical (G77-YY 별 파일 분리) |
| 5 | PWA 설치 안내 모달 | ✅ 미변경 |
| 6 | DB 스키마 / Storage 정책 | ✅ 변경 0건 (SELECT 변경만) |
| 7 | 기존 T 토큰 (primitives.jsx) | ✅ byte-identical |

## 3. 자가 검증 결과 (C1~C18)

| C# | 항목 | 결과 |
|---|---|---|
| C1 | 빌드 통과 | ✅ exit 0 / 20.05s |
| C2~C9 | 자산 보존 7건 byte-identical/미변경 | ✅ 모두 0줄 또는 N/A |
| C10 | view='week' 기본 + view='day' 토글 | ✅ URL ?view=week / ?view=day |
| C11 | view='kanban'/'focus' fallback = 'week' | ✅ rawView !== 'day' → 'week' |
| C12 | WeekMatrixView 매트릭스 zones × 7일 | ✅ table 구조 |
| C13 | DayView 일별 zones row × 작업카드 | ✅ flex 구조 |
| C14 | TaskDetailModal 날짜 편집 → 즉시 반영 | ✅ updateTask 호출 → store 갱신 → 매트릭스 재렌더 |
| C15 | dead code 식별 보고서 §7 박제 | ✅ TaskColumn / WeekView / FocusList — 사용처 0건 |
| C16 | BACKLOG TRACK77-FOLLOWUP-ZONE-METADATA-001 박제 | ✅ |
| C17 | git push origin main | (커밋 후 보고) |
| C18 | Vercel webhook | (push 후) |

## 4. 자율 결정 자율 처리 내역

### G77-YY: 동별 색상 매핑 = **별 파일 `zoneMatrixColors.js`**
- **권고 근거**:
  1. 기존 `zoneColors.js`는 76-A 자산 (A동→인디고/B동→틸/C동→주황/D동→빨강 박제)
  2. 시안 색상은 다른 매핑 (1동 빨강 / 2동 노랑 / 3동 초록 / 4동 파랑) — 동 이름 무관 index 기반 cycle
  3. byte-identical 보장 (`zoneColors.js` diff 0줄)
- **대안**: `zoneColors.js`에 함수만 추가 — 의미 혼란 + 자산 보존 위험 ↑
- LESSONS 149 박제 (자산 보존 인접 변경 시 별 파일 분리 정책)

### G77-ZZ: view fallback = **'week'**
- `?view=kanban`/`?view=focus` 북마크 → 자동 `week`. 사용자 영향 0.

### G77-AAA: dead code = **식별 + BACKLOG, 삭제는 별 라운드**
- LESSONS 146 추종. 본 라운드 미삭제.
- BACKLOG `TRACK77-TASK-DEAD-CODE-001` 신규 박제.

### G77-BBB: TaskDetailModal 작물 필드 = **select** (cropStore 활용)
- 자유 입력 대신 cropStore.crops에서 선택. 데이터 일관성 ↑.

### G77-CCC: 가로 스크롤 = **부모 overflow-x-auto**
- 모바일 호환은 별 트랙 (`TRACK77-TASK-MOBILE-001`).

### G77-DDD: 빈 셀 `+` = **신규 작성 모달 (zoneId + date prefill)**
- TaskDetailModal에 `__new: true` flag로 신규/수정 분기.

### G77-EEE: 별 트랙 BACKLOG 신규 = **`TRACK77-FOLLOWUP-ZONE-METADATA-001`**
- 사용자 결정 — 본 트랙 종료 후 진입.

## 5. 사용자 검증 시나리오

### 5.1 즉시 검증 (PC, 재배팀 관리자)
- S1: `/admin/tasks` → 칸반 부재, 주간 매트릭스 기본
- S2: 보기 토글 "주간" → 동(row) × 7일(column) 매트릭스
- S3: 보기 토글 "일별" → 동(row) × 작업카드 가로 flex
- S4~S5: 동/상태 칩 필터
- S6: 작업 카드 클릭 → TaskDetailModal
- S7: 모달 날짜 변경 + 저장 → 다른 셀에 카드 이동
- S8: 빈 셀 `+` → 신규 작성 모달 (zoneId + date prefill)
- S9: 모달 "배정 변경" → AssignWorkersModal (자산 4번 재사용)
- S10: 일별 카드 클릭 → 동일 흐름
- S11~S12: 주차/일자 네비
- S13: URL `?view=kanban` → 'week' fallback

### 5.2 회귀 검증
- S14: 작업자 측 작업 흐름 (자산 4번 보존)
- S15: 출퇴근 v2 / QR / 다른 흐름
- S16: 다른 관리자 페이지

## 6. 배포 / 푸시 상태

- 로컬 SHA: (커밋 후 보고)
- git push origin main: (커밋 후)
- Vercel webhook: 자동 트리거

## 7. 발견 사항

### 7.1 dead code 후보 (사용처 0건 확정)
- `src/components/task/TaskColumn.jsx` — 칸반 컬럼
- `src/components/task/WeekView.jsx` — 기존 단순 7일 (WeekMatrixView로 대체)
- `src/components/task/FocusList.jsx` — 집중 뷰

`grep -rn "from.*task/TaskColumn\|from.*task/WeekView'\|from.*task/FocusList" src/` → **0건** ✅

본 라운드 미삭제 (LESSONS 146 추종). BACKLOG `TRACK77-TASK-DEAD-CODE-001` 별 라운드.

### 7.2 zone 색상 cycle 정책 (5+ 동 지점 호환)
- `MATRIX_PALETTE` 4색 (빨강/노랑/초록/파랑)
- 5+ 동 지점은 cycle (5동 = 빨강 재사용)
- 부산은 4동(A/B/C/D)으로 모두 첫 cycle 내 매핑 — 시각 일관

### 7.3 모바일 가로 스크롤 (별 라운드)
- `TRACK77-TASK-MOBILE-001` BACKLOG 박제
- PC 기준 설계, 모바일은 가로 스크롤 가능하지만 UX ↓

### 7.4 별 트랙 박제
| ID | 한 줄 |
|---|---|
| TRACK77-FOLLOWUP-ZONE-METADATA-001 | 온실 기초정보 관리 (사용자 결정) |
| TRACK77-TASK-DEAD-CODE-001 | TaskColumn/WeekView/FocusList dead code 일괄 삭제 |
| TRACK77-TASK-MOBILE-001 | 작업 관리 모바일 호환 |
| TRACK77-TASK-DRAG-DROP-001 | 작업 카드 드래그·드롭 (사용자 결정 시) |

LESSONS 149 박제: "자산 보존 인접 변경 시 별 파일 분리 정책"

## 8. 다음 라운드

- 사용자 §5 시나리오 검증 (S1~S16)
- 통과 시 작업자 의견 4 클로징
- 별 트랙 진입: `TRACK77-FOLLOWUP-ZONE-METADATA-001` (사용자 결정)

## 9. CCB / Codex 자율 협업 (표준 §4 추종)

### 9.1 Codex 위임 횟수 + 영역
- **위임 0회** — 본 환경(Antigravity Claude Code)은 단일 Claude Code 환경. CCB 미가용 → Codex 위임 N/A.

### 9.2 향후 CCB 환경에서 위임 권고 영역 (참고)
- `WeekMatrixView.jsx` — 단일 파일 / 시안 명세 명확 / 자기-완결적 → Codex 적합
- `DayView.jsx` — 동일
- `zoneMatrixColors.js` — 단일 함수 → Codex 적합

### 9.3 Claude Code 직접 진행 영역
- `TaskBoardPage.jsx` 재설계 — 다중 컴포넌트 통합 + 흐름 파악 (LESSONS 146 추종)
- `TaskDetailModal.jsx` 신규 — 자산 4번 인접 (AssignWorkersModal 재사용)
- dead code 식별 + BACKLOG 박제 — LESSONS 146 절차

### 9.4 자율 결정 근거
| ID | 근거 |
|---|---|
| G77-YY | 자산 4번 (76-A) 보존 — 별 파일 분리. LESSONS 149 신규 박제 |
| G77-ZZ | 사용자 영향 0 — 자동 fallback |
| G77-AAA | LESSONS 146 추종 — dead code는 별 라운드 |
| G77-BBB | 데이터 일관성 — cropStore 재사용 |
| G77-CCC | 본 라운드 단순화 — 모바일은 별 트랙 |
| G77-DDD | UX 단순화 — 신규 모달에 prefill |
| G77-EEE | 사용자 결정 박제 |

---

**끝.**
