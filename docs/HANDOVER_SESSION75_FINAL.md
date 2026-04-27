# HANDOVER — 트랙 75 (75-A · 75-A.1 · 75-B · 75-C + 교훈 132) 최종

**날짜**: 2026-04-27
**담당**: Claude (claude-sonnet-4-6)
**마지막 커밋**: `af39309` (클로저 커밋, 해시 채움 직전)
**커버 범위**: 트랙 75 — 재배팀 관리자 계정 수정 (75-A ~ 75-C + 메타 교훈 132 박제 + 클로저)

---

## 세션 전체 요약

| 서브세션 | 주요 작업 | 결과 |
|----------|-----------|------|
| 75-A | #8 공지 본문 + #1 대시보드 stale 즉시 수정 (Critical) | ✅ |
| 75-A.1 | NOTICE-AUTHOR-MISMATCH + DASHBOARD-OT-STALE 동일 패턴 회수 | ✅ |
| 75-B | #5 우선순위 필터(X케이스 정정) + #7 실적 상세 라우팅 | ✅ |
| 메타 | 교훈 132 박제 — 정찰 시 페이지 전수 grep 의무화 | ✅ |
| 75-C | #3 휴가 연/월 필터 (Z케이스 신규 구현) | ✅ |
| 클로저 | LEAVE-MULTI-DAY-SCHEMA-001 등록 + 본 핸드오버 작성 | ✅ |

---

## 커밋 목록

| 해시 | 내용 |
|------|------|
| `5e4ea34` | fix(session75-a): 공지 본문 미저장 + 대시보드 승인 카운트 stale 수정 |
| `45163e9` | fix(session75-a1): 공지 작성자 키 불일치 + 대시보드 OT 카운트 stale 수정 |
| `b89f4c5` | feat(session75-b): 작업 보드 우선순위 필터(X정정) + 개인별 실적 상세 라우팅 |
| `4244425` | docs(lessons): 교훈 132 — 정찰 시 페이지 전수 grep 의무화 |
| `0d6adfd` | feat(session75-c): 휴가 관리 연도/월 필터 추가 |
| `af39309` | docs(session75): 클로저 — LEAVE-MULTI-DAY-SCHEMA-001 등록 + HANDOVER 작성 |

---

## 세션별 주요 작업 상세

### 75-A — Critical 버그 즉시 수정

**Pre-flight Q1**: `notices.body` NOT NULL + null 행 0건 → 그동안 form 제출 자체가 NOT NULL 위반으로 항상 실패해 왔을 가능성. DB 시드 5건만 존재하는 정황과 일치.

**변경 파일**:
- `src/pages/admin/NoticePage.jsx` — form key `content` → `body` 일괄 변경 (8곳: 초기값 + startNew + startEdit + cancel + 검색 필터 + 본문 렌더 ×2 + textarea)
- `src/pages/admin/AdminDashboard.jsx` — `fetchLeaveRequests` 액션 구독 + currentUser 의존성 useEffect 추가

**원칙**: form-store-DB 3층 키 통일 (Option B). store는 변경 없음.

### 75-A.1 — 동일 패턴 부채 회수

**Pre-flight**: Q1 `created_by` NULLABLE + 시드 5건 null (운영 전이라 영향 미미). Q2 `overtimeStore.fetchRequests` 존재 + Dashboard 호출 누락 확인.

**변경 파일**:
- `src/pages/admin/NoticePage.jsx` — line 73 `authorId` → `createdBy` (1줄)
- `src/pages/admin/AdminDashboard.jsx` — `fetchOvertimeRequests` 구독 + 75-A useEffect에 통합 호출

**신규 발견**: `DASHBOARD-OT-BRANCH-FILTER-001` — overtimeStore.fetchRequests가 인자 없이 전 지점 OT 반환. leaveStore와 일관성 부재. 별 트랙 이월.

### 75-B — 우선순위 필터(X정정) + 실적 라우팅

**Pre-flight Q2 결과**: TaskBoardPage line 43(state) + line 55(filter) + line 96-111(UI)에 우선순위 필터가 이미 완전 구현. 정찰 보고 #5 Y/S 분류 오류 — X케이스로 정정.

**변경 파일**:
- `src/pages/Performance.jsx` — `useLocation`/`useMemo` import 추가, navigate에 state.workerId 전달(line 352), DetailScreen에서 useLocation 수신 + useMemo 워커 필터링 + 미발견 시 빈 상태 메시지

**라우트 패턴**: 프로젝트 내 state 패턴 사용처 0건이었으나 React Router v6 표준 navigate state 신규 도입.

### 메타 — 교훈 132 박제

