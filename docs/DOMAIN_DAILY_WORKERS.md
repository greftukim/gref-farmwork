# 도메인 노트 — 일용직/시급제 작업자 (트랙 F)

> 작성: Phase 5 세션 2 직후 (2026-04-11)
> 출처: 태우 ↔ Claude 도메인 정의 세션
> 트랙 F 작업 지시문은 이 노트를 단일 출처로 인용한다.

## 1. 트랙의 본질

트랙 F는 **본사 인사팀 수기 임금 장부의 디지털화**다.
작업자 관리 시스템이 아니다. 이 구분이 도메인 전체 결정의 기반이다.

핵심 차이:
- 작업자 관리 시스템 = 작업자가 사용자다 (PWA 로그인, 출퇴근, 휴가, TBM, 푸시)
- 임금 대장 시스템 = 작업자는 데이터 객체다 (사용자 아님, 시스템 인지 못함)

이 차이로부터 다음이 자동 결정된다:
- 일용직 작업자는 GREF FarmWork의 인증 사용자가 **아니다**
- employees 테이블에 들어가지 **않는다**
- auth_user_id, device_token, FCM 토큰, RLS worker 정책의 대상이 아니다
- TBM, 휴가 신청, QR 출퇴근, 본인 임금 조회 — 전부 해당 없음
- 작업자 측 PWA에 노출되는 화면 0개

## 2. 데이터 모델

### 2.1 단일 테이블: `daily_work_logs`

근무 건 중심 모델 (모델 B). 사람 테이블 없음.
같은 사람이 여러 날 일하면 여러 행. 사람 식별·재사용 안 함.

### 2.2 컬럼

| 컬럼 | 타입 | 비고 |
|---|---|---|
| id | uuid PK | |
| work_date | date NOT NULL | 근무 일자. 원안 `date`에서 변경 — PostgreSQL 예약어 충돌 회피 |
| branch | text NOT NULL | 농장 코드 (busan/jinju/hadong 등) |
| worker_name | text NOT NULL | 작업자 이름 |
| worker_phone | text nullable | 일별 지급 시 계좌이체용 (선택) |
| start_time | time NOT NULL | 협의 출근 시각 |
| end_time | time NOT NULL | 협의 퇴근 시각. CHECK: end_time > start_time |
| break_minutes | int nullable | 휴게시간(분), 행마다 입력. NULL = 미기록 **[TEMP-DECISION-2]** 원안: int NOT NULL default 0 |
| work_minutes | int NOT NULL | 자동 계산 (GENERATED): (end - start)분 - COALESCE(break, 0) |
| hourly_wage | int NOT NULL | 시급(원), 등록 시 입력. 기본값 없음 |
| daily_wage | int NOT NULL | 자동 계산 (GENERATED): ROUND(hourly_wage × work_minutes / 60) **[TEMP-DECISION-4]** 반올림 정책 미확인 |
| work_description | text nullable | "포장 보조", "수확" 등 |
| payment_status | payment_status enum NOT NULL default 'pending' | 2단계: pending / paid **[TEMP-DECISION-1]** 원안: text 'unpaid'/paid_daily/paid_monthly |
| paid_at | date nullable | 지급일 |
| created_at | timestamptz NOT NULL default now() | |
| updated_at | timestamptz NOT NULL default now() | |

작성자(created_by) 컬럼 없음 (태우 결정).

### 2.3 자동 계산 규칙

- `work_minutes` = (end_time - start_time)을 분으로 - break_minutes
- `daily_wage` = round(hourly_wage × work_minutes / 60)
  - 원 단위 반올림 정책: 일반 반올림 (5 이상 올림)
  - 실제 운영에서 다르면 트랙 F 진행 중 재확인

### 2.4 정합성 제약

- end_time > start_time (DB CHECK 또는 앱 레벨)
- break_minutes >= 0
- work_minutes > 0
- hourly_wage > 0

## 3. 권한 (RLS)

### 3.1 입력 (INSERT/UPDATE/DELETE)
- farm_admin: 본인 농장(branch) 분만 가능
- hr_admin: 전체 농장 가능
- master: 전체
- worker, anon: 불가

### 3.2 조회 (SELECT)
- farm_admin: 본인 농장 분만
- hr_admin, master: 전체
- worker, anon: 불가

### 3.3 RLS 정책 작성 시 주의
- 교훈 12 적용: employees JOIN이 필요하면 FK 제약명 명시
- 단 daily_work_logs는 employees 참조가 없으므로 해당 없음
- branch 격리는 current_employee_branch() 함수 재사용

## 4. UI

### 4.1 위치
사이드바 "인사 관리 > 일용직/시급제" 탭 (이미 존재, 빈 화면 상태).

### 4.2 화면 구성

**메인 화면 — 일별 보기**
- 상단: 날짜 셀렉터 (기본값: 오늘)
- 상단: 농장 셀렉터 (TopBar selectedBranch 재사용, farm_admin은 본인 농장 고정)
- 본문: 해당 날짜·농장의 daily_work_logs 목록 (테이블/카드)
- 각 행: 이름 / 협의시간 / 휴게 / 근무시간 / 시급 / 일당 / 지급상태 / [수정] [삭제]
- 하단: 그날 합계 (인원·총 임금)
- 우상단: [+ 등록] 버튼

