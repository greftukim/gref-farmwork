# 다음 운영 채팅방 진입 지시문 — 트랙 77 후속 + 운영 인프라

**작성일**: 2026-05-04
**작성 주체**: 본 세션 (운영 채팅방 ↔ Antigravity Claude Code)
**대상**: 신규 운영 채팅방 (컨텍스트 인계 후 즉시 진행 가능)
**기준 커밋**: `8ca7fde` (origin/main HEAD, U-INFRA-PLAYWRIGHT-001 후)

---

## 0. 즉시 박제 (TL;DR)

1. **트랙 77 본 트랙 클로징 완료** (`33bfb18`, U10) — `docs/TRACK77_HANDOVER.md`
2. **후속 라운드 U11~U21 모두 commit/push 완료** — `docs/TRACK77_FOLLOWUP_INDEX.md` 참조
3. **운영 인프라 U-INFRA-PLAYWRIGHT-001 완료** — Playwright MCP 셋업 ✅ (다음 세션 자동 활성화)
4. **사용자 검증 대기 중**: U18~U21 시나리오 (S1~S60+) — 사용자 OK 시 클로징
5. **자산 보존 7건 byte-identical** 모든 라운드 유지

---

## 1. 최근 커밋 (origin/main)

```
8ca7fde docs(infra-playwright): MCP 셋업 + 시연 절차 박제 + LESSONS 157
f3a5113 feat(track77-u21): 작업 모달 작물·줄범위 UI 제거 + crop 자동 derive
d661ef6 feat(track77-u20): 온실 정보 관리 3탭 — 별 트랙 TRACK77-FOLLOWUP-ZONE-METADATA-001
6e419bd feat(track77-u19): 작업 관리 툴바 정리 — 상태 칩 제거 + 동 row 숨김 + 완료 약화 + §5 시안 정책 박제
96f3549 feat(track77-u18): 작업 관리 재설계 — 칸반 제거 + 주간 매트릭스 + 일별 뷰
9885f97 docs(track77-u17): cleanup 검증 + 운영 인덱스 박제
```

기타 U11~U16: `docs/TRACK77_FOLLOWUP_INDEX.md` §1 참조.

---

## 2. 라운드별 진행 상태 + 검증 대기

| 라운드 | 영역 | 검증 대기 시나리오 | 보고서 |
|---|---|---|---|
| U11~U16 | 작업자 세션 / 이상신고 사진 / 사이드바 메뉴 | ✅ 검증 통과 | (각 라운드 보고서) |
| U17 | cleanup + 표준 §4 박제 | ✅ 검증 통과 | `docs/TRACK77_U17_REPORT.md` |
| U18 | 작업 관리 재설계 (칸반 제거 + 주간/일별) | ✅ 검증 통과 (의견 4 클로징) | `docs/TRACK77_U18_REPORT.md` |
| U19 | 작업 관리 툴바 정리 | ✅ 검증 통과 (의견 5: 1+2+3 클로징) | `docs/TRACK77_U19_REPORT.md` |
| **U20** | 온실 정보 관리 3탭 (별 트랙 1) | **🟡 사용자 검증 대기 (S1~S20)** | `docs/TRACK77_U20_REPORT.md` |
| **U21** | 작업 모달 작물·줄범위 제거 + crop 자동 derive | **🟡 사용자 검증 대기 (S1~S11)** | `docs/TRACK77_U21_REPORT.md` |
| U-INFRA | Playwright MCP 셋업 | ✅ 셋업 완료 (다음 세션 도구 자동 활성화) | `docs/U_INFRA_PLAYWRIGHT_REPORT.md` |

---

## 3. 즉시 진행 가능한 영역 (신규 채팅 진입 시)

### 3.1 우선순위 — 사용자 검증 결과 회신 받기
사용자가 U20 (S1~S20) + U21 (S1~S11) 시나리오 검증 진행 중. 결과 회신 시:
- ✅ 통과: 클로징 + BACKLOG 정리 + 다음 라운드 진입 결정
- ⚠ 회귀/이슈: 본 세션 분석 → 시안 (필요 시) → 핫픽스 라운드 (예상 U22)

### 3.2 Playwright MCP 도구 활성화 (다음 세션 = 신규 채팅 진입 시 자동)
- 이전 세션에서 `claude mcp add playwright --scope project` 완료
- `.mcp.json`에 박제됨 (`.gitignore` 등록 → 커밋 영향 0)
- **신규 세션 진입 시 ToolSearch에 `browser_navigate` / `browser_snapshot` / `browser_take_screenshot` 등 자동 노출**
- 활용 가능 영역: U18~U21 사용자 검증 자동화 / 회귀 검증

### 3.3 후속 별 트랙 후보 (BACKLOG `docs/BACKLOG.md`)
사용자 결정 후 진입:

| ID | 한 줄 |
|---|---|
| TRACK77-FOLLOWUP-MATERIAL-CALC-001 | 자재 소요량 계산기 (P2 — 종자/파종판/블록/슬라브) |
| TRACK77-FOLLOWUP-PURCHASE-ORDER-001 | 자재 발주·가격 (P3) |
| TRACK77-CROP-MASTER-MGMT-001 | crops 마스터 추가/수정 UI (현재 SQL only) |
| TRACK77-DENSITY-INLINE-EDIT-001 | 탭3 재식밀도 인라인 편집 |
| TRACK77-ZONE-INFO-MOBILE-001 | 온실 정보 모바일 호환 |
| TRACK77-TASK-DEAD-CODE-001 + TASKFILTERS | TaskColumn/WeekView/FocusList/TaskFilters 일괄 삭제 |
| TRACK77-NOTICE-READS-MIGRATION-001 | 공지 읽음 DB 마이그레이션 |
| TRACK77-STATES-EXPAND-001 | Loading/Empty/Error 일괄 적용 |

---

## 4. 운영 표준 (반드시 추종)

### 4.1 CCB / Codex 자율 협업 — `docs/TRACK77_FOLLOWUP_INDEX.md` §4
- 본 환경(Antigravity 단일 Claude Code) → Codex 위임 0건
- 향후 CCB 환경 진입 시 §4.3 적합/부적합 표 추종

### 4.2 시안 작성 영구 정책 — `docs/TRACK77_FOLLOWUP_INDEX.md` §5
- 큰 변경 (UI 재설계 / 다중 파일) → **시안 필수** (visualize:show_widget)
- 중간 변경 (단일 파일 + 시각 변화) → **시안 권고**
- 작은 수정 (라벨 / 1라인 fix) → 생략 가능
- 흐름: [의견] → [분석] → [시안 (필요 시)] → [지시문] → [CCB/Codex] → [보고서] → [검수] → [사용자 검증]

### 4.3 자산 보존 7건 (불변) — 모든 라운드 byte-identical 의무
1. 출퇴근 v2 (`src/pages/worker/WorkerHome.jsx:25-204`)
2. FCM (`src/components/layout/WorkerLayout.jsx:39-66`)
3. QR-CORE (`src/pages/worker/QrScanPage.jsx:45-118`)
4. 76-A 자산 (`src/components/task/AssignWorkersModal.jsx`, `src/lib/zoneColors.js`, `WeekMatrixView/DayView`)
5. PWA 모달 (`src/components/PWAInstallGuideModal.jsx`)
6. DB 스키마 (기존 테이블 ALTER 0건)
7. T 토큰 (`src/design/primitives.jsx`의 `const T` / `const T_worker` 객체)

검증: `git diff <baseline>..HEAD -- <file> | wc -l` → 0줄 (T 객체는 grep)

### 4.4 LESSONS 핵심 (최근 박제)
- **149**: 자산 보존 인접 변경 시 별 파일 분리 정책
- **150**: 필터 UI는 row 숨김 + 카운트 갱신 패턴
- **151**: 데이터 라이프사이클 분리 (영구 vs 회차 vs 이벤트)
- **152**: 엑셀 산식 → 클라이언트 derive 전략 (입력만 DB, 단계 분리)
- **153**: UI 필드 제거 시 DB 컬럼 / 다른 흐름 의존성 검증
- **157**: Antigravity + MCP 서버 hot-add 한계 + 다음 세션 활성화 패턴

### 4.5 인프라 도구
- **Supabase Management API** — `node scripts/run-sql.cjs <file>` 또는 `--query "SQL"`
  - `.mcp.json` SUPABASE_ACCESS_TOKEN 활용 (RLS 우회 + DDL 가능)
  - LESSONS 144 박제
- **Playwright MCP** — 다음 세션 자동 활성화 (U-INFRA 보고서)
- **시안 도구** — `visualize:show_widget` (운영 채팅방, HTML 인터랙티브)

---

## 5. 기준 컨텍스트 (사용자가 운영 채팅방에 박제할 핵심)

### 5.1 도메인
GREF FarmWork — 부산LAB 벤로형 유리 온실 인력관리 앱.
React 18 + Vite + Tailwind + Supabase + Zustand. PWA. 사내 직원 ~10명.

### 5.2 사용자 = 단일 결정권자
박민식·김민국 답변 대기 분류 금지 (`memory/feedback_decision_owner.md`).

### 5.3 최근 사용자 의견 흐름
1. **의견 4** (U18) — 작업 관리 칸반 제거 + 매트릭스 + 일별 ✅
2. **의견 5** (U19, 3건) — 상태 칩 제거 / 동 row 숨김 / 시안 정책 영구 박제 ✅
3. **별 트랙 1** (U20) — 온실 정보 관리 (AI 학습 누적) — 검증 대기 🟡
4. **의견 6** (U21) — 작업 모달 작물·줄범위 제거 + 자동 derive — 검증 대기 🟡
5. **인프라 의견** (U-INFRA) — Playwright MCP 셋업 자율 진행 ✅

