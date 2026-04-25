# HANDOVER — Phase 5 세션 55

**날짜:** 2026-04-26  
**작업자:** Claude (세션 55)  
**직전 세션:** 세션 54 (272a832)

---

## 세션 목표 및 결과

3-트랙 번들:
- **Task A** (세션 54 loose ends): WARN 2 → WARN 0, BACKLOG 검증 완료
- **Task B** (store 구독 감사 — 교훈 93): 4건 미존재 구독 발견·처리 완료
- **Task C** (HQ-BRANCH-DETAIL-001): PASS 61 / FAIL 0 / WARN 0

---

## Task A — 세션 54 loose end 해소

### A1. audit_session54.cjs WARN 2 → WARN 0

`scripts/audit_session54.cjs` Section R의 라우트/타이틀 오류 3건 수정:
- `/admin/hq/dashboard` (존재하지 않는 라우트) → `/admin/hq` (index 라우트)
- `'경영 현황'` → `'운영 리포트'`
- `'성과 분석'` → `'작업자 성과 관리'` (PerfHeader 실제 props 대조)
- `'공지사항'` → `'공지 · 정책'` (HQPageHeader 실제 props 대조)

결과: PASS 52 / FAIL 0 / WARN 0

### A2. BACKLOG 검증

HQ-BRANCH-DETAIL-001 포함 모든 open 항목 상태 확인.  
세션 55 Task C에서 HQ-BRANCH-DETAIL-001 → resolved.

---

## Task B — store 구독 미존재 감사 (교훈 93)

`scripts/audit_store_subscriptions.cjs` 신규 작성.  
171건 구독 스캔 → 4건 미존재 발견:

| 파일 | 구독 키 | 처리 |
|------|---------|------|
| `src/pages/admin/EmployeesPage.jsx:17` | `removeEmployee` | 해당 줄 삭제 (dead code, 미사용) |
| `src/pages/worker/IssueCallPage.jsx:29` | `updateIssue` | STORE-MISSING-001 등록 |
| `src/pages/worker/LeavePage.jsx:17-18` | `approveRequest`, `rejectRequest` | STORE-MISSING-002 등록 |
| `src/pages/worker/WorkerNoticePage.jsx:17` | `markRead` | STORE-MISSING-003 등록 |

`?.` 옵셔널 체이닝으로 보호되어 있어 즉각 버그는 아님. 버튼 클릭 시 아무 동작 안 함.

---

## Task C — HQ-BRANCH-DETAIL-001 구현

### 신규 파일
- `src/pages/hq/BranchDetail.jsx` — `HQBranchDetailScreen` 컴포넌트

### 수정 파일
- `src/App.jsx` — import 추가, `<Route path="branches/:branchId" element={<HQBranchDetailScreen />} />` 추가
- `src/pages/hq/_pages.jsx` — `useNavigate` import + HQBranchesScreen 내 `navigate` 훅 추가, "상세 →" 버튼 navigate 연결
- `scripts/audit_session55.cjs` — 신규 Playwright 감사 스크립트

### 화면 구성 (busan / jinju / hadong 공통)

**KPI 4개:**
1. 활성 인원 (workers.length, role=worker + isActive=true 필터)
2. 이번 달 수확 (harvestStore 월 집계, 목표 달성률 %)
3. 오늘 TBM 완료율 (safetyCheckStore.fetchByDate → 로컬 state)
4. 이번 달 수익 (finance_monthly → 로컬 state)

**섹션 2개:**
- 작업자 현황 테이블: 이름·직종·이번달 수확·오늘 TBM 상태 Pill
- 이번 달 재무 요약: 수익·인건비·자재·에너지·시설유지·이익률

### 핵심 버그 수정 (교훈 94)

최초 구현의 finance_monthly 쿼리:
```js
// 잘못된 패턴 (QueryBuilder 객체를 eq 인자로 전달)
.eq('branch_id', supabase.from('branches').select('id').eq('code', branchId).single())
```

수정된 2단계 패턴:
```js
// Step 1: branches에서 id + target 함께 조회
supabase.from('branches').select('id, monthly_harvest_target_kg').eq('code', branchId).maybeSingle()
  .then(({ data }) => {
    if (!data) return;
    setBranchTarget(Number(data.monthly_harvest_target_kg) || 0);
    // Step 2: branch UUID로 finance_monthly 조회
    supabase.from('finance_monthly')
      .select('revenue, labor_cost, material_cost, energy_cost, maintenance_cost')
      .eq('branch_id', data.id)
      .eq('year', now.getFullYear())
      .eq('month', now.getMonth() + 1)
      .maybeSingle()
      .then(({ data: fin }) => { if (fin) setFinance(fin); });
  });
```

### Playwright 결과

`node scripts/audit_session55.cjs` → **PASS 61 / FAIL 0 / WARN 0**

검증 항목:
- C: 목록 "상세 →" 버튼 클릭 → URL `/branches/busan` 이동
- D: busan 상세 (4 KPI, 재무 ~47M, 작업자 테이블, TBM Pill, 목록 복귀)
- E: jinju / hadong 각 페이지 + invalid 코드 에러 메시지
- R: HQ 전체 10개 메뉴 회귀
- S: 콘솔 에러 0건

---

## 신규 교훈

- **교훈 94** — Supabase 중첩 쿼리빌더 안티패턴: `.eq('col', supabase.from(...))` 동작 안 함 → 2단계 쿼리
- **교훈 95** — useNavigate 미임포트 파일에 navigate 추가 시 import + 훅 선언 2곳 동시 수정

---

## 신규 BACKLOG

| ID | 설명 |
|----|------|
| STORE-MISSING-001 | `issueStore` — `updateIssue` 미존재. IssueCallPage 버튼 무반응 |
| STORE-MISSING-002 | `leaveStore` — `approveRequest`/`rejectRequest` 미존재. LeavePage 버튼 무반응 |
| STORE-MISSING-003 | `noticeStore` — `markRead` 미존재. WorkerNoticePage 버튼 무반응 |

---

## 해소된 BACKLOG

| ID | 해소 내용 |
|----|---------|
| HQ-BRANCH-DETAIL-001 | `/admin/hq/branches/:branchId` 신규 페이지 구현 완료. PASS 61/0/0 |

---

## 다음 세션 후보

- STORE-MISSING-001~003 해소: issueStore/leaveStore/noticeStore에 누락 액션 추가 (짧은 세션)
- HQ-DASHBOARD-INTERACTIVE-002: 가동률 기간별 집계, 일/주/분기 수확 집계
- HQ-FINANCE-003: Phase 3 입력 UI (gate pending)
- TEMP-DECISION 시리즈: 박민식·김민국 답 수신 시 일괄 해소

---

## 마지막 커밋

`272a832` (세션 55 커밋 예정, 위 해시는 직전 세션)