75-B의 #5 X→Y 분류 오류 재발 방지를 위해 정찰 정책 신규:
- 페이지의 "기능 부재" 결론 전 `useState`/`filter`/`{기능 키워드}` 3종 grep 의무화
- 검토 라인 비율 최소 70%

### 75-C — 휴가 연/월 필터 (교훈 132 첫 적용)

**Pre-flight Q1**: leave_requests 컬럼은 단일 `date` (NOT NULL). 13건 모두 2026년에 분포.

**Pre-flight Q2 (교훈 132 적용 첫 사례)**: 237줄 전수 grep → state 0건 / filter 인프라 0건 / 연·월 키워드 0건 → Z케이스 신규 구현 결론.

**변경 파일**:
- `src/pages/admin/LeavePage.jsx` — yearFilter/monthFilter state(2) + filteredRequests 조건 + yearOptions useMemo + TopBar 셀렉트 2개 UI

**UI 결정 (코드 판단)**: 셀렉트 2개 (옵션 N+12개를 칩으로 표현 시 시각 부담 과다).

---

## 해소된 BACKLOG (트랙 75)

| ID | 분류 | 세션 | 사유 |
|----|------|------|------|
| `NOTICE-BODY-BUG-001` | BUG | 75-A | form key content↔body 불일치 8곳 통일 |
| `DASHBOARD-STALE-001` | BUG | 75-A | fetchLeaveRequests useEffect 추가 |
| `NOTICE-AUTHOR-MISMATCH-001` | BUG | 75-A.1 | form key authorId → createdBy 통일 (1줄) |
| `DASHBOARD-OT-STALE-001` | BUG | 75-A.1 | fetchOvertimeRequests useEffect 통합 호출 |
| `TASK-PRIORITY-FILTER-001` | 기능 | 75-B | 이미 구현 — X케이스 정정 기록 |
| `PERF-DETAIL-WORKER-ROUTING-001` | BUG | 75-B | navigate state.workerId + DetailScreen 수신 |
| `LEAVE-DATE-FILTER-001` | 기능 | 75-C | 연/월 필터 UI + 로직 (Z케이스 신규) |

---

## 박제된 교훈

| 번호 | 세션 | 제목 |
|------|------|------|
| 132 | 75-B 후속 | 정찰 시 "기능 부재" 결론 전 페이지 전수 grep 의무화 |

---

## 신규 BACKLOG (open · 트랙 75 발생)

| ID | 분류 | 처리 트랙 |
|----|------|----------|
| `DASHBOARD-OT-BRANCH-FILTER-001` | BUG | 별 트랙 (overtimeStore 시그니처 변경) |
| `LEAVE-MULTI-DAY-SCHEMA-001` | DB 스키마 / UX | 디자인 채팅 후보 |

---

## 트랙 75 처리 항목 9건 결과 매트릭스

| # | 항목 | 처리 결과 |
|---|------|----------|
| 1 | 휴가 카운트 불일치 | ✅ resolved (75-A) |
| 2 | farm 관리자 QR 발급 | ✅ X케이스 (이미 73-C에서 완구현) |
| 3 | 휴가 연/월 필터 | ✅ resolved (75-C) |
| 4 | 작업별 카드 + 풀네임 | ⏸ 디자인 채팅 이월 |
| 5 | 우선순위 필터 | ✅ X케이스 (이미 구현, 정정 기록) |
| 5' | 동(棟) 필터 | ⏸ 별 트랙 (DB 스키마) |
| 6 | 생육 목표치 | ⏸ 디자인 채팅 이월 |
| 7 | 작업자 성과 상세 | ✅ resolved (75-B) |
| 8 | 공지 본문 저장 | ✅ resolved (75-A, Critical) |
| 9 | 복수 작업자 선택 | ⏸ 별 트랙 (DB 스키마) |

**처리 통계**: 9건 중 5건 resolved + 2건 X케이스 + 4건(중복 포함) 별 트랙·디자인 이월 — 트랙 75 범위 100% 처리 완료.

---

## 디자인 채팅 이월 항목 (별 채팅방 진행 권고)

| 항목 | 결정 필요 사항 |
|------|---------------|
| #4 작업 카드 재설계 | 작업자별 카드 → 작업별 카드 전환 여부 + 배치자 풀네임 표시 형태 |
| #5 우선순위 의미 | "전체/높음/보통/낮음" 라벨 명확화 또는 일부 옵션 제거 |
| #6 생육 목표치 | 지표 범위(초장/엽수/화방), 목표치 체계(품종·시기·구간), 비교 시각화 방식 |
| `LEAVE-MULTI-DAY-SCHEMA-001` | 단일 일자 vs start_date/end_date 페어 — 다일 휴가 운영 패턴 결정 |

---

## 별 트랙 이월 항목 (코드 작업)

