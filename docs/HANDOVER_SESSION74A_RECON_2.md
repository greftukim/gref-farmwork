# 세션 74-A 추가 정찰 보고서 — 74-B 게이트 결정용

**조사일**: 2026-04-27  
**기준 커밋**: 9a3dd4c (RECON_1과 동일)  
**이전 보고서**: `docs/HANDOVER_SESSION74A_RECON.md`  
**목적**: 74-B(DB 마이그레이션) 착수 전 설계 결정에 필요한 10개 세부 항목 추가 수집

---

## 항목 1 — useFloorData.js 실제 SELECT 구문 (컬럼 후보 확정)

RECON_1에서 테이블 존재 여부를 확인했고, 이번에는 **정확한 SELECT 절**을 수집.

```js
// src/hooks/useFloorData.js

// greenhouses (line 109)
supabase.from('greenhouses')
  .select('*, crops(name)')          // ← crops 테이블 JOIN 존재
  .eq('branch', 'busan')
  .eq('is_active', true)

// employees (line 116)
supabase.from('employees')
  .select('id, name, role, speed_factor')
  .eq('branch', 'busan')

// qr_scans (line 120)
supabase.from('qr_scans')
  .select('*, qr_codes(gol, side, greenhouse_id)')  // ← qr_codes 역참조 JOIN
  .gte('scanned_at', todayISO)
```

**핵심 발견**:
- `greenhouses` → `crops(name)` FK JOIN 필요 (crops 테이블은 이미 존재)
- `qr_scans` → `qr_codes(gol, side, greenhouse_id)` 역참조 JOIN 필요 → qr_codes에 이 3개 컬럼 필수
- `employees.speed_factor` 컬럼을 직접 SELECT — 없으면 silently null (JS `?? 1.0` fallback)

> **즉시 활용 가능한 결정값**
>
> | 테이블 | 필수 컬럼 | 근거 |
> |--------|-----------|------|
> | `greenhouses` | `id, branch, is_active, crop_id(FK→crops)` + 골/거터 메타 | select('*') + crops(name) |
> | `qr_codes` | `id, greenhouse_id(FK), gol INT, side TEXT` | qr_scans JOIN 역참조 |
> | `qr_scans` | `id, qr_code_id(FK), employee_id(FK), scan_type TEXT, scanned_at TIMESTAMPTZ` | select 및 insert |
> | `employees` | `speed_factor NUMERIC DEFAULT 1.0` (ALTER ADD COLUMN) | select 'speed_factor' |

---

## 항목 2 — FloorPlan.jsx 오른쪽 패널 + GolDetail (lines 462~749)

### 오른쪽 패널 구조

```
선택 없을 때:
  └── [지금 작업 중 N명] 목록 (allWorking, 예상 종료순)
       └── 각 항목 클릭 → setHouse(g.house) + setSelectedGol(g.gol)

  └── [배정 진행] 카드 (ACTIVE_ASSIGNMENTS 기반)
       └── 현재 ACTIVE_ASSIGNMENTS = [] (항상 빈 상태)

골 선택 시:
  └── GolDetail 컴포넌트 (오른쪽 패널 전체 교체)
```

### GolDetail 패널 세부 (코드 완전 확인)

| 섹션 | 내용 |
|------|------|
| 상태 뱃지 | 완료/작업중/반완료/대기 + 이상⚠ Pill |
| 일시정지 배너 | 노란 박스. "강제 재개"/"메모 추가" 버튼 — 둘 다 `alert('준비 중')` |
| 위치 예측 | worker.color 배경. `pos.phase` → "오른쪽 거터/왼쪽 거터" + 잔여분 바 |
| 진행률 바 | `g.progress + pos.frac×50` 합산. `← 큰번호 / 작은번호 →` 라벨 |
| 작업자 카드 | 아바타 + 이름/역할/속도계수 + 시작/실작업/휴식 grid |
| 휴식 이력 | `g.pauseHistory[]` → `from—to · reason` monospace 목록 |
| 이상 신고 | 빨간 박스. "생육조사 이상 기록으로 연결" → `/admin/growth/input` |
| QR 스캔 이력 | `g.scanHistory[]` → `{at, side, by}` 목록. side 'F'→"앞QR(시작)", 'B'→"뒤QR(반완료)", 'F-again'→"앞QR재스캔·완료" |
| 하단 버튼 | "작업자 재배정"(준비중), "생육 상세"(→ /admin/growth) |
| QR 스캔 규칙 안내 | 처음→시작, 뒤QR→오른쪽거터완료, 앞QR재스캔→선택창, 정지후재스캔→재개 |

