# Phase 5 세션 17 인수인계 — 2026-04-16

> 부채는 [docs/BACKLOG.md](BACKLOG.md), 교훈은 [docs/LESSONS_LEARNED.md](LESSONS_LEARNED.md)에 누적 관리됨.

## 1. 개요

이 문서는 Phase 5 세션 17 (GREF FarmWork 트랙 J — 직종 관리 UI + 테스트 데이터 정리) 작업 종료 시점의 인수인계 문서입니다.
다음 세션에서 이 문서만 보고 잔여 작업 진입이 가능하도록 작성됐습니다.

**Phase 5 세션 17 범위:** 트랙 J 전체 (J-1 ~ J-4 직종 관리 UI + J-CLEANUP-001 테스트 데이터 정리). 트랙 J 진행률 **~99%** (J-CLEANUP-DEEP-001 후속만 잔여).

**진행 방식:** 4-party 협업 모델 — 메타 채팅(결정 검수·전략) + 작업 채팅(실 작업·독립 검수·Claude Code 지시안) + 태우(GO 신호·외부 작업·동기화) + Claude Code(로컬 파일·git·MCP read-only).

**마지막 커밋:** `0471cef` (docs: LESSONS_LEARNED 교훈 35 보강 + 교훈 37-45 추가)

---

## 2. 환경 변화

| 항목 | 세션 16 | 세션 17 |
|---|---|---|
| 협업 모델 | 3자 협업 | **4-party** (메타 채팅 + 작업 채팅 + 태우 + Claude Code) |
| 절차 원칙 | Claude Code → 웹 세션 보고 | Claude Code → 작업 채팅 우선 보고 → 작업 채팅 검수 → 메타 동기화 → 메타 검수 → 태우 GO |
| Claude Code 자율 결정 | 범위 미정의 | **3등급 분류** 도입 (교훈 40): 허용-보고불필요 / 허용-사후보고 / 금지-사전승인 |
| DB 메타데이터 조사 | information_schema 주 사용 | **pg_* 직접 조회 우선** (교훈 35·37) |

---

## 3. 완료 커밋 표

| 커밋 | 내용 |
|---|---|
| `842bce5` | docs(track-j): job_rank 컬럼명 정정 (job_grade → job_rank, §4.1 DDL + §4.1 주석 + §4.4 시드 표 헤더 + §6.3 표시 규칙 4곳) |
| `b425e87` | feat(db): J-4-UI-0 — resident_id encryption RPC functions (encrypt VOLATILE + decrypt STABLE, master+hr_admin only, 5-layer defense via REVOKE/GRANT/role/active/NULL guards) |
| `8da057a` | fix(db): J-4-UI-0 search_path fix — add extensions schema to encrypt/decrypt_resident_id (resolves ERROR 42883) |
| `b07cbc3` | fix(db): J-4-BRANCHES-SEED-FIX — branches 테이블 4개 row 보완 |
| `8788bb8` | feat(ui): J-4-UI-A — branch constants 단일화 + permissions general + emptyForm 4필드 |
| `5948d04` | feat(ui): J-4-UI-B — 직원관리 표·카드뷰·EmployeeForm 확장 |
| `aa0992e` | feat(ui): J-4-UI-C — 직원 상세 모달 + resident_id encrypt/decrypt |
| `0093617` | fix(permissions): J-4-UI-C-FIX — is_active → isActive 불일치 정정 (UI-A 부채) |
| `af802e8` | chore(backlog): RESIDENT-ID-DECRYPT-RUNTIME-VERIFY-001 closed (UI-C 단계 2-D 재진입 성공) |
| `8bbfcfb` | feat(ui): J-4-UI-D — 권한 분기 통합 적용 (헬퍼 활용 + 생년월일 분기) |
| `45b8dcf` | feat(ui): J-4-UI-E — 계약만료 강조 표시 (인라인 색상 분기) |
| `bbfde05` | chore(cleanup): J-4-J-CLEANUP-001 — 테스트 계정 2명 삭제 + 14명 BACKLOG 승격 (옵션 C) |
| `0471cef` | docs: LESSONS_LEARNED 교훈 35 보강 + 교훈 37-45 추가 (세션 17) |

**총 13건.**

---

## 4. 이번 세션의 결정적 발견

### 발견 1 — information_schema FK 조사 0건 반환 (실제 20건)

**증상:** J-CLEANUP-001에서 auth.users DELETE 전 FK 조사 시 information_schema.constraint_column_usage가 "FK 0건" 반환.

**원인:** information_schema는 권한 의존성이 있어 소유자 테이블만 표시. pg_constraint로 직접 조회하면 FK 20건 확인.

**조치:** DELETE 전체 롤백 → 옵션 C (auth.users 14명만 삭제, employees 보존) 재전략. 커밋 `bbfde05`.

**교훈:** 교훈 35 보강 (pg_constraint 필수) + 교훈 37 신설 (외부 인프라·구조 사전 검증 최상위).

### 발견 2 — 4-party 절차 계층 스킵 시 안전망 무력화

**증상:** Claude Code 결과를 태우가 작업 채팅 경유 없이 메타에 직접 전달 → 작업 채팅 기술 검수 미경유.

**조치:** 교훈 38 신설 (계층 스킵 방지) + 교훈 41 (공동 책임).

---

## 5. 신규 교훈 (세션 17)

