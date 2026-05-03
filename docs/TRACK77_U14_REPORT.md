# 트랙 77 U14 라운드 보고서 — 이상신고 사진 Signed URL + 사이드바 메뉴 확장 + 라우트 통일

**작성일**: 2026-05-03
**라운드 명**: track77-u14
**기준 커밋**: `d0db1c4` (U13 클로징)
**선행**: U11(진단) / U12(세션 옵션 A) / followup-u11(이상신고 사진 첨부) / U13(관리자 상세 모달)

---

## 1. 작업 결과

### 1.1 변경 통계
- 변경 파일: 6건 (수정 6, 신규 0)
  - `src/App.jsx` (+5/-1) — 라우트 통일 + redirect
  - `src/components/admin/IssueDetailModal.jsx` (+86/-6) — useEffect Signed URL + onError fallback
  - `src/components/layout/AdminBottomNav.jsx` (+3/-3) — 라벨/경로 통일
  - `src/components/layout/Sidebar.jsx` (+4/-1) — 라벨 통일 + 안전관리 3곳에 추가
  - `src/lib/issueStorage.js` (+27/-0) — `getSignedUrlsForPhotos` 추가
  - `src/pages/admin/AdminDashboard.jsx` (+1/-1) — navigate 경로 통일
- 빌드: `npm run build` exit 0 / 44.88s / PWA precache 13 entries

### 1.2 사용자 의견 5건 처리

| # | 항목 | 처리 |
|---|---|---|
| A | 사진 미렌더 | **fix 1** — `createSignedUrls()` + useEffect 동적 발급 + onError fallback |
| B | farm_admin 메뉴 부재 | **확인** — 코드상 productionCategory에 존재. 라벨 "신고·호출" → "이상신고" 통일 |
| C | hr/master 메뉴 부재 | **fix 2** — mgmt/master "안전 관리" 카테고리에 신규 추가 |
| D | 라벨 불일치 | **fix 3** — 모든 라벨 "이상신고" 통일 (Sidebar farm + AdminBottomNav + 안전관리 3곳) |
| E | 경로 불일치 | **fix 4** — `/admin/records` → `/admin/issue-call` 통일, `/admin/records` redirect 호환 |

## 2. 자산 보존 검증 (7건)

| # | 자산 | 결과 |
|---|---|---|
| 1 | 출퇴근 v2 (WorkerHome.jsx 25-204) | ✅ byte-identical (diff 0) |
| 2 | QR-CORE (QrScanPage.jsx onScanSuccess 45-118) | ✅ byte-identical |
| 3 | FCM (WorkerLayout.jsx 39-66) | ✅ 미변경 |
| 4 | 76-A 자산 | ✅ 미참조 |
| 5 | PWA 설치 안내 모달 | ✅ 미변경 |
| 6 | DB 스키마 / Storage 정책 | ✅ 변경 0건 (Signed URL은 기존 RLS 사용) |
| 7 | 기존 T 토큰 | ✅ 미변경 |

## 3. 자가 검증 결과 (C1~C13)

| C# | 항목 | 결과 |
|---|---|---|
| C1 | 빌드 통과 | ✅ exit 0 / 44.88s |
| C2 | 자산 보존 7건 | ✅ |
| C3 | DB 스키마 / Storage 정책 변경 0건 | ✅ |
| C4 | `getSignedUrlsForPhotos` export 추가 | ✅ src/lib/issueStorage.js |
| C5 | useEffect cleanup (cancelled flag) | ✅ unmount 시 setState 차단 |
| C6 | photos 0장 → 발급 호출 안 함 | ✅ early return |
| C7 | "신고·호출" 라벨 0건 | ✅ src/ grep 0건 |
| C8 | 안전관리 카테고리 items 길이 = 3 (TBM/이상신고/안전이슈) | ✅ farm/mgmt/master 모두 |
| C9 | `/admin/issue-call` 라우트 + `/admin/records` redirect | ✅ App.jsx:188-191 |
| C10 | Navigate import 정상 | ✅ App.jsx:2 (이미 있음) |
| C11 | TRACK77-U14 마커 | ✅ 6건 (App/Modal/lib) |
| C12 | `/admin/records` 사용처 | ✅ 1건만 (App.jsx:190 redirect 주석 — 의도) |
| C13 | git push origin main | (커밋 후 보고) |

