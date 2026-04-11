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

## 현재 트랙
트랙 E (TBM 시스템 고도화) — 9/13 완료

## 진행률
✅ E-1 ~ E-5c (작업자 측 TBM 전체)
⏳ E-6 반장 승인 플로우 ← 다음
⏳ E-7 EmployeesPage 반장 토글
⏳ E-8 관리자 확장 + Excel

## 활성 백로그
- RLS-DEBT-018: safety_checks_team_leader_update 정책 역할 오류 (E-6에서 수정)
- BUG-004: snakeToCamel 중첩 객체 재귀 미처리
- UX-010: pre_task Step 2 중도 닫기 재오픈 로직

## 세션 시작 필수 절차
1. git log -5 --oneline 으로 최근 작업 확인
2. docs/BACKLOG.md 전체 읽기 — 미해결 부채와 블로커 파악
3. docs/LESSONS_LEARNED.md 전체 읽기 — 과거 실수 재발 방지
4. 오늘 작업이 어느 부채·교훈과 관련되는지 1줄 보고 후 진입
5. 새 부채·교훈 발견 시 작업 종료 전 두 파일에 append, 핸드오버에는 인용만

이 절차를 건너뛰지 말 것. 컨텍스트 누수의 주된 원인이다.

## 작업 원칙
1. 모든 작업은 사전 조사 → 진행 승인 → 구현 → 빌드 검증 → 커밋·푸시 순서
2. DB 상태 의존 값(건수/제약명/UUID)은 항상 information_schema 또는 SELECT로 실측
3. RLS 정책은 역할 × CRUD 매트릭스로 검증, UPDATE는 .select() 검증 코드 필수
4. 마이그레이션 SQL은 BEGIN/COMMIT + 검증 DO 블록 + 롤백 주석 포함
5. 시드 데이터는 UUID 하드코딩 금지, DO 블록 + 서브쿼리 변수화

## 최근 커밋 (Phase 4)
b08f1d0 E-5c: anon update 정책 + confirmRisks 방어
ac248ba E-5b: WorkerTasksPage 첫 작업 TBM 인터셉트
048ade6 E-5a: SafetyCheckBottomSheet 2단계 확장
7bd37ad E-4: WorkerHome TBM 인터셉트 제거
ff1f39b E-3.1: cropIds 배열 지원
3fdf9cc E-3 핫픽스
2f8c27a E-3: safetyCheckStore 확장
ff55104 E-2: 위험 템플릿 35건 시드
8aee6a9 E-2.1: 부산LAB 현장 피드백 반영 (35→32건)
e632d53 E-1: TBM v2 스키마
