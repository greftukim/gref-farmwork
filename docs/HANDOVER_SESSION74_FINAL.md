# HANDOVER — 세션 74 (74-A ~ 74-G) 최종

**날짜**: 2026-04-27  
**담당**: Claude (claude-sonnet-4-6)  
**마지막 커밋**: `cb813dc` docs(session74-G): HANDOVER 마지막 커밋 해시 채움  
**커버 범위**: 세션 74-A ~ 74-G (평면도 + QR 위치 추적 트랙 전체)

---

## 세션 전체 요약

| 서브세션 | 주요 작업 | 결과 |
|----------|-----------|------|
| 74-A | 평면도+QR 트랙 사전 정찰 2회 (코드 변경 0) | ✅ 설계 결정값 전수 확정 |
| 74-B | DB 마이그레이션 (greenhouses/qr_codes/qr_scans) + dead code 삭제 + 하드코딩 수정 | ✅ PC 평면도 실데이터 복원 |
| 74-C | F/B/F-again 판정 로직 + 모바일 평면도 이식 + 작업자 QR 진입 경로 | ✅ 스캔→평면도 흐름 완성 |
| 74-D | QR 관리 모드 + PDF 라벨 내보내기 + scan_type CHECK 6종 확장 | ✅ QR 라벨 운영 준비 완료 |
| 74-E | qr_scans 데모 시드 98건 (CURRENT_DATE 기준, 멱등성) | ✅ 평면도 색상 분포 데모 |
| 74-F | 평면도 빈 화면 버그 수정 3건 + 대시보드 KPI 시드 투입 | ✅ 앱 오류 해소 + KPI 표시 |
| 74-G | FloorPlan task null-guard 잔존 위치 전수 grep + 일괄 수정 4건 | ✅ null 누수 완전 해소 |

---

## 커밋 목록

| 해시 | 내용 |
|------|------|
| `14f602b` | docs(recon): 세션 74-A 평면도+QR 위치 추적 사전 조사 보고서 |
| `f753f6f` | docs(session74-A): 추가 정찰 보고서 + BACKLOG 2건 오기 수정 |
| `2d225e6` | feat(session74-B): 평면도 QR 시스템 DB 세트 + dead code 제거 + 하드코딩 수정 |
| `f51f7b0` | docs(session74-B): 핸드오버 마지막 커밋 해시 기입 |
| `b546417` | feat(session74-C): QR 스캔 진입 경로 + F/B/F-again 판정 + 모바일 평면도 이식 |
| `5cd67b8` | docs(session74-C): 세션 74-C 인수인계 문서 작성 |
| `dcdc2ef` | feat(session74-D): QR 관리 모드 + PDF 라벨 내보내기 + scan_type CHECK 확장 |
| `f47bf97` | docs(session74-D): 세션 74-D 인수인계 문서 작성 |
| `ede2be3` | feat(session74-E): 오늘 날짜 QR 스캔 데모 시드 + HANDOVER |
| `e4b0b4f` | docs(session74-E): HANDOVER 마지막 커밋 해시 채움 |
| `64755a0` | fix(session74-F): 평면도 빈 화면 + 골 클릭 크래시 수정 |
| `44f9ba2` | feat(session74-F): 대시보드 KPI 시드 + BACKLOG 갱신 + HANDOVER |
| `383c4f1` | fix(session74-G): FloorPlan task null-guard 일괄 회수 (4곳) |
| `cb813dc` | docs(session74-G): HANDOVER 마지막 커밋 해시 채움 |

---

## 세션별 주요 작업 상세

### 74-A — 사전 정찰

**코드 변경 없음.** 설계 결정을 위한 전수 조사.

**핵심 발견**:
- FloorPlan 파일 2개 존재: active(`src/pages/FloorPlan.jsx`) vs dead code(`src/pages/admin/FloorPlan.jsx`)
- useFloorData.js 쿼리 대상 3테이블(greenhouses/qr_codes/qr_scans) DB 미존재 → 빈 화면 원인
- QrScanPage `scan_type: 'task_start'` 하드코딩 — useFloorData 기대값 불일치
- timeAgo() 하드코딩 `10:25` 발견 (교훈 77 위반)

