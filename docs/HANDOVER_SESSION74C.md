# 세션 74-C 인수인계 문서

**세션**: 74-C  
**날짜**: 2026-04-27  
**범위**: QR 스캔 진입 경로 신설 + F/B/F-again 판정 로직 + 모바일 평면도 이식  
**마지막 커밋**: `b546417` feat(session74-C): QR 스캔 진입 경로 + F/B/F-again 판정 + 모바일 평면도 이식

---

## 1. 작업 결과 요약

### 완료된 작업

| # | 항목 | 결과 |
|---|------|------|
| 1 | WorkerHome QR 스캔 CTA 카드 신설 | gradient 버튼 → `/worker/m/qr-scan` navigate |
| 2 | QrScanPage 진입 경로 확정 | 옵션 A2 (홈 CTA 버튼) 채택. 이미 WorkerLayout 하에 `/worker/m/qr-scan` 존재 확인 |
| 3 | QrScanPage F/B/F-again 판정 로직 | 동일 골 당일 이전 스캔 기록 → start/half/complete 자동 결정 |
| 4 | QrScanPage qr_codes select 확장 | `gol, side, greenhouse_id` 추가 조회 |
| 5 | QrScanPage 성공 메시지 단계 반영 | "OO 작업 시작 / 작업 중간 / 작업 완료" |
| 6 | QrScanPage 이력 표시 라벨 수정 | `task_start/task_end` 레거시 → `start/half/complete/switch` |
| 7 | FloorPlan.jsx: FloorCtx named export | `export { FloorPlanScreen, GreenhousePlan, FloorCtx }` |
| 8 | MobileFloorScreen GreenhousePlan 이식 | "준비 중" 플레이스홀더 → useFloorData + FloorCtx.Provider + GreenhousePlan |
| 9 | MobileFloorScreen 온실 탭 | houseIdx 상태 + HOUSE_CONFIG map → 탭 버튼 |
| 10 | BACKLOG: 3건 처리 | MOBILE-FLOOR-001 resolved, QR-SCAN-FLOW-001·WORKER-QR-CTA-001 신규 resolved |
| 11 | LESSONS: 교훈 128 신설 | React Context export 원칙 |

### 미완료 (차기 세션 이월)

- `qr_scans.scan_type` CHECK에 `'pause'`, `'resume'` 추가 (74-B 이월분)
- ASSIGNMENT-PLAN-001: 골 사전 배정 기능 (Tier 6, 별 트랙)
- qr_scans 실기기 스캔 테스트: QR 코드 UUID → INSERT → 판정 로직 검증

---

## 2. 핵심 발견

### RECON-1 오류 정정 (Task 0)

RECON_1 보고서에서 QrScanPage 경로가 `/admin/m/qr-scan`으로 잘못 기록됐었다.  
App.jsx 실독 결과: Route 선언은 `/worker` 블록(line 243~262) 안 → 실제 경로 **`/worker/m/qr-scan`**.  
→ 74-C Task 1에서 "진입 경로 신설" 필요 없이 CTA 버튼만 추가하면 됐다.

### F/B/F-again 판정 로직 설계

```
당일 동일 골(greenhouse_id + gol) 스캔 이력 없음  →  scan_type = 'start'  (0%)
이전 마지막 스캔 = 'start'                          →  scan_type = 'half'   (50%)
이전 마지막 스캔 = 'half'                           →  scan_type = 'complete' (100%)
이전 마지막 스캔 = 'complete' (재시작)              →  scan_type = 'start'
```

**구현 방식**: `sibling QR codes` (같은 온실+골의 F/B QR 2개 id 조회) → `qr_scans.in()` 필터.  
별도 qr_codes 조회가 필요하므로 총 3 round-trip (qrCode 조회 → sibling ids → prior scans).

### FloorCtx export 필요성 (교훈 128)

`GreenhousePlan`은 `useContext(FloorCtx)`로 데이터를 읽는다. 외부에서 `FloorCtx.Provider`로 감싸려면 FloorCtx 객체 자체를 export해야 한다. 이식 전 미리 확인해 즉시 추가.

---

## 3. 변경 파일 목록

| 파일 | 변경 내용 |
|------|-----------|
| [src/pages/worker/WorkerHome.jsx](../src/pages/worker/WorkerHome.jsx) | useNavigate 추가 + QR 스캔 CTA 카드 삽입 |
| [src/pages/worker/QrScanPage.jsx](../src/pages/worker/QrScanPage.jsx) | select 확장 + sibling 조회 + scan_type 판정 + 라벨 수정 |
| [src/pages/FloorPlan.jsx](../src/pages/FloorPlan.jsx) | FloorCtx export 추가 |
| [src/pages/mobile/AdminMobilePages.jsx](../src/pages/mobile/AdminMobilePages.jsx) | imports 추가 + MobileFloorScreen 전면 재작성 |
| [docs/BACKLOG.md](BACKLOG.md) | 3건 처리 |
| [docs/LESSONS_LEARNED.md](LESSONS_LEARNED.md) | 교훈 128 추가 |
| [docs/HANDOVER_SESSION74C.md](HANDOVER_SESSION74C.md) | 이 문서 |

---

## 4. QrScanPage onScanSuccess 흐름 (최종)

```
1. stopScan()
2. qr_codes.select('id, gol, side, greenhouse_id, greenhouses(name)').eq('id', decodedText)
   → qrCode
3. qr_codes.select('id').eq('greenhouse_id', …).eq('gol', …)
   → siblingIds (F+B 2개)
4. qr_scans.select('scan_type').in('qr_code_id', siblingIds)
           .eq('employee_id', …).gte('scanned_at', today+'T00:00:00')
           .order('scanned_at', {ascending:false}).limit(5)
   → priorScans
5. last = priorScans[0].scan_type
   start → half / half → complete / else → start
6. qr_scans.insert({ qr_code_id, employee_id, scanned_at, scan_type })
7. setScanResult + setRecentScans
```

---

## 5. BACKLOG 변경 요약

| ID | 변경 | 내용 |
|----|------|------|
| MOBILE-FLOOR-001 | open → resolved | GreenhousePlan 이식 완료 |
| QR-SCAN-FLOW-001 | 신규 → resolved | F/B/F-again 판정 로직 구현 |
| WORKER-QR-CTA-001 | 신규 → resolved | 작업자 홈 QR 스캔 CTA 버튼 신설 |

---

## 6. 교훈 요약 (신규 1건)

- **교훈 128**: React Context를 외부 컴포넌트에서 `Provider`로 사용할 때 Context 객체 자체를 named export해야 한다. 이식 전 `useContext(X)` 의존 여부 확인 필수.

---

## 새 채팅방 시작 가이드

```bash
git log -5 --oneline
cat docs/BACKLOG.md
cat docs/LESSONS_LEARNED.md | tail -60
cat docs/HANDOVER_SESSION74C.md
```
