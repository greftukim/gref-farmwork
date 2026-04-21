# GREF FarmWork — 세션 교훈 누적 대장

각 세션에서 얻은 교훈을 번호 순서로 누적 관리한다.
신규 교훈은 핸드오버 문서에 서술한 뒤 이 파일에도 등록한다.

---

## 교훈 1 — 스키마 조사를 db-schema.md에 의존하지 말 것

**맥락:** Phase 2 (2026-04-09), growth_surveys 확장 마이그레이션 작업.

**잘못된 접근:** db-schema.md 기준으로 마이그레이션(20260409140000) 작성 → 적용.
이후 코드 조사 중 `measurements` JSONB 컬럼이 이미 존재하고 활발히 사용 중임을 발견
→ 롤백 + git reset.

**올바른 접근:** 마이그레이션 작성 전 해당 테이블의 현재 스키마를 **DB에서 직접 확인**.
`information_schema.columns` 조회. db-schema.md는 실제 DB보다 낡았을 수 있음.

**재발 방지:**
- [ ] 마이그레이션 작성 전 `SELECT column_name FROM information_schema.columns WHERE table_name = '...'` 실행
- [ ] db-schema.md는 참조용으로만 — 실측 대체 불가

**관련 커밋:** 롤백됨 (커밋 없음)

---

## 교훈 2 — 기능 추가 전 grep 필수

**맥락:** Phase 2 (2026-04-09), growth_surveys 확장 (교훈 1과 동일 사건).

**잘못된 접근:** 엑셀 양식에서 항목 뽑아 9개 컬럼을 새로 추가했으나, 기존
`measurements` JSONB + `growth_survey_items` 마스터 테이블 기반의 동적 측정값
시스템이 이미 존재했음.

**올바른 접근:** 새 컬럼/테이블 추가 전 `grep -rn "<핵심 키워드>"` 실행. 특히
기존 stores/pages에서 비슷한 목적의 코드가 있는지 확인.

**재발 방지:**
- [ ] 신규 컬럼/테이블 설계 전 핵심 키워드로 `grep -rn` 실행
- [ ] "이미 비슷한 기능/컬럼이 있는가?" 확인 후 설계 착수

**관련 커밋:** 롤백됨 (커밋 없음)

---

## 교훈 3 — Supabase TIME 타입 주의

**맥락:** Phase 2 (2026-04-09), B-2 핫픽스 (ProxyCheckInModal prefill 버그).

**잘못된 접근:** Supabase의 `TIME` 컬럼 반환값(`'HH:MM:SS'`)을 HTML
`<input type="time">`에 직접 prefill → Date 생성 실패 → `RangeError: Invalid time value`.

**올바른 접근:** Supabase 타입별 JavaScript 반환 형식을 설계 단계에서 확인.
지시문에 타입 변환 이슈를 명시. time input과 관련해서는 항상
`String(value).slice(0, 5)` 방어.

**재발 방지:**
- [ ] Supabase `TIME` 컬럼 사용 시 반환 형식(`'HH:MM:SS'`) 인지
- [ ] `<input type="time">` prefill 전 `.slice(0, 5)` 정규화 적용
- [ ] Date 생성 전 `.slice(0, 5)` 이중 방어

**관련 커밋:** B-2 핫픽스 (해시 미기록 — 2026-04-09 핸드오버 참조)

---

## 교훈 4 — 스코프 통제의 어려움

**맥락:** Phase 2 (2026-04-09), 트랙 A/B 마무리 중 요청 연쇄 확장.

**잘못된 접근:** 세션 중 요청이 연속으로 들어올 때 비선형적으로 스코프 확장.
"tasks 시드" → "growth_surveys 시드" → "스키마 확장" → "생육조사 그래프" →
"TBM 안전점검"으로 꼬리를 물었고, 중간에 롤백 1회 + 재협의 + 축소 결정.

**올바른 접근:**
- 세션 초반에 스코프를 명시하고 새 요청은 인수인계 문서에 기록하는 습관
- "꼬리 물기"가 시작되면 한 번 멈추고 현재 범위 재확인
- 요청이 들어올 때 "이건 이번 세션인가, 다음 세션인가?" 먼저 질문

**재발 방지:**
- [ ] 세션 시작 시 작업 범위 명시적 합의
- [ ] 새 요청 = 다음 세션 이관 여부 즉시 질문
- [ ] 꼬리 물기 감지 시 중단 → 현재 스코프 재확인 → 이관 결정

**관련 커밋:** 해당 없음

---

## 교훈 5 — Claude Code 출력이 잘리는 경우 대응

**맥락:** Phase 2 (2026-04-09), 트랙 A 작업 중 큰 파일 덤프 요청.

**잘못된 접근:** 큰 파일 내용을 통째로 덤프 요청 → 중간에 truncate되어 전체 내용
미수신.

**올바른 접근:** 큰 파일 덤프 요청 시 좁은 범위로 나누거나 view의 view_range 활용.
필요 시 반복 요청.

**재발 방지:**
- [ ] 큰 파일은 범위(offset, limit)를 지정해 읽기
- [ ] 잘림 발생 시 해당 범위 반복 요청

**관련 커밋:** 해당 없음

---

## 교훈 6~9 — 영구 소실 (Phase 5 세션 4 확인, 2026-04-11)

Phase 3~4 시기 어딘가에서 번호 발급됐으나 본문이 LESSONS_LEARNED.md에
정식 작성되지 못한 상태로 시간이 흘러 원문 영구 소실. 검증 경로:
- `git log -- docs/LESSONS_LEARNED.md`: 신설 커밋(f229453)부터 이미 미수록 상태
- 핸드오버 문서 전체(docs/handoff/, HANDOVER_PHASE5_SESSION1~3): 6~9 번호로 매겨진 교훈 없음
- Claude.ai Project 과거 대화 검색 2회: "교훈 6/7/8/9", "lesson 6~9" 모두 0건
- 단편 단서 1건: work_step3 Phase 1 마무리 "다음 Phase에서도 실제 코드 조사 먼저" — 번호 미부여, 어느 교훈인지 식별 불가

복원 시도 종료. 결번 처리. 번호 재배열은 하지 않음 (이미 다른 문서에서
교훈 N으로 인용된 것이 있을 수 있어 번호 변경 시 추적 비용 발생).

이 결번 사건은 교훈 22(교훈은 발견 즉시 LESSONS 파일에 박아라)의
계기가 됨.

---

## 교훈 10 — 인증 컨텍스트는 sb 토큰 존재로 결정

**맥락:** Phase 5 세션 1 (2026-04-11), E-6.0 검증 중 RLS 평가 역할 오해 발생.

**잘못된 접근:** PC localhost에서 RLS 검증 진행. `currentUser` 객체나 Zustand state가
없어도 `localStorage`에 잔존하는 `sb-{ref}-auth-token`이 있으면 Supabase가
`authenticated`로 평가 → 인증 컨텍스트를 잘못 판단.

**올바른 접근:** RLS 정책이 `anon`으로 평가될지 `authenticated`로 평가될지는
`localStorage`의 `sb-{ref}-auth-token` 존재 여부로 결정된다.
- 디바이스 토큰만 쓰는 작업자(`authUserId=null`) → `anon` role
- Supabase Auth 로그인 계정(farm_admin/hr_admin) → `authenticated` role
- 같은 PC에 둘이 공존하면 → `authenticated` 우선

**재발 방지:**
- [ ] RLS 검증은 모바일 또는 시크릿창에서 진행
- [ ] 또는 DevTools → Application → Local Storage에서 `sb-{ref}-auth-token` 명시적 삭제 후 진행
- [ ] PC에서 검증할 경우 잔존 토큰 여부를 먼저 확인

**관련 커밋:** `9b43521` (E-6.0 BUG-005)

---

## 교훈 11 — 산업안전 도메인 설계는 법령·업무 본질 우선

**맥락:** Phase 5 세션 1 (2026-04-11), E-6 반장 승인 플로우 설계 — 소프트 게이트
권장 → 태우 지적 → 하드 게이트로 rework.

**잘못된 접근:** 기술적 편의("반장 부재 시 현장 마비 회피")를 근거로 TBM 승인
게이트를 소프트 게이트(경고 배너)로 권장. 산업안전보건법상 요구사항을 과소평가.

**올바른 접근:** TBM은 작업 전 위험 인지·승인 절차이며 사후 승인은 기록 위조와
다름없음. 산업안전보건법상 안전점검은 작업 개시 전 완료가 원칙. 부산LAB 규모에서
반장 승인 지연은 분 단위 — "현장 마비"는 과장된 우려. 안전 도메인 설계 결정은
항상 규정 준수가 첫 기준.

**재발 방지:**
- [ ] 안전 도메인 설계 시 법령 요구사항 먼저 확인
- [ ] "기술적 편의" 논리로 안전 절차 게이트를 약화하는 방향 제안 금지
- [ ] 부산LAB 규모의 반장 부재는 분 단위 지연 — 현장 마비 시나리오 재검토 후 설계

**관련 커밋:** `7ef628e` (E-6.3/6.4 rework)

---

## 교훈 12 — Postgrest는 같은 테이블 다중 FK에서 명시적 disambiguation 필요

**맥락:** Phase 5 세션 1 (2026-04-11), E-6.3/6.4 rework 후
`safety_checks ↔ employees` 조회에서 FK 모호성 에러 발생.

**잘못된 접근:** `safety_checks`가 `employees`를 참조하는 FK 2개
(`worker_id_fkey`, `approved_by_fkey`) 보유 상태에서 `employees!inner` embed 사용
→ Postgrest 모호성 에러: `"more than one relationship was found"`.
nested 필터(`.eq('employees.branch', val)`)도 동일 영향.

**올바른 접근:** FK 제약명을 명시해 embed 모호성 해소.
nested 필터 대신 JS 레벨 필터링으로 대체.

```js
// 안전 패턴
.select('..., workers:employees!safety_checks_worker_id_fkey!inner(name, branch)')

// nested filter 대신 JS 레벨 필터
const filtered = (data || []).filter(c => c.workers?.branch === branch);
```

**재발 방지:**
- [ ] FK 모호성 발생 시 `select('*, employees!safety_checks_employee_id_fkey(*)')` 식으로 제약명 명시
- [ ] 동일 외부 테이블을 참조하는 FK가 2개 이상인 테이블에서 embed 사용 시 제약명 사전 확인
- [ ] nested 필터(`.eq('embed.col', val)`)는 FK 모호성 상황에서 동일 에러 유발 — JS 레벨 필터로 대체
- [ ] `information_schema.table_constraints`로 제약명 조회 후 embed 구문 작성

**관련 커밋:** `c9482f6` (E-6 hotfix)

---

## 교훈 13 — 빌드 통과는 런타임 안전을 의미하지 않는다

**맥락**: E-8.2(3829f46)에서 AdminDashboard에 currentBranchCode/currentBranchName
useMemo와 handleExport를 추가하면서 `branches` 식별자를 참조했으나,
useBranchStore의 branches selector 호출(`const branches = useBranchStore(s => s.branches)`)을
빠뜨림. npm run build는 통과했고 보고도 "빌드 성공"으로 마무리됐으나,
대시보드 첫 mount에서 ReferenceError로 페이지 전체 렌더 실패. 핫픽스 ab17667로 1줄 추가.

**잘못된 접근**:
- 빌드 통과를 검증 완료로 간주하고 푸시
- MCP로 SQL 쿼리는 실측했으나 컴포넌트 mount는 한 번도 확인하지 않음
- Zustand selector 패턴에서 useMemo/useEffect 본문을 먼저 작성하고 selector 선언을 누락

**올바른 접근**:
- Vite/esbuild는 함수 스코프 내 미정의 식별자를 빌드 시점에 잡지 못함 (런타임 결정)
- 새 식별자를 컴포넌트에 도입했으면 빌드 성공 외에 mount 검증이 별도로 필요
- MCP 도입으로 DB 검증은 강해졌으나 프론트엔드 런타임 검증은 그대로임. 이 비대칭을 의식할 것

