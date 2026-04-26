# 세션 74-A 사전 조사 보고서 — 평면도 + 거터 QR 위치 추적

**조사일**: 2026-04-27  
**기준 커밋**: 9a3dd4c  
**조사자**: Claude (claude-sonnet-4-6) — Explore 에이전트 초안 + 직접 교차 검증

> **⚠ 주의**: Explore 에이전트 초안에 중대 오류 2건이 있었다.
> (1) FloorPlan 파일이 두 개 존재하는데 dead code 파일을 active 파일로 오인.
> (2) PC FloorPlan active 파일이 useFloorData.js를 통해 Supabase에 연결돼있으나
>     관련 DB 테이블이 전혀 없음을 놓침.
> 이 보고서는 직접 교차 검증 후 재작성됐다.

---

## 항목 1 — floor-schema.js / useFloorData.js

### 케이스 판정

| 파일 | 케이스 | 근거 |
|------|--------|------|
| `src/data/floor-schema.js` | **Z'** | 존재하나 DEAD CODE 전용 (active 라우트에서 import 안 함) |
| `src/hooks/useFloorData.js` | **Y** | 존재하고 active 라우트에서 import 중. 단, 쿼리 대상 DB 테이블이 미존재 |

---

### floor-schema.js 분석 (189줄)

**위치**: `src/data/floor-schema.js`  
**성격**: 100% 하드코딩 mock. 실 Supabase 연결 없음.

**골/거터 구조 정의** (flat list):
```js
const HOUSE_CONFIG = [
  { id: '1cmp', name: '1cmp', gutters: 10, gols: 10, hasRightGol: true,  crop: '토마토' },
  { id: '2cmp', name: '2cmp', gutters: 10, gols: 10, hasRightGol: true,  crop: '토마토' },
  { id: '3cmp', name: '3cmp', gutters: 8,  gols: 7,  hasRightGol: false, crop: '딸기' },
  { id: '4cmp', name: '4cmp', gutters: 20, gols: 19, hasRightGol: false, crop: '파프리카', hanging: true },
];
```

**QR 2개(앞/뒤) 분리 모델링** ✅ — QR ID 패턴: `{house}-{gol}-{F|B}`  
예: `1cmp-05-F` (1cmp 5번 골 앞), `1cmp-05-B` (뒤)

**작업 방향 필드** ✅:
- `lastScan`: `'F'` (골 앞, 오른쪽 거터 작업 중) | `'B'` (골 뒤, 왼쪽 거터 작업 중) | `'F-again'` (완료)
- 66~71줄 주석에 명시

**진행률 단계** ✅:
- `progress`: `0` (미작업) | `50` (반 완료) | `100` (완료)
- SCAN_HISTORY `type`: `start` → `half` → `complete`

**SCAN_HISTORY 구조** — 도메인 흐름과 일치:
```js
{ at: '09:02', house: '4cmp', gol: 1, side: 'F', by: 'w02', type: 'half' },   // 50%
{ at: '09:15', house: '4cmp', gol: 1, side: 'F', by: 'w04', type: 'complete'},// 100%
```

**BACKLOG 충돌**: FLOOR-SCHEMA-SKIP-001(wontfix)은 "floor-schema.js 의도적으로 미생성"이라고 하나  
파일이 실제로 존재함 → **BACKLOG 설명 오기**. 실제로는 old admin FloorPlan.jsx 전용 mock으로 존재.

---

### useFloorData.js 분석 (184줄)

**위치**: `src/hooks/useFloorData.js`  
**연결 파일**: `src/pages/FloorPlan.jsx` (active 라우트에서 사용)

**쿼리 대상 테이블** (3개):
```js
supabase.from('greenhouses').select('*, crops(name)').eq('branch', 'busan').eq('is_active', true)
supabase.from('employees').select('id, name, role, speed_factor').eq('branch', 'busan')
supabase.from('qr_scans').select('*, qr_codes(gol, side, greenhouse_id)').gte('scanned_at', todayISO)
```

