# 트랙 77 U17 라운드 보고서 — cleanup 검증 + 운영 인덱스 박제

**작성일**: 2026-05-03
**라운드 명**: track77-u17 (cleanup, 변경 0 src/, docs/ only)
**기준 커밋**: `8025e55` (U16 push)
**선행**: U11(진단) / U12(세션 fix) / followup-u11(사진 첨부) / U13(상세 모달) / U14(실패) / U15(정정) / U16(snakeToCamel fix)

---

## 1. 작업 결과

### 1.1 변경 통계
- 변경 파일: 3건 (모두 `docs/`)
  - 신규: `docs/TRACK77_FOLLOWUP_INDEX.md` — 후속 라운드 인덱스 + CCB/Codex 자율 협업 표준
  - 신규: `docs/TRACK77_U17_REPORT.md` (본 보고서)
  - 갱신: `docs/LESSONS_LEARNED.md` — 148 박제 (cleanup 라운드 표준 패턴)
- src/ 변경 0건 ✅
- 빌드 영향 0 (docs only)

### 1.2 cleanup 검증 6건 — 모두 통과 ✅

| # | 항목 | 결과 |
|---|---|---|
| 1 | 진단 임시 스크립트 잔존 (G77-PP) | ✅ 0건 (find/git ls 모두 empty) |
| 2 | 진단 로그 잔존 (G77-NN/P) | ✅ 0건 (TRACK77-U11/U15/U16-DIAG 모두 grep 0) |
| 3 | 자격증명 / .env 흔적 (G77-QQ) | ✅ .gitignore 박제 + tracked 0건 + 워킹트리 정상 |
| 4 | Sidebar dead code 삭제 (G77-II) | ✅ 부재 + 삭제 이력 7a39978 + import 0건 |
| 5 | LESSONS 138~147 박제 일관성 | ✅ 11건 모두 line 2933~3113 박제 |
| 6 | BACKLOG TRACK77-* 항목 status | ✅ resolved 1 / in-progress 1 / wontfix 1 / open 13 |

## 2. cleanup 검증 결과 (raw 명령 결과 박제)

### 2.1 진단 임시 스크립트 (G77-PP)
```
$ find scripts/ -name "diag-*"
(empty)

$ git ls-files scripts/ | grep -i diag
(empty)
```
✅ U16 cleanup에서 4건 삭제 완료 후 잔존 0.

### 2.2 진단 로그 (G77-NN / U12 P)
```
$ grep -rn "TRACK77-U15-DIAG\|TRACK77-U11-DIAG\|U16-DIAG" src/
(empty)
```
✅ U12에서 U11-DIAG 제거, U16에서 U15-DIAG 제거 완료. 잔존 0.

### 2.3 자격증명 / .env (G77-QQ)
```
$ cat .gitignore | grep -E "^\.env"
.env
.env.*

$ git ls-files | grep -E "^\.env"
.env.example          ← 예시 파일만 (자격증명 X)

$ ls -la .env*
.env                  ← anon key + Firebase (gitignore 처리, 정상)
.env.example
```
✅ 자격증명은 .env(gitignored)에만, git tracked는 .env.example(샘플)만. Playwright 미진행이라 사용자 비밀번호 변경 부담 없음.

### 2.4 Sidebar dead code (G77-II)
```
$ find src -name "Sidebar.jsx" -path "*components/layout*"
(empty)

$ git log --diff-filter=D --pretty=format:"%h" -- src/components/layout/Sidebar.jsx
7a39978                ← U15 commit

$ grep -rn "from.*components/layout/Sidebar" src/
(empty)
```
✅ U15에서 dead code 삭제 완료. 삭제 이력 + 워킹 트리 부재 + import 0건.

