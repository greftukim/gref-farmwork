# 트랙 77 U16 라운드 보고서 — 사진 미렌더 4패턴 자율 진단 + fix (snakeToCamel shallow)

**작성일**: 2026-05-03
**라운드 명**: track77-u16
**기준 커밋**: `7a39978` (U15 진단 로그)
**선행**: U13(상세 모달) / U14(Signed URL) / U15(Sidebar 정정 + 진단 로그)

---

## 0. 운영 흐름

본 라운드는 **자율 시행 강화**:
- 사용자 F12 캡처 부담 0
- Supabase Management API + Node 시뮬로 4패턴 자율 진단
- 식별된 원인 즉시 fix까지 단일 라운드
- Playwright 시뮬 미진행 (자격증명 입력 단계 진입 전 SQL+SDK 시뮬로 원인 확정)

## 1. 작업 결과

### 1.1 변경 통계
- 변경 파일: 2건
  - `src/stores/issueStore.js` (+5/-3) — fetchIssues nested photos 변환 1줄 fix
  - `src/components/admin/IssueDetailModal.jsx` (-23) — U15 진단 로그 일괄 제거 (G77-NN)
- 빌드: `npm run build` exit 0 / 19.57s / PWA precache 13 entries

### 1.2 식별된 원인
**4패턴 어느 것도 아닌 — `snakeToCamel` shallow 한계 (LESSONS 147)**

DB / Storage / RLS / PostgREST / SDK 모두 정상이었으나, `snakeToCamel`이 nested 배열 객체 키를 변환 안 함 → `photos[0].photoPath = undefined` → IssueDetailModal에서 `paths = []` → Signed URL 발급 호출 자체 안 함 → 사진 미렌더.

## 2. 자산 보존 검증 (7건)

검증 명령 raw 결과 (지시문 §2.4):

```
diff <prev>..HEAD -- src/pages/worker/WorkerHome.jsx[23-212]      → 0줄 ✅
diff <prev>..HEAD -- src/pages/worker/QrScanPage.jsx[45-118]      → 0줄 ✅
diff <prev>..HEAD -- src/design/primitives.jsx[7-30] (T 객체)     → 0줄 ✅
git diff --stat 7a39978 -- src/                                    → 2 파일만 (issueStore + IssueDetailModal)
```

| # | 자산 | 결과 |
|---|---|---|
| 1 | 출퇴근 v2 (WorkerHome.jsx 25-204) | ✅ byte-identical |
| 2 | FCM (WorkerLayout.jsx 39-66) | ✅ 미변경 |
| 3 | QR-CORE (QrScanPage.jsx 45-118) | ✅ byte-identical |
| 4 | 76-A 자산 | ✅ 미참조 |
| 5 | PWA 설치 안내 모달 | ✅ 미변경 |
| 6 | DB 스키마 / Storage 정책 | ✅ 변경 0건 (RLS 정책 부재 아님 확인만) |
| 7 | 기존 T 토큰 (primitives.jsx:7-30) | ✅ byte-identical |

## 3. 진단 결과

### 3.1 SQL 1 — issues + issue_photos 매칭 (raw 결과)
최근 10건 신고 중 2건이 `photo_count=1` + `photo_path` 정상 박제:
- `7a68c829-...` (2026-05-03 02:25:50) — `photo_paths: [a0000001-.../7a68c829-.../0.jpg]`
- `c6df25c8-...` (2026-05-03 02:05:04) — `photo_paths: [a0000001-.../c6df25c8-.../0.jpg]`

→ **패턴 (1) DB 저장 누락 배제** ✅

### 3.2 SQL 2 — storage.objects 직접 조회
실제 jpg 파일 2건 존재:
- `a0000001-.../7a68c829-.../0.jpg` — image/jpeg, 392107 bytes
- `a0000001-.../c6df25c8-.../0.jpg` — image/jpeg, 639092 bytes

→ **업로드 정상** ✅

### 3.3 SQL 3 — RLS 정책 (storage + public.issue_photos)
- `storage.objects` `issue_photos%`: 3 정책 (anon insert/select + authenticated all)
- `public.issue_photos`: 3 정책 (anon insert/select + authenticated all)

→ **패턴 (2)/(3) RLS 정책 부재 배제** ✅

### 3.4 PostgREST anon nested SELECT 시뮬
```js
const params = new URLSearchParams({
  select: '*,photos:issue_photos(id,photo_url,photo_path,photo_order,created_at)',
  order: 'created_at.desc', limit: '3',
});
// fetch ${url}/rest/v1/issues?${params} with anon key
```

결과 — HTTP 200, 3 rows 반환, `photos` 배열 정상 (사진 있는 신고 length=1, 없는 신고 length=0)

