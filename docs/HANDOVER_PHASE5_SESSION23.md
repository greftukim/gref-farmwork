# 세션 23 핸드오버 — Phase 5

**날짜:** 2026-04-23  
**세션:** Phase 5 Session 23  
**작업자:** greftukim (Claude Code 협업)

---

## 완료 범위

### HQ 페이지 전수 조사 → 버그 수정 + 실데이터 완전 연결

세션 22에서 "완료"로 표시된 5개 HQ 페이지를 재조사하여 하드코딩·크래시·렌더 버그를 전부 수정.

---

## Tier 1 — 크리티컬 버그 수정

### 1. HQNoticesScreen ReferenceError 크래시 수정 (`ee759e6`)

**원인:** `_pages.jsx` 상단에 `useNoticeStore` import 누락. 컴포넌트 마운트 시 즉시 ReferenceError.  
**수정:** `supabase`, `useAttendanceStore`, `useNoticeStore` import 3종 추가.

### 2. HQ Dashboard 증상 B (승인허브 "전체 12" vs 빈 목록) 수정 (`1a416f8`)

**원인:** 승인허브 필터 탭 `n:12/5/3/2/2` 완전 하드코딩. body는 `pendingLeave` 실데이터(0건).  
**수정:** 전체/근태 → `pendingCount`, 예산/인사/자재 → `0`.

---

## Tier 2 — Dashboard.jsx 전면 오버홀 (`1a416f8`)

`src/pages/hq/Dashboard.jsx` 완전 재작성 (291줄).

| 항목 | 세션 22 | 세션 23 |
|---|---|---|
| 타이틀 | '2026년 4월 · 월간 운영 리포트' (하드코딩) | `YYYY년 M월 · 월간 운영 리포트` (동적) |
| branches.checkedIn | 18/13/10 (하드코딩) | attendanceStore 오늘 records 실계산 |
| branches.rate (가동률) | 90/93/83% (하드코딩) | checkedIn/workers 실계산 |
| branches.mgr | '김재배'/'박지점'/'최책임' | employees farm_admin 기반 실계산 |
| branches.harvest | 1240/980/760 (하드코딩) | harvest_records 월간 집계 (현재 0) |
| KPI 가동률 | 128% (checkedIn 합/workers) | 실계산 (0~100% 정상 범위) |
| KPI 수확량 | '2,980kg' (하드코딩) | totalHarvest 실계산 |
| KPI 인건비 | '8,420만원' (하드코딩) | '—' |
| 승인허브 필터탭 12/5/3/2/2 | 하드코딩 | pendingCount + 0 |
| 수확량 차트 bars | 820/940/760/… | weeks=[0,0,0,0], 전년대비 '—' |
| 경영지표 섹션 | SVG 차트 (하드코딩) | '재무 데이터 집계 없음' 플레이스홀더 |
| 공지 열람률 | '83%' (하드코딩) | '—' |

**신규 헬퍼 함수:**
- `branchMgr(code)`: employees farm_admin 검색
- `branchAttendance(code)`: attendanceStore records 기반 checkedIn/late
- `branchHarvest(code)`: monthlyHarvestByEmp 기반 합산
- `D_BRANCH_META`: Dashboard 전용 지점 메타 (colors/accentSoft)

---

## Tier 3 — _pages.jsx 하드코딩 제거 (`cfac368`)

### HQBranchesScreen

| 항목 | 세션 22 | 세션 23 |
|---|---|---|
| branches.mgr | '김재배'/'박지점'/'최책임' | employees farm_admin 실계산 |
| branches.phone | '051-***-1234' 등 | '—' |
| branches.address | '부산광역시 강서구...' 등 | '—' |
| branches.rate | 90/93/83 (하드코딩) | attendanceStore 실계산 |
| branches.harvest | 1240/980/760 | harvest_records 실계산 (현재 0) |
| branches.crops/area/est/lastVisit | 하드코딩 | '—' |
| KPI 총 재배면적 | '27,400㎡' | '—' |
| KPI 월 수확량 | '2,980kg' | totalHarvest 실계산 |
| 브랜치 카드 하단 `설립 {est}` | 하드코딩 | `직원 N명 재직 중` |
| Avatar c prop | 하드코딩 삼항 | branches.avatarC 실계산 |
| 달성률 NaN 버그 | `harvest/0=NaN` | harvestT>0 가드 추가 |