## 4. 결정 게이트 자율 처리 내역

### G77-AA: Signed URL TTL = **3600초 (1시간)**
- 권고 근거: 모달 단일 세션 사용 충분, TTL 짧으면 재발급 부담, 길면 만료 위험. 1시간이 균형점.
- 대안: 5분(짧음) / 24시간(보안 ↓)

### G77-BB: 발급 실패 fallback = **저장된 photoUrl + onError placeholder**
- 권고 근거: photoUrl(publicUrl)도 broken 가능성 ↑. onError로 catch 후 "사진 로드 실패" placeholder 표시.
- 사용자 경험: broken image 회피 + 로드 실패 명시

### G77-CC: 라이트박스 src도 Signed URL 사용 + TTL 만료 시 재발급 미구현
- 권고 근거: 단일 세션 1시간 충분. 빈도 ↑ 시 BACKLOG `TRACK77-ISSUE-LIGHTBOX-RENEW-001` 진입.
- 대안: onError 시 재발급 (복잡도 ↑)

### G77-DD: 라우트 통일 = **`/admin/issue-call`** + `/admin/records` redirect 호환
- 권고 근거: 페이지 헤더 `이상신고·긴급연락`과 URL 의미 일치. 기존 북마크 보호.

### G77-EE: 메뉴 라벨 = **"이상신고"**
- 권고 근거: "신고·호출"은 모호. "이상신고"가 페이지 헤더와 일치.

### G77-FF: 메뉴 위치 = **"안전 관리" 카테고리** (모든 역할 동일 위치)
- 권고 근거: TBM/이상신고/안전이슈 묶음이 자연스러움. farm은 productionCategory에도 노출됨 (양쪽 노출 → 사용자 어느 카테고리에서든 찾기 ↑)

### G77-GG: 작업자 측 사진 미표시 정책 (G-Storage-7) = **본 라운드 미변경**
- 권고 근거: 사용자 의견 D는 관리자 측만 명시. 작업자 측은 BACKLOG `TRACK77-ISSUE-WORKER-PHOTO-VIEW-001` 박제.

### G77-HH (자율 추가): AdminBottomNav + AdminDashboard도 일관성 통일
- 권고 근거: 지시문은 명시 안 했으나 사용자 의도와 정합 (모든 진입점 라벨/경로 통일). 변경 ~3라인.

## 5. 사용자 검증 시나리오

### 5.1 사진 표시 (PC 권고, S1~S4)
1. 관리자(@hdkim, farm_admin) 로그인 → 사이드바 hover → "안전 관리" 펼침 → "이상신고" 클릭
2. 카드 클릭 → 상세 모달 → "사진 불러오는 중…" 잠깐 → 사진 정상 렌더
3. 사진 클릭 → 라이트박스 전체화면
4. F12 네트워크 탭에서 사진 요청 URL 확인 → `?token=eyJ...` Signed URL (publicUrl 아님)

### 5.2 메뉴 노출 (S5~S8)
- farm_admin / hr_admin / supervisor / master 모두 "안전 관리" → "이상신고" 노출

### 5.3 라우트 호환 (S9~S10)
- 기존 북마크 `/admin/records` → `/admin/issue-call` 자동 redirect
- 신규 경로 `/admin/issue-call` 직접 접속 → 페이지 정상

### 5.4 회귀 검증 (S11~S13)
- 작업자 이상신고 모달 + 사진 첨부 + 신고 (followup-u11 흐름) → 회귀 없음
- 다른 관리자 페이지 → 회귀 없음
- 작업자 출퇴근 v2 / QR-CORE → 회귀 없음