**재발 방지 체크리스트**:
- [ ] 새 useMemo/useEffect/handler가 참조하는 모든 식별자가 컴포넌트 스코프에 선언돼 있는가?
- [ ] Zustand store에서 새 값을 쓰면 `const x = useStore(s => s.x)` 선언이 먼저 있는가?
- [ ] 빌드 통과 후, 수정한 컴포넌트가 실제로 라우트되는 페이지를 1회 진입해봤는가?
- [ ] 보고서에 "빌드 성공"만 적지 말고 "X 페이지 mount 확인"을 명시할 것
- [ ] MCP DB 검증과 프론트엔드 mount 검증은 별개의 검증 단계임을 의식

**관련 커밋**: 3829f46 (도입), ab17667 (핫픽스)

---

## 교훈 14 — 의미 없는 0과 데이터 0을 구분하라

**맥락**: SafetyChecksPage(/admin/safety-checks)가 배포 이후 줄곧 "0/13"을
표시했음. E-8 조사 중 발견 — 작업자 측 저장은 `pre_task`인데 관리자 조회는
`pre_work`로 필터링하고 있어 매칭되는 행이 0건. 페이지는 정상 렌더되고
숫자도 표시되지만 의미상 한 번도 작동한 적 없음. 부산LAB이 실운영 중이었음에도
아무도 "왜 항상 0이지?"라고 묻지 않음.

**잘못된 접근**:
- 빈 데이터를 자연스럽게 받아들임 ("아직 안 쓴 거겠지")
- mount 성공·렌더 정상·에러 없음을 작동의 증거로 간주
- 실데이터 입력과 화면 검증을 분리해 한 사이클로 묶지 않음

**올바른 접근**:
- 새 페이지 배포 후 첫 실데이터가 들어왔을 때 숫자가 0에서 양수로 변하는지
  반드시 한 번 확인할 것
- 0/N 같은 표시는 "데이터가 아직 없다"와 "쿼리가 잘못됐다" 둘 다일 수 있음.
  최소 1건의 실데이터로 양성 케이스 검증 후에야 페이지가 작동한다고 말할 수 있음
- 작업자/관리자처럼 양쪽이 같은 도메인 객체를 다루는 페이지는 enum·키·컨벤션을
  반드시 일치시킬 것. 한쪽은 저장, 다른 쪽은 조회 코드를 따로 짜면 안 됨

**재발 방지 체크리스트**:
- [ ] 새 페이지에서 카운트·집계가 0으로 표시될 때, 실데이터로 양수가 나오는지 1회 확인
- [ ] 양쪽 컴포넌트(저장/조회)가 같은 enum·키 상수를 공유하는지 확인 (가능하면 중앙 상수 파일)
- [ ] DB의 distinct 값과 코드의 리터럴 값을 한 번이라도 대조 (MCP로 30초)
- [ ] 운영 중 페이지에서 "항상 같은 값"이 나오면 데이터 부재가 아닌 버그를 의심

**관련 커밋**: da216b9 (수정), 그리고 SafetyChecksPage 최초 작성 커밋(트랙 E 이전)

---

## 교훈 15 — service_role MCP 쿼리는 RLS 우회, anon 정책 검증 시 SET LOCAL ROLE anon 필수

**맥락**: Phase 5 세션 3 (2026-04-11), RLS-DEBT-019 마이그레이션 검증 시도.
`SET LOCAL ROLE anon; SELECT ...` 방법을 MCP에서 실행하려 했으나
`ERROR: 42501: permission denied to set role "anon"` 발생.

**잘못된 접근**:
- MCP `execute_sql` 쿼리 결과를 "anon 시점의 데이터"로 오해
- service_role로 실행한 COUNT 결과가 정책 동작을 증명한다고 보고

**올바른 접근**:
- MCP는 service_role로 연결 — service_role은 RLS를 우회하므로 RLS 정책의 **동작**을 검증할 수 없음
- `pg_policy.polqual` 텍스트 확인(방법 B)은 정책 **정의** 검증으로만 유효
- anon 정책 **동작** 검증은 다음 중 하나 필요:
  - Supabase Dashboard API Tester (anon key 선택)
  - 실제 앱 시크릿 창 (sb 토큰 없는 상태)
  - 별도 anon key 직접 REST 호출

**보강 (2026-04-11 검증 후):** MCP service_role 연결에선 `SET LOCAL ROLE anon` 거부되지만,
Supabase Dashboard SQL Editor는 postgres 슈퍼유저로 실행되어 통과한다.
RLS 동작 검증 표준 패턴:
```sql
-- SQL Editor에서 실행
BEGIN;
SET LOCAL ROLE anon;
SELECT COUNT(*) FROM <table> WHERE <condition>;
COMMIT;
-- service_role 대조군은 MCP 또는 별도 쿼리로 분리 실행
```
anon vs service_role 카운트를 대조하면 정책 차단 여부를 직접 증명 가능.

**재발 방지**:
- [ ] RLS 정책 수정 후 동작 검증은 MCP COUNT로 하지 말 것 — service_role은 항상 통과
- [ ] polqual 텍스트 확인(방법 B)은 정책 **정의** 확인용, 동작 확인 아님
- [ ] anon 동작 검증 = SQL Editor(SET LOCAL ROLE anon) 또는 Dashboard API Tester 또는 시크릿 창
- [ ] service_role 대조군과 anon 결과를 함께 기록 — 같은 날짜에 차이가 나면 정책 작동 증명

**관련 커밋**: 6d92413 (RLS-DEBT-019 마이그레이션)

---

## 교훈 16 — 마이그레이션 파일에 자기검증 SQL을 끼우면 검증 코드 버그가 본 DDL을 롤백시킨다

**맥락**: Phase 5 세션 3 (2026-04-11), RLS-DEBT-019 마이그레이션.
DO 블록 내 `SELECT COUNT(*), pg_get_expr(...)` 에서 GROUP BY 누락으로
`ERROR 42803` 발생 → `BEGIN` 트랜잭션 전체 롤백 → `has_current_date=false` 원인.

**잘못된 접근**: 마이그레이션 파일 안에 DO 블록으로 자기검증 SQL을 포함.
검증 코드의 버그가 본 DDL(DROP/CREATE POLICY)까지 롤백시킴.

**올바른 접근**: 마이그레이션 파일은 DDL만 담는다. 검증은 항상 별도 SELECT로 분리.
마이그레이션은 멱등성과 단순성이 핵심 — 검증 로직이 들어오는 순간 단일 실패 지점이 두 개로 늘어난다.

**재발 방지**:
- [ ] 마이그레이션 파일에 SELECT/COUNT/DO 블록 금지 (COMMENT ON 제외)
- [ ] 검증 쿼리는 항상 마이그레이션 적용 후 별도 실행 (MCP 또는 SQL Editor)
- [ ] ASSERT가 필요하면 롤백 스크립트가 아닌 외부 문서(검증 기록 .md)에 기대값 명시

**관련 커밋**: 6d92413 (원본), fix 커밋 (DO 블록 제거)

---

## 교훈 17 — 정책 존재 확인은 정책 동작 확인이 아니다

**맥락**: Phase 5 세션 3 (2026-04-11). RLS-DEBT-020을 "MCP 실측으로 정책 존재 확인됨"을
근거로 resolved 처리했으나, 이후 fcm_tokens INSERT 403이 실제로 발생했다(최종 원인은
INFRA-001 PostgREST 타임아웃으로 판명됐지만, 정책 동작을 검증하지 않고 닫은 절차 자체가 문제).

**잘못된 접근**: polqual 텍스트 확인(정의 검증) = 동작 검증으로 혼동.
정책이 존재해도 실제 호출 환경(PostgREST anon, SQL Editor anon)에서 통과하는지는 별개.

**올바른 접근**: 정책 정의 검증과 동작 검증은 항상 분리된 두 단계.
정의 검증: `pg_policy.polqual` 텍스트 확인.
동작 검증: SQL Editor `SET LOCAL ROLE anon` 실제 INSERT 시도 + 성공 확인.

**재발 방지**:
- [ ] 정책 정의만으로 RLS-DEBT를 resolved 처리 금지
- [ ] resolved 처리 전 SQL Editor anon INSERT 시뮬레이션 1회 통과 필수
- [ ] BACKLOG 기록과 실제 DB 상태가 다를 수 있음 — 양쪽 모두 1차 자료로 취급

**관련 커밋**: 0d803a5 (RLS-DEBT-020 resolved 처리)

---

## 교훈 18 — 가설 점프 안티패턴

**맥락**: Phase 5 세션 3 (2026-04-11). fcm_tokens INSERT 403 디버깅에서 가설 6개를
연속 세우고 모두 탈락. 약 4시간 소진 후 세션 종료. 최종 원인은 PostgREST Warp
타임아웃(INFRA-001) — DB/정책과 무관한 인프라 레이어였음.

**탈락한 가설 6개 (재현 방지용):**

| # | 가설 | 검증 방법 | 탈락 근거 |
|---|---|---|---|
| 1 | RLS 정책 누락 | MCP pg_policy 조회 | 정책 6개 존재 확인 |
| 2 | RESTRICTIVE 정책 | polpermissive 컬럼 조회 | 전체 PERMISSIVE |
| 3 | 트리거 부수효과 | pg_trigger 조회 | 0건 |
| 4 | 컬럼 default 문제 | information_schema.columns | default 안전 |
| 5 | employee.role ≠ 'worker' | 실측 SELECT | role='worker' 확인 |
| 6 | EXISTS 중첩 RLS | SQL Editor anon 시뮬레이션 계획 | 실행 전 원인 발견 |

**진짜 원인**: PostgREST Warp 서버 `Thread killed by timeout manager`. HTTP 레이어
타임아웃이 42501(RLS 위반) 에러로 감싸져 반환됨. Dashboard Logs에서 확인.

**잘못된 접근**: 가설 탈락 → 즉시 새 가설 → 다음 진단 반복.
'왜 이전 가설이 틀렸는가'와 '아직 확인 안 한 영역이 무엇인가'를 정리하지 않은 채
같은 좁은 영역(DB 레이어)만 반복 순환.

**올바른 접근**: DB 진단이 모두 결백이면 레이어를 올려라. RLS 403 ≠ DB RLS 위반.
PostgREST, API 게이트웨이, 인프라 레이어도 가능한 원인.

**재발 방지**:
- [ ] 가설 3개 연속 탈락 시 강제 중단 → "확인된 사실 / 탈락 가설 / 미확인 영역" 표 작성
- [ ] 미확인 영역이 없으면 도구를 바꾼다 (MCP DB → Dashboard Logs → 외부 fetch)
- [ ] 동일 이슈 디버깅 90분 초과 시 세션 종료 검토
- [ ] 다음 세션이 같은 가설을 반복하지 않도록 탈락 가설 전수 기록 (이 교훈처럼)

**관련 커밋**: Phase 5 세션 3 전반

---

## 교훈 19 — RLS 403이 DB 진단 결백이면 PostgREST 인프라 로그를 먼저 확인하라

**맥락**: Phase 5 세션 3 (2026-04-11). `new row violates row-level security policy` 에러가
발생해 DB 레이어 진단을 4시간 진행했으나 전부 결백. 최종 원인은 Supabase PostgREST Warp
서버의 `Thread killed by timeout manager` — HTTP 레이어 타임아웃이 RLS 에러로 포장됨.

**올바른 진단 순서** (RLS 403 발생 시):

1. DB 정책 정의 확인 (pg_policy) — 5분
2. SQL Editor `SET LOCAL ROLE anon` 시뮬레이션 — 5분
3. **시뮬레이션 통과 → 즉시 Dashboard → Logs → Postgres Logs 확인**
   - `Warp server error`, `Thread killed`, `timeout` 키워드 검색
   - 발생 시각이 403 시각과 일치하면 인프라 이슈 확정
4. 인프라 이슈 → Pooler 크기 확인, 플랜 한도 검토, Support 티켓

**재발 방지**:
- [ ] `new row violates row-level security policy` + DB 진단 결백 조합이면 Logs 먼저
- [ ] PostgREST 재시작 로그(`Schema cache reload`)가 보이면 타임아웃 의심
- [ ] 인프라 이슈는 코드 수정으로 해결 불가 — 조치 방향이 완전히 다름