**`buildFieldStateFromScans()`** — 실 스캔 기록 → 골 상태 변환 로직:
```js
if (sc.scan_type === 'start')    → progress = 0,  currentWorker = sc.employee_id
if (sc.scan_type === 'half')     → progress = 50, lastScan = 'B'
if (sc.scan_type === 'complete') → progress = 100, currentWorker = null, lastScan = 'F-again'
if (sc.scan_type === 'switch')   → currentWorker = sc.employee_id  (작업자 교대)
```

도메인 흐름과 완벽 일치. 단, **세 테이블 모두 DB 마이그레이션 없음** (항목 6 참조).

**에러 처리**: try/catch → `EMPTY_DATA` 반환 → 현재 production에서 빈 화면 표시됨.

---

## 항목 2 — PC FloorPlan.jsx

### 케이스 판정: **Y** (UI + 로직 완성, DB 테이블 미존재로 빈 상태)

### FloorPlan 파일 2개 존재 — 반드시 구분 필요

| 파일 | 라우트 연결 | import 소스 | 상태 |
|------|------------|-------------|------|
| `src/pages/FloorPlan.jsx` (749줄) | ✅ `/admin/floor` (App.jsx L206) | `useFloorData` | **ACTIVE** |
| `src/pages/admin/FloorPlan.jsx` (731줄) | ❌ App.jsx 미등록 | `floor-schema.js` | **DEAD CODE** |

---

### src/pages/FloorPlan.jsx (active) — 핵심 구현 내용

**exports**: `FloorPlanScreen`, `GreenhousePlan` (모바일 재사용 후보)

**위치 예측 함수 `predictPosition(g)`**:
- 입력: 골 상태 (currentWorker, taskType, startedAt, lastScan, pausedAt, pauseTotalMin)
- 출력: `{ phase: 'rightDown' | 'leftUp' | 'idle', frac: 0~1 }` (위치 좌표 비율)
- 로직: 작업 유형별 `speedSecPerM × speed_factor → 경과 m 계산 → phase + frac`

**좌/우 측면 시각화** ✅:
- `phase = 'rightDown'`: 아이콘 x = `gol.x + gol.w × 0.68` (오른쪽 거터 쪽)
- `phase = 'leftUp'`: 아이콘 x = `gol.x + gol.w × 0.32` (왼쪽 거터 쪽)
- 방향 화살표: rightDown = ↓, leftUp = ↑

**진행률 시각 표현**:
- 세로 게이지 바 (골 왼쪽 끝 3px)
- progress=0: 회색, progress=50: 파란색(절반 높이), progress=100: 초록+체크

**QR 마커**:
- 앞(F) QR: 골 하단 (복도 쪽)
- 뒤(B) QR: 골 상단
- lastScan에 따라 활성/비활성 색상

**`timeAgo()` 하드코딩 버그**: `const now = 10 * 60 + 25; // 10:25`  
→ 10:25를 현재 시각으로 하드코딩. DB 연결 시 `Date.now()` 기반으로 교체 필요. (교훈 77 참조)

---

## 항목 3 — MobileFloorScreen

### 케이스 판정: **Y** (attendanceStore 출근 통계만, 평면도 미포함)

**위치**: `src/pages/mobile/AdminMobilePages.jsx` — `MobileFloorScreen` 함수

**현재 코드** (73-C에서 교체된 상태):
```jsx
// attendanceStore 출근 인원 집계
const todayStats = useMemo(() => ({
  total:   branchEmps.length,
  present: branchEmps.filter(e => checkedInIds.has(e.id)).length,
  absent:  branchEmps.filter(e => !checkedInIds.has(e.id)).length,
}), [records, employees, today, branch]);

// UI: StatTile 3개(출근/미출근/전체) + "평면도 뷰 준비 중" CardBlock
```

**인터페이스 경계** (다음 트랙에서 교체할 부분):
- `CardBlock title="평면도 현황"` 내부 전체
- `src/pages/FloorPlan.jsx`에서 export된 `GreenhousePlan` 컴포넌트를 여기에 삽입 예정

---

