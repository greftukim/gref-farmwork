# 트랙 77 U5 라운드 보고서

**작성일**: 2026-05-02
**기준 커밋**: `b5dd7d5` (U4 완료 시점)
**대상 파일**:
- 신규: `src/components/worker/IssueModal.jsx` (IssueModal default + IssueFab named export)
- 수정: `src/pages/worker/WorkerHome.jsx` (FAB + Modal 추가, +6 라인)
- 수정: `src/pages/worker/IssuePage.jsx` (Navigate 리다이렉트로 단순화)
- 수정: `src/App.jsx` (EmergencyCallPage import + 라우트 제거)
- 삭제: `src/pages/worker/EmergencyCallPage.jsx`

---

## 1. 작업 결과

- 변경 파일: 신규 1 + 수정 3 + 삭제 1 = 5건
- 빌드: `npm run build` exit 0 / 22.23s / PWA precache 13 entries

## 2. 자산 보존 검증

| # | 자산 | 결과 |
|---|---|---|
| 1 | WorkerHome 출퇴근 v2 인라인 함수 5종 | ✅ byte-identical (+6 라인 순수 추가) |
| 2 | issueStore (addIssue 시그니처) | ✅ 미변경, 기존 호출 |
| 3 | WorkerLayout (FCM/PWA) | ✅ 미변경 |
| 4 | BottomNav | ✅ 미변경 |
| 5 | primitives.jsx | ✅ 미변경 (T_worker 사용만) |
| 6 | components/task/** (76-A) | ✅ 미참조 |
| 7 | DB 스키마 | ✅ 변경 없음 (issues.photo NULL 저장) |

## 3. 자가 검증 결과 (C1~C9)

| C# | 항목 | 결과 |
|---|---|---|
| C1 | 영향 파일 (3 modified + 1 new + 1 deleted) | ✅ |
| C2 | WorkerHome 출퇴근 v2 보존 (byte-identical) | ✅ |
| C3 | Q13 EmergencyCallPage 삭제 + 라우트 제거 + 참조 0건 | ✅ |
| C4 | Q14/Q17 IssueModal + IssueFab 신규 + WorkerHome 연결 | ✅ |
| C5 | G77-G IssuePage 리다이렉트 (북마크 호환) | ✅ |
| C6 | G77-H Storage 미구현 박제 (photo: null + UI placeholder) | ✅ |
| C7 | issueStore.js diff = 0 라인 | ✅ |
| C8 | IssueModal T_worker 토큰 | ✅ |
| C9 | 빌드 통과 | ✅ |

## 4. 결정 게이트 자율 처리 내역

### G77-G (U5): IssuePage 처리 = **홈 리다이렉트** (`<Navigate to="/worker" replace />`)
- **권고 근거**:
  1. IssuePage는 BottomNav 미포함 + 4버튼 그리드 폐기(U1)로 사실상 직접도달 부재
  2. 북마크/외부 링크 가능성은 매우 낮으나 안전 마진으로 리다이렉트
  3. App.jsx의 `<Route path="issues">` 유지 → IssuePage가 Navigate 컴포넌트 1줄로 리다이렉트
  4. 향후 완전 제거 가능 (별도 라운드)
- **대안**:
  - 옵션 A: 파일 + 라우트 완전 삭제 — 북마크 유저가 404 페이지 만남
  - 옵션 C: 페이지 + 모달 양립 — 진입 경로 불명확 + 코드 중복
- **사후 검토 권고**: 3개월 운영 후 IssuePage 진입 로그 0건이면 완전 삭제 별도 라운드.

### G77-H (U5): issue_photos Storage 버킷 = **본 라운드 미구현, SQL/policy 박제**
- **권고 근거**:
  1. Storage 버킷 신설 = DB 자산 변경 (자산 보존 우선순위)
  2. RLS 정책 (insert: worker, select: admin)은 마이그레이션 + 검증 필요
  3. 본 라운드 책무 = "이상 신고 모달 활성화" — 사진 없이도 핵심 기능 동작
  4. UI 영역은 노출하되 disabled + "곧 출시 예정" → 사용자에게 향후 기능 명시
- **대안**:
  - 옵션 A: Storage 버킷 신설 + RLS — 마이그레이션 위험 + 본 라운드 범위 초과
  - 옵션 B: photos 컬럼 단일 → DataURL base64 inline (DB 부풀음, 성능 이슈)
- **사후 검토 권고**: Storage 활성화는 별도 라운드. 사전 박제 SQL/policy:

```sql
-- (현재 실행 X — 향후 마이그레이션용 박제)

-- Storage 버킷 생성 (Supabase Dashboard 또는 supabase CLI)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'issue_photos',
  'issue_photos',
  false,
  10485760, -- 10MB
  ARRAY['image/jpeg', 'image/png', 'image/webp']::text[]
);

-- RLS 정책: 작업자는 본인 issue 사진만 업로드, 관리자는 모두 조회
CREATE POLICY "worker_insert_own_issue_photo" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'issue_photos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "admin_select_all_issue_photo" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'issue_photos'
    AND EXISTS (
      SELECT 1 FROM employees
      WHERE id = auth.uid() AND role IN ('admin', 'farm_admin', 'hq_admin')
    )
  );

-- DB 컬럼 변경 (issues.photo → photos JSONB[] 배열)
ALTER TABLE issues
  ADD COLUMN photos JSONB DEFAULT '[]'::jsonb;
-- 기존 photo 컬럼은 deprecated, 마이그레이션 후 DROP 별도 라운드.

-- 경로 규칙 (애플리케이션 측 박제):
--   {worker_id}/{issue_id}/{photo_index}.{ext}
--   예: 6f8a.../9c2b.../0.jpg
```

### Q13 처리: EmergencyCallPage **삭제**
- **사용자 사전 결정**: Q13 시안 §5.9에서 EmergencyCallPage 삭제 명시
- **수행**:
  - 파일 삭제: `src/pages/worker/EmergencyCallPage.jsx`
  - App.jsx import 제거 + `<Route path="emergency">` 제거
  - 참조 0건 확인 (grep)
- **대체 진입점 부재**: 직접도달 부재 페이지 → 사용자 영향 없음
- **사후 검토 권고**: 비상 연락 채널은 외부 수단(전화/카카오톡) 사용. 향후 별도 채널 필요 시 새 모듈 검토.

### G77-I 부분 처리 (U5 한정)
- **자율 결정**:
  - Loading: 신고하기 버튼 disabled + "전송 중..." 라벨 (기존 패턴)
  - Empty: N/A (모달은 폼이므로 빈 상태 없음)
  - Error: alert("이상신고 전송에 실패했습니다.\n" + 메시지) — 기존 패턴 추종
  - Success: alert("이상신고가 접수되었습니다.\n관리자에게 전달됩니다.") — 명시적 피드백
- **권고 근거**: U2~U4와 일관성, 기존 noticeStore/leaveStore/overtimeStore와 동일 alert 패턴.
- **사후 검토 권고**: 토스트 시스템 도입 시 별도 라운드 (전체 worker 페이지 일괄 적용).

## 5. 사용자 검증 시나리오

### IssueFab + IssueModal
1. `/worker` 진입 → 우하단 BottomNav 위 **주황색 floating 버튼 (56×56, alert 아이콘 + "신고")** 노출
2. FAB 클릭 → 바텀시트 모달 등장
3. 모달 구성:
   - 헤더: "이상 신고" 제목 + 알림 아이콘 + 우상단 닫기(X)
   - 분류 칩 5개: 병해충 / 시설고장 / 안전 / 환경 / 기타 (기본 활성: 병해충)
   - 위치 입력 (선택, "예: 3동 D라인 4번 베드")
   - 사진 영역 (disabled placeholder + "곧 출시 예정")
   - 상세 내용 textarea (필수)
   - 액션: 취소 / 신고하기
4. 상세 내용 비어있으면 "신고하기" 비활성
5. 신고하기 클릭 → 전송 중 → 성공 alert ("이상신고가 접수되었습니다") → 모달 닫힘
6. 관리자 페이지 (`HQIssuesScreen` / `safety-issues`)에서 신고 항목 조회 가능 (issues 테이블 INSERT 확인)

### 푸시 알림 (기존 자산)
- `useIssueStore.addIssue` 내부에서 `sendPushToAdmins` 호출 — 기존 자산 보존 (issueStore.js:35-43)
- 관리자에게 "[작업자명] 작물 이상 신고" + 본문 전달
- 병해충 카테고리는 `urgent: true` 플래그

### IssuePage 리다이렉트
1. `/worker/issues` 직접 진입 → 즉시 `/worker` 리다이렉트
2. URL 변경 즉시 발생 (`<Navigate replace />` → 히스토리 미오염)

### EmergencyCallPage 삭제
1. `/worker/emergency` 진입 시 → React Router 미매칭 → 부모 Outlet 동작에 따름
2. 사용자가 해당 URL을 알 가능성 매우 낮음 (BottomNav/4버튼 그리드 모두에서 진입 부재)

## 6. 시안과 다른 시각 결정

- **사진 영역 disabled placeholder**: 시안 §5.8은 사진 첨부/촬영 기능 명시. 본 라운드는 G77-H 미구현으로 disabled 영역만 노출 + "곧 출시" 안내. UI 구조는 시안과 동등, 기능만 비활성.
- **alert 사용 (성공/실패)**: 시안에는 명시 없으나 기존 worker 페이지 패턴 추종.
- **분류 칩 색상**: 시안 §5.8은 "활성 = T.primary 채움". 본 구현 동일 (T.primary 배경 + 흰색 텍스트).
- **DB 스키마 차이**: 시안 SPEC §5.8 "사진 ≤5장 multi-upload"는 issues.photo 단일 컬럼과 불일치. 본 라운드는 `photo: null` 저장 (UI 미노출 일치).

## 7. 발견 사항

- **issueStore.addIssue의 기존 호출 시그니처**: `{workerId, workerName, zoneId, type, comment, photo}`. 시안의 `description` 필드는 `comment`로 매핑. 위치 필드는 `zoneId` UUID가 아닌 자유 텍스트로 받아 `comment` 앞에 prefix `[위치] {location}\n` 추가.
- **푸시 알림 자동 전송**: `addIssue` 호출 시 자동으로 관리자에게 푸시 (issueStore.js:35) — 작업자 측에서 별도 처리 불필요.

## 8. 트랙 77 종합 (U0~U5 전체)

| 라운드 | 커밋 | 상태 |
|---|---|---|
| U0a | `3323507` | T_worker 토큰 신설 |
| U0b | `6183397` | onNavigate → useNavigate 일괄 변환 |
| U1 | `46933de` | WorkerHome 시각 재설계 |
| U2 | `258f158` | QrScanPage 자동 시작 + fallback |
| U3 | `cff2b44` | Attendance + Leave/Overtime 모달 + 일별 모달 |
| U4 | `b5dd7d5` | Tasks/Notice 시안 + BottomNav 빨간점 |
| U5 | (이번) | IssueModal + IssueFab + Emergency 처리 |

자산 보존 7건 (출퇴근 v2 / FCM / QR / 76-A / PWA / 데이터 / 기존 T 토큰) — 6라운드 모두 100% 보존.

## 9. 다음 단계 권고

- **사용자 검증** (전체 라운드 §5 시나리오 통과 확인)
- **이슈 패치 라운드 후보**: G77-H Storage 활성화, IssuePage 완전 제거, 토스트 시스템 도입, holidaysKr 갱신 자동화

---

**끝.**
