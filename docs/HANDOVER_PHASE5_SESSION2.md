# Phase 5 세션 2 인수인계 — 2026-04-11

> 부채는 [docs/BACKLOG.md](BACKLOG.md), 교훈은 [docs/LESSONS_LEARNED.md](LESSONS_LEARNED.md)에 누적 관리됨.

## 1. 개요

이 문서는 Phase 5 세션 2 (GREF FarmWork 트랙 E — E-7 반장 토글 UI, E-8 관리자 확장 +
Excel + TBM 현황 재설계) 작업 종료 시점의 인수인계 문서입니다.
다음 세션에서 이 문서만 보고 트랙 E 마무리 또는 트랙 F 진입이 가능하도록 작성됐습니다.

**Phase 5 세션 2 범위:** E-7 (반장 토글 UI) + E-8 (관리자 대시보드 TBM 지표,
Excel 내보내기, SafetyChecksPage 전면 재설계). 트랙 E 기능 구현 **14/14 완료.**
E-6.5 FCM은 RLS-DEBT-020 블로커로 인해 백로그 유지.

**진행 방식:** claude.ai 웹 세션(설계/지시문) + Claude Code 로컬(구현/빌드/커밋)
+ 태우(UI 검증/설계 피드백) 3자 협업.

**마지막 커밋:** `d37838a` (교훈 14 추가)

---

## 2. 환경 변화

| 항목 | Phase 5 세션 1 | Phase 5 세션 2 |
|---|---|---|
| Supabase MCP | 세션 종료 직전 도입 | 본격 활용 — 사전 조사·RLS 논리 분석·쿼리 검증에 적극 사용 |
| BACKLOG.md / LESSONS_LEARNED.md | 세션 1 종료 직후 신설 | 세션 2에서 갱신 운영 (POSTGREST-001 상태 업데이트, 교훈 13·14 추가) |
| CLAUDE.md 세션 시작 절차 | 추가됨 | 이번 세션에서 효과 입증 — E-8.0 사전 조사 단계가 자동 실행되어 C안(스키마 확장 필요) 조기 판별 |
| mount 검증 | 미실시 | 교훈 13 발생으로 의무화. 다음 세션부터 빌드 통과 후 대상 페이지 직접 진입 확인 필수 |

---

## 3. 완료 커밋 표

### E-7 — 반장 토글 UI

| 커밋 | 단계 | 내용 |
|---|---|---|
| `9e377a9` | E-7.0 | `employeeStore.toggleTeamLeader` — 낙관적 업데이트 + 실패 시 롤백 |
| `f862865` | E-7.1 | EmployeesPage 토글 UI — 모바일 카드 + 데스크탑 테이블 컬럼 |
| `6479dd9` | E-7.2 | 마지막 반장 해제 확인 모달 — TBM 승인 불가 안내 포함 |

**E-7.1 기존 확인:** TopBar.jsx 지점 셀렉터 이미 존재 → 신규 코드 0.

### E-8 — 관리자 확장

| 커밋 | 단계 | 내용 |
|---|---|---|
| `3829f46` | E-8.2 | AdminDashboard TBM 지표 카드 4개 (승인·미승인·작업자·반장) |
| `9fc3553` | E-8.3 | xlsx 의존성 설치 + Excel 내보내기 초기 구현 (AdminDashboard 위치) |
| `ab17667` | hotfix | `branches` selector 누락 ReferenceError 복구 (E-8.2 직후) |
| `da216b9` | E-8.4 | check_type 컨벤션 통일 `pre_work`→`pre_task`, `post_work`→`post_task` |
| `2fbcc13` | E-8.5 | `safetyCheckStore.fetchByDate` — `status` 컬럼 추가, FK 제약명 명시 |
| `58a2254` | E-8.6 | SafetyChecksPage 전면 재설계 — 지점별 카드 + attendance 출근자 분모 |
| `3803cb7` | E-8.7 | Excel 내보내기 SafetyChecksPage로 이동 + 근태상태 컬럼 추가 |
| `d37838a` | docs | 교훈 14 추가 |

**E-8.1 기존 확인:** TopBar 지점 셀렉터 재사용 → 신규 코드 0.

---

## 4. 이번 세션의 결정적 발견 ⚠️

### 발견 1 — SafetyChecksPage가 출시 이후 줄곧 작동하지 않았음

**증상:** 페이지가 항상 `0/13` 표시. 실데이터 입력 후에도 변화 없음.

