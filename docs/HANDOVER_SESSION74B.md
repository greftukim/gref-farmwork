# 세션 74-B 인수인계 문서

**세션**: 74-B  
**날짜**: 2026-04-27  
**범위**: 평면도 + QR 위치 추적 시스템 — DB 마이그레이션 + 코드 정리  
**마지막 커밋**: ← `git log --oneline -1` 결과로 채울 것 (커밋 후 갱신)

---

## 1. 작업 결과 요약

### 완료된 작업

| # | 항목 | 결과 |
|---|------|------|
| 1 | DB: greenhouses 테이블 확인 | 이미 4행 존재 (1cmp/2cmp/3cmp/4cmp) |
| 2 | DB: qr_codes 시드 | 92행 삽입 완료 (46골 × F+B) |
| 3 | DB: qr_scans 테이블 | 0행 (실 스캔 시 INSERT) |
| 4 | DB: employees.speed_factor | 41명 전원 1.0 (이미 존재) |
| 5 | RLS: greenhouses/qr_codes/qr_scans | 기존 정책 확인 (anon SELECT + admin ALL 존재) |
| 6 | FloorPlan.jsx: timeAgo() 하드코딩 제거 | `10:25` → `Date.now()` 기반 nowMin() |
| 7 | FloorPlan.jsx: minSinceScan() 하드코딩 제거 | 동일 |
| 8 | FloorPlan.jsx: 슬라이더 max=625 → 동적 | `nowMin()` — mount 시점 계산 |
| 9 | QrScanPage.jsx: scan_type 수정 | `'task_start'` → `'start'` (CHECK constraint 정합) |
| 10 | Dead code 삭제: admin/FloorPlan.jsx | git rm 완료 |
| 11 | Dead code 삭제: floor-schema.js | git rm 완료 |
| 12 | BACKLOG: 4건 resolved + 2건 신규 | PC-FLOOR-DATA-001, FLOOR-SCHEMA-SKIP-001, TRACK-L-G-MERGE-001, P3-DEAD-FLOORPLAN-FILE-001 해소 |
| 13 | LESSONS: 교훈 126·127 신설 | apply_migration 전 테이블 확인 + 차분 패치 패턴 |

### 미완료 (74-C 이월)

- MOBILE-FLOOR-001: GreenhousePlan 모바일 이식
- QrScanPage 진입 경로 신설 (질의 A)
- F/B/F-again 토글 판정 로직
- qr_scans.scan_type CHECK에 'pause','resume' 추가

---

## 2. 핵심 발견 — DB 사전 생성 (교훈 126·127)

### 발견 경위

`apply_migration` 호출 시 `42P07: relation "greenhouses" already exists` 오류 발생.  
→ 3개 테이블(greenhouses/qr_codes/qr_scans)과 `employees.speed_factor`가 **Supabase 대시보드에서 직접 생성**돼 있었음.

### 계획 vs 실제 스키마 차이

| 항목 | 계획 | 실제 DB |
|------|------|---------|
| `qr_codes.label` | TEXT | 없음 (대신 `note TEXT`) |
| `qr_codes` 추가 컬럼 | 없음 | `status TEXT DEFAULT 'active'`, `issued_at DATE` |
| `qr_scans` 추가 컬럼 | 없음 | `task_id UUID FK→tasks` |
| `qr_scans.scan_type` CHECK | 6종 포함 pause/resume | 4종만: start/half/complete/switch |
| `qr_codes.greenhouse_id` FK | ON DELETE RESTRICT | ON DELETE CASCADE |
| `employees.speed_factor` | NOT NULL DEFAULT 1.00 | nullable DEFAULT 1.0 |

**처리**: 앱 코드가 의존하지 않는 차이는 현행 유지. 기능 영향 없음.

### 대응 조치

- qr_codes 시드 92행: `execute_sql` 패치 (`note`, `status` 컬럼 맞춰 조정)  
- `employees.speed_factor` nullable: `useFloorData.js`의 `?? 1.0` fallback이 이미 처리 중 ✅
- `qr_scans.scan_type` CHECK 4종: 현재 사용 값('start') 포함 ✅. pause/resume은 74-C에서 추가.

---

## 3. 변경 파일 목록

### 수정

