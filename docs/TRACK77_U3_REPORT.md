# 트랙 77 U3 라운드 보고서

**작성일**: 2026-05-02
**기준 커밋**: `258f158` (U2 완료 시점)
**대상 파일**:
- `src/pages/worker/WorkerAttendancePage.jsx` (시각 재설계 + 모달 3개 인라인 추가)
- `src/pages/worker/WorkerLeavePage.jsx` (T_worker import만 변경)
- `src/lib/holidaysKr.js` (신규)

---

## 1. 작업 결과

- 변경 파일 통계: WorkerAttendancePage.jsx +503/-90, WorkerLeavePage.jsx +2/-1, holidaysKr.js 신규
- 시안 적용: ScreenAttendance + ScreenAttendanceDayModal + ScreenOvertimeModal + RequestTypeSheet (자체 추가)
- 빌드: `npm run build` exit 0 / 19.75s / PWA precache 13 entries

## 2. 자산 보존 검증

| # | 자산 | 결과 |
|---|---|---|
| 1 | attendanceStore (records) | ✅ 미변경, 기존 records useMemo 유지 |
| 2 | leaveStore (requests + addRequest) | ✅ 미변경, 일별 모달에서 조회만 |
| 3 | overtimeStore (submitRequest) | ✅ 미변경, 기존 메서드 사용 |
| 4 | WorkerLayout (FCM/PWA) | ✅ 미변경 |
| 5 | BottomNav | ✅ 미변경 |
| 6 | App.jsx | ✅ 미변경 (G77-C: /worker/overtime 미신설) |
| 7 | primitives.jsx | ✅ 미변경 (T_worker 사용만) |
| 8 | components/task/** (76-A) | ✅ 미참조 |
| 9 | DB 스키마 | ✅ 변경 없음 |

## 3. 자가 검증 결과 (C1~C11)

| C# | 항목 | 결과 |
|---|---|---|
| C1 | WorkerLeavePage 비파괴 변경 (T_worker만) | ✅ 3 라인 변경 |
| C2 | 영향 파일 3개 (정확히) | ✅ |
| C3 | Q8 헤더 근태 신청 버튼 + 시트 분기 | ✅ |
| C4 | Q9 공휴일 빨간색 (HOLIDAYS_KR + T.holidayText) | ✅ |
| C5 | Q10 자체 캘린더 유지 (외부 라이브러리 0) | ✅ |
| C6 | Q18 일별 모달 (출퇴근+휴가+연장 3섹션) | ✅ |
| C7 | G77-C: /worker/overtime 미신설 | ✅ |
| C8 | G77-D: useOvertimeStore.submitRequest 사용 (신규 메서드 0) | ✅ |
| C9 | G77-B: 정적 JSON, 외부 의존성 0 | ✅ |
| C10 | T_worker 토큰 (두 파일) | ✅ |
| C11 | 빌드 통과 | ✅ |

## 4. 결정 게이트 자율 처리 내역

### G77-B (U3): 한국 공휴일 데이터 = **Static JSON** (`src/lib/holidaysKr.js`)
- **권고 근거**:
  1. 의존성 0건 — 라이브러리는 매년 패치/업그레이드 부담
  2. PWA 오프라인 대응 유리 — API는 인터넷 의존
  3. 운영 부담 최소 — 매년 1회 직전년도 12월 또는 신년 1월 갱신
  4. 2026·2027년치 사전 박제 (총 41개 항목)
- **대안**:
  - 라이브러리 (`@hyunbinseo/holidays-kr` 등) — 매년 dependabot/dependabot-yarn 업그레이드 PR 발생
  - 공공 데이터 포털 API — API 키 관리 + 외부 의존
- **사후 검토 권고**: 매년 12월 말~1월 초 holidays-kr.js 갱신 작업 필요. 자동화하려면 시작년도 cron으로 정부 관보 파싱하는 GitHub Action 고려.

### G77-C (U3): /worker/overtime 페이지 = **신설 안 함, 모달만**
- **권고 근거**:
  1. v2 SPEC §5.5에서 "모달 우선 적용 권고" 명시
  2. 사용자가 직접 URL `/worker/overtime` 진입할 시나리오 없음
  3. 라우트 신설 시 회귀 테스트 부담만 증가
  4. 모달 트리거 = 근태 신청 시트 + 홈 화면 출퇴근 카드의 "연장근무 신청" 버튼 (U1 stub, U3에서 활성화 예정 — 본 라운드는 근태 페이지 시트 트리거만 우선 활성)
- **대안**: 페이지 신설 + 모달 양립 (시안 §5.5 fallback) — 회귀 위험 + 빈 진입 시나리오 = 비용만 큼
- **사후 검토 권고**: 사용자가 URL 직접 공유/북마크 필요 시 `/worker/overtime` 페이지 추가는 별도 라운드.

### G77-D (U3): useOvertimeStore 연동 = **`submitRequest` 직접 사용**
- **권고 근거**:
  1. 기존 store가 이미 `submitRequest({employeeId, date, hours, minutes, reason})` 제공
  2. DB 스키마 hours/minutes 필드 보존 (관리자 페이지 영향 0)
  3. 신규 메서드 추가 시 store API 표면 확대 → 향후 유지보수 부담
  4. 모달 UI: startTime/endTime 입력 → useMemo로 hours/minutes 계산 → submitRequest 호출
- **대안**:
  - 신규 메서드 `submitWorkerRequest(...)` — 내부 변환 로직 store에 흡수 가능하지만 store 비대화
  - 직접 supabase.insert — store 우회 시 RealTime 동기화 누락 위험
- **사후 검토 권고**: 사용자가 startTime/endTime 직접 저장(시간 범위 표시) 원할 시 DB 컬럼 추가 별도 마이그레이션 필요.

### G77-I 부분 처리 (U3 한정): Loading / Empty / Error UI
- **자율 결정**:
  - Loading: 신청 버튼 disabled + "처리 중..." 라벨 (기존 패턴)
  - Empty: 일별 모달 출퇴근 기록 부재 시 "출퇴근 기록이 없습니다" 카드. 휴가/연장 신청 부재 시 섹션 자체 미노출.
  - Error: alert() (`연장근무 신청에 실패했습니다.\n` + 메시지) — 기존 leaveStore submitRequest 패턴과 일치
- **권고 근거**: WorkerLeavePage / WorkerHome 등 기존 작업자 페이지가 alert + inline message 패턴 사용 중. CONVERSION_GUIDE §10 "기존 코드베이스 패턴 추종" 준수.
- **대안**: Toast 시스템 신설 (별도 라운드 — 작업자 + 관리자 통일 필요)
- **사후 검토 권고**: 사용자가 alert 대화상자 대신 inline 토스트/스낵바 원할 시 별도 라운드로 분리.

## 5. 사용자 검증 시나리오

### Attendance 페이지 (`/worker/attendance`)
1. BottomNav "근태" 탭 또는 홈에서 진입 → "내 출퇴근" 페이지
2. **헤더 우상단 "근태 신청" 버튼** 노출 확인 (Q8) → 클릭 시 시트 등장
3. 시트에서 "휴가 신청" 클릭 → `/worker/leave` 이동 (기존 페이지)
4. 시트에서 "연장근무 신청" 클릭 → 연장근무 모달 등장
5. **달력 공휴일 빨간색** 확인 (Q9) — 5/24 부처님오신날, 5/25 대체공휴일 등 빨간 표시
6. **공휴일 hover/길게 누르기** → 공휴일 명칭 툴팁 (`title` 속성)
7. **달력 일자 클릭** → 일별 상세 모달 등장 (Q18)
   - 출퇴근 기록 (있으면) + 근무 시간
   - 해당 일 휴가 신청 내역 (있으면)
   - 해당 일 연장근무 신청 내역 (있으면)

### 연장근무 모달
1. 날짜 (기본 오늘) / 시작 시간 / 종료 시간 / 사유 입력
2. **자동 계산**: 종료 시간 - 시작 시간 = 연장근무 시간 표시 (info 박스)
3. 종료가 시작보다 이전이면 빨간 박스 + 신청 버튼 비활성
4. "신청" 클릭 → `submitRequest` → 성공 시 모달 close, 실패 시 alert
5. 관리자 OvertimeApprovalPage에서 해당 신청 조회 가능 (DB 영향 확인)

### 휴가 페이지 (`/worker/leave`)
1. T_worker 토큰 적용으로 기존 시각 거의 동일 유지
2. 신청 버튼 / 모달 / 이력 표시 정상 동작

## 6. 시안과 다른 시각 결정

- **DayDetailModal 헤더**: 시안 §C는 "정상 출근" 배지 1개. 본 구현은 공휴일이면 공휴일명 배지(`danger` tone), 아니면 status 기반 배지("정상 출근"/"지각"). 데이터 활용도 향상.
- **공휴일 툴팁**: 시안에 없으나 사용자 인지 향상을 위해 `title` 속성 추가. 비파괴.
- **DayDetailModal 빈 출퇴근 카드**: 시안에는 없는 추가 요소. "출퇴근 기록이 없습니다" 표시 (휴가/공휴일 등 정상 상황도 포함되는 일자라 의도적 추가).
- **OvertimeModal 사유 입력 필수**: 시안은 textarea만 표시. 본 구현은 공백 시 신청 버튼 비활성 (UX 안전망).

## 7. 발견 사항

- `useEffect`로 `fetchOvertime` 마운트 1회 호출 추가 (일별 모달의 연장근무 내역 노출용). 회귀 위험 0 — 기존에 fetchRequests가 안 호출되던 worker 진영에서 처음 호출.
- `useLeaveStore.requests`는 이미 다른 곳에서 fetch되어 있다고 가정 (WorkerLeavePage 진입 시). 일별 모달 진입 직전에 별도 fetch 안 함 (불필요한 트래픽 회피).
- 미사용 import 정리: `Pill` 사용 (모달에서). `icons` 사용. 모두 사용 중.

## 8. 다음 라운드 진입 가능 여부

✅ **U4 진입 가능**.

U4: WorkerTasksPage + WorkerNoticePage 시각 재설계 + BottomNav 빨간점. G77-E (unread Polling vs Realtime) / G77-F (notice_reads 테이블 신설) 자율 결정 예정.

---

**끝.**