**원인:** 작업자 측 저장 (`pre_task`) 과 관리자 측 조회 (`pre_work`) 컨벤션 불일치.
트랙 E 이전에 작성된 코드의 잠재 버그. 부산LAB 실운영 시작 후에도 발견되지 않음.

**조치:** E-8.4 (`da216b9`) 에서 `SafetyChecksPage.jsx` 6곳,
`SafetyCheckBottomSheet.jsx` dead branch 1곳 일괄 수정.

**파급:** 교훈 14 신설 — "의미 없는 0과 데이터 0의 구분". → [`docs/LESSONS_LEARNED.md`](LESSONS_LEARNED.md)

---

### 발견 2 — 빌드 통과 ≠ 런타임 안전

**증상:** E-8.2 빌드 성공·푸시 후 `/admin` (대시보드) mount 시 `ReferenceError: branches is not defined` 로 페이지 전체 렌더 실패.

**원인:** `useBranchStore(s => s.branches)` selector 호출 1줄 누락. Vite/esbuild는
함수 스코프 내 미정의 식별자를 빌드 시점에 감지하지 못함.

**조치:** `ab17667` 핫픽스. 교훈 13 신설. → [`docs/LESSONS_LEARNED.md`](LESSONS_LEARNED.md)

**시사점:** MCP 도입으로 DB 검증은 강해졌으나 프론트엔드 런타임 검증이
비대칭으로 약해짐. 다음 세션부터 모든 컴포넌트 수정 후 해당 페이지 mount 검증 필수.

---

## 5. 신규 부채·교훈 요약 (본문은 누적 대장 참조)

**이번 세션 BACKLOG.md 변경:**

| ID | 변경 내용 |
|---|---|
| POSTGREST-001 | `open` → `in-progress` — `safetyCheckStore.fetchByDate`에서 추가 발견·수정(E-8.5). 타 스토어 잔존 검토 필요. |

**이번 세션 LESSONS_LEARNED.md 추가:**

| 번호 | 제목 |
|---|---|
| 교훈 13 | 빌드 통과는 런타임 안전을 의미하지 않는다 |
| 교훈 14 | 의미 없는 0과 데이터 0을 구분하라 |

---

## 6. 트랙 E 종료 상태

```
트랙 E — TBM 시스템 고도화                          14/14 완료 (E-6.5 백로그 제외)
│
├── ✅ E-1    TBM v2 스키마
├── ✅ E-2    위험 템플릿 32건 시드
├── ✅ E-3    safetyCheckStore 확장 + cropIds 지원
├── ✅ E-4    WorkerHome TBM 인터셉트 제거
├── ✅ E-5a   SafetyCheckBottomSheet 2단계
├── ✅ E-5b   WorkerTasksPage TBM 인터셉트
├── ✅ E-5c   anon self-update 정책 + 방어
├── ✅ E-6.0  BUG-005 authStore select 보강
├── ✅ E-6.1  RLS-DEBT-018 farm_admin 정책 보강
├── ✅ E-6.2  permissions 헬퍼 + 스토어 가드
├── ✅ E-6.3/6.4  반장 승인 카드 + 하드 게이트
├── ✅ E-6 hotfix  FK 명시 + JS branch 필터
├── ✅ E-7    EmployeesPage 반장 토글 UI
├── ✅ E-8    관리자 TBM 지표 + Excel + SafetyChecksPage 재설계
└── 📋 E-6.5  FCM 반장 알림 (RLS-DEBT-020 블로커 — 백로그)
```

**잔존 부채 (BACKLOG.md 참조):**

| ID | 내용 | 블로커 여부 |
|---|---|---|
| RLS-DEBT-019 | `safety_checks_anon_select` 지점 격리 누락 | - |
| RLS-DEBT-020 | `fcm_tokens` INSERT 정책 누락 | **E-6.5 블로커** |
| POSTGREST-001 | 타 스토어 FK 모호성 잔존 검토 | - |

---

## 7. 확정 로드맵 (태우 결정 2026-04-11)

### 트랙 E 마무리 묶음 (다음 세션 권장 시작점)

| 작업 | 선행 조건 |
|---|---|
| RLS-DEBT-020 해소 (`fcm_tokens` INSERT 정책 추가) | 없음 — 먼저 처리 |
| E-6.5 FCM 반장 알림 | RLS-DEBT-020 해소 후 |
| RLS-DEBT-019 해소 (`anon_select` 정책 narrowing) | E-6.5 이후 (작업자 화면 영향 검증 필요) |
| POSTGREST-001 전수 검토 (`employees` JOIN grep) | 없음 — 병행 가능 |