**관련 커밋**: Phase 5 세션 3, INFRA-001 백로그

---

## 교훈 20 — 누적 대장은 컨벤션 검증이 필요하다

**맥락**: Phase 5 세션 3 종료 시점에 BACKLOG.md에서 RLS-DEBT-021 ID가 두 번 등재되고
UX-007이 Phase 2 등록분(반차/휴가 통합)과 Phase 5 세션 3 등록분(알림 권한 denied)으로
서로 다른 의미의 두 항목이 같은 ID로 공존하는 상태가 발견됨. HANDOVER_PHASE5_SESSION3.md에는
"세션 3 종료 커밋"이 실제 해시(a9833fe)가 아닌 이전 커밋(2bde54e, 9446012)으로 잘못
기재되어 있었음. 누적 대장 신설 자체의 목적(단일 진실 공급원)이 위협받는 상황.

**잘못된 접근**:
- BACKLOG에 새 항목 append할 때 기존 ID 중복 확인 안 함
- HANDOVER 작성 시 해시를 수작업으로 옮겨 적으며 대조 검증 안 함
- 세션 종료 절차에 대장 무결성 검증 단계가 없음

**올바른 접근**:
- 누적 대장의 가치는 "고유 ID로 부채를 추적 가능하다"에 있음. ID 중복은 그 가치를
  즉시 훼손함
- 문서 인프라는 코드만큼 검증이 필요함. 세션 종료 시 자동 검증 루틴으로 막아야 함
- 단일 진실 공급원은 "선언"으로 유지되지 않음. 기계적 검증이 필요함

**재발 방지 체크리스트** (CLAUDE.md 세션 종료 절차에 반영):
- [ ] BACKLOG.md ID 중복 검사: `grep -oE "[A-Z]+-[A-Z]*-?[0-9]+" docs/BACKLOG.md | sort | uniq -d`가 0건
- [ ] LESSONS_LEARNED.md 교훈 번호 연속성: 1부터 N까지 누락 없이 연속
- [ ] HANDOVER에 인용된 커밋 해시가 `git log`에 실존하는지 대조
- [ ] 새 ID 발급 전 `grep -c "{새-ID}" docs/BACKLOG.md`로 중복 없음 확인
- [ ] 세션 종료 커밋 메시지와 HANDOVER에 기재된 "마지막 커밋" 해시 일치 확인

**관련 커밋**: {정리 커밋 해시 — 이 커밋 자신, 작성 후 amend로 반영하거나 다음 커밋 메시지에 언급}
**파생**: CLAUDE.md 세션 종료 절차에 위 체크리스트를 반드시 박을 것 (별도 작업).

---

## 교훈 21 — 디버거가 디버깅 대상을 오염시킨다

**맥락**: Phase 5 세션 3에서 Supabase PostgREST Warp HTTP 타임아웃(INFRA-001)이 
발견되어 4시간 디버깅 후 "인프라 간헐 이슈"로 결론. 세션 4에서 태우가 "1인 
테스트로도 재발한다"는 사실을 공유하면서 재조사. 탭·세션 정리 후에도 에러가 
93% 감소했을 뿐 0이 되지 않다가, Antigravity 환경 내 Claude Code를 완전 종료한 
순간 PostgREST 로그가 1시간 구간 0건으로 전환. 원인은 **Claude Code가 유지하는 
Supabase MCP 연결 자체**였음. 디버깅 도구가 디버깅 대상 시스템을 오염시키고 있었음.

**잘못된 접근**:
- 가설 리스트에서 "자기 자신(디버깅 중인 환경)"을 제외
- 에러 발생 타이밍과 디버깅 세션 활성 시간의 상관관계 체크 안 함
- "SQL Editor는 정상, 앱에서만 403"을 봤을 때 Claude Code도 "앱" 쪽 경로라는 
  점을 인식 못 함
- 가설 7(인프라)로 점프 후 가설 8(자기 자신) 탐색 생략

**올바른 접근**:
- 교훈 18(가설 점프 안티패턴)을 적용할 때 가설 목록에 "현재 열려 있는 디버깅 
  도구/세션 자체"를 반드시 포함할 것
- 에러 타임스탬프와 "디버거가 켜져 있었던 시간"의 상관관계를 먼저 확인
- Claude Code·MCP·IDE 플러그인·DB GUI 도구 등 장시간 유휴 연결을 만들 수 
  있는 모든 도구를 의심 대상에 포함
- 클라이언트-서버 비대칭 증상(클라이언트에서 안 보이는데 서버 로그에 쌓이는 
  에러)을 보면 "보이지 않는 클라이언트"가 있다는 강한 신호로 받아들일 것
- 물리학의 관측 문제와 동일: 측정 행위가 측정 대상을 바꾼다

**재발 방지 체크리스트**:
- [ ] 의심스러운 서버 로그 발견 시 "지금 이 순간 어떤 디버깅 도구가 연결돼 
      있는가" 먼저 나열
- [ ] Claude Code 세션은 작업 종료 시 명시적으로 종료 (`/exit` 또는 프로세스 
      kill). 유휴 방치 금지
- [ ] 가설 리스트 작성 시 "자기 자신(디버거)"을 명시적 항목으로 포함
- [ ] 에러 타임스탬프와 디버깅 세션 활성 시간의 타임라인 비교 단계를 기본 
      진단 절차에 포함
- [ ] "SQL Editor 정상 + 앱 경로만 이상"을 봤을 때 Claude Code MCP도 앱 경로임을 
      인식 (둘 다 PostgREST 경유)

**관련 커밋**: Phase 5 세션 3 INFRA-001 등록 (9446012) + 세션 4 resolved 
**관련 교훈**: 교훈 18(가설 점프 안티패턴)의 궁극 버전

**실사례 (Phase 5 세션 8, H-0)**: Bash 도구의 single-quote 이스케이프 한계를 우회하려 Python 생성 스크립트(gen_h0_verification.py)를 작성·실행했으나 삭제하지 않아 저장소에 잔존할 뻔함. 웹 Claude 검토에서 발견, 동일 턴 내 삭제 + 이후 turn에서 gen_H0_rls_check.py는 생성 직후 `rm` 명령으로 즉시 제거하는 패턴 확립.

---

## 교훈 22 — 교훈은 발견 즉시 LESSONS 파일에 박아라

