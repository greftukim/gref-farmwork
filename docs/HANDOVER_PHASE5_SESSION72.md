# HANDOVER — Phase 5 세션 72

**날짜**: 2026-04-26  
**담당**: Claude (claude-sonnet-4-6)  
**마지막 커밋**: (commit 후 채움)

---

## 세션 목표 및 결과

| 트랙 | 목표 | 결과 |
|------|------|------|
| Track A | 라우트 회귀 6곳 정정 + StatsPage 폐기 | ✅ 완료 |
| Track B-1 | Playwright -8 케이스 A 문서화 | ✅ 완료 (본 문서 기록) |
| Track B-2 | LESSONS 112-120 확인 | ✅ Case A — 전체 존재 확인 |
| Track B-3 | Track A 범위 확인 | ✅ 완료 (X: 6곳 정정) |
| Track C | 교훈 121-124 등록 | ✅ 완료 |
| GO 게이트 | Phase 5 종료 선언 | ✅ Playwright PASS 35 / FAIL 0 / WARN 0 |

**Playwright 결과**: PASS 35 / FAIL 0 / WARN 0 ✅ GO

---

## Track A — 라우트 회귀 정정 상세

### 배경

세션 68에서 `HQ-PERF-ROUTE-MISMATCH-001` 처리 시 HQ_ROUTES.performance를 `'/admin/hq/performance'` → `'/admin/stats'`로 변경했다. 이는 StatsPage(세션 67 재설계)를 HQ 성과 화면으로 재사용하려는 의도였으나, 다음 문제를 유발했다:

1. `/admin/hq/performance`(HQPerformanceScreen) 라우트가 4세션간 사이드바에서 도달 불가
2. 사용자 멘탈모델 회귀: HQ 사이드바 → HQ 성과 화면이 아닌 팜 성과 화면으로 연결
3. `/admin/stats` 라우트를 지우면서 farm 사이드바/BottomNav 링크가 orphan 상태

### 정정 내용 (6곳)

| 파일 | 변경 전 | 변경 후 |
|------|---------|---------|
| `AdminLayout.jsx` HQ_ROUTES.performance | `'/admin/stats'` | `'/admin/hq/performance'` |
| `AdminLayout.jsx` getHQActiveId | `/admin/stats` 분기 | `/admin/hq/performance` 분기 |
| `AdminLayout.jsx` FARM_ROUTES.stats | `'/admin/stats'` | `'/admin/performance'` |
| `hq-shell.jsx` getActiveGroup | `/admin/stats` → `'g-perf'` | `/admin/hq/performance` → `'g-perf'` |
| `Sidebar.jsx` productionCategory | `to: '/admin/stats'` | `to: '/admin/performance'` |
| `AdminBottomNav.jsx` farmMoreItems | `to: '/admin/stats'` | `to: '/admin/performance'` |
| `AdminBottomNav.jsx` moreItems filter | `'/admin/stats'` 포함 | `'/admin/performance'` 포함 |
| `AdminDashboard.jsx` 상세 분석 링크 | `navigate('/admin/stats')` | `navigate('/admin/performance')` |

### StatsPage 폐기

- `src/pages/admin/StatsPage.jsx` — git rm
- `App.jsx` import 제거 + `<Route path="stats" .../>` 제거
- `/admin/stats` 경로 전체 제거

### 검증

```bash
grep -rn "/admin/stats" src/  # 결과 0건
```

---

## Track B — 세션 간 누적 회수

### B-1: Playwright -8 케이스 A

세션 71 스크립트(audit_session71.cjs): PASS 46건 = B3/B4 + C + A + R + S 섹션 합산.  
세션 72 스크립트(audit_session72.cjs): PASS 35건 = B + A + R + S 섹션 합산.  
세션별 스크립트는 해당 세션 변경 사항을 검증하는 독립 스크립트이므로 건수 감소는 **케이스 A(정상)**.

### B-2: LESSONS 112-120 연속성 확인

```
112 — 변경 영역 vs 사용자 화면 불일치
113 — 동일 도메인 중복 컴포넌트 파일 BACKLOG 등록 후 삭제
114 — 기간 필터 없는 성과 페이지 UX
115 — admin/ dead code 파일 패턴
116 — HQ 사이드바 인라인 펼침 패턴
117 — LeavePage HR Admin 지점 필터 패턴
118 — 보고 누락 차단
119 — 사이드바 라벨 vs 페이지 H1 명칭 동기화
120 — DashboardInteractive 가동률 실측 연결 패턴
```
모두 존재 확인 — Case A.

---

## 변경 파일 목록

| 파일 | 변경 내용 |
|------|-----------|
| `src/components/layout/AdminLayout.jsx` | HQ_ROUTES.performance + getHQActiveId + FARM_ROUTES.stats 정정 |
| `src/design/hq-shell.jsx` | getActiveGroup /admin/stats → /admin/hq/performance |
| `src/components/layout/Sidebar.jsx` | productionCategory 성과 분석 to 정정 |
| `src/components/layout/AdminBottomNav.jsx` | farmMoreItems + moreItems filter to 정정 |
| `src/pages/admin/AdminDashboard.jsx` | "상세 분석 →" navigate 정정 |
| `src/App.jsx` | StatsPage import + Route 제거 |
| `src/pages/admin/StatsPage.jsx` | git rm (폐기) |
| `scripts/audit_session72.cjs` | 신규 — 35건 검증 스크립트 |
| `docs/BACKLOG.md` | HQ-PERF-ROUTE-REGRESSION-001 + P3-DEAD-STATS-PAGE-001 resolved |
| `docs/LESSONS_LEARNED.md` | 교훈 121-124 추가 |

---

## 신규 교훈

- **교훈 121**: 라우트 경로 변경 시 6곳 동시 수정 원칙
- **교훈 122**: farm_admin 컨텍스트 내부 링크는 /admin/hq/* 사용 금지
- **교훈 123**: dead code 라우트는 세션 발견 즉시 폐기
- **교훈 124**: Phase 5 완료 기준 — 라우트 정합성 + Playwright GO + BACKLOG 명시

---

## BACKLOG 업데이트

### resolved (세션 72)
- `HQ-PERF-ROUTE-REGRESSION-001` — 세션 68 회귀 라우트 6곳 정정
- `P3-DEAD-STATS-PAGE-001` — StatsPage.jsx 폐기

### 운영 후 트랙 후보 (변경 없음)
- `WORKER-NOTICE-READ-001` — notices.read_by 컬럼 없음 → 운영 후 마이그레이션
- `ISSUE-STATUS-COLUMN-001` — issues.status 컬럼 없음 → 운영 후 마이그레이션

---

## Phase 5 공식 종료 선언

**세션 72 완료 기준 달성**:
- 라우트 회귀 0건 (`grep -rn "/admin/stats" src/` → 0건)
- Playwright PASS 35 / FAIL 0 / WARN 0
- BACKLOG 미해결 부채 명시 (운영 후 트랙 2건)
- 교훈 121-124 등록

**Phase 5 종료일**: 2026-04-26  
**운영 진입 준비 상태**: GO

---

## 운영 후 트랙 후보

- `WORKER-NOTICE-READ-001` — DB 마이그레이션 (notice_reads 또는 read_by 컬럼)
- `ISSUE-STATUS-COLUMN-001` — DB 마이그레이션 (issues.status 컬럼)
- `HQ-FINANCE-003` Phase 3 — 재무 입력 폼
- `HQ-GROWTH-001` — GrowthCompare 실데이터 연결
- 알림 시스템 (FCM-001)
- 작업 속도 평가 강화 (SPEED-METRIC-001)
