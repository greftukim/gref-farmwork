# GREF FarmWork — Phase 3 인수인계 문서

> 작성일: 2026-04-10
> 세션: Phase 3 (B-4 완료 + 트랙 D v1 + 트랙 C 전체)
> 다음 세션 시작점: **트랙 E (TBM 고도화)**

---

## 1. Phase 3 완료 커밋

| 순서 | 해시 | 설명 |
|------|------|------|
| 1 | `bc8bde4` | B-4: 관리자 기존 출근 기록 수정 기능 |
| 2 | `2ab280f` | 트랙 D v1: TBM 안전점검 시스템 전체 |
| 3 | `696b177` | 트랙 C Phase C-2: 부산LAB 컴파트먼트/거터/구역 입력 지원 |
| 4 | `ade5121` | 트랙 C Phase C-5: 생육조사 그래프 탭 |

---

## 2. 완료 내역 상세

### B-4: 관리자 기존 출근 기록 수정

- `AttendancePage.jsx`: 출근 기록 카드에 "수정" 버튼 추가
- `attendanceStore.js`: `updateRecord(id, updates)` 함수 추가
- 모바일/데스크톱 양쪽 뷰에서 수정 가능
- 수정 시 시간만 변경 (날짜, 작업자 변경 불가)

### 트랙 D v1: TBM 안전점검 시스템

**DB (supabase/migrations/20260410100000_safety_checks.sql)**:
- `safety_check_items`: 9개 기본 TBM 점검 항목 (시드 포함)
- `safety_checks`: 점검 헤더 (worker_id, check_date, check_type)
- `safety_check_results`: 점검 라인 (item_id, is_checked, note)
- RLS: anon INSERT/SELECT + authenticated SELECT

**Store (src/stores/safetyCheckStore.js)**:
- `fetchItems()`, `getTodayCheck(workerId, checkType)`, `saveCheck(...)`, `fetchByDate(date)`

**Worker UI (src/components/worker/SafetyCheckBottomSheet.jsx)**:
- 9개 항목 체크리스트, 전체 체크 시 제출 가능
- 출근 시 pre_work, 퇴근 시 post_work (pre_work 완료 시에만)

**Worker Flow (src/pages/worker/WorkerHome.jsx)**:
- 출근 버튼 → SafetyCheckBottomSheet(pre_work) → 실제 출근 처리
- 퇴근 버튼 → SafetyCheckBottomSheet(post_work) → 실제 퇴근 처리
- pre_work 미완료 시 post_work 스킵

**Admin (src/pages/admin/SafetyChecksPage.jsx)**:
- 날짜 선택 → 지점별 작업자 TBM 현황 (pre_work/post_work 상태)
- 모바일 카드 + 데스크톱 테이블 뷰

**Sidebar/Nav**:
- "안전 관리" 카테고리 (farm_admin/mgmt/master 메뉴)
- TBM 현황 + 안전 이슈 메뉴
- AdminBottomNav "더보기"에 TBM 현황 추가

**SafetyIssuesPage.jsx**: 플레이스홀더 (준비 중)

### 트랙 C: 부산LAB 생육조사 확장

**Phase C-1 (조사)**: zones/growth_surveys 구조 분석 완료. zone 테이블은 건드리지 않고 growth_surveys에만 위치 필드 추가하는 Option C 채택.

**Phase C-2a (DB)**:
- `supabase/migrations/20260410120000_growth_surveys_position_fields.sql`
- `compartment INT`, `gutter_number INT`, `position_number INT` 추가
- 인덱스: `idx_growth_surveys_compartment`, `idx_growth_surveys_crop_date`

**Phase C-2b (Worker UI)**:
- `GrowthSurveyPage.jsx` 전면 수정
- 부산 지점(`branch === 'busan'`): 컴파트먼트 select + 거터/구역 Stepper
- 기타 지점: 기존 구역/열/주 입력 유지
- `BUSAN_COMPARTMENTS` 상수: 1cmp 토마토, 2cmp 미니파프리카, 3cmp 오이, 4cmp 딸기
- 컴파트먼트 선택 → 작물 자동 매핑 → 해당 작물 조사 항목 로드
- 엔트리 카드: 부산 "1cmp G3 #5", 기타 "3열 5번주"
- positionNumber 자동 증가

**Phase C-3~C-4 (시드 + 검증)**: 태우가 Supabase SQL Editor에서 직접 실행.
- 156건 시드 데이터 (4작물 × 4cmp × 날짜)
- measurements JSONB 구조: `[{itemId, name, unit, value}]`

