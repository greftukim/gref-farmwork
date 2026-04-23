# 세션 25 핸드오버 — Phase 5

**날짜:** 2026-04-23  
**세션:** Phase 5 Session 25  
**작업자:** greftukim (Claude Code 협업)

---

## 완료 범위

HQ Dashboard(`src/pages/hq/Dashboard.jsx`) 인터랙션 전수 조사 후 **14개 요소 연결**. DB 신설 필요한 14개는 범위 외(BACKLOG 유지).

---

## 조사 결과 (사전 정찰)

Dashboard.jsx 509줄을 8개 섹션으로 분할 → 인터랙션 가능 요소 후보 30여개 나열 → 태우님 범위 확정으로 14개 착수.

**제외된 14개(DB 신설 선행):** B-3 월 인건비, B-1t/B-2t/B-4t KPI trend, C-D6 지점 달성률, C-D7 TBM, D-D2 주간 수확 차트, D-D3 지점별 목표, D-D4 전년 동월 대비, F-D1~3 경영지표 전체, G-D1 이슈 place, H-D2 공지 열람률.

---

## Tier 1 — Type(a) 네비게이션 8건 (`e0446eb`)

| 요소 | 처리 |
|---|---|
| A-1 리포트 내보내기 | `alert('리포트 내보내기 기능 준비 중입니다.')` |
| A-2 전사 공지 작성 | `navigate('/admin/hq/notices')` |
| C-H1 지점 관리 → | `navigate('/admin/hq/branches')` |
| D-L1 보고서 열기 | `alert('작물별 상세 분석 보고서 준비 중입니다.')` |
| E-H2 전체 → (승인 허브) | `navigate('/admin/hq/approvals')` |
| F-L1 상세 → (경영지표) | `navigate('/admin/hq/finance')` |
| G-H2 전체 → (이상 신고) | `alert('HQ 전용 이상 신고 페이지 준비 중입니다.')` |
| H-H1 + 새 공지 | `navigate('/admin/hq/notices')` |

**useNavigate 추가:** `const navigate = useNavigate()` 훅 도입.

**G-H2 판단 근거:** `/admin/records`(IssueCallPage)는 재배팀 Sidebar 전용 라우트 — HQ 컨텍스트에서 이동 시 HQSidebar active 메뉴 부재로 혼선 유발. → alert + HQ-ISSUE-PAGE-001 BACKLOG 신설.

---

## Tier 2 — Type(b) KPI 카드 4개 일관 alert (`e2500b4`)

**B-cls:** 전사 가동률/월 수확량/월 인건비/미해결 이슈 4개 카드 전부 `alert('KPI 상세 드릴다운 준비 중입니다.')` 통일.

**결정 근거(태우님):** 일관성 우선 — 4개 중 일부만 기능 제공 시 혼선 우려.

**선행 변경:** `Card` 컴포넌트(primitives.jsx L33)에 `onClick` 파라미터 추가. 기존 55+ 호출처 영향 없음(undefined 전달 시 no-op).

```js
const Card = ({ children, style = {}, pad = 20, onClick }) => (
  <div onClick={onClick} ...>
```

---

## Tier 3 — Type(b) 지점·이슈·공지 카드 (`673c300`, `39bccc8`)

| 요소 | 처리 |
|---|---|
| C-C1 지점 카드 × 3 | `navigate('/admin/hq/branches')` 통일 |
| G-C1 이슈 카드 | `alert('HQ 전용 이상 신고 페이지 준비 중입니다.')` |
| H-C1 공지 카드 | `navigate('/admin/hq/notices')` |

**E-C1(승인 요청 카드):** 변경 없음 유지 — 내부에 반려/승인 버튼 이미 연결됨, 카드 전체 클릭은 중복 UX 유발 우려.

---

## Tier 4 — Type(c) 작물 탭 (`96031ff`)

**D-T1:** `cropFilter` useState + onClick 전환. 시각 효과만 구현 (토마토/딸기/파프리카/오이 활성 전환).

**실 필터링 미구현 이유:** `harvest_records.crop_id` FK는 존재하나 crops 테이블 조인 필요 + 현재 harvest_records 0 rows. → BACKLOG `HARVEST-CROP-FILTER-001` (HARVEST-TABLE-001 선행).

---

## 커밋 해시 (세션 25)

| 해시 | 설명 |
|---|---|
| `e0446eb` | Type(a) 네비/alert 8건 배선 |
| `e2500b4` | KPI 카드 4개 onClick 통일 alert + Card onClick 파라미터 추가 |
| `673c300` | 지점 카드 3개 navigate 배선 |
| `39bccc8` | 이슈/공지 카드 클릭 배선 (alert + navigate) |
| `96031ff` | 작물 탭 useState 전환 (시각 효과만) |
| (예정) | BACKLOG 6건 + 세션 25 핸드오버 |

---

## BACKLOG 신규 (세션 25)

| ID | 카테고리 | 설명 |
|---|---|---|
| HQ-REPORT-EXPORT-001 | 기능 미구현 | 리포트 내보내기 로직·라이브러리 선정 필요 |
| HQ-CROP-REPORT-001 | 기능 미구현 | 작물별 상세 분석 보고서 페이지 없음 |
| HQ-KPI-DRILLDOWN-001 | 기능 미구현 | KPI 4개 드릴다운 페이지 부재. 일관성 유지 위해 전체 alert 처리 |
| HARVEST-CROP-FILTER-001 | 재연결 | 작물 탭 실 필터링 — HARVEST-TABLE-001 선행 |
| HQ-ISSUE-PAGE-001 | 재연결 | HQ 전용 이상 신고 페이지 신설 필요 — HQSidebar에 메뉴 추가 or `/admin/hq/issues` 라우트 신규 |

---

## 자가 검증 결과

Dashboard.jsx 내 `cursor: 'pointer'` 모든 지점 점검:
- Card KPI (L173) ✔ onClick 연결
- "지점 관리 →" (L196) ✔
- 지점 Card (L200) ✔
- 작물 탭 (L282) ✔ (Task 5)
- "보고서 열기" (L324) ✔
- "전체 → 승인" (L335) ✔
- 승인 필터 탭 (L350) ✔ (세션 24)
- 반려/승인 버튼 (L389/L393) ✔ 기존 연결
- "상세 → 경영" (L420) ✔
- "전체 → 이상신고" (L452) ✔
- 이슈 카드 (L462) ✔
- "+ 새 공지" (L486) ✔
- 공지 카드 (L495) ✔

**잔존 미연결: 0건.**

---

## 이월·후보

### DB 신설 선행 필요 (세션 26+)
- HQ-FINANCE-001 (재무 DB 트랙) — 경영지표 F-D1~3 + KPI 월 인건비 블로킹
- HARVEST-TABLE-001 (harvest_records 입력 UI) — 주간 차트·작물 필터 블로킹
- HARVEST-WEEKLY-001 (주간 집계 쿼리) — D-D2 차트
- HQ-NOTICES-META-001 (열람률 컬럼)
- HQ-BRANCHES-META-001 (지점 목표치·면적 등)

### 다음 세션 후보
- **후보 A:** HQ 이월 페이지 (Finance/GrowthCompare/Performance/DashboardInteractive)
- **후보 B:** 재배팀 `_others.jsx` 실데이터 연결 (RECONNECT-OTHERS-001)
- **후보 C:** HQ-ISSUE-PAGE-001 신설 (본 세션 파생)

세션 시작 전 CLAUDE.md 5번 절차 준수 (git log, BACKLOG, LESSONS 순독).
