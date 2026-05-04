# 트랙 77 후속 라운드 인덱스

**작성일**: 2026-05-03
**범위**: 트랙 77 본 트랙 U10 클로징 이후 후속 라운드 (U11~)
**기준 커밋 범위**: `09b9695`(본 트랙 클로징, U10) ~ `8025e55`(U16) + U17(이번)

---

## 0. 본 인덱스의 위치

본 트랙 77 클로징(U10)은 `docs/TRACK77_HANDOVER.md` 단일 진실 공급원에 박제됨. 이후 사용자 의견 기반 후속 라운드(U11~)는 본 인덱스에 누적.

본 인덱스는 **운영 채팅방 작성**, Claude Code/CCB가 라운드 종료마다 갱신.

---

## 1. 후속 라운드 일람

| 라운드 | 커밋 SHA | 영역 | 핵심 |
|---|---|---|---|
| U11 | `a28ed35` | 작업자 세션 | 만료 진단 로그 5개 지점 (코드 fix 미포함) |
| U12 | `2cbec58` | 작업자 세션 | 옵션 A — error 분기 무효화 제거 + 진단 로그 제거 |
| followup-u11 (코드) | `f76ea25` | 작업자 사진 | 이상신고 사진 첨부 활성화 (G77-H) — IssueModal + issueStorage + Migration SQL 박제 |
| followup-u11 (인프라) | `f440a12` | 운영 인프라 | SQL 자율 실행 인프라 (`scripts/run-sql.cjs`) + Migration 적용 + LESSONS 144 |
| U13 | `d0db1c4` | 관리자 사진 | 관리자 IssueDetailModal 신설 + 카드 클릭 → 모달 (TRACK77-ISSUE-ADMIN-PHOTOS-001 resolve) |
| U14 | `5226b96` | 사진 + 메뉴 | (실패) Signed URL + Sidebar dead code 수정 — U15에서 정정 |
| U15 | `7a39978` | 메뉴 + 진단 | primitives Sidebar 메뉴 추가 (U14 정정) + 사진 진단 로그 + dead code 삭제 |
| U16 | `8025e55` | 사진 fix | snakeToCamel shallow nested resource fix (패턴 5) + 진단 로그 제거 |
| U17 | `9885f97` | cleanup | 잔존물 검증 + 운영 인덱스 박제 + 표준 §N |
| U18 | `96f3549` | 작업 관리 재설계 | 칸반 제거 + 주간 매트릭스 + 일별 뷰 + TaskDetailModal |
| U19 | `6e419bd` | 작업 관리 툴바 정리 | 상태 칩 제거 + 동 row 숨김 + 완료 opacity + §5 시안 정책 박제 |
| U20 | `d661ef6` | 온실 정보 관리 | 별 트랙 1 — 3탭 (동 작물 / 온실 기초 / 재식밀도 계산) + 신규 3 테이블 + zoneCalc 헬퍼 |
| U21 | (본 라운드) | 작업 모달 정리 | 작물·줄범위 UI 제거 + crop_id 자동 derive (zone+date) + LESSONS 153 |

## 2. 라운드별 산출물 위치

| 라운드 | 보고서 |
|---|---|
| U11 | `docs/TRACK77_U11_REPORT.md` |
| U12 | `docs/TRACK77_U12_REPORT.md` |
| followup-u11 | `docs/TRACK77_FOLLOWUP_U11_REPORT.md` |
| U13 | `docs/TRACK77_U13_REPORT.md` |
| U14 | `docs/TRACK77_U14_REPORT.md` |
| U15 | `docs/TRACK77_U15_REPORT.md` |
| U16 | `docs/TRACK77_U16_REPORT.md` |
| U17 | `docs/TRACK77_U17_REPORT.md` |
| U18 | `docs/TRACK77_U18_REPORT.md` |
| U19 | `docs/TRACK77_U19_REPORT.md` |
| U20 | `docs/TRACK77_U20_REPORT.md` |
| U21 | `docs/TRACK77_U21_REPORT.md` |

LESSONS 138~147 박제 위치: `docs/LESSONS_LEARNED.md` line 2933~3113

## 3. 사용자 의견 매칭

