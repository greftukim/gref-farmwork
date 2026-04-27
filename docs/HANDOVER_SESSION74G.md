# 세션 74-G 인수인계 문서

**세션**: 74-G  
**날짜**: 2026-04-27  
**범위**: FloorPlan.jsx task null 누수 잔존 위치 전수 grep 감사 + 일괄 수정  
**마지막 커밋**: `TBD`

---

## 1. 작업 결과 요약

| # | 항목 | 결과 |
|---|------|------|
| 1 | Task 0 정찰 — 74-F 수정 상태 확인 | 2건 정상 반영. 다른 위치 4곳 잔존 확인 |
| 2 | Task 0 전수 grep — task./TASK_TYPES[/worker. | 위험 4곳, 안전 확인 5곳 |
| 3 | Bug A — line 734 progress bar `task.color` | null-guard 적용 |
| 4 | Bug B — line 875 GolDetail 뱃지 `task.color/label` | `{task && <span>}` 조건부 렌더 |
| 5 | Bug C — line 758/763 ACTIVE_ASSIGNMENTS `task.color×2/label` | 방어적 null-guard 적용 |
| 6 | `npm run build` | **0 에러** ✓ |
| 7 | BACKLOG 갱신 | FLOOR-PAGE-ERROR-001 재정정 + 신규 2건 |
| 8 | 교훈 131 신설 | null 누수 패턴 일괄 회수 원칙 |

### 안전 확인 (수정 불필요)

| 위치 | 이유 |
|------|------|
| Line 398-399 `TASK_TYPES[g.taskType].color` | `{worker && pos && ...}` 가드. taskType=null이면 predictPosition→null→pos=null |
| Lines 362-416 `worker.color` (SVG) | `{worker && pos && ...}` / `{worker && !pos && ...}` 내부 |
| Line 42-44 predictPosition 내부 `task.speedSecPerM` | 함수 진입부 `if (!g.taskType) return null` 가드 |

---

## 2. 수정 상세

### Bug A — allWorking progress bar (line 734)

```diff
- background: g.pausedAt ? '#CA8A04' : task.color
+ background: g.pausedAt ? '#CA8A04' : (task ? task.color : '#94A3B8')
```

**왜 크래시**: task=null이고 g.pausedAt=falsy인 gol(taskType=null, 현재 작업 중)이 `allWorking` 목록에 포함될 때.

### Bug B — GolDetail 작업유형 뱃지 (line 875)

```diff
- <span style={{ ..., background: task.color, ... }}>{task.label}</span>
+ {task && <span style={{ ..., background: task.color, ... }}>{task.label}</span>}
```

**왜 크래시**: GolDetail은 `{worker && ...}` 가드만 있음. worker 있고 taskType=null인 골 클릭 시 task=null.

### Bug C — ACTIVE_ASSIGNMENTS 배정 진행 카드 (lines 758, 763)

```diff
- background: task.color  →  background: task ? task.color : '#94A3B8'  (×2)
- {task.label}            →  {task?.label}
```

**현재 위험도**: ACTIVE_ASSIGNMENTS=[] 고정이므로 미실행. 향후 배정 기능 구현 시 크래시 방지용.

---

## 3. BACKLOG 갱신

| ID | 처리 |
|----|------|
| FLOOR-PAGE-ERROR-001 | 74-F `resolved` → 74-G 완전해소로 설명 보강 |
| FLOOR-NULL-GUARD-AUDIT-001 | 신규 등록 → 즉시 resolved |
| ERROR-BOUNDARY-PAGE-001 | 신규 등록 (open, 운영 후 트랙) |

---

## 4. 교훈 131

**null 누수 패턴 수정 시 동일 변수의 모든 사용처 grep 일괄 회수 필수**

→ `grep -n "task\." src/pages/FloorPlan.jsx` 후 전수 점검, 한 커밋 처리.

---

## 5. 사용자 점검 안내

- [ ] hard reload (Ctrl+Shift+R) 1회 후 `/admin/floor` 진입
- [ ] "앱 오류 발생" 화면 사라지고 평면도 정상 렌더링 확인
- [ ] 4개 동 클릭 + 골 클릭 시나리오 4종 (작업중/완료/반완료/유휴) — 크래시 없음 확인
- [ ] QR 관리 모드 ON/OFF + PDF 내보내기 회귀 0건 확인
- [ ] GolDetail 패널 작업자 표시 정상 ("작업자 재배정"/"생육 상세" 버튼 포함)

---

## 6. 미완료 (차기 이월)

- 실기기 QR 스캔 1회 통과 (74-D 이월, 유일한 운영 관문)
- ERROR-BOUNDARY-PAGE-001 — 페이지별 ErrorBoundary (별 트랙)
- ASSIGNMENT-PLAN-001 — 골 사전 배정 (Tier 6, 별 트랙)

---

## 7. 변경 파일 목록

| 파일 | 변경 내용 |
|------|-----------|
| [src/pages/FloorPlan.jsx](../src/pages/FloorPlan.jsx) | null-guard 4줄 (Bug A·B·C) |
| [docs/BACKLOG.md](BACKLOG.md) | FLOOR-PAGE-ERROR-001 재정정 + 신규 2건 |
| [docs/LESSONS_LEARNED.md](LESSONS_LEARNED.md) | 교훈 131 추가 |
| [docs/HANDOVER_SESSION74G.md](HANDOVER_SESSION74G.md) | 이 문서 |

---

## 새 채팅방 시작 가이드

```bash
git log -5 --oneline
cat docs/BACKLOG.md
cat docs/LESSONS_LEARNED.md | tail -60
cat docs/HANDOVER_SESSION74G.md
```
