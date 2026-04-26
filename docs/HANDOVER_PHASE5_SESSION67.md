# HANDOVER — Phase 5 세션 67

**날짜:** 2026-04-26  
**작업자:** Claude (세션 67)  
**직전 세션:** 세션 66 (953eb93)

---

## 세션 목표 및 결과

2차 수동 리뷰 8건 + 시드 일관성 문제 해소 (GO 재판정).

| 트랙 | 내용 | 결과 |
|------|------|------|
| Task 0 | 영향 진단 (hq-shell.jsx 전체 읽기 + DB 실측) | ✅ 완료 |
| Task A | P1 HQSidebar 수정 (#1 badge, #3 검색 제거, #8 로그아웃) | ✅ 완료 |
| Task B | #5 branch/crop 라벨 조사 | ✅ 케이스 X (데이터 정상) |
| Task C | #6 그래프 감사 | ✅ 케이스 X (하드코딩 의도적 BACKLOG) |
| Task D | #4 tasks 시드 + StatsPage 속도 기반 재설계 | ✅ 완료 |
| Task E | #2 지점 바로가기 navigate + #7 시스템 설정 제거 | ✅ 완료 |
| Task F | 시드 일관성 전수 감사 | ✅ 이상 없음 |
| Task G | Playwright + BACKLOG + 교훈 109–111 + HANDOVER + 커밋 | ✅ PASS 39/0/0 |

---

## Task A — HQSidebar P1 수정 상세

### #1 badge 동적화 (P3-HQ-BADGE-001)

**`src/design/hq-shell.jsx`** HQSidebar 수정
- `const pendingLeaveCount = useLeaveStore((s) => s.requests.filter((r) => r.status === 'pending').length);`
- `{ id: 'approvals', badge: 12 }` → `{ id: 'approvals', badge: pendingLeaveCount || null }`

### #3 HQTopBar 검색 제거 (P3-HQ-SEARCH-REMOVE-001)

**`src/design/hq-shell.jsx`** HQTopBar 수정
- `searchQuery`, `searchOpen`, `searchRef` state 제거
- `searchResults` useMemo 제거
- useEffect에서 searchRef 핸들러 제거
- 검색 div(220줄 분량) 전체 삭제
- 미사용 `notifTypeIcon`, `notifTypeColor` 변수 제거

### #8 로그아웃 버튼 표시 (P3-HQ-LOGOUT-001)

**`src/design/hq-shell.jsx`** + **`src/design/primitives.jsx`** nav 수정
- `flex: 1, display: 'flex', flexDirection: 'column', gap: 2` → `+ overflowY: 'auto'` 추가 (양쪽)

---

## Task D — tasks 시드 + StatsPage 속도 랭킹 재설계 (P2-PERF-SPEED-METRIC-001, P2-TASK-SPEED-SEED-001)

### tasks 시드

361건 → duration_minutes, quantity 모두 NULL → UPDATE 완료.

**티어 배분 (24명 = 우수 5 + 평균 14 + 저성과 5)**:

| 지점 | 우수(factor) | 평균(factor) | 저성과(factor) |
|------|------|------|------|
| 부산(×1.05 base) | 윤화순·정경은 (1.26) | 김선아·김옥희·김점숙·문영이·정은영 (1.02) | 김태진·조혜숙 (0.76) |
| 하동(×0.975 base) | 이나연·BOUN SOPHA (1.17) | IM NARIN·LY YUON·MEAS VEASNA·MIN RUNTORN·PANG SOVANDAV (0.95) | THOL NIMORL (0.70) |
| 진주(×1.0 base) | ANG SAMATH (1.20) | CHOEM SREY KHUOCH·HEL CHANNY·TES SREYLANG·UK SOKCHEA (0.97) | KIN SREYNET·VOY SOPHEAP (0.72) |

- duration_minutes = ROUND(estimated_minutes / factor × ±8% 노이즈)
- quantity = 기본량(수확12/유인결속150/적엽120/러너정리90/병해충예찰20) × factor × ±8% 노이즈

### usePerformanceData.js 업데이트

- tasks 쿼리 추가: `quantity`, `duration_minutes` not null
- 작업자별 작업 속도 집계: `totalQty / totalDur`
- 전체 평균 대비 정규화 → `speedPct` (100 = 평균)
- `tier`: 'top'(≥110%), 'mid'(85–109%), 'low'(<85%), null(데이터 없음)
- `pinned`: speedPct ≥ 110 / `warn`: speedPct > 0 && < 85

### StatsPage.jsx 재설계

**3 KPI 카드:**
- 우수 작업자 (speedPct ≥ 110, 녹색)
- 평균 작업자 (85–109%, 인디고)
- 저성과 작업자 (<85%, 빨간)

**랭킹:**
- 정렬: speedPct 내림차순 (기존 harvestPct 대신)
- 배지: 지점 배지 + 티어 배지 (우수/평균/저성과)
- 수치: `%속도 · kg/주` 표시

---

## Task E — HQSidebar 메뉴 정리

### #7 시스템 설정 제거 (P3-HQ-SETTINGS-001)

`{ id: 'settings', label: '시스템 설정', icon: icons.settings }` 항목 삭제.

### #2 지점 바로가기 navigate (P3-HQ-BRANCH-NAV-001)

지점 바로가기 div에 `onClick={() => navigate('/admin/hq/branches')}` + hover 효과 추가.
(부산LAB / 진주HUB / 하동HUB 모두 → `/admin/hq/branches` 단일 목적지)

---

## Task B, C — 케이스 X

- **#5 branch/crop 라벨**: harvest_records 분포(busan 190/hadong 169/jinju 156) 정상, emp.branch 매핑 정상 → 조치 불필요.
- **#6 그래프 감사**: DashboardInteractive 하드코딩 2건 의도적 BACKLOG(HQ-BRANCH-MAP-001 등), Growth.jsx 하드코딩 데이터 도메인 설계 미확정 → 조치 불필요.

---

## Task F — 시드 일관성 감사

| 테이블 | 상태 |
|--------|------|
| finance_monthly | 21건 전부 revenue/labor_cost 있음 ✅ |
| leave_requests | null status 0건 ✅ |
| harvest_records | null quantity 0건 ✅ |
| tasks | 세션 67에서 시드 완료 ✅ |

---

## Task G — Playwright 검증

**`scripts/audit_session67.cjs`** 신규 작성.

```
결과: PASS 39 / FAIL 0 / WARN 0 / TOTAL 39
✅ GO — 세션 67 검증 + 회귀 PASS. FAIL 0 / WARN 0
```

| 섹션 | 내용 | 건수 |
|------|------|------|
| X-A | HQSidebar 5건 (badge 동적화 + 검색 제거 + 로그아웃 + 시스템 설정 + 지점 navigate) | 6건 |
| X-D | StatsPage 속도 랭킹 9건 (farm + hr_admin) | 12건 |
| R | 핵심 라우트 회귀 (10개 라우트) | 20건 |
| S | 콘솔 에러 0건 | 1건 |
| **합계** | | **39건** |

---

## 교훈

**교훈 109** — Playwright 사이드바 badge 숫자 어서션 누락.  
**교훈 110** — 기능 유지 결정도 수동 리뷰에서 재검토 가능.  
**교훈 111** — 시드 없이 "운영 후 트랙 이전" 결정 재검토 필요.  
(상세: docs/LESSONS_LEARNED.md)

---

## BACKLOG 변경

| ID | 상태 |
|----|------|
| P2-PERF-SPEED-METRIC-001 | resolved (세션 67) |
| P2-TASK-SPEED-SEED-001 | resolved (세션 67, 신규) |
| P3-HQ-BADGE-001 | resolved (세션 67, 신규) |
| P3-HQ-SEARCH-REMOVE-001 | resolved (세션 67, 신규) |
| P3-HQ-LOGOUT-001 | resolved (세션 67, 신규) |
| P3-HQ-SETTINGS-001 | resolved (세션 67, 신규) |
| P3-HQ-BRANCH-NAV-001 | resolved (세션 67, 신규) |
| P2-SPEED-STANDARD-UI-001 | open 유지 (속도 기준 설정 UI — 운영 후 트랙) |

---

## 운영 진입 차단 요소 최종 점검

| 항목 | 상태 |
|------|------|
| P1-LEAVE-SILENT-FAIL | ✅ resolved (세션 65) |
| P1-ROLE-MKKIM-MSPARK | ✅ resolved (세션 65) |
| P3-SEARCH-REMOVE | ✅ resolved (세션 65) |
| P2-STATS-BRANCH-FILTER-001 | ✅ resolved (세션 66) |
| P2-MENU-CLEANUP-001 | ✅ resolved (세션 66) |
| P2-PERF-SPEED-METRIC-001 | ✅ resolved (세션 67) |
| P3-HQ-BADGE-001 | ✅ resolved (세션 67) |
| P3-HQ-SEARCH-REMOVE-001 | ✅ resolved (세션 67) |
| P3-HQ-LOGOUT-001 | ✅ resolved (세션 67) |
| P3-HQ-SETTINGS-001 | ✅ resolved (세션 67) |
| P3-HQ-BRANCH-NAV-001 | ✅ resolved (세션 67) |
| P2-TASK-SPEED-SEED-001 | ✅ resolved (세션 67) |

**운영 진입 차단 요소: 0건** ✅

---

## 세션 68 추천 — 운영 진입 시뮬레이션 + 운영 진입 ★

**목표**: Phase 5 마지막 세션 — 실제 운영 진입 선언.

**권장 절차:**
1. 첫 사용자 시나리오 시뮬레이션 (태우님 + jhkim + mkkim/mspark + hdkim 첫 진입)
2. 시드 데이터 정리 정책 결정 (남길지 / 정리할지)
3. Supabase 프로젝트 설정 확인 (Auth URL, 비밀번호 재설정 링크)
4. 운영 환경 세팅 확인 (PWA 설치 가이드, 모바일 접근)
5. 운영 시작 선언 + 사용자 신고 채널 마련
6. Phase 5 종료 보고 + 운영 트랙 전환

**운영 후 트랙 예정 항목:**
- P2-SPEED-STANDARD-UI-001 (속도 기준 설정 UI — 운영 중 실데이터 누적 후)
- FCM-001 (푸시 알림 — 사용자 피드백 후)
- HQ-NOTICE-READ-REPORT-001 (DB schema 변경)
- WORKER-NOTICE-READ-001 (read_by 컬럼)
- ISSUE-STATUS-COLUMN-001 (status 컬럼)

---

## 마지막 커밋

(커밋 후 갱신 예정)
