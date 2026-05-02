# 트랙 77 U9 라운드 보고서 — toast + Loading/Empty/Error 시스템화 (그룹 1)

**작성일**: 2026-05-02
**기준 커밋**: `b27094a` (U8 완료 시점)
**대상 파일**:
- 신규: `src/components/worker/States.jsx` (Loading / Empty / ErrorState / Spinner)
- 수정: `src/components/common/ToastContainer.jsx` (success / error / warning 타입 추가)
- 수정: `src/components/worker/IssueModal.jsx` (alert → notificationStore)
- 수정: `src/components/worker/OvertimeModal.jsx` (alert → notificationStore)
- 수정: `src/pages/worker/WorkerLeavePage.jsx` (신청 후 toast 추가)
- 수정: `src/pages/worker/WorkerNoticePage.jsx` (Empty 시연 적용)

---

## 1. 작업 결과

- 변경 파일: 신규 1 + 수정 5
- 빌드: `npm run build` exit 0 / 26.79s / PWA precache 13 entries

## 2. 자율 결정 — 그룹 1 4건 분류

| # | 항목 | 결정 | 근거 |
|---|---|---|---|
| 1 | toast 시스템 | **U9 진행** | 기존 `useNotificationStore` + `ToastContainer` 자산 재사용 — 신규 시스템 도입 0 |
| 2 | Loading/Empty/Error 시스템화 | **U9 진행** | 단순 컴포넌트 추가, 회귀 위험 0 |
| 3 | Storage 활성화 (이슈 사진) | **별 트랙 (BACKLOG)** | DB 변경 = 자율 시행 예외 (지시문 §3.3) |
| 4 | notice_reads DB 마이그레이션 | **별 트랙 (BACKLOG)** | DB 변경 = 자율 시행 예외 |

## 3. toast 시스템

### 3.1 자율 결정: 기존 자산 재사용
- 발견: `src/components/common/ToastContainer.jsx` + `src/stores/notificationStore.js` 이미 WorkerLayout에 마운트됨
- 신규 Toast.jsx 작성 후 → 기존 자산 발견 → 폐기 결정
- 통합: notificationStore.addNotification API 직접 사용 + ToastContainer typeStyles에 success/error/warning 확장

### 3.2 ToastContainer 확장
```diff
const typeStyles = {
  task_completed: { bg: 'bg-green-600', icon: '✅' },
  emergency_call: { bg: 'bg-red-600', icon: '🚨' },
  issue_report: { bg: 'bg-amber-600', icon: '⚠️' },
  info: { bg: 'bg-[#6366F1]', icon: 'ℹ️' },
  fcm_error: { bg: 'bg-rose-700', icon: '🔕' },
+ // 트랙 77 U9 추가 — 작업자 페이지/모달용
+ success: { bg: 'bg-emerald-600', icon: '✅' },
+ error: { bg: 'bg-rose-600', icon: '⚠️' },
+ warning: { bg: 'bg-amber-500', icon: '⚠️' },
};
```

### 3.3 적용 영역 (자율 보수)
- IssueModal: 성공/실패 alert → toast (success/error)
- OvertimeModal: 성공/실패 alert → toast
- WorkerLeavePage: 신청 후 신규 toast (이전 알림 부재 — UX 보강)
- **출퇴근 v2 alert (handlePunch / verifyBranchAndGps)**: ATTENDANCE-V2-PRESERVE → 변경 X
- **GPS 거부, 반경 밖, 지점 조회 실패 등**: alert 보존 (출퇴근 v2 자산)

## 4. Loading/Empty/Error 컴포넌트

### 4.1 신규 컴포넌트 (`src/components/worker/States.jsx`)
- `<Loading message size />` — 스피너 + 메시지 (size=sm/md)
- `<Spinner size color />` — 인라인 (버튼 내부용)
- `<Empty icon title body actionLabel onAction />` — 빈 상태 카드
- `<ErrorState title message onRetry retryLabel />` — 에러 상태 카드

### 4.2 적용 영역 (자율 보수)
- WorkerNoticePage: 기존 inline Empty UI → `<Empty>` 컴포넌트 시연
- 다른 페이지 일괄 적용은 회귀 위험 → 별 트랙 권고 (사용자 검증 후 점진적 적용)

### 4.3 시각 일관성
- T_worker 토큰 사용
- Card 프리미티브 활용
- 시안 §4.7 / §4.8 / §4.9 패턴 매칭

## 5. 자산 보존 검증

| # | 자산 | 결과 |
|---|---|---|
| 1 | 출퇴근 v2 인라인 함수 (alert 포함) | ✅ 미변경 |
| 2 | useIssueStore.addIssue / OvertimeStore.submitRequest | ✅ 미변경 |
| 3 | useNoticeStore | ✅ 미변경 |
| 4 | useNotificationStore | ✅ 미변경 (확장만 — typeStyles 추가) |
| 5 | WorkerLayout | ✅ 미변경 |
| 6 | App.jsx | ✅ 미변경 |
| 7 | DB 스키마 | ✅ 변경 없음 |

