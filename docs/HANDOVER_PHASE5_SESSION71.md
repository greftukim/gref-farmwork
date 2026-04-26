# HANDOVER — Phase 5 세션 71

**날짜**: 2026-04-26  
**담당**: Claude (claude-sonnet-4-6)  
**마지막 커밋**: 3a598ac

---

## 세션 목표 및 결과

| 트랙 | 목표 | 결과 |
|------|------|------|
| Task 0 | 조사 5건 + 분기 결정 | ✅ 완료 |
| Track A | DASHBOARD-INTERACTIVE-002 가동률 실측 연결 | ✅ 완료 |
| Track B-1 | WORKER-NOTICE-READ-001 | ⏭ 보류 (Z': DB 마이그레이션 필요) |
| Track B-2 | ISSUE-STATUS-COLUMN-001 | ⏭ 보류 (Z': DB 마이그레이션 필요) |
| Track B-3 | P3-DEAD-PERF-FILE-001 (Performance.jsx 삭제) | ✅ 완료 |
| Track B-4 | P3-DEAD-GROWTH-FILE-001 (Growth.jsx 삭제) | ✅ 완료 |
| Track B-5 | 사용자 신고 채널 | ⏭ 운영 후 트랙 이전 |
| Track C | 사이드바 "작업자 성과" → "성과 분석" | ✅ 완료 |
| Track D | 메타 점검 (교훈 119-120) | ✅ 완료 |

**Playwright 결과**: PASS 46 / FAIL 0 / WARN 0 ✅ GO

---

## Task 0 분기 결과

- **Task 0-1 (LESSONS)**: 케이스 A — 교훈 1-118 전체 존재, 112-113 명시됨
- **Task 0-2 (사이드바 명칭)**: 진실 명칭 = "성과 분석" (StatsPage H1 기준) → Track C 처리
- **Task 0-3 (DASHBOARD-INTERACTIVE-002)**: 케이스 Z — 기간 필터 UI 이미 구현, 가동률만 하드코딩 잔여 → Track A 처리
- **Task 0-4 (dead code)**: Performance.jsx + admin/Growth.jsx 둘 다 import 0건 (케이스 X) → 삭제
- **Task 0-5 (DB 영향)**: WORKER-NOTICE-READ-001 = Z' / ISSUE-STATUS-COLUMN-001 = Z' → 보류

---

## 변경 파일 목록

| 파일 | 변경 내용 |
|------|-----------|
| `src/pages/hq/DashboardInteractive.jsx` | periodMeta에서 하드코딩 ga(87-90%) 제거. branches.checkedIn/workers로 realGa 계산. 빈 상태("—"+"데이터 없음") 처리. trend '+2.1%p' 제거 → "실측"/"데이터 없음" |
| `src/design/hq-shell.jsx` | [성과] 그룹 "작업자 성과" → "성과 분석" 라벨 |
| `src/pages/admin/Performance.jsx` | 삭제 (928줄 dead code, git rm) |
| `src/pages/admin/Growth.jsx` | 삭제 (834줄 dead code, git rm) |
| `docs/BACKLOG.md` | HQ-DASHBOARD-INTERACTIVE-002 resolved, P3-DEAD-PERF/GROWTH resolved, HQ-SIDEBAR-PERF-LABEL-001 신규 resolved |
| `docs/LESSONS_LEARNED.md` | 교훈 119-120 추가 |
| `scripts/audit_session71.cjs` | 신규 — 46건 검증 스크립트 |

---

## 신규 교훈

- **교훈 119**: 사이드바 라벨 vs 페이지 H1 주기적 동기화 필요
- **교훈 120**: DashboardInteractive 가동률 실측 연결 패턴 (branches useMemo 재사용)

---

## BACKLOG 업데이트

### resolved (세션 71)
- `HQ-DASHBOARD-INTERACTIVE-002` — 가동률 attendanceMap 실측 연결
- `P3-DEAD-PERF-FILE-001` — admin/Performance.jsx 삭제
- `P3-DEAD-GROWTH-FILE-001` — admin/Growth.jsx 삭제
- `HQ-SIDEBAR-PERF-LABEL-001` — 사이드바 "성과 분석" 통일 (신규 등록 + 즉시 해소)

### 운영 후 트랙 이전 (Z' — DB 변경 필요)
- `WORKER-NOTICE-READ-001` — notices.read_by 컬럼 없음 → 운영 후 마이그레이션 세션
- `ISSUE-STATUS-COLUMN-001` — issues.status 컬럼 없음 → 운영 후 마이그레이션 세션

---

## 기술 메모

### 가동률 실측 패턴 (교훈 120)
```js
// branches useMemo가 이미 attendanceMap을 처리 → 그대로 집계
const totalWorkers = branches.reduce((s, b) => s + b.workers, 0);
const totalCheckedIn = branches.reduce((s, b) => s + b.checkedIn, 0);
const realGa = totalWorkers > 0 ? Math.round((totalCheckedIn / totalWorkers) * 100) : null;

// pm 객체에서 사용
ga: realGa !== null ? realGa : '—',
gaSub: realGa !== null ? '오늘 출근 실측' : '출근 기록 없음',

// KPI 카드 렌더
trend: realGa !== null ? '실측' : '데이터 없음'
unit: realGa !== null ? '%' : ''
```

---

## 세션 72 예정 (운영 진입 + Phase 5 종료 ★)

### 운영 진입 체크리스트
- 실 사용자(박민식/김민국) 계정 최종 확인
- 시드 데이터 정리 (테스트 계정 is_active=false 확인)
- Phase 5 공식 종료 선언

### 운영 후 트랙 후보
- `WORKER-NOTICE-READ-001` — DB 마이그레이션 (notice_reads 또는 read_by 컬럼)
- `ISSUE-STATUS-COLUMN-001` — DB 마이그레이션 (issues.status 컬럼)
- `HQ-FINANCE-003` Phase 3 — 재무 입력 폼
- `HQ-GROWTH-001` — GrowthCompare 실데이터 연결
- 알림 시스템 (FCM-001)
- 작업 속도 평가 강화 (SPEED-METRIC-001)
