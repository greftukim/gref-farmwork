# HANDOVER — Phase 5 세션 48

**날짜:** 2026-04-25  
**작업자:** Claude (세션 48)  
**이전 커밋:** 530d491

---

## 세션 목표

1. **Task 0a** — Playwright 카운트 불일치(-56) 원인 분류 + DASHBOARD-PHASE2-001 BACKLOG 확인  
2. **Task 0b** — HQ-ISSUE-PAGE-001 실측 조사 (issues 테이블, 라우트, RLS)  
3. **Task 1** — HQ-ISSUE-PAGE-001 구현 (HQIssuesScreen + 라우트 + 사이드바 + alert 교체)  
4. **Task 2** — Playwright 감사(Section N 신규 + Section L 복원) + 문서화

---

## Task 0a 결과

### A1 — Playwright 카운트 불일치 분류

| 세션 | log() 총수 | PASS 수 |
|------|-----------|---------|
| 세션 46 | 231 | 149 |
| 세션 47 | 147 | 93 |
| **차이** | **-84** | **-56** |

**원인 분류 B (누락):** 세션 47 재작성 시 Section E~K가 "E-K 축약" 48 log()로 압축(원래 125개),  
Section L(HARVEST-TARGETS-001, 35 log()) 완전 탈락. → 교훈 78 신설.

### A2 — DASHBOARD-PHASE2-001 BACKLOG 확인

- `resolved` 상태 정상 등록 확인
- "Phase 2"는 AdminDashboard 주간 차트·스케줄 실데이터 연결 단계를 가리킴
- Phase 3/4 계획 없음 (별도 BACKLOG ID 필요 시 신규 등록)

---

## Task 1 — 구현 내역

### 변경 파일 5개

| 파일 | 변경 내용 |
|------|----------|
| `src/components/layout/AdminLayout.jsx` | `HQ_ROUTES`에 `issues: '/admin/hq/issues'` 추가 |
| `src/design/hq-shell.jsx` | HQSidebar에 "이상 신고" 메뉴 항목 추가, `useIssueStore` 미해결 건수 badge |
| `src/pages/hq/_pages.jsx` | `HQIssuesScreen` 신규 구현 + export 추가 |
| `src/pages/hq/Dashboard.jsx` | alert() 3곳 → `navigate('/admin/hq/issues')` 교체 |
| `src/App.jsx` | `HQIssuesScreen` import + `<Route path="issues">` 추가 |

### HQIssuesScreen 설계 결정

- **직접 supabase 쿼리** (issueStore 미사용): issueStore는 farm_admin 지점 필터가 내장되어 있어  
  HQ role(전 지점 조회 필요)에 부적합. → 교훈 80 참조
- **Promise.all** 병렬 조회: issues + zones 동시 fetch
- **snakeToCamel** 수동 적용: workerId, zoneId, isResolved, createdAt
- **TYPE_META**: 병해충→danger, 시설이상→warning, 작물이상→info, 기타→default
- **filter**: 'open'(default) / 'resolved' / 'all' — 탭 UI
- **handleResolve**: 직접 supabase UPDATE + local state 즉시 갱신 (re-fetch 없이 낙관적 업데이트)
- **PROTECTED-ROUTE-001 자동 적용**: farm_admin → /admin/hq/issues → /admin 리디렉트 (별도 로직 없음)

### DB 작업

- issues 테이블: 기존 존재, 신규 마이그레이션 없음
- 시드 12건 INSERT: 미해결 8건(병해충 3/시설이상 3/작물이상 2) + 해결됨 4건, 3지점 분산
- **zone_id FK 오타 수정**: `760ad285` → `760ad29d` (교훈 80)

---

## Task 2 — Playwright 결과

```
결과: PASS 152 / FAIL 0 / WARN 0 / TOTAL 152
```

