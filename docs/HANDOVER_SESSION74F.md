# 세션 74-F 인수인계 문서

**세션**: 74-F  
**날짜**: 2026-04-27  
**범위**: 평면도 빈 화면 수정(Track A) + 대시보드 KPI 데모 시드(Track B) + BACKLOG 갱신(Track C)  
**마지막 커밋**: `64755a0` fix(session74-F): 평면도 빈 화면 + 골 클릭 크래시 수정

---

## 1. 작업 결과 요약

| # | 트랙 | 항목 | 결과 |
|---|------|------|------|
| 1 | A | FloorPlan.jsx 빈 화면 원인 분석 | taskType=null → TASK_TYPES[null].color TypeError 확인 |
| 2 | A | Bug #1 — null-guard task | `g.taskType ? TASK_TYPES[g.taskType] : null` 1줄 수정 |
| 3 | A | Bug #2 — btnSecondary import 복원 | 74-D 회귀, import 한 줄 추가 |
| 4 | A | Bug #3 — 조건부 task span 렌더 | `{task && <span>…</span>}` 1줄 수정 |
| 5 | A | 빌드 검증 | npm run build 0 에러 ✓ |
| 6 | B-1 | demo_attendance_today.sql 작성·적용 | 9건 INSERT, 검증 9건 ✓ |
| 7 | B-2 | demo_harvest_week.sql 작성·적용 | 3건 INSERT, 합계 205kg ✓ |
| 8 | C | BACKLOG 4건 신규·해소 등록 | DEMO-SEED-FLOOR-001/DASHBOARD-001/FLOOR-PAGE-ERROR-001/P3-FLOORPLAN-BTN-IMPORT-001 |

### 미완료 (차기 이월)

- 실기기 QR 스캔 1회 통과 (74-D 이월, 유일한 잔여 관문)
- ASSIGNMENT-PLAN-001: 골 사전 배정 기능 (Tier 6, 별 트랙)

---

## 2. Track A — 버그 수정 상세

### 근본 원인

74-E 시드(qr_scans 98건) 투입 후 `buildFieldStateFromScans()`가 `taskType: null`인 gol을 생성.  
FloorPlanScreen "지금 작업 중" 목록이 해당 gol을 포함하며 `TASK_TYPES[null].color` 접근 → TypeError.  
React 트리 전체 언마운트 → 빈 화면.

### 수정 위치 (FloorPlan.jsx)

```diff
// Fix 1 — import 복원 (line 4)
- import { Card, Pill, T, icons } from '../design/primitives';
+ import { Card, Pill, T, icons, btnSecondary } from '../design/primitives';

// Fix 2 — null-guard (line ~700)
- const task = TASK_TYPES[g.taskType];
+ const task = g.taskType ? TASK_TYPES[g.taskType] : null;

// Fix 3 — 조건부 렌더 (line ~723)
- <span style={{…}}>{task.label}</span>
+ {task && <span style={{…}}>{task.label}</span>}
```

---

## 3. Track B — 데모 시드 상세

### B-1: attendance (출근)

| 항목 | 값 |
|------|-----|
| 파일 | supabase/seeds/demo_attendance_today.sql |
| 대상 | 부산 작업자 9명 (이름 순 w[1]~w[9]) |
| 날짜 | CURRENT_DATE |
| check_in | 07:55~08:07 (작업자별 개별 시각) |
| check_out | null (근무 중) |
| 멱등성 | DELETE WHERE employee_id=ANY(9명) AND date=TODAY → INSERT |
| KPI 효과 | "오늘 출근" 0 → **9명** |

### B-2: harvest_records (수확량)

| 항목 | 값 |
|------|-----|
| 파일 | supabase/seeds/demo_harvest_week.sql |
| 대상 | 김선아(토마토)/김옥희(딸기)/김점숙(파프리카) |
| 날짜 | CURRENT_DATE |
| 수량 | 95kg + 38kg + 72kg = **205kg** |
| 멱등성 | DELETE WHERE employee_id=ANY(3명) AND date≥이번주월요일 AND date≤TODAY |
| KPI 효과 | "이번 주 수확량" 0 → **205kg** |

