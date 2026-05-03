# 트랙 77 U13 라운드 보고서 — 관리자 이상신고 상세 모달 + 사진 표시

**작성일**: 2026-05-03
**라운드 명**: track77-u13 (TRACK77-ISSUE-ADMIN-PHOTOS-001 resolve)
**기준 커밋**: `f440a12` (followup-u11 SQL 자율 실행 인프라)
**선행**: U11(진단) / U12(세션 옵션 A) / followup-u11(이상신고 사진 첨부 활성화)

---

## 0. 운영 흐름 점검 박제

지시문 §⚠️에서 본 세션이 발견한 흐름 위반(`f76ea25` + `f440a12`가 본 세션 외 자율 진행) 인지 + 동의. 향후 사용자 의견은 본 세션을 거쳐 분석 + 지시문화 후 Claude Code 진입 흐름 복귀.

---

## 1. 작업 결과

### 1.1 변경 통계
- 변경 파일: 4건 (수정 3 + 신규 1)
  - `src/stores/issueStore.js` (+25 / -2) — fetchIssues JOIN
  - `src/pages/admin/IssueCallPage.jsx` (+24 / -3) — 카드 클릭 + stopPropagation
  - `src/components/worker/IssueModal.jsx` (+6 / -2) — capture 속성 제거 (G77-U B2)
  - `src/components/admin/IssueDetailModal.jsx` (신규, 178 라인)
- 신규 디렉토리: `src/components/admin/`
- 빌드: `npm run build` exit 0 / 58.77s / PWA precache 13 entries

### 1.2 사용자 의견 4건 처리

| # | 의견 | 처리 |
|---|---|---|
| A | 사진 찍히는 것 확인됨 | 정보 — 처리 불필요 |
| B | 사진 찍기 + 갤러리 선택 양쪽 | **G77-U B2 채택** — `capture="environment"` 제거 → iOS/Android 양쪽에서 OS prompt 표시 |
| C | 신고/사진 데이터 저장 여부 | 정보 — followup-u11에서 활성화 (issue_photos 테이블 + Storage 버킷) |
| **D** | **관리자 측 상세 + 사진 표시** | **본 라운드 핵심** — IssueDetailModal 신설 + IssueCallPage 카드 클릭 + fetchIssues JOIN |

## 2. 자산 보존 검증 (7건)