### 트랙 F — 일용직·시급제 분리 (우선순위 높음)

현재 탭 존재, 기능 미구현. 부산LAB 실운영 중 임금 계산 미가동 → 운영 손실 직결.
진입 전 태우와 도메인 노트(시급 계산·일별 근태·임금 산정 방식) 정리 필요.

### 트랙 G — 포장 업무 관리

빈 탭 5개 (포장 작업 지시·실적·출하처 관리 등). 트랙 통째로 진입 예정.

### 트랙 H — 인앱 챗봇 v1 (조회 + 건의 취합)

조회 전용, 데이터 변경 없음. Claude API 또는 Gemini API.
권한 모델·API 비용·환각 책임 사전 정리 필요. 진입 전 별도 설계 세션 필요.

### 훗날 — UI 가이드라인 전역 정비

트랙 F·G 완료 후 일괄 처리. `docs/UI_GUIDELINES.md` 신설 예정.

### 보류 — 챗봇 v2 (액션형)

트랙 H 안정 운영 후 별도 의사결정.
환각 위험으로 임금·근태·산안법 데이터 손상 가능성 → 즉시 진입 금지.

---

## 8. 다음 세션 시작 가이드

### 진입 조건 (CLAUDE.md 절차)

```bash
git pull origin main
git log --oneline -5
# 기대: 최신 d37838a "docs: 교훈 14 추가"
```

- `docs/BACKLOG.md` 전체 읽기 — RLS-DEBT-019/020, POSTGREST-001 상태 확인
- `docs/LESSONS_LEARNED.md` 전체 읽기 — 특히 **교훈 13(mount 검증)**, **교훈 14(0의 의미)** 주의

### E-6.5 진입 전 사전 확인 (MCP)

```sql
-- fcm_tokens 테이블 스키마 확인
SELECT column_name, data_type FROM information_schema.columns
WHERE table_name = 'fcm_tokens' ORDER BY ordinal_position;

-- fcm_tokens RLS 정책 확인
SELECT policyname, cmd, roles FROM pg_policies
WHERE tablename = 'fcm_tokens';
```

RLS-DEBT-020 해소 없이 E-6.5 진입 금지.

### POSTGREST-001 전수 검토 명령

```bash
grep -rn "employees:" src/stores/ src/pages/ --include="*.js" --include="*.jsx"
grep -rn "employees(" src/stores/ src/pages/ --include="*.js" --include="*.jsx"
```

FK 제약명 미명시 패턴 발견 시 E-8.5와 동일한 방식으로 수정 (`employees!constraint_name`).

### RLS-DEBT-019 해소 주의사항

`safety_checks_anon_select` 정책을 narrowing하면 작업자 PWA에서 자기 TBM 기록
조회가 차단될 수 있음. 정책 변경 전후로 작업자 화면 mount 검증 필수 (교훈 13).
**모바일 또는 시크릿 창에서 검증** (교훈 10 — sb 토큰 잔존 주의).

---

## 9. 작업 환경

| 항목 | 값 |
|---|---|
| 로컬 경로 | `C:\Users\User\Desktop\gref-farmwork` (단일 PC, Windows) |
| 브랜치 | `main` 단독 작업, 커밋 후 즉시 push |
| 스택 | React 18 + Vite + Supabase + Tailwind + Zustand + xlsx |
| Supabase MCP | read-only 연결됨, project-ref 스코프 |
| 검증 분담 | Claude Code = DB·RLS·로직(MCP) / 태우 = UI mount·실기기 |
| Git user | `greftukim` |

---

## 10. 통계

| 항목 | 값 |
|---|---|
| Phase 5 세션 2 구현 커밋 | 8개 (E-7.0 ~ E-8.7) |
| 문서 커밋 | 2개 (교훈 13·14) |
| 핫픽스 | 1건 (`ab17667` — branches selector 누락) |
| 신규 의존성 | `xlsx@0.18.5` |
| 해결 부채 | 2건 (BUG-005는 세션 1, 이번 세션은 pre_work 컨벤션 버그 + fetchByDate status 누락) |
| 신규 교훈 | 2건 (교훈 13·14) |
| 트랙 E 진행률 | **14/14 완료 (E-6.5 백로그 제외)** |
