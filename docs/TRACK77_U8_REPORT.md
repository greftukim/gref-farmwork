# 트랙 77 U8 라운드 보고서 — 전체 검수 + P0/P2 수정 (작업 C-1)

**작성일**: 2026-05-02
**기준 커밋**: `f49561e` (U7 완료 시점)
**대상 파일**:
- `src/pages/worker/WorkerLeavePage.jsx` (P0 — latent bug fix)
- `src/pages/worker/WorkerTasksPage.jsx` (P2 — dead UI 정리)

---

## 1. 작업 결과

- 전체 검수 (Sub-Agent 위임): U1~U7 변경 파일 12개 정적 분석
- 변경 파일: 2개 (P0 1줄, P2 5줄 제거)
- 빌드: `npm run build` exit 0 / 28.97s / PWA precache 13 entries

## 2. 검수 결과 요약

Sub-Agent 검수 위임 → 12개 파일 분석:

| 파일 | 결과 | 비고 |
|---|---|---|
| WorkerHome.jsx | ✅ 통과 | handlePunch / IssueModal / OvertimeModal 매칭 정상 |
| QrScanPage.jsx | ✅ 통과 | U6 fix 확인 |
| WorkerAttendancePage.jsx | ✅ 통과 | DayDetailModal onRequestLeave 정상 |
| **WorkerLeavePage.jsx** | ❌ **P0 위반** | `s.user` undefined → fix 적용 |
| **WorkerTasksPage.jsx** | ⚠️ P2 경고 | "상세" 버튼 onClick 누락 → 제거 |
| WorkerNoticePage.jsx | ✅ 통과 | localStorage 읽음 처리 정상 |
| IssuePage.jsx | ✅ 통과 | Navigate redirect만 |
| BottomNav.jsx | ✅ 통과 | unread 빨간점 정상 |
| IssueModal.jsx | ✅ 통과 | addIssue 정상 |
| OvertimeModal.jsx | ✅ 통과 | submitRequest 정상 |
| holidaysKr.js | ✅ 통과 | |
| noticeRead.js | ✅ 통과 | |

라우트 정합성: ✅ 모든 navigate() 호출이 App.jsx 라우트와 매칭.

## 3. P0 수정 — WorkerLeavePage 휴가 신청 회귀 (Critical)

### 3.1 증상
- **위치**: `src/pages/worker/WorkerLeavePage.jsx:27`
- **문제**: `const user = useAuthStore((s) => s.user);` — authStore는 `currentUser`만 export, `user` 키는 부재 → 항상 `undefined`
- **임팩트**:
  1. **본인 신청 내역 0건 표시** (line 30 mine 필터에서 `user?.id`가 undefined → 빈 배열)
  2. **휴가 신청 시 employeeId NULL** (line 36 `addRequest({employeeId: user?.id})` → `employeeId: undefined` → leaveStore.addRequest → DB INSERT 시 `employee_id: undefined` → NOT NULL 위반 또는 NULL 삽입)

### 3.2 근본 원인
- 트랙 77 이전부터 존재한 latent bug
- U4에서 동일한 latent bug를 WorkerNoticePage에서만 fix → WorkerLeavePage 누락
- U2 QR 카메라와 동일한 "시각만 적용된 회귀" 패턴

### 3.3 수정
```diff
- const user = useAuthStore((s) => s.user);
+ // U8 회귀 fix: authStore는 currentUser만 export. 이전 s.user는 undefined → 본인 신청 미노출 + employeeId NULL INSERT 회귀.
+ const user = useAuthStore((s) => s.currentUser);
```

### 3.4 회귀 검증
- **사용자 검증 시나리오 추가** (§5에 박제):
  1. /worker/leave 진입 → "휴가 신청" 모달 → 신청 → 알림 정상
  2. 동일 페이지 본인 신청 내역 즉시 노출 확인
  3. 관리자 LeavePage에서 신규 신청 정상 조회 (employee_id 정상 INSERT)

## 4. P2 수정 — WorkerTasksPage "상세" 버튼 제거