**등록/수정 모달**
- 일자, 농장(권한 따라 잠금 또는 선택), 이름, 연락처(선택)
- 출근 시각, 퇴근 시각, 휴게(분)
- 시급 (직접 입력, 기본값 없음)
- 작업 내용(선택)
- "근무시간 X시간 Y분 / 일당 Z원" 자동 미리보기
- [저장] [취소]

**삭제**
- 확인 모달 후 실삭제 (논리 삭제 안 함, 단순 도메인)

### 4.3 출력 (보고서)

**(i) 일별 출력**
- 메인 화면이 곧 일별 출력
- 우상단에 "엑셀 다운로드" 버튼 → 그날 분만 xlsx
- 컬럼: 일자 / 농장 / 이름 / 시작 / 종료 / 휴게 / 근무시간 / 시급 / 일당 / 지급상태

**(ii) 월별 출력**
- 별도 진입점 또는 메인 화면 상단 탭 ("일별 / 월별")
- 월 셀렉터 + 농장 셀렉터
- 두 가지 시트로 xlsx 생성:
  - 시트 1: 행 단위 raw (해당 월의 모든 daily_work_logs)
  - 시트 2: 사람별 합계 (worker_name으로 group by, 근무일수·총시간·총임금)
- 파일명: `일용직임금_{농장}_{YYYY-MM}.xlsx`

(iii) 사람별 누적 추적은 트랙 F 1차 범위에서 제외 (Q5 결정).
필요하면 시트 2의 사람별 합계로 우회 가능.

## 5. 알림 (트랙 F 범위 외, 의존성만 명시)

트랙 F는 알림 푸시 자체를 만들지 않는다.
다만 다음을 가정한다:
- E-6.5 (FCM 백그라운드 푸시)가 트랙 E 마무리 묶음에서 해소된 후 트랙 F 진입
- 트랙 F에서 새 daily_work_log 등록 시 인사팀에 푸시 알림을 보낼지는 트랙 F 진행 중 별도 결정
- iOS PWA는 홈 화면 추가 후에만 푸시 수신 가능 — 부산LAB 실사용자 안내 필요

## 6. 도메인 결정 사항 요약 (Phase 5 세션 2)

| # | 결정 | 근거 |
|---|---|---|
| D-1 | 일용직은 employees 테이블 외부 (`daily_work_logs` 단독) | PWA 사용자 아님, 권한 없음 |
| D-2 | 모델 B (근무 건 중심), 사람 테이블 없음 | 같은 사람 식별 수요 약함 |
| D-3 | 작성자 컬럼 없음 | 태우 결정, 단순화 |
| D-4 | 휴게시간은 행마다 입력 (옵션 다) | 일용직마다 다를 수 있음 |
| D-5 | 시급은 행마다 직접 입력, 기본값 없음 | 최저시급 변경 대비 유연성 |
| D-6 | 입력 권한: farm_admin(본인 농장) + hr_admin/master(전체) | 농장 확장 시 인사팀 부담 회피 |
| D-7 | 출력: 일별(엑셀) + 월별(엑셀, 2시트) | (iii) 사람별 누적은 1차 범위 외 |
| D-8 | 수정·삭제 기능 필수 | 태우 결정 |

## 7. 1차 범위 외 (트랙 F 종료 후 또는 트랙 F-2)

- (iii) 사람별 누적 추적 화면
- 등록 시 인사팀 푸시 알림 (E-6.5 안정화 후)
- 정직원이 일용직 모드로 일하는 경우의 처리 (현재 부산LAB에 케이스 없음 가정)
- 작업자 본인 임금 조회 (도메인상 불필요로 결정됨)

## 8. 박민식·김민국 확인 필요 항목

(태우가 트랙 F 진입 전 확인할 것)

- [ ] 일당 원 단위 반올림 정책 (5 이상 올림이 맞는지)
- [ ] 부산LAB이 지금 수기 장부에서 휴게시간을 어떻게 처리하는지 (실제 값 확인)
- [ ] 일별 지급(현금/계좌이체) 비율과 월말 정산 비율 (UI 우선순위 결정용)
- [ ] payment_status enum이 충분한지 (혹시 "보류"나 "조정 중" 같은 상태가 필요한지)
- [ ] 진주·하동에도 일용직 운영이 있는지, 부산LAB과 운영 방식이 같은지 → **[TEMP-DECISION-3]** F-0 마이그레이션 RLS branch CHECK는 3개 지점 모두 허용으로 임시 적용. 답 수신 시 마이그레이션 RLS의 branch IN 절만 수정.

## 9. 트랙 F 작업 단계 초안 (확정 아님)

이 노트가 승인되면 트랙 F 작업 지시문에서 구체화될 단계:

- F-0: DB 마이그레이션 (daily_work_logs 테이블 + RLS 정책)
- F-1: dailyWorkLogStore 생성 + CRUD 액션
- F-2: 사이드바 "일용직/시급제" 페이지 — 일별 보기 + 등록/수정/삭제 모달
- F-3: 일별 엑셀 다운로드
- F-4: 월별 보기 탭 + 월별 엑셀 (2시트) 다운로드
- F-5: 권한 회귀 검증 (worker/anon 차단 확인, MCP)
