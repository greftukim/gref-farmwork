# HANDOVER — 세션 73 (73 · 73-A · 73-B · 73-C) 최종

**날짜**: 2026-04-27  
**담당**: Claude (claude-sonnet-4-6)  
**마지막 커밋**: cacd1ed  
**커버 범위**: 세션 73 ~ 73-C (Phase 5 공식 종료 직후 — 운영 후 트랙 첫 묶음)

---

## 세션 전체 요약

| 서브세션 | 주요 작업 | 결과 |
|----------|-----------|------|
| 73 | HQ 대시보드 Y축 수확량 차트 재설계 + 챗봇 FAB/패널 숨김 | ✅ |
| 73-A | 모바일 홈 2종(Farm/HQ) 디자인 교체 — MA 토큰 정렬 + 실데이터 | ✅ |
| 73-B | AdminMobilePages.jsx 전면 재작성 — 실 store 연결 4종 | ✅ |
| 73-C | MOBILE-AUTO-DETECT-001 구현 + QR 발급 UI + Track C (Floor/Perf) | ✅ |

---

## 커밋 목록

| 해시 | 내용 |
|------|------|
| 1e79665 | feat(session73): HQ 대시보드 디자인 교체 — Y축 수확량 차트 + 경영지표 카드 삭제 |
| 2d9bc3e | feat(session73a): 모바일 홈 2종 디자인 교체 — MA 토큰 정렬 + PC inline 헬퍼 패턴 + 실데이터 |
| fa0d0eb | docs(backlog): LABOR-COST-001 + TASK-MOBILE-001 신규 등록 |
| f95f8cf | feat(session73): 챗봇 FAB + 패널 임시 숨김 처리 (세션 73) |
| b2353bd | feat(mobile): 73-B AdminMobilePages 실 store 연결 + BACKLOG 3건 등록 |
| aa58dbd | feat(qr): 73-C 작업자 QR 발급 UI 구현 + BACKLOG 정리 |
| 264a65e | feat(mobile): 73-C 관리자 모바일 자동 감지 + 탭 라우트 연결 |
| cacd1ed | feat(mobile): Track C 완료 — MobileFloorScreen 준비 중 + MobilePerfScreen 실데이터 |

---

## 세션 73 — HQ 대시보드 + 챗봇 숨김

### HQ 대시보드 재설계 (DashboardInteractive.jsx)

- 경영지표 카드 행(가동률/인건비/kg당 원가/순이익 추정) 삭제 — 데이터 없는 mock 노출 제거
- Y축 수확량 막대 차트: 지점별 × 최근 4주 그룹 막대 → 단순 단일 막대로 교체
- 주 평균 계산 개선

### 챗봇 FAB + 패널 임시 숨김 (AdminLayout.jsx)

```jsx
{/* 세션 73 임시 숨김 — 재활성화: 아래 두 줄 주석 해제 */}
{/* <ChatbotFab /> */}
{/* <ChatbotPanel /> */}
```

운영 안정화 이후 재활성화 예정.

---

## 세션 73-A — 모바일 홈 2종 재설계

**파일**: `src/pages/mobile/AdminMobile.jsx`

- `MobileAdminHomeFarm`: attendanceStore(당일 출근) + leaveStore(대기) + issueStore(미해결) 실 연결
- `MobileAdminHomeHQ`: 전 지점 수확량·가동률·이슈·승인 실 연결 (branchStore/harvestStore/attendanceStore)
- 디자인 원칙: MA 토큰(MA.text, MA.card, MA.muted …)만 사용, T.* / HQ.* 신규 토큰 없음
- StatTile / CardBlock / Row / Chip / Dot 공용 헬퍼 확정

**신규 BACKLOG**:
- LABOR-COST-001: 인건비 집계 DB 미연결
- TASK-MOBILE-001: 오늘 작업 진행 taskStore 미연결

---

## 세션 73-B — AdminMobilePages.jsx 전면 재작성

