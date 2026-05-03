# 트랙 77 U15 라운드 보고서 — Sidebar 정정 (U14 진단 오류) + 사진 진단 로그

**작성일**: 2026-05-03
**라운드 명**: track77-u15
**기준 커밋**: `5226b96` (U14 push)
**선행**: U13(관리자 상세) / U14(Signed URL — Sidebar 잘못 수정)

---

## 0. U14 진단 오류 + 정정 절차 박제

### 0.1 사실
- U14 운영 세션이 `src/components/layout/Sidebar.jsx` 수정 지시
- 해당 파일은 **dead code** — `grep -rn "from.*components/layout/Sidebar" src/` 결과 **0건**
- 실제 화면의 Sidebar는 `src/design/primitives.jsx:162-` 정의 + `AdminLayout.jsx:3` import
- U14 변경 + 빌드 통과 + push 완료했으나 **사용자 화면 영향 0**

### 0.2 사용자 캡처 매핑
사이드바 메뉴 (대시보드 / 직원 관리 / ... / 실시간 평면도 / 생육조사 / 성과 분석 / 공지사항)는 `primitives.jsx:166-176` items 배열 100% 일치. "부산LAB · 온실" 텍스트도 line 193에 있음.

### 0.3 정정 절차
- U15에서 `primitives.jsx` items 배열에 "이상신고" 추가 (line 175)
- `AdminLayout.jsx` FARM_ROUTES에 `'issue-call': '/admin/issue-call'` 매핑 추가
- `components/layout/Sidebar.jsx` dead code 삭제 (G77-II 옵션 A)
- LESSONS 146 박제 — "화면→컴포넌트 매핑 검증 없이 파일 수정 지시 금지"

## 1. 작업 결과

### 1.1 변경 통계
- 변경 파일: 4건 (수정 3 + 삭제 1)
  - `src/design/primitives.jsx` (+2/-0) — items 배열에 이상신고 추가 (T 객체 미변경)
  - `src/components/layout/AdminLayout.jsx` (+2/-0) — FARM_ROUTES 매핑
  - `src/components/admin/IssueDetailModal.jsx` (+27/-3) — 진단 로그 4건 + 주석
  - `src/components/layout/Sidebar.jsx` — **삭제** (dead code)
- 빌드: `npm run build` exit 0 / 58.53s / PWA precache 13 entries

## 2. 자산 보존 검증 (7건 — 자산 7번 byte-identical 강조)

| # | 자산 | 결과 |
|---|---|---|
| 1 | 출퇴근 v2 (WorkerHome.jsx 25-204) | ✅ byte-identical (diff 0줄) |
| 2 | QR-CORE (QrScanPage.jsx onScanSuccess 45-118) | ✅ byte-identical |
| 3 | FCM (WorkerLayout.jsx 39-66) | ✅ 미변경 |
| 4 | 76-A 자산 | ✅ 미참조 |
| 5 | PWA 설치 안내 모달 | ✅ 미변경 |
| 6 | DB 스키마 / Storage 정책 | ✅ 변경 0건 |
| **7** | **기존 T 토큰 (primitives.jsx:7-30)** | ✅ **byte-identical (diff 0줄, T_worker도 동일)** |

primitives.jsx 수정은 items 배열(line 166-178) 한정. T / T_worker / Card / Pill / Avatar / icons / Sidebar 본체 / TopBar / btn 헬퍼 모두 미변경 (자산 7번 엄격 준수).

## 3. 자가 검증 결과 (C1~C12)

| C# | 항목 | 결과 |
|---|---|---|
| C1 | 빌드 통과 | ✅ exit 0 / 58.53s |
| **C2** | **자산 7번 (T 객체) byte-identical** | ✅ `diff 5226b96..HEAD primitives.jsx[7-30]` = **0줄** |
| C3 | 자산 보존 6건 미변경 | ✅ 출퇴근 v2 / QR-CORE byte-identical |
| C4 | primitives Sidebar items에 "이상신고" 추가 | ✅ `grep "이상신고" primitives.jsx` = 2건 (주석 1 + 항목 1) |
| C5 | FARM_ROUTES `'issue-call': '/admin/issue-call'` | ✅ `grep "issue-call" AdminLayout.jsx` = 1건 |
| C6 | 클릭 흐름 — items.id='issue-call' → onNavigate('issue-call') → FARM_ROUTES['issue-call'] → '/admin/issue-call' | ✅ 코드 흐름 정합 |
| C7 | 진단 로그 박제 | ✅ `grep TRACK77-U15-DIAG IssueDetailModal.jsx` = 10건 (4 console + 6 주석) |
| C8 | dead code Sidebar.jsx 삭제 | ✅ 파일 부재 + 참조 0건 (주석 1건은 의도적 lessons) |
| C9 | LESSONS 146 박제 | ✅ docs/LESSONS_LEARNED.md |
| C10 | git push origin main | (커밋 후 보고) |
| C11 | Vercel webhook | (push 후) |
| C12 | 본 세션 진단 오류 + 정정 절차 보고서 §0 박제 | ✅ |

## 4. 결정 게이트 자율 처리 내역

### G77-II: dead code Sidebar.jsx = **옵션 A 삭제**
- 권고 근거:
  1. 향후 동일 혼란(U14 같은 잘못된 파일 수정) 회피
  2. 파일 검색 시 노이즈 ↓
  3. git history는 보존되므로 미래 부활 가능
