# 트랙 77 U6 라운드 보고서 — QR 카메라 레이아웃 수정 (작업 A)

**작성일**: 2026-05-02
**기준 커밋**: `2cd68c5` (U5 완료 시점)
**대상 파일**: `src/pages/worker/QrScanPage.jsx` (단일)

---

## 1. 작업 결과

- 변경 파일: `src/pages/worker/QrScanPage.jsx` 1개
- 빌드: `npm run build` exit 0 / 21.25s / PWA precache 13 entries

## 2. 진단

### 2.1 사용자 신고
- /worker/m/qr-scan 진입 시 "스캔 대기 중" 헤더만 보이고 카메라 영상 영역이 빈 검정 공간
- 권한 거부 fallback도 안 보임 → permissionStatus가 'denied'도 아님

### 2.2 근본 원인
U2(`258f158`)에서 도입한 자동 시작 로직이 **레이아웃 타이밍 충돌**을 유발.

타임라인:
1. 마운트 → React 첫 렌더 → JSX 커밋
2. 이 시점 `qr-reader` div 스타일: `display: scanning ? 'block' : 'none'` → `scanning=false`이므로 `display:none`
3. useEffect 콜백 실행 → `startScan()` 호출
4. `new Html5Qrcode('qr-reader')` — 엘리먼트는 존재하지만 부모가 display:none
5. `await scanner.start(...)` — getUserMedia 권한 획득 + `<video>` 엘리먼트를 qr-reader 안에 부착
6. **부모가 display:none이므로 video 엘리먼트가 0×0으로 렌더링되어 고정**
7. `setScanning(true)` → re-render → 부모 display:block 전환
8. **video는 이미 0×0 상태로 캐시되어 있어 부모가 visible 되어도 보이지 않음**

증거: 사용자가 "스캔 대기 중" 헤더(scanning=true 시 표시)를 본다는 것은 scanner.start()가 정상 resolve, permissionStatus='granted'임을 의미. 따라서 권한이나 흐름이 아닌 **레이아웃 문제**.

### 2.3 수정 방안
- `qr-reader`를 항상 DOM에 + 명시적 dimensions(absolute inset:0)으로 두기
- 정적 뷰파인더/결과 화면을 absolute overlay로 덮기
- 외곽 컨테이너에 `aspectRatio: 1` 적용하여 부모 dimensions 보장

**핵심 변경**:
```jsx
// 변경 전 (U2)
<div id="qr-reader" style={{ display: scanning ? 'block' : 'none', ... }} />
{!scanning && <div style={{ aspectRatio: '1', ... }}>...정적 뷰파인더...</div>}

// 변경 후 (U6)
<div style={{ position: 'relative', aspectRatio: '1', ... }}>
  <div id="qr-reader" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} />
  {!scanning && <div style={{ position: 'absolute', inset: 0, ... }}>...overlay...</div>}
</div>
```

이로써:
- 마운트 시점부터 qr-reader는 부모 dimensions 상속 → html5-qrcode가 video를 정상 크기로 렌더
- 비스캔 시 정적 뷰파인더가 카메라 피드 위를 덮음
- 스캔 시작 → overlay 사라짐 → 카메라 영상 노출

## 3. 자산 보존 검증

| # | 자산 | 결과 |
|---|---|---|
| 1 | QR-CORE (qr_codes SELECT → qr_scans INSERT, onScanSuccess 본문) | ✅ byte-identical |
| 2 | recentScans 조회 | ✅ 미변경 |
| 3 | startScan 함수 시그니처/스캐너 인스턴스 호출 | ✅ 미변경 |
| 4 | ScreenQrScanDenied 분기 | ✅ 미변경 |
| 5 | WorkerLayout (FCM/PWA) | ✅ 미변경 |
| 6 | App.jsx | ✅ 미변경 |
| 7 | DB 스키마 | ✅ 변경 없음 |

## 4. 자가 검증 결과 (C1~C7)

| C# | 항목 | 결과 |
|---|---|---|
| C1 | 빌드 통과 | ✅ exit 0 / 21.25s |
| C2 | QR-CORE 자산 보존 | ✅ |
| C3 | useEffect 카메라 자동 시작 코드 존재 | ✅ |
| C4 | qr-reader가 명시적 dimensions로 항상 마운트 | ✅ |
| C5 | permissionStatus 'denied' 분기 보존 | ✅ |
| C6 | window.location.reload() (G77-A) 보존 | ✅ |
| C7 | qr_scans INSERT 흐름 보존 | ✅ |

## 5. 결정 게이트 자율 처리 내역

본 라운드에는 신규 결정 게이트 없음 — 진단 + 수정 작업.

## 6. 사용자 검증 시나리오

| # | 시나리오 | 기대 결과 |
|---|---|---|
| 1 | /worker/m/qr-scan 진입 | 카메라 권한 prompt 자동 표시 (또는 이미 grant 시 즉시 카메라 영상) |
| 2 | 권한 허용 | **카메라 영상 즉시 표시** (U6 핵심 검증 — U2 회귀 해소 확인) |
| 3 | QR 코드 비춤 | qr_scans INSERT + 결과 안내 (체크 아이콘 + "스캔 성공") |
| 4 | 권한 거부 | ScreenQrScanDenied 표시 + 다시 시도 버튼 |
| 5 | 다시 시도 클릭 | window.location.reload() (G77-A 보존) |
| 6 | "다시 스캔" 클릭 (결과 노출 후) | startScan 재호출 → 카메라 재가동 |
| 7 | 우상단 정지 버튼 클릭 | stopScan → 정적 뷰파인더로 복귀 |

## 7. 배포 / 푸시 상태

- 로컬 SHA: (커밋 후 보고)
- git push origin main: (커밋 후 실행 예정)
- 원격 검증: (push 후 보고)
- Vercel webhook: 자동 트리거 예상

## 8. 발견 사항

- **html5-qrcode 동작 특성**: 부모 컨테이너의 dimensions를 `start()` 시점에 video 엘리먼트에 캐시. 이후 부모가 display 변경되어도 video 크기는 갱신되지 않음. 본 라이브러리 사용 시 부모는 항상 명시적 dimensions를 가져야 안전.
- **U2 시점 회귀**: 시각 시안만 적용한 라운드여도 레이아웃 타이밍 영향이 있을 수 있음 → C-1 전체 검수 필요성 확인.

## 9. 다음 라운드 진입 가능 여부

✅ **U7 진입 가능** — 작업 B (근태 신청 흐름 변경) 즉시 진행.

---

**끝.**
