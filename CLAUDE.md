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
- Primary: emerald 계열, 탑바 bg-emerald-950, 하단네비 rgba(5,46,22,.96)
- 카드: rounded-xl shadow-sm, 좌측 border 강조
- 모달: 바텀시트 slide-up, 버튼: active:scale-[0.98]
- 폰트: Work Sans (제목) + Public Sans (본문)

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

## 현재 상태 (2026-04-12 Phase 5 세션 6 종료)

✅ 트랙 E (TBM 반장 승인 플로우) — 14/14 완료
✅ 트랙 F (일용직/시급제 임금 장부) — 6/6 완료
✅ IOS-001 (PWA 설치 가이드) — 구현 완료, iOS 실기기 검증 보류

## 다음 세션 후보
- 트랙 G (포장 작업) — 다음 트랙, 도메인 노트 신설부터 시작
- TEMP-DECISION-1~4 — 박민식·김민국 답 수신 시 일괄 해소
- FCM-001 — 반장 2명 이상 maybeSingle() 처리 로직 결정
- UX-009 — 알림 권한 denied 재요청 UI (IOS-001과 통합 검토)

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
2. DB 상태 의존 값(건수/제약명/UUID)은 항상 information_schema 또는 SELECT로 실측
3. RLS 정책은 역할 × CRUD 매트릭스로 검증, UPDATE는 .select() 검증 코드 필수
4. 마이그레이션 SQL은 BEGIN/COMMIT + 검증 DO 블록 + 롤백 주석 포함
5. 시드 데이터는 UUID 하드코딩 금지, DO 블록 + 서브쿼리 변수화

## 최근 커밋 (Phase 5 세션 6)
489f635 IOS-001: iOS PWA 설치 가이드 + 인앱 브라우저 감지
8e5ab22 F-5: RLS 권한 회귀 검증 통과 — 트랙 F 6/6 마감
49ba657 F-4: 월별 보기 탭 + 월별 엑셀 2시트
c150ae6 F-3: 일별 엑셀 다운로드
7a28d24 F-2 hotfix: 시간 입력 자동 포맷팅
06995b2 F-2 hotfix: 시급 입력 step 1000 → 10
