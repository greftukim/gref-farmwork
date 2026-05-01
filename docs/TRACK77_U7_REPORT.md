# 트랙 77 U7 라운드 보고서 — 근태 신청 흐름 변경 (작업 B)

**작성일**: 2026-05-02
**기준 커밋**: `b408d6b` (U6 완료 시점)
**대상 파일**:
- 신규: `src/components/worker/OvertimeModal.jsx` (별도 파일로 추출)
- 수정: `src/pages/worker/WorkerAttendancePage.jsx` (시트/OvertimeModal 정의 제거 + 일별 모달 신청 버튼)
- 수정: `src/pages/worker/WorkerHome.jsx` (OvertimeModal import + 연장근무 버튼 활성화)
- 수정: `src/pages/worker/WorkerLeavePage.jsx` (Q20 명칭 변경)

---

## 1. 작업 결과

- 변경 파일: 신규 1 + 수정 3
- 빌드: `npm run build` exit 0 / 22.46s / PWA precache 13 entries

## 2. 자산 보존 검증

| # | 자산 | 결과 |
|---|---|---|
| 1 | 출퇴근 v2 인라인 함수 (WorkerHome) | ✅ byte-identical |
| 2 | useOvertimeStore.submitRequest | ✅ 미변경, 모달에서 동일 시그니처 호출 |
| 3 | useLeaveStore.addRequest | ✅ 미변경 |
| 4 | WorkerLayout (FCM/PWA) | ✅ 미변경 |
| 5 | App.jsx | ✅ 미변경 |
| 6 | primitives.jsx | ✅ 미변경 |
| 7 | DB 스키마 | ✅ 변경 없음 |

## 3. 자가 검증 결과 (C1~C8)

| C# | 항목 | 결과 |
|---|---|---|
| C1 | 빌드 통과 | ✅ exit 0 / 22.46s |
| C2 | 자산 보존 7건 | ✅ |
| C3 | 헤더 버튼 라벨 = "근태 신청" | ✅ |
| C4 | 헤더 버튼 onClick = `navigate('/worker/leave')` (시트 X) | ✅ |
| C5 | RequestTypeSheet 컴포넌트 호출 0건 + 정의 제거 | ✅ |
| C6 | DayDetailModal 하단 "근태 신청" 버튼 존재 (G77-K: 풀 width primary) | ✅ |
| C7 | DayDetailModal 신청 버튼 → onRequestLeave → /worker/leave | ✅ |
| C8 | 홈 출퇴근 카드(출근 중) 연장근무 버튼 활성 + OvertimeModal 연결 | ✅ |

## 4. 결정 게이트 자율 처리 내역

### Q19~Q22 (사용자 사전 확정)
- Q19: 연장근무는 홈 출퇴근 카드(출근 중)에만 — 적용 ✅
- Q20: 근태 페이지 "휴가 신청" → "근태 신청" 명칭 — 적용 (페이지 헤더 + 보고서 박제: 모달 제목은 "휴가 신청" 유지 — 폼이 실제 휴가 카테고리만 다루므로 라벨 정확성 우선)
- Q21: 헤더 버튼 시트 분기 X → 즉시 페이지 이동 — 적용 ✅
- Q22: 일별 모달에 "근태 신청" 버튼 추가 — 적용 ✅

### G77-J (U7): 근태 신청 페이지 = **휴가 단독** (연장은 홈에서만)
- **권고 근거**:
  1. Q19 사용자 결정과 일치
  2. 페이지 책무 단일화 → 사용자 멘탈 모델 명확
  3. 연장근무는 "출근 중" 컨텍스트에서만 의미가 있으므로 홈 적합
  4. 향후 연장 이력 페이지가 필요해지면 별도 라우트(`/worker/overtime/history`)로 분리 가능
- **대안**: 통합 페이지 (휴가 + 연장 탭) — Q19와 충돌
- **사후 검토 권고**: 사용자가 본 페이지에서 연장 신청 흐름도 원할 시 알려달라