**파일**: `src/pages/mobile/AdminMobilePages.jsx`

| 화면 | 연결 store | 비고 |
|------|-----------|------|
| MobileApprovalScreen | leaveStore | farmReview approve/reject, Tinder 카드 스택 |
| MobileMoreScreen | employeeStore / leaveStore / issueStore | 8그룹 메뉴, 실 카운트 뱃지 |
| MobileInboxScreen | leaveStore / issueStore | NOTIFICATION-STORE-001 Case Z' Option 1 |
| MobileFloorScreen | (Track C 대기) | 73-B 시점 mock — 73-C에서 교체 |
| MobilePerfScreen | (Track C 대기) | 73-B 시점 mock — 73-C에서 교체 |

**신규 BACKLOG**:
- NOTIFICATION-STORE-001: 퍼시스턴트 알림 이력 store 미존재 (open)
- MOBILE-FLOOR-001: 평면도 뷰 Tier 6 예정 (open)
- MOBILE-PERF-001: 성과 실데이터 연결 → 73-C에서 즉시 resolved

---

## 세션 73-C — 운영 진입 직전 회귀 진단 + QR + Track C

### MOBILE-AUTO-DETECT-001 구현 (resolved)

**파일**: `src/components/layout/AdminLayout.jsx`

```jsx
// 모바일 진입 시 /admin/m/home 자동 전환
useEffect(() => {
  if (window.innerWidth < 768 && !location.pathname.startsWith('/admin/m')) {
    navigate('/admin/m/home', { replace: true });
  }
}, []);

const isMobileRoute = location.pathname.startsWith('/admin/m');
// 사이드바: className="hidden md:flex" + !isMobileRoute 조건
// AdminBottomNav: {!isMobileRoute && <AdminBottomNav />}
// main padding: className={isMobileRoute ? '' : 'pb-24 md:pb-0'}
```

**파일**: `src/pages/mobile/AdminMobile.jsx`

```jsx
const TAB_ROUTES = {
  home:    '/admin/m/home',
  approve: '/admin/m/approve',
  floor:   '/admin/m/floor',
  perf:    '/admin/m/perf',
  more:    '/admin/m/more',
};
// AdminMobileShell 탭 onClick → navigate(TAB_ROUTES[t.id])
```

이 구현 전 발생했던 이중 탭바(AdminBottomNav + AdminMobileShell 자체 탭바) 문제도 동시 해소.

---

### QR-ISSUE-001 구현 (resolved)

작업자 QR 로그인 토큰 발급 UI — 운영 진입 블로커.

**파일**: `src/stores/employeeStore.js`

```js
issueDeviceToken: async (id) => {
  const token = crypto.randomUUID();
  const { data, error } = await supabase
    .from('employees').update({ device_token: token })
    .eq('id', id).select().single();
  if (!error && data) {
    set(s => ({ employees: s.employees.map(e => e.id === id ? snakeToCamel(data) : e) }));
    return { token };
  }
  return { error };
},
```

**파일**: `src/pages/admin/EmployeesPage.jsx`

- 작업자(role === 'worker') 행에 "QR" 버튼 추가
- 클릭 시 `issueDeviceToken` 호출 → QRCodeSVG 200px 모달 표시
- QR URL: `${window.location.origin}/auth?token=${qrTarget.token}`
- 복사 버튼 + 재발급 버튼 + 경고 문구(재발급 시 기존 QR 무효화)

**인증 흐름**:
`QR 스캔 → /auth?token={uuid} → AuthCallbackPage → loginWithDeviceToken() → employeeStore 세션`

---

### PWA 팝업 미표시 진단 (partial)

두 가지 독립 컴포넌트 확인:

| 컴포넌트 | 트리거 | 차단 조건 |
|----------|--------|-----------|
| PWAInstallGuideModal | `getGuideType()` → sessionStorage `pwa_guide_shown` | 세션 재진입 시 숨김 |
| InstallPromptBanner | `useInstallPrompt.js isIosSafari()` → localStorage `pwa-install-dismissed` | 7일 차단 또는 인앱 브라우저 미감지 |

