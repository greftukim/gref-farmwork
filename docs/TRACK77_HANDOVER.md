# 트랙 77 핸드오버 — 작업자 앱 시안 적용 + 회귀 검수 + 시스템화

**작성일**: 2026-05-02
**트랙 범위**: U0 (인프라) → U1~U5 (시안 적용) → U6 (QR 회귀 fix) → U7 (근태 흐름) → U8 (전체 검수 + P0/P2) → U9 (toast/States) → U10 (클로징)
**기준 커밋 범위**: `990d4db..33bfb18` (10개 커밋)
**main HEAD**: `33bfb18` (origin/main 동기 완료)

---

## 1. 트랙 77 목적

작업자 앱(/worker/**) 디자인 시안 v2 적용 + 자산 보존 7건 100% 유지 + 운영 안정화.

## 2. 라운드 요약

| 라운드 | 커밋 SHA | 주요 적용 |
|---|---|---|
| U0a | `3323507` | T_worker 토큰 신설 (primitives.jsx named export) |
| U0b | `6183397` | worker 7페이지 onNavigate → useNavigate 일괄 변환 |
| U1 | `46933de` | WorkerHome 시각 재설계 (Q1·Q4·Q16, 출퇴근 v2 byte-identical) |
| U2 | `258f158` | QrScanPage 자동 시작 + 권한 거부 fallback (G77-A) |
| U3 | `cff2b44` | Attendance + Leave/Overtime 모달 + 일별 모달 (Q8·Q9·Q10·Q18) |
| U4 | `b5dd7d5` | Tasks/Notice 시안 + BottomNav 빨간점 (Q5·Q11) |
| U5 | `2cd68c5` | IssueModal + IssueFab + Emergency 처리 (Q13·Q14·Q17) |
| U6 | `b408d6b` | QR 카메라 미표시 회귀 fix (qr-reader 레이아웃 타이밍) |
| U7 | `f49561e` | 근태 신청 흐름 변경 (Q19~Q22 + G77-J/K/L) |
| U8 | `b27094a` | 전체 검수 + P0 회귀 fix (`s.user → s.currentUser`) + P2 dead UI 제거 |
| U9 | `33bfb18` | toast (기존 자산 재사용) + Loading/Empty/Error 컴포넌트 |
| U10 | (이번) | 클로징 — 그룹 2 별 트랙 박제 + LESSONS/BACKLOG 갱신 |

## 3. 사용자 결정 사항 (Q1~Q22 + G77-A~L)

### 3.1 Q1~Q22 (사용자 사전 결정)

| ID | 결정 |
|---|---|
| Q1 | 4버튼 그리드 폐기 → 출퇴근 카드 단독 + QR CTA + 미니카드 |
| Q4 | 헤더 알림 종 제거 |
| Q5 | BottomNav 공지사항 탭 빨간점 |
| Q6 | QR 스캔 페이지 카메라 자동 시작 |
| Q7 | QR 권한 거부 fallback UI |
| Q8 | 근태 페이지 헤더 신청 버튼 (U3 시트 → U7 직진) |
| Q9 | 공휴일 = 일요일과 동일 빨간색 |
| Q10 | 자체 캘린더 유지 (라이브러리 미도입) |
| Q11 | inline+T_worker 토큰 통일 (작업자 격리) |
| Q12 | PWA 설치 안내 모달 보존 |
| Q13 | EmergencyCallPage 삭제 |
| Q14 | 이상 신고 = 모달로 전환 (페이지 → 모달) |
| Q15 | OvertimeModal 우선 적용 |
| Q16 | 출퇴근 카드 상태별 분기 (out/in/done) |
| Q17 | 이상 신고 FAB (홈 한정) |
| Q18 | 일별 클릭 → 일별 상세 모달 |
| Q19 | 연장근무는 홈 출퇴근 카드(출근 중)에만 |
| Q20 | 휴가 신청 페이지 → "근태 신청" 명칭 |
| Q21 | 헤더 신청 버튼 시트 분기 X → 페이지 직진 |
| Q22 | 일별 모달 하단 신청 버튼 추가 |

### 3.2 G77-A~L (자율 결정 + 보고서 박제)

| ID | 결정 | 라운드 |
|---|---|---|
| G77-A | 권한 거부 재시도 = `window.location.reload()` (사용자 확정) | U2 |
| G77-B | 한국 공휴일 = Static JSON (`src/lib/holidaysKr.js`) | U3 |
| G77-C | `/worker/overtime` 페이지 미신설 (모달만) | U3 |
| G77-D | `useOvertimeStore.submitRequest` 직접 사용 | U3 |
| G77-E | unread 카운트 = 기존 noticeStore 동기 사용 (Polling/Realtime 미추가) | U4 |
| G77-F | localStorage 읽음 추적 (`src/lib/noticeRead.js`) | U4 |
| G77-G | IssuePage → 홈 리다이렉트 (북마크 호환) | U5 |
| G77-H | issue_photos Storage 미구현, SQL/RLS 박제 | U5 |
| G77-I | Loading/Empty/Error UI = 기존 패턴 추종 (라운드별) | 전체 |
| G77-J | 근태 신청 페이지 = 휴가 단독 | U7 |
| G77-K | 일별 모달 신청 버튼 = 풀 width primary | U7 |
| G77-L | RequestTypeSheet 컴포넌트 삭제 (사용처 0건) | U7 |

## 4. 자산 보존 7건 — 6+4 라운드 100% 유지

| 자산 | 검증 방법 | 결과 |
|---|---|---|
| 출퇴근 v2 인라인 함수 (`WorkerHome.jsx:25-204` haversineDistance / getCurrentPosition / timeStrToTodayDate / verifyBranchAndGps / handlePunch) | byte-identical (Sub-Agent 위임 diff) | ✅ 10라운드 모두 유지 |
| FCM 시스템 (WorkerLayout.jsx:39-66) | 미변경 | ✅ |
| QR-CORE (qr_codes SELECT → qr_scans INSERT, `onScanSuccess`) | byte-identical | ✅ U2/U6에서 레이아웃만 변경 |
| 76-A 자산 (components/task/**, zoneColors, task_assignments) | grep 미참조 | ✅ |
| PWA 설치 안내 모달 | 미변경 | ✅ |
| 데이터 자산 DB 스키마 | 변경 0건 | ✅ |
| 기존 T 토큰 (primitives.jsx 기존 T 객체) | 미변경 (T_worker 추가 export만) | ✅ |

## 5. 신규 컴포넌트 / 파일

| 파일 | 라운드 | 역할 |
|---|---|---|
| `src/lib/holidaysKr.js` | U3 | 한국 공휴일 정적 JSON (2026·2027년) |
| `src/lib/noticeRead.js` | U4 | localStorage 읽음 추적 헬퍼 |
| `src/components/worker/IssueModal.jsx` | U5 | IssueModal default + IssueFab named export |
| `src/components/worker/OvertimeModal.jsx` | U7 | 연장근무 신청 모달 (홈 한정) |
| `src/components/worker/States.jsx` | U9 | Loading / Spinner / Empty / ErrorState |

## 6. 삭제된 파일

- `src/pages/worker/EmergencyCallPage.jsx` (U5, Q13)

## 7. 회귀 fix 박제

| 라운드 | 회귀 | 수정 |
|---|---|---|
| **U6** | QR 카메라 미표시 — `qr-reader` div가 mount 시점 `display:none` → html5-qrcode가 video를 0×0으로 부착 | qr-reader 항상 absolute inset:0 + 정적 뷰파인더를 overlay로 덮음 |
| **U8 P0** | WorkerLeavePage `useAuthStore((s) => s.user)` undefined → 본인 신청 미노출 + employeeId NULL INSERT | `s.currentUser`로 변경 (U4 WorkerNoticePage와 동일 latent bug) |
| **U8 P2** | WorkerTasksPage "상세" 버튼 onClick 누락 (dead UI) | 버튼 제거 + BACKLOG 박제 |

## 8. LESSONS_LEARNED 박제 (138~143)

| # | 제목 |
|---|---|
| 138 | git push 누락 → 사용자가 시각 변화 못 봄 (배포 검증 단계 필수화) |
| 139 | 시안 메타 주석 vs 실제 코드 매칭 검증 (시각만 적용 회귀) |
| 140 | latent bug 동일 패턴 grep 일괄 회수 (s.user → s.currentUser 이중 회귀) |
| 141 | 자율 시행 + 사후 보고 흐름의 균형점 (결정 게이트 자율화) |
| 142 | Sub-Agent 회귀 검수 효과 (정적 분석 위임 패턴) |
| 143 | byte-identical 보존 패턴 (자산 보존 7건 안전 마진) |

## 9. BACKLOG 신규 (별 트랙 권고)

| ID | 한 줄 |
|---|---|
| TRACK77-STORAGE-ISSUE-PHOTOS-001 | issue_photos Storage 활성화 (G77-H) |
| TRACK77-NOTICE-READS-MIGRATION-001 | notice_reads DB 마이그레이션 (localStorage → DB) |
| TRACK77-GROWTH-SURVEY-UI-UNIFY-001 | GrowthSurveyPage Tailwind → inline+T_worker 통일 |
| TRACK77-WORKER-MORE-RECON-001 | WorkerMorePage 진입 동선 (현재 wontfix 잠정) |
| TRACK77-TASK-DETAIL-PAGE-001 | 작업 상세 페이지 신설 |
| TRACK77-ISSUE-PAGE-DELETE-001 | IssuePage 완전 삭제 (3개월 모니터링 후) |
| TRACK77-HOLIDAYS-AUTO-UPDATE-001 | holidaysKr 자동 갱신 (매년 12월) |
| TRACK77-STATES-EXPAND-001 | Loading/Empty/Error 컴포넌트 일괄 적용 |
| TRACK77-PUNCH-V2-TOAST-001 | handlePunch alert → toast (자산 보존 락 해제 시) |

## 10. 사용자 검증 시나리오 (전체 라운드 종합)

### 10.1 홈 (`/worker`)
- 그라디언트 헤더 + 큰 시계 + 인사말 (알림 종 부재)
- 출퇴근 카드 (출근 전 / 출근 중 / 퇴근 완료 3상태)
- 출근 중일 때 "퇴근하기" + "연장근무 신청" → OvertimeModal
- QR 스캔 풀 width 그라디언트 버튼
- 오늘의 작업 / 공지 미니카드 (실데이터)
- 우하단 주황 FAB → IssueModal

### 10.2 QR 스캔 (`/worker/m/qr-scan`)
- 진입 즉시 카메라 자동 시작 (Q6 + U6 fix)
- 권한 거부 시 ScreenQrScanDenied (G77-A reload)
- QR 인식 → qr_scans INSERT + 결과 오버레이
- "다시 스캔" / 우상단 정지 버튼

### 10.3 근태 (`/worker/attendance`)
- 헤더 우상단 "근태 신청" → `/worker/leave` 직진 (Q21)
- 월별 통계 + 공휴일 빨간 캘린더 (Q9, holidaysKr.js)
- 일자 클릭 → 일별 상세 모달 (Q18)
- 일별 모달 하단 "근태 신청" 버튼 (Q22 + G77-K)

### 10.4 휴가 신청 (`/worker/leave`)
- 헤더 "근태 신청" 명칭 (Q20)
- 본인 신청 내역 즉시 노출 (U8 fix 후)
- "+ 신청" 버튼 → 모달 → 신청 → success toast (U9)

### 10.5 작업 (`/worker/tasks`)
- 칩 탭 (오늘/이번 주/완료) — primary 채움 활성
- 카드: 우선순위 + 상태 Pill + 위치 + 진행도
- "작업 시작" / "완료 처리" 버튼만 ("상세" 버튼 제거)

### 10.6 공지 (`/worker/notices`)
- BottomNav 빨간점 (unread > 0 시)
- 미확인 NEW 배지 + accent
- 클릭 → 상세 모달 + localStorage 읽음 처리
- 빈 상태 → `<Empty>` 컴포넌트 시연

### 10.7 이상 신고
- 홈 FAB → 모달 → 분류/위치/상세 → 신고하기 → success toast
- 사진 영역 disabled + "곧 출시" (G77-H)

## 11. 배포 / 푸시 흐름 박제

라운드별 표준 절차:
1. 코드 변경 + 빌드 검증
2. 자산 보존 검증 (Sub-Agent 위임 권고)
3. 보고서 작성 (`docs/TRACK77_U[N]_REPORT.md`)
4. `git commit`
5. **`git push origin main`** (교훈 138)
6. `origin/main` HEAD 매칭 확인
7. Vercel webhook 자동 트리거 (vercel.json + main push)
8. 사용자에게 PWA 캐시 무효화 안내 (강제 새로고침 / SW unregister / PWA 재설치)

## 12. 트랙 77 클로징 후 다음 단계

### 12.1 즉시 (사용자 행동)
- Vercel 배포 Ready 확인 (1~3분)
- 강제 새로고침 또는 PWA 재설치
- §10 시나리오 검증
- 변경 원하는 항목 알림

### 12.2 별 트랙 (BACKLOG)
- §9 9개 항목 우선순위 평가
- 사용자 정책 결정 후 별 트랙 진입

### 12.3 운영 후 재평가
- 공지 다중 디바이스 동기화 요구 → notice_reads 마이그레이션
- 이슈 사진 사용 빈도 ↑ → Storage 활성화
- 트랙 G(포장) 가동 → 작업 상세 페이지 검토

---

**끝.**

본 문서는 트랙 77 단일 진실 공급원. 향후 별 트랙 진입 시 본 문서 + 라운드별 보고서 + LESSONS_LEARNED.md 138~143 + BACKLOG.md TRACK77-* 항목 참조.