**핵심 발견**:
- `ACTIVE_ASSIGNMENTS` 가 이미 hook 반환에 포함되지만 항상 `[]` → 배정 진행 카드 기능은 별도 설계 필요
- `g.pauseHistory`, `g.pauseTotalMin`, `g.pausedAt`, `g.pauseReason`, `g.hasIssue`, `g.issueNote` — 모두 qr_scans에서 파생해야 할 필드들
- QR 스캔 이력의 `side` 레이블이 UI 안내와 1:1 매핑됨 → DB scan_type과 side 분리 설계 필수

> **즉시 활용 가능한 결정값**
>
> - GolDetail의 `g` 오브젝트 필드 목록 = qr_scans에서 집계해야 할 컬럼 목록
>   `{currentWorker, taskType, progress, lastScan, startedAt, completedAt, pausedAt, pauseTotalMin, pauseHistory[], hasIssue, issueNote, scanHistory[]}`
> - ACTIVE_ASSIGNMENTS는 이번 트랙(74-A/B) 범위 밖. UI에 빈 카드만 허용.
> - "강제 재개", "작업자 재배정", "메모 추가" 버튼 — 현재 alert(준비중). 이번 트랙 scope 아님.

---

## 항목 3 — QrScanPage.jsx 현황 (작업자 앱 QR 스캔)

### 라우트 + 레이아웃

| 속성 | 값 |
|------|-----|
| 파일 위치 | `src/pages/worker/QrScanPage.jsx` (286줄) |
| 라우트 경로 | `/admin/m/qr-scan` |
| 레이아웃 | **AdminLayout** (worker layout 아님) — 바텀탭 없음 |
| 라이브러리 | `html5-qrcode` (npm) |

### 핵심 로직

```js
const onScanSuccess = async (decodedText) => {
  // 1. QR payload = plain UUID = qr_codes.id
  const { data: qrCode } = await supabase
    .from('qr_codes')
    .select('id, greenhouses(name)')
    .eq('id', decodedText.trim())
    .single();

  // 2. qr_scans INSERT — scan_type 하드코딩
  await supabase.from('qr_scans').insert({
    qr_code_id: qrCode.id,
    employee_id: currentUser?.id,
    scanned_at: new Date().toISOString(),
    scan_type: 'task_start',          // ← 항상 'task_start', F/B/complete 판정 없음
  });
};

// 오늘 스캔 이력 (QrScanPage 상단)
supabase.from('qr_scans')
  .select('*, qr_codes(*, greenhouses(name))')
  .eq('employee_id', currentUser.id)
  .gte('scanned_at', today)
```

**핵심 발견**:
- scan_type이 `'task_start'` 하드코딩 — useFloorData의 `'start'|'half'|'complete'|'switch'`와 **불일치**
- F/B 판정 로직(첫 스캔=F, 뒤 QR=B, 재스캔=complete) 미구현
- 이 로직은 74-B 이후 74-C(QR 스캔 흐름 완성) 에서 구현

> **즉시 활용 가능한 결정값**
>
> - qr_scans.scan_type CHECK constraint: `('start', 'half', 'complete', 'switch', 'pause', 'resume')` — `'task_start'`, `'task_end'` 는 포함하지 말 것 (기존 하드코딩 값이므로 74-C에서 수정)
> - 또는: CHECK constraint 없이 TEXT로 시작 → 74-C에서 constraint 추가 (더 안전)
> - INSERT 컬럼 4개 확정: `{qr_code_id, employee_id, scanned_at, scan_type}`

---

## 항목 4 — employees.speed_factor 사용 범위

| 위치 | 라인 | 용도 |
|------|------|------|
| `src/hooks/useFloorData.js` | 116 | SELECT 쿼리 대상 |
| `src/hooks/useFloorData.js` | 156 | `WORKER_SPEED_FACTOR[e.id] = e.speed_factor ?? 1.0` 매핑 |
| `src/pages/FloorPlan.jsx` | 489, 661 | `predictPosition()` 인자로 전달 → 위치 보정 계수 |
| `src/data/floor-schema.js` | WORKER_SPEED_FACTOR 객체 | mock: w01=0.92, w02=0.95 등 |

