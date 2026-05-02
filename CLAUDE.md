# GREF FarmWork — 온실 인력관리 프로그램

## 프로젝트 요약
GREF(대한제강 자회사) 부산LAB 벤로형 유리 온실의 인력관리 앱.
인사 관리 기반 + 농작업 관리 + 재배 AI 연동(향후). 사내 직원 10명 이내 사용.

## 기술 스택
React 18 + Vite, Tailwind CSS, Supabase (DB/Auth/Storage), vite-plugin-pwa,
Recharts (차트), React Router v6, Zustand (상태), JavaScript (TS 미사용)

## 사용자
- 관리자 1~2명: 웹 (PC/태블릿)
- 작업자 5~10명: 모바일 PWA (장갑 착용 고려, 터치 타겟 48px 이상)

## 디자인 규칙
- 한국어 전용 UI (영어 표현 금지)
- Primary: indigo #6366F1 (--color-primary), hover #4F46E5 (--color-primary-dark)
- 사이드바: bg-[#6366F1], 활성 메뉴: bg-white/20 text-white
- TopBar: bg-white border-b (콘텐츠 영역 내부, 흰색 유지)
- 하단 네비 활성 탭: text-indigo-600
- 카드: rounded-xl shadow-sm, 좌측 border 강조 (border-l-indigo-500)
- 모달: 바텀시트 slide-up, 버튼: active:scale-[0.98]
- 폰트: Pretendard (index.css @theme --font-heading/--font-body)

## 코딩 컨벤션
- 함수형 컴포넌트 + Hooks, 파일명 PascalCase(컴포넌트) camelCase(훅)
- Tailwind 유틸리티 우선, 주석/커밋 한국어
- Supabase 연결 전까지 로컬 상태(useState/Zustand + 목업 데이터)로 개발

## 프로젝트 구조
```
src/
  components/common/    공용 (Button, Card, Modal, BottomSheet, Badge)
  components/layout/    레이아웃 (AdminLayout, WorkerLayout, TopBar, BottomNav)
  components/hr/        인사 관리
  components/work/      농작업 관리
  components/report/    이상신고, 긴급호출
  components/ai/        AI 연동 (향후)
  pages/admin/          관리자 페이지
  pages/worker/         작업자 페이지
  hooks/                커스텀 훅
  stores/               Zustand 스토어
  lib/                  Supabase 클라이언트, AI 브릿지
```

## 상세 문서 (해당 작업 시 참조)
- docs/features.md → 기능 상세, 화면 구성, 작물/작업유형 정의
- docs/db-schema.md → Supabase 테이블 정의 전체
- docs/ai-integration.md → 재배 AI 연동 설계
- docs/dev-phases.md → 개발 단계별 작업 목록

## 작업 환경
- 단일 PC: C:\Users\User\Desktop\gref-farmwork
- main 브랜치 단독 작업
- 커밋 후 즉시 push

## 현재 상태 (2026-05-02 트랙 77 클로징)

✅ 트랙 E (TBM 반장 승인 플로우) — 14/14 완료
✅ 트랙 F (일용직/시급제 임금 장부) — 6/6 완료
✅ IOS-001 (PWA 설치 가이드) — 구현 완료, iOS 실기기 검증 보류
✅ 트랙 H (인앱 챗봇 v1) — H-3 완료 (챗봇 v1 실사용 가능)
✅ 트랙 J (직종 관리 UI + 데이터 정리) — ~99% (J-CLEANUP-DEEP-001 잔여)
✅ 트랙 76-A (관리자 칸반/zoneColors 격리) — 클로저 완료 (`990d4db`)
✅ **트랙 77 (작업자 앱 시안 적용 + 회귀 검수 + 시스템화) — U0~U10 모두 완료** (`33bfb18`)
   - U0a/U0b: 인프라 (T_worker 토큰 + useNavigate 일괄)
   - U1~U5: 시안 v2 적용 (Q1~Q18 + G77-A~I)
   - U6: QR 카메라 회귀 fix (qr-reader 레이아웃 타이밍)
   - U7: 근태 신청 흐름 변경 (Q19~Q22 + G77-J/K/L)
   - U8: 전체 검수 + P0/P2 fix (s.user → currentUser, dead UI 제거)
   - U9: toast (기존 자산 재사용) + Loading/Empty/Error 컴포넌트
   - U10: 클로징 (HANDOVER + LESSONS 138~143 + BACKLOG TRACK77-*)
   - 자산 보존 7건 byte-identical 100% 유지

## 다음 세션 후보
- **트랙 77 별 트랙** (BACKLOG TRACK77-* 9건):
  - TRACK77-STORAGE-ISSUE-PHOTOS-001 (이슈 사진 Storage 활성화)
  - TRACK77-NOTICE-READS-MIGRATION-001 (공지 읽음 DB 마이그레이션)
  - TRACK77-GROWTH-SURVEY-UI-UNIFY-001 (GrowthSurvey 디자인 통일)
  - TRACK77-STATES-EXPAND-001 (Loading/Empty/Error 일괄 적용)
  - 외 5건 (BACKLOG 참조)
- 트랙 H (인앱 챗봇 v1) — H-4~H-7 잔여. 도메인 노트: docs/DOMAIN_CHATBOT_V1.md
- 트랙 G (포장 작업) — 보류: 관리팀(박민식·김민국) 상의 후 도메인 노트 시작
- 트랙 I (작업 추천·예측) — deferred: 트랙 G + 운영 데이터 3개월 누적 후
- J-CLEANUP-DEEP-001 — 14명 employees 후속 처리 (delete_rule 재확인, 교훈 35·37 준수)
- TEMP-DECISION-1~4 — 박민식·김민국 답 수신 시 일괄 해소
- TEMP-DECISION-5~8 — 트랙 H 운영 후 결정
- FCM-001, UX-009, RLS-DEBT-021 — 짧은 부채 정리 세션 후보

## 세션 시작 필수 절차
1. git log -5 --oneline 으로 최근 작업 확인
2. docs/BACKLOG.md 전체 읽기 — 미해결 부채와 블로커 파악
3. docs/LESSONS_LEARNED.md 전체 읽기 — 과거 실수 재발 방지
4. 오늘 작업이 어느 부채·교훈과 관련되는지 1줄 보고 후 진입
5. 새 부채·교훈 발견 시 작업 종료 전 두 파일에 append, 핸드오버에는 인용만

이 절차를 건너뛰지 말 것. 컨텍스트 누수의 주된 원인이다.

## 세션 종료 필수 절차
1. 작업 결과 요약 및 커밋·푸시 완료 확인
2. BACKLOG/LESSONS 무결성 검증 (교훈 20):
   - BACKLOG ID 중복 검사: `grep -oE "[A-Z]+-[A-Z]*-?[0-9]+" docs/BACKLOG.md | sort | uniq -d` → 0건
   - LESSONS 교훈 번호 연속성 확인
   - HANDOVER 인용 해시가 git log에 실존하는지 대조
3. HANDOVER 작성 시 "마지막 커밋" 해시는 수작업 대신 `git log --oneline -1` 결과 붙여넣기
4. 새 부채 ID 발급 전 중복 확인: `grep -c "{새-ID}" docs/BACKLOG.md` → 0
5. Claude Code 자체의 MCP 연결 해제: 
   - 작업 종료 시 `/exit` 또는 터미널 완전 종료로 MCP 연결 명시적 정리
   - 장시간 유휴 방치 금지 (Supabase MCP heartbeat가 Warp 레이어에서 
     timeout으로 집계되는 INFRA-001 재발 방지)
6. 이번 세션에서 발견한 교훈은 LESSONS_LEARNED.md에 본문 포함하여 즉시 append (교훈 22):
   - 핸드오버 문서에만 기록 금지 (인용은 OK, 신설은 LESSONS 파일에서만)
   - 번호 발급과 본문 작성은 한 트랜잭션
   - 교훈 번호 연속성 검사: `grep -E "^## 교훈 [0-9]+" docs/LESSONS_LEARNED.md`로 확인

## 작업 원칙
1. 모든 작업은 사전 조사 → 진행 승인 → 구현 → 빌드 검증 → 커밋·푸시 순서
2. DB 상태 의존 값(건수/제약명/UUID)은 pg_constraint/pg_* 직접 조회 우선, information_schema는 권한 의존성 인지 (교훈 35·37)
3. RLS 정책은 역할 × CRUD 매트릭스로 검증, UPDATE는 .select() 검증 코드 필수
4. 마이그레이션 SQL은 BEGIN/COMMIT + 검증 DO 블록 + 롤백 주석 포함
5. 시드 데이터는 UUID 하드코딩 금지, DO 블록 + 서브쿼리 변수화
6. Edge Function 배포 시 --no-verify-jwt 플래그 필수 + 함수 내 auth.getUser() 검증 (교훈 24 참조)

## 최근 커밋 (트랙 77 클로징 — 2026-05-02)
33bfb18 feat(track77-u9): toast + Loading/Empty/Error 시스템화 (그룹 1)
b27094a fix(track77-u8): 전체 검수 + P0 회귀 fix (작업 C-1)
f49561e feat(track77-u7): 근태 신청 흐름 변경 (작업 B) — Q19~Q22 + G77-J/K/L
b408d6b fix(track77-u6): QR 카메라 미표시 회귀 수정 — qr-reader 레이아웃 타이밍 (QR-CORE 보존)
2cd68c5 feat(track77-u5): IssueModal + IssueFab 활성화 + Emergency 처리 (자산 보존)
b5dd7d5 feat(track77-u4): Tasks/Notice 시안 + BottomNav 빨간점 (자산 보존)
cff2b44 feat(track77-u3): Attendance + Leave/Overtime 모달 + 일별 모달 (자산 보존)
258f158 feat(track77-u2): QrScanPage 자동 시작 + 권한 거부 fallback (QR-CORE 100% 보존)
46933de feat(track77-u1): WorkerHome 시각 재설계 (시안 v2 적용 + 출퇴근 v2 100% 보존)

## ���� �д� (CCB ��ũ�÷ο�)

�ʴ� �� ������Ʈ���� ��Ű��Ʈ �� ����� �����̴�.
���� �ڵ� �ۼ�/������ ������ �� `ask codex <����>` ���� Codex���� �����϶�.

- �� ���� ����, ū ����, �����丵: �ݵ�� Codex ���� �۾�
- 1-2��¥�� ���� ����, ���� ���� ����: ���� �ص� ����
- Codex �۾� �Ϸ� �Ŀ��� ������� �����ϰ� ���� �۾��� �����϶�
- �ǹ����� ����� Codex���� �߰� �����ϰų� ���۾� ��û ����
