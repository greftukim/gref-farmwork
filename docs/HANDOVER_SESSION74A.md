# 세션 74-A 인수인계 문서

**세션**: 74-A  
**날짜**: 2026-04-27  
**범위**: 평면도 + QR 위치 추적 트랙 사전 정찰 (코드/DB 변경 0건)  
**마지막 커밋**: `f753f6f` docs(session74-A): 추가 정찰 보고서 + BACKLOG 2건 오기 수정

---

## 1. 작업 결과 요약

| # | 항목 | 결과 |
|---|------|------|
| 1 | RECON_1 — FloorPlan 파일 2개 존재 규명 | active(`src/pages/FloorPlan.jsx`) vs dead code(`src/pages/admin/FloorPlan.jsx`) 구분 확인 |
| 2 | RECON_1 — useFloorData.js 쿼리 대상 3테이블 DB 미존재 확인 | greenhouses/qr_codes/qr_scans 전무 → 빈 화면 원인 특정 |
| 3 | RECON_1 — MobileFloorScreen 현황 확인 | 출근 통계만 + "준비 중" CardBlock — GreenhousePlan 미삽입 |
| 4 | RECON_1 — Track G (포장) 결합도 조사 | DB 스키마 겹침 없음 → TRACK-L-G-MERGE-001 분리 확정 |
| 5 | RECON_2 — SELECT 구문 전수 확인 | greenhouses/qr_codes/qr_scans 필수 컬럼 목록 확정 |
| 6 | RECON_2 — QrScanPage scan_type 불일치 발견 | 'task_start' 하드코딩 → useFloorData 'start'와 충돌 |
| 7 | RECON_2 — timeAgo() 하드코딩 발견 | `10 * 60 + 25` 정적값 → nowMin() 교체 필요 (교훈 77) |
| 8 | RECON_2 — RLS 패턴 초안 작성 | attendance/safety_checks 패턴 기반, qr_scans 3정책 초안 |
| 9 | RECON_2 — 시드 행 수 확정 | greenhouses 4행, qr_codes 92행, qr_scans 0행(실 스캔) |
| 10 | BACKLOG 2건 오기 수정 | PC-FLOOR-DATA-001·FLOOR-SCHEMA-SKIP-001 설명 정정 |

### 코드/DB 변경

없음. 정찰 + BACKLOG 문서 수정만.

---

## 2. 핵심 발견 사항

### FloorPlan 이중 파일 위험

| 파일 | 라우트 | 소스 | 상태 |
|------|--------|------|------|
| `src/pages/FloorPlan.jsx` (749줄) | ✅ `/admin/floor` | useFloorData.js | **ACTIVE** |
| `src/pages/admin/FloorPlan.jsx` (731줄) | ❌ 미등록 | floor-schema.js | **DEAD CODE** |

→ Explore 에이전트가 dead code 파일을 active로 오인한 중대 오류 발생. 직접 교차 검증으로 정정.

### DB 블로커

`useFloorData.js`가 쿼리하는 3개 테이블 모두 Supabase DB 미존재.  
→ `/admin/floor` 접속 시 EMPTY_DATA 반환 → "데이터가 없습니다" 빈 화면.

### QrScanPage scan_type 불일치

QrScanPage: `scan_type: 'task_start'` 하드코딩  
useFloorData: `'start' | 'half' | 'complete' | 'switch'` 기대  
→ 74-B에서 CHECK constraint 없이 TEXT로 생성, 74-C에서 올바른 판정 로직 + constraint 추가.

---

## 3. 74-B 게이트 설계 결정값

| 결정 사항 | 결정 값 |
|-----------|---------|
| dead code 파일 처리 | 삭제 (import 0건 확인 후) |
| speed_factor 위치 | employees 컬럼 `NUMERIC(4,2) NOT NULL DEFAULT 1.00` |
| QR 코드 상태값 | TEXT DEFAULT 'active' (enum 미강제, 추후 확장) |
| greenhouses.branch | 현행 'busan' 하드코딩 유지, 다지점 시 파라미터 주입 |
| TRACK-L-G-MERGE-001 | 분리 확정. Track L 완료 후 Track G 독립 설계 |
| 시드 행 수 | greenhouses 4행, qr_codes 92행 (골당 F+B 2개, 46골) |
| RLS 패턴 | attendance 패턴 준용. qr_scans: anon INSERT/SELECT + authenticated SELECT |

---

## 4. BACKLOG 갱신

| ID | 수정 내용 |
|----|-----------|
| PC-FLOOR-DATA-001 | 설명 수정: active 파일은 useFloorData 사용 — floor-schema.js는 dead code 전용 |
| FLOOR-SCHEMA-SKIP-001 | 설명 수정: 파일 실존(dead code 전용). open → 74-B에서 dead code 삭제 시 해소 예정 |

---

## 5. 차기 세션 인계 (74-B)

74-B 즉시 착수 사항:
1. greenhouses + qr_codes + qr_scans 마이그레이션 SQL 작성
2. employees.speed_factor ALTER TABLE
3. 부산 온실 4개 시드 + qr_codes 92행 시드
4. src/pages/admin/FloorPlan.jsx + src/data/floor-schema.js dead code 삭제
5. timeAgo() 하드코딩 수정 (교훈 77)

---

## 6. 변경 파일 목록

| 파일 | 변경 내용 |
|------|-----------|
| [docs/HANDOVER_SESSION74A_RECON.md](HANDOVER_SESSION74A_RECON.md) | RECON_1 사전 조사 보고서 신규 |
| [docs/HANDOVER_SESSION74A_RECON_2.md](HANDOVER_SESSION74A_RECON_2.md) | RECON_2 추가 조사 보고서 신규 |
| [docs/BACKLOG.md](BACKLOG.md) | PC-FLOOR-DATA-001·FLOOR-SCHEMA-SKIP-001 설명 오기 수정 |
| [docs/HANDOVER_SESSION74A.md](HANDOVER_SESSION74A.md) | 이 문서 (사후 작성, 74-G 종료 후) |

---

## 새 채팅방 시작 가이드

```bash
git log -5 --oneline
cat docs/BACKLOG.md
cat docs/LESSONS_LEARNED.md | tail -60
cat docs/HANDOVER_SESSION74A_RECON_2.md   # 74-B 설계 결정값 포함
```
