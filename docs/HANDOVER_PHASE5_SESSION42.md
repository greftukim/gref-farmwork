# Phase 5 세션 42 인수인계

날짜: 2026-04-25  
작업자: Claude Code (세션 42)  
세션 목적: WORK-STATS-PAGE-001 + BRANCH-STATS-PAGE-001 묶음 처리 + 앱 이름 FarmWork 교체  
마지막 커밋: (커밋 후 기재)

---

## 세션 요약

Task 1A(migration 실행), Task 1B(WorkStatsPage 수정), Task 2(BranchStatsPage 재작성),
Task 3(앱 이름 FarmWork 교체), Task 4(라우트 검증),
Task 5(Playwright **PASS 87 / FAIL 0 / WARN 1 / TOTAL 88**),
Task 6(BACKLOG + HANDOVER) 완료.

---

## 구현 내용

### Task 1A: 마이그레이션

**파일:** `supabase/migrations/20260425_session42_branch_work_schedule_and_attendance_seed.sql`

1. `branch_work_schedule_config` 테이블 신설 + 3행 INSERT
   - busan/hadong: 월~토 07:30~16:30
   - jinju: 월~금 07:30~16:30
2. 시드_작업자01~03 attendance 175건 DELETE
3. 실 직원 24명 × 4월 근무일 attendance INSERT (~500건)
   - busan 9명×22일=198, jinju 7명×18일=126, hadong 8명×22일=176
   - check_in 정상 ±15분 / 지각(seq%10=0) +30~62분
   - check_out end_time+0~45분
   - status: 'working' or 'late'
4. DO 블록 검증: config=3, attendance≥480, late≥40, branches=3 통과

### Task 1B: WorkStatsPage 수정

**수정 파일:** `src/pages/admin/WorkStatsPage.jsx`

```js
// 수정 전 (line 16):
const workers = employees.filter((e) => e.role === 'worker');
// 수정 후:
const workers = useMemo(() => employees.filter((e) => e.role === 'worker' && e.isActive), [employees]);
```

비활성 시드_작업자01~03 포함 문제 해소. useMemo 감싸기도 병행.

### Task 2: BranchStatsPage 전면 재작성

**수정 파일:** `src/pages/admin/BranchStatsPage.jsx`

- `usePerformanceData` + `useEmployeeStore` 기반
- 3지점 KPI 카드 (부산LAB / 진주HUB / 하동HUB): 활성 작업자 수 / 평균 성과율(%) / 주간 수확량 합계(kg/주)
- 평균 성과율 비교 바 차트 (지점별 색상)
- 주간 수확량 비교 바 차트

### Task 3: 앱 이름 FarmWork 교체

변경 파일 9개 (UI 텍스트만, 레포/Supabase ID 유지):

| 파일 | 변경 |
|------|------|
| `src/components/PWAInstallGuideModal.jsx` | `GREF FarmWork` → `FarmWork` |
| `src/components/common/InstallPromptBanner.jsx` | `GREF FarmWork` → `FarmWork` |
| `src/components/layout/Sidebar.jsx` | `GREF FarmWork` → `FarmWork` |
| `src/components/layout/TopBar.jsx` | `'GREF FarmWork'` → `'FarmWork'` |
| `src/pages/LoginPage.jsx` | `GREF FarmWork` × 2 → `FarmWork` |
| `public/firebase-messaging-sw.js` | `'GREF FarmWork'` → `'FarmWork'` |
| `src/design/hq-shell.jsx` | `GREF Farm` → `FarmWork` |
| `src/design/primitives.jsx` | `GREF Farm` (UI line 146) → `FarmWork` |
| `src/pages/_others.jsx` | `GREF Farm` × 2 → `FarmWork` |
| `src/pages/admin/_others.jsx` | `GREF Farm` × 2 → `FarmWork` |

`src/design/primitives.jsx:5` 코드 주석은 UI 텍스트 아님 → 유지.

---

## Playwright 결과

`scripts/audit_session42.cjs` — **87/88 PASS, 0 FAIL, 1 WARN**

| 섹션 | 검증 항목 | 결과 |
|------|-----------|------|
| A-1 | jhkim 로그인 | PASS (1항목) |
| B-1~7 | 성과 관리 4화면 + 라벨 (세션 40·41 회귀) | PASS (32항목) |
| C-1~4 | GrowthInputScreen + 생육 대시보드 + 작물 탭 + KPI (세션 39 회귀) | PASS (8항목) |
| D-1~5 | 메인 대시보드 + 근무 관리 + 직원 목록 + HQ + 콘솔 에러 (세션 28-38 회귀) | PASS (7항목) |
| E-1~4 | StatsPage 화이트 스크린 + KPI 3개 + 랭킹 + 권한 분기 (세션 41 회귀) | PASS 14 / WARN 1 |
| F-1~4 | WorkStatsPage 로드 + KPI 3개 + 테이블 실데이터 + 기간 필터 | PASS (11항목) |
| G-1~4 | BranchStatsPage 로드 + 3지점 카드 + KPI + 비교 섹션 | PASS (9항목) |
| H-1~2 | 앱 이름 FarmWork + 구 이름 제거 확인 | PASS (3항목) |

스크린샷: `docs/regression_session42/`

---

## BACKLOG 변경

| 변경 | 항목 |
|------|------|
| resolved | WORK-STATS-PAGE-001 |
| resolved | BRANCH-STATS-PAGE-001 |
| 신규 P2 | BRANCH-WORK-SCHEDULE-UI-001 (지점별 근무시간 설정 UI) |

---

## 다음 세션 후보 (세션 43)

| 우선순위 | 항목 |
|---------|------|
| P2 | TASKS-WORKER-ID-MISMATCH-001: 신규 작업 등록 시 실 직원 연결 (SCHED-REGISTER-001 선행) |
| P2 | BRANCH-WORK-SCHEDULE-UI-001: 지점별 근무시간 설정 편집 UI |
| P3 | APPROVAL-BUDGET-001, APPROVAL-HR-001, APPROVAL-MATERIAL-001 |
| P3 | HQ-ISSUE-PAGE-001: HQ 전용 이상 신고 페이지 |
| P3 | HARVEST-TARGETS-001: 지점별 월간 수확 목표치 설계 |
| P3 | SCHED-REGISTER-001: 스케줄 등록 모달 구현 |
| P3 | FARM-HQ-NOTICE-001: 공지 연동 검증 |
| P3 | HQ-GROWTH-001: GrowthCompare.jsx 실데이터 연결 |
