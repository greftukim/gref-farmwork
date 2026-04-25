# Phase 5 세션 47 인수인계

날짜: 2026-04-25  
작업자: Claude Code (세션 47)  
세션 목적: DASHBOARD-PHASE2-001 — AdminDashboard 주간 수확 차트 + 스케줄 카드 실데이터 연결  
마지막 커밋: (세션 47 커밋 후 갱신 예정)

---

## 세션 요약

Task 0(BACKLOG 확인 + 데이터 모델 조사),
Task 1(AdminDashboard.jsx 수정 — 4개 useMemo 신설 + JSX 교체),
Task 2(Playwright **PASS 93 / FAIL 0 / WARN 0 / TOTAL 93**),
BACKLOG resolved, LESSONS 76~77 신설, HANDOVER 완료.

---

## Task 0 — 조사 결과

| 항목 | 결과 |
|------|------|
| BACKLOG 등록 | DASHBOARD-PHASE2-001 → line 143, `open` 상태 확인 |
| "Phase 2" 명명 의미 | Phase 1 = 세션 46 달성률(87%) 하드코딩 제거; Phase 2 = 이번 세션(차트+스케줄) |
| 주간 수확 데이터 소스 | `harvestStore.records` — `r.date`(YYYY-MM-DD), `r.quantity`, `r.employee?.branch` |
| 스케줄 데이터 소스 | `taskStore.tasks` — `t.date`, `t.taskType`, `t.workerId` (snakeToCamel) |
| 지점 필터 | `currentUser?.branch` 기준, farm_admin: 본인 지점만, hr_admin: 전체 |
| 마이그레이션 | 불필요 — UI 수정만 |

---

## Task 1 — AdminDashboard.jsx 수정

### `src/pages/admin/AdminDashboard.jsx`

**weekDays useMemo 확장** (dateStr + isFuture 추가):
```js
const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
return { label: `${labels[i]} ${d.getDate()}`, isToday, dateStr, isFuture: d > today };
```

**신규 useMemo 4개:**

| useMemo | 역할 |
|---------|------|
| `weekChartData` | 날짜별 kg 합산 → max 정규화(0~100 bar height), 최소 4% 보장 |
| `weekTotalKg` | weekChartData.kg 합산 |
| `weekTrend` | rolling 7일 vs 7~14일 전 비교 → %, lastWeek=0 이면 null |
| `weekScheduleData` | weekDays별 tasks 필터 → 유니크 taskType 최대 3개 + total |

**차트 카드 JSX 교체:**
- 제목: `'이번 주 작업 성과'` → `'이번 주 수확량'`
- 수치: `3,280` → `{weekTotalKg.toLocaleString()}`
- 트렌드: `▲ 12%` → weekTrend !== null 일 때만 렌더, ▲/▼ 동적 분기
- 바: 하드코딩 7개 → `weekChartData.map(...)`, 오늘=primary, 실적=primarySoft, 미래/0=borderSoft

**스케줄 카드 JSX 교체:**
- 고정 `items = [['수확','TBM']...]` → `weekScheduleData[i]` 동적 참조
- 과업 타입 뱃지 렌더 + 3개 초과 시 `+N건 더` overflow 인디케이터
- 미래 날짜이면서 작업 없으면 `—`, 과거 날짜이면서 작업 없으면 `'작업 없음'`

---

## Task 2 — Playwright 결과

`scripts/audit_session47.cjs` — **93/93 PASS, 0 FAIL, 0 WARN**

| 섹션 | 검증 항목 | 결과 |
|------|-----------|------|
| A-1 | jhkim 로그인 | PASS |
| B-1~7 | 성과 관리 4화면 + 라벨 회귀 | PASS (32항목) |
| C-1~4 | GrowthInputScreen + 생육 | PASS (8항목) |
| D-1~5 | 메인 대시보드 + 직원 + HQ + 콘솔 | PASS (7항목) |
| E-1~4 | StatsPage KPI + 랭킹 + farm_admin | PASS (14항목) |
| F-1 | WorkStatsPage 회귀 | PASS |
| G-1~5 | BranchStatsPage 회귀 + 달성률 KPI | PASS |
| H-1~3 | 앱 이름 FarmWork 회귀 | PASS |
| I-K | 보호 라우트 + 칸반 보드 회귀 | PASS (5항목) |
| J | branch-settings 섹션 회귀 | PASS (2항목, 폴링 방식) |
| M-1~8 | DASHBOARD-PHASE2-001 신규 | PASS (14항목) |

스크린샷: `docs/regression_session47/`

**스크립트 수정 이력:**
- 초기 J 섹션: `waitForTimeout(2000)` → FAIL 2건
- 수정 후: 폴링 루프(8초 한도) → PASS (교훈 76)

---

## BACKLOG 변경

| 변경 | 항목 |
|------|------|
| resolved | DASHBOARD-PHASE2-001 |

---

## LESSONS 변경

| 변경 | 내용 |
|------|------|
| 교훈 76 신설 | BranchSettingsPage 섹션은 selected 확정 후에만 렌더 — Playwright 폴링 필수 |
| 교훈 77 신설 | dateStr 생성은 toISOString() 금지 — 로컬 날짜 직접 포매팅 |

---

## 다음 세션 후보 (세션 48)

### Tier 2 진입 후보 비교

| 항목 | ID | 복잡도 | 가치 | 추천 |
|------|-----|--------|------|------|
| HQ 이상 신고 페이지 실데이터 | HQ-ISSUE-PAGE-001 | 낮음 | 중 | 후보 |
| AdminDashboard HQ 재무 화면 | HQ-FINANCE-001 | 높음 | 낮음 | 보류 |
| HQ 인터랙티브 대시보드 | HQ-DASHBOARD-INTERACTIVE-001 | 높음 | 중 | 별 세션 |
| HQ 생육 비교 실데이터 | HQ-GROWTH-001 | 중 | 중 | 후보 |

**Claude Code 추천: HQ-ISSUE-PAGE-001 선행**
- `HQIssuePage.jsx` (또는 유사 파일) — issues 테이블 실데이터 연결
- 현재 완전 하드코딩 또는 미구현 상태; 규모 작고 단일 세션 완결 가능
- 마이그레이션 불필요(issues 테이블 이미 존재), UI 수정만
- 이후 HQ-GROWTH-001(집계 쿼리 설계 필요) 진행 추천