| 의견 | 라운드 | 결과 |
|---|---|---|
| 작업자 세션 만료 (로그인 화면 재노출) | U11 진단 → U12 옵션 A | 운영 모니터링 중 |
| 이상신고 사진 첨부 기능 구현 | followup-u11 | ✅ 활성화 |
| 이상신고 관리자 측 상세 + 사진 표시 (의견 2) | U13 | ✅ 모달 신설 |
| 사이드바 이상신고 메뉴 + 사진 미렌더 (의견 3) | U14 (실패) → U15 정정 → U16 fix | ✅ 사진 정상 렌더 |
| (cleanup) | U17 | ✅ |
| 작업 관리 재설계 (의견 4) | U18 | ✅ kanban 제거 + 매트릭스 + 일별 |
| 작업 관리 툴바 정리 (의견 5: 1+2+3) | U19 | ✅ 상태 칩 제거 + 동 row 숨김 + 시안 정책 박제 |
| 온실 정보 관리 (별 트랙 1, AI 학습 누적) | U20 | ✅ 3탭 + 신규 3 테이블 + zoneCalc P0+P1 |
| 작업 모달 정리 (의견 6) | U21 | ✅ 작물·줄범위 UI 제거 + crop_id 자동 derive |

## 4. 운영 채팅방 흐름 (CCB / Codex 자율 협업 표준)

### 4.1 흐름도

```
[운영 채팅방]                         [사용자]
   ↓ 지시문                              ↓ 의견만
[Claude Code/CCB]                          
   ↓ 위임 (자율 결정)                    
[Codex] ← → [Claude Code]  (사용자 개입 0)
   ↑ 자율 협업 (검토/피드백/재위임)        
   ↓                                       
[보고서] → [운영 채팅방 검수] → [사용자 검증]
```

### 4.2 역할 분리

| 주체 | 책임 |
|---|---|
| 사용자 | 의견 + 최종 검증 |
| 운영 채팅방 | 의견 분석 + 지시문 작성 + 보고서 검수 |
| Claude Code/CCB | 자율 시행 (Codex 위임 결정 포함) + 보고서 작성 |
| Codex | 위임받은 코드 작업 (자기-완결적 단위) |

### 4.3 Codex 위임 적합/부적합 영역

**적합**:
- 단일 파일 / 자기-완결적 코드 변경
- 신규 컴포넌트 (스펙 명확)
- 단일 함수 리팩터링 / 버그 fix (위치 + 명세 명시)
- 표준 패턴 일괄 적용
- 테스트 / 빌드 스크립트 / 진단 임시 스크립트

**부적합 (Claude Code 직접)**:
- 자산 보존 7건 인접 코드 (byte-identical 보존 필요)
- 다중 파일 영향 + 흐름 파악 필요
- import 사용처 검증 / dead code 식별 (LESSONS 146)
- DB 스키마 / Storage 정책 / 외부 인프라
- 자율 진단 (Supabase / Playwright)
- 결정 게이트 자율 결정
- 자가 검증 / 보고서 작성

**절대 금지 (Codex)**:
- 자격증명 / 환경변수 / .env 처리
- DB 마이그레이션 SQL 적용
- 자산 보존 7건 byte-identical 영역 직접 수정
- 결정 권고 / 라운드 분리 결정

### 4.4 보고서 박제 의무 (각 라운드 §N)

각 라운드 보고서에 다음 박제:
- Codex 위임 횟수 + 위임 영역
- Codex 산출 검토 결과
- 자율 결정 근거 (G77-* ID 박제)

## 5. 시안 작성 영구 정책 (U19 박제 — 사용자 의견 5의 3)

### 5.1 원칙
- 모든 사용자 의견 / 변경 시 **인터랙티브 시각 시안** 우선 제시 → 사용자 OK → 지시문 → CCB / Codex 자율 협업
- 시안은 운영 채팅방 안에서 즉시 렌더 + 사용자 시각 검증 후 합의

### 5.2 시안 작성 기준
| 변경 규모 | 시안 정책 |
|---|---|
| 큰 변경 (UI 재설계 / 다중 파일 / 데이터 흐름) | **필수** |
| 중간 변경 (단일 파일이지만 시각 변화 있음) | **권고** |
| 작은 수정 (라벨 / 1라인 fix / 텍스트만) | 생략 가능 |

운영 채팅방이 의견 복잡도 분석 후 결정.

### 5.3 시안 도구
- `visualize:show_widget` (HTML 인터랙티브) — 사용자가 브라우저에서 직접 조작 + 시각 검증
- 시안 → 추가 의견 → 시안 갱신 → 합의 → 지시문 작성