### HQEmployeesScreen

| 항목 | 세션 22 | 세션 23 |
|---|---|---|
| KPI 정규직 42명 | 하드코딩 | `contractEndDate===null && isActive` 실계산 |
| KPI 계약/임시 18명 | 하드코딩 | `contractEndDate!==null && isActive` 실계산 |
| KPI 이번달 입사 4명 | 하드코딩 | `hireDate.startsWith(thisMonth)` 실계산 |
| empTypeFilter 클릭 | 시각 효과만 (필터 미작동) | tabFiltered에 정규/계약/임시 조건 적용 |

**고용형태 필터 매핑 (세션 23 결정):**
- 정규: `isActive && !contractEndDate`
- 계약: `isActive && contractEndDate`  
- 임시: `!isActive` (비활성 직원)

### HQNoticesScreen

| 항목 | 세션 22 | 세션 23 |
|---|---|---|
| 탭 '예약됨' count: 2 | 하드코딩 | `0` |
| 탭 '만료' count: 24 | 하드코딩 | `0` |
| KPI 중요/필참 3건 | 하드코딩 | `importantCount` 실계산 |
| KPI 평균 열람률 83% | 하드코딩 | '—' |
| KPI 이달 발행 14건 | 하드코딩 | `thisMonthNoticeCount` 실계산 |
| 공지 카드 렌더 버그 | `n.target.match(/\d+/)?.[0]` → `undefined명 읽음` | `— 명 읽음` |

---

## Tier 4 — HQApprovalsScreen KPI (`cfac368`)

| 항목 | 세션 22 | 세션 23 |
|---|---|---|
| KPI 긴급 2건 | 하드코딩 | `createdAt > 3h ago` 실계산 |
| KPI 이번 주 승인액 '1,840만원' | 하드코딩 | '—' |
| KPI 평균 처리 시간 '3.2h' | 하드코딩 | `farmReviewedAt-createdAt` 실계산 (없으면 '—') |
| KPI 대기중 sub '평균 응답 2.4h' | 하드코딩 | `승인됨 N · 반려 N` 실데이터 |

---

## 커밋 해시 (세션 23)

| 해시 | 설명 |
|---|---|
| `ee759e6` | HQNoticesScreen ReferenceError — useNoticeStore + import 추가 (Tier 1) |
| `1a416f8` | HQ Dashboard 전면 오버홀 — branches/KPI/승인허브/하드코딩 제거 (Tier 2) |
| `cfac368` | _pages.jsx 하드코딩 제거 — Tier 3+4 전체 |

---

## 발견된 DB 실태 (세션 23)

| 항목 | 실제 상태 | 조치 |
|---|---|---|
| `harvest_records` | 0 rows (테이블 존재, 데이터 미입력) | HARVEST-TABLE-001 BACKLOG 등록 |
| `employees.contract_end_date` | NULL=정규(15 활성), NOT NULL=계약(23 활성) | HQ-EMP-TYPE-001 partial 해소 |
| `branches` 테이블 | code/name/lat/lng/radius만 있음 | 지점장/수확/면적 '—' 처리 |

---

## 등록된 BACKLOG (세션 23)

| ID | 요약 |
|---|---|
| HARVEST-TABLE-001 | harvest_records 0 rows — 수확 입력 UI 필요 |
| HARVEST-WEEKLY-001 | Dashboard 주간 수확 차트 — HARVEST-TABLE-001 선행 |
| HQ-EMP-PAGINATION-001 | HQEmployeesScreen 페이지네이션 하드코딩 |
| HQ-EMP-TYPE-001 | partial → contractEndDate 기반 필터 구현. job_type 3방향 여전히 DB 미지원 |

---

## 다음 세션 후보

**후보 A — HQ 이월 4개 페이지:**
- HQFinanceScreen: 재무 DB 트랙 신설 or wontfix 결정 (BACKLOG: HQ-FINANCE-001)
- GrowthCompare + Performance: growth_surveys/daily_work_logs 집계 쿼리 설계 필요
- DashboardInteractive (801줄): 별 세션 단독 처리 권장

**후보 B — 재배팀 _others.jsx 실데이터 연결 (RECONNECT-OTHERS-001 원 목표):**
- EmployeesScreen · LeaveScreen · TasksScreen

세션 시작 전 CLAUDE.md 5번 절차 준수 (git log, BACKLOG, LESSONS 순독).