→ **패턴 (4) JOIN 실패 배제** ✅

### 3.5 SDK createSignedUrls 시뮬
`@supabase/supabase-js@2.101.1` SDK로 `createSignedUrls(paths, 3600)` 호출:

```json
[{
  "error": null,
  "path": "a0000001-.../7a68c829-.../0.jpg",
  "signedURL": "/object/sign/issue_photos/...",  // raw, prefix 없음
  "signedUrl": "https://yzqdpfauadbtutkhxzeu.supabase.co/storage/v1/object/sign/..."  // full URL
}]
```

발급된 `signedUrl`로 `HEAD` → **200 OK, image/jpeg**

→ **패턴 (5) Storage 측 / Signed URL 측 모두 정상** ✅

### 3.6 원인 추적 — `snakeToCamel` shallow 한계 확정

DB / Storage / RLS / PostgREST / SDK 모두 정상인데도 사진 미렌더 → 클라이언트 코드 분석.

`src/lib/dbHelpers.js`:
```js
export function snakeToCamel(obj) {
  if (Array.isArray(obj)) return obj.map(snakeToCamel);
  if (obj === null || typeof obj !== 'object') return obj;
  const result = {};
  for (const [key, value] of Object.entries(obj)) {
    const camelKey = key.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
    result[camelKey] = value;  // ← value 그대로! nested 객체 미변환
  }
  return result;
}
```

검증 시뮬:
```
top-level workerId: worker-uuid                   ← 변환됨
photos array: [{ id, photo_url, photo_path, ... }]  ← snake_case 유지
photos[0].photoPath: undefined                    ← 결정타
photos[0].photo_path: 'a/b/c.jpg'
```

`IssueDetailModal`의 `photos.map((p) => p.photoPath).filter(Boolean)`:
- 모든 `p.photoPath`가 `undefined` → `filter(Boolean)`이 모두 제거
- `paths = []` → useEffect early return → Signed URL 발급 호출 자체 안 함 → 사진 미렌더

## 4. 식별된 원인 (LESSONS 147)

| 항목 | 결과 |
|---|---|
| 패턴 | **신규 (5)** — `snakeToCamel` shallow 한계 |
| 발생 위치 | `src/stores/issueStore.js` `fetchIssues` |
| 영향 흐름 | nested photos 객체 키가 snake_case 유지 → 클라이언트 `p.photoPath` undefined |
| 변경량 | **1줄 fix** (`.map(snakeToCamel)` 추가) |

## 5. fix 변경 명세

### 5.1 issueStore.js fetchIssues — nested 변환 추가

**변경 전**:
```js
const sortedPhotos = Array.isArray(camel.photos)
  ? [...camel.photos].sort((a, b) => (a.photoOrder ?? 0) - (b.photoOrder ?? 0))
  : [];
```

**변경 후**:
```js
const sortedPhotos = Array.isArray(camel.photos)
  ? camel.photos.map(snakeToCamel).sort((a, b) => (a.photoOrder ?? 0) - (b.photoOrder ?? 0))
  : [];
```

핵심: `.map(snakeToCamel)` 추가로 각 photo 객체의 키를 camelCase로 변환. 이후 `a.photoOrder` 정렬도 정상 동작 (이전엔 모두 undefined로 변환되어 정렬도 사실상 안 됨).

### 5.2 IssueDetailModal.jsx — 진단 로그 제거 (G77-NN)

`[TRACK77-U15-DIAG]` 4건 console 호출 + 6건 주석 일괄 제거. 사용자 F12 콘솔 청결화.

`grep TRACK77-U15-DIAG src/` → **0건** ✅

## 6. 자가 검증 결과 (C1~C13)

| C# | 항목 | 결과 |
|---|---|---|
| C1 | 빌드 통과 | ✅ exit 0 / 19.57s |
| C2 | 자산 보존 7건 | ✅ §2 검증 명령 raw 박제 |
| C3 | 진단 SQL 1~3 raw 결과 박제 | ✅ §3.1~3.3 |
| C4 | PostgREST 시뮬 결과 박제 | ✅ §3.4 |
| C5 | SDK 시뮬 결과 박제 | ✅ §3.5 (Playwright는 미진행 — SQL+SDK로 원인 확정 가능) |
| C6 | 식별된 패턴 명시 | ✅ §4 — 신규 (5) snakeToCamel shallow |
| C7 | fix 코드 변경 + 검증 | ✅ §5 + 빌드 통과 |
| C8 | `[TRACK77-U15-DIAG]` 일괄 제거 (G77-NN) | ✅ grep 0건 |
| C9 | 진단 임시 스크립트 cleanup (G77-PP) | ✅ scripts/diag-*.cjs 4건 삭제 |
| C10 | 자격증명 .env 박제 — 미발생 | ✅ Playwright 미진행, 자격증명 사용 0 |
| C11 | git push origin main | (커밋 후 보고) |
| C12 | 사용자 검증 시나리오 | ✅ §8 |
| C13 | LESSONS / BACKLOG 갱신 | ✅ LESSONS 147 박제 |

