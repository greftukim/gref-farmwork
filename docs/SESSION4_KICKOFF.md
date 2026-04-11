# Phase 5 세션 4 Kickoff 지시문

> 작성: Phase 5 세션 3 종료 시점 (2026-04-11)
> 사용법: Claude Code 새 세션에 아래 코드블록 전체를 그대로 붙여넣기

---

```
Phase 5 세션 4 시작.

## 현재 상태
- 마지막 커밋: 99c5208 docs: 트랙 F 도메인 노트 신설 — 일용직/시급제 (DOMAIN_DAILY_WORKERS.md)
- 트랙 E: 13/14 완료 + E-6.5 코드 구현 완료, 실기기 검증 미완
- 인수인계 문서: docs/HANDOVER_PHASE5_SESSION3.md (세션 시작 절차로 자동 로드)
- 누적 대장: docs/BACKLOG.md, docs/LESSONS_LEARNED.md

## 환경 (변경 없음)
- Supabase MCP 서버: Claude Code에 read-only 연결
- 단일 PC(Windows): C:\Users\User\Desktop\gref-farmwork
- 검증 분담: Claude Code는 MCP로 DB·RLS·로직, 태우는 모바일/실기기

## 세션 3에서 넘어온 미결 (우선순위 순)

### 1순위 — INFRA-001 재확인
세션 3에서 Supabase PostgREST Warp HTTP 타임아웃 발견.
2026-04-11 약 10:35 KST 자동 복구 확인. 재발 여부 먼저 점검.

### 2순위 — E-6.5 실기기 검증 (INFRA-001 복구 확인 후)
코드 구현 완료, 검증만 남음. 검증 표는 HANDOVER_PHASE5_SESSION3 참조.

### 3순위 — 트랙 F 진입
E-6.5 검증 통과 시 트랙 E를 14/14로 마감 후 트랙 F.

## 세션 3 핵심 교훈 (반드시 적용)
- 교훈 17: 정책 존재 확인 ≠ 정책 동작 확인
- 교훈 18: 가설 점프 안티패턴. 3개 연속 탈락 시 강제 중단 + 레이어 목록 작성
  (DB / PostgREST / Network / Client / Auth / Infra)
- 교훈 19: RLS 에러 + DB 결백 + SQL Editor 통과 + 앱만 403
  → Postgres Logs의 'Warp server error', 'Thread killed', 'timeout' 검색부터

## 가설 점프 금지 경고
세션 3에서 DB 레이어만 6번 파다 4시간 소진 후 가설 7(인프라)에서 정답.
이번 세션에서 403 재현 시 DB 의심 금지. 바로 Postgres Logs부터.

## 첫 번째 작업 요청

위 미결 3건 순서대로 처리할 지시문을 뽑아줘.
단계별 순서, 사전 점검, 검증 분담, 커밋 분할, INFRA-001 재발 시나리오
(Pool 증설 경로 포함)까지 모두 포함.

먼저 세션 시작 절차:
1. HANDOVER_PHASE5_SESSION3.md, BACKLOG.md, LESSONS_LEARNED.md 읽고
   요약(가설 6개 표 + 교훈 17·18·19 + INFRA-001 비고) 보고
2. git log --oneline -5로 세션 3 종료 커밋 확인
3. INFRA-001 재발 여부 판정:
   - Supabase MCP로 postgres logs 접근 가능하면 직접 조회
   - 불가능하면 태우에게 Dashboard → Logs → Postgres Logs 수동 확인 요청
   - 검색 키워드: 'Warp server error', 'Thread killed', 'timeout manager'
   - 기간: 2026-04-11 10:35 이후
   - 0건 → mitigated 후보, 1건+ → Pool 증설 검토
4. 위 1~3 보고 후 태우 GO 대기. GO 없이 E-6.5 검증 진입 금지.
```

---

## 세션 4 진입 전 태우 체크리스트

- [ ] 세션 3 종료 커밋(`99c5208`) 푸시 완료 확인
- [ ] Supabase Dashboard → Logs → Postgres Logs 열어두기 (INFRA-001 즉시 확인용)
- [ ] 쉬고 나서 시작 (세션 3에서 4시간 썼음)