**설계 결정값 확정**:
- greenhouses 4행 / qr_codes 92행 (골당 F+B 2개, 46골)
- employees.speed_factor: `NUMERIC(4,2) NOT NULL DEFAULT 1.00`
- TRACK-L-G-MERGE-001: Track L / Track G 분리 확정

---

### 74-B — DB 마이그레이션 + dead code 정리

**신규 인프라**:

| 테이블 | 행 수 | 비고 |
|--------|-------|------|
| `greenhouses` | 4행 | 1cmp/2cmp/3cmp/4cmp, 부산LAB |
| `qr_codes` | 92행 | 골당 F+B 2개, PL/pgSQL LOOP 시드 |
| `qr_scans` | 0행 | 실 스캔 시 INSERT |
| `employees.speed_factor` | 24명 DEFAULT 1.0 | ALTER TABLE ADD COLUMN |

**dead code 삭제**:
- `src/pages/admin/FloorPlan.jsx` (731줄)
- `src/data/floor-schema.js` (189줄)

**하드코딩 수정**:
- `timeAgo()` / `minSinceScan()`: `10 * 60 + 25` → `nowMin()` (교훈 77)
- 히스토리 슬라이더 `max=625` → `nowMin()` 동적 계산

**결과**: `/admin/floor` 4개 동 실데이터 표시 복원 ✅

---

### 74-C — QR 스캔 흐름 완성 + 모바일 평면도

**F/B/F-again 3단계 판정 로직** (QrScanPage.jsx):
```
QR UUID → 같은 온실+골 sibling QR 조회 → 당일 스캔 이력 조회
마지막 scan_type이 없음 → start (작업 시작)
마지막 scan_type = start → half (오른쪽 거터 완료)
마지막 scan_type = half → complete (골 완료)
```

**모바일 평면도** (AdminMobilePages.jsx — MobileFloorScreen):
- FloorCtx.Provider 연결 + useFloorData 훅
- 온실별 탭(houseIdx) + selectedGol 상태
- GreenhousePlan 컴포넌트 이식 (PC와 동일 렌더러)

**작업자 QR 진입 경로** (WorkerHome.jsx):
- gradient CTA 카드 추가 → `/worker/m/qr-scan`

---

### 74-D — QR 관리 모드 + PDF 라벨

**QR 관리 모드** (FloorPlan.jsx):
- [QR 관리] 토글 버튼 → qrManageMode 상태
- SVG 마커 오버레이: F(파랑)/B(노랑) 클릭 → QRCodeSVG 팝업 (190px)
- supabase.from('qr_codes') 1회 fetch

**PDF 내보내기**:
- A4당 9개 라벨 (3×3), 라벨 70×70mm
- canvas 기반 한국어 텍스트 렌더 → PNG → jspdf (교훈 129)
- jspdf@4.2.1 + qrcode 동적 import (초기 번들 분리)

**scan_type CHECK 확장**:
- 4종 → 6종: `start/half/complete/switch/pause/resume`

---

### 74-E — 데모 시드 (qr_scans)

| 항목 | 값 |
|------|-----|
| 파일 | `supabase/seeds/demo_qr_scans_today.sql` |
| 행 수 | 98건 |
| 대상 | 부산 작업자 9명 × 4동 × 46골 |
| 날짜 기준 | CURRENT_DATE (교훈 77) |
| scan_type 분포 | start=40 / half=31 / complete=23 / pause=2 / resume=2 |
| 멱등성 | 오늘+9명 한정 DELETE→INSERT |

**평면도 색상 결과**: 완료=녹색 / half=노랑 / start=파랑 / idle=회색 ✅

---

### 74-F — 버그 수정 + 대시보드 KPI 시드

**평면도 빈 화면 버그 (3건 수정)**:

| Bug | 위치 | 원인 | 수정 |
|-----|------|------|------|
| #1 | btnSecondary import | 74-D 중 누락 | import 복원 |
| #2 | line 700 — allWorking list | `TASK_TYPES[null].color` | 삼항 null-guard |
| #3 | line 723 — task span | `task.label` null 접근 | `{task && <span>}` |

**대시보드 KPI 시드**:

| 파일 | 내용 | KPI 효과 |
|------|------|---------|
| `demo_attendance_today.sql` | 부산 작업자 9명 출근 (07:55~08:07) | "오늘 출근 9/12명" |
| `demo_harvest_week.sql` | 토마토 95kg + 딸기 38kg + 파프리카 72kg | "이번 주 수확량 205kg" |

