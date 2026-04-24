# Phase 5 세션 36 인수인계

날짜: 2026-04-24  
작업자: Claude Code (세션 36)  
세션 목적: 재배팀 긴급 이슈 진단 + 작물 분배 재구성 + UI 개선 3건  
마지막 커밋: b7dac83

---

## 세션 요약

Task 0(화이트 스크린 진단), Task 1(신규 작물 2종), Task 2(harvest_records 재시드), Task 3(Dashboard 차트 가로 배치), Task 4(로그아웃 버튼) 전부 완료.  
**Playwright PASS 19 / FAIL 0 / WARN 1 / TOTAL 20**.  
신규 교훈 1건(62) 추가. 신규 BACKLOG 5건 등록/해소.

---

## 구현 내용

### Task 0: 재배팀 화이트 스크린 진단

| 경로 | 진단 결과 | 대응 |
|------|-----------|------|
| `/admin/growth` | DB 빈 상태 → `if (!data?.length) return <div>데이터가 없습니다</div>` 정상 | 스킵 |
| `/admin/performance` | 동일 패턴 | 스킵 |
| `/admin/stats` | performanceStore 0건 → KPI 0 + "평가 데이터가 없습니다" | 스킵 |

- 코드 버그 없음. FARM-GROWTH-DB-001·FARM-PERF-DATA-001 트랙으로 이관.
- **교훈 62** 추가: 빈 상태 UI ≠ 버그 — DB 데이터 유무 분류 선행.

### Task 1: 신규 작물 2종 추가 — CROP-ADD-S36-001

**마이그레이션:** `supabase/migrations/20260424_session36_new_crops.sql`  
- `미니오이` (task_types: 수확·유인·결속·적엽·병해충 예찰·EC/pH 측정)
- `완숙토마토` (task_types: 수확·유인·결속·적엽·병해충 예찰·EC/pH 측정·수분 작업)
- WHERE NOT EXISTS guard 포함 (멱등성)
- DB 실행 완료 ✅

### Task 2: harvest_records 재시드 — HARVEST-RESEED-S36-001

**마이그레이션:** `supabase/migrations/20260424_session36_reseed_harvest.sql`  
- 이전: 509건 (session27 busan 토마토·방울토마토 / jinju 파프리카·미니파프리카 / hadong 딸기·오이)
- 이후: 515건 (30일)

| 지점 | 작물 | 건수 | 합계 |
|------|------|------|------|
| busan | 토마토 | 75 | 2,280.3 kg |
| busan | 방울토마토 | 56 | 796.3 kg |
| busan | 완숙토마토 | 59 | 2,082.7 kg |
| jinju | 미니오이 | 156 | 3,080.1 kg |
| hadong | 완숙토마토 | 169 | 5,957.2 kg |

busan 3종 균등 배분: `floor(random() * 3)::int` — ~33% 확률.  
DB 실행 완료 ✅

### Task 3: Dashboard 차트 가로 배치 — DASHBOARD-CHART-LAYOUT-001

**수정 파일:** `src/pages/hq/Dashboard.jsx`

| 항목 | 변경 전 | 변경 후 |
|------|---------|---------|
| BRANCH_CROPS busan | `['토마토','방울토마토']` | `['토마토','방울토마토','완숙토마토']` |
| BRANCH_CROPS jinju | `['파프리카','미니파프리카']` | `['미니오이']` |
| BRANCH_CROPS hadong | `['딸기','오이']` | `['완숙토마토']` |
| CROP_COLORS busan | `{main,sub}` | `{main,sub,sub2:'#818CF8'}` |
| 차트 외부 컨테이너 | `flexDirection:'column'` | `flexDirection:'row'` |
| 각 지점 래퍼 | 없음 | `flex:1` 추가 |
| 막대 높이 | 52px | 64px (가로 배치에서 가시성 확보) |
| 색상 선택 | `ci===0?main:sub` | `ci===0?main:ci===1?sub:(sub2||sub)` |

