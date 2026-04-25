# Phase 5 세션 45 인수인계

날짜: 2026-04-25  
작업자: Claude Code (세션 45)  
세션 목적: TASKS-WORKER-ID-MISMATCH-001 — orphan tasks 해소  
마지막 커밋: (아래 커밋 후 갱신 예정)

---

## 세션 요약

Task 0(3전략 조사 및 전략 B 제안 → 승인 게이트),
Task 1(마이그레이션 작성·적용 + 코드 정리),
Task 2(Playwright **PASS 132 / FAIL 0 / WARN 0 / TOTAL 132**),
BACKLOG resolved, LESSONS 갱신, HANDOVER 완료.

---

## Task 0 — 조사 결과 (요약)

| 전략 | 내용 | 채택 여부 |
|------|------|-----------|
| A | orphan tasks UPDATE → 활성 worker round-robin 재배정 | 미채택 (worker 의미 왜곡) |
| **B** | **orphan tasks 358건 DELETE + 24명×15건 신규 시드** | **채택** |
| C | orphan tasks DELETE only (데이터 없음 상태) | 미채택 (SchedulePage 빈 화면) |

사전 조사 확인 항목:
- tasks 스키마: worker_id(uuid nullable), title/date(NOT NULL), zone_id, task_type, status, estimated_minutes
- zones: id, name — **branch 컬럼 없음** (교훈 73)
- 활성 worker: busan 9 / jinju 7 / hadong 8 = 24명
- task_type enum: free-text (제약 없음)
- zone_id: A동(983dc563) / B동(760ad29d) / C동(c6d1e535)

---

## Task 1a — 마이그레이션

**파일:** `supabase/migrations/20260425_session45_tasks_reseed.sql`

```sql
BEGIN;
-- STEP 1: 사전 카운트 (예상 359건)
-- STEP 2: DELETE orphan tasks (worker_id IN 시드 UUID 3개) → 358건 삭제
-- STEP 3: INSERT 24 workers × 15 tasks = 360건
--   generate_series(1,15), zone A/B/C 순환, task_type 5종 순환
--   날짜: CURRENT_DATE-21 ~ +21 (3일 간격)
--   status: 날짜 기반 (completed/in_progress/pending)
--   estimated_minutes: 수확180 / 적엽120 / 유인150 / 병해충60 / 러너90
-- STEP 4: 최종 검증 DO (orphan=0, total≥355, busan≥125, jinju≥95, hadong≥110)
COMMIT;
```

**적용 결과:**
```
total=361, busan=136, jinju=105, hadong=120, orphan=0
completed=168, in_progress=24, pending=169
```

---

## Task 1b — 코드 정리

### `src/stores/taskStore.js` — farm_admin 브랜치 쿼리 is_active 필터 추가

```js
// 변경 전
await supabase.from('employees').select('id').eq('branch', currentUser.branch)
// 변경 후
await supabase.from('employees').select('id').eq('branch', currentUser.branch).eq('is_active', true)
```

### `src/pages/admin/SchedulePage.jsx` — barsForDate line 141 주석 추가

```js
if (!result[t.workerId]) return; // workers = is_active=true 만 포함, 비활성 작업자 태스크 무시
```

---

## Task 2 — Playwright 결과

`scripts/audit_session45.cjs` — **132/132 PASS, 0 FAIL, 0 WARN**

| 섹션 | 검증 항목 | 결과 |
|------|-----------|------|
| A-1 | jhkim 로그인 | PASS (1항목) |
| B-1~7 | 성과 관리 4화면 + 라벨 (세션 40·41 회귀) | PASS (32항목) |
| C-1~4 | GrowthInputScreen + 생육 대시보드 + 작물 탭 + KPI | PASS (8항목) |
| D-1~5 | 메인 대시보드 + 근무 관리 + 직원 목록 + HQ + 콘솔 에러 | PASS (7항목) |
| E-1~4 | StatsPage + KPI + 랭킹 + farm_admin 필터 실증 | PASS (14항목) |
| F-1~4 | WorkStatsPage 회귀 | PASS (11항목) |
| G-1~4 | BranchStatsPage 회귀 | PASS (9항목) |
| H-1~2 | 앱 이름 FarmWork 회귀 | PASS (3항목) |
| I-1~9 | PROTECTED-ROUTE-001 회귀 | PASS (9항목) |
| J-1~6 | BRANCH-WORK-SCHEDULE-UI-001 회귀 | PASS (13항목) |
| K-1~7 | TASKS-WORKER-ID-MISMATCH-001 신규 | PASS (15항목) |

스크린샷: `docs/regression_session45/`

---

## BACKLOG 변경

| 변경 | 항목 |
|------|------|
| resolved | TASKS-WORKER-ID-MISMATCH-001 |

---

## LESSONS 변경

| 변경 | 내용 |
|------|------|
| 교훈 69 갱신 | tasks orphan 해소 방법 + 전략 B 내용 추가, harvest_records 무관 명시 |
| 교훈 73 신설 | zone_id에 branch 없음 — task branch는 worker_id→employees.branch 경유 필수 |

---

## 다음 세션 후보 (세션 46)

### Tier 2 진입 후보 비교

| 항목 | ID | 복잡도 | 가치 | 추천 |
|------|-----|--------|------|------|
| 지점별 월간 수확 목표 설계 | HARVEST-TARGETS-001 | 중 | 높음 (KPI 기준선) | ⭐ 추천 |
| HQ 재무 화면 실데이터 연결 | HQ-FINANCE-001 | 중-높음 | 중 | 보류 |
| HQ 이상 신고 페이지 | HQ-ISSUE-PAGE-001 | 낮음 | 중 | 차후 |
| 결재 워크플로 트랙 | APPROVAL-*-001 | 높음 | 높음 | 별 세션 |

**Claude Code 추천: HARVEST-TARGETS-001 선행**
- branches 테이블에 `monthly_harvest_target_kg` 컬럼 추가 (또는 별 테이블)
- BranchStatsPage / HQBranchesScreen의 KPI에 목표 달성률 연결
- 마이그레이션 1건 + UI 2~3컴포넌트 → 단일 세션 완결 가능
- HQ-FINANCE-001은 DashboardInteractive.jsx(801줄)와 연동 고려 필요 → 별 세션 권장