### 5.4 운영 흐름 (U19 시점 정식 박제)

```
[사용자 의견]
   ↓
[운영 채팅방 분석]
   ↓
[시안 (필요 시) — visualize:show_widget]
   ↓
[사용자 시각 검증 + OK]
   ↓
[지시문 작성]
   ↓
[CCB / Codex 자율 협업 (Claude Code 위임 결정)]
   ↓
[보고서]
   ↓
[운영 채팅방 검수]
   ↓
[사용자 검증]
```

### 5.5 박제 위치
본 절(§5)이 영구 정책 박제. 후속 라운드는 본 절 추종.

---

## 6. BACKLOG 후속 트랙 일람

후속 라운드에서 박제된 BACKLOG 항목:

| ID | status | 라운드 |
|---|---|---|
| TRACK77-STORAGE-ISSUE-PHOTOS-001 | in-progress | followup-u11 (사용자 SQL 검증 후 resolved) |
| TRACK77-AUTH-RLS-WORKER-001 | open | followup-u11 |
| TRACK77-ISSUE-ADMIN-PHOTOS-001 | **resolved** | U13 |
| TRACK77-ISSUE-LIGHTBOX-ENHANCED-001 | open | U13 |
| TRACK77-ISSUE-PHOTO-DELETE-001 | open | U13 |
| TRACK77-ISSUE-LIGHTBOX-RENEW-001 | open | U14 |
| TRACK77-ISSUE-MOBILE-ADMIN-001 | open | U14 |
| TRACK77-ISSUE-WORKER-PHOTO-VIEW-001 | open | U14 |
| TRACK77-HQSIDEBAR-ISSUE-001 | open | U15 |
| TRACK77-DEAD-CODE-AUDIT-001 | open | U15 |

본 트랙(U10) 박제 항목 9건은 `docs/TRACK77_HANDOVER.md` §9 참조.

## 7. 약속 박제 일람 (G77-* 자율 결정)

본 트랙: G77-A~LL (U1~U10)
후속 트랙: G77-MM~XX (U11~U17)

| 라운드 | G77 ID 범위 |
|---|---|
| U11 | G77-MM (LESSONS 박제) — 별도 |
| U12 | G77-Q~T |
| followup-u11 | G77-AA~II (Storage 결정 9건) |
| U13 | G77-U~Z (관리자 모달 결정 6건) |
| U14 | G77-AA~HH (Signed URL + 메뉴 결정 8건) |
| U15 | G77-II~MM (dead code + 진단 결정 5건) |
| U16 | G77-NN~SS (자율 진단 결정 6건) |
| U17 | G77-TT~XX (cleanup + 표준 박제) |
| U18 | G77-YY~EEE (작업 관리 재설계 결정 7건) |
| U19 | G77-FFF~KKK (툴바 정리 결정 6건) |
| U20 | G77-LLL~SSS + LLL-1 (온실 정보 결정 9건) |
| U21 | G77-TTT~YYY (작업 모달 정리 결정 6건) |

각 라운드 보고서 §자율 결정 자율 처리 내역에 상세 박제.

## 8. 다음 의견 진입 시 권고

### 8.1 운영 채팅방 (지시문 작성 시)
- 의견 분석 → 4단계 (영향 / 보존 / 회귀 / 변경 명세)
- 자산 보존 7건 영향 사전 평가
- 자율 결정 항목 사전 박제 (G77-* 신규 ID 발급)
- **§5 시안 정책 추종** (U19 박제) — 큰/중간 변경은 시안 우선 제시

### 8.2 Claude Code/CCB
- 본 인덱스 §4 표준 흐름 + §5 시안 정책 추종
- Codex 위임 결정 시 §4.3 적합/부적합 표 참조
- 보고서 §N에 위임 결과 + 자율 결정 근거 박제

### 8.3 사용자
- 의견만 + 최종 검증 (코드/F12/SQL 부담 최소화)
- 자격증명 입력 시점은 Playwright 시뮬 등 필수 한정
- 작업 종료 후 비밀번호 변경 (보안)

---

**끝.**

본 인덱스는 후속 라운드 종료마다 갱신. 사용자 의견 진입 시 본 인덱스 + 라운드별 보고서 + LESSONS / BACKLOG 참조하여 진행.
