# Phase 5 세션 29 인수인계

날짜: 2026-04-24  
작업자: Claude Code (세션 29)  
세션 목적: HQ 영역 전수조사 (발견만, 수정 없음)  
마지막 커밋: 96c996c (세션 28 — 이번 세션은 문서 커밋으로 마감)

---

## 세션 요약

HQ 9개 페이지 (`/admin/hq/*`) 전수조사 완료.  
Playwright CLI v1.59.1 (headless Chromium) + Supabase MCP DB 대조.  
**수정 0건, 발견 27건** (P0:0 P1:4 P2:19 P3:4).

---

## 주요 결과

### BUG-F01 / BUG-F02 회귀 테스트
| 항목 | 결과 |
|------|------|
| BUG-F01: 부동소수점 미포맷 | ✅ PASS |
| BUG-F02: 작물 탭 제거 + 그룹 막대 | ✅ PASS |

### DB 수치 일치
- 이번달 수확량: DB `8,782.5 kg` = UI `8,782.5 kg` ✅
- 부산LAB: `3,964.3 kg` / 진주HUB: `3,115.7 kg` / 하동HUB: `1,702.5 kg` ✅

### 핵심 발견

1. **공통 패턴 A**: `_pages.jsx` 전체에서 `btnPrimary/btnSecondary` onClick 3번째 인자 미전달 → 9개 버튼 무반응 (`primitives.jsx:225` 서명 있으나 호출 시 생략)
2. **HQ-EMP-SEARCH-001 재오픈**: BACKLOG "resolved (세션 24)" 표기 오류. `_pages.jsx:566` 여전히 `<span>` — 세션 24 커밋 2건(`714619f`, `58c45b7`) 모두 span→input 교체 없음
3. **패턴 B**: 4개 페이지(Finance/Growth/Performance/DashboardInteractive) 하드코딩 — DB 소스 없음
4. **HQ-FINANCE-CONSOLE-ERR-001**: Finance 페이지 console 에러 1건 (에러 메시지 미확인, 재조사 필요)

---

## 생성 파일

| 파일 | 설명 |
|------|------|
| `docs/AUDIT_SESSION29_HQ.md` | HQ 전수조사 리포트 (27개 이슈 전체 상세) |
| `docs/audit_session29_results.json` | Playwright 원시 결과 JSON |
| `scripts/audit_hq.cjs` | Playwright 감사 스크립트 |
| `docs/audit_screenshots/*.png` | 18개 스크린샷 |

---

## BACKLOG 변경

| 변경 | 항목 |
|------|------|
| 재오픈 | HQ-EMP-SEARCH-001 |
| 신규 등록 | HQ-BRANCH-MAP-001, HQ-BRANCH-ADD-001, HQ-BRANCH-CONTACT-001 |
| 신규 등록 | HQ-APPROVAL-EXPORT-001, HQ-APPROVAL-RULE-001 |
| 신규 등록 | HQ-NOTICE-CREATE-001, HQ-NOTICE-READ-REPORT-001 |
| 신규 등록 | HQ-FINANCE-PDF-EXPORT-001, HQ-FINANCE-CONSOLE-ERR-001 |
| 신규 등록 | HQ-GROWTH-ALERT-SEND-001, HQ-EMP-INACTIVE-DISPLAY-001 |

---

## LESSONS 추가

- **교훈 53**: Playwright `page.once('dialog')` 패턴 핸들러 충돌 → `page.on()` 전역 단일 핸들러
- **교훈 54**: `"type": "module"` 환경에서 CJS Node 스크립트는 `.cjs` 확장자 필수
- **교훈 55**: `harvest_records`에 `branch_id` 없음 — `employees.branch` 경유 JOIN

---

## 태우님 결정 필요

### Q1. HQ-EMP-SEARCH-001 재오픈 확인
BACKLOG에 세션 24 "resolved" 표시됐으나 코드 미수정. 재오픈으로 처리함.  
세션 29 우선순위 P1 — 다음 세션에서 `_pages.jsx:566` `<span>` → `<input>` 교체 권장.

### Q2. 비활성 직원 41행 표시 의도 확인 (HQ-EMP-INACTIVE-DISPLAY-001)
DB 활성 38명, UI 41행 — `is_active=false` 직원 3명 포함 가능성.  
의도적 표시라면 BACKLOG 메모 추가, 비의도적이면 수정.

### Q3. 지점 "상세 →" / "지점 상세 보기 →" 버튼 목적지
Branches `상세 →`, Growth `지점 상세 보기 →` 클릭 시 URL 변화 없음.  
목표 페이지 설계 있는지, 아직 미구현인지 확인.

### Q4. Finance console 에러 우선순위 (HQ-FINANCE-CONSOLE-ERR-001)
에러 메시지 미확인 상태. 재조사 필요 여부 알려주시면 세션 30에서 처리 가능.

---

## 다음 세션 후보

| 우선순위 | 항목 |
|---------|------|
| P1 즉시 | HQ-EMP-SEARCH-001: `_pages.jsx:566` `<span>` → `<input>` |
| P1 즉시 | HQ-EMPLOYEE-EDIT-MODAL-001: 직원 상세 "상세" 버튼 모달 연결 |
| P1 권장 | HQ-NOTICE-CREATE-001: "새 공지 작성" 모달 구현 |
| 묶음 처리 | 패턴 A (btnPrimary onClick 9건) 일괄 onClick 핸들러 연결 |
| 별 세션 | HQ-FINANCE-CONSOLE-ERR-001: Finance 에러 원인 규명 |
| 별 트랙 | HQ-FINANCE-001, HQ-GROWTH-001, HQ-PERFORMANCE-001, HQ-DASHBOARD-INTERACTIVE-001 (각 실데이터 연결) |

---

## 참고: 감사 스크립트 재실행 방법

```bash
# 개발 서버가 http://localhost:5173 에서 실행 중이어야 함
npm run dev &
node scripts/audit_hq.cjs
# 결과: docs/audit_session29_results.json, docs/audit_screenshots/
```

로그인 계정: `jhkim / rmfpvm001` (tukim 계정은 /admin/hq 라우팅 불가)