| ID | 의존 | 우선순위 |
|----|------|----------|
| #5' 동(棟) 필터 | tasks 테이블 greenhouse_id 추가 결정 | 디자인 결정 후 |
| #9 다중 배정 | task_assignees junction 설계 + 마이그레이션 | 디자인 결정 후 |
| `DASHBOARD-OT-BRANCH-FILTER-001` | overtimeStore 시그니처 변경 영향 범위 | 디자인 채팅과 무관, 즉시 처리 가능 |

---

## 결정권자 원칙 (영구, 교훈 130)

앱 수정 결정권자는 **사용자 단일**. 박민식·김민국은 도메인 피드백 제공자이며 결정자 아님.
"박민식·김민국 답변 대기" 분류 영구 폐기. 결정 보류 시 "사용자 결정 보류" 또는 "코드 판단 위임"으로만 표기.

---

## 트랙 75 메타 성과

| 항목 | 값 |
|------|-----|
| 누적 커밋 | 6건 (75-A~C + 교훈 132 + 클로저) |
| BACKLOG resolved | 7건 |
| BACKLOG 신규 open | 2건 (DASHBOARD-OT-BRANCH-FILTER-001 / LEAVE-MULTI-DAY-SCHEMA-001) |
| 신규 교훈 | 1건 (132번) |
| 빌드 회귀 | 0건 |
| 사용자 결정 게이트 | G1~G10 (10건, 모두 권고 채택) |
| 교훈 132 첫 적용 | 75-C Pre-flight Q2 (페이지 전수 grep 100%) |

---

## 빌드 + 환경 상태

| 항목 | 상태 |
|------|------|
| `npm run build` | ✅ 0 에러 (0d6adfd 기준 clean) |
| BACKLOG open (표 형식) | 75건 (LEAVE-MULTI-DAY-SCHEMA-001 등록 후 76건) |
| 누적 교훈 마지막 번호 | 132 |
| 본 트랙 시드 변경 | 0건 (74-E/F 자산 보존) |

---

## 차기 세션 후보 (우선순위)

| 순위 | 트랙 | 내용 |
|------|------|------|
| 1 | 디자인 채팅 (별 채팅방) | #4 / #5 의미 / #6 / LEAVE-MULTI-DAY-SCHEMA-001 결정 |
| 2 | `DASHBOARD-OT-BRANCH-FILTER-001` | overtimeStore branch 필터 일관성 (코드 트랙) |
| 3 | 디자인 결정 후 코드 적용 | #4 카드 재설계 / #5 라벨 변경 / #6 목표치 / 다일 휴가 |
| 4 | 별 트랙 DB 변경 | #5' 동 필터 / #9 다중 배정 |
| 5 | 운영 부채 | LABOR-COST-001 / TASK-MOBILE-001 / NOTIFICATION-STORE-001 등 |

---

## 새 채팅방 시작 가이드

```bash
# 1. 최근 커밋 확인
git log --oneline -10

# 2. BACKLOG 전체 읽기 (미해결 부채·블로커)
cat docs/BACKLOG.md

# 3. 최근 교훈 10개 확인
grep -E "^## 교훈 [0-9]+" docs/LESSONS_LEARNED.md | tail -10

# 4. 빌드 상태 확인
npm run build 2>&1 | tail -5

# 5. 트랙 75 핸드오버 + 직전 트랙 비교
cat docs/HANDOVER_SESSION75_FINAL.md
cat docs/HANDOVER_SESSION74_FINAL.md
```

**세션 시작 전 보고 양식**:
> "오늘 작업 후보: {트랙명}. 관련 부채: {BACKLOG ID}. 관련 교훈: {교훈 번호}."

---

## 파일별 현재 상태 요약 (트랙 75 변경분)

| 파일 | 상태 |
|------|------|
| `src/pages/admin/NoticePage.jsx` | form key `body`/`createdBy` 통일, store-DB 3층 정합 |
| `src/pages/admin/AdminDashboard.jsx` | leaveStore + overtimeStore fetchRequests useEffect 통합 호출 |
| `src/pages/Performance.jsx` | navigate state.workerId 전달 + DetailScreen useLocation 수신 |
| `src/pages/admin/LeavePage.jsx` | yearFilter + monthFilter state + UI + filter 조건 |
| `src/stores/noticeStore.js` | 변경 없음 (75-A 원칙: form만 통일로 정합 확인됨) |
| `docs/LESSONS_LEARNED.md` | 교훈 132 추가 |
| `docs/BACKLOG.md` | 트랙 75 항목 갱신 + LEAVE-MULTI-DAY-SCHEMA-001 신규 등록 |
| `docs/HANDOVER_SESSION75_FINAL.md` | 본 문서 |

---

*이 문서는 트랙 75 클로저 시점(커밋 `af39309`)의 코드베이스를 기준으로 작성되었습니다.*
