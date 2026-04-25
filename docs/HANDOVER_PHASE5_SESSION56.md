# HANDOVER — Phase 5 세션 56

**날짜:** 2026-04-26  
**작업자:** Claude (세션 56)  
**직전 세션:** 세션 55 (4784bd5)

---

## 세션 목표 및 결과

STORE-MISSING-001~003 묶음 해소 (운영 진입 전 부채 청산).

- **Task 0**: 영향 진단 완료 — 3건 모두 DB 변경 없이 해결 가능 확인
- **Task 1**: 3건 순차 해소 완료
- **Task 2**: Playwright PASS 54 / FAIL 0 / WARN 3
- **Task 3**: BACKLOG·LESSONS·HANDOVER 완료

---

## Task 0 — 영향 진단 결과

### 실측 발견 (교훈 96 핵심)

DB를 직접 조회(`information_schema.columns`)한 결과 `db-schema.md`와 실제 테이블 간 괴리 확인:

| 페이지 | 참조 필드 | DB 실제 상태 |
|--------|---------|------------|
| IssueCallPage | `it.status`, `it.severity` | 미존재 — `is_resolved` bool만 있음 |
| IssueCallPage | `it.employeeId` | 실제: `worker_id` → snakeToCamel → `workerId` |
| IssueCallPage | `it.message`, `it.description` | 실제: `comment` |
| WorkerNoticePage | `n.content` | 실제: `body` |
| WorkerNoticePage | `n.readBy`, `n.pinned`, `n.important` | 미존재 |

### 3건 영향 분류 표

| BACKLOG | 페이지 | 사용자 | 증상 | DB 변경 | 우선순위 |
|---------|-------|-------|-----|--------|---------|
| 001 | `/admin/records` | ADMIN_ROLES | 기본필터 'pending' **빈 화면** + 워커명 '?' | 불필요 | 1순위 |
| 002 | `/admin/leave` | ADMIN_ROLES | 승인·반려 버튼 **silent fail** | 불필요 | 2순위 |
| 003 | `/worker/notices` | worker | markRead 무동작 + 공지 본문 undefined | 불필요 | 3순위 |

---

## Task 1 — 구현 내용

### STORE-MISSING-001 해소

**`src/stores/issueStore.js`**
- `fetchIssues`: `is_resolved → computed status` 매핑 추가
  ```js
  issues: data.map((d) => ({ ...snakeToCamel(d), status: d.is_resolved ? 'resolved' : 'pending' }))
  ```
- `updateIssue(id, patch)` 신규 추가:
  - `status='resolved'` → DB `is_resolved=true` + `resolved_at`
  - `status='in_progress'` → 로컬 상태만 (DB 컬럼 없음, 새로고침 시 'pending' 복원)

**`src/pages/admin/IssueCallPage.jsx`**
- `empMap[it.employeeId]` → `empMap[it.workerId]`
- `it.message || it.description` → `it.comment`

**제한사항**: issues 테이블에 `status` 컬럼 없음 → 'in_progress' 상태 DB 비영속화. 버튼 클릭 시 시각 반응은 있으나 새로고침 시 'pending'으로 복원. `status` 컬럼 추가가 필요하면 별도 마이그레이션 세션 진행 필요.

### STORE-MISSING-002 해소 (교훈 97)

**`src/stores/leaveStore.js`**
- `approveRequest(id)` = `get().farmReview(id, true, null)` — 2줄 래퍼
- `rejectRequest(id)` = `get().farmReview(id, false, null)` — 2줄 래퍼

`farmReview`가 이미 올바른 로직 포함 (status 업데이트 + 잔여휴가 차감). 재구현 불필요.

### STORE-MISSING-003 해소

**`src/stores/noticeStore.js`**
- `markRead(id, userId)` 추가: 로컬 상태 readBy 배열 업데이트 (DB `read_by` 컬럼 없음 → 세션 내 유효)

**`src/pages/worker/WorkerNoticePage.jsx`**
- `n.content` → `n.body` (2곳: 목록 미리보기 + 상세 모달)

---

## Task 2 — Playwright 결과

`node scripts/audit_session56.cjs`

```
PASS 54 / FAIL 0 / WARN 3 / TOTAL 57
```

**WARN 3건 분류:**
- D-3, D-4: DB에 pending leave_requests 없음 → 승인 버튼 노출·클릭 테스트 스킵 (코드 정상, 데이터 없는 환경)
- E-3: auth.users에 worker 계정 없음 → /worker/notices E2E 불가 (코드 검증으로 대체)

`node scripts/audit_store_subscriptions.cjs`

```
✅ 미존재 구독 0건 — 모두 정상 (총 176건 확인)
```
세션 55 4건 → 세션 56 0건 확인.

---

## 신규 교훈

- **교훈 96** — `db-schema.md` ≠ 실제 DB. 필드 수정 전 `information_schema.columns` 직접 조회 선행
- **교훈 97** — store action 래퍼 2줄 > 재구현 30줄. 기존 action 재활용 먼저 검토

---

## 신규 BACKLOG

| ID | 내용 |
|----|------|
| NOTICE-AUTH-001 | auth.users에 worker 계정 미존재 → /worker/* E2E 테스트 불가 + markRead DB 영속화 미완 |

---

## 해소된 BACKLOG

| ID | 해소 내용 |
|----|---------|
| STORE-MISSING-001 | issueStore.updateIssue + status 매핑 + 필드명 수정 |
| STORE-MISSING-002 | leaveStore.approveRequest/rejectRequest 래퍼 |
| STORE-MISSING-003 | noticeStore.markRead (로컬) + n.body 수정 |

---

## Tier 진척

- Tier 1: 3/3 ✅
- Tier 2: 4/4 ✅
- Tier 3: 2/3 (HQ-BRANCH-DETAIL 완료, HQ-GROWTH-BRANCH-DETAIL 잔여)
- Tier 4: 0/7
- Tier 5: 0/4

---

## 세션 57 추천

1. **HQ-GROWTH-BRANCH-DETAIL-001** — Tier 3 마지막. GrowthCompare "지점 상세 보기 →" alert 해소, Tier 3 클리어 가능. 세션 55 BranchDetail 패턴 재사용으로 빠른 구현 예상. **1순위 추천**
2. **운영 진입 전 통합 회귀** 단독 세션 — 전체 admin + worker 라우트 점검, 콘솔 에러 0건 확인
3. **Tier 5 UI 이식** 진입 (외형 단장)
4. **NOTICE-AUTH-001** 해소 — worker auth 계정 생성 + read_by 컬럼 마이그레이션 (짧은 세션)

**추천: HQ-GROWTH-BRANCH-DETAIL-001** — Tier 3 완료로 마일스톤 달성 효과 있고 세션 55 패턴 직접 재사용 가능.

---

## 마지막 커밋

세션 56 커밋 예정 (위 해시 4784bd5는 직전 세션)