**속도 계수 역할**:
- `predictPosition()` 내 `secPerM = TASK_TYPES[taskType].speedSecPerM × factor`
- factor < 1.0 → 빠른 작업자 (더 많이 진행됨), factor > 1.0 → 느린 작업자
- 현재 floor-schema.js mock 범위: 0.85 ~ 1.15

> **즉시 활용 가능한 결정값**
>
> - `ALTER TABLE employees ADD COLUMN speed_factor NUMERIC(4,2) NOT NULL DEFAULT 1.00;`
> - DEFAULT 1.0 = 기준속도. NULL 방지 → NOT NULL DEFAULT 1.0
> - 별도 테이블 불필요. employees 단일 컬럼으로 충분 (5~10명 소규모).
> - 1차 RECON 질의 2번 → **employees 컬럼 추가로 결정**

---

## 항목 5 — 테이블별 참조 파일 전수

### greenhouses 테이블

| 파일 | 라인 | 목적 |
|------|------|------|
| `src/hooks/useFloorData.js` | 109 | SELECT `*, crops(name)` — 온실 목록 + 작물명 |
| `src/pages/MarkerPlantManagePage.jsx` | 143 | SELECT `id, name` — 마커 관리 |

→ MarkerPlantManagePage도 `greenhouses`에 의존. 마이그레이션 생성 시 즉시 연결됨.

### qr_codes 테이블

| 파일 | 라인 | 목적 |
|------|------|------|
| `src/pages/worker/QrScanPage.jsx` | 49 | SELECT `id, greenhouses(name)` — QR UUID → 온실 이름 조회 |
| `src/hooks/useFloorData.js` | 120 | qr_scans JOIN에서 역참조 `qr_codes(gol, side, greenhouse_id)` |

### qr_scans 테이블

| 파일 | 라인 | 목적 |
|------|------|------|
| `src/hooks/useFloorData.js` | 120 | SELECT 오늘 스캔 + JOIN qr_codes |
| `src/pages/worker/QrScanPage.jsx` | 24 | SELECT 오늘 스캔 이력 (작업자 본인) |
| `src/pages/worker/QrScanPage.jsx` | 59 | INSERT 새 스캔 |

> **즉시 활용 가능한 결정값**
>
> - 3개 테이블 모두 **즉시 참조 코드 존재**. 마이그레이션 후 추가 코드 변경 없이 연결됨.
> - 단, QrScanPage의 scan_type 값 불일치는 별도 수정 필요 (항목 3 참조).
> - MarkerPlantManagePage — greenhouses 테이블 참조 중. 이 파일도 마이그레이션 후 검증 대상에 추가.

---

## 항목 6 — timeAgo() / minSinceScan() 하드코딩 위치

### 소스 (src/pages/FloorPlan.jsx — active)

```js
// line 14-17: timeAgo()
const timeAgo = (hhmm) => {
  const now = 10 * 60 + 25;          // ← '10:25' 하드코딩 (교훈 77 위반)
  const [h, m] = hhmm.split(':').map(Number);
  const diff = now - (h * 60 + m);
  return diff <= 0 ? '방금' : `${diff}분 전`;
};

// line 25-28: minSinceScan()
const minSinceScan = (hhmm) => {
  const [h, m] = hhmm.split(':').map(Number);
  return Math.max(0, (10 * 60 + 25) - (h * 60 + m));  // ← 동일 하드코딩
};
```

### 히스토리 슬라이더도 하드코딩

```js
// line ~450 (GreenhousePlan 내)
<input type="range" min={480} max={625} step={5} ... />
//   min=480 → 08:00, max=625 → 10:25 (둘 다 하드코딩)
```

### 수정안

```js
// Date.now() 기반으로 교체
const nowMin = () => {
  const d = new Date();
  return d.getHours() * 60 + d.getMinutes();
};

const timeAgo = (hhmm) => {
  const now = nowMin();
  ...
};

// 슬라이더 max: 현재 분 단위로 동적 계산
const currentMin = nowMin();
<input type="range" min={480} max={currentMin} step={5} ... />
```

> **즉시 활용 가능한 결정값**
>
> - `timeAgo()`, `minSinceScan()` 두 함수 모두 `Date.now()` 기반으로 교체 — 74-B 범위에 포함
> - 슬라이더 max도 동적 계산 필요 (정적 `625`는 슬라이더가 10:25 이후 늘어나지 않음)
> - 동일 버그가 dead code 파일(`src/pages/admin/FloorPlan.jsx`)에도 존재 — 파일 삭제 시 자동 해소