## 항목 4 — 키워드 검색 결과

### 한글

| 키워드 | 건수 | 주요 발견 위치 |
|--------|------|---------------|
| "거터" | 56건 | `floor-schema.js`(주석), `FloorPlan.jsx`(양쪽) |
| "측면" | 0건 | 코드에서는 'rightDown'/'leftUp' phase 명칭 사용 |
| "스캔" | 62건 | `QrScanPage.jsx`, `FloorPlan.jsx`(양쪽), 주석 |

### 영문

| 키워드 | 건수 | 주요 발견 위치 |
|--------|------|---------------|
| `gutter` | 41건 | `floor-schema.js`, `FloorPlan.jsx`(양쪽) — gutterW, gutterNumber |
| `scan` | 6개 파일 | `useFloorData.js`(qr_scans), `floor-schema.js`(SCAN_HISTORY) |
| `interpolat` | 0건 | `predictPosition()`로 대체 |
| `progress_pct` | 0건 | 정수 `progress` 필드 사용 (0/50/100) |
| `qr_code` | 7건 | `useFloorData.js`(qr_codes 관계), `floor-schema.js`(QR_INVENTORY) |
| `gutter_id` | 0건 | `gol` 필드로 식별 |
| `side` | 복수 | `floor-schema.js`(side: 'F'|'B'), `useFloorData.js`(qr_codes.side) |

### 보조 키워드

| 키워드 | 발견 |
|--------|------|
| `rightDown` / `leftUp` | `src/pages/FloorPlan.jsx` (active) — phase 명칭 |
| `predictPosition` | `src/pages/FloorPlan.jsx`(active), `src/pages/admin/FloorPlan.jsx`(dead) |
| `speed_factor` | `useFloorData.js`(employees.speed_factor 쿼리), `floor-schema.js`(WORKER_SPEED_FACTOR) |
| `QrScanPage` | `src/pages/worker/QrScanPage.jsx` — 작업자 앱 QR 스캔 UI 존재 |

---

## 항목 5 — docs/ 도메인 문서

### DOMAIN_*.md 현황

| 파일 | 내용 |
|------|------|
| `docs/DOMAIN_CHATBOT_V1.md` | 챗봇 v1 도메인 |
| `docs/DOMAIN_DAILY_WORKERS.md` | 일용직 임금 도메인 |
| `docs/DOMAIN_TRACK_J_ACCOUNTS.md` | 계정 정리 도메인 |
| 평면도/거터 전담 도메인 문서 | **없음** |

### LESSONS_LEARNED.md 관련 교훈

| 키워드 | 결과 |
|--------|------|
| "평면도" / "거터" / "골" | **0건** |
| "QR" / "위치" | **0건** (QR 언급은 있으나 위치 추적 관련 교훈 없음) |

→ 평면도+QR 위치 추적 관련 **교훈 0건** — 이 트랙이 완전히 새로운 영역임을 의미.

### HANDOVER_SESSION73_FINAL.md 관련 언급

- "두 가지 QR 구분": 로그인 QR(완료) vs 위치 QR(Tier 6 예정) 명시
- "2순위: 평면도 + QR 위치 추적": MOBILE-FLOOR-001 + PC-FLOOR-DATA-001 동시 해소 예정
- TRACK-L-G-MERGE-001: Track L + Track G 통합 검토 필요

### PC-FLOOR-DATA-001 BACKLOG 오기 확인

PC-FLOOR-DATA-001 설명: "PC FloorPlan도 floor-schema.js mock 데이터 전용"  
**실제**: active 라우트(`src/pages/FloorPlan.jsx`)는 `useFloorData.js` 사용.  
floor-schema.js를 사용하는 것은 dead code 파일(`src/pages/admin/FloorPlan.jsx`).  
→ BACKLOG 설명 갱신 필요.

---

## 항목 6 — Supabase 마이그레이션 스키마

### 테이블별 마이그레이션 존재 여부