### 5.5 사이드바 hover 동작 안내 (PC)
- 사이드바 좌측 영역 마우스 hover → 카테고리 펼침
- 모바일은 사이드바 미표시 (md: 이상에서만)
- 모바일 진입 동선은 BACKLOG `TRACK77-ISSUE-MOBILE-ADMIN-001` 박제

## 6. 배포 / 푸시 상태

- 로컬 SHA: (커밋 후 보고)
- git push origin main: (커밋 후 실행 예정)
- Vercel webhook: 자동 트리거 예상

## 7. 발견 사항

### 7.1 followup-u11 publicUrl lessons
followup-u11 `issueStorage.uploadIssuePhotoOnce`가 `getPublicUrl()` 결과를 `photo_url` 컬럼에 저장. 비공개 버킷(`public=false`)에서 publicUrl은 401/403 → broken image. **U13에서 사용자 신고로 발견** → U14 fix.

LESSONS 145 박제: "비공개 Storage 버킷 + getPublicUrl() 호환 함정"
- 해결 패턴: 업로드 시 path만 저장, 표시 시점 `createSignedUrls()` 동적 발급

### 7.2 사이드바 hover + 모바일 미노출
- PC: 사이드바 hover 안 하면 아이콘만 보임 (line 256 `group-hover:max-h-[600px]`). farm 메뉴에 이상신고 항목 코드상 존재했으나 사용자가 hover 안 해 못 본 가능성.
- 모바일: 사이드바 자체 미노출 (`hidden md:flex`). 모바일 관리자 진입은 AdminBottomNav 의존.
- **BACKLOG `TRACK77-ISSUE-MOBILE-ADMIN-001`** 박제.

### 7.3 라이트박스 만료 처리 미구현
- TTL 1시간. 모달 열린 채로 1시간 초과 시 broken (재오픈 시 정상).
- 모바일 신고 검토 빈도 ↓이라 실효 영향 적음.
- **BACKLOG `TRACK77-ISSUE-LIGHTBOX-RENEW-001`** 박제 (빈도 ↑ 시 진입).

### 7.4 작업자 측 사진 미표시 (G-Storage-7) 그대로 유지
- 본 라운드 범위 외. **BACKLOG `TRACK77-ISSUE-WORKER-PHOTO-VIEW-001`** 박제.

### 7.5 AdminBottomNav + AdminDashboard 일관성 통일
- 지시문 §3에 명시 안 됐으나, "신고·호출" / "/admin/records" 잔존 grep으로 발견.
- 자율 결정 G77-HH로 통일 (변경 ~3라인).
- redirect 경로로 동작 호환은 보장됐으나 일관성 ↑.

## 8. BACKLOG 갱신

| ID | 변경 |
|---|---|
| TRACK77-ISSUE-LIGHTBOX-RENEW-001 | **신규** (Signed URL TTL 만료 재발급) |
| TRACK77-ISSUE-MOBILE-ADMIN-001 | **신규** (모바일 관리자 진입점) |
| TRACK77-ISSUE-WORKER-PHOTO-VIEW-001 | **신규** (작업자 자기 신고 사진 표시 — G-Storage-7 변경 시) |

LESSONS_LEARNED 145 박제 (비공개 Storage + getPublicUrl 함정).

## 9. 운영 흐름 박제

본 의견은 본 세션 (운영 채팅방) 거쳐 정상 진입 ✅. U13 합의 흐름 유지 확인.

## 10. 다음 라운드

- 사용자 §5 시나리오 검증 (S1~S13 통과 확인)
- 통과 시 작업자 의견 3 클로징
- 운영 모니터링 후 Lightbox 만료 / 모바일 진입점 / 작업자 사진 표시 등 BACKLOG 진입 검토

---

**끝.**