---

## 항목 7 — 빈 화면 조건 + 해소 경로

### 현재 빈 화면 원인 체인

```
useFloorData() 쿼리 → greenhouses 테이블 없음 → Supabase error
→ catch → EMPTY_DATA 반환 (에러 무음 처리)
→ FloorPlanScreen: if (!HOUSE_CONFIG.length) return <div>데이터가 없습니다</div>
→ /admin/floor 접속 시 "데이터가 없습니다" 텍스트만 표시
```

**`EMPTY_DATA` 구조**:
```js
const EMPTY_DATA = {
  HOUSE_CONFIG: [],      // ← 이 [] 가 빈 화면 트리거
  WORKERS_MAP: [],
  WORKER_SPEED_FACTOR: {},
  FIELD_STATE: { gols: [] },
  TASK_TYPES: {},
  GOL_LENGTH_M: 20,
  ACTIVE_ASSIGNMENTS: [],
};
```

### 해소 경로

```
greenhouses 마이그레이션 + 시드 투입
→ useFloorData 쿼리 성공
→ HOUSE_CONFIG 4개 항목 반환
→ GreenhousePlan 렌더링 → PC 평면도 화면 복원
```

> **즉시 활용 가능한 결정값**
>
> - 추가 코드 변경 없이 **시드 데이터 투입만으로 PC 평면도 화면 즉시 복원**
> - "데이터가 없습니다" 분기 제거 불필요 (시드 후 자연 해소)
> - MarkerPlantManagePage도 greenhouses 참조 → 동시 복원 예상

---

## 항목 8 — Track G (포장 작업) 결합도

| 파일 | 상태 | Floor 결합도 |
|------|------|------------|
| `src/pages/admin/PackagingTasksPage.jsx` | "Phase 4 예정" 플레이스홀더 | **0건** |
| `src/pages/admin/PackagingRecordsPage.jsx` | "Phase 4 예정" 플레이스홀더 | **0건** |
| App.jsx 라우트 | 등록 완료 | 독립 경로 |
| Sidebar | "포장 관리" 그룹 | 독립 메뉴 |

공유 테이블: `employees`, `tasks` 정도. `greenhouses`/`qr_codes`/`qr_scans` 겹침 **없음**.

> **즉시 활용 가능한 결정값**
>
> - **TRACK-L-G-MERGE-001 해소**: DB 스키마 겹침 없음 → 별도 트랙 확정
> - Track L(거터 QR 위치 추적) 완료 후 Track G 독립 설계
> - 이번 74-A/B 범위에 Track G 포함 불필요

---

## 항목 9 — 시드 데이터 행 수 추정

### greenhouses

| 동 코드 | 이름 | 골 수 | 거터 수 | 작물 | 특이사항 |
|--------|------|------|--------|------|---------|
| `1cmp` | 1동 | 10 | 10 | 토마토 | hasRightGol=true |
| `2cmp` | 2동 | 10 | 10 | 토마토 | hasRightGol=true |
| `3cmp` | 3동 | 7 | 8 | 딸기 | — |
| `4cmp` | 4동 | 19 | 20 | 파프리카 | hanging=true |

**행 수: 4행** (부산 LAB 전용. 진주/하동은 운영 시작 후 추가)

### qr_codes

| 동 | 골 수 | QR 수 (×2) |
|----|------|-----------|
| 1동 | 10 | 20 |
| 2동 | 10 | 20 |
| 3동 | 7 | 14 |
| 4동 | 19 | 38 |
| **합계** | **46** | **92** |

각 골당 앞(F) + 뒤(B) 2개 = **92행**

### qr_scans

시드 불필요. 실 스캔 시 INSERT됨. 초기 0행.

### employees.speed_factor

기존 행에 DEFAULT 1.0 적용. 별도 INSERT 불필요.

> **즉시 활용 가능한 결정값**
>
> - 마이그레이션 시드: `greenhouses` 4행 + `qr_codes` 92행
> - 시드 SQL에 UUID 하드코딩 금지 (교훈 28). DO 블록 + 서브쿼리 변수화 필수.
> - qr_codes 시드: `FOR gol IN 1..gols LOOP INSERT {greenhouse_id, gol, side='F'} + {side='B'} END LOOP` 패턴 권장

---

## 항목 10 — RLS 패턴 참조 (기존 테이블과의 일치성)

### 기존 RLS 패턴 (attendance, safety_checks)

