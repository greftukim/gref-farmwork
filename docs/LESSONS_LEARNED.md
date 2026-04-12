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
