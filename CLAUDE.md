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