```sql
-- attendance (20260408127000_rls_group_f2_attendance.sql)
CREATE POLICY "attendance_anon_insert"
ON public.attendance FOR INSERT TO anon
WITH CHECK (
  employee_id IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.employees
    WHERE id = employee_id AND role = 'worker' AND is_active = true
  )
);

-- safety_checks (20260410100000_safety_checks.sql)
CREATE POLICY "safety_checks_anon_insert"
ON public.safety_checks FOR INSERT TO anon
WITH CHECK (
  worker_id IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.employees
    WHERE id = worker_id AND role = 'worker' AND is_active = true
  )
  AND date >= CURRENT_DATE - INTERVAL '1 day'
  AND date <= CURRENT_DATE + INTERVAL '1 day'
);
```

### qr_scans RLS 초안 (참조 패턴 적용)

```sql
-- qr_scans: anon INSERT (작업자 본인, 오늘 스캔만)
CREATE POLICY "qr_scans_anon_insert"
ON public.qr_scans FOR INSERT TO anon
WITH CHECK (
  employee_id IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.employees
    WHERE id = employee_id AND role = 'worker' AND is_active = true
  )
  AND scanned_at >= CURRENT_DATE::TIMESTAMPTZ
  AND scanned_at < (CURRENT_DATE + INTERVAL '1 day')::TIMESTAMPTZ
);

-- qr_scans: anon SELECT (오늘 자신의 스캔 이력)
CREATE POLICY "qr_scans_anon_select"
ON public.qr_scans FOR SELECT TO anon
USING (
  scanned_at >= CURRENT_DATE::TIMESTAMPTZ
  AND EXISTS (
    SELECT 1 FROM public.employees
    WHERE id = employee_id AND role = 'worker' AND is_active = true
  )
);

-- qr_scans: authenticated SELECT (관리자 전체 조회)
CREATE POLICY "qr_scans_auth_select"
ON public.qr_scans FOR SELECT TO authenticated
USING (true);  -- 지점 필터는 앱 레벨

-- greenhouses: 전체 SELECT (읽기 전용 참조 테이블)
CREATE POLICY "greenhouses_select_all"
ON public.greenhouses FOR SELECT TO anon, authenticated
USING (true);

-- qr_codes: 전체 SELECT (읽기 전용 참조 테이블)
CREATE POLICY "qr_codes_select_all"
ON public.qr_codes FOR SELECT TO anon, authenticated
USING (true);
```

> **즉시 활용 가능한 결정값**
>
> - RLS 패턴 기존 파일과 완전 일치 → 그대로 복사 적용 가능
> - `greenhouses`, `qr_codes`: INSERT/UPDATE/DELETE 정책 불필요 (관리자만 Supabase 대시보드에서 직접 수정)
> - `qr_scans`: anon INSERT + anon SELECT(오늘 자신) + authenticated SELECT(전체) — 3개 정책으로 충분

---

## 정찰값 → 게이트 답변 매핑 표 (RECON_1 7개 질의)

| # | RECON_1 질의 | RECON_2 수집값 | 권장 결정 |
|---|-------------|---------------|----------|
| 1 | `src/pages/admin/FloorPlan.jsx` 삭제? 이동? | active 파일과 동일한 predictPosition 로직 존재. 단, floor-schema.js import → 동작 안 함. App.jsx 미등록. | **삭제** (dead code, 참조 없음, 리스크 0) |
| 2 | speed_factor: employees 컬럼 vs 별도 테이블? | useFloorData.js가 이미 `employees.select('speed_factor')` 직접 쿼리. 5~10명 소규모. | **employees 컬럼** `ALTER TABLE ADD COLUMN speed_factor NUMERIC(4,2) NOT NULL DEFAULT 1.00` |
| 3 | QR 코드 상태값 4종(`active/damaged/lost/retired`) DB enum 확정? | QrScanPage는 status 컬럼 미조회. useFloorData.js도 status 미사용. | **1차는 TEXT DEFAULT 'active'** (enum 강제 안 함). 물리 QR 관리 기능 추가 시 확장. |
| 4 | `greenhouses.branch`: busan 하드코딩 → 진주/하동 분기? | useFloorData.js `.eq('branch', 'busan')` 현재 하드코딩. 진주/하동 온실 계획 미확정. | **현행 유지**. 다지점 시 branch 파라미터 주입으로 확장 (최소 코드 변경). |
| 5 | TRACK-L-G-MERGE-001: Track L 진입 시 Track G 통합? | DB 스키마 겹침 없음. 포장 페이지 완전 플레이스홀더. | **분리 확정**. TRACK-L-G-MERGE-001 → 해소(wontfix). |
| 6 | PC-FLOOR-DATA-001 BACKLOG 설명 갱신 | active 파일은 useFloorData 사용 확인. | **BACKLOG 즉시 수정**: "active 라우트는 useFloorData. dead code만 floor-schema.js 사용." |
| 7 | FLOOR-SCHEMA-SKIP-001(wontfix): 파일 미생성이라는데 실존 | 파일 `src/data/floor-schema.js` 실존. dead code 파일 전용 mock. | **BACKLOG 갱신**: "실존. dead code FloorPlan 삭제 시 함께 삭제 가능." open → 74-B에서 해소. |

