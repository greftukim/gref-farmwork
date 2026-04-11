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

## 교훈 6 — 교훈 9 (미수록)

> **주의:** 교훈 6~9는 Phase 3·4 세션의 교훈으로 추정되나,
> 해당 핸드오버 문서가 레포에 커밋되지 않아 원문 추출 불가.
> Phase 5 세션 1 핸드오버(`docs/HANDOVER_PHASE5_SESSION1.md`)에
> "교훈 1–9 (Phase 4 이전 문서 참조)"로만 언급됨.
> 원문이 확인되는 시점에 이 섹션을 채울 것.

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