| 섹션 | 내용 | 결과 |
|------|------|------|
| A | 로그인 | PASS |
| B | 성과 관리 회귀 (세션 40) | PASS |
| C | 생육 대시보드 회귀 (세션 39) | PASS |
| D | 메인 대시보드 + HQ + 콘솔 에러 | PASS |
| E | Stats 성과 분석 회귀 (세션 41) | PASS |
| F | WorkStatsPage 회귀 (세션 42) | PASS |
| G | BranchStatsPage 회귀 (세션 42) | PASS |
| H | FarmWork 앱 이름 회귀 (세션 42) | PASS |
| I | PROTECTED-ROUTE-001 회귀 (세션 43) + I-3/I-6 신규 | PASS |
| J | BRANCH-WORK-SCHEDULE-UI-001 회귀 (세션 44) 풀 버전 | PASS |
| K | TASKS-WORKER-ID-MISMATCH-001 회귀 (세션 45) 풀 버전 | PASS |
| L | HARVEST-TARGETS-001 회귀 (세션 46) **복원** | PASS |
| M | DASHBOARD-PHASE2-001 회귀 (세션 47) | PASS |
| N | HQ-ISSUE-PAGE-001 신규 (N-1~N-11) | PASS |

**N-11 WARN 발생 → 즉시 수정:** `locator('text=전체 →').first()` → `.nth(1)`  
(Dashboard에 동일 텍스트 2곳 존재 — 교훈 79)

---

## BACKLOG 변경

| ID | 이전 | 이후 |
|----|------|------|
| HQ-ISSUE-PAGE-001 | open | resolved |

---

## LESSONS 추가

| 번호 | 제목 |
|------|------|
| 교훈 78 | Playwright 감사 스크립트 재작성 시 섹션 누락 리스크 |
| 교훈 79 | Dashboard 동일 텍스트 다중 요소: `.first()` 오클릭 |
| 교훈 80 | zone_id FK: UUID 하드코딩 금지, 실시간 SELECT 필수 |

---

## 세션 48 선언

**경량 세션 스트리크 종료 (세션 40~48: 9회 연속 점진 개선)**  
세션 49부터 **Tier 2** 진입 — 신규 데이터 연결 트랙 단독 세션.

---

## 세션 49 — Tier 2 후보 및 권장

### 후보 3개

| ID | 트랙 | 규모 | 선행조건 |
|----|------|------|---------|
| HQ-FINANCE-001 | HQFinanceScreen 재무 실데이터 연결 | 대형 (DB 스키마 미정) | 사전 조사 세션 필요 |
| HQ-DASHBOARD-INTERACTIVE-001 | DashboardInteractive.jsx 실데이터 연결 | 대형 (801줄, 0 store import) | 없음 |
| TBM-COMPLETION-001 | BACKLOG 미등록 — TBM 반장 플로우 마무리 확인 필요 | 미측정 | BACKLOG 등록 후 진입 |

### 권장: **HQ-DASHBOARD-INTERACTIVE-001**

이유:
1. 파일 존재 확인됨 (`src/pages/hq/DashboardInteractive.jsx`, 801줄)
2. 라우트 이미 연결됨 (`/admin/hq/interactive`)
3. 선행 조사 불필요 — 바로 구현 진입 가능
4. HQ-FINANCE-001은 재무 DB 스키마 부재 → 사전 조사 단독 세션이 별도로 필요
5. TBM-COMPLETION-001은 BACKLOG ID 미등록 상태 → 선등록 후 Tier 2 진입

### 세션 49 진입 절차

1. `git log -5 --oneline` + BACKLOG + LESSONS 필독 (세션 시작 필수 절차)
2. DashboardInteractive.jsx 전체 분석 — 어떤 store/hook 연결 필요한지 매핑
3. 필요 store 신설 or 기존 store 확장 확인
4. 구현 → 빌드 검증 → Playwright Section O 신규 → 커밋·푸시

---

## 다음 세션 진입 시 확인 필수

- [ ] `docs/BACKLOG.md` 전체 읽기 (open 항목 목록 재확인)
- [ ] `docs/LESSONS_LEARNED.md` 교훈 78~80 숙지
- [ ] DashboardInteractive.jsx 파일 사전 열람 (801줄 분량)
- [ ] HQ-FINANCE-001 사전 조사 여부 결정 (세션 49 or 50)