| 테이블 | 마이그레이션 | 비고 |
|--------|-------------|------|
| `zones` | ✅ 존재 (`20260408121000_rls_group_a_reference.sql`) | RLS 정책만. CREATE TABLE 없음. branch 컬럼 없음(RLS-DEBT-006) |
| `greenhouses` | ❌ **없음** | useFloorData.js에서 쿼리하나 DB에 없음 |
| `qr_codes` | ❌ **없음** | useFloorData.js join 대상이나 DB에 없음 |
| `qr_scans` | ❌ **없음** | useFloorData.js 메인 쿼리 대상이나 DB에 없음 |
| `gutters` | ❌ **없음** | floor-schema.js HOUSE_CONFIG에만 존재 |
| `gutter_progress` | ❌ **없음** | 코드에도 없음 |
| `worker_locations` | ❌ **없음** | 코드에도 없음 |
| `employees.speed_factor` | ❌ **없음** | useFloorData.js에서 SELECT하나 컬럼 마이그레이션 없음 |

### 결론

`useFloorData.js`가 쿼리하는 3개 테이블(`greenhouses`, `qr_codes`, `qr_scans`) 모두 DB에 없음.  
→ 현재 production의 `/admin/floor`는 **빈 화면** (EMPTY_DATA 반환).  
→ FloorPlan UI + 로직은 완성됐으나 DB 계층이 0%.

### zones 테이블 현황

`zones` 테이블은 마이그레이션에서 RLS 정책 대상으로 언급되므로 존재하나,  
평면도 도메인에서 쓸 컬럼(`gol`, `qr_code`, `greenhouse_id` 등)이 없음.  
현재 zones는 "안전 점검 구역" 용도로만 사용됨 (RLS-DEBT-006 참조).

---

## 항목 7 — Track G (포장 작업)

### 케이스 판정: **Z'** (라우트 등록 + UI 뼈대 존재, 기능 0건)

### 현황

| 파일 | 상태 |
|------|------|
| `src/pages/admin/PackagingTasksPage.jsx` | 플레이스홀더 (Phase 4 예정) |
| `src/pages/admin/PackagingRecordsPage.jsx` | 플레이스홀더 (Phase 4 예정) |
| `src/App.jsx:199~200` | `/admin/packaging-tasks`, `/admin/packaging-records` 라우트 등록 |
| `src/components/layout/Sidebar.jsx` | "포장 관리" 그룹 + 두 링크 |
| `src/components/layout/AdminBottomNav.jsx` | "포장 작업 지시", "포장 실적" 항목 |

→ 라우트·사이드바·바텀탭까지 연결됐으나 페이지 본문은 빈 플레이스홀더.

### QrScanPage.jsx 발견

`src/pages/worker/QrScanPage.jsx` — 작업자 앱 QR 스캔 UI 파일 존재.  
→ 작업자가 QR을 스캔하는 UI가 이미 있음. 백엔드 연결(qr_scans 테이블) 필요.

### TRACK-L-G-MERGE-001 판단 근거

- Track L (거터 QR): **작업자 동선 기록** — QrScanPage + qr_scans + greenhouses
- Track G (포장): **포장 작업 관리** — PackagingTasksPage + PackagingRecordsPage
- 공유 테이블: `employees`, `tasks` 정도. DB 스키마 겹침 없음.
- 겹치는 영역: 작업 흐름 재설계(골 단위 vs 박스 단위). UI 패턴은 다름.
- **권장**: TRACK-L-G-MERGE-001은 Track L 설계 확정 후 재판단. 지금 당장 통합할 필요 없음.

---

## 발견 사항 요약 + 도메인 흐름 일치/불일치 표

