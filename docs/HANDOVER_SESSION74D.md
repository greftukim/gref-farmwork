# 세션 74-D 인수인계 문서

**세션**: 74-D  
**날짜**: 2026-04-27  
**범위**: QR 관리 모드 + PDF 라벨 내보내기 + scan_type CHECK 확장  
**마지막 커밋**: `dcdc2ef` feat(session74-D): QR 관리 모드 + PDF 라벨 내보내기 + scan_type CHECK 확장

---

## 1. 작업 결과 요약

| # | 항목 | 결과 |
|---|------|------|
| 1 | FloorPlan.jsx: QR 관리 토글 버튼 | placeholder alert → qrManageMode 토글 + qr_codes fetch |
| 2 | GreenhousePlan: F/B 마커 SVG 오버레이 | qrManageMode=true 시 골별 F(파랑)/B(노랑) 마커 표시, 클릭→팝업 |
| 3 | QR 미리보기 팝업 | QRCodeSVG 190px + UUID + stripe 색상 표시 |
| 4 | exportQrPdf() 구현 | 70×70mm 라벨, 3×3/A4, canvas→PNG→jspdf 동적 import |
| 5 | PDF 내보내기 버튼 | QR 관리 모드 ON + houseQrCodes > 0 일 때 노출, 로딩 상태 |
| 6 | qr_codes fetch | supabase.from('qr_codes').select('id,gol,side,note,greenhouse_id,greenhouses(code,name)') |
| 7 | scan_type CHECK 확장 | pause/resume 추가 → 6종 완성, apply_migration + pg_constraint 검증 |
| 8 | deps 추가 | jspdf@4.2.1 + qrcode (동적 import로 초기 번들 분리) |
| 9 | BACKLOG 2건 | QR-CODE-LABEL-GEN-001, QR-SCAN-TYPE-CHECK-001 신규→resolved |
| 10 | LESSONS 2건 | 교훈 129(canvas 한국어 PDF), 130(결정권자 단일화) |

### 미완료 (차기 세션 이월)

- 실기기 스캔 검증: QR 라벨 출력 → 부착 → QrScanPage 실 스캔
- ASSIGNMENT-PLAN-001: 골 사전 배정 기능 (Tier 6, 별 트랙)
- TEMP-DECISION-* 계열: 사용자 결정 분류로 재정리 (교훈 130 적용)

---

## 2. PDF 라벨 레이아웃 (최종)

```
A4 (210×297mm) 당 9개 라벨 (3열 × 3행)
라벨 크기: 70mm × 70mm
배치: 3열이 A4 너비 꽉 채움 (margin 0)
     3행 수직 중앙 정렬 (상하 여백 각 ~43.5mm)
절단 안내: 상하 여백에 수직 점선 2개 (x=70, x=140)
           각 행 경계 좌우 짧은 점선

라벨 구조 (700×700px canvas → PNG):
  ┌─────────────────────────────┐
  │ ████ 앞(F) / 뒤(B) ████     │ ← 파랑/노랑 stripe (68px)
  │                             │
  │      [QR Code 560px]        │ ← qr_codes.id UUID
  │                             │
  │   1동  3골  앞               │ ← cfg.name + gol + 앞/뒤
  └─────────────────────────────┘

파일명: qr-labels_{온실명}_{YYYYMMDD}.pdf
```

---

## 3. QR 관리 모드 동작

```
FloorPlan 헤더 → [QR 관리] 버튼 토글 ON
  → supabase qr_codes 전체 fetch (status='active', 1회만)
  → GreenhousePlan SVG에 F/B 마커 오버레이
  → 마커 클릭 → qrPreview state → QRCodeSVG 팝업 (position:absolute)
  → [PDF 내보내기 (N개)] 버튼 노출
     → exportQrPdf(houseQrCodes, cfg) 호출
     → jspdf + qrcode 동적 import (최초 1회)
     → canvas 기반 라벨 생성 → PDF 저장
```

---

## 4. DB 변경

```
qr_scans_scan_type_check: 4종 → 6종
  이전: ('start','half','complete','switch')
  이후: ('start','half','complete','switch','pause','resume')
migration 파일: supabase/migrations/20260427_qr_scan_type_check_extend.sql
```

---

## 5. 영구 원칙 신설 (교훈 130)

**결정권자 단일화**: 앱 수정 결정권자는 사용자 단일.  
박민식·김민국은 현장 피드백 제공자이며 결정권자 아님.  
이후 핸드오버·BACKLOG에서 "박민식·김민국 답변 대기" 항목 금지.  
→ "사용자 결정 보류" 또는 "코드 판단 위임"으로만 표기.

---

## 6. 변경 파일 목록

| 파일 | 변경 내용 |
|------|-----------|
| [src/pages/FloorPlan.jsx](../src/pages/FloorPlan.jsx) | QR 관리 모드 전체 구현 (+jspdf/qrcode import) |
| [supabase/migrations/20260427_qr_scan_type_check_extend.sql](../supabase/migrations/20260427_qr_scan_type_check_extend.sql) | scan_type CHECK 6종 확장 |
| [package.json](../package.json) | jspdf@4.2.1, qrcode 추가 |
| [docs/BACKLOG.md](BACKLOG.md) | 2건 resolved |
| [docs/LESSONS_LEARNED.md](LESSONS_LEARNED.md) | 교훈 129·130 추가 |
| [docs/HANDOVER_SESSION74D.md](HANDOVER_SESSION74D.md) | 이 문서 |

---

## 7. 검증 체크리스트

### 자동 완료

- [x] `npm run build` 0 에러 (jspdf 별도 청크 390KB)
- [x] `/admin/floor` QR 관리 모드 OFF 기존 평면도 회귀 없음 (코드 분기 확인)
- [x] scan_type CHECK 6종 `pg_constraint` 검증 통과

### 사용자 점검 필요

- [ ] PDF 인쇄 1장 → QR 스캔 가능 여부 (스마트폰 카메라로 7×7 QR 인식)
- [ ] 라벨 텍스트 가독성 확인 (한국어 "1동 3골 앞" 정상 표시)
- [ ] 앞=파란 stripe / 뒤=노란 stripe 구분 확인
- [ ] 실기기 QrScanPage 스캔 → qr_scans INSERT → F/B/F-again 판정 확인

---

## 8. 트랙 종료 조건

사용자가 PDF 인쇄 → 라벨 부착 → 실기기 스캔 1회 통과 시점에  
**평면도+QR 트랙 (74-A ~ 74-D) 운영 진입 완료**.

---

## 새 채팅방 시작 가이드

```bash
git log -5 --oneline
cat docs/BACKLOG.md
cat docs/LESSONS_LEARNED.md | tail -60
cat docs/HANDOVER_SESSION74D.md
```