### Task 4: 로그아웃 버튼 — MOBILE-LOGOUT-001

**수정 파일 1:** `src/pages/mobile/_screens.jsx`
- `import { useNavigate } from 'react-router-dom'` 추가
- `MobileProfileScreen` 상단: `logout = useAuthStore((s) => s.logout)`, `navigate = useNavigate()` 선언
- 기존 로그아웃 버튼에 `onClick={async () => { await logout(); navigate('/login'); }}` 연결

**수정 파일 2:** `src/design/hq-shell.jsx`  
- HQSidebar 하단: 프로필 행에서 logout onClick 분리 → 별도 "로그아웃" 텍스트+아이콘 버튼으로 변경
- hover시 `dangerSoft` 배경 효과 추가

**수정 파일 3:** `src/design/primitives.jsx`  
- 재배팀 Sidebar 동일 패턴 적용

---

## Playwright 결과

`scripts/audit_session36.cjs` — **19/20 PASS, 0 FAIL, 1 WARN**

| 섹션 | 검증 항목 | 결과 |
|------|-----------|------|
| A-1 | MPROFILE 로그아웃 버튼 텍스트 + 콘솔 에러 없음 + "윤화순" 표시 | PASS (4항목) |
| A-1 | 하드코딩 "김민국" 없음 회귀 | PASS |
| B-1 | jhkim 로그인 | PASS |
| B-2 | BUG-F01 부동소수점 회귀 없음 | PASS |
| B-3 | BUG-F02 작물 탭 회귀 없음 | PASS |
| B-4 | 3지점·미니오이·완숙토마토 차트 표시 | PASS (3항목) |
| B-5 | HQ 사이드바 "로그아웃" 텍스트 존재 | PASS |
| B-6 | KPI 드릴다운 세션35 회귀 없음 | PASS |
| B-7 | 직원 편집 모달 세션35 회귀 없음 | PASS |
| B-8 | 기간 탭 4개 세션34 회귀 없음 | PASS |
| B-9 | 재배팀 사이드바 — farm_admin 로그인 필요 | WARN (스킵) |
| B-10 | HQ 콘솔 에러 0건 | PASS |
| B-11 | growth·performance·stats 빈 상태 정상 | PASS (3항목) |

스크린샷: `docs/regression_session36/`  
결과 JSON: `docs/regression_session36/results.json`

---

## BACKLOG 변경

| 변경 | 항목 |
|------|------|
| resolved | MOBILE-LOGOUT-001 (모바일 로그아웃 버튼 onClick 연결) |
| resolved | HARVEST-RESEED-S36-001 (509건 삭제 + 515건 재시드) |
| resolved | CROP-ADD-S36-001 (미니오이·완숙토마토 추가) |
| resolved | DASHBOARD-CHART-LAYOUT-001 (차트 가로 배치) |
| resolved (스킵) | GROWTH-EMPTY-STATE-001 (빈 상태 = 정상, 코드 수정 불필요) |

---

## 교훈

- 교훈 62: 빈 상태 UI는 코드 버그가 아님 — Playwright 감사 시 빈 상태 vs 실 콘텐츠 구분 필수 (LESSONS_LEARNED.md)

---

## 다음 세션 후보 (세션 37)

| 우선순위 | 항목 |
|---------|------|
| P2 | FARM-GROWTH-DB-001: Growth.jsx DB 연결 (standard_curves·marker_plants·growth_surveys) |
| P2 | FARM-PERF-DATA-001: Performance.jsx DB 연결 |
| P3 | APPROVAL-BUDGET-001, APPROVAL-HR-001, APPROVAL-MATERIAL-001 (도메인 확인 선행) |
| P3 | HQ-ISSUE-PAGE-001: HQ 전용 이상 신고 페이지 |
| P3 | HARVEST-TARGETS-001: 지점별 월간 수확 목표치 설계 (박민식·김민국 답변 선행) |
| P3 | FARM-DASH-EXPORT-001, FARM-AI-APPLY-001, FARM-AI-DETAIL-001 |