### 5.4 핵심 박제 위치
- 운영 인덱스: `docs/TRACK77_FOLLOWUP_INDEX.md`
- 본 트랙 핸드오버: `docs/TRACK77_HANDOVER.md`
- 부채: `docs/BACKLOG.md`
- 교훈: `docs/LESSONS_LEARNED.md`
- 마이그레이션: `docs/migrations/U11_issue_photos.sql`, `U20_zone_metadata.sql`
- 자율 SQL 헬퍼: `scripts/run-sql.cjs`

---

## 6. 신규 채팅 진입 시 1단계 절차 (CLAUDE.md §세션 시작 추종)

```
1. git log -8 --oneline → 최근 8개 확인
2. docs/TRACK77_FOLLOWUP_INDEX.md 읽기 (운영 인덱스)
3. docs/HANDOVER_NEXT_SESSION.md 읽기 (본 문서)
4. docs/BACKLOG.md 전체 읽기
5. docs/LESSONS_LEARNED.md 최근 박제 (149~157) 확인
6. ToolSearch query "browser_navigate" → Playwright MCP 도구 노출 확인
   (노출되면 다음 세션 자동 활성화 ✅, 안 되면 또 다음 세션까지 대기)
7. 사용자 검증 결과 회신 대기 또는 신규 의견 진입
```

---

## 7. 신규 채팅 시작 메시지 권고 (사용자 → Claude Code)

사용자가 신규 운영 채팅방 / Antigravity Claude Code에 다음 메시지로 진입:

```
다음 핸드오버 추종해서 진행해줘:
- docs/HANDOVER_NEXT_SESSION.md
- docs/TRACK77_FOLLOWUP_INDEX.md (§4 CCB/Codex 표준, §5 시안 정책)
- docs/LESSONS_LEARNED.md (149~157)
- docs/BACKLOG.md

상태:
- U20 (온실 정보 3탭) + U21 (작업 모달 정리) 검증 대기 중
- Playwright MCP 셋업 완료 — ToolSearch로 도구 활성화 확인
- 사용자 검증 결과 또는 신규 의견 진입 대기

1단계: ToolSearch로 browser_navigate 등 Playwright 도구 노출 확인 + git log -8 후 보고.
```

---

## 8. 미해결 항목 (의식적으로 보류 중)

| 항목 | 상태 | 결정 시점 |
|---|---|---|
| U20 사용자 검증 (S1~S20) | 대기 | 사용자 회신 시 |
| U21 사용자 검증 (S1~S11) | 대기 | 사용자 회신 시 |
| TRACK77-FOLLOWUP-MATERIAL-CALC-001 | 대기 | U20 검증 통과 후 사용자 결정 |
| crops 마스터 UI (TRACK77-CROP-MASTER-MGMT-001) | 대기 | 작물 추가 빈도 추적 후 |
| dead code 일괄 삭제 (TaskColumn/WeekView/FocusList/TaskFilters) | 대기 | 별 라운드 — 운영 안정성 확인 후 |
| H-4~H-7 (인앱 챗봇 v1) | 보류 | 도메인 결정 후 |
| 트랙 G (포장 작업) | 보류 | 박민식·김민국 상의 후 |

---

## 9. 자율 진행 권한 (사용자 사전 승인된 영역)

다음 영역은 운영 채팅방 + Claude Code 자율 진행 가능 (사용자 회신 불필요):
- ✅ 자산 보존 7건 byte-identical 검증
- ✅ 빌드 실패 시 즉시 fix
- ✅ 마이그레이션 SQL 자율 실행 (`scripts/run-sql.cjs`)
- ✅ 자율 진단 (Supabase MCP / Playwright MCP — public 페이지)
- ✅ G77-* / INFRA-* 자율 결정 (보고서 §자율 결정에 박제)
- ✅ LESSONS / BACKLOG 신규 박제

다음 영역은 사용자 명시 승인 필수:
- ❌ 자격증명 입력 / .env 변경
- ❌ 외부 인프라 변경 (DNS / Vercel 설정 / FCM 키 / Supabase 프로젝트 설정)
- ❌ 자산 보존 7건 핵심 수정
- ❌ destructive git (force push / reset --hard / branch -D)

---

**끝.**

본 핸드오버 + `docs/TRACK77_FOLLOWUP_INDEX.md` + `docs/LESSONS_LEARNED.md` 추종하면 신규 채팅에서 즉시 진행 가능. 사용자 부담 = 검증 결과 회신 또는 신규 의견만.