### 4.1 증상
- **위치**: `src/pages/worker/WorkerTasksPage.jsx:252-256`
- **문제**: `<button>상세</button>` — onClick 핸들러 부재 → 클릭 시 무동작 (UX 회귀)
- **임팩트**: 사용자 클릭 → 무반응 → 신뢰도 저하

### 4.2 수정 옵션 평가
| 옵션 | 결정 | 근거 |
|---|---|---|
| A. 제거 | ✅ **선택** | 사용자 임팩트 우선, dead UI 회피, 카드 자체에 정보 충분 |
| B. disabled + tooltip | ✗ | 시각 노이즈 |
| C. detail 페이지 신설 | ✗ | 본 라운드 범위 초과, BACKLOG 박제 |

### 4.3 수정
```diff
-                  <button style={{
-                    height: 38, padding: '0 12px', borderRadius: 8,
-                    border: `1px solid ${T.border}`, background: T.surface, color: T.muted,
-                    fontSize: 12, fontWeight: 600, cursor: 'pointer',
-                  }}>상세</button>
+                  {/* U8: dead "상세" 버튼 제거 (task detail 페이지 미신설). 향후 신설은 BACKLOG */}
```

## 5. 자산 보존 검증

| # | 자산 | 결과 |
|---|---|---|
| 1 | 출퇴근 v2 인라인 함수 | ✅ 미변경 |
| 2 | leaveStore.addRequest 시그니처 | ✅ 미변경 (단지 employeeId가 정상 전달되도록 수정) |
| 3 | useTaskStore | ✅ 미변경 |
| 4 | WorkerLayout (FCM/PWA) | ✅ 미변경 |
| 5 | App.jsx | ✅ 미변경 |
| 6 | primitives.jsx | ✅ 미변경 |
| 7 | DB 스키마 | ✅ 변경 없음 |

## 6. 결정 게이트 자율 처리 내역

본 라운드는 검수 + 수정만 — 신규 결정 게이트 없음. P2 수정 시 옵션 평가는 §4.2에 박제.

## 7. 사용자 검증 시나리오

### WorkerLeavePage (P0 핵심)
1. /worker/leave 진입
2. **본인 휴가 신청 내역이 정상 노출** (이전: 빈 화면)
3. "+ 신청" 버튼 → 모달 → 휴가 정보 입력 → 신청
4. 알림 후 페이지 자동 갱신 → 새 신청 항목 즉시 노출
5. 관리자 페이지 (`/admin/leave-approval`)에서 employee_id 정상 매칭 확인

### WorkerTasksPage (P2)
1. /worker/tasks 진입
2. 작업 카드에서 "상세" 버튼 **부재** 확인
3. "작업 시작" / "완료 처리" 버튼만 노출
4. 카드 자체에 충분한 정보(우선순위 / 상태 / 작업명 / 위치 / 진행도) 확인

## 8. 배포 / 푸시 상태

- 로컬 SHA: (커밋 후 보고)
- git push origin main: (커밋 후 실행 예정)
- Vercel webhook: 자동 트리거 예상

## 9. 발견 사항 / 검수 의의

- **U2/U4의 "시각만 적용 회귀" 패턴 인식 가치**: U6 QR 카메라 + U8 LeavePage `s.user` 모두 시각/리네임만 적용된 라운드에서 latent bug가 그대로 남는 패턴. 향후 라운드는 데이터 흐름 검증을 정적 분석 단계에 포함 필수.
- **Sub-Agent 검수 효과**: 12개 파일 정적 분석을 1회로 위임 가능. 향후 라운드 종료 시 자동 검수 흐름 권고.
- **WorkerLeavePage 검수 누락 책임**: U4에서 WorkerNoticePage `s.user`만 발견하고 LeavePage를 놓침. 동일 패턴 grep을 라운드 단위로 1회씩 추가하면 재발 방지.
- **task detail 페이지**: BACKLOG 후보로 기록 (별 트랙).

## 10. 다음 라운드 진입 가능 여부

✅ **U9 진입 가능** — 작업 C-2 그룹 1 (toast + Loading/Empty/Error 시스템화).

---

**끝.**