**Phase C-5 (그래프 탭)**:
- `GrowthSurveyAdminPage.jsx`에 "그래프" 탭 추가 (3번째 탭)
- 필터: 작물(부산 4종) / 컴파트먼트(전체+1~4) / 기간(1m/3m/6m/all)
- Recharts `LineChart` 기반 항목별 시계열 카드
- 컴파트먼트 전체 → 여러 라인(색 구분), 단일 → 평균 1라인
- 색상: 1cmp #ef4444, 2cmp #f59e0b, 3cmp #10b981, 4cmp #ec4899
- measurements JSONB에서 itemId 매칭으로 value 추출
- `connectNulls` 활성화, Legend는 라인 2개 이상일 때만 표시

---

## 3. 트랙 E 설계: TBM 고도화

> 다음 세션의 핵심 작업. 트랙 D v1 위에 실제 운영에 필요한 기능 보강.

### E-1: 점검 항목 관리 (Admin CRUD)

현재 `safety_check_items`는 마이그레이션 시드 9개로 고정.
관리자가 항목을 추가/수정/삭제할 수 있도록 Admin UI 추가.

**구현 위치**: `SafetyChecksPage.jsx` 내에 탭 또는 별도 섹션
**Store 변경**: `safetyCheckStore.js`에 `addItem`, `updateItem`, `deleteItem` 추가
**DB**: 기존 테이블 그대로 사용 (추가 마이그레이션 불필요)

### E-2: 안전 이슈 등록/관리

`SafetyIssuesPage.jsx` (현재 플레이스홀더) 구현.