| # | 자산 | 결과 |
|---|---|---|
| 1 | 출퇴근 v2 (WorkerHome.jsx 25-204) | ✅ byte-identical (diff 0) |
| 2 | QR-CORE (QrScanPage.jsx onScanSuccess 45-118) | ✅ byte-identical |
| 3 | FCM (WorkerLayout.jsx 39-66) | ✅ 미변경 (`git diff f440a12` = 0줄) |
| 4 | 76-A 자산 (components/task/**) | ✅ 미참조 |
| 5 | PWA 설치 안내 모달 | ✅ 미변경 |
| 6 | DB 스키마 | ✅ 변경 0건 (issue_photos는 followup-u11에서 박제, 본 라운드는 SELECT만) |
| 7 | 기존 T 토큰 | ✅ 미변경 (관리자 측 IssueDetailModal은 기존 T 사용, T_worker 미사용) |

## 3. 자가 검증 결과 (C1~C12)

| C# | 항목 | 결과 |
|---|---|---|
| C1 | 빌드 통과 | ✅ exit 0 / 58.77s |
| C2 | 자산 보존 7건 | ✅ |
| C3 | DB 스키마 변경 0건 | ✅ SELECT만 |
| C4 | 사진 0장 신고 | ✅ `photos: []` 빈 배열 + 모달 "첨부된 사진이 없습니다" |
| C5 | 사진 1~3장 신고 | ✅ photos 배열 + 모달 사진 그리드 |
| C6 | photo_order 정렬 | ✅ 클라이언트 측 sort `(a.photoOrder ?? 0) - (b.photoOrder ?? 0)` |
| C7 | 카드 클릭 → 모달 오픈 | ✅ `setSelectedIssue(it)` + `<IssueDetailModal open={!!selectedIssue}>` |
| C8 | 처리 시작 / 완료 버튼 stopPropagation | ✅ `(e) => { e.stopPropagation(); updateIssue?.(...) }` |
| C9 | 백드롭 클릭 → 닫힘 / 컨테이너 클릭 → 유지 | ✅ onClose + `e.stopPropagation()` |
| C10 | 사진 클릭 → 라이트박스 | ✅ `setLightbox(p.photoUrl)` |
| C11 | 라이트박스 클릭 → 닫힘 | ✅ `onClick={() => setLightbox(null)}` |
| C12 | git push origin main | (커밋 후 보고) |

## 4. 결정 게이트 자율 처리 내역

### G77-U: 의견 B Android 갤러리 = **B2 채택 (capture 속성 제거)**
- **권고 근거**:
  1. iOS/Android 양쪽에서 OS prompt 노출 (사진 보관함 + 카메라 + 파일)
  2. 변경 ~1라인 (`capture="environment"` 삭제) — 회귀 위험 극소
  3. 사용자 의견 "사진 찍기 혹은 갤러리에서 선택" 양쪽 명시 요구 충족
- **대안 비교**:
  - B1 (현상 유지): Android 일부 갤러리 불가 보고 사례 → 의견 미충족
  - B3 (버튼 2개 분리): UI 변경 量 ↑, 본 라운드 범위 초과
- **사후 검토 권고**: 모바일 PWA에서 prompt 옵션 동작 사용자 검증 (iOS / Android 양쪽). B1/B3 전환은 별 라운드.

### G77-V: 라이트박스 = **단순 클릭 확대 (좌우 스와이프 / pinch-zoom 미구현)**
- **권고 근거**: 본 라운드 범위 단순화. 사용자 빈도 추적 후 BACKLOG 신규(`TRACK77-ISSUE-LIGHTBOX-ENHANCED-001`) 결정.
- **대안**: Swiper.js / react-image-lightbox 도입 — 의존성 + 회귀 위험

### G77-W: photo_order = **클라이언트 측 정렬**
- **권고 근거**: PostgREST nested `select` ORDER BY 환경 차이. JS sort는 안전하고 비용 무시.
- **대안**: PostgREST `select=photos:issue_photos(...)&order=photos.photo_order` — 환경별 동작 검증 부담

### G77-X: 모달 state = **useState 로컬**
- **권고 근거**: 트랙 77 Q5 패턴 추종 (모달 state 로컬). Zustand 도입 시 컨텍스트 누수.

### G77-Y: 처리 액션 = **모달 내 + 페이지 카드 양쪽 유지**
- **권고 근거**: 페이지 카드 액션은 빠른 처리 (모달 미오픈), 모달 내 액션은 상세 확인 후 처리. 병행 사용성 ↑.

### G77-Z: issue_photos JOIN 작업자 영향
- **확인**: 작업자는 `useIssueStore.fetchIssues`를 호출하지 않음. JOIN 추가는 관리자 페이지에만 영향. 작업자 흐름 회귀 0.
- **결정**: 코드 분기 미생성 (단일 fetchIssues 흐름 유지). 비용 무시 가능.

## 5. 사용자 검증 시나리오

### 5.1 관리자 측 (PC 브라우저 권고, S1~S10)
1. 관리자 로그인 → `/admin/issue-call` → 카드 리스트 정상 (회귀 없음)
2. **카드 클릭** (처리 버튼 영역 외) → 상세 모달 오픈
   - 헤더: Avatar + 심각도 Pill + 이름 + 상태 Pill + 카테고리 + 시각
   - 본문: 신고 내용 + 위치 + 첨부 사진 ({N}장) 그리드 (3열)
   - 액션 푸터: "처리 시작" / "완료 처리" (status에 따라)
3. **카드의 "처리 시작" / "완료" 버튼** 클릭 → 카드만 갱신, 모달 미오픈 (stopPropagation)
4. 작업자 사진 1장 신고 → 카드에 카메라 아이콘 + "1" 표시 + 모달 사진 1개
5. 작업자 사진 3장 신고 → 모달 사진 3개 (photo_order 순서)
6. 작업자 사진 0장 신고 → 모달 "첨부된 사진이 없습니다"
7. 모달 사진 클릭 → 라이트박스 전체화면 → 클릭 시 닫힘
8. 모달 백드롭 클릭 / 우상단 × → 닫힘
9. 모달 내 "처리 시작" → status=in_progress + 모달 닫힘
10. 모달 내 "완료 처리" → status=resolved + 모달 닫힘

### 5.2 작업자 측 — 의견 B 검증 (모바일 PWA, S11~S14)
11. iOS Safari PWA — 홈 FAB → 이상신고 모달 → 사진 첨부 버튼 → "사진 보관함 / 사진 찍기 / 파일 선택" prompt
12. Android Chrome PWA — 동일 흐름 → "카메라 / 파일" prompt (B2 채택 효과)
13. 작업자 사진 1장 첨부 + 신고 → success toast + 모달 닫힘 (회귀 없음)
14. 작업자 사진 3장 첨부 + 신고 → 동일

### 5.3 회귀 검증 (S15~S16)
15. 작업자 홈 / QR 스캔 / 근태 / 휴가 / 작업 / 공지 / 출퇴근 v2 → 회귀 없음
16. 관리자 다른 페이지 → 회귀 없음

## 6. 배포 / 푸시 상태

- 로컬 SHA: (커밋 후 보고)
- git push origin main: (커밋 후 실행 예정)
- Vercel webhook: 자동 트리거 예상

## 7. 발견 사항

### 7.1 PostgREST nested resource 동작
PostgREST는 FK 기반으로 자동 nested SELECT 지원. `select=*, photos:issue_photos(id, photo_url, photo_path, photo_order, created_at)` 문법으로 issues + issue_photos 1:N JOIN. 응답 schema는 issues row의 `photos` 필드에 issue_photos 배열 박제. snakeToCamel 적용 후 `photos`는 키 유지(이미 영어), 각 요소는 camelCase.

### 7.2 의견 B B2 채택 근거 (capture 속성 제거)

| 옵션 | 변경 라인 | iOS Safari | Android Chrome | 사용자 명시성 |
|---|---|---|---|---|
| B1 (현상) | 0 | OK (prompt) | 일부 카메라 강제 | △ |
| **B2 (채택)** | ~1 | **OK (prompt)** | **OK (prompt)** | ○ |
| B3 (버튼 2개) | ~30 | OK | OK | ◎ |

B2가 변경 量 / 의견 충족 / 회귀 위험의 최적 균형.

### 7.3 라이트박스 미구현 기능 (BACKLOG 후보)
- 좌우 스와이프 (사진 다수 첨부 시 UX)
- pinch-zoom (모바일 핀치 줌)
- 키보드 ESC 닫힘
- 사진 다운로드 버튼

→ `TRACK77-ISSUE-LIGHTBOX-ENHANCED-001` BACKLOG 박제.

### 7.4 BACKLOG 갱신
- `TRACK77-ISSUE-ADMIN-PHOTOS-001`: open → **resolved** (U13)
- `TRACK77-ISSUE-LIGHTBOX-ENHANCED-001`: 신규 박제 (사용자 요구 시 별 트랙)
- `TRACK77-ISSUE-PHOTO-DELETE-001`: 신규 박제 (G-Storage-8 immutable 정책 변경 시)

### 7.5 향후 SafetyIssuesPage / HQIssuesScreen
관리자 측 다른 이상신고 페이지(`SafetyIssuesPage` / `HQIssuesScreen`)는 본 라운드 미적용. 사용자 요구 시 동등 패턴 적용 별 라운드.

## 8. 다음 라운드

운영 모니터링:
- 사용자 §5 시나리오 통과 확인
- 모바일 의견 B 동작 검증 (iOS / Android prompt)
- 운영 중 라이트박스 / 사진 삭제 요구 발생 시 BACKLOG 등록 항목 진입

---

**끝.**