### 2.5 LESSONS 138~147
```
2933: ## 교훈 138 — git push 누락 → 사용자가 시각 변화 못 봄
2949: ## 교훈 139 — 시안 메타 주석 vs 실제 코드 매칭 검증
2967: ## 교훈 140 — latent bug 동일 패턴 grep 일괄 회수
2985: ## 교훈 141 — 자율 시행 + 사후 보고 흐름의 균형점
3006: ## 교훈 142 — Sub-Agent 회귀 검수 효과
3030: ## 교훈 143 — byte-identical 보존 패턴
3047: ## 교훈 144 — Supabase Management API + .mcp.json access_token
3065: ## 교훈 145 — 비공개 Storage 버킷 + getPublicUrl() 호환 함정
3093: ## 교훈 146 — 화면→컴포넌트 매핑 검증 없이 파일 수정 지시 금지
3113: ## 교훈 147 — snakeToCamel shallow 한계 + Supabase Management API 자율 진단 패턴
```
✅ 138~147 11건 박제 + 본 라운드 148 신규 추가.

### 2.6 BACKLOG TRACK77-* (16건)
- resolved: TRACK77-ISSUE-ADMIN-PHOTOS-001 (U13)
- in-progress: TRACK77-STORAGE-ISSUE-PHOTOS-001 (followup-u11, 사용자 SQL 검증 후 resolved)
- wontfix(잠정): TRACK77-WORKER-MORE-RECON-001
- open: 13건 (RLS / LIGHTBOX / PHOTO-DELETE / MOBILE-ADMIN / WORKER-PHOTO-VIEW / HQSIDEBAR / DEAD-CODE-AUDIT / NOTICE-READS / GROWTH-SURVEY-UI / TASK-DETAIL / ISSUE-PAGE-DELETE / HOLIDAYS-AUTO / STATES-EXPAND / PUNCH-V2-TOAST)

## 3. 자산 보존 검증 (7건)

src/ 변경 0건 → 모든 자산 자동 보존:

| # | 자산 | 결과 |
|---|---|---|
| 1 | 출퇴근 v2 (WorkerHome.jsx 25-204) | ✅ 미변경 |
| 2 | FCM (WorkerLayout.jsx 39-66) | ✅ 미변경 |
| 3 | QR-CORE (QrScanPage.jsx 45-118) | ✅ 미변경 |
| 4 | 76-A 자산 | ✅ 미참조 |
| 5 | PWA 설치 안내 모달 | ✅ 미변경 |
| 6 | DB 스키마 / Storage 정책 | ✅ 변경 0건 |
| 7 | 기존 T 토큰 | ✅ 미변경 |

## 4. 자율 결정 자율 처리 내역

### G77-TT: 후속 라운드 인덱스 박제 = **옵션 B (별 파일)** `docs/TRACK77_FOLLOWUP_INDEX.md`
- **권고 근거**:
  1. 기존 `TRACK77_HANDOVER.md`는 본 트랙 U10까지로 클로즈된 상태 — 부록 추가 시 의미 혼란
  2. 별 파일은 후속 라운드만 모아 인덱스 명확
  3. HANDOVER vs FOLLOWUP_INDEX 검색 시 명확한 진입점 제공
- **대안**: 옵션 A (HANDOVER §13 부록) — 의미 혼란 우려

### G77-UU: LESSONS / BACKLOG 일관성 = **모두 ✅, 갱신 0건**
- 검증 결과 모두 정상. 추가 갱신 불필요.

### G77-VV: cleanup 결과 잔존 0건 = **변경 0건 docs commit**
- src/ 변경 0건 → 빌드 검증 생략 가능 (docs only)
- 단 본 라운드는 `docs/` 변경 3건 (FOLLOWUP_INDEX 신규 + LESSONS 148 + 본 보고서)

### G77-WW: 잔존 발견 시 정리 = **미발생** (모두 ✅)

### G77-XX: 표준 §N (CCB/Codex 자율 협업) = **`TRACK77_FOLLOWUP_INDEX.md` §4에 박제**
- 본 라운드부터 모든 후속 라운드 표준
- Codex 위임 적합/부적합/금지 영역 명시
- 보고서 §N 박제 의무 규정