**주의**: `InstallPromptBanner`의 `isIosSafari()`는 카카오톡·네이버 인앱 브라우저를 감지 못함.
실 운영 중 인앱 브라우저 접속 확인 시 `deviceDetect.js`의 `getInAppBrowser()` 연동 필요.
→ 테스트 전 `localStorage.removeItem('pwa-install-dismissed')` 및 `sessionStorage.clear()` 필수.

---

### Track C — MobileFloorScreen 교체 (resolved)

**이전**: MiniFloorPlan SVG + 하드코딩 골 목록 + LegendItem 전부 mock  
**이후**: attendanceStore 실 출근 인원 + "준비 중" 안내 CardBlock

```jsx
// 실 데이터: attendanceStore + employeeStore
const todayStats = useMemo(() => {
  const branchEmps = employees.filter(e => e.isActive && (!branch || e.branch === branch));
  const checkedInIds = new Set(records.filter(r => r.date === today && r.checkIn).map(r => r.employeeId));
  return {
    total: branchEmps.length,
    present: branchEmps.filter(e => checkedInIds.has(e.id)).length,
    absent: branchEmps.filter(e => !checkedInIds.has(e.id)).length,
  };
}, [records, employees, today, branch]);
```

`LegendItem` · `MiniFloorPlan` mock 컴포넌트 삭제 완료.  
MOBILE-FLOOR-001 설명 갱신 (Tier 6 QR 위치 추적 예정 명시).

---

### Track C — MobilePerfScreen 실데이터 연결 (resolved → MOBILE-PERF-001)

```jsx
const PERF_PERIODS = ['일', '주', '월', '분기'];
const [periodIdx, setPeriodIdx] = useState(1); // 기본: 주

const dateFrom = useMemo(() => {
  const now = new Date();
  if (periodIdx === 0) return now.toISOString().split('T')[0];  // 일
  if (periodIdx === 1) { /* 이번 주 월요일 */ }
  if (periodIdx === 2) return `${now.getFullYear()}-${...}-01`; // 월
  return null; // 분기 → 전체 기간
}, [periodIdx]);

const { workers, loading } = usePerformanceData(dateFrom, null);
const top5 = useMemo(() => [...workers].sort((a,b) => b.harvestPct - a.harvestPct).slice(0,5), [workers]);
const branchAvg = useMemo(() => { /* 지점별 harvestPct 평균 */ }, [workers]);
```

- Top 5: 실 harvestPct 정규화 (전체 평균=100)
- 지점별 평균 막대: D_BRANCH_META × branchAvg
- 로딩 스피너 + 빈 상태 UI

---

## BACKLOG 변경 요약 (세션 73~73-C)

| ID | 상태 변경 | 설명 |
|----|-----------|------|
| LABOR-COST-001 | 신규 open | 인건비 DB 미연결 |
| TASK-MOBILE-001 | 신규 open | 오늘 작업 진행 taskStore 미연결 |
| NOTIFICATION-STORE-001 | 신규 open | 퍼시스턴트 알림 이력 store 미존재 |
| MOBILE-FLOOR-001 | 신규 open → 설명 갱신 | Tier 6 QR 위치 추적 예정 |
| MOBILE-PERF-001 | 신규 open → **resolved** | usePerformanceData 실 연결 |
| MOBILE-AUTO-DETECT-001 | 신규 → **resolved** | AdminLayout 모바일 자동 감지 |
| QR-ISSUE-001 | 신규 → **resolved** | 작업자 QR 발급 UI |
| PC-FLOOR-DATA-001 | 신규 open | PC FloorPlan도 mock — Tier 6 동일 트랙 |

---

## 두 가지 QR 구분 (중요)

이 프로젝트에는 **서로 다른 목적의 QR이 두 가지** 존재한다. 혼동 금지.

