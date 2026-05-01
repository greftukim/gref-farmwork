# 트랙 77 U2 라운드 보고서

**작성일**: 2026-05-02
**기준 커밋**: `46933de` (U1 완료 시점)
**대상 파일**: `src/pages/worker/QrScanPage.jsx` (단일)

---

## 1. 작업 결과

- 변경 파일: `src/pages/worker/QrScanPage.jsx` 1개 (+108 / -23)
- 시안 적용: `worker-screens-v2.jsx` ScreenQrScan + ScreenQrScanDenied
- 빌드: `npm run build` exit 0 / 23.28s / PWA precache 13 entries

## 2. 자산 보존 검증

| # | 자산 | 결과 | 비고 |
|---|---|---|---|
| 1 | QR-CORE (`onScanSuccess` qr_codes SELECT → qr_scans INSERT) | ✅ byte-identical | siblingCodes 조회, scan_type 결정 로직 보존 |
| 2 | recentScans 조회 | ✅ 보존 | qr_scans SELECT (employee_id, today, limit 20) |
| 3 | WorkerLayout (FCM/PWA) | ✅ 미변경 | |
| 4 | App.jsx (라우트) | ✅ 미변경 | |
| 5 | BottomNav | ✅ 미변경 | |
| 6 | primitives.jsx | ✅ 미변경 | T_worker 사용만 |
| 7 | DB 자산 | ✅ DB 변경 없음 | 코드만 변경 |

## 3. 자가 검증 결과 (C1~C7)

| C# | 항목 | 결과 |
|---|---|---|
| C1 | QR-CORE 함수 본문 보존 | ✅ |
| C2 | 영향 파일 단일성 | ✅ QrScanPage.jsx 1건만 |
| C3 | Q6 자동 시작 + "스캔 시작" 단독 버튼 제거 | ✅ |
| C4 | Q7 권한 거부 fallback (early return + ol + reload) | ✅ |
| C5 | recentScans 보존 + 푸터 "최근 스캔 기록" 영역 유지 | ✅ |
| C6 | T_worker 토큰 사용 | ✅ |
| C7 | 빌드 통과 | ✅ exit 0 |

## 4. 결정 게이트 자율 처리 내역

### G77-A (U2): 카메라 권한 거부 시 "다시 시도" 동작 = `window.location.reload()`
- **사용자 확정** (사전 답변)
- 시안 §5.2 C-2의 "ol 안내 → 다시 시도 버튼" 흐름 그대로 적용
- 권한 변경은 OS/브라우저 외부에서 일어나므로 페이지 재로드가 가장 명료

### G77-I 부분 처리 (U2 한정)
- **항목**: QR 스캔 Loading / Error UI 패턴
- **자율 결정**: 기존 코드베이스 패턴 추종 (`scanResult` state + 검정 뷰파인더 위 결과 오버레이)
- **권고 근거**: 기존 QrScanPage가 이미 "성공/실패 메시지 + 아이콘" 패턴을 사용 중이며, CONVERSION_GUIDE §10에서 일관성 추종을 명시. 새 패턴 신설은 회귀 위험만 증가.
- **대안**: Toast 컴포넌트 신설(별도 라운드), Snackbar 도입(별도 라운드)
- **사후 검토 권고**: 사용자가 결과 오버레이 가시성 / 다시 스캔 버튼 노출 시점에 불만 시 알려달라

## 5. 사용자 검증 시나리오

1. `/worker` → "QR 스캔하기" 클릭 → `/worker/m/qr-scan` 이동
2. **첫 진입 시**: 자동 카메라 권한 프롬프트 표시 (Q6)
   - 권한 허용 시: 헤더 "스캔 대기 중" 점등, 카메라 피드 표시, 우상단에 "정지" 아이콘 버튼 노출
   - 권한 거부 시: ScreenQrScanDenied 화면 (Q7)
     - 카메라 아이콘(주황) + "카메라 권한이 필요합니다" + ol 안내 + "뒤로/다시 시도" 버튼
     - "다시 시도" 클릭 → `window.location.reload()` (G77-A)
3. **권한 허용 후**: QR 코드 인식 → 검정 뷰파인더에 ✓ + "스캔 성공" + "<온실명> 작업 시작/중간/완료" 표시
4. 결과 노출 후 푸터에 **"다시 스캔"** 버튼 등장 (이전 "스캔 시작" → "다시 스캔" 라벨 변경)
5. **헤더 우상단 정지 버튼**: 스캐닝 중일 때만 노출, 클릭 시 카메라 정지(페이지 유지)
6. **자산 보존 확인 (수동)**:
   - 알려진 QR 인식 → qr_codes 매칭 → qr_scans INSERT 정상
   - "최근 스캔 기록" 카드에 새 항목 추가 노출
   - siblingCodes 기반 scan_type 결정(start → half → complete) 정상

## 6. 시안과 다른 시각 결정

- **헤더 우상단 정지 버튼**: 스캐닝 중에만 노출. 시안 §5.2 C는 항상 노출이지만, 비스캐닝 상태(결과 화면)에서는 무동작 버튼이 혼란을 유발하므로 조건부 표시.
- **푸터 "다시 스캔" 버튼**: 시안에는 없으나 결과 노출 후 사용자가 다시 스캔하려면 필요. 자동 재시작 대신 사용자 의도 확인.
- **`scanResult` 결과 오버레이**: 시안에는 ScreenQrScan에 결과 표시 영역 부재. 기존 자산(검정 뷰파인더 + 결과 오버레이)을 그대로 보존하여 회귀 방지.

## 7. 발견 사항

- `eslint-disable-next-line react-hooks/exhaustive-deps` 1건 추가 (useEffect에서 `startScan` 호출 시 deps 누락 경고 회피). 의도적 — 마운트 1회만 실행.
- `permissionStatus`는 'pending'/'granted'/'denied' 3상태이며, 'pending' 상태는 헤더 보조 텍스트 "카메라 시작 중..."으로 시각화됨.

## 8. 다음 라운드 진입 가능 여부

✅ **U3 진입 가능**.

U3는 가장 큰 라운드 (Attendance + Leave 모달 + Overtime 모달 + 일별 모달). G77-B/C/D 자율 결정 예정.

---

**끝.**