- 삭제 후 참조 0건 (주석 1건은 의도적 lessons 박제)

### G77-JJ: 이상신고 아이콘 = **`icons.alert`**
- 권고 근거:
  1. primitives.jsx:126에 `alert` 정의 존재 (느낌표 삼각형 SVG)
  2. 이상신고의 의미와 시각 일치
  3. fallback 불필요 (icons.alert 정상 존재 확인)

### G77-KK: HQSidebar (mgmt/master) 메뉴 = **본 라운드 외 (BACKLOG)**
- 권고 근거: 사용자 = farm_admin이라 본 라운드 범위 외. HQ_ROUTES.issues = `/admin/hq/issues` 별 페이지 사용 중.
- 박제: BACKLOG `TRACK77-HQSIDEBAR-ISSUE-001`

### G77-LL: 진단 로그 prefix = **`[TRACK77-U15-DIAG]`**
- 권고 근거: U16 fix 시 grep 일괄 제거. U11-DIAG / U15-DIAG 명확 분리

### G77-MM: LESSONS 146 박제 = **적용**
- 권고 근거: 본 세션 진단 오류 패턴은 향후 동일 위험. 의무 절차 박제로 재발 방지

## 5. 사용자 검증 시나리오

### 5.1 사이드바 메뉴 (즉시)

| # | 시나리오 | 기대 |
|---|---|---|
| S1 | 관리자(@hdkim, farm_admin) 강제 새로고침 (Ctrl+Shift+R) | "이상신고" 메뉴가 사이드바 9번째 위치 (성과 분석 다음, 공지사항 앞)에 노출 |
| S2 | "이상신고" 클릭 | `/admin/issue-call` 페이지 진입 + 헤더 "이상신고·긴급연락" 정상 |
| S3 | 메뉴 active 표시 | "이상신고" 메뉴 indigo 활성 (FARM_ROUTES 자동 매핑) |

### 5.2 사진 진단 (F12 필수, 운영 세션 회신)

| # | 행동 | 박제 항목 |
|---|---|---|
| S4 | F12 → Console "Preserve log" ON | 로그 보존 |
| S5 | F12 → Network "Preserve log" ON + 필터 "img" or "storage" | 사진 요청 추적 |
| S6 | "이상신고" 페이지 → 첨부 사진 있는 카드 클릭 | 다음 4종 콘솔 로그 캡처 |
| S6.1 | `[TRACK77-U15-DIAG] IssueDetailModal photos input` | photoCount / photos 배열 / pathsCount |
| S6.2 | `[TRACK77-U15-DIAG] Signed URL 발급 결과` 또는 `발급 실패` | requestedPaths / receivedKeys / sample |
| S6.3 | `[TRACK77-U15-DIAG] img onError` (실패 시만) | photoPath / attemptedSrc / naturalWidth |
| S6.4 | Network 탭 사진 요청 status code | 200 / 401 / 403 / 404 |

### 5.3 운영 세션 회신 가이드 — 4패턴 매칭

| 패턴 | 결정 |
|---|---|
| photoCount = N + paths = 0 (`photoPath: null`) | DB 저장 누락. issue_photos.photo_path 직접 조회 → NULL 확인 |
| photoCount = N + paths = N + 발급 성공 + img onError + 401/403 | Storage RLS 차단 — 정책 점검 |
| photoCount = N + paths = N + 발급 실패 (catch) | createSignedUrls() 권한 문제 |
| photoCount = 0 (photos 빈 배열) | issueStore.fetchIssues JOIN 실패 — PostgREST nested select 문제 |

## 6. 배포 / 푸시 상태

- 로컬 SHA: (커밋 후 보고)
- git push origin main: (커밋 후 실행)
- Vercel webhook: 자동 트리거 예상

## 7. 발견 사항

### 7.1 dead code 식별 절차 (LESSONS 146 적용)
파일 수정 작업 지시 전 의무 절차:
1. `grep -rn "from.*<filename>" src/` 사용처 확인
2. 0건 = dead code 의심 (또는 별도 진입점 확인)
3. 동일 이름 컴포넌트 다중 정의 시 화면 캡처와 매핑

### 7.2 사진 미렌더 의심 4패턴 매칭표
§5.3 표 박제. 사용자 콘솔 캡처 회신 후 본 세션이 식별 → U16 fix.

### 7.3 HQSidebar (mgmt/master) 메뉴 — 별 라운드 권고
- HQ_ROUTES.issues = `/admin/hq/issues` 별 페이지 사용 중
- 통일 또는 분리 결정은 사용자 정책 후 별 라운드
- 본 라운드: farm_admin 한정

### 7.4 dead code 일괄 정리 — BACKLOG
- `TRACK77-DEAD-CODE-AUDIT-001` 박제
- src/ 전체 grep으로 사용처 0건 파일 식별 + 일괄 처리

## 8. 다음 라운드

- 사용자 §5.1 즉시 검증 (사이드바 메뉴 노출)
- 사용자 §5.2 F12 콘솔 로그 캡처 회신
- §5.3 4패턴 매칭 → U16에서 fix
- U16에서 `[TRACK77-U15-DIAG]` 일괄 제거

---

**끝.**