| 구성 요소 | 케이스 | 핵심 발견 | 설계 결정 필요 |
|-----------|--------|-----------|----------------|
| floor-schema.js | Z' | 100% mock, dead code 전용 import | 정리 가능 (향후) |
| useFloorData.js | Y | Supabase 쿼리 완성, DB 테이블 0건 | DB 마이그레이션 필수 |
| PC FloorPlan (active) | Y | UI+로직 완성(위치예측/F-B-F/0-50-100%), DB 없어 빈 화면 | DB 마이그레이션 필수 |
| PC FloorPlan (dead code) | Z' | floor-schema.js import, App.jsx 미등록 | 삭제 또는 병합 검토 |
| MobileFloorScreen | Y | attendanceStore 출근 통계만, GreenhousePlan 미삽입 | GreenhousePlan 이식 |
| zones 테이블 | Z' | 존재하나 골/QR/온실 매핑 컬럼 없음 | 신규 테이블 설계 필요 |
| greenhouses 테이블 | Z | 미존재 | 마이그레이션 신규 |
| qr_codes 테이블 | Z | 미존재 | 마이그레이션 신규 |
| qr_scans 테이블 | Z | 미존재 | 마이그레이션 신규 |
| employees.speed_factor | Z | 미존재 | ALTER TABLE 추가 |
| QrScanPage.jsx | Y | 파일 존재, qr_scans 연결 미완 | DB 연결 |
| Track G (포장) | Z' | 라우트/사이드바 등록, 기능 0건 | TRACK-L-G-MERGE-001 판단 후 |

---

## 세션 74-A 작업 순서 권장

### 1단계 — DB 마이그레이션 (블로커)

다음 테이블을 신규 마이그레이션으로 생성:

**필수**:
```sql
greenhouses (id, code, name, branch, crop_id, gutters, gols, has_right_gol, is_hanging, gol_length_m, is_active)
qr_codes    (id, greenhouse_id FK, gol INT, side CHAR(1) CHECK(side IN ('F','B')), status, issued_at)
qr_scans    (id, qr_code_id FK, employee_id FK, scan_type, scanned_at)
```

**추가**:
```sql
ALTER TABLE employees ADD COLUMN speed_factor NUMERIC DEFAULT 1.0;
```

**시드**:
```sql
-- 부산LAB 온실 4개 (1cmp/2cmp/3cmp/4cmp) + QR 코드 인벤토리
```

### 2단계 — PC FloorPlan 빈 화면 해소

- `greenhouses` 시드 투입 후 `/admin/floor` 실 데이터 표시 확인
- `timeAgo()` 하드코딩 `10:25` → `Date.now()` 기반 수정 (교훈 77)
- `src/pages/admin/FloorPlan.jsx` (dead code) 삭제 또는 arch 폴더로 이동

### 3단계 — 작업자 QR 스캔 흐름

- `QrScanPage.jsx` → qr_scans INSERT 연결
- scan_type 판정 로직: F 1차=start, B=half, F 2차=complete
- RLS: 작업자는 자신의 스캔만 INSERT 가능

### 4단계 — 모바일 평면도

- `MobileFloorScreen`의 "준비 중" CardBlock → `GreenhousePlan` 컴포넌트 삽입
- 모바일 반응형 조정 (pinch zoom 등)

---

## 질의 항목 (사용자 결정 대기)

1. **dead code 파일 처리**: `src/pages/admin/FloorPlan.jsx` — 삭제? 아니면 `src/pages/archive/`로 이동?
2. **speed_factor 위치**: `employees` 컬럼 추가 vs 별도 `worker_performance_config` 테이블?
3. **QR 코드 상태값**: floor-schema.js에 `'active'|'damaged'|'lost'|'retired'` 4종 — DB enum으로 확정?
4. **greenhouses.branch**: `busan` 하드코딩 필터 — 진주/하동 온실 생기면 어떻게 분기?
5. **TRACK-L-G-MERGE-001**: Track L 진입 시 Track G 통합 여부 — 이번 트랙에서 판단 가능?
6. **PC-FLOOR-DATA-001 BACKLOG 설명 갱신**: "floor-schema.js mock 전용"이라는 잘못된 설명 수정 필요.
7. **FLOOR-SCHEMA-SKIP-001 BACKLOG**: "파일 미생성"이라는 wontfix 항목인데 파일이 실존 — open으로 재분류?

---

**조사 완료**: 2026-04-27  
**범위**: `src/` + `docs/` + `supabase/migrations/` 전수 (7개 항목, 직접 교차 검증)