**맥락**: Phase 5 세션 4에서 LESSONS_LEARNED.md를 점검하던 중
교훈 6·7·8·9가 "미수록" 상태로 비어 있음을 발견. git history, 핸드오버
문서 전체, Claude.ai Project 내 과거 대화 검색 두 차례 — 세 경로 모두
교훈 6~9의 원문을 찾지 못함. Phase 3~4 시기 어딘가의 대화·인수인계에서
번호만 부여되고 LESSONS_LEARNED.md에 정식 박제되지 못한 상태로 시간이
흐르면서 원문이 영구 소실됨. 단편 단서 하나("Phase 1 마무리: 다음 Phase
에서도 실제 코드 조사 먼저")만 work_step3 대화에서 발견됐으나 전체
재구성 불가.

**잘못된 접근**:
- 교훈을 인수인계나 핸드오버 문서에만 기록하고 LESSONS 파일 append 미루기
- "다음 세션에 정리하자"는 미루기는 곧 손실
- 번호만 발급하고 본문 미작성 상태로 방치
- 단일 진실 공급원(LESSONS 파일)을 거치지 않은 교훈은 존재하지 않는 것과 같음

**올바른 접근**:
- 교훈은 발견된 대화 안에서 즉시 LESSONS_LEARNED.md에 append 후 커밋
- 번호 발급은 본문 작성과 분리될 수 없음 (둘은 한 트랜잭션)
- 인수인계 문서는 교훈을 "인용"만 하고 "신설"은 LESSONS 파일에서만
- 세션 종료 절차의 BACKLOG 무결성 검증(교훈 20)에 LESSONS 번호 연속성도 포함

**재발 방지 체크리스트** (CLAUDE.md 세션 종료 절차에 추가):
- [ ] 이번 세션에서 발견한 교훈이 LESSONS_LEARNED.md에 본문 포함하여 append됐는가
- [ ] 교훈 번호가 N-1과 N+1 사이 빈자리 없이 연속인가 (`grep -E "^## 교훈 [0-9]+" docs/LESSONS_LEARNED.md`로 검사)
- [ ] 핸드오버 문서가 교훈을 신설하지 않고 인용만 하는가
- [ ] 세션 중 "이건 교훈으로 박을 만하다"고 언급된 모든 항목이 실제 LESSONS 파일에 있는가

**관련 사건**: 교훈 6~9 영구 소실 (Phase 3~4, 원문 복구 불가)
**관련 교훈**: 교훈 20(누적 대장 컨벤션 검증) — 이 교훈은 그 일반화의 구체 사례

---

## 교훈 23 — Edge Function 시크릿은 JSON.parse 검증 없이는 silent fail

**발견**: Phase 5 Session 6, E-6.5 실기기 검증 케이스 1 실패 추적 중
**증상**: send-push Edge Function HTTP 500 반복. 앱·DB·코드 전부 정상.
**원인**: FIREBASE_SERVICE_ACCOUNT 시크릿 값이 어느 시점에 손상.
  Edge Function 내부 `JSON.parse(serviceAccount)`가 첫 글자부터 실패:
  "Expected property name or '}' in JSON at position 1"
**해결**: Firebase Console에서 서비스 계정 키 재발급 후 Supabase Secrets에 재등록.
**교훈**:
  - HTTP 레벨 로그(MCP get_logs)는 status code만 보여줌. console.error 상세는
    Supabase Dashboard Logs 탭에서만 확인 가능.
  - 시크릿 기반 외부 API 호출은 "시크릿 무결성"을 코드 / DB / 네트워크와 동등한
    독립 레이어로 가정하고 진단해야 함 (교훈 18 레이어 목록에 SECRET 추가).
  - try/catch 분리 덕분에 TBM 저장은 정상 진행됨 (E-6.5 설계 의도대로).
    저장과 알림이 강결합이었다면 작업자가 TBM 자체를 못 냈을 것.
**연관**: 교훈 18 (레이어별 진단), INFRA-001 (PostgREST 타임아웃 사례와 유사 패턴)

---

## 교훈 24 — Supabase Edge Function은 ES256 JWT를 Gateway 단에서 검증 못한다

### 증상
- `--verify-jwt` 플래그로 배포한 Edge Function에 유효한 사용자 access_token + anon_key 헤더로 호출 시 `{"code":401,"message":"Invalid JWT"}` 반환
- Supabase `/auth/v1/user` 엔드포인트는 같은 토큰을 정상 처리 (`auth.users` 정보 반환)
- Edge Function Logs 탭은 "No results found" — 요청이 함수 내부까지 도달하지 않음, Gateway에서 튕긴 증거

### 원인
- Supabase 최신 access_token 헤더는 `alg: ES256`
- Edge Function Gateway의 JWT 검증기는 HS256 기준 구현, ES256 서명 검증 실패
- Function 내부의 `supabase.auth.getUser()`는 동일 토큰을 정상 검증함(Gateway와 별개 로직)

### 해결
- `--no-verify-jwt` 플래그로 재배포 → Gateway 검증 우회
- 함수 내부에서 `supabase.auth.getUser()` 호출로 토큰 검증 수행
- 보안 수준 동일: 무효 토큰이면 auth.getUser가 실패하여 401 반환

### 추적
- BACKLOG INFRA-002: Supabase 측 수정·대응 모니터링
- 모든 인증 필요 Edge Function(`send-push`는 이미 --no-verify-jwt)은 이 패턴 채택

### 반복 방지
- 새 Edge Function 배포 시 `--no-verify-jwt` + 함수 내 auth.getUser() 조합을 기본값으로 가정
- `--verify-jwt`(기본값)은 ES256 이슈 해결 확인되기 전까지 사용 금지

---

## 교훈 25 — 프롬프트 튜닝 실패 시 인코딩·환경 가설로 귀인하지 말 것

### 사건
Phase 5 세션 10 H-1.5 curl 검증. 시나리오 1(TBM 메뉴 질문) 통과, 시나리오 2(날씨 질문 거절 방식 부정확)·3(일용직 시급 질문이 앱 범위 내인데도 거절) 미달. 3회 프롬프트 재조정 후에도 지속. 당시 진단: "Windows Git Bash 순수 한국어 인코딩 또는 Haiku 4.5 모델 특성 가능성".

### 진단 오류
1. 시나리오 1도 대부분 한국어("TBM"만 ASCII). 인코딩 문제라면 함께 실패해야 함.
2. 실패 응답이 깨진 글자가 아니라 정상 한국어 거절 문장("질문이 제대로 입력되지 않았습니다"). 모델이 맥락 맞는 거절을 생성한 것은 질문을 이해했다는 증거.
3. 응답 형식·내용 모두 일관성 있음 → 인코딩 층 아닌 모델의 결정 층 문제.

### 실제 원인 후보
- 시스템 프롬프트 내 금지 조항 누적([답변 불가 범위] + [금지된 요청 처리] + [규칙 변경 시도 처리])으로 과잉 거절
- [앱 기능 명세]가 금지 조항 뒤에 배치돼 모델이 "범위 외 우선" 모드로 시작

### 반복 방지
- **응답이 정상 한국어 문장이면 모델은 질문을 이해한 것이다.** 인코딩·네트워크·CLI 환경 가설을 먼저 꺼내지 말 것.
- 프롬프트 튜닝 실패의 1차 원인 탐색은 (1) 프롬프트 내용 (2) 프롬프트 블록 배치 순서 (3) 모델 파라미터 순으로. 환경 가설은 최후.
- 디버깅 전에 "응답에서 깨진 문자가 있는가? 응답이 맥락 맞는가?"를 먼저 체크. 둘 다 정상이면 환경 가설 즉시 기각.

### 관련
- 세션 10 커밋 53d913c
- CHATBOT-CURL-001 (후속 해결은 세션 11 H-2 진입 전 별도 세션)
- 교훈 18(가설 점프 안티패턴 — 3회 실패 후 아키텍처 층 재열거)의 구체 적용 사례

---

## 교훈 26 — 프롬프트 지시 미준수 시 반복 강화·반복 수정 금지, 층위 재분석 선행

### 사건
Phase 5 세션 10 H-1.5. [응답 스타일] 지시가 반영되지 않자 3차 프롬프트 조정을 수행. 1차(예시 형식 변경) → 2차([응답 스타일 예시] 섹션 제거) → 3차([응답 스타일] 전체 제거 + 요약 지시로 대체). 그러나 실패 패턴은 [응답 스타일]이 아니라 거절 판정 층에 있었음. 3회 조정 모두 잘못된 층을 건드린 결과 세션 상한 소진.

### 진단 오류
- "지시가 안 먹힘 → 지시를 바꾸면 됨" 이라는 단일 층 반복이 핵심 문제.
- 세션 10 시작 프롬프트에 "응답 스타일이 실제로 지켜지지 않을 때 반복 강화 금지, 근본 원인 분석 선행" 조항이 있었으나 실제로는 지시 변경 형태로 반복 수정함. 강화 아닌 수정이라도 동일 층 반복은 안티패턴.

### 반복 방지
- 프롬프트 조정 1회 실패 후에는 **조정 전에** 실패 원인이 (1) 어느 프롬프트 블록에서 왔는지 (2) 어느 모델 판정 단계에서 왔는지 (거절 판정 / 형식 생성 / 내용 생성) 계층 분리부터 할 것.
- 동일 층 3회 수정은 교훈 18 "가설 점프 안티패턴"의 변종. 3회 룰을 "3회 이상 수정 전 층위 분석 강제"로 적용할 것.
- 조정 성격 구분: **강화**(더 강한 문구 추가) = 금지, **변경**(문구 교체)도 같은 층 반복이면 금지. 허용되는 건 **층 이동**(다른 블록·순서·모델 설정 건드리기).

### 관련
- 세션 10 H-1.5 3차 조정 이력 (커밋 53d913c)
- 교훈 18(가설 점프 안티패턴)의 프롬프트 튜닝 영역 확장
- 교훈 25(인코딩 가설 귀인 금지)와 짝

---

## 교훈 27 — curl 본문에 한국어가 포함될 때 쉘 이스케이프 오염 주의

**사건:** Phase 5 세션 11 CHATBOT-CURL-001 디버깅 중, curl -d '{"content":"TBM이 뭐예요?"}' 형식 인라인 바디가 쉘 이스케이프 과정에서 한국어 바이트가 손상된 채 Edge Function으로 전달. 모델이 깨진 문자열을 받고 "질문이 깨져 보입니다"라고 응답 → 마치 프롬프트·모델 실패처럼 오진될 수 있었음.

**원인 층:** curl → shell → HTTP body 전송 경로. Edge Function, Anthropic API, 시스템 프롬프트와 무관.

**재발 방지 원칙:**

1. 비-ASCII 페이로드를 curl로 보낼 때는 반드시 heredoc으로 파일 생성 후 `--data-binary @file` 사용.

```bash
cat > /tmp/req.json <<'EOF'
{"session_id":"...","turn_index":0,"messages":[{"role":"user","content":"TBM이 뭐예요?"}]}
EOF
curl --data-binary @/tmp/req.json -H "Content-Type: application/json; charset=utf-8" ...
```

2. heredoc 구분자 반드시 **작은따옴표** 감싸기(`'EOF'`) — 쉘 변수 확장 차단.
3. 전송 전 `file /tmp/req.json` 또는 `wc -c`로 바이트 확인.
4. 응답에 "질문이 깨져 보입니다", "제대로 보이지 않습니다" 등 메타 코멘트가 나오면 프롬프트·모델 층이 아니라 **입력 페이로드 인코딩 층부터 의심**.

**교훈 25와의 관계:** 교훈 25는 "인코딩 가설로 귀인 금지"를 말했지만, 그건 *파일 저장 인코딩* 층에 한정된 얘기였음. 요청 전송 경로의 쉘 이스케이프는 별개 층이며 실제로 인코딩 오염이 일어날 수 있다. 교훈 25는 "문제 해결이 안 될 때 인코딩으로 도피하지 말 것" 의미로 유지, 교훈 27은 "실제 오염 발생 경로는 식별할 것" 의미로 병존.

**관련 커밋:** 세션 11 마무리 커밋

---

## 교훈 28 — PostgREST embed(resource!inner(...))는 FK runtime 검증 필수

**배경 (2026-04-12, 세션 12 H-2 진단)**

H-2 도구 `get_pending_approvals` curl 테스트에서 `query_failed` 발생. 진단 결과 `leave_requests`, `overtime_requests`, `safety_checks` 3개 테이블 모두 `employees` 참조 FK가 DB에 선언되지 않은 상태 확인 (`information_schema` 0건). 특히 `safety_checks`는 마이그레이션 파일(`20260410100000_safety_checks.sql`)에 `worker_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE` 선언이 명시되어 있었으나, 실제 DB에 제약이 반영되지 않음. 파일 선언과 runtime 상태의 괴리.

**핵심**

- PostgREST `!inner(...)` embed syntax는 `information_schema.table_constraints`의 FK 메타데이터를 기반으로 관계 추론. FK가 없으면 embed 실패 → `query_failed` 반환.
- 마이그레이션 파일의 `REFERENCES` 선언 ≠ DB 실제 제약. 파일만 보고 embed 가능 판정 금지.
- 교훈 17(정의만으로 닫지 말 것)의 직접 적용 사례.

**진단 SQL (information_schema 기반)**

```sql
SELECT tc.constraint_name, kcu.column_name, ccu.table_name AS foreign_table
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage ccu ON tc.constraint_name = ccu.constraint_name
WHERE tc.table_name = '<테이블>' AND tc.constraint_type = 'FOREIGN KEY';
```

결과 0건이면 embed 불가 → 수동 JOIN (별도 쿼리로 id 집합 조회 후 `in()` 필터) 필요.

**재사용 패턴 (tools.ts `fetchEmployeeMap` 등)**

1. 본 테이블에서 외래키 컬럼(예: `employee_id`, `worker_id`)만 select
2. 외래키 값들을 모아 참조 테이블을 `.in('id', [...])` 로 일괄 조회
3. `Map<id, row>` 로 메모리 조합

**후속 액션 (차기 세션 이월)**

DB FK 제약 정상화 마이그레이션: `leave_requests.employee_id`, `overtime_requests.employee_id`, `safety_checks.worker_id`/`approved_by` FK 추가. 데이터 무결성 차원에서도 필요.

**관련 커밋:** 세션 12 8294d3b

---

## 교훈 29 — LLM 시스템 프롬프트에 현재 날짜 미주입 시 상대 날짜 해석 오류

**배경 (2026-04-12, 세션 12 H-2 curl)**

시나리오 "지난 일주일 부산LAB 일용직" 질의에 LLM이 `date_from=2024-12-16`, `date_to=2024-12-22`로 도구 호출. 또는 "구체 날짜를 알려주세요"로 되묻기.

**원인**

`buildSystemPrompt` `[현재 사용자 컨텍스트]` 블록에 현재 날짜 부재. LLM은 기준점 없으면 사전학습 시점(2024년 말 근처) 기준으로 상대 날짜 계산.

**해결**

- `index.ts`: `new Date().toISOString().slice(0, 10)`로 UTC YYYY-MM-DD 생성 후 프롬프트 주입
- 도메인 노트 §3.3 원문에도 `- 오늘 날짜: {TODAY}` 플레이스홀더 추가하여 코드 1:1 정합

**재발 방지 체크리스트 (LLM 호출 신규 추가 시)**

- [ ] 상대 시간·날짜 해석이 필요한 도구(`date_from`/`date_to`, 기간 필터 등)가 있는가?
- [ ] 있다면 시스템 프롬프트에 현재 날짜(KST 또는 UTC)를 명시했는가?
- [ ] 도메인 노트 원문과 코드의 플레이스홀더 일치 여부 확인했는가?

**주의**

`new Date()`는 Edge Function 실행 서버의 UTC. KST(+9h)와 최대 9시간 차이. 자정 직후 호출 시 하루 어긋날 수 있으나 상대 날짜 해석 용도상 허용 오차. 정밀한 날짜가 필요한 경우(일별 정산 등) KST 변환 후 전달 고려.

**관련 커밋:** 세션 12 f060189

---

## 교훈 30 — RLS 시뮬레이션은 MCP 불가, 대시보드 SQL Editor 필수

**요지**: Supabase MCP는 read-only `service_role` 연결이므로 `SET LOCAL ROLE authenticated` · `SET LOCAL request.jwt.claims` 등 identity 전환 명령을 원천 거부한다. RLS 정책의 실제 동작을 시뮬레이션하려면 반드시 Supabase 대시보드 SQL Editor에서 수동 실행해야 한다.

**근거**:
- service_role은 RLS를 우회하므로 MCP SELECT는 모든 row를 반환함 → RLS 정책 실증 불가
- MCP는 `SET LOCAL ROLE`을 permissions error가 아닌 "by design" 거부
- 대시보드 SQL Editor는 Supabase가 인증한 운영자 경로로 `SET LOCAL` 계열 허용

**재현 사례 (세션 13, 2026-04-13)**:
단위 5 진행 중 사용자가 "SQL 시뮬레이션도 Claude Code가 할 수 있지 않나"라고 문의. Claude Code는 MCP의 read-only service_role 제약(교훈 14)을 근거로 정확히 거부. 사용자가 인정한 후 대시보드 SQL Editor에서 6건 수동 실행 → SQL-2가 `ERROR 42501: new row violates row-level security policy` 반환 → 단위 4의 `error.code === '42501'` primary 조건 정확 작동 실증.

이 재현 사례는 교훈 14("MCP는 read-only service-role")의 파생 결론("그러므로 시뮬레이션은 대시보드")이 실전에서 얼마나 쉽게 잊히는지 보여줌. 교훈 14를 알고 있어도 작업 흐름에 휩쓸리면 같은 실수 반복 가능.

**실천 규약**:
- RLS 정책 검증이 필요한 단계에서는 MCP 쿼리 시도 전 "이것이 identity 전환을 요구하는가" 자문
- 요구하면 대시보드 경로 즉시 전환, 사용자에게 수동 실행 요청
- BEGIN + SET LOCAL + 쿼리 + ROLLBACK 4단 블록을 시나리오당 개별 트랜잭션으로 구성
- 결과 수신 후 Claude Code가 MCP SELECT로 정리 상태 재확인 (찌꺼기 row 0건 등)

---

## 교훈 31 — RLS INSERT 정책 employees 조인 경유 패턴 (auth.uid() → employees.auth_user_id → role IN)

**요지**: GREF FarmWork의 쓰기 RLS INSERT 정책은 `auth.uid()`를 직접 `employee_id` 컬럼과 비교하는 대신, `employees` 테이블을 경유하여 `auth_user_id` 매핑 + `role` 조건을 동시 검증한다. 향후 쓰기 도구 추가 시 동일 구조로 작성.

**근거**:
- GREF 스키마에서 `auth.users`와 `employees`는 `employees.auth_user_id`로 연결 (1:1 not enforced)
- 쓰기 RLS는 "해당 row의 employee가 (1) 현재 인증 사용자와 매핑되고 (2) 허용된 role을 가진다"를 동시 보장 필요
- 단일 `EXISTS` 서브쿼리로 두 조건 결합하여 정책 문법 간결 유지

**재사용 템플릿**:

```sql
CREATE POLICY <name>_insert ON <table>
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM employees
      WHERE id = <table>.<employee_fk_column>
        AND auth_user_id = auth.uid()
        AND role IN ('<허용_role1>', '<허용_role2>', ...)
    )
  );
```

**원본 적용 사례 (세션 13, 2026-04-13)**:
chatbot_feedback 테이블의 `chatbot_feedback_insert_own` 정책.
- `<table>`: chatbot_feedback
- `<employee_fk_column>`: employee_id
- `<허용_role>`: farm_admin, hr_admin, master

단위 5 SQL-2 시뮬레이션으로 unauthorized sub UUID에 대해 RLS가 정확히 42501 차단 확인.

**SELECT 정책 변형**:
본인 row 조회 정책은 `role IN (...)` 조건 생략 + `USING` 절 사용:
```sql
CREATE POLICY <name>_select_own ON <table>
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM employees
      WHERE id = <table>.<employee_fk_column>
        AND auth_user_id = auth.uid()
    )
  );
```

master 전체 조회는 role만 검증:
```sql
CREATE POLICY <name>_select_master ON <table>
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM employees
      WHERE auth_user_id = auth.uid() AND role = 'master'
    )
  );
```

**주의**:
- 타 테이블 정책 작성 시 `<table>.<column>` 한정 참조 필수 (PostgreSQL 외부 참조 모호성 회피)
- `employees.auth_user_id` NULLABLE이므로 worker 계정(auth_user_id NULL)은 이 구조에서 자동 차단 — 별도 조건 불필요

---

## 교훈 32 — 정의만으로 결정 박지 말 것: 실측·검증 없는 추정의 함정

**요지**: 도메인 노트·HANDOVER·JSDoc·역할 정의 등 "정의 텍스트"만 보고 결정·부채·교훈을 박으면, 실 동작·실 데이터·실 코드와 어긋날 수 있다. 결정 박기 전에 실측·검증으로 정의와 실체를 대조하라.

**근거**:
- GREF FarmWork는 docs·코드·DB·운영 절차가 누적되며, 정의 텍스트와 실체가 시간차로 어긋나는 사례가 반복 발생
- 정의 텍스트 기반 추정은 "그럴 듯함"이 검증을 대체하기 쉬워 자기 정당화 안티패턴 진입
- 실측 비용은 대체로 grep 1회·SQL 1쿼리·view 1회 수준이라 정의 추정보다 압도적으로 저렴
- 추정으로 박은 결정·부채·교훈은 향후 세션에서 "왜 이렇게 박혔지?" 추적 비용을 발생시킴

**회고 사례 (9건)**:

1. **DOC-DRIFT-001 부채 등록 (세션 13 P3 note)**: 도메인 노트 §3.5 지정이 정의 기반 추정. 실측 zero hit으로 실체 없는 부채 확인 → 세션 14 단위 0 wontfix 처리.

2. **Pretendard 폰트 로드 오진**: Pretendard가 index.html에 미리 로드된 상태로 추정해 진행. 실측 결과 로드 없음 발견 → v1.3.9 수동 로드 추가.

3. **supervisor 시드 계정 활성 추정**: supervisor role이 ADMIN_ROLES 4종에 정의되어 있어 활성 시드 계정 존재로 추정. 실 employees 테이블 SELECT 결과 시드 0건 발견. 정의된 role과 실 데이터 별개 추적 필요.

4. **closePanel JSDoc 모순**: 단위 4 검수 시 closePanel JSDoc 정의와 실제 구현 사이 모순 발견. JSDoc 정의 추정으로 박은 결과.

5. **Claude Code 단위 순서 재구성**: Claude Code가 단위 5를 단일 작업으로 추정해 묶었으나, 실 작업 진입 시 5-A(hook)와 5-B(컴포넌트)로 분리 필요 발견. 의도 층 분리 원칙(hook은 logic, 컴포넌트는 UI) 검토 부재.

6. **Q4 tool_uses 응답 형식 추정**: Q4 응답 형식을 'tool_uses 배열 최상위' 추정으로 박음. 실측 결과 'content 배열 안 type:tool_use 항목' 구조 발견. 단위 3 chatbotClient 정정 필요.

7. **요청 body 구조 누락**: 단위 3에서 응답 구조만 확인하고 진행했으나, 단위 5-A 진입 시 요청 구조 누락 발견.

8. **세션 14 단위 5-C 절차 위반**: Claude Code가 "재배포 성공 = 검증 완료"로 자체 판정 → 단계 4.2(태우 수동 재테스트) 건너뛰고 단계 4.3 자동 진행. 절차 단계의 안전성을 추정하면 안 됨.

9. **세션 15 단위 6-D 단계 1 — HANDOVER 추정 ↔ LESSONS 실측 불일치**: HANDOVER 3.4.1·3.4.2가 "회고 1건은 보류 (교훈 22)"를 박제 보류 원칙으로 명시했으나, 단계 1 grep으로 실측한 교훈 22 본문에는 해당 원칙 명시 없음("교훈은 발견 즉시 박아라"가 실제 명시 원칙). HANDOVER 작성자(이전 세션 Claude)가 LESSONS의 명시 규칙으로 추정한 사례. 박제 가치 판단의 진짜 기준은 "회고 누적 수"가 아니라 "본질 명료성·반복 가능성·도메인 특수성"이며, 이 기준이 LESSONS에 명문화되지 않은 상태. 본 사례 자체가 교훈 32 본질의 메타 사례 — HANDOVER (정의 텍스트)로 박힌 원칙이 LESSONS (실체)와 어긋난 구조.

**예방 사례 (3건)**:

1. **단계 1.5 (단위 3 단계 0)**: 응답 구조뿐 아니라 chatbotClient 에러 처리도 함께 실측해 정의-실체 대조 완수.

2. **단계 0 재확인 (단위 5-A 단계 1)**: chatbot-query body 구조 실측 후 단위 5-A 시그니처 확정. 정의 추정으로 진행하지 않음.

3. **단계 2 selector 정합성 (단위 5-A 단계 2)**: Claude Code가 hook body의 messages selector 미사용을 짚음 → 정의(설계 의도)와 실 코드 대조 후 제거.

**핵심 원칙**:
- **확인 범위는 대칭적으로** — 응답만이 아니라 요청도, 스키마만이 아니라 처리 로직도, 코드만이 아니라 절차도, 정의만이 아니라 실체도 함께 확인한다.
- **"허용 오차 범위" 같은 자기 정당화 주석 박지 말 것** — 실측 근거를 명시하지 않은 자기 정당화는 추정의 함정 진입 신호.
- **명시된 검수 지점은 모두 이행** — 절차에 명시된 단계는 자체 판정으로 건너뛰지 않는다. 단위 5-C 회고 사례 참조.
- **정의·명명·절차 단계 결정 시 미래 일반화·확장 가능성 검토 필수** — 초기 결정이 후속 흐름과 어긋나면 드리프트 발생 (NAMING-DRIFT 사례 참조: BACKLOG CHATBOT-NAMING-DRIFT-001).

---

## 교훈 33 — (보류) 멱등성 가드 패턴

**상태**: 박제 보류 (2026-04-14, 세션 15 단위 6-D)

**보류 사유**: 회고 사례 1건만 누적 (단위 2 setToolUsePending 멱등 가드). 본질이 일반 SW 엔지니어링 상식 수준 (동일 ID 메시지 중복 push 방지)이라 별 교훈 가치 약함. v2 또는 다른 트랙에서 GREF FarmWork 도메인 특수 패턴으로 유사 사례 재현 시 박제 검토.

**현재 누적 회고**:
1. 단위 2 setToolUsePending 멱등 가드 — 동일 ID 메시지 중복 push 방지 (chatStore.js TOOL_USE_PENDING_ID 체크).

**재검토 트리거**:
- GREF 도메인 특수 멱등 패턴 발견 시 (예: 출근 중복 INSERT 가드, TBM 알림 중복 발송 가드 등)
- 회고 사례 2건 이상 누적 시
- 별 교훈 (메타 박제 원칙)으로 통합 가치 발견 시

---

## 교훈 34 — 서버 관대함의 함정: 검증 부재가 클라이언트 오류를 은폐한다

**요지**: 서버가 클라이언트 입력을 관대하게 받아들이면(검증 없이 수용), 클라이언트의 잘못된 계산·부정확한 값·미완 row 등이 서버에 그대로 누적된다. 동작은 표면적으로 정상이지만 데이터 정합·감사 추적·향후 분석에서 누락·왜곡 발생. 서버 측 검증 책임을 명시해 클라이언트 오류를 일찍 노출하라.

**근거**:
- chatbot-query Edge Function이 클라이언트 turn_index·user/assistant turn 쌍·chat_logs INSERT 정합을 검증하지 않음 → 클라이언트 결함이 서버에서 차단되지 않고 그대로 통과
- 서버 검증 부재 시 결함 발견 시점이 데이터 누적 후로 지연됨 (H-5 모니터링 페이지 설계 단계, H-6 비용 집계 단계 등)
- "관대함"은 일견 유연성으로 보이나, 실제로는 클라이언트 결함을 표면화시키지 못하는 침묵 실패(silent failure) 패턴
- GREF FarmWork는 단일 개발자(태우) + 다중 admin 클라이언트 구조라 서버 측 책임 명확화가 결함 추적 비용을 크게 줄임

**회고 사례 (3건)**:

1. **chatbot-query 서버의 turn_index 검증 부재 (세션 12~13)**: 클라이언트가 보내는 turn_index를 서버가 검증 없이 chat_logs에 INSERT. 부정확한 값(예: 비연속 짝수, 음수, 거대 정수)을 보내도 통과. 서버 측 "기대 다음 turn_index = (cleanUserCount-1)*2" 검증 추가 필요. (BACKLOG CHAT-LOG-TURN-INDEX-VALIDATION-001)

2. **chatbot-query LLM 호출 실패 시 chat_logs 미완 row 누적 (세션 14)**: LLM 호출이 실패해도 user turn INSERT는 이미 발생한 상태로 트랜잭션 종료 → assistant turn 없는 미완 row가 chat_logs에 누적. 서버 측 "LLM 호출 실패 시 user turn rollback 또는 status 컬럼 marking" 책임 미구현. H-5 모니터링·H-6 비용 집계에서 처리 방식 결정 필요. (BACKLOG CHAT-LOG-INCOMPLETE-TURN-001)

3. **세션 13 단위 3.5 리팩토링 부작용 — 서버 관대함 + 클라이언트 보수적 계산 부재 조합**: user turn INSERT를 LLM 호출 루프 진입 전에 분리한 리팩토링. 의도는 "실패해도 user input 추적 가능". 그러나 turn_index 일관성 검증이 함께 추가되지 않아, 재전송 시 chat_logs에 turn_index 0, 2, 4 같은 비연속 패턴 생성. 서버는 어떤 turn_index든 받아주고, 클라이언트는 보수적 재계산 없이 직전 값 + 2를 보냄. 단일 결함이 아닌 두 측면의 침묵 합산이 본질. 세션 14 단위 5-A·5-C에서 부작용 발견 후 소급 인지.

**핵심 원칙**:
- **서버 측 입력 검증은 "방어적 책임" — 클라이언트 신뢰 금지** — 단일 개발자 환경이라도 클라이언트 결함은 발생하며, 서버 검증 없이는 발견 시점이 누적 후로 지연된다.
- **silent fail 패턴 회피 — 결함은 일찍 표면화시켜라** — 서버가 "그냥 받아주는" 것은 유연성이 아니라 결함 은폐. 의도적 거절·상태 marking·로그 발생으로 결함을 즉시 노출한다.
- **리팩토링 시 "서버 측 부수 영향" 검토 절차 보강** — 클라이언트 동작만 보고 리팩토링하면 서버 측 검증 누락이 부작용으로 누적된다. 리팩토링 PR 검토 항목에 "서버 측 검증 필요 여부" 포함.
- **데이터 정합 책임 분담은 명시적으로 — "관대한 서버 + 보수적 클라이언트" 또는 "엄격한 서버 + 자유로운 클라이언트" 중 선택해 명문화** — 양쪽 모두 검증 부재면 결함 누적, 양쪽 모두 검증이면 중복. 트랙별 진입 시점에 정책 결정 필요.

---

## 교훈 35 — CHECK 제약은 information_schema에 안 보인다, pg_constraint를 직접 조회하라

**맥락:** 세션 16 (2026-04-15), 트랙 J-1 파트 B 시드 INSERT 실행 시 `employees_branch_check` CHECK 제약 위반 에러 발생.

**잘못된 접근:** 단계 1 조사에서 `information_schema.columns` 기반으로 employees 스키마 조사. 결과에 "CHECK 제약 없음"으로 보고. 도메인 노트 §3에 "CHECK 없음" 박음. J-1 파트 B 시드 INSERT 진입 시 23514 에러 발견. CHECK 제약 2건(`employees_branch_check`, `employees_role_check`) 실 존재 확인 → 별도 마이그레이션 파일(`20260415_track_j_check_constraints.sql`) 신설로 우회.

**올바른 접근:** PostgreSQL의 CHECK 제약은 `information_schema.columns`에는 표시되지 않음 (data_type·is_nullable 등 컬럼 자체 메타만). CHECK 제약 조회는 반드시 `pg_constraint` 시스템 카탈로그 사용:

```sql
SELECT conname, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conrelid = '<테이블>'::regclass
AND contype = 'c';
```

**회고 사례:**

3. **J-CLEANUP-001 (세션 17, 2026-04-16)**: FK 제약 information_schema 조사 결과 "FK 0건" 수용 → 실측 pg_constraint 직접 조회 결과 20건 존재. DELETE 실행 시 leave_requests FK 위반 발생 → 전체 롤백 + auth.users orphan 2건 발생. pg_constraint 재조회로 FK 매트릭스 (NO ACTION 15 + CASCADE 3 + SET NULL 1 + RESTRICT 1) 파악 후 옵션 C (최소 삭제) 재전략 채택. information_schema.constraint_column_usage는 현재 사용자 소유 테이블만 표시 (Supabase MCP service_role 비소유자 → FK 누락). 관련 커밋: bbfde05.

**재발 방지 체크리스트 (스키마 조사 시):**
- [ ] `information_schema.columns` — 컬럼 타입·nullable·default 확인
- [ ] `pg_constraint` (contype='c') — CHECK 제약 확인
- [ ] `pg_constraint` (contype='f') — FK 제약 확인 (교훈 12 관련)
- [ ] `pg_constraint` (contype='u') — UNIQUE 제약 확인
- [ ] `pg_indexes` — 인덱스 확인
- [ ] `pg_policies` — RLS 정책 확인 (교훈 30·31 관련)
- [ ] FK 제약 조사 시 pg_constraint 직접 조회 (contype='f') + delete_rule 포함
- [ ] DML 실행 전 FK 제약 위반 가능성 실측

**핵심 원칙:** 단일 도구·단일 카탈로그가 모든 제약을 커버하지 않음. 스키마 조사는 "도구별 반환 범위"를 의식하고 다중 카탈로그 조회로 사각지대 제거.

교훈 1·2(스키마 실측 선행) 확장. 실측은 "조회만으로 충분"이 아니라 "조회 도구의 반환 범위를 의식한 다중 카탈로그 조회"가 본질.

**관련 커밋:** 세션 16 `c611e8f` (CHECK 제약 ALTER + 시드 재실행), 세션 17 `bbfde05` (J-CLEANUP-001 옵션 C)

**관련:**
- 교훈 37 (외부 인프라·구조 사전 검증 일반 원칙) — 본 교훈의 일반 원칙 확장

---

## 교훈 36 — Supabase MCP 다중 쿼리 단일 호출 시 마지막 결과만 반환됨

**맥락:** 세션 16 (2026-04-15), J-2 RLS 검증 + J-4-DB 검증 시 다중 쿼리 결과 누락 발생.

**잘못된 접근:** Supabase MCP `execute_sql` 호출 시 세미콜론으로 구분된 다중 SQL 문 단일 호출로 전달. 검증 1·2 두 쿼리 동시 전달 시 실측 결과로 마지막 쿼리(검증 2)만 반환됨. 검증 1 결과는 누락. 처음에는 누락 사실 인지 못해 "검증 통과"로 자체 판정 위험 → 단일 호출 재실행으로 검증 1 별도 확인.

**올바른 접근:** Supabase MCP는 단일 호출당 단일 결과 set만 반환하는 것으로 추정 (다중 statement 시 마지막 결과 우선). 검증 쿼리는 반드시 **각 쿼리당 개별 호출**로 분리. 결과 누락 발견 시 자체 판정 금지, 즉시 재실행.

**재발 방지 체크리스트:**
- [ ] MCP `execute_sql` 호출 시 단일 SQL statement만 전달
- [ ] 검증 N건은 N회 호출로 분리
- [ ] 결과 누락 의심 시 단일 호출 재검증
- [ ] "마지막 쿼리만 반환됐을 가능성" 의식 후 진행
- [ ] ※ 동일 패턴 의심 영역: Edge Function 내부 PostgREST 호출, RPC 호출, supabase-js .rpc() 메서드 — 각 도구의 호출-결과 단위 실측 권고.

**핵심 원칙:** MCP 도구의 호출 단위 ≠ SQL statement 단위. 도구 동작 가정을 실측으로 검증한 뒤 검증 절차 설계.

**관련 커밋:** 세션 16 `f348187` (J-2 RLS, 검증 재실행), `915c88f` (J-4-DB, 검증 재실행)

---

## 교훈 37 — 외부 인프라·구조 사전 검증 필수 (최상위)

**맥락:** 세션 17 (2026-04-16). 트랙 J J-4-UI-0·UI-A 및 J-CLEANUP-001 단계 2에서 외부 인프라·구조 사전 검증 누락으로 인한 실행 실패 반복 발생. 확장·Store·DB 메타데이터·Context Memory 4개 영역에서 "선언 ≠ 실제" 패턴 공통 확인.

**잘못된 접근:**
- pgcrypto 확장 활성 확인만 수행 → 실제 스키마 위치·search_path 검증 누락 (UI-0-A search_path 결함)
- authStore 선언 확인만 수행 → 실제 snakeToCamel 변환 검증 누락 (UI-A is_active 결함)
- information_schema.constraint_column_usage 결과 "FK 0건" 수용 → 실제 FK 20건 존재 미파악 (J-CLEANUP-001 DELETE 전체 롤백)
- auth.users 삭제 시 employees.auth_user_id 자동 처리 미파악 (FK delete_rule SET NULL 추정)
- userMemories "Lesson 31까지" 명시 수용 → 실측 교훈 36 확인 (Context Memory ≠ 실측)

**올바른 접근:**

외부 인프라·구조 검증은 도메인별 표준 적용:

PostgreSQL 확장 검증 표준:
- 활성 확인 (pg_extension)
- 스키마 위치 확인 (pg_namespace)
- search_path 재검증 (SHOW search_path)
- 함수 시그니처 실행 테스트

Store 구조 검증 표준:
- 선언 코드 확인
- 실제 상태 구조 변환 확인 (snakeToCamel 등)
- 런타임 값 검증

DB 메타데이터 조사 표준 (pg_* 직접 조회 우선):
- FK·CHECK 제약: pg_constraint (delete_rule 포함) — 구체 사례는 교훈 35 참고
- 권한: pg_authid + pg_roles
- RLS 정책: pg_policy (+ polpermissive 컬럼)
- 스키마: pg_namespace + search_path
- information_schema는 권한 의존성 (소유자 테이블만 표시) 인지

Context Memory 검증 표준:
- userMemories/컨텍스트 메모 수치 사용 시 실측 대조
- 파일 상태·DB 상태는 실제 view/query 재확인
- 선언·메모 ≠ 실제 상태 인지

**회고 사례 (세션 17):**
1. UI-0-A: pgcrypto 스키마 위치 검증 누락 → search_path 결함. 관련 커밋: 8da057a.
2. UI-A: authStore snakeToCamel 변환 검증 누락 → is_active 결함. 관련 커밋: 0093617.
3. J-CLEANUP-001: FK 조사 information_schema 20건 누락 → DELETE 실패 + 전체 롤백 (교훈 35 확장 사례). 관련 커밋: bbfde05.
4. J-CLEANUP-001: auth_user_id 자동 NULL 사전 미파악 (FK delete_rule SET NULL 추정).
5. 세션 17 마감 준비: userMemories "Lesson 31까지" 명시 → 실측 교훈 36 확인 (Context Memory ≠ 실측).

**재발 방지 체크리스트:**
- [ ] 모든 DB 메타데이터 조사는 pg_* 직접 조회 우선 사용
- [ ] information_schema 사용 시 권한 의존성 명시 인지
- [ ] PostgreSQL 확장은 활성·스키마·search_path·시그니처 모두 검증
- [ ] Store 구조는 선언·런타임 값·변환 모두 검증
- [ ] Context Memory 수치는 실측 대조
- [ ] 조사 결과 공식 전 실측 재검증

**핵심 원칙:** 확장·구조 활성 ≠ 호출·참조 가능. 선언·메모·설정 확인만으로 충분하지 않음. 실측 + 실행 시나리오 검증 필수.

구체 도메인 참조:
- FK·CHECK 제약 조사: 교훈 35 (pg_constraint 필수)
- MCP 다중 쿼리 특성: 교훈 36 (마지막 결과만 반환)

**관련:**
- 교훈 14 (RLS 동작 검증 Dashboard SQL Editor 필수) — 조사 방법론 유사
- 교훈 30 (Supabase MCP 읽기 전용, DML 시뮬레이션 Dashboard 필수)
- 교훈 35 (CHECK·FK 제약 pg_constraint 필수) — 구체 도메인 확장
- 교훈 36 (MCP 다중 쿼리 특성) — 조사 도구 특성
- BACKLOG J-CLEANUP-DEEP-001 (14명 처리 시 delete_rule 재확인 권장)

**관련 커밋:** 8da057a (UI-0-B-2 search_path 정정), 0093617 (UI-C-FIX authStore snakeToCamel 정정), bbfde05 (J-CLEANUP-001 옵션 C)

---

## 교훈 38 — 4-party 절차 경계: 작업 채팅 검수 계층 스킵 방지

**맥락:** 세션 17 (2026-04-16). UI-C-FIX 단계 2-B 및 J-CLEANUP-001 첫 DELETE 실행에서 작업 채팅 검수 계층이 스킵되어 안전망 무력화 발생. 두 사례 모두 Claude Code 결과가 작업 채팅 검수를 경유하지 않고 메타에 직접 전달됨.

**잘못된 접근:**
- Claude Code 실행 결과를 태우가 메타 채팅에 직접 전달 (작업 채팅 검수 계층 스킵)
- 작업 채팅 독립 검수 없이 메타가 결과를 수신하여 검수 범위 축소
- 계층 스킵으로 인해 작업 채팅의 기술 검수 기회 소실 → 오류 미포착 상태로 다음 단계 진행

**올바른 접근:**
- 4-party 엄격 절차: Claude Code → 작업 채팅 우선 보고 → 작업 채팅 독립 검수 → 메타 동기화 → 메타 검수 → 태우 GO 전달
- 작업 채팅은 기술 검수 (코드·SQL·파일 변경 정확성), 메타는 전략·절차 검수 — 역할 분리 필수
- 태우는 양 채팅 간 결과 전달자이며, 검수 계층을 건너뛰는 판단 권한 없음

**회고 사례 (세션 17):**
1. UI-C-FIX 단계 2-B: Claude Code authStore 수정 결과를 태우가 메타에 직접 전달 → 작업 채팅 기술 검수 미경유 → snakeToCamel 변환 결함 추가 확인 지연. 관련 커밋: 0093617.
2. J-CLEANUP-001 첫 DELETE: Claude Code DELETE 실행 결과(FK 에러)를 태우가 메타에 직접 전달 → 작업 채팅 독립 검수 없이 메타가 재전략 수립 → 이후 옵션 C 재전략 시 작업 채팅 검수 계층 복원하여 안전 완료. 관련 커밋: bbfde05.

**재발 방지 체크리스트:**
- [ ] Claude Code 결과는 반드시 작업 채팅 우선 보고
- [ ] 태우는 작업 채팅 검수 완료 전 메타에 결과 전달 금지
- [ ] 작업 채팅 검수 = 기술 검수 (코드·SQL·파일 변경), 메타 검수 = 전략·절차 검수
- [ ] 계층 스킵 발생 시 즉시 인지 + 절차 복원 후 재진행

**핵심 원칙:** 4-party 모델의 안전망은 각 계층이 독립 검수를 수행할 때만 유효. 한 계층이라도 스킵되면 해당 계층의 검수 범위 전체가 소실되어 오류 전파 위험 증가.

**관련:**
- 교훈 37 (외부 인프라·구조 사전 검증 필수) — J-CLEANUP-001 사례 공유
- 교훈 35 (CHECK·FK 제약 pg_constraint 필수) — J-CLEANUP-001 기술 검수 대상

**관련 커밋:** 0093617 (UI-C-FIX authStore snakeToCamel 정정), bbfde05 (J-CLEANUP-001 옵션 C)

---

## 교훈 39 — 사전 확인 + 기능 검증 누락 방지

**맥락:** 세션 17 (2026-04-16). 트랙 J 전반에서 사전 확인 미실시 또는 기능 검증 누락으로 실행 후 결함 발견·재작업 반복 발생. "확인했다고 가정" → 실행 → 실패 → 재확인 패턴 공통.

**잘못된 접근:**
- 구현 전 기존 코드·DB 상태·환경 사전 확인 생략
- 구현 후 기능 검증(실제 동작 확인) 없이 코드 리뷰만으로 완료 판정
- 사전 확인과 기능 검증 중 하나만 수행하여 결함 누락

**올바른 접근:**
- 구현 전 사전 확인: 관련 코드·DB 스키마·환경 설정·기존 동작 실측
- 구현 후 기능 검증: 변경된 기능의 실제 동작 확인 (UI 렌더링·SQL 실행·API 응답)
- 사전 확인 → 구현 → 기능 검증 3단계 순서 필수

**회고 사례 (세션 17):**
1. UI-0-A: pgcrypto search_path 사전 미확인 → 구현 후 함수 호출 실패. 관련 커밋: 8da057a.
2. UI-A: authStore snakeToCamel 변환 사전 미확인 → is_active 필드 참조 실패. 관련 커밋: 0093617.
3. J-CLEANUP-001: FK 존재 여부 사전 미확인 (information_schema 결과 "0건" 수용) → DELETE 실패. 관련 커밋: bbfde05.
4. J-CLEANUP-001: auth_user_id FK delete_rule 사전 미확인 → 자동 NULL 동작 미파악.
5. UI-C-FIX 단계 2-B: authStore 수정 후 기능 검증 없이 완료 판정 → 후속 결함 발견.

**재발 방지 체크리스트:**
- [ ] 구현 전 관련 코드·DB·환경 실측 확인
- [ ] 구현 후 변경 기능 실제 동작 검증
- [ ] "확인했다고 가정" 금지 — 실측만 유효
- [ ] 사전 확인 → 구현 → 기능 검증 3단계 순서 준수

**핵심 원칙:** 사전 확인 없는 구현은 추측 기반 작업. 기능 검증 없는 완료 판정은 미확인 상태 방치. 양쪽 모두 필수.

**관련:**
- 교훈 37 (외부 인프라·구조 사전 검증 필수) — 사전 확인 구체 도메인
- 교훈 35 (CHECK·FK 제약 pg_constraint 필수) — DB 사전 확인 구체 도메인

**관련 커밋:** 8da057a (UI-0-B-2 search_path 정정), 0093617 (UI-C-FIX authStore snakeToCamel 정정), bbfde05 (J-CLEANUP-001 옵션 C)

---

## 교훈 40 — Claude Code 자율 결정 분류 체계

**맥락:** 세션 17 (2026-04-16). 세션 전반에서 Claude Code의 자율 결정이 다수 발생. 긍정적 자율 결정(효율 ↑)과 부정적 자율 결정(절차 위반·오류 전파)이 혼재. 자율 결정의 허용 범위와 금지 범위를 분류하여 운영 효율과 안전성 동시 확보 필요.

**잘못된 접근:**
- 자율 결정 전면 허용 → 절차 위반·검수 우회 위험
- 자율 결정 전면 금지 → 사소한 정정마다 보고·대기로 효율 저하
- 자율 결정 범위 미정의 → 사안별 판단 불일치

**올바른 접근:**

자율 결정 3등급 분류:

허용 (보고 불필요):
- 오타·포맷 정정 (본질 변경 없음)
- 명시된 지시안 내 세부 실행 순서 최적화

허용 (사후 보고):
- str_replace 통합 실행 (지시안 범위 내 효율화)
- old_str 유일성 확보를 위한 컨텍스트 확장
- 사전 view 결과 기반 minor 조정 (줄 번호 변동 등)

금지 (사전 승인 필수):
- 지시안 범위 외 파일 수정
- 커밋·push
- 새 기능 추가·삭제
- 4-party 절차 계층 스킵

**회고 사례 (세션 17):**
1. 긍정 사례 — str_replace 2회 통합: 교훈 35 보강 시 Claude Code가 섹션 신설 + 항목 추가를 2회 str_replace로 통합 실행. 지시안 범위 내 효율화로 정합 (사후 보고 등급).
2. 긍정 사례 — old_str 유일성 자율 확보: 교훈 37·38 추가 시 각 교훈 관련 커밋 줄을 고유 컨텍스트로 자율 선택. 정확성 ↑.
3. 긍정 사례 — 교훈 36 끝 `---` 미존재 감지 후 자율 추가: 사전 view 결과 기반 minor 조정.
4. 부정 사례 참조 — CLAUDE.md 기반 자율 진행: 새 세션 Claude Code가 CLAUDE.md 읽고 "4번 선택" 자율 권유 (절차 위반 위험).

**재발 방지 체크리스트:**
- [ ] Claude Code 지시안에 자율 결정 허용 범위 명시
- [ ] 금지 등급 행위 발생 시 즉시 정지 + 작업 채팅 보고
- [ ] 허용(사후 보고) 등급 행위는 결과 보고 시 명시
- [ ] 새 세션 Claude Code 자율 진행 방지 지시 포함

**핵심 원칙:** 자율 결정은 효율 도구이자 위험 요소. 등급 분류로 허용·보고·금지 범위를 명확화해야 안전성과 효율성 양립.

**관련:**
- 교훈 38 (4-party 절차 경계) — 금지 등급 위반 시 계층 스킵 연결
- 교훈 37 (외부 인프라·구조 사전 검증) — 자율 판단 금지 사례 (유일성 미확보 시 정지)

**관련 커밋:** bbfde05 (J-CLEANUP-001 옵션 C), 교훈 35 보강 str_replace 2회 통합 (커밋 미실행, unstaged)

---

## 교훈 41 — 4-party 공동 책임: 모든 참여자가 검증 주체

**맥락:** 세션 17 (2026-04-16). 세션 전반에서 4-party 모델(메타·작업·태우·Claude Code) 각 참여자의 검증 누락이 발생. 특정 참여자의 실수가 다른 참여자에 의해 포착되지 않고 전파된 사례 다수. 오류 책임은 발생자뿐 아니라 미포착한 검수 계층 전체에 공동 귀속.

**잘못된 접근:**
- 오류 발생자만 책임 귀속 → 다른 계층의 검수 누락 미인지
- "이전 계층이 검수했으므로 재확인 불필요" 가정
- 메타·작업 채팅이 각자의 검수 범위 외 오류를 "담당 아님"으로 간과

**올바른 접근:**
- 각 계층은 독립 검수 책임: 이전 계층 검수 결과와 무관하게 자체 검증
- 오류 전파 시 공동 책임: 발생자 + 미포착 계층 모두 회고 대상
- 메타도 예외 아님: 메타 자체 검증 누락도 동일 기준 적용

**회고 사례 (세션 17):**
1. 메타 자체 사례 — 형식 제안 시 사전 view 없이 제안: LESSONS_LEARNED.md 실측 형식(맥락·잘못·올바른)과 다른 형식(본질·핵심) 제안 → 작업 채팅이 실측 기반 정정. 메타도 교훈 37 원칙(실측 검증 필수) 적용 대상.
2. 메타 자체 사례 — "Lesson 32부터" 가정: userMemories 기반으로 "교훈 31까지만 존재" 가정 → 실측 교훈 36까지 존재 확인. Context Memory ≠ 실측 원칙(교훈 37) 메타 자체 위반.
3. 메타 자체 사례 — 박제 #13 초안 시 교훈 35 중복 미인지: 교훈 35와 중복되는 내용으로 초안 작성 → 작업 채팅 지적 후 교훈 37로 재설계. 사전 확인(교훈 39) 메타 자체 누락.
4. 작업 채팅 + Claude Code 사례 — FK 조사 information_schema 수용: Claude Code가 "FK 0건" 보고 → 작업 채팅 검수 시 미포착 → DELETE 실패. 발생(Claude Code) + 미포착(작업 채팅) 공동 책임.
5. 태우 사례 — 계층 스킵: Claude Code 결과를 작업 채팅 경유 없이 메타 직접 전달 (교훈 38 참조).

**재발 방지 체크리스트:**
- [ ] 각 계층은 이전 계층 검수 결과와 무관하게 독립 검증
- [ ] 오류 회고 시 발생자 + 미포착 계층 모두 식별
- [ ] 메타 자체 검증 누락도 동일 기준 회고 적용
- [ ] "담당 아님" 면책 금지 — 검수 범위 내 오류는 공동 책임

**핵심 원칙:** 4-party 모델에서 오류 책임은 발생자에 한정되지 않음. 각 검수 계층이 독립적으로 포착했어야 할 오류를 통과시킨 것 자체가 공동 책임.

**관련:**
- 교훈 38 (4-party 절차 경계, 계층 스킵 방지) — 절차 위반 구체 사례
- 교훈 37 (외부 인프라·구조 사전 검증) — 메타 자체 사례 원칙 위반 참조
- 교훈 39 (사전 확인 + 기능 검증) — 메타 자체 사전 확인 누락 참조

**관련 커밋:** 0093617 (UI-C-FIX authStore snakeToCamel 정정), bbfde05 (J-CLEANUP-001 옵션 C)

---

## 교훈 42 — Supabase Dashboard 환경 제약 인지

**맥락:** 세션 17 (2026-04-16). Supabase Dashboard SQL Editor에서 SQL 실행 시 환경 제약으로 예상과 다른 결과 발생. Dashboard 고유 제약을 사전 인지하지 않아 실행 실패·결과 오해석 반복.

**잘못된 접근:**
- Dashboard SQL Editor를 로컬 psql과 동일한 환경으로 가정
- Dashboard의 search_path·실행 권한·트랜잭션 동작 제약 미인지
- Dashboard 실행 결과를 환경 제약 고려 없이 그대로 수용

**올바른 접근:**
- Dashboard SQL Editor 고유 제약 사전 인지: search_path 기본값, 실행 권한(서비스 역할 vs anon), 트랜잭션 자동 커밋
- Dashboard 실행 시 환경 설정 명시적 선행 (SET search_path 등)
- Dashboard 결과 해석 시 환경 제약 필터 적용

**회고 사례 (세션 17):**
1. UI-0-A: Dashboard에서 pgcrypto 함수 실행 시 search_path에 extensions 미포함 → 함수 not found. SET search_path TO public, extensions 선행 필요. 관련 커밋: 8da057a.
2. J-CLEANUP-001: Dashboard에서 information_schema 조회 시 서비스 역할 기준 결과 반환 → 실제 FK 20건 중 0건 표시. pg_constraint 직접 조회로 해결. 관련 커밋: bbfde05.

**재발 방지 체크리스트:**
- [ ] Dashboard SQL 실행 전 환경 설정 확인 (search_path, 실행 권한)
- [ ] Dashboard 결과는 환경 제약 필터 적용 후 해석
- [ ] Dashboard ≠ psql 인지 — 환경 차이 사전 파악

**핵심 원칙:** Dashboard는 편의 도구이지 완전한 SQL 실행 환경이 아님. 환경 제약을 사전 인지하고 결과를 필터링해야 오해석 방지.

**관련:**
- 교훈 14 (RLS 동작 검증 Dashboard SQL Editor 필수) — Dashboard 활용 맥락
- 교훈 37 (외부 인프라·구조 사전 검증) — search_path 검증 구체 사례
- 교훈 35 (CHECK·FK 제약 pg_constraint 필수) — information_schema 제약 구체 사례

**관련 커밋:** 8da057a (UI-0-B-2 search_path 정정), bbfde05 (J-CLEANUP-001 옵션 C)

---

## 교훈 43 — CTE(WITH 절) 가시성 한계: 단일 statement scope

**맥락:** 세션 17 (2026-04-16). SQL CTE(WITH 절)로 정의한 임시 결과 집합을 후속 statement에서 참조하려 시도하여 실패. CTE는 SQL 표준상 단일 statement 내에서만 유효하며, 별도 statement에서는 참조 불가.

**잘못된 접근:**
- CTE를 정의한 뒤 별도 statement(세미콜론 이후)에서 CTE 이름 참조
- CTE를 임시 테이블과 동일하게 취급 (세션 scope로 오해)

**올바른 접근:**
- CTE 정의와 참조를 반드시 단일 statement 내에 결합
- 여러 statement에서 재사용 필요 시 임시 테이블(CREATE TEMP TABLE) 사용
- CTE scope = 해당 WITH 절이 속한 단일 SELECT/INSERT/UPDATE/DELETE statement

**회고 사례 (세션 17):**
1. J-CLEANUP-001 검증 쿼리: WITH 절로 FK 조사 결과를 정의한 뒤 별도 SELECT에서 참조 시도 → "relation does not exist" 에러. CTE와 SELECT를 단일 statement로 결합하여 해결.

**재발 방지 체크리스트:**
- [ ] CTE 사용 시 참조 statement가 동일 WITH 블록 내인지 확인
- [ ] 다중 statement 재사용 필요 시 임시 테이블 전환 검토
- [ ] CTE ≠ 임시 테이블 인지

**핵심 원칙:** CTE는 단일 statement의 가시성 범위 내에서만 유효. statement 경계를 넘는 참조는 SQL 표준상 불가.

**관련:**
- 교훈 36 (MCP 다중 쿼리 특성) — 다중 statement 실행 시 도구 제약 (본질 구별: 교훈 36은 도구 반환 제약, 교훈 43은 SQL 문법 scope)
- 교훈 42 (Dashboard 환경 제약) — SQL 실행 환경 인지

**관련 커밋:** bbfde05 (J-CLEANUP-001 옵션 C)

---

## 교훈 44 — UI 시각 마커: 상태 구분은 텍스트가 아닌 시각 요소로

**맥락:** 세션 17 (2026-04-16). 트랙 J UI 작업에서 데이터 상태(활성/비활성, 유형 구분 등)를 텍스트만으로 표시하여 사용자 인지 효율 저하. 시각 마커(색상·아이콘·배지) 추가로 즉시 구분 가능하도록 개선.

**잘못된 접근:**
- 상태 구분을 텍스트 라벨만으로 표시 (예: "활성", "비활성" 문자열)
- 목록 내 항목 간 시각적 차이 없음 → 스캔 효율 저하

**올바른 접근:**
- 상태별 색상 코드 적용 (활성=녹색, 비활성=회색 등)
- 아이콘·배지로 즉시 식별 가능한 시각 마커 추가
- 텍스트 + 시각 마커 병행 (접근성 확보)

**회고 사례 (세션 17):**
1. 직종 관리 UI: job_type 활성/비활성 상태를 텍스트만으로 구분 → 색상 배지 추가로 즉시 식별 개선.

**재발 방지 체크리스트:**
- [ ] 상태 구분이 필요한 UI 요소에 시각 마커 필수 적용
- [ ] 텍스트 + 시각 마커 병행 (접근성)
- [ ] 목록·테이블 항목 간 시각적 구분 확인

**핵심 원칙:** 사용자는 텍스트를 읽기 전에 시각 패턴을 인지. 상태 구분은 시각 마커가 우선, 텍스트는 보조.

**관련:**
- 교훈 39 (사전 확인 + 기능 검증) — UI 기능 검증 시 시각 마커 포함 확인

**관련 커밋:** 세션 17 트랙 J UI 커밋

---

## 교훈 45 — Supabase 테이블 생성 시 자동 권한 부여 인지

**맥락:** 세션 17 (2026-04-16). Supabase에서 새 테이블 생성 시 anon·authenticated 역할에 자동으로 기본 권한이 부여되는 동작을 미인지하여 보안 설정 누락 또는 불필요한 수동 GRANT 실행.

**잘못된 접근:**
- 새 테이블 생성 후 권한 상태 미확인 → 의도치 않은 공개 접근 가능
- Supabase 자동 권한 부여 동작 미인지 상태에서 수동 GRANT 중복 실행
- RLS 활성화 없이 테이블 생성 → 자동 부여 권한으로 데이터 노출 위험

**올바른 접근:**
- 새 테이블 생성 직후 권한 상태 확인 (pg_roles + information_schema.role_table_grants)
- Supabase 자동 권한 부여 범위 인지 (anon·authenticated 기본 SELECT 등)
- RLS 즉시 활성화 + 정책 설정 후 권한 최종 확인
- 불필요한 권한은 명시적 REVOKE

**회고 사례 (세션 17):**
1. 트랙 J 테이블 작업: 새 테이블 생성 후 RLS 미활성 상태에서 anon 역할에 자동 SELECT 권한 부여 확인 → RLS 활성화 + 정책 추가로 보안 확보.

**재발 방지 체크리스트:**
- [ ] 새 테이블 생성 직후 자동 부여 권한 확인
- [ ] RLS 즉시 활성화 + 정책 설정
- [ ] 불필요 권한 REVOKE
- [ ] Supabase 자동 권한 부여 동작 사전 인지

**핵심 원칙:** Supabase는 편의를 위해 자동 권한을 부여하지만, 이는 보안 기본값이 아님. 생성 직후 권한 확인 + RLS 활성화가 필수.

**관련:**
- 교훈 14 (RLS 동작 검증 Dashboard SQL Editor 필수) — RLS 검증 방법
- 교훈 37 (외부 인프라·구조 사전 검증) — 자동 권한 = 외부 인프라 동작 검증 대상

**관련 커밋:** 세션 17 트랙 J 테이블 관련 커밋

---

## 교훈 46 — esbuild(Vite) `??`와 `||` 혼용 시 괄호 필수

**맥락:** Phase 1 세션 18 (2026-04-21), `_screens.jsx` P1-d 실데이터 바인딩 빌드 중 발생.

**문제:**
```js
// 빌드 실패 ✗
return t.title ?? [crop, zone].filter(Boolean).join(' · ') || '작업';
```
esbuild는 `??`와 `||`를 같은 표현식에서 혼용할 때 연산자 우선순위 모호성을 에러로 처리한다.
표준 JS 명세상 실제로 모호하지 않아도 빌드 도구 수준에서 명시적 괄호를 요구한다.

**해결:**
```js
// 빌드 성공 ✓
return t.title ?? ([crop, zone].filter(Boolean).join(' · ') || '작업');
```

**Why:** Vite가 사용하는 esbuild 트랜스파일러가 `??`와 `||`/`&&`를 혼용한 표현식을 파서 레벨에서 거부함.
TC39 제안(ES2020)에서 이 조합을 괄호 없이 허용하지 않는 규칙을 명시하기 때문.

**How to apply:** 
- `??` 뒤에 `||` 또는 `&&`를 이어 쓸 때는 항상 한쪽을 괄호로 감싼다.
- ESLint rule `no-mixed-operators`를 켜두면 사전에 감지 가능.

**관련 커밋:** 50593b4 (feat(P1-d))

---

## 교훈 47 — 지시서 분리 구조(README/PART-A~C/SCRIPTS)가 Claude Code 실행 정확도를 높인다

**맥락:** Phase 1 세션 19 (2026-04-22), 목업 재이식 + 신규 화면 구현.

**관찰:**
지시서를 단일 문서가 아닌 역할별 파일로 분리했을 때 (README.md, PART-A.md, PART-B-신규.md, PART-C.md, TROUBLESHOOTING.md, SCRIPTS.md) Claude Code가 각 PART를 순서대로 독립 실행하기 쉬웠고, 이전 세션에서 이미 완료된 PART A를 grep 검증으로 빠르게 건너뛸 수 있었다.

**Why:** 단일 장문 지시서는 Claude Code가 "현재 어디까지 왔는가"를 판단하기 어렵다. PART 단위 분리는 완료 여부 판단과 재진입 지점을 명확히 한다.

**How to apply:**
- 세션 작업이 3개 이상 독립 단위로 나뉠 때는 PART-A/B/C 파일로 분리 작성.
- 각 PART 첫 줄에 "이미 완료 여부 판단 기준"을 명시해두면 재진입 시 중복 작업 방지.

**관련:** 세션 19 지시서 구조 (c:\Users\김태우\Downloads\ 내 7개 md 파일)

---

## 교훈 48 — PART 완료 여부는 git log만으로 판단 금지, 파일 grep 검증 필수

**맥락:** Phase 1 세션 19 (2026-04-22), 세션 종료 점검.

**문제:**
git log --oneline 으로는 "어떤 파일이 어느 상태인지"를 알 수 없다. 커밋 메시지가 "PART A 완료"라고 적혀 있어도 실제 파일에 Object.assign(window, ...) 잔존 여부, import React 누락 여부, export 정상 여부를 보장하지 않는다.

**해결:**
세션 종료 점검 시 다음 3개 grep을 반드시 실행:
```bash
grep -rn "Object\.assign(window" src/           # 0건이어야 정상
grep -rn "React\.use" src/ | grep -v "React\.Fragment"  # 0건이어야 정상
grep -L "import React" src/design/*.jsx src/pages/**/*.jsx  # 출력 없어야 정상
```

**Why:** 커밋은 "작업을 시도했다"는 기록이지 "결과가 정확하다"는 증명이 아니다. 파일 상태는 파일 자체를 봐야 알 수 있다.

**How to apply:**
- PART 완료 선언 전 반드시 파일 grep 검증 실시.
- git log는 커밋 범위 파악용, 완료 판단은 grep/read 기반으로.

**관련 커밋:** cc41f0c (feat(session19))
