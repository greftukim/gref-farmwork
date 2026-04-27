# 세션 74-E 인수인계 문서

**세션**: 74-E  
**날짜**: 2026-04-27  
**범위**: 오늘 날짜 QR 스캔 데모 시드 데이터 생성 및 적용  
**마지막 커밋**: _(커밋 후 채움)_

---

## 1. 작업 결과 요약

| # | 항목 | 결과 |
|---|------|------|
| 1 | supabase/seeds/ 디렉토리 신설 | 없던 디렉토리 생성 |
| 2 | demo_qr_scans_today.sql 작성 | PL/pgSQL DO 블록, CURRENT_DATE 기준, 멱등성 |
| 3 | 시드 적용 (execute_sql) | 98건 INSERT, DO 블록 예외 없이 통과 |
| 4 | scan_type 분포 검증 | start=40, half=31, complete=23, pause=2, resume=2 ✓ |
| 5 | 작업자별 검증 | 9명 합계 98건, 분포 정상 ✓ |

### 미완료 (차기 세션 이월)

- 실기기 스캔 검증: QR 라벨 출력 → 부착 → QrScanPage 실 스캔 (74-D 이월)
- ASSIGNMENT-PLAN-001: 골 사전 배정 기능 (Tier 6, 별 트랙)

---

## 2. 시드 스크립트 설계 (최종)

```
파일: supabase/seeds/demo_qr_scans_today.sql
실행: Supabase MCP execute_sql (DML — DDL 아님)

멱등성 범위:
  · CURRENT_DATE + 부산 작업자 9명 해당분만 DELETE → re-INSERT
  · 오늘 이전 데이터, 타 작업자 데이터 무영향

작업자 배열 (이름 순 정렬, w[1]~w[9] 고정):
  w[1]=김선아  w[2]=김옥희  → 1cmp
  w[3]=김점숙  w[4]=김태진  → 2cmp
  w[5]=문영이  w[6]=윤화순  → 3cmp
  w[7]=정경은  w[8]=정은영  w[9]=조혜숙 → 4cmp
```

### 동별 현황 시나리오

| 동 | 완료골 | half골 | start골 | idle골 | pause/resume |
|----|--------|--------|---------|--------|--------------|
| 1cmp (10골) | 1~5 | 6~7 | 8~9 | 10 | 골2 |
| 2cmp (10골) | 1~5 | 6~8 | 9~10 | — | — |
| 3cmp (7골) | 1~4 | 5 | 6~7 | — | — |
| 4cmp (19골) | 1~9 | 10~11 | 12~14 | 15~19 | 골7 |

---

## 3. 검증 결과

### scan_type 분포

| scan_type | 건수 |
|-----------|------|
| start | 40 |
| half | 31 |
| complete | 23 |
| pause | 2 |
| resume | 2 |
| **합계** | **98** |

### 작업자별 건수

| 이름 | 건수 |
|------|------|
| 김선아 | 11 |
| 김옥희 | 12 |
| 김점숙 | 12 |
| 김태진 | 11 |
| 문영이 | 8 |
| 윤화순 | 8 |
| 정경은 | 13 |
| 정은영 | 12 |
| 조혜숙 | 11 |

---

## 4. 변경 파일 목록

| 파일 | 변경 내용 |
|------|-----------|
| [supabase/seeds/demo_qr_scans_today.sql](../supabase/seeds/demo_qr_scans_today.sql) | 데모 시드 스크립트 신규 작성 |
| [docs/HANDOVER_SESSION74E.md](HANDOVER_SESSION74E.md) | 이 문서 |

---

## 5. 사용자 점검 필요

- [ ] `/admin/floor` → 각 동 클릭 → 평면도 색상 현황 확인 (완료=녹색, half=노랑, start=파랑, idle=회색)
- [ ] 1cmp 골2 / 4cmp 골7 — QR 관리 모드에서 마커 정상 표시 확인
- [ ] QrScanPage: 실 QR 스캔 → F/B/F-again 판정 → qr_scans INSERT 확인
- [ ] 내일 재실행 멱등성 확인: `demo_qr_scans_today.sql` 재적용 시 오늘 데이터만 교체, 어제 데이터 보존

---

## 6. 트랙 종료 조건

74-A ~ 74-E 트랙 전체:
- [x] 평면도 SVG 렌더링
- [x] QR 관리 모드 + PDF 라벨 내보내기
- [x] F/B/F-again 판정 로직
- [x] scan_type CHECK 6종
- [x] 데모 데이터 적용
- [ ] **실기기 스캔 1회 통과** ← 유일한 잔여 관문

---

## 새 채팅방 시작 가이드

```bash
git log -5 --oneline
cat docs/BACKLOG.md
cat docs/LESSONS_LEARNED.md | tail -60
cat docs/HANDOVER_SESSION74E.md
```