## 7. 자율 결정 자율 처리 내역

### G77-NN: U15 진단 로그 일괄 제거 = **적용**
- 약속 이행 (G77-LL의 후속). fix 완료 후 grep 0건 확인.

### G77-OO: Playwright 시뮬 = **미진행**
- 권고 근거: SQL 3건 + PostgREST 시뮬 + SDK 시뮬로 원인 확정 가능 → Playwright 셋업 + 자격증명 + production 위험 비용 회피
- 자격증명 사용 0 → 사용자 비밀번호 변경 부담 0

### G77-PP: 진단 임시 스크립트 cleanup = **삭제**
- `scripts/diag-issues-fetch.cjs` / `diag-signed-url.cjs` / `diag-sdk-signed.cjs` / `diag-snake-test.cjs` 4건 삭제
- `scripts/run-sql.cjs` (followup-u11 신설)는 향후 라운드 자동화 인프라 → 보존

### G77-QQ: 자격증명 .env 박제 = **미발생** (Playwright 미진행)
- `.env` 미수정. 사용자 비밀번호 변경 불필요.

### G77-RR: 단일 라운드 진단 + fix = **적용**
- 진단(30초) + fix(1줄) + 빌드 + 검증 + 보고서 + push 단일 라운드 완료

### G77-SS: 신규 패턴 (5) = **`snakeToCamel` shallow** (예상 CORS 아님)
- 클라이언트 측 변환 함수 한계로 발견
- LESSONS 147 박제 (PostgREST nested resource 사용 시 deep 변환 의무)

## 8. 사용자 검증 시나리오

### 8.1 사이드바 메뉴 (U15에서 미검증, 본 라운드 같이)
- S1: 관리자 강제 새로고침 → "이상신고" 메뉴 사이드바 9번째 위치 노출
- S2: 클릭 → `/admin/issue-call` 진입 + active 표시

### 8.2 사진 표시 (U16 fix 후)
- S3: "이상신고" 페이지 → 사진 첨부 카드 클릭 → 모달 오픈 + **사진 정상 렌더**
- S4: F12 콘솔 → `[TRACK77-U15-DIAG]` 로그 **부재** (제거됨), onError 미발생
- S5: 사진 클릭 → 라이트박스 전체화면

### 8.3 회귀 검증
- S6: 작업자 측 이상신고 모달 + 사진 첨부 + 신고 (followup-u11 흐름) → 회귀 없음
- S7: 작업자 출퇴근 v2 / QR-CORE → 자산 보존 7건 회귀 없음
- S8: 다른 관리자 페이지 → 회귀 없음

## 9. 배포 / 푸시 상태

- 로컬 SHA: (커밋 후 보고)
- git push origin main: (커밋 후 실행)
- Vercel webhook: 자동 트리거 예상

## 10. 발견 사항

### 10.1 자격증명 처리 — 미발생
사용자가 자격증명 입력했으나 Playwright 시뮬 미진행으로 사용 0회. **사용자 비밀번호 변경 부담 없음**.

### 10.2 진단 스크립트 cleanup
4건 임시 스크립트 삭제 완료. `scripts/run-sql.cjs`는 followup-u11에서 신설된 향후 라운드 자동화 인프라라 보존.

### 10.3 신규 LESSONS 147 박제
"snakeToCamel shallow 한계 + Supabase Management API 자율 진단 패턴" — 두 측면 통합 박제:
- nested resource 사용 시 deep 변환 의무
- 사용자 F12 부담 회피 + 빠른 회전 위해 SQL/SDK 시뮬 우선

### 10.4 BACKLOG 갱신 후보 (선택)
- `TRACK77-DBHELPERS-DEEP-001`: snakeToCamel deep recursion 검토 (다른 store에서도 nested 사용처 있을 수 있음). 본 라운드 미진행 — 사용자 정책 결정 후 별 트랙.

## 11. 다음 라운드

- 사용자 §8 시나리오 검증 (S1~S8 통과 확인)
- S3 사진 정상 렌더 확정 시 **작업자 의견 3 클로징**
- BACKLOG `TRACK77-DBHELPERS-DEEP-001` 진입 검토 (다른 nested 사용처 grep)

---

**끝.**