---

### 74-G — null-guard 잔존 일괄 회수

74-F에서 2곳만 수정 후 closed → 동일 패턴 2곳 잔존 재발. 교훈 131 신설.

**추가 수정 4건**:

| 위치 | 코드 | 수정 |
|------|------|------|
| Line 734 (allWorking progress bar) | `task.color` | `task ? task.color : '#94A3B8'` |
| Line 875 (GolDetail 뱃지) | `task.color/label` | `{task && <span>}` |
| Line 758 (ACTIVE_ASSIGNMENTS) | `task.color/label` | `task ? task.color : '#94A3B8'` + `task?.label` |
| Line 763 (ACTIVE_ASSIGNMENTS) | `task.color` | `task ? task.color : '#94A3B8'` |

---

## 해소된 BACKLOG 일람 (74-A ~ 74-G)

| ID | 세션 | 내용 |
|----|------|------|
| TRACK-L-G-MERGE-001 | 74-A | Track L/G 분리 확정 (DB 스키마 겹침 없음) |
| P3-DEAD-FLOORPLAN-FILE-001 | 74-B | dead code 2파일 git rm 삭제 |
| FLOOR-SCHEMA-SKIP-001 | 74-B | dead code 삭제로 자연 해소 |
| PC-FLOOR-DATA-001 | 74-B | DB 마이그레이션 완료 + 실데이터 표시 |
| QR-SCAN-FLOW-001 | 74-C | F/B/F-again 판정 로직 구현 |
| WORKER-QR-CTA-001 | 74-C | 작업자 홈 QR 스캔 진입 경로 추가 |
| MOBILE-FLOOR-001 | 74-C | MobileFloorScreen 평면도 이식 |
| QR-CODE-LABEL-GEN-001 | 74-D | QR 관리 모드 + PDF 내보내기 |
| QR-SCAN-TYPE-CHECK-001 | 74-D | scan_type CHECK 6종 확장 |
| DEMO-SEED-FLOOR-001 | 74-E | qr_scans 98건 데모 시드 |
| DEMO-SEED-DASHBOARD-001 | 74-F | attendance 9건 + harvest 3건 시드 |
| FLOOR-PAGE-ERROR-001 | 74-F → 74-G | 평면도 빈 화면 (74-F 부분, 74-G 완전 해소) |
| P3-FLOORPLAN-BTN-IMPORT-001 | 74-F | btnSecondary import 누락 회귀 |
| FLOOR-NULL-GUARD-AUDIT-001 | 74-G | task null-guard 전수 감사·완료 |

---

## 박제된 교훈 (74-A ~ 74-G)

| 번호 | 세션 | 교훈 |
|------|------|------|
| 126 | 74-B | `apply_migration` 전 테이블 존재 여부 선행 확인 필수 |
| 127 | 74-B | 기존 테이블 스키마와 계획 차이 — 강제 재생성보다 현황 파악 후 차분 패치 |
| 128 | 74-C | React Context 공유 시 Context 객체도 함께 export 해야 한다 |
| 129 | 74-D | PDF 한국어: canvas 경유 이미지 방식으로 폰트 임베딩 없이 해결 |
| 130 | 74-D | 결정권자 단일화: "박민식·김민국 답변 대기" 분류 영구 폐기 |
| 131 | 74-G | null 누수 패턴 수정 시 동일 변수 모든 사용처 grep 일괄 회수 필수 |

---

## 신규 인프라 요약

### DB 테이블

| 테이블 | 행 수 | 용도 |
|--------|-------|------|
| `greenhouses` | 4 | 부산LAB 온실 4개 메타데이터 |
| `qr_codes` | 92 | 각 골 앞/뒤 QR UUID 레지스트리 |
| `qr_scans` | 런타임 | 작업자 QR 스캔 이벤트 로그 |
| `employees.speed_factor` | 24 | 작업자별 속도 보정 계수 |

### 데모 시드 파일

| 파일 | 내용 | 멱등성 기준 |
|------|------|------------|
| `supabase/seeds/demo_qr_scans_today.sql` | qr_scans 98건 | 오늘+9명 한정 |
| `supabase/seeds/demo_attendance_today.sql` | attendance 9건 | 오늘+9명 한정 |
| `supabase/seeds/demo_harvest_week.sql` | harvest_records 3건 | 이번주+3명 한정 |