| 구분 | 용도 | 현황 |
|------|------|------|
| **로그인 QR** | 작업자 PWA 인증 (`employees.device_token`) | ✅ 73-C 구현 완료 |
| **위치 QR** | 거터 위치 추적 (`zones` 테이블, Track L) | ⏳ Tier 6 예정 (MOBILE-FLOOR-001 / PC-FLOOR-DATA-001) |

로그인 QR: 관리자가 EmployeesPage에서 발급 → 작업자가 스캔 → PWA 자동 로그인  
위치 QR: 각 거터에 부착 → 작업자가 스캔 → 현재 위치 기록 (미구현)

---

## 다음 세션 우선 순위

### 1순위 — 운영 안정화 검증

운영 진입 직전 점검 목록 (새 채팅방에서):

- [ ] `npm run build` 0 에러 확인 (현재: ✅ cacd1ed 기준 clean)
- [ ] 모바일 실기기에서 `/admin` 접속 → `/admin/m/home` 자동 전환 확인
- [ ] 작업자 QR 발급 → 스캔 → `/auth?token=` → 자동 로그인 E2E 확인
- [ ] PWA 배너: Safari에서 `localStorage.removeItem('pwa-install-dismissed')` 후 재확인
- [ ] 챗봇 FAB 비활성 상태에서 레이아웃 회귀 없음 확인

### 2순위 — 평면도 + QR 위치 추적 (Tier 6)

- MOBILE-FLOOR-001 + PC-FLOOR-DATA-001 동시 해소
- zones 테이블 + zone_assignments + QR 스캔 흐름 설계
- Track L과 통합 여부 검토 (TRACK-L-G-MERGE-001)

### 3순위 — 오픈 부채 처리

- TEMP-DECISION-1~4: 박민식·김민국 답변 대기
- APPROVAL-CATEGORY-001: 예산/인사/자재 카테고리 구현 여부 결정
- HQ-FINANCE-003: 월별 재무 입력 폼 (Phase 3)
- JOB-TYPE-LEGACY-CLEANUP-001: employees.job_type 일괄 UPDATE

---

## 새 채팅방 시작 가이드

```bash
# 1. 최근 커밋 확인
git log --oneline -5

# 2. BACKLOG 전체 읽기 (미해결 부채·블로커)
cat docs/BACKLOG.md | head -300

# 3. LESSONS_LEARNED.md 마지막 10개 교훈 확인
grep -E "^## 교훈 [0-9]+" docs/LESSONS_LEARNED.md | tail -10

# 4. 빌드 상태 확인
npm run build 2>&1 | tail -5
```

**세션 시작 전 보고 양식**:
> "오늘 작업 후보: {트랙명}. 관련 부채: {BACKLOG ID}. 관련 교훈: {교훈 번호}."

---

## 파일별 현재 상태 요약

| 파일 | 상태 |
|------|------|
| `src/pages/mobile/AdminMobile.jsx` | MobileAdminHomeFarm/HQ 실데이터, AdminMobileShell 탭 navigate 연결 |
| `src/pages/mobile/AdminMobilePages.jsx` | 5개 화면 전부 구현. Floor: 준비 중 + attendanceStore. Perf: usePerformanceData 실 데이터 |
| `src/components/layout/AdminLayout.jsx` | 모바일 자동 감지 + 이중 탭바 해소 + 챗봇 숨김 |
| `src/pages/admin/EmployeesPage.jsx` | QR 발급 모달 구현 (qrcode.react) |
| `src/stores/employeeStore.js` | issueDeviceToken 액션 추가 |
| `src/pages/hq/Dashboard.jsx` | Y축 수확량 차트 재설계 |
| `docs/BACKLOG.md` | 세션 73~73-C 항목 갱신 완료 |

---

*이 문서는 세션 73-C 종료 시점(커밋 cacd1ed)의 코드베이스를 기준으로 작성되었습니다.*