| 번호 | 제목 |
|---|---|
| 교훈 35 | 보강 — FK 회고 사례 + 재발 방지 체크리스트 확장 |
| 교훈 37 | 외부 인프라·구조 사전 검증 필수 **(최상위)** |
| 교훈 38 | 4-party 절차 경계 — 계층 스킵 방지 |
| 교훈 39 | 사전 확인 + 기능 검증 누락 방지 |
| 교훈 40 | Claude Code 자율 결정 3등급 분류 |
| 교훈 41 | 4-party 공동 책임 — 모든 참여자가 검증 주체 |
| 교훈 42 | Supabase Dashboard 환경 제약 인지 |
| 교훈 43 | CTE(WITH 절) 가시성 한계 — 단일 statement scope |
| 교훈 44 | UI 시각 마커 — 상태 구분은 시각 요소로 |
| 교훈 45 | Supabase 테이블 생성 시 자동 권한 부여 인지 |

---

## 6. BACKLOG 현황 (open 10건)

| ID | 우선순위 | 한 줄 요약 |
|---|---|---|
| BRANCHES-LOCATION-001 | 중간 | 지점 위치 정보 관리 |
| EMPLOYEE-BRANCH-NULL-001 | 낮음 | 직원 지점 null 처리 |
| EMPLOYEE-DUPLICATE-NAME-001 | 낮음 | 동명이인 처리 |
| JOB-RANK-SELECT-DECISION-001 | 낮음 | 직종 순위 선택 UX 결정 |
| RESIDENT-ID-FORMAT-VALIDATION-001 | 낮음 | 주민번호 형식 검증 |
| JOB-TYPE-LEGACY-CLEANUP-001 | 중간 | 레거시 직종 데이터 정리 |
| PERMISSIONS-CONSOLIDATION-001 | 낮음 | 권한 체계 통합 |
| FARM-ADMIN-LEADER-SCOPE-CONFIRM-001 | 낮음 | 농장관리자·반장 권한 범위 확정 |
| CONTRACT-EXPIRY-PUSH-NOTIFICATION-001 | 낮음 | 계약 만료 푸시 알림 |
| J-CLEANUP-DEEP-001 | 중간 | 14명 employees 후속 처리 (delete_rule 재확인) |

**closed 1건:** RESIDENT-ID-DECRYPT-RUNTIME-VERIFY-001

---

## 7. 세션 17 마감 미완료 항목

| 항목 | 상태 | 설명 |
|---|---|---|
| 단계 3 BACKLOG 갱신 | 미실행 | BACKLOG.md 파일 갱신 |
| 단계 3 CLAUDE.md 갱신 | 미실행 | 세션 17 교훈 반영 |
| push | 미실행 | 미push 커밋 1건 (`0471cef`) + HANDOVER 커밋 추가 예정 |

---

## 8. 다음 세션 시작 가이드 (세션 18)

### 진입 조건

```bash
git status
# push 미실행 커밋 확인
git log --oneline origin/main..HEAD
# 미push 커밋 목록 확인 → push 실행

git log --oneline -5
# 기대: 최신 0471cef 이후 커밋 (HANDOVER 등)
```

- `docs/BACKLOG.md` 전체 읽기 — J-CLEANUP-DEEP-001 상태 확인
- `docs/LESSONS_LEARNED.md` — **교훈 37(최상위)**, 교훈 40(자율 결정 3등급) 필수 확인

### 세션 18 권장 작업 순서

1. **push 실행** (미push 커밋 일괄)
2. **단계 3 완료** (BACKLOG.md + CLAUDE.md 갱신) — 세션 17 미완료 항목
3. **BACKLOG 우선순위 재검토** — J-CLEANUP-DEEP-001 진입 여부 결정
4. 새 트랙 진입 또는 BACKLOG 소화

### J-CLEANUP-DEEP-001 진입 시 주의

```sql
-- employees 14명의 auth_user_id 상태 확인 (NULL이면 이미 처리됨)
SELECT id, full_name, auth_user_id FROM employees
WHERE auth_user_id IS NULL;

-- FK delete_rule 재확인 (교훈 35·37 준수)
SELECT conname, confdeltype
FROM pg_constraint
WHERE conrelid = 'employees'::regclass AND contype = 'f';
```

---

## 9. 4-party 협업 모델 인계

### 절차 (엄격 준수)
Claude Code → 작업 채팅 우선 보고 → 작업 채팅 독립 검수
→ 메타 동기화 → 메타 검수 → 태우 GO 전달

### Claude Code 자율 결정 3등급 (교훈 40)

| 등급 | 범위 | 예시 |
|---|---|---|
| 허용 (보고 불필요) | 오타·포맷 정정, 지시안 내 실행 순서 최적화 | — |
| 허용 (사후 보고) | str_replace 통합, old_str 컨텍스트 확장, minor 조정 | 교훈 42·44 유일성 자율 확보 |
| 금지 (사전 승인) | 지시안 외 파일 수정, 커밋·push, 새 기능, 계층 스킵 | — |

---

## 10. 작업 환경

| 항목 | 값 |
|---|---|
| 로컬 경로 | `C:\Users\User\Desktop\gref-farmwork` |
| 브랜치 | `main` 단독 |
| 스택 | React 18 + Vite + Supabase + Tailwind + Zustand + PWA/FCM |
| Supabase MCP | read-only, project-ref `yzqdpfauadbtutkhxzeu` |
| Vercel | https://gref-farmwork.vercel.app |
| 검증 분담 | Claude Code = DB·로직·MCP / 태우 = UI mount·실기기·SQL Editor |

---

## 11. 통계

| 항목 | 값 |
|---|---|
| 세션 17 커밋 | 13건 |
| 트랙 J 진행률 | ~99% (J-CLEANUP-DEEP-001 잔여) |
| 신규 교훈 | 10건 (교훈 35 보강 + 교훈 37~45) |
| BACKLOG open | 10건 |
| BACKLOG closed | 1건 |
| 마감 미완료 | 단계 3 (BACKLOG + CLAUDE.md) + push |