## 5. 후속 라운드 인덱스 박제 위치

`docs/TRACK77_FOLLOWUP_INDEX.md`:
- §0 본 인덱스의 위치
- §1 후속 라운드 일람 (U11~U17)
- §2 라운드별 산출물 위치
- §3 사용자 의견 매칭
- §4 CCB/Codex 자율 협업 표준
- §5 BACKLOG 후속 트랙 일람 (16건)
- §6 약속 박제 일람 (G77-* 라운드별)
- §7 다음 의견 진입 시 권고

## 6. 표준 §N — CCB / Codex 자율 협업 흐름 박제

`TRACK77_FOLLOWUP_INDEX.md` §4에 박제 (본 라운드부터 모든 후속 라운드 적용):

### 6.1 흐름
운영 채팅방 → Claude Code/CCB → Codex(자율 위임) → 보고서 → 검수 → 사용자 검증

### 6.2 Codex 위임 적합 영역
단일 파일 / 자기-완결적 코드 변경 / 신규 컴포넌트 / 단일 함수 리팩터링 / 표준 패턴 일괄 적용 / 임시 스크립트

### 6.3 Codex 위임 부적합 영역 (Claude Code 직접)
자산 보존 7건 인접 / 다중 파일 영향 / dead code 식별 / DB 스키마 / 외부 인프라 / 자율 진단 / 결정 게이트 / 보고서 작성

### 6.4 Codex 절대 금지
자격증명 / .env / DB 마이그레이션 적용 / 자산 보존 byte-identical 직접 수정 / 결정 권고

### 6.5 보고서 박제 의무
각 라운드 §N에 Codex 위임 횟수 + 영역 + 검토 결과 + 자율 결정 근거 (G77-* ID)

## 7. 자가 검증 결과 (C1~C9)

| C# | 항목 | 결과 |
|---|---|---|
| C1 | 빌드 (src/ 변경 0이라 docs only — 빌드 검증 생략) | ✅ 영향 없음 |
| C2 | cleanup 검증 6건 raw 결과 박제 | ✅ §2 |
| C3 | 자산 보존 7건 미변경 | ✅ §3 |
| C4 | git log 후속 라운드 매칭 | ✅ a28ed35 → 8025e55 → U17 commit |
| C5 | LESSONS 138~148 박제 일관성 | ✅ 148 신규 추가 |
| C6 | BACKLOG TRACK77-* status 일관성 | ✅ resolved/in-progress/wontfix/open 분류 정확 |
| C7 | 후속 라운드 인덱스 박제 (옵션 B) | ✅ TRACK77_FOLLOWUP_INDEX.md 신규 |
| C8 | git push origin main | (커밋 후 보고) |
| C9 | docs only commit이면 webhook 무관 | ✅ Vercel 빌드는 src/ 변경 시 트리거. docs는 무관 |

## 8. 발견 사항

### 8.1 LESSONS 누락 0 / BACKLOG 갱신 불필요
- 138~147 모두 박제됨
- BACKLOG status 일관성 ✅

### 8.2 후속 라운드 표준화 효과
- `TRACK77_FOLLOWUP_INDEX.md` 박제로 향후 사용자/검수자 진입점 명확
- CCB/Codex 자율 협업 흐름 사전 박제 → 다음 의견 진입 시 재정의 불필요

### 8.3 본 라운드 사용자 검증 부담 0
- src/ 변경 0건 → 화면 변화 없음
- 빌드 영향 없음
- 보고서 검수만으로 충분

## 9. 다음 의견 진입 권고

운영 채팅방 → 사용자 의견 4 진입 시:
1. 본 인덱스 §4 표준 흐름 추종
2. 자산 보존 7건 영향 사전 평가
3. 자율 결정 항목 사전 박제 (G77-YY부터)
4. Claude Code/CCB가 Codex 위임 결정 시 §4.3 적합/부적합 표 참조

---

**끝.**
