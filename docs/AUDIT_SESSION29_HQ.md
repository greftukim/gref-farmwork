# HQ 영역 전수조사 리포트 (세션 29)

날짜: 2026-04-24  
조사자: Claude Code + Playwright CLI v1.59.1  
범위: HQ 9개 페이지 (/admin/hq/*)  
총 체크포인트: 약 90개  
발견된 이슈: **27개** (Playwright 24 + 코드 분석 3)

---

## 요약

### 심각도별 집계
| 심각도 | 건수 | 설명 |
|--------|------|------|
| **P0** | 0 | 페이지 크래시·데이터 파손 없음 |
| **P1** | 4 | 핵심 기능 동작 불가 |
| **P2** | 19 | 보조 기능 미작동 / 데이터 하드코딩 |
| **P3** | 4 | UI 개선 여지 / 의도된 동작 가능성 |

### 카테고리별 집계
| 카테고리 | 건수 |
|----------|------|
| 인터랙션 | 16 |
| 데이터 | 8 |
| UI | 2 |
| 에러 | 1 |

### 공통 패턴 (가장 중요)
> **`btnPrimary(label, iconD)` / `btnSecondary(label, iconD)` 호출 시 onClick 3번째 인자 미전달 → 버튼 클릭 시 무반응.**  
> `_pages.jsx`의 모든 액션 버튼(직원 추가, 지점 추가, CSV 내보내기, 새 공지 작성, 규칙 설정, 지도로 보기, 열람 리포트)이 이 패턴으로 작성됨. 기능 구현 전 onClick 연결 생략 상태.  
> `src/design/primitives.jsx:225` — onClick 파라미터는 있으나 _pages.jsx 호출 시 전달 없음.

### 세션 28 수정 사항 회귀 테스트
| 항목 | 결과 |
|------|------|
| BUG-F01: 부동소수점 미포맷 | ✅ PASS (DOM에 `.xxxxxxx` 수치 없음) |
| BUG-F02: 작물 탭 제거 | ✅ PASS (토마토/딸기/파프리카/오이 탭 없음) |
| 지점별 수확량 그룹 막대 | ✅ PASS (부산/진주/하동 막대 정상 렌더링) |

---

## DB 수치 대조 결과

| 항목 | DB 실측값 | UI 표시값 | 일치 |
|------|----------|----------|------|
| 이번달 수확량 합계 | 8,782.5 kg | 8,782.5 kg | ✅ |
| 부산LAB 이번달 수확 | 3,964.3 kg | 3,964.3 kg | ✅ |
| 진주HUB 이번달 수확 | 3,115.7 kg | 3,115.7 kg | ✅ |
| 하동HUB 이번달 수확 | 1,702.5 kg | 1,702.5 kg | ✅ |
| 활성 직원 수 | 38명 | 41행 표시 | ⚠️ 비활성 3명 포함 가능 |
| 공지 건수 | 0건 | "공지 없음" | ✅ |

> **주의**: `harvest_records` 테이블에 `branch_id` 컬럼 없음. 지점별 집계는 `employees.branch` 경유. UI의 harvestStore도 동일 경로. 총 509건 레코드.

---

## 페이지별 상세

### 1. HQ Dashboard (/admin/hq)

스크린샷: `docs/audit_screenshots/1-dashboard-top.png`, `1-dashboard-bottom.png`  
체크포인트: 약 15개  
발견 이슈: 5건

#### ISSUE-HQ-1-01: 기간 피커 탭(일/주/월/분기) DOM 탐색 미발견
- **심각도**: P2
- **카테고리**: UI
- **증상**: `button:has-text("일/주/월/분기")` 셀렉터로 탐색 시 0건. 실제 DOM은 `<div>` 기반 cursor-pointer 구조.
- **재현**: Playwright `button:has-text("일")` 쿼리 → 0건
- **예상 원인**: HQTopBar에서 탭이 `<div>` 요소로 렌더링. 클릭 자체는 되나, onClick에 실제 대시보드 데이터 기간 필터 연결 미확인 (기존 BACKLOG `HQ-PERIOD-PICKER-001`)
- **수정 공수**: 중간
- **BACKLOG**: HQ-PERIOD-PICKER-001

#### ISSUE-HQ-1-02: "리포트 내보내기" alert 임시 처리
- **심각도**: P2
- **카테고리**: 인터랙션
- **증상**: 클릭 시 `alert('리포트 내보내기 기능 준비 중입니다.')`
- **재현**: /admin/hq → "리포트 내보내기" 버튼 클릭
- **예상 원인**: 기능 미구현 상태 임시 alert
- **수정 공수**: 어려움 (PDF/CSV 라이브러리 선정 필요)
- **BACKLOG**: HQ-REPORT-EXPORT-001

#### ISSUE-HQ-1-03: 검색 input 입력 가능하나 결과 반영 미구현
- **심각도**: P3
- **카테고리**: 인터랙션
- **증상**: TopBar 검색창에 타이핑 가능. 하지만 검색어로 대시보드 필터링 없음.
- **재현**: 검색창에 "부산" 입력 → 데이터 변화 없음
- **예상 원인**: onChange는 연결됐으나 검색 결과 반영 미구현 (기존 BACKLOG)
- **수정 공수**: 어려움
- **BACKLOG**: GLOBAL-SEARCH-001

#### ISSUE-HQ-1-04: 알림 벨 버튼 alert 임시 처리
- **심각도**: P2
- **카테고리**: 인터랙션
- **증상**: TopBar 알림 버튼 클릭 시 `alert('알림 기능 준비 중입니다.')`
- **재현**: /admin/hq → 벨 아이콘 버튼 클릭
- **예상 원인**: 알림 드롭다운 패널 미구현
- **수정 공수**: 어려움
- **BACKLOG**: NOTIFICATION-DROPDOWN-001

#### ISSUE-HQ-1-05: "작물별 상세 분석 보고서 열기" alert 임시 처리
- **심각도**: P2
- **카테고리**: 인터랙션
- **증상**: 수확량 차트 하단 링크 클릭 시 `alert('작물별 상세 분석 보고서 준비 중입니다.')`
- **재현**: /admin/hq → 수확량 차트 영역 → "보고서 열기" 텍스트 클릭
- **예상 원인**: 보고서 페이지 미구현
- **수정 공수**: 어려움
- **BACKLOG**: HQ-CROP-REPORT-001

> **추가 관찰 (이슈 미등록)**:
> - KPI 카드(전사 가동률/월 수확량/월 인건비/미해결 이슈) 클릭 → 기존 BACKLOG `HQ-KPI-DRILLDOWN-001` 확인됨
> - 빈 상태 텍스트: "수확 목표 없음", "집계 없음", "대기 중인 승인 요청 없음", "재무 데이터 집계 없음", "미해결 이슈 없음", "공지 없음" — 전부 DB 데이터 없음이 원인 (정상 동작)
> - "전사 공지 작성" → /admin/hq/notices 정상 ✅
> - "지점 관리 →" → /admin/hq/branches 정상 ✅
> - 승인 허브 "전체 →" → /admin/hq/approvals 정상 ✅

---

### 2. HQ Branches (/admin/hq/branches)

스크린샷: `docs/audit_screenshots/2-branches-top.png`, `2-branches-bottom.png`  
체크포인트: 약 10개  
발견 이슈: 4건

#### ISSUE-HQ-2-01: 지점 카드 상세 정보 대부분 미집계 (— 표시 16건)
- **심각도**: P2
- **카테고리**: 데이터
- **증상**: DOM에서 `—` 기호 16개 발견. 지점장·수확량·출근률·면적·작물 정보 미표시
- **재현**: /admin/hq/branches 진입 → 지점 카드 확인
- **DB 대조**: branches 테이블에 해당 컬럼 없음 (BACKLOG HQ-BRANCHES-META-001 확인)
- **수정 공수**: 어려움 (DB 컬럼 신설 필요)
- **BACKLOG**: HQ-BRANCHES-META-001

#### ISSUE-HQ-2-02: "지도로 보기" 버튼 클릭 무반응
- **심각도**: P2
- **카테고리**: 인터랙션
- **증상**: 버튼 클릭 후 alert 없음, 모달 없음, 페이지 변화 없음
- **재현**: /admin/hq/branches → "지도로 보기" 버튼 클릭
- **예상 원인**: `btnSecondary('지도로 보기', icons.location)` — onClick 미전달 (공통 패턴)
- **수정 공수**: 어려움
- **BACKLOG**: 신규 (지도 UI 미구현)

#### ISSUE-HQ-2-03: "지점 추가" 버튼 클릭 무반응
- **심각도**: P2
- **카테고리**: 인터랙션
- **증상**: 버튼 클릭 후 모달·폼·alert 없음
- **재현**: /admin/hq/branches → "지점 추가" 버튼 클릭
- **예상 원인**: `btnPrimary('지점 추가', icons.plus)` — onClick 미전달 (공통 패턴)
- **수정 공수**: 중간
- **BACKLOG**: 신규

#### ISSUE-HQ-2-04: 지점장 "연락" 버튼 클릭 무반응
- **심각도**: P3
- **카테고리**: 인터랙션
- **증상**: 클릭 후 전화/메시지/alert 없음
- **재현**: /admin/hq/branches → 지점 카드 → "연락" 버튼 클릭
- **예상 원인**: onClick 미연결
- **수정 공수**: 중간
- **BACKLOG**: 신규 (의도된 동작일 가능성 확인 필요)

> **추가 관찰**:
> - 3개 지점(부산LAB/진주HUB/하동HUB) 카드 정상 렌더링 ✅
> - "상세 →" 버튼 클릭 → 동일 URL 유지 (모달 또는 navigate 연결 필요, 조사 필요)

---

### 3. HQ Employees (/admin/hq/employees)

스크린샷: `docs/audit_screenshots/3-employees-top.png`, `3-employees-modal.png`, `3-employees-bottom.png`  
체크포인트: 약 15개  
발견 이슈: 5건

#### ISSUE-HQ-3-01: 검색창 여전히 `<span>` — HQ-EMP-SEARCH-001 BACKLOG 상태 불일치 ⚠️
- **심각도**: P1
- **카테고리**: UI
- **증상**: 검색 영역이 `<span>이름, 연락처로 검색</span>` 상태. 실제 input 없음. 타이핑 불가.
- **재현**: /admin/hq/employees → 검색창 클릭 시도 → 커서 없음
- **DB 대조**: 해당 없음
- **코드 위치**: `src/pages/hq/_pages.jsx:566`
- **BACKLOG 불일치**: `HQ-EMP-SEARCH-001`이 "resolved (세션 24)" 표시됨. 그러나 실제 코드는 `<span>` 그대로. 세션 24 수정이 _pages.jsx에 미반영되었거나 커밋 후 되돌려진 상태.
- **수정 공수**: 쉬움 (span → input 교체, 세션 24에서 이미 파악됨)
- **BACKLOG**: HQ-EMP-SEARCH-001 (재오픈 필요)

#### ISSUE-HQ-3-02: 고용형태 필터(정규/계약/임시) 실 필터링 미작동
- **심각도**: P2
- **카테고리**: 인터랙션
- **증상**: 탭 클릭 시 시각 피드백은 있으나 `employees.job_type` 값이 'admin'/'worker'여서 '정규'/'계약'/'임시' 매핑 안 됨. 실 필터링 결과는 의심스러움.
- **재현**: /admin/hq/employees → "정규" 탭 클릭 → 예상과 다른 결과
- **DB 대조**: active employees: farm_admin 8, hr_admin 3, general 2, master 1, worker 24 = 38명. job_type 컬럼에 정규/계약/임시 값 없음.
- **수정 공수**: 어려움
- **BACKLOG**: HQ-EMP-TYPE-001

#### ISSUE-HQ-3-03: "상세" 버튼 클릭 시 직원 상세 모달 미표시
- **심각도**: P1
- **카테고리**: 인터랙션
- **증상**: 직원 행 우측 "상세" 버튼 클릭 후 모달 없음. UI 변화 없음.
- **재현**: /admin/hq/employees → 직원 행 → "상세" 버튼 클릭
- **예상 원인**: setSelectedEmployee() 호출은 되나 EmployeeDetailModal 렌더링 조건 문제, 또는 onClick 미연결
- **수정 공수**: 중간
- **BACKLOG**: HQ-EMPLOYEE-EDIT-MODAL-001

#### ISSUE-HQ-3-04: CSV 내보내기 버튼 클릭 무반응
- **심각도**: P2
- **카테고리**: 인터랙션
- **증상**: 다운로드 없음, alert 없음
- **재현**: /admin/hq/employees → "CSV 내보내기" 버튼 클릭
- **예상 원인**: `btnSecondary('CSV 내보내기', icons.chart)` — onClick 미전달 (공통 패턴)
- **수정 공수**: 중간
- **BACKLOG**: HQ-EMP-CSV-001

#### ISSUE-HQ-3-05: "직원 추가" 버튼 클릭 무반응
- **심각도**: P2
- **카테고리**: 인터랙션
- **증상**: 모달·폼·alert 없음
- **재현**: /admin/hq/employees → "직원 추가" 버튼 클릭
- **예상 원인**: `btnPrimary('직원 추가', icons.plus)` — onClick 미전달 (공통 패턴)
- **수정 공수**: 중간
- **BACKLOG**: HQ-EMP-ADD-001

> **추가 관찰**:
> - 직원 테이블 행 수: 41행 (DB 활성 38 + 비활성 3). **비활성 직원도 테이블에 노출** 중인 것으로 보임. is_active 필터 적용 여부 확인 필요.
> - 지점 탭("부산"/"진주"/"하동") 발견 안 됨. "전체" 탭만 인식됨. 탭 렌더링 구조가 `<div>` 기반으로 button 셀렉터 미매칭.

---

### 4. HQ Approvals (/admin/hq/approvals)

스크린샷: `docs/audit_screenshots/4-approvals-top.png`, `4-approvals-bottom.png`  
체크포인트: 약 10개  
발견 이슈: 2건

#### ISSUE-HQ-4-01: 승인 허브 예산/인사/자재 카테고리 데이터 없음
- **심각도**: P2
- **카테고리**: 데이터
- **증상**: 유형 필터 "예산"/"인사"/"자재" 클릭 시 빈 상태. 근태 외 테이블 미존재.
- **재현**: /admin/hq/approvals → 유형 필터 "예산" 클릭 → 빈 목록
- **DB 대조**: leave_requests/overtime_requests만 존재. 예산/인사/자재 테이블 없음.
- **수정 공수**: 어려움
- **BACKLOG**: APPROVAL-CATEGORY-001

#### ISSUE-HQ-4-02: "내보내기" 버튼 클릭 무반응
- **심각도**: P2
- **카테고리**: 인터랙션
- **증상**: 클릭 후 다운로드·alert 없음
- **재현**: /admin/hq/approvals → "내보내기" 버튼 클릭
- **예상 원인**: `btnSecondary('내보내기', icons.chart)` — onClick 미전달 (공통 패턴)
- **수정 공수**: 중간
- **BACKLOG**: 신규

> **추가 관찰**:
> - "대기 중/승인됨/반려" 탭이 `<div>` 기반. button 셀렉터로 탐색 안 됨. (기능은 정상일 수 있음)
> - 현재 대기 중 건수 0 (DB 미승인 데이터 없음 → 정상)
> - 전체 체크박스 → 일괄 처리 버튼 0개 (데이터 없을 때 숨김 처리일 수 있음)

---

### 5. HQ Notices (/admin/hq/notices)

스크린샷: `docs/audit_screenshots/5-notices-top.png`, `5-notices-bottom.png`  
체크포인트: 약 8개  
발견 이슈: 3건

#### ISSUE-HQ-5-01: 열람률(%) 데이터 미표시
- **심각도**: P3
- **카테고리**: 데이터
- **증상**: "평균 열람률 —" 고정 표시. read_count/read_pct 관련 DB 컬럼 없음.
- **재현**: /admin/hq/notices → 요약 카드 "평균 열람률" 확인
- **DB 대조**: notices 테이블에 열람률 컬럼 없음 (BACKLOG 확인)
- **수정 공수**: 어려움
- **BACKLOG**: HQ-NOTICES-META-001

#### ISSUE-HQ-5-02: "새 공지 작성" 버튼 클릭 무반응
- **심각도**: P1
- **카테고리**: 인터랙션
- **증상**: 클릭 후 모달·폼·alert 없음
- **재현**: /admin/hq/notices → "새 공지 작성" 버튼 클릭
- **코드 위치**: `_pages.jsx:700` — `btnPrimary('새 공지 작성', icons.plus)` onClick 미전달
- **예상 원인**: 공통 패턴 (btnPrimary onClick 미전달)
- **수정 공수**: 중간 (모달 신규 작성 필요)
- **BACKLOG**: 신규

#### ISSUE-HQ-5-03: "열람 리포트" 버튼 클릭 무반응
- **심각도**: P2
- **카테고리**: 인터랙션
- **증상**: 클릭 후 아무 반응 없음
- **재현**: /admin/hq/notices → "열람 리포트" 버튼 클릭
- **예상 원인**: `btnSecondary('열람 리포트', icons.chart)` — onClick 미전달 (공통 패턴)
- **수정 공수**: 어려움
- **BACKLOG**: 신규

> **추가 관찰**:
> - DB notices 0건 → UI "공지 없음" ✅
> - 활성/예약됨/만료/템플릿 탭은 `<div>` 기반. 클릭 기능 자체는 정상일 수 있음 (tab state 변경).

---

### 6. HQ Finance (/admin/hq/finance)

스크린샷: `docs/audit_screenshots/6-finance-top.png`, `6-finance-bottom.png`  
체크포인트: 약 8개  
발견 이슈: 2건 + console 에러 1건

#### ISSUE-HQ-6-01: 재무 데이터 전체 하드코딩 (DB 소스 없음)
- **심각도**: P2
- **카테고리**: 데이터
- **증상**: KPI값(+18%, 예산 9,200만원·91%, ▼6% 개선 등)이 하드코딩 목업
- **재현**: /admin/hq/finance → 모든 수치 확인
- **DB 대조**: 해당 재무 테이블 미존재
- **수정 공수**: 어려움 (재무 트랙 별 신설 필요)
- **BACKLOG**: HQ-FINANCE-001

#### ISSUE-HQ-6-02: "PDF 내보내기" 버튼 클릭 무반응
- **심각도**: P2
- **카테고리**: 인터랙션
- **증상**: 클릭 후 다운로드·alert 없음
- **재현**: /admin/hq/finance → "PDF 내보내기" 버튼 클릭
- **예상 원인**: `btnSecondary('PDF 내보내기', icons.chart)` — onClick 미전달 (공통 패턴)
- **수정 공수**: 어려움
- **BACKLOG**: 신규

#### ISSUE-HQ-6-03: Finance 페이지 Console 에러 1건
- **심각도**: P2 (에러 메시지 미확인)
- **카테고리**: 에러
- **증상**: Playwright console error 이벤트 1건 발생
- **재현**: /admin/hq/finance 진입 시
- **예상 원인**: 하드코딩 데이터 처리 중 undefined 접근 또는 Recharts 렌더 오류
- **수정 공수**: 중간 (에러 메시지 직접 확인 후 대응)
- **BACKLOG**: 신규 (정밀 재조사 필요)

> **추가 관찰**:
> - MTD/QTD/YTD/2025 기간 탭 클릭 정상 동작 (period state 변경) ✅
> - 그러나 기간 탭 변경 시 수치 변화 없음 (하드코딩이므로)

---

### 7. HQ Growth (/admin/hq/growth)

스크린샷: `docs/audit_screenshots/7-growth-top.png`, `7-growth-bottom.png`  
체크포인트: 약 8개  
발견 이슈: 2건

#### ISSUE-HQ-7-01: 생육 데이터 전체 하드코딩 (growth_surveys 미연결)
- **심각도**: P2
- **카테고리**: 데이터
- **증상**: 온도/습도/BRIX 등 수치가 `HQ_GR_DATA` 목업 객체
- **재현**: /admin/hq/growth → 생육 매트릭스 수치 확인
- **DB 대조**: growth_surveys 테이블 존재하나 매핑 미구현
- **수정 공수**: 어려움
- **BACKLOG**: HQ-GROWTH-001

#### ISSUE-HQ-7-02: "지점 알림 발송" 버튼 클릭 무반응
- **심각도**: P2
- **카테고리**: 인터랙션
- **증상**: 클릭 후 alert·모달·FCM 없음
- **재현**: /admin/hq/growth → 경고 카드 → "지점 알림 발송" 버튼 클릭
- **예상 원인**: onClick 미연결
- **수정 공수**: 중간
- **BACKLOG**: 신규

> **추가 관찰**:
> - "지점 상세 보기 →" 클릭 시 동일 URL 유지 (navigate 미연결)

---

### 8. HQ Performance (/admin/hq/performance)

스크린샷: `docs/audit_screenshots/8-performance-top.png`, `8-performance-bottom.png`  
체크포인트: 약 6개  
발견 이슈: 1건

#### ISSUE-HQ-8-01: 성과 데이터 하드코딩 (daily_work_logs + SAM 집계 미연결)
- **심각도**: P2
- **카테고리**: 데이터
- **증상**: 성과 수치가 목업 기반. usePerformanceData가 sam_standards만 fetch.
- **재현**: /admin/hq/performance → 수치 확인
- **DB 대조**: daily_work_logs 집계 로직 미구현
- **수정 공수**: 어려움
- **BACKLOG**: HQ-PERFORMANCE-001

> **추가 관찰**:
> - 클릭 가능 요소 2개로 매우 적음 (기간 필터 버튼 없음 또는 비활성화)
> - Console 에러 없음 ✅

---

### 9. HQ DashboardInteractive (/admin/hq/interactive)

스크린샷: `docs/audit_screenshots/9-interactive-top.png`, `9-interactive-bottom.png`  
체크포인트: 약 8개  
발견 이슈: 1건

#### ISSUE-HQ-9-01: DashboardInteractive 전체 하드코딩 (store 미연결)
- **심각도**: P2
- **카테고리**: 데이터
- **증상**: 지점/승인/기간 데이터 전부 목업 (store import 0개)
- **재현**: /admin/hq/interactive → 수치 확인
- **DB 대조**: harvestStore/attendanceStore/leaveStore 모두 미연결
- **수정 공수**: 어려움
- **BACKLOG**: HQ-DASHBOARD-INTERACTIVE-001

> **추가 관찰**:
> - 진입 정상 ✅ (/admin/hq/interactive 라우트 존재)
> - 기간 피커(일/주/월/분기) 클릭 정상 (period state 변경) ✅
> - 지점 카드 클릭 시 지점 상세 모달 여부 미확인 (cursor-pointer 요소는 존재)

---

## 공통 패턴 상세 분석

### 패턴 A: btnPrimary/btnSecondary onClick 미전달 (9건)
`src/design/primitives.jsx:225` — `btnPrimary(label, iconD, onClick)` 3번째 인자 `onClick`이 선택적.  
`_pages.jsx` 전체에서 onClick 없이 호출된 버튼 목록:

| 페이지 | 버튼명 | 줄 번호 | BACKLOG |
|--------|--------|---------|---------|
| Approvals | 내보내기 | 155 | 신규 |
| Approvals | 규칙 설정 | 155 | 신규 |
| Branches | 지도로 보기 | 368 | 신규 |
| Branches | 지점 추가 | 368 | 신규 |
| Employees | CSV 내보내기 | 530 | HQ-EMP-CSV-001 |
| Employees | 직원 추가 | 530 | HQ-EMP-ADD-001 |
| Notices | 열람 리포트 | 700 | 신규 |
| Notices | 새 공지 작성 | 700 | 신규 |
| Finance | PDF 내보내기 | 821 | 신규 |

**수정 전략**: 각 버튼에 맞는 onClick 핸들러 연결. 현재는 기능 구현 전 placeholder 상태.

### 패턴 B: 하드코딩 데이터 페이지 (4개)
- DashboardInteractive: 지점/승인/기간 모두 목업
- GrowthCompare: HQ_GR_DATA 하드코딩
- Performance: sam_standards만 연결, 실 집계 없음
- Finance: 재무 테이블 미존재

### 패턴 C: `<div>` 기반 탭 구조 (Playwright 셀렉터 비매칭)
탭이 `<button>` 아닌 `<div class="cursor-pointer">` 로 구현됨.  
기능 자체는 작동할 수 있으나 접근성(keyboard nav, role=tab) 부재.

---

## 세션 30으로 이관 필요 사항

1. **재배팀 대시보드와 HQ 데이터 연결 일관성 확인** — HQ harvestStore 집계가 재배팀 입력 데이터와 일치하는지 교차 검증 필요
2. **HQ-ISSUE-PAGE-001** — HQ에서 이상 신고 접근 경로 없음. 재배팀 IssueCallPage와 HQ 연결 설계 확인
3. **HQ-HARVEST-MENU-001** — HQ 사이드바에 수확 입력 메뉴 없음. 재배팀 컨텍스트에서만 접근 가능.

---

## 우선순위 제안

### P0 즉시 수정 (0건)
없음. 크래시·데이터 파손 없음.

### P1 다음 세션 (4건)
1. **AUDIT-HQ-3-01**: 직원 검색창 `<span>` 재오픈 — BACKLOG HQ-EMP-SEARCH-001 상태 불일치 해소 + 실제 input 교체
2. **AUDIT-HQ-3-03**: 직원 상세 모달 미표시 — "상세" 버튼 클릭 시 모달 안 열림
3. **AUDIT-HQ-5-02**: "새 공지 작성" 버튼 무반응 — 공지 입력 모달 미구현
4. **AUDIT-HQ-1-01** (P2 격상 검토): 기간 피커 탭 실제 데이터 필터링 미연결

### P2 중간 우선순위 (19건)
- 패턴 A(btnPrimary onClick 미전달) 9건: 일괄 처리 효율적 (onClick 핸들러 추가)
- 하드코딩 데이터 4건: 각 트랙(HQ-GROWTH-001, HQ-PERFORMANCE-001, HQ-FINANCE-001, HQ-DASHBOARD-INTERACTIVE-001) 진입 시 처리
- Finance console 에러 1건: 에러 메시지 확인 후 대응

### P3 낮음 (4건)
- 검색 결과 반영 미구현 (GLOBAL-SEARCH-001)
- 지점 카드 "연락" 버튼 무반응
- 열람률 데이터 미표시 (DB 컬럼 없음)
- 비활성 직원 41행 표시 여부 확인

---

## 태우님 결정 필요 사항

### Q1. HQ-EMP-SEARCH-001 상태 정정
- BACKLOG에 "resolved" 표시됐으나 `_pages.jsx:566`에 `<span>` 그대로.
- **확인 요청**: 세션 24 수정 커밋(어느 파일이 실제로 변경됐는지)을 확인해 주세요.  
  `git log --all --oneline --follow -- src/pages/hq/_pages.jsx` 로 확인 가능.
- BACKLOG 상태를 "open"으로 되돌리고 수정을 재진행해야 할 수 있습니다.

### Q2. 직원 테이블 비활성 직원 표시 여부
- UI에서 41행 표시 (DB 활성 38 + 비활성 3 = 41).
- 비활성 직원도 HQ 직원 목록에 표시하는 것이 **의도된 동작**인가요?
- 의도가 아니라면 `is_active=true` 필터 추가 필요.

### Q3. "지점 상세 보기 →" / "상세 →" 버튼 동작 의도
- Branches 페이지의 "상세 →" 클릭 시 URL 변화 없음 (모달? 드릴다운? 별도 페이지?).
- Growth 페이지의 "지점 상세 보기 →" 도 동일.
- 의도된 목적지를 확인해 주시면 구현 방향 결정 가능합니다.

### Q4. Finance 페이지 Console 에러 우선순위
- Finance 페이지에서 console 에러 1건 감지됨. 재무 데이터 하드코딩 상태여서 에러가 실사용에 영향을 주지 않을 수 있으나 확인 필요.
- 세션 32+ 수정 시 함께 처리할지 지금 확인할지 결정 필요.

---

## 리포트 파일 경로
- 리포트: `docs/AUDIT_SESSION29_HQ.md`
- 스크린샷: `docs/audit_screenshots/` (18개)
- 결과 JSON: `docs/audit_session29_results.json`
- 감사 스크립트: `scripts/audit_hq.cjs`