| 파일 | 변경 내용 |
|------|-----------|
| [src/pages/FloorPlan.jsx](../src/pages/FloorPlan.jsx) | timeAgo, minSinceScan 하드코딩 제거 + 슬라이더 max 동적화 |
| [src/pages/worker/QrScanPage.jsx](../src/pages/worker/QrScanPage.jsx) | scan_type 'task_start'→'start' |
| [supabase/migrations/20260427_session74b_floor_qr_system.sql](../supabase/migrations/20260427_session74b_floor_qr_system.sql) | 참조 문서 (실제 적용 메모) |
| [docs/BACKLOG.md](BACKLOG.md) | 4건 resolved + 2건 신규 |
| [docs/LESSONS_LEARNED.md](LESSONS_LEARNED.md) | 교훈 126·127 추가 |

### 삭제

| 파일 | 이유 |
|------|------|
| `src/pages/admin/FloorPlan.jsx` | dead code (App.jsx 미등록, floor-schema.js import) |
| `src/data/floor-schema.js` | dead code (admin/FloorPlan.jsx 전용 mock, 참조 0건) |

### 신규

| 파일 | 내용 |
|------|------|
| [docs/HANDOVER_SESSION74B.md](HANDOVER_SESSION74B.md) | 이 문서 |

---

## 4. DB 최종 상태 (검증 완료)

```
greenhouses  : 4행  (1cmp 토마토, 2cmp 토마토, 3cmp 딸기, 4cmp 파프리카)
qr_codes     : 92행 (1cmp:20, 2cmp:20, 3cmp:14, 4cmp:38)
qr_scans     : 0행  (실 운용 시 누적)
employees.speed_factor : 41명 전원 1.00
```

---

## 5. 다음 세션 후보 (74-C)

### 필수 (74-C 착수 블로커)

1. **QrScanPage 진입 경로 신설** (질의 A) — 작업자가 QR 스캔 화면으로 어떻게 접근하는지 확정 후 구현
2. **F/B/F-again 토글 판정 로직** — QrScanPage.jsx에서 이전 스캔 기록 조회 → 다음 scan_type 자동 판정

### 권장 추가

3. **MobileFloorScreen GreenhousePlan 이식** (MOBILE-FLOOR-001) — PC FloorPlan에서 export된 GreenhousePlan 컴포넌트를 모바일 뷰에 삽입
4. **qr_scans.scan_type CHECK 확장** — pause/resume 추가 (ALTER TABLE ... DROP CONSTRAINT ... ADD CONSTRAINT)

### 74-C 착수 전 확인 사항

- 질의 A 결정: QrScanPage 진입 경로 (바텀탭 링크? 홈 버튼? 직접 URL?)
- 작업자 앱에서 QR 스캔 테스트: `/admin/m/qr-scan` 직접 접근 → 실제 QR 코드(qr_codes.id UUID) 스캔 → qr_scans INSERT 확인

---

## 6. BACKLOG 변경 요약

| ID | 변경 | 내용 |
|----|------|------|
| PC-FLOOR-DATA-001 | open → resolved | DB 세트 완성 + 코드 수정으로 해소 |
| FLOOR-SCHEMA-SKIP-001 | open → resolved | dead code 2건 git rm |
| TRACK-L-G-MERGE-001 | open → resolved | 분리 확정 (DB 스키마 겹침 없음) |
| P3-DEAD-FLOORPLAN-FILE-001 | 신규 → resolved | dead code 삭제 완료 |
| ASSIGNMENT-PLAN-001 | 신규 open | 골 작업 배정 기능 (Tier 6, 별 트랙) |
| MOBILE-FLOOR-001 | 유지 open | 74-C 이월 명시 |

---

## 7. 교훈 요약 (신규 2건)

- **교훈 126**: `apply_migration` 전 `information_schema.tables` 조회로 대상 테이블 존재 여부 선행 확인. 이미 존재 시 차분 패치로 전환.
- **교훈 127**: 기존 테이블 스키마가 계획과 다를 때, 앱이 실제로 의존하는 컬럼/제약만 선별해 패치. 앱 미사용 컬럼은 현행 유지.

---

## 새 채팅방 시작 가이드

```bash
git log -5 --oneline
cat docs/BACKLOG.md
cat docs/LESSONS_LEARNED.md | tail -60
cat docs/HANDOVER_SESSION74B.md
```