### G77-K (U7): 일별 모달 신청 버튼 위치 = **모달 하단 풀 width**
- **권고 근거**:
  1. 시안 §5.3 ScreenAttendanceDayModal에 명시되지 않은 신규 요소 — 가장 직관적 위치
  2. 풀 width primary 버튼 = 모달 첫 번째 액션 강조
  3. "닫기" 보조 버튼은 그 아래에 outline 스타일로 배치
- **대안**:
  - 우상단 X 옆: 시각 노이즈 증가
  - 모달 헤더 우측 (X 버튼 옆 별도): X와 시각 충돌
- **사후 검토 권고**: 사용자가 위치 변경 원할 시 알려달라

### G77-L (U7): RequestTypeSheet = **삭제**
- **권고 근거**:
  1. Q21 흐름 변경으로 사용처 0건
  2. 코드 dead weight 정리
  3. 향후 재사용 가능성 매우 낮음 (시트 패턴 자체가 v2 SPEC에서 명시되지 않음)
- **대안**: 보존 (재사용 대비) — dead code 누적 방지 차원에서 삭제 우선
- **사후 검토 권고**: 향후 시트 패턴 필요 시 별도 컴포넌트로 신규 작성

### G77-I 부분 처리 (U7 한정)
- **자율 결정**: alert 패턴 추종 (성공/실패 모두). U3 OvertimeModal과 동일 흐름.
- **권고 근거**: 일관성 유지

## 5. 사용자 검증 시나리오

### Attendance 페이지
1. `/worker/attendance` 진입 → 헤더 우상단 "근태 신청" 버튼 노출
2. 클릭 → **시트 분기 없이 즉시** `/worker/leave` 이동 (Q21)
3. 달력 일자 클릭 → 일별 모달 등장
4. 일별 모달 하단에 **풀 width primary "근태 신청" 버튼** 노출 (Q22 + G77-K)
5. 클릭 → 모달 닫힘 + `/worker/leave` 이동

### WorkerLeavePage (`/worker/leave`)
1. 헤더 제목: "근태 신청" (Q20)
2. 우상단 "+ 신청" 버튼 → 모달 (휴가 카테고리: 연차/병가/개인/경조사)
3. 모달 제목: "휴가 신청" 유지 (실제 폼이 휴가 전용 — 사용자 라벨 명확성)
4. 신청 → leaveStore.addRequest

### Home 출퇴근 카드 (출근 중)
1. 출근 후 "출근 중" 상태 카드 표시
2. **퇴근하기** primary 버튼
3. **연장근무 신청** info-soft 버튼 활성 (U7 핵심 — U1 disabled stub 해제)
4. 클릭 → OvertimeModal 등장
5. 시작/종료 시간 + 사유 → 신청 → overtimeStore.submitRequest
6. 성공 시 alert ("연장근무 신청이 접수되었습니다.")

### 일별 모달 (Q18 + Q22)
1. 출퇴근 기록 + 휴가/연장 신청 내역 노출
2. 하단 "근태 신청" 버튼 → 페이지 이동

## 6. 배포 / 푸시 상태

- 로컬 SHA: (커밋 후 보고)
- git push origin main: (커밋 후 실행 예정)
- Vercel webhook: 자동 트리거 예상

## 7. 발견 사항

- **OvertimeModal 분리**: U3 시점에는 WorkerAttendancePage 내부에 인라인 정의. U7에서 G77-J 결정으로 홈 + 근태 페이지 양쪽 사용 가능성 → 별도 파일로 추출이 적절. 단, U7 결정으로 근태 페이지에서는 사용 X. 향후 재사용 가능.
- **모달 제목과 페이지 제목 분리**: WorkerLeavePage 헤더 = "근태 신청" / 신청 모달 제목 = "휴가 신청". 사용자가 "근태 신청"이라는 카테고리 안에서 "휴가" 유형을 선택하는 멘탈 모델. 페이지/모달 라벨 분리는 의도적.

## 8. 다음 라운드 진입 가능 여부

✅ **U8 진입 가능** — 작업 C-1 (트랙 77 전체 검수).

---

**끝.**