---

## 신규 질의 항목 (RECON_2에서 발견)

| # | 질의 | 발견 근거 |
|---|------|---------|
| A | QrScanPage `/admin/m/qr-scan` — AdminLayout 하위(바텀탭 없음). 작업자가 이 경로로 실제 진입 가능한가? 진입 경로가 있는가? | QrScanPage route 확인 시 발견. 사이드바/바텀탭 링크 없음. |
| B | `ACTIVE_ASSIGNMENTS` 배정 진행 카드: useFloorData에서 항상 `[]` 반환. 이 기능은 어떤 트랙에서 구현하는가? | GolDetail 패널 분석 중 발견. |
| C | QrScanPage의 `scan_type: 'task_start'` → DB CHECK constraint와 충돌. 74-B에서 constraint 없이 TEXT로 생성? 아니면 74-C에서 수정 후 74-B에서 constraint 추가? | 항목 3 + 항목 10 비교 시 발견. |
| D | `timeAgo()` 슬라이더 max도 동적으로 수정 시: 실시간으로 max가 늘어나 슬라이더가 자동 확장됨. 이것이 원하는 UX인가? | 항목 6 수정안 작성 중 발견. |

---

## 74-B 마이그레이션 직전 체크리스트

### 스키마 설계 전

- [ ] `crops` 테이블 컬럼 확인: `greenhouses`에서 `crops(name)` JOIN 사용 → `crops.id` FK 적용 가능한지
- [ ] QrScanPage `scan_type: 'task_start'` 불일치 → **CHECK constraint 없이 TEXT로 생성** (신규 질의 C 해소)
- [ ] 신규 질의 A(QrScanPage 진입 경로) 사용자 답변 수신

### 마이그레이션 SQL 작성 전

- [ ] BACKLOG ID 중복 검사: `grep -oE "[A-Z]+-[A-Z]*-?[0-9]+" docs/BACKLOG.md | sort | uniq -d`
- [ ] LESSONS 번호 연속성 확인: `grep -E "^## 교훈 [0-9]+" docs/LESSONS_LEARNED.md`
- [ ] `greenhouses`, `qr_codes`, `qr_scans`, `employees.speed_factor` — 4개 대상 모두 migration 파일에 포함

### SQL 작성 규칙 (교훈 35·37 적용)

- [ ] BEGIN/COMMIT 트랜잭션 래핑
- [ ] 검증 DO 블록 + 롤백 주석 포함
- [ ] 시드 UUID 하드코딩 금지 — DO 블록 + 서브쿼리 변수화 (교훈 28)
- [ ] qr_codes 시드: PL/pgSQL LOOP로 1~gols 순회 생성

### 배포 후 검증

- [ ] `/admin/floor` 접속 → "데이터가 없습니다" 사라지고 4개 동 표시 확인
- [ ] `MarkerPlantManagePage` 온실 목록 표시 확인 (greenhouses 동시 복원)
- [ ] QrScanPage에서 QR 스캔 → qr_scans INSERT 확인 (테스트 QR: qr_codes.id 사용)
- [ ] timeAgo() 하드코딩 수정 후 현재 시각 기반으로 "N분 전" 표시 확인
- [ ] PC-FLOOR-DATA-001, FLOOR-SCHEMA-SKIP-001 BACKLOG 상태 갱신

---

**조사 완료**: 2026-04-27  
**범위**: FloorPlan.jsx(전체 749줄), QrScanPage.jsx(286줄), useFloorData.js(184줄), RLS migration 2건, floor-schema.js 참조 대조  
**다음 단계**: 신규 질의 A·C 사용자 결정 → 74-B(DB 마이그레이션) 착수