**새 테이블 필요**: `safety_issues`
```sql
CREATE TABLE safety_issues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID REFERENCES employees(id),
  branch TEXT NOT NULL,
  issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
  category TEXT NOT NULL,        -- 'facility', 'equipment', 'environment', 'human', 'other'
  severity TEXT NOT NULL,         -- 'low', 'medium', 'high', 'critical'
  title TEXT NOT NULL,
  description TEXT,
  location TEXT,                  -- 자유 텍스트 (온실 내 위치)
  photos TEXT[] DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'open',  -- 'open', 'in_progress', 'resolved', 'closed'
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES employees(id),
  resolution_note TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

**RLS**: anon INSERT(본인) + SELECT(같은 지점), authenticated SELECT/UPDATE
**Store**: `safetyIssueStore.js`
**Admin UI**: 목록 + 상태 변경 + 조치 내용 기록
**Worker UI**: 이슈 신고 (기존 IssuePage와 별개, 안전 특화)

### E-3: TBM 통계 대시보드

`SafetyChecksPage.jsx`에 통계 뷰 추가 (또는 별도 탭).

- 기간별 TBM 참여율 (작업자별, 지점별)
- 미참여 작업자 하이라이트
- 항목별 "이상 없음" vs "비고 작성" 비율
- Recharts 활용 (이미 설치됨)

### E-4: Worker 안전 이슈 신고

WorkerLayout 내에 안전 이슈 신고 진입점 추가.
- 기존 "이상신고" (IssuePage)와 분리
- 사진 첨부 (Supabase Storage)
- 위치 선택 (컴파트먼트/거터 또는 자유 텍스트)

### E-5: 알림 연동 (선택)

안전 이슈 등록 시 관리자에게 알림.
현재 알림 시스템이 없으므로, 우선은 관리자 대시보드에 배지 표시 정도.

### 구현 우선순위

1. **E-1** (점검 항목 CRUD) — 가장 단순, 기존 코드 패턴 재사용
2. **E-2** (안전 이슈) — 새 테이블 + 전체 CRUD, 가장 큰 작업
3. **E-3** (통계) — 기존 데이터 기반, Recharts 패턴 C-5에서 확립
4. **E-4** (Worker 신고) — E-2 완료 후
5. **E-5** (알림) — 선택사항

---

## 4. 이번 세션 교훈

### 교훈 1: Edit 도구의 stale cache 문제
growthSurveyStore.js 수정 시 이전 대화에서 읽은 캐시된 내용과 실제 파일이 달랐음.
레거시 호환 필드(plant_height 등)가 실제 파일에 있었지만 캐시에는 없었음.
**대응**: 수정 전 반드시 현재 파일 내용 re-read. 특히 컨텍스트 압축 후.

### 교훈 2: PWA precache 크기 제한
Track D 추가로 JS 번들이 2MB를 넘어 PWA 빌드 실패.
**대응**: `vite.config.js`에 `maximumFileSizeToCacheInBytes: 3 * 1024 * 1024` 설정.
장기적으로는 코드 스플리팅 필요.

### 교훈 3: Store export 패턴 일관성
프로젝트 전체가 `export default useXxxStore` 패턴. named export 사용 시 import 오류.
**대응**: 새 스토어 작성 시 반드시 default export 사용.

### 교훈 4: Supabase import 경로
`../lib/supabase` (NOT `supabaseClient`), `../lib/dbHelpers` (NOT `caseConverter`).
**대응**: 기존 스토어의 import 패턴 확인 후 따라가기.

### 교훈 5: measurements JSONB 구조 확인
growth_surveys의 measurements는 `[{itemId, name, unit, value}]` 구조.
위치 정보는 measurements 내부가 아닌 레코드 레벨 컬럼으로 관리.
**대응**: 기존 데이터 구조 확인 후 확장 방향 결정.

---

## 5. 백로그

### 기존 (Phase 2에서 이관)
- **UX-005~008**: 각종 UX 개선 (Phase 2 문서 참조)
- **AUDIT-001**: 관리자 조작 로그 테이블
- **DATA-001~002**: 데이터 정합성 검증
- **RLS-DEBT-015~016**: RLS 정책 보완

### 신규 (Phase 3)
- **RLS-DEBT-017**: safety_checks/results의 anon UPDATE 정책 미구현 (현재 INSERT만)
- **UX-009**: GrowthSurveyPage 거터 번호 max 값을 컴파트먼트별로 UI에서 제한 (현재 로직만 존재, UI 힌트 없음)
- **AUDIT-002**: TBM 점검 이력 수정/삭제 추적
- **DATA-003**: growth_surveys 시드 데이터 정리 (운영 시작 전 삭제 필요)

---

## 6. DB 상태

### 마이그레이션 파일 (supabase/migrations/)
| 파일 | 상태 |
|------|------|
| `20260410100000_safety_checks.sql` | Supabase에 적용 완료 |
| `20260410120000_growth_surveys_position_fields.sql` | Supabase에 적용 완료 |

### 시드 데이터
- safety_check_items: 9개 기본 항목 (마이그레이션에 포함)
- growth_surveys: 156건 시드 (태우가 SQL Editor에서 직접 실행)
- growth_survey_items: 작물별 항목 (admin UI에서 등록됨)

### 로컬 temp 파일 (gitignore됨)
- `temp_db_survey.sql` — 생육조사 DB 조회용
- `temp_seed_track_b.sql` — 트랙 B 시드 v3
- `temp_unseed_track_b.sql` — 트랙 B 시드 롤백

---

## 7. Git 상태

```
Branch: main
Remote: origin/main (up to date)
Clean working tree (temp files gitignored)
```

### 최근 커밋 체인
```
ade5121 트랙 C Phase C-5: 생육조사 그래프 탭
696b177 트랙 C Phase C-2: 부산LAB 컴파트먼트/거터/구역 입력 지원
2ab280f feat: 트랙 D — TBM 안전점검 시스템
bc8bde4 feat(attendance): 관리자 기존 출근 기록 수정 기능 (B-4)
ffe3ea7 docs: Phase 2 종료 인수인계 문서 + .gitignore temp_*.sql 패턴 추가
```

---

## 8. 다음 세션 시작 가이드

1. 이 문서(`HANDOVER_PHASE3.md`) 읽기
2. `CLAUDE.md` 읽기 (프로젝트 규칙/컨벤션)
3. `docs/handoff/2026-04-09.md` 참조 (Phase 2 상세, 필요 시)
4. 트랙 E-1부터 시작 (점검 항목 관리 Admin CRUD)
5. 선행 조사:
   - `src/stores/safetyCheckStore.js` 현재 구조 확인
   - `src/pages/admin/SafetyChecksPage.jsx` 현재 UI 확인
   - `safety_check_items` 테이블 데이터 확인

### 핵심 파일 경로
```
src/stores/safetyCheckStore.js          — TBM 스토어
src/components/worker/SafetyCheckBottomSheet.jsx — Worker TBM UI
src/pages/worker/WorkerHome.jsx         — 출퇴근 + TBM 흐름
src/pages/admin/SafetyChecksPage.jsx    — Admin TBM 현황
src/pages/admin/SafetyIssuesPage.jsx    — 안전 이슈 (플레이스홀더)
src/pages/admin/GrowthSurveyAdminPage.jsx — 생육조사 (3탭: 기록/항목/그래프)
src/pages/worker/GrowthSurveyPage.jsx   — Worker 생육조사 입력
src/stores/growthSurveyStore.js         — 생육조사 스토어
supabase/migrations/                    — 모든 DB 마이그레이션
```

### 기술 참고
- Worker auth: `anon` role (not `authenticated`)
- RLS 헬퍼: `is_master()`, `current_employee_role()`, `current_employee_branch()`, `employee_branch(uuid)`
- Store 패턴: `export default useXxxStore`, Zustand create
- DB 필드 변환: `snakeToCamel` from `../lib/dbHelpers`
- Supabase: `from '../lib/supabase'`
- 부산 branch 코드: `'busan'`
- ADMIN_ROLES: `['farm_admin', 'hr_admin', 'supervisor', 'master']` in `lib/permissions.js`