### UI 기능

| 기능 | 파일 | 상태 |
|------|------|------|
| PC 평면도 실데이터 표시 | FloorPlan.jsx | ✅ |
| 모바일 평면도 (GreenhousePlan 이식) | AdminMobilePages.jsx | ✅ |
| QR 관리 모드 (F/B 마커) | FloorPlan.jsx | ✅ |
| PDF 라벨 내보내기 | FloorPlan.jsx | ✅ |
| F/B/F-again 스캔 판정 | QrScanPage.jsx | ✅ |
| 작업자 홈 QR CTA | WorkerHome.jsx | ✅ |

---

## 신규 BACKLOG (open)

| ID | 분류 | 내용 |
|----|------|------|
| ASSIGNMENT-PLAN-001 | 기능 미구현 (Tier 6) | 골 사전 배정 — ACTIVE_ASSIGNMENTS 항상 [] |
| ERROR-BOUNDARY-PAGE-001 | UX 부채 (운영 후) | 1페이지 크래시 → 전역 ErrorBoundary → 전체 차단 |

---

## 결정권자 원칙 (교훈 130, 영구 적용)

박민식·김민국은 현장 피드백 제공자이며 앱 결정권자가 아님.  
이후 BACKLOG·HANDOVER에서 "박민식·김민국 답변 대기" 항목 발급 금지.  
결정 보류 필요 시: "사용자 결정 보류" 또는 "코드 판단 위임"으로만 표기.

---

## 잔여 운영 관문

| 항목 | 상태 | 담당 |
|------|------|------|
| **실기기 QR 스캔 1회 통과** | **보류** | 사용자: QR 라벨 출력 → 부착 → 스마트폰 스캔 → qr_scans INSERT 확인 |
| PWA 설치 실기기 검증 | 보류 | iOS Safari localStorage 초기화 후 재확인 |

실기기 QR 스캔 통과 시 74-A ~ 74-G 트랙 **운영 진입 완료** 판정.

---

## 빌드 + 환경 상태

| 항목 | 상태 |
|------|------|
| `npm run build` | ✅ 0 에러 (cb813dc 기준) |
| BACKLOG open | 8건 (ASSIGNMENT-PLAN-001, ERROR-BOUNDARY-PAGE-001, LABOR-COST-001, TASK-MOBILE-001, NOTIFICATION-STORE-001, WORKER-NOTICE-READ-001, ISSUE-STATUS-COLUMN-001, P2-SPEED-STANDARD-UI-001) |
| 누적 교훈 마지막 번호 | 교훈 131 |
| 데모 시드 마지막 갱신 | 2026-04-27 |

---

## 차기 세션 후보 (우선순위)

| 순위 | 트랙 | 내용 |
|------|------|------|
| 1 | 운영 검증 | 실기기 QR 스캔 1회 통과 → 74 트랙 운영 진입 완료 판정 |
| 2 | ERROR-BOUNDARY-PAGE-001 | FloorPlan/QrScanPage 등 페이지별 ErrorBoundary 도입 |
| 3 | ASSIGNMENT-PLAN-001 | 골 사전 배정 UI + assignments 테이블 (Tier 6) |
| 4 | Track G (포장) | 도메인 노트 작성 → 포장 작업 관리 구현 |
| 5 | 부채 정리 | LABOR-COST-001 / TASK-MOBILE-001 / NOTIFICATION-STORE-001 |

---

## 새 채팅방 시작 가이드

```bash
# 1. 최근 커밋 확인
git log --oneline -5

# 2. BACKLOG 전체 읽기 (미해결 부채·블로커)
cat docs/BACKLOG.md

# 3. LESSONS 마지막 10개 확인
grep -E "^## 교훈 [0-9]+" docs/LESSONS_LEARNED.md | tail -10

# 4. 빌드 상태 확인
npm run build 2>&1 | tail -5

# 5. 이 문서 + 73_FINAL 비교 (트랙 연속성)
cat docs/HANDOVER_SESSION74_FINAL.md
cat docs/HANDOVER_SESSION73_FINAL.md
```

**세션 시작 전 보고 양식**:
> "오늘 작업 후보: {트랙명}. 관련 부채: {BACKLOG ID}. 관련 교훈: {교훈 번호}."
