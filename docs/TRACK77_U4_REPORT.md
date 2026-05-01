# 트랙 77 U4 라운드 보고서

**작성일**: 2026-05-02
**기준 커밋**: `cff2b44` (U3 완료 시점)
**대상 파일**:
- `src/pages/worker/WorkerNoticePage.jsx` (시각 재설계 + localStorage 읽음 추적)
- `src/pages/worker/WorkerTasksPage.jsx` (T_worker + 칩 탭)
- `src/components/layout/BottomNav.jsx` (공지 탭 unread 빨간점)
- `src/lib/noticeRead.js` (신규)

---

## 1. 작업 결과

- 변경 4개 파일 (modified 3 + 신규 1)
- 빌드: `npm run build` exit 0 / 24.10s / PWA precache 13 entries

## 2. 자산 보존 검증

| # | 자산 | 결과 |
|---|---|---|
| 1 | noticeStore.js | ✅ 미변경 (markRead 호환 호출만) |
| 2 | authStore.js | ✅ 미변경 (currentUser 사용으로 latent bug 해소) |
| 3 | WorkerLayout (FCM/PWA) | ✅ 미변경 |
| 4 | App.jsx | ✅ 미변경 |
| 5 | primitives.jsx | ✅ 미변경 (T_worker 사용만) |
| 6 | components/task/** (76-A) | ✅ 미참조 (grep 0건) |
| 7 | DB 스키마 | ✅ 변경 없음 (localStorage 사용) |

## 3. 자가 검증 결과 (C1~C9)

| C# | 항목 | 결과 |
|---|---|---|
| C1 | 영향 파일 정확히 4개 | ✅ |
| C2 | 76-A 자산 미참조 (TaskBoard 등) | ✅ |
| C3 | Q5 BottomNav 공지탭 빨간점 | ✅ |
| C4 | G77-F localStorage 읽음 추적 (DB 변경 0) | ✅ |
| C5 | currentUser 사용 (latent bug fix) | ✅ |
| C6 | WorkerTasksPage T_worker + 칩 탭 | ✅ |
| C7 | noticeStore.js diff = 0 라인 | ✅ |
| C8 | BottomNav 4탭 구조 유지 (Tailwind 패턴) | ✅ |
| C9 | 빌드 통과 | ✅ |

## 4. 결정 게이트 자율 처리 내역

### G77-E (U4): unread 카운트 방식 = **기존 useNoticeStore.notices 동기 사용**
- **권고 근거**:
  1. 기존 noticeStore가 `fetchNotices`/`addNotice` 패턴으로 자동 로드 (WorkerLayout 또는 어느 페이지 진입 시 트리거)
  2. Polling/Realtime 추가는 PWA backgrounding 이슈 + 트래픽 부담
  3. BottomNav는 NavLink 이동마다 React 재렌더 → notices 변동 즉시 반영
  4. 작업자 즉시성 요구 낮음 (공지는 시간 단위가 정상)
- **대안**:
  - Polling 60초 간격 — 별도 useEffect 추가 비용 + 트래픽 (현재 미요구)
  - Supabase Realtime — 모바일 PWA backgrounding 시 connection drop 위험
- **사후 검토 권고**: 사용자가 즉시 반영 필요 시 60초 polling 추가는 BottomNav.useEffect 1개로 가능. 별도 라운드 처리 권장.

### G77-F (U4): notice_reads 테이블 = **신설 안 함, localStorage 사용**
- **권고 근거**:
  1. DB notices.read_by 컬럼 미존재 (noticeStore.js:40 명시 주석)
  2. localStorage = 디바이스별 영속, 페이지 새로고침 후에도 읽음 상태 유지
  3. DB 변경 0 → 자산 보존 + 회귀 위험 최소
  4. 본 라운드 책무 = "BottomNav 빨간점 + 공지 페이지 읽음 표시" — localStorage로 충분
- **대안**:
  - notice_reads 테이블 신설 (다중 디바이스 동기화 + 분석)
  - notices.read_by JSON 배열 컬럼 추가 (배열 mutation 동시성 위험)
- **사후 검토 권고**: 사용자가 다중 디바이스(휴대폰+태블릿) 사용하며 디바이스 간 읽음 상태 동기화 필요 시 별도 라운드로 notice_reads 마이그레이션. 사전 SQL 박제:
  ```sql
  -- 향후 마이그레이션용 (현재 실행 X)
  CREATE TABLE notice_reads (
    notice_id UUID REFERENCES notices(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    read_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (notice_id, user_id)
  );
  ALTER TABLE notice_reads ENABLE ROW LEVEL SECURITY;
  CREATE POLICY "user_read_own" ON notice_reads
    FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
  ```

### G77-I 부분 처리 (U4 한정)
- **자율 결정**:
  - Loading: 별도 처리 없음 (notices가 빠르게 로드, 짧은 0건 상태로 노출)
  - Empty: "새 공지가 없어요" 카드 + bell 아이콘 (시안 §4.7 패턴)
  - Error: 별도 처리 없음 (기존 fetch 실패 시 noticeStore 내부 silent — 미해결 latent)
- **권고 근거**: noticeStore.fetchNotices 실패 처리는 기존 자산이며 본 라운드 범위 외. 명시적 에러 UI는 별도 라운드 권고.
- **사후 검토 권고**: 공지 fetch 실패 빈도가 높으면 noticeStore에 error state 추가 + Error UI 라운드 권고.

### 부수 발견 (latent bug fix)
- **이전 코드**: `useAuthStore((s) => s.user)` — authStore에는 `user` 키 부재, `currentUser` 키만 존재
- **결과**: 이전 WorkerNoticePage에서 unread 계산이 항상 0 (모든 공지를 읽음으로 판단했을 가능성)
- **수정**: `currentUser`로 변경 + localStorage 읽음 추적 도입으로 정상화
- **회귀 위험**: 0 — 기능 정상화 방향

## 5. 사용자 검증 시나리오

### BottomNav (전체 작업자 페이지)
1. 신규 공지가 있을 때 → BottomNav "공지사항" 탭 아이콘 우상단에 **빨간 점** 표시 (Q5)
2. 공지사항 페이지 진입 → 공지 카드 클릭 → 읽음 처리 → BottomNav 빨간점 갱신
3. 모든 공지를 읽으면 빨간점 사라짐
4. 페이지 새로고침/재진입 후에도 읽음 상태 유지 (localStorage)

### WorkerNoticePage (`/worker/notices`)
1. 헤더: "공지사항" + 우측에 "미확인 N" 배지 (빨간 점 + 카운트)
2. 공지 카드:
   - **미확인**: 좌측 3px 빨간/파란 accent + "NEW" 빨간 배지 + 굵은 제목
   - **확인 후**: 회색 정상 카드, 옅은 제목, NEW 배지 사라짐
3. 카드 클릭 → 상세 모달 (제목/긴급-중요 배지/본문/작성자/시간) + localStorage 기록
4. 빈 상태: "새 공지가 없어요" 카드

### WorkerTasksPage (`/worker/tasks`)
1. BottomNav "작업" 탭 진입
2. 헤더: 뒤로 + "내 작업"
3. **칩 탭** (라운드 chip 스타일): 오늘(N) / 이번 주(N) / 완료(N) — 활성 탭 primary 채움
4. 카드 액션: 작업 시작 / 완료 처리 — 기존 store 동작 보존
5. 빈 상태: "예정된 작업이 없습니다" 또는 "완료한 작업이 없습니다"
6. 76-A 자산(TaskBoard 등) 미참조 → 관리자 칸반 격리 유지

## 6. 시안과 다른 시각 결정

- **NEW 빨간 배지**: 시안에는 없으나 미확인 강조를 위해 추가. 비파괴.
- **WorkerNoticePage 헤더 보조 라벨 ("근태")** 제거: 시안과 일치 (시안 §5.7는 단일 제목 "공지사항"만).
- **WorkerTasksPage "상세" 버튼**: 기존 코드의 dead 버튼 그대로 유지 (별도 detail page 없음). U5 이후에서 활성화 또는 제거 검토.
- **BottomNav 빨간점 위치**: 아이콘 우상단 (-top-0.5 -right-1). 시안 §5.9의 absolute top:6 right:calc(50%-18px) 패턴을 Tailwind 등가로 변환. 실측 시안 거의 동일.

## 7. 발견 사항

- **WorkerNoticePage latent bug**: `useAuthStore((s) => s.user)` → undefined 반환했으므로, 기존 `markRead` 호출이 사실상 no-op. 본 라운드에서 `currentUser`로 자동 정상화.
- **BottomNav Tailwind 보존**: Q11(inline+T_worker)는 작업자 페이지 본체 권고. BottomNav는 layout 컴포넌트로 Tailwind 유지가 회귀 위험 최소. 빨간점만 Tailwind `bg-red-500`로 추가.
- **WorkerTasksPage `Pill`/`Dot` 미사용 import 제거**: 정리.

## 8. 다음 라운드 진입 가능 여부

✅ **U5 진입 가능**.

U5: IssueModal 신설 + IssueFab 활성화 + Emergency 페이지 처리. G77-G/H 자율 결정 예정.

---

**끝.**