### 검증 결과

```
SELECT COUNT(*) FROM attendance WHERE date = CURRENT_DATE;
→ 9

SELECT SUM(quantity) FROM harvest_records WHERE date = CURRENT_DATE;
→ 205
```

---

## 4. 사용자 점검 안내

- [ ] `/admin` 대시보드 KPI 4종 확인:
  - "오늘 출근 **9/12명**" 표시 (12 = 부산 is_active 전체 — 설계 의도)
  - "이번 주 수확량 **205kg**" 표시
  - "진행중 작업 0%" — 이번 트랙 의도된 결과 (평면도 화면이 진행 시각화 담당)
- [ ] `/admin/floor` 평면도 회귀 없음 확인:
  - 동 클릭 → 평면도 색상 표시 정상
  - 골 클릭 → GolDetail 패널 정상 (크래시 없음)
  - "작업자 재배정" / "생육 상세" 버튼 노출 정상

---

## 5. Track C — BACKLOG 갱신

| ID | 분류 | 상태 |
|----|------|------|
| DEMO-SEED-FLOOR-001 | 데이터 | resolved (74-E) |
| DEMO-SEED-DASHBOARD-001 | 데이터 | resolved (74-F) |
| FLOOR-PAGE-ERROR-001 | BUG | resolved (74-F) |
| P3-FLOORPLAN-BTN-IMPORT-001 | BUG | resolved (74-F) |

---

## 6. 트랙 종료 판정

### 74-A ~ 74-F 완료 현황

| 트랙 | 내용 | 상태 |
|------|------|------|
| 74-A | 평면도 SVG 렌더링 | ✅ 완료 |
| 74-B | DB 세트(greenhouses/qr_codes/qr_scans) + PC 평면도 실데이터 | ✅ 완료 |
| 74-C | QR 관리 모드 전 기반 + 모바일 평면도 + F/B/F-again 판정 | ✅ 완료 |
| 74-D | QR 관리 모드 + PDF 라벨 내보내기 + scan_type CHECK 6종 | ✅ 완료 |
| 74-E | 데모 시드 — qr_scans 98건 (오늘 날짜, CURRENT_DATE 기준) | ✅ 완료 |
| 74-F | 빈 화면 수정 + 대시보드 KPI 시드 투입 | ✅ 완료 |

### 운영 진입 가능 여부

**조건부 운영 가능** — 코드·DB·데이터 모든 준비 완료.  
유일한 잔여 관문: **실기기 QR 스캔 1회 통과** (QR 라벨 출력 → 부착 → 스마트폰 스캔 → qr_scans INSERT 확인).  
이 검증을 통과하면 74-A ~ 74-F 트랙 **운영 진입 완료**로 확정.

---

## 7. 변경 파일 목록

| 파일 | 변경 내용 |
|------|-----------|
| [src/pages/FloorPlan.jsx](../src/pages/FloorPlan.jsx) | Bug 3건 수정 (import + null-guard × 2) |
| [supabase/seeds/demo_attendance_today.sql](../supabase/seeds/demo_attendance_today.sql) | 출근 시드 신규 작성 |
| [supabase/seeds/demo_harvest_week.sql](../supabase/seeds/demo_harvest_week.sql) | 수확량 시드 신규 작성 |
| [docs/BACKLOG.md](BACKLOG.md) | 4건 신규·해소 등록 |
| [docs/HANDOVER_SESSION74F.md](HANDOVER_SESSION74F.md) | 이 문서 |

---

## 새 채팅방 시작 가이드

```bash
git log -5 --oneline
cat docs/BACKLOG.md
cat docs/LESSONS_LEARNED.md | tail -60
cat docs/HANDOVER_SESSION74F.md
```