## 6. 자가 검증 결과 (C1~C7)

| C# | 항목 | 결과 |
|---|---|---|
| C1 | 빌드 통과 | ✅ exit 0 / 26.79s |
| C2 | 자산 보존 7건 | ✅ |
| C3 | toast 신규 시스템 도입 X (기존 재사용) | ✅ |
| C4 | IssueModal/OvertimeModal alert 0건 → toast | ✅ |
| C5 | 출퇴근 v2 alert 보존 (handlePunch 영역) | ✅ |
| C6 | States.jsx 컴포넌트 신규 + WorkerNoticePage 시연 적용 | ✅ |
| C7 | ToastContainer 확장 비파괴 (기존 type 영향 0) | ✅ |

## 7. 결정 게이트 자율 처리 내역

### 그룹 1 #1 — toast 도입 방식 = **기존 ToastContainer 재사용**
- 권고 근거: 기존 자산 발견 → 신규 시스템 비용 0, 일관성 유지
- 대안: 신규 worker Toast 시스템 (T_worker 격리 명분, but 비용 ↑)
- 사후 검토 권고: 사용자가 작업자 전용 toast 시각 차별화 원할 시 별도 라운드

### 그룹 1 #2 — States 컴포넌트 적용 범위 = **WorkerNoticePage만 시연 적용**
- 권고 근거: 컴포넌트만 신규, 일괄 적용은 회귀 위험
- 대안: 모든 페이지에 일괄 적용 — 검증 부담 증가
- 사후 검토 권고: 사용자 검증 후 점진적 확장

### 그룹 1 #3, #4 — Storage / notice_reads DB 마이그레이션 = **별 트랙**
- 권고 근거: 지시문 §3.3 "DB 스키마 변경 → 별 트랙 (사용자 검증 필수)"
- 사전 박제 (보고서 §11): 마이그레이션 SQL/RLS는 U4·U5 보고서에 이미 박제됨

## 8. 사용자 검증 시나리오

### Toast (이상 신고)
1. 홈 FAB → 이상 신고 모달 → 분류/위치/상세 입력 → 신고하기
2. 모달 닫힘 + **상단에 success toast** "이상신고가 접수되었습니다" / 6초 자동 사라짐
3. 실패 시 "이상신고 전송 실패" + 에러 메시지 / 6초 자동 사라짐

### Toast (연장근무)
1. 홈 출퇴근 카드(출근 중) → 연장근무 신청 모달 → 시간/사유 입력 → 신청
2. 모달 닫힘 + **상단에 success toast** "연장근무 신청이 접수되었습니다"
3. 실패 시 error toast

### Toast (휴가 신청)
1. /worker/leave → "+ 신청" 모달 → 입력 → 신청
2. 모달 닫힘 + 본인 신청 내역 카드 즉시 추가 + **success toast** (이전: alert 부재)

### Empty (공지)
1. 공지가 없을 때 /worker/notices 진입
2. **공통 Empty 컴포넌트** "새 공지가 없어요" + bell 아이콘 + T_worker 일관 시각

### 출퇴근 v2 (보존 검증)
1. 홈 출근하기 → GPS 검증 실패 시 **여전히 alert** (출퇴근 v2 보존 의도)
2. 반경 밖, 시간 외, 지점 조회 실패 시 alert 표시

## 9. 배포 / 푸시 상태

- 로컬 SHA: (커밋 후 보고)
- git push origin main: (커밋 후 실행 예정)
- Vercel webhook: 자동 트리거 예상

## 10. 발견 사항

- **기존 자산 재사용 패턴**: 신규 시스템 도입 전 `grep -r ToastContainer` 등으로 기존 자산 확인이 비용 절감.
- **notificationStore의 사운드 재생**: AudioContext 기반 — 작업자 신청 성공/실패 시 단음 효과음 자동 재생 (UX 보강)
- **ToastContainer Tailwind 일관성**: 작업자 페이지는 inline+T_worker, ToastContainer는 Tailwind. 확장만 했고 기존 type 영향 0이라 회귀 없음. T_worker 격리는 페이지/모달 본체 한정 원칙 유지.

## 11. 별 트랙 권고 — Storage / notice_reads (BACKLOG 박제 예정)

### 11.1 issue_photos Storage 활성화
- 마이그레이션 SQL: `docs/TRACK77_U5_REPORT.md` §4 참조
- 작업 단위: Storage 버킷 생성 + RLS 정책 + IssueModal 사진 업로드 핸들러 + issues 테이블 photos 컬럼 마이그레이션
- 예상 라운드: U11 (별 트랙)

### 11.2 notice_reads DB 마이그레이션
- 마이그레이션 SQL: `docs/TRACK77_U4_REPORT.md` §4 참조
- 작업 단위: notice_reads 테이블 + RLS + noticeRead.js 마이그레이션 (localStorage → DB)
- 예상 라운드: U12 (별 트랙)

## 12. 다음 라운드 진입 가능 여부

✅ **U10 진입 가능** — 작업 C-2 그룹 2 (GrowthSurvey 통일 + WorkerMore 재검토).

---

**끝.**
