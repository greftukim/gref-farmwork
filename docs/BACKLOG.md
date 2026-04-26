# GREF FarmWork — 부채·이슈 누적 대장

이 파일은 프로젝트 전체 부채(RLS·버그·UX·데이터·기타)와 이슈 ID의 **단일 진실 공급원**이다.
신규 부채는 핸드오버 문서에 서술하기 전에 **여기에 먼저 등록**하고, 핸드오버에서 이 파일을
인용한다. 상태 변경(resolved 등)도 커밋과 함께 이 파일을 직접 갱신한다.

---

## 추적 항목

| ID | 카테고리 | 상태 | 발견 세션 | 블로커 여부 | 한 줄 설명 | 상세 링크 |
|---|---|---|---|---|---|---|
| RLS-DEBT-015 | RLS | open | Phase 2 (2026-04-09) | - | hr_admin의 overtime_requests UPDATE 컬럼 레벨 제한이 DB 정책이 아닌 앱 레벨 가드(updateOvertimeHours)에만 의존 | [docs/handoff/2026-04-09.md](handoff/2026-04-09.md#설계-부채) |
| RLS-DEBT-016 | RLS | open | Phase 2 (2026-04-09) | - | attendance authenticated INSERT 시 input_by=current_employee_id() 강제가 DB 정책이 아닌 앱 레벨 가드(proxyCheckIn)에만 의존 | [docs/handoff/2026-04-09.md](handoff/2026-04-09.md#설계-부채) |
| RLS-DEBT-018 | RLS | resolved | Phase 5 세션 1 (2026-04-11) | - | safety_checks_authenticated_update 정책이 farm_admin 본인 지점 UPDATE를 명시적으로 허용하지 않음 | [docs/HANDOVER_PHASE5_SESSION1.md](HANDOVER_PHASE5_SESSION1.md#해결됨-) |
| RLS-DEBT-019 | RLS | open | Phase 5 세션 1 (2026-04-11) | - | safety_checks_anon_select 정책이 지점 격리 없이 전체 조회 허용 — 보안 느슨. Phase 5 세션 3: 날짜 narrowing(`date = CURRENT_DATE`)으로 노출 표면 축소(완화). 동작 검증 완료 (2026-04-11, anon-yesterday=0 vs service-yesterday=1 대조 입증). 근본 해소(worker 단위 격리)는 device_token 기반 RLS 재설계 필요 — RLS-DEBT-021로 승계. | [docs/HANDOVER_PHASE5_SESSION1.md](HANDOVER_PHASE5_SESSION1.md#신규-백로그-3건) |
| FCM-001 | FCM | open | Phase 5 세션 3 (2026-04-11) | - | branch당 반장 2명 이상 등록 시 maybeSingle()이 에러를 던지고 try/catch로 silent fail. 진주·하동 가동 전 첫 1명/전원/배정 로직 중 결정 필요. | docs/BACKLOG.md |
| INFRA-001 | INFRA | resolved | Phase 5 세션 3 (2026-04-11) | Phase 5 세션 4에서 원인 확정 및 해소 | Supabase PostgREST Warp 서버 'Thread killed by timeout manager' 에러 다수 발생. 세션 3에서 가설 6건 탈락 후 '인프라 간헐 이슈'로 잠정 결론 → 세션 4 실측 재검증에서 **원인이 Antigravity 환경 내 Claude Code의 Supabase MCP 연결**로 확정. MCP 클라이언트가 장시간 유휴 상태에서도 유지하는 연결/heartbeat가 Warp HTTP 레이어에서 timeout으로 집계된 것. 검증 방법: Claude Code 종료 → 21:48~22:48 KST 1시간 구간 PostgREST 로그 0건 확인(이전 대비 100% 감소). Free Nano 리소스 부족 가설은 **탈락**. 해소: Claude Code 세션을 장시간 유휴 상태로 방치하지 말 것, 작업 종료 시 명시적으로 종료. 재발 방지는 교훈 21 참조. | docs/BACKLOG.md |
| RLS-DEBT-021 | RLS | open | Phase 5 세션 3 (2026-04-11) | - | safety_checks anon SELECT의 worker 단위 격리 — device_token claim 기반 RLS 재설계 필요. RLS-DEBT-019의 근본 해소 항목. 트랙 F 후보. | docs/BACKLOG.md |
| E-6.5 | 검증 | resolved | Phase 5 세션 5·6 (2026-04-12) | - | TBM 반장 알림 FCM 실기기 검증 6/6 통과. 시크릿 손상(FIREBASE_SERVICE_ACCOUNT) 사고 추적 및 복구. 교훈 23 박제. | docs/BACKLOG.md |
| UX-009 | UX | open | Phase 5 세션 3 (2026-04-11) | - | 알림 권한 denied 상태에서 사용자가 권한 재요청할 수 있는 UI 없음. 시크릿창/처음 사용자에게 권한 안내 + 재시도 버튼 필요. 트랙 F 후보. | docs/BACKLOG.md |
| IOS-001 | UX | resolved (검증 보류) | Phase 5 세션 6 (2026-04-12) | - | 구현 완료. iOS 실기기 부재로 검증은 박민식·김민국·iOS 사용자 만났을 때. 안드로이드 Chrome 회귀 0건 확인. deviceDetect.js + PWAInstallGuideModal.jsx 신규, Worker/AdminLayout 양쪽 통합. | docs/BACKLOG.md |
| RLS-DEBT-020 | RLS | resolved | Phase 5 세션 1 (2026-04-11) | - | fcm_tokens INSERT 정책 — Phase 5 세션 3 MCP 실측 결과 anon/authenticated INSERT 정책 이미 존재 확인. BACKLOG 기록 시점과 실제 DB 불일치였음. | [docs/HANDOVER_PHASE5_SESSION1.md](HANDOVER_PHASE5_SESSION1.md#신규-백로그-3건) |
| POSTGREST-001 | POSTGREST | resolved | Phase 5 세션 1 (2026-04-11) | - | Phase 5 세션 3 전수 검토: embed 패턴 5곳 모두 FK 제약명 명시 확인, 수정 0건. 상세: [docs/audits/POSTGREST-001_audit.md](audits/POSTGREST-001_audit.md) | [docs/HANDOVER_PHASE5_SESSION1.md](HANDOVER_PHASE5_SESSION1.md#신규-백로그-3건) |
| BUG-005 | BUG | resolved | Phase 5 세션 1 (2026-04-11) | - | loginWithDeviceToken select 목록에 is_team_leader 누락 — 반장 권한 판정 불가 | [docs/HANDOVER_PHASE5_SESSION1.md](HANDOVER_PHASE5_SESSION1.md#해결됨-) |
| UX-005 | UX | open | Phase 2 (2026-04-09) | - | master가 LeaveStatusPage(읽기 전용)로 라우팅되나 RLS상 UPDATE 권한 있음 — UI/RLS 불일치 | [docs/handoff/2026-04-09.md](handoff/2026-04-09.md#ux-관련) |
| UX-006 | UX | open | Phase 2 (2026-04-09) | - | farm_admin 대리 입력 전용 간소화 페이지 필요 여부 — 실사용 후 재평가 | [docs/handoff/2026-04-09.md](handoff/2026-04-09.md#ux-관련) |
| UX-007 | UX | open | Phase 2 (2026-04-09) | - | 반차/휴가 발생 시 attendance와 leave_requests 통합 처리 검토 — 현재 완전 분리 | [docs/handoff/2026-04-09.md](handoff/2026-04-09.md#ux-관련) |
| UX-008 | UX | open | Phase 2 (2026-04-09) | - | working(근무중) 상태 기록 시각 수정 허용 여부 — B-4에서 차단 결정, 실사용 후 재평가 | [docs/handoff/2026-04-09.md](handoff/2026-04-09.md#ux-관련) |
| AUDIT-001 | 기타 | open | Phase 2 (2026-04-09) | - | attendance 감사 추적 강화 — last_edited_by / last_edited_at 컬럼 추가 (B-4에서 원본 input_by 보존으로 우선 결정) | [docs/handoff/2026-04-09.md](handoff/2026-04-09.md#데이터감사) |
| DATA-001 | 기타 | open | Phase 2 (2026-04-09) | - | 하동 지점 branches 레코드 없음 — farm_admin(하동재배팀) 존재하나 GPS 좌표/반경 미등록, 실운영 전 필수 | [docs/handoff/2026-04-09.md](handoff/2026-04-09.md#데이터감사) |
| DATA-002 | 기타 | open | Phase 2 (2026-04-09) | - | EmployeesPage:203, WorkStatsPage:70의 currentUser.branch 직접 참조 — master(branch=NULL) 동작 미검증 | [docs/handoff/2026-04-09.md](handoff/2026-04-09.md#데이터감사) |
| Track H | 챗봇 | in-progress | Phase 5 세션 7 (2026-04-12) | - | 인앱 챗봇 v1 (admin 전용, 쿼리·피드백, 액션 없음). 도메인 노트: docs/DOMAIN_CHATBOT_V1.md. H-0 ~ H-7 8단계. H-0 완료 (2026-04-12). H-1 완료 (2026-04-12, 세션 9) — Edge Function chatbot-query 배포 + curl 테스트 통과 (정상 응답 + 범위 외 거절 + chat_logs 저장). H-1.5 완료 (2026-04-12, 세션 11) — curl 3/3 시나리오 통과. H-2 완료 (2026-04-12, 세션 12) — 도구 5종 정의 + tool_use 루프 + 사용자 JWT RLS 위임 + curl 6/6 시나리오 통과. H-2.5 완료 (2026-04-13, 세션 13) — submit_feedback 도구 + chatbot_feedback 테이블 + RLS 정책 3종. 이월 3건: RLS-WORKER-ROLE-TEST-001, RLS-MASTER-VISIBILITY-STRONG-001, CURL-WORKER-SKIP-001. H-3 완료 (2026-04-14, 세션 14·15, 단위 1~6 완료) — AdminLayout FAB + 슬라이드 패널 + Zustand 스토어 + 5종 query 도구 + submit_feedback 통합. 챗봇 v1 실사용 가능. | docs/DOMAIN_CHATBOT_V1.md |
| Track I | 인사이트 | deferred | Phase 5 세션 7 (2026-04-12) | - | 작업자별 작업별 소요시간 기반 작업 배치·예상 시간 추천 모듈. 트랙 H 챗봇 v1과 분리됨. 선행조건: (1) 트랙 G(포장) 완료, (2) 트랙 F 시간 단위 정밀 기록 보강, (3) 운영 데이터 3개월 누적. 빨라도 2026 하반기. | docs/BACKLOG.md |
| GENERAL-DASHBOARD-ITEMS-001 | 도메인 미확정 | open | 세션 15 (2026-04-14) | - | general role 대시보드 노출 항목 정의 — 박민식·김민국 답변 대기. 트랙 J 단위 4 또는 별 트랙에서 처리. | docs/handoff/2026-04-14_session15.md |
| EMPLOYEE-PASSWORD-FIRST-LOGIN-001 | 보안 | open | 세션 15 (2026-04-14) | - | 트랙 J 마감 후 계정별 비밀번호 변경 필수. 첫 로그인 시 비밀번호 변경 강제 정책 검토. 현재 통일 비밀번호(rmfpvm001) 임시 운용. | docs/handoff/2026-04-14_session15.md |
| TRACK-L-G-MERGE-001 | 트랙 매핑 | resolved | 세션 15 (2026-04-14) 등록 → 세션 74-B (2026-04-27) 해소 | - | RECON_2 항목 8 확인: DB 스키마 겹침 없음. Track L(거터 QR 위치 추적)과 Track G(포장 작업)는 별도 트랙으로 분리 확정. 통합 불필요. | docs/HANDOVER_SESSION74A_RECON_2.md |
| BUG-F01 | BUG | resolved | 세션 28 (2026-04-24) | - | Dashboard 상단 지점 카드 b.harvest 부동소수점 누산 표시 버그(진주HUB `3115.7000000000003`) + toLocaleString() 누락. Dashboard.jsx:271 수정으로 해결. 커밋 3c6a275. | docs/BACKLOG.md |
| BUG-F02 | BUG | resolved | 세션 28 (2026-04-24) | - | Dashboard 작물 탭 4개(토마토/딸기/파프리카/오이) cropFilter가 주별 바에만 반영되고 지점 합계·총합 미반영. 작물 탭 전면 제거 + 지점별×작물별 그룹 막대 6개 + 막대 클릭 추이 차트(최근 30일) 재설계로 해결. 커밋 3c6a275. | docs/BACKLOG.md |

---

### IOS-001 (open) — iOS PWA 설치 가이드 + 인앱 브라우저 감지

**배경**: 트랙 E 14/14 마감 시점에 발견. iOS는 안드로이드와 푸시알림 동작 방식이 근본적으로 다름.

**제약사항**:
- iOS는 PWA(홈 화면에 추가) 설치 시에만 푸시 알림 수신 가능
- "홈 화면에 추가"는 Safari로 접속한 경우에만 정상 동작
- iOS Chrome / 카카오톡 인앱 브라우저 / 네이버 인앱 브라우저는 PWA 설치 불가
- iOS 16.4 미만은 웹 푸시 자체 불가
- iOS는 알림 권한 자동 요청 불가, 사용자가 직접 버튼 눌러야 함

**필요 작업**:
- 부산LAB iOS 사용자 비율 확인 (박민식 통해)
- User Agent 기반 iOS / Safari / 인앱 브라우저 감지 로직
- 인앱 브라우저(카카오톡/네이버) 감지 시 "Safari로 열기" 안내 모달
- iOS Safari 감지 시 "홈 화면에 추가" 단계별 안내
- 안드로이드 사용자에게는 노출 안 함 (UX 분리)
- iOS 16.4 미만 기기 식별 및 안내 정책

**연관**: UX-009 (알림 권한 denied 재요청 UI)와 통합 검토

**우선순위**: 트랙 F 마감 후, 트랙 G 진입 전 처리 권고. 미해결 시 iOS 사용자 1명 추가될 때마다 알림 미수신 클레임 발생 가능.

---

## 트랙 F — 일용직/시급제 임금 장부

| ID | 분류 | 상태 | 등록 | 비고 |
|---|---|---|---|---|
| F-0 | 마이그레이션 | resolved | Phase 5 세션 6 (2026-04-12) | daily_work_logs 테이블 + RLS 2정책 + GENERATED 2컬럼 + 인덱스 2개. 검증 9/9 통과 (work_minutes=480, daily_wage=80000) |
| F-1 | Store | resolved | Phase 5 세션 6 (2026-04-12) | dailyWorkLogStore + CRUD 액션. GENERATED 컬럼 payload 방어 |
| F-2 | UI | resolved | Phase 5 세션 6 (2026-04-12) | 일별 보기 페이지 + 등록/수정/삭제 모달. 시간 입력 자동 포맷팅 hotfix(7a28d24), 시급 step hotfix(06995b2) 포함 |
| F-3 | Excel | resolved | Phase 5 세션 6 (2026-04-12) | 일별 엑셀 다운로드. 도메인 노트 §4.3(i) 10컬럼 1:1 |
| F-4 | UI+Excel | resolved | Phase 5 세션 6 (2026-04-12) | 월별 보기 탭 + 월별 엑셀 2시트(전체/사람별합계). 도메인 노트 §4.3(ii) |
| F-5 | 검증 | resolved | Phase 5 세션 6 (2026-04-12) | RLS 권한 회귀 검증 8/8 통과. 보고서: docs/audits/F5_rls_verification.md |
| TEMP-DECISION-1 | 도메인 미확정 | open | Phase 5 세션 6 (2026-04-12) | payment_status enum 임시 2단계(pending/paid). 박민식·김민국 답 수신 시 ALTER TYPE 확장. 위치: 마이그레이션 + 도메인 노트 |
| TEMP-DECISION-2 | 도메인 미확정 | open | Phase 5 세션 6 (2026-04-12) | break_minutes nullable 임시. 답 수신 시 NOT NULL DEFAULT 0 전환. 위치: 마이그레이션 + 도메인 노트 |
| TEMP-DECISION-3 | 도메인 미확정 | open | Phase 5 세션 6 (2026-04-12) | branch CHECK 3개 지점 모두 허용 임시. 진주·하동 운영 여부 미확인. 위치: 마이그레이션. 도메인 노트 §8 추적 |
| TEMP-DECISION-4 | 도메인 미확정 | open | Phase 5 세션 6 (2026-04-12) | daily_wage 반올림 정책 ROUND() 임시. 답 수신 시 GENERATED 식만 교체. 위치: 마이그레이션 + 도메인 노트 |

---

## 트랙 H — 인앱 챗봇 v1

| ID | 분류 | 상태 | 등록 | 비고 |
|---|---|---|---|---|
| TEMP-DECISION-5 | 도메인 미확정 | open | Phase 5 세션 7 (2026-04-12) | 피드백(`d` 용도) 저장 위치: chat_logs 통합 vs 별도 feedback 테이블. 임시: chat_logs 통합 (tools_used에 'submit_feedback' 마킹). 위치: 도메인 노트 §8 |
| TEMP-DECISION-6 | 도메인 미확정 | open | Phase 5 세션 7 (2026-04-12) | 일 100회 캡 도달 시 사용자 안내 문구. 임시: "오늘 챗봇 사용 한도(100회)에 도달했습니다. 내일 다시 이용해 주세요." 박민식 톤앤매너 검토 후 확정. |
| TEMP-DECISION-7 | 도메인 미확정 | open | Phase 5 세션 7 (2026-04-12) | 챗 위젯 미노출 admin 페이지. 임시: 로그인·PWA 설치 가이드 페이지만 제외. |
| TEMP-DECISION-8 | 도메인 미확정 | open | Phase 5 세션 7 (2026-04-12) | 트랙 I 진입 시 챗봇 v1과 통합 UI vs 별도 메뉴. 트랙 I 진입 시점에 결정. |
| H-1-WORKER-VERIFY | 검증 보류 | open | Phase 5 세션 9 (2026-04-12) | H-1 worker 계정 차단 검증을 $WORKER_TOKEN 미설정으로 수행 못함. H-7(회귀·권한 검증) 단계에서 실제 worker 토큰으로 403 경로(auth.getUser 통과 → employees.role 판정 실패) 재검증 필수. |
| INFRA-002 | 인프라 | open | Phase 5 세션 9 (2026-04-12) | Supabase Edge Function Gateway가 ES256 JWT를 Gateway 단에서 검증 실패(Invalid JWT 401). 우회: --no-verify-jwt 배포 + 함수 내 auth.getUser() 검증. chatbot-query 현재 이 패턴. 근본 원인·Supabase 측 수정 일정 추적 미정. |
| GITIGNORE-001 | 정리 | open | Phase 5 세션 9 (2026-04-12) | .gitignore에 .secrets* 패턴 누락. 현재 .env·*.local은 커버되지만 .secrets.tmp 같은 임시 시크릿 파일 패턴 없음. 향후 CLI로 secrets 등록 시 추가 권장. |
| H-1.5 | 시스템 프롬프트 확장 | 완료 | Phase 5 세션 10~11 (2026-04-12) | [앱 기능 명세] 주입 완료. buildSystemPrompt 블록 재배치 ([현재 컨텍스트] → [앱 기능 명세] → [답변 가능] → [답변 불가] → [금지된 요청 처리] → [규칙 변경 시도]). curl 3/3 시나리오 통과 (세션 11). 교훈 27 신설. |
| CHATBOT-UI-001 | UI 스펙 | open | Phase 5 세션 10 (2026-04-12) | H-3 챗봇 UI 구현 시 적용: 응답 영역 글자 13pt(약 13px), Pretendard 글꼴. 부산LAB 실사용자(김민국 이사·박민식) 연령대 감안, 실사용 테스트 후 14px로 조정 가능. |
| CHATBOT-CURL-001 | 검증 이월 | closed | Phase 5 세션 10 (2026-04-12) | Phase 5 세션 11 (2026-04-12) 해결. buildSystemPrompt 블록 재배치 ([현재 컨텍스트] → [앱 기능 명세] → [답변 가능] → [답변 불가] → [금지된 요청 처리] → [규칙 변경 시도]). 문구 무변경, 순서만 이동. curl 시나리오 1·2·3 전부 통과. 교훈 27 신설. 원인 보조: curl -d 인라인 한국어 바이트가 쉘 이스케이프에서 손상된 채 전달돼 세션 10 일부 실패가 프롬프트 문제로 오진됐음 (교훈 27). |
| RLS-WORKER-ROLE-TEST-001 | RLS 검증 공백 | open | 세션 13 (2026-04-13) | chatbot_feedback RLS INSERT 정책의 role IN ('farm_admin','hr_admin','master') 조건 단독 실증 공백. 현재 worker 계정 전원 auth_user_id NULL이라 SQL 시뮬레이션 재현 불가. 향후 worker Supabase Auth 통합 시(별도 트랙) 또는 staging 환경 구축 시 검증 필요. 현재 단위 5에서는 EXISTS 실패 시나리오(SQL-2 대체안)로 대체 실증. |
| RLS-MASTER-VISIBILITY-STRONG-001 | RLS 검증 공백 | open | 세션 13 (2026-04-13) | chatbot_feedback RLS SELECT 정책 chatbot_feedback_select_master의 '전체 가시' 실증 약함. 현재 검증 시점(SQL-5)에 DB row 1건뿐이라 master 본인 row와 타인 row 동시 존재 조건 시뮬레이션 불가. 가설 B(정책 미작동) 기각은 확정됐으나 강한 경험적 확증은 공백. 프로덕션 데이터 누적 후 재검증 또는 staging 환경에서 master row + 타인 row 동시 존재 상태 시뮬레이션 필요. |
| CURL-WORKER-SKIP-001 | 실증 공백 | open | 세션 13 (2026-04-13) | H-2.5 단위 5에서 worker JWT 발급 경로 부재로 curl 층 worker 차단 실증 스킵. DB layer 차단은 SQL-2로 실증됐으나 H-1 layer(chatbot-query Edge Function의 role 검증)의 worker 차단 동작은 curl 재현 안 됨. worker 계정에 Supabase Auth 통합되는 미래 시점 또는 team_leader JWT로 대체 실증 가능 시 재검증. |
| DOC-DRIFT-001 | 문서 정합성 | wontfix | 세션 13 (2026-04-13) | DOMAIN_CHATBOT_V1.md §3.5 employees.auth_user_id NOT NULL 표기 확인·수정. 세션 13 단위 1 P3 note에서 발견, runtime은 NULLABLE 확정 (worker 계정 device_token 인증으로 auth_user_id NULL이 의도적 설계). 실동작 무영향. → 세션 14 재검증: §3.5는 파일 최초 생성(c239fa3)부터 `auth_user_id` 표기 부재, docs/ 전체 `auth_user_id NOT NULL` 스키마 표기 zero hit. 세션 13 P3 note §3.5 지정 오기 추정. 수정할 원문 없음. |
| DATE-DRIFT-001 | 코드 결함 | closed (세션 14 단위 5-C, efaf196) | 세션 13 (2026-04-13) | 본질 재정의: Claude Code 컨테이너 시계 + Edge Function chatbot-query (index.ts 시스템 프롬프트 + tools.ts todayISO()) 모두 UTC 기준 사용 → KST 자정~오전 9시 9시간 구간(부산LAB 업무 시작 시간 포함)에서 1일 어긋남. 세션 14 단위 5-C에서 todayKST() rename + KST_OFFSET_MS 상수 + Edge Function 재배포로 해소. |
| CHATBOT-CREDIT-MONITOR-001 | 운영 | open | 세션 14 (2026-04-14) | Anthropic API 크레딧 잔고 모니터링 + 임계값 알림 설정. 세션 14 단위 5-C 재테스트 직전 크레딧 부족으로 챗봇 일시 중단 발생. 운영 critical. 즉시 가능: Anthropic console에서 spending limit 알림 설정. CHATBOT-BILLING-CORPORATE-001과 함께 검토. |
| CHATBOT-BILLING-CORPORATE-001 | 운영 | open | 세션 14 (2026-04-14) | Anthropic 결제 회사 계정 전환 — 현재 태우 개인 카드 등록. 회계 분리·비용 추적·퇴직 시 인수인계 사유. 운영 critical. 회사 협의 필요 (회계·법무). 단순 코드 작업 아님. |
| CHATBOT-ERROR-CLASSIFY-CREDIT-001 | UX | open | 세션 14 (2026-04-14) | Anthropic API 400 결제 이슈 별도 에러 분류. 현재 fallback 메시지 ("일시적인 오류") 모호 — 사용자가 크레딧 이슈인지 시스템 장애인지 구분 불가. 관리자(태우)에게는 별도 알림 분기 필요. 사용자 UX 영역. |
| CHAT-LOG-INCOMPLETE-TURN-001 | 데이터 정합 | open | 세션 14 (2026-04-14) | LLM 호출 실패 시 chat_logs에 user turn만 INSERT, assistant turn 없음 → 미완 row 누적. H-5 모니터링 페이지 설계 시 처리 방식 결정 필요. H-6 비용 집계에서 실패 호출 카운트 분리 필요. H-5 진입 시 우선순위 격상 검토. |
| CHAT-LOG-TURN-INDEX-VALIDATION-001 | 데이터 정합 | open | 세션 14 (2026-04-14) | chatbot-query 서버가 클라이언트 turn_index 검증 안 함 → 부정확한 값 통과. LLM 컨텍스트는 messages 배열로 전달되니 동작 영향 0, 다만 chat_logs 분석 시 빈 구간 발생. 교훈 34 회고 사례 1번 (단위 6-D 박제 예정). |
| CHATBOT-CONFIRM-MODAL-001 | UX | open | 세션 14 (2026-04-14) | D39 v1.1 — 새 대화 버튼 window.confirm을 커스텀 모달로 교체. 디자인 정합 + 모바일 UX 개선. v1.1 검토 항목. 우선순위 낮음. |
| CHATBOT-BODY-LOCK-DESKTOP-RELAX-001 | UX | open | 세션 14 (2026-04-14) | D45 v1.1 — body 스크롤 락을 모바일 한정으로 완화. 데스크톱 사용 시 body 스크롤 차단 불필요. v1.1 검토 항목. 우선순위 낮음. |
| CHATBOT-ROLES-EXTRACT-001 | 코드 정리 | open | 세션 14 (2026-04-14) | 챗봇 노출 role 검증 로직(farm_admin/hr_admin/master) 여러 곳 중복 — permissions.js로 공통화. H-4·H-5 진입 시 검토. 우선순위 낮음. |
| I18N-FOUNDATION-001 | 인프라 | open | 세션 14 (2026-04-14) | i18n 도입 검토 — 한국어 외 다국어 지원 필요 시점에 진입. 현재 한국어 단일. 부산LAB 사용자 한국어 단일 확정 시 wontfix 가능. 우선순위 낮음. |
| CHATBOT-NAMING-DRIFT-001 | 코드 정리 | open | 세션 15 (2026-04-14) | chatStore.js setToolUsePending 함수명·TOOL_USE_PENDING_ID·toolUsePending 필드명이 "tool_use 전용" 명명이지만 실 호출 패턴은 LLM 응답 대기 전 일반 로딩 (도구 호출 + 순수 텍스트 응답 통합). 단위 6-B에서 content + JSDoc만 일반화, rename은 deps·import·filter selector 영향 광범으로 별건. v1.1 또는 별 트랙에서 일괄 rename 검토. 우선순위 낮음 (코드 동작 영향 0). 단위 6-D 박제 교훈 32 회고 사례 추가 후보 — 단위 5-A·5-B 명명 결정이 후속 일반화(D27)와 안 맞은 사례. |
| HIRE-DATE-AFFILIATION-001 | 데이터 정합 | open | 세션 16 (2026-04-15) | - | 박민식·김민국·김현도 hire_date NULL 상태 (엑셀 비고가 소속 정보 "대표이사"·"대한제강 소속"). 실 GREF 입사일 확보 시 UPDATE 필요. 우선순위 낮음. | docs/handoff/2026-04-15_session16.md |
| PACKING-LEADER-COLUMN-001 | 도메인 미확정 | open | 세션 16 (2026-04-15) | - | 엑셀 비고 "포장반장"·"포장" 표기는 트랙 G(포장) 진입 시 별 컬럼 신설 검토. 현재 is_team_leader=false 처리 (반장만 매핑). 트랙 G 진입 시점에 처리. | docs/handoff/2026-04-15_session16.md |
| BRANCH-LABEL-MAPPING-001 | UI | open | 세션 16 (2026-04-15) | - | UI 라벨 매핑 — busan→부산LAB, jinju→진주HUB, hadong→하동HUB, headquarters→총괄본사, management→관리팀, seedlab→Seed LAB. J-4-UI 진입 시 구현 대상. | docs/handoff/2026-04-15_session16.md |
| RESIDENT-ID-ENCRYPTION-001 | 보안 | in-progress | 세션 16 (2026-04-15) | 운영 critical | resident_id 컬럼 평문 저장 상태. 실 운영 전 암호화(Supabase Vault 또는 pgcrypto) 검토 필요. 개인정보 보호법 준수. J-4-UI 진입 전 또는 J-4-UI와 병행 처리 권장. 세션 17: encrypt_resident_id + decrypt_resident_id RPC 구현 완료 (b425e87 + UI-0-B-2 fix). UI-C 모달 신설 + round-trip 검증 후 resolved 처리 예정. | docs/handoff/2026-04-15_session16.md |
| RESIDENT-ID-DECRYPT-RUNTIME-VERIFY-001 | 검증 공백 | closed | 세션 17 (2026-04-15) | - | decrypt_resident_id round-trip 검증 보류 — UI-0-B-2-F CTE 가시성 한계로 시뮬레이션 불가. UI-C 모달 신설 후 평문 입력→DB 저장→모달 재진입→평문 표시 일치 확인 필수. 판정 기준: 저장 후 모달 재진입 시 평문 표시 일치. 연관: b425e87 (UI-0-B) + UI-0-B-2 fix. closed_session: 세션 17 (2026-04-16), closed_commit: 0093617, closed_event: UI-C 단계 2-D 재진입 성공, closed_evidence: tukim '900101-1234567' encrypt → DB Base64 저장 → decrypt RPC 200 OK (565ms) → 평문 일치 (Vercel 0093617 Ready 환경, 4건 이미지 증거). | docs/BACKLOG.md |
| BRANCHES-LOCATION-001 | 데이터 보완 | open | 세션 17 (2026-04-16) | 중간 | branches 테이블 4개 신규 row (hadong/headquarters/management/seedlab) 위치 정보 placeholder (NULL) 상태. 출퇴근 GPS 기능 사용 시점에 박민식·김민국 답변 후 실 위치(latitude/longitude/radius_meters) UPDATE 필요. 연관 마이그레이션: 20260416_track_j_branches_seed_fix.sql. 회고 사례: 박제 후보 #16 (Claude Code 추정 생성 패턴). | docs/BACKLOG.md |
| EMPLOYEE-BRANCH-NULL-001 | 데이터 정합 | open | 세션 17 (2026-04-16) | 낮음 | employees 테이블 최수진 (worker, 비활성, username NULL, branch NULL). worker는 지점 소속 필수(운영 모델), branch NULL = 비정상 상태. 비활성으로 운영 무영향이나 정합성 결함. 향후: branch 값 보완 UPDATE 또는 row 삭제 결정. 회고 사례: UI-A 단계 1.5+ NULL 6건 진단 (세션 17). | docs/BACKLOG.md |
| EMPLOYEE-DUPLICATE-NAME-001 | 운영 혼선 가능성 | open | 세션 17 (2026-04-16) | 낮음 | employees 테이블 동명이인 2건 (김지현·김현도) — 신규 admin 활성(jhkim/hdkim) + 구 시드 비활성 공존. 비활성 기본 숨김으로 운영 무영향이나 비활성 표시 모드 진입 시 동명이인 구분 처리 필요. 향후: username/is_active 기반 구분 UI 또는 구 시드 row 삭제 검토. 회고 사례: UI-A 단계 1.5++ 모순 진단 (세션 17). | docs/BACKLOG.md |
| JOB-RANK-SELECT-DECISION-001 | UI 결정 | open | 세션 17 (2026-04-16) | 낮음 | EmployeeForm jobRank 필드 UI 패턴 결정 — 현재 text input 사용 중, 박민식·김민국 답변 또는 운영 중 실 데이터 축적 후 select 전환 여부 결정 필요. 판정 기준: jobRank 값 패턴 확인 후 (반장/대표/부장/과장/사원 등 고정 옵션 필요 시) select with options 전환. 연관: UI-B 단계 1 조사 (세션 17), 8788bb8 (UI-A emptyForm) + UI-B 커밋. | docs/BACKLOG.md |
| RESIDENT-ID-FORMAT-VALIDATION-001 | UI 검증 | open | 세션 17 (2026-04-16) | 낮음 | EmployeeDetailModal resident_id 입력 필드 형식 검증 로직 부재 — 현재 형식 검증 없이 encrypt_resident_id RPC 호출. 한국 주민번호 형식 (YYMMDD-NNNNNNN) 기준 클라이언트 측 정규표현식 검증 추가 검토. 단, 캄보디아 노동자 14명 등 외국인 직원은 주민번호 형식 차이 가능성 (운영 데이터 없음). 판정 기준: 박민식·김민국 답변 수신 또는 실 운영 중 resident_id 값 패턴 확인 후 검증 로직 추가 결정. 연관: UI-C 단계 2 (세션 17), UI-0-B 암호화 RPC (b425e87). | docs/BACKLOG.md |
| JOB-TYPE-LEGACY-CLEANUP-001 | 데이터 정리 | open | 세션 17 (2026-04-16) | 중간 | employees.job_type 레거시 값 전체 정리 — 56행 전원이 EmployeeForm select 옵션 ('재배', '포장', '관리', '기타') 외 값 보유 (활성 38 + 비활성 18). 원인: 세션 16 시드 삽입(J-1/J-4-SEED 추정) 시 job_type = role 패턴으로 입력 (admin 계열은 'admin', worker는 'worker'). UI-B(5948d04)에서 admin role 옵션 제거만 처리하고 job_type 레거시 정리 미수행. 현 영향: 표시 이상 (select 기본 첫 옵션 '재배' 표시, 저장 값은 'admin'/'worker' 그대로) — 기능 무영향이나 사용자 인지 오류 가능. 판정 기준: 박민식·김민국 답변 후 일괄 UPDATE 마이그레이션. role별 추정 매핑 (참고, 운영 이해 기반 확정 필요): worker → '재배' 또는 '포장' (24명 활성, 개별 배정 필요), farm_admin → '관리' 또는 '재배' (8명 활성), hr_admin·general·master → '관리' (6명 활성). 연관: UI-C-FIX 단계 1 조사 (세션 17), UI-B admin 옵션 제거 (5948d04), 세션 16 시드 삽입 (J-1/J-4-SEED). | docs/BACKLOG.md |
| PERMISSIONS-CONSOLIDATION-001 | 권한 정리 | open | 세션 17 (2026-04-16) | 낮음 | 인라인 권한 체크 패턴 정리 — OvertimeApprovalPage L35 currentUser?.role === 'hr_admin' (isActive 미체크) 등 헬퍼 미사용 패턴 식별 + permissions.js 헬퍼로 통일. 실 영향 0 (비활성 로그인 차단), 단 구조 일관성 ↑. 판정 기준: 다른 페이지 전수 grep 후 일괄 정정 또는 페이지별 점진 정정. 연관: UI-D 단계 1 조사 (세션 17), UI-A 부채 정정 (UI-C-FIX, 0093617). | docs/BACKLOG.md |
| FARM-ADMIN-LEADER-SCOPE-CONFIRM-001 | 운영 확인 | open | 세션 17 (2026-04-16) | 낮음 | farm_admin의 반장 부여 권한 범위 확인 — UI-D에서 canToggleTeamLeader (farm_admin 전체) → canAssignLeader (farm_admin 본인 지점만) 전환 채택. 운영 의도 확인 필요. 판정 기준: 박민식·김민국 답변 후 정합 시 유지, 부정합 시 정정. 연관: UI-A canAssignLeader 신설 (8788bb8), UI-D 단계 2 (예정 커밋). | docs/BACKLOG.md |
| CONTRACT-EXPIRY-PUSH-NOTIFICATION-001 | 별 트랙 | open | 세션 17 (2026-04-16) | 낮음 | 계약만료 PWA 푸시 알림 별 트랙 신설 — 현 UI-E는 UI 표시만, FCM 통합 미사용. PWA 푸시 알림 시 Edge Function 신설 (send-notification) + FCM 토큰 조회 + 메시지 전송. 실 운영 요구 확인 후 별 트랙 진입. 연관: UI-E 단계 2 (세션 17, 예정 커밋), 기존 FCM 인프라 (src/lib/firebase.js). | docs/BACKLOG.md |
| J-CLEANUP-DEEP-001 | 데이터 정리 | resolved | 세션 26 (2026-04-23) | - | 세션 26에서 13명 전원 삭제 완료 — 김지현·김현도·김민국·박민식·이강모·최수진(비활성 중복 6명) + 시드_작업자 04~10(7명). 자식 데이터 선제 DELETE/UPDATE 후 employees DELETE 단일 DO 블록 트랜잭션. 영향: attendance 408, tasks 814, calls 65, leave_requests 15, leave_balances 11, notices 2, safety_checks.approved_by 5, issues 4, overtime_requests.reviewed_by 0 / CASCADE 자동 fcm_tokens 11, overtime_requests(employee) 13, safety_checks(worker) 9. 백업 /tmp/session26-backup/dump.json (859.6KB). 사후 검증: target_remaining=0, seed_01~03 생존=3, active_initials=4, orphan 전부 0. HANDOVER_PHASE5_SESSION26. 연관: J-CLEANUP-001 옵션 C (bbfde05). | docs/HANDOVER_PHASE5_SESSION26.md |
| FLOOR-SCHEMA-SKIP-001 | 설계 메모 | resolved | 세션 19 (2026-04-22) 등록 → 세션 74-B (2026-04-27) 해소 | - | src/pages/admin/FloorPlan.jsx(dead code) + src/data/floor-schema.js 두 파일 git rm 삭제 완료. import 0건 재확인 후 삭제. 빌드 0 에러 확인. | docs/HANDOVER_SESSION74B.md |
| EMAIL-SKIP-001 | 설계 메모 | wontfix | 세션 21 (2026-04-22) | - | employees 테이블에 email 컬럼 없음. Sidebar 하단 식별자를 username(@표시)으로 대체. 이메일 기반 기능 필요 시 마이그레이션 재검토. | docs/BACKLOG.md |
| RECONNECT-OTHERS-001 | 재연결 | partial (5/9) | 세션 21 (2026-04-22) | - | HQ 페이지 실데이터 재연결. 세션 22 완료: HQEmployeesScreen·HQApprovalsScreen·Dashboard·HQBranchesScreen·HQNoticesScreen (5개). 이월: HQFinanceScreen·GrowthCompare·Performance·DashboardInteractive (4개). | docs/BACKLOG.md |
| HQ-EMP-TYPE-001 | UI 결정 | open | 세션 22 (2026-04-22) | - | HQEmployeesScreen 고용형태 필터(정규/계약/임시) — employees.job_type 값이 'admin'/'worker'만 존재, 해당 컬럼 없음. empTypeFilter state 클릭 시각 피드백은 있으나 실 필터링 미작동. DB 컬럼 확보 또는 wontfix 결정 필요. | docs/BACKLOG.md |
| HQ-EMP-SEARCH-001 | UI | resolved | 세션 22 등록 → 세션 24 resolved 오표기 → 세션 29 재오픈 → 세션 30 (2026-04-24) 최종 해소 | - | `_pages.jsx:566` `<span>` → `<input>` 교체 + `searchQuery` useState + `tabFiltered` useMemo 필터 연결. 이름·연락처 실시간 필터링 동작. | docs/BACKLOG.md |
| HQ-EMP-CSV-001 | 기능 미구현 | partial | 세션 22 등록 → 세션 30 (2026-04-24) alert 연결 | - | 버튼 무반응 → alert('직원 CSV 내보내기 기능 준비 중입니다.') 임시 처리. 실 CSV 다운로드 로직 미구현 유지. | docs/BACKLOG.md |
| HQ-EMP-ADD-001 | 기능 미구현 | partial | 세션 22 등록 → 세션 30 (2026-04-24) alert 연결 | - | 버튼 무반응 → alert('직원 추가 기능 준비 중입니다.') 임시 처리. EmployeeDetailModal이 create 모드 미지원이라 신규 모달 필요. 별 트랙. | docs/BACKLOG.md |
| HQ-BRANCHES-META-001 | 데이터 보완 | open | 세션 22 (2026-04-22) | - | HQBranchesScreen 지점 카드 상세 정보(지점장·수확량·출근률·면적·작물) — branches 테이블에 해당 컬럼 없음. workers 수만 실데이터, 나머지 하드코딩 유지. DB 컬럼 확보 또는 별 트랙 처리. | docs/BACKLOG.md |
| HQ-NOTICES-META-001 | 데이터 보완 | open | 세션 22 (2026-04-22) | - | HQNoticesScreen 열람률·만료일·대상 — notices 테이블에 해당 컬럼 없음. read:0·readPct:0·expires:'상시' 기본값 표시 중. 컬럼 신설 시 마이그레이션 필요. | docs/BACKLOG.md |
| HQ-FINANCE-001 | 데이터 보완 | Phase1+2 완료·Phase3 대기 | 세션 22 (2026-04-22) 등록 → 세션 52 Phase1 → 세션 53 (2026-04-25) Phase2 완료 | - | finance_monthly + finance_budgets 신설(세션 52). KPI 4개 실데이터(세션 52). Phase2: ComposedChart/PieChart/지점별 수익성 실데이터, 예산 집행률, FinanceTrendCard, kg당 원가 집계(세션 53). Playwright PASS 48. 잔여: 입력UI(HQ-FINANCE-003). | docs/DESIGN_HQ_FINANCE_001.md |
| HQ-FINANCE-002 | 기능 미구현 | resolved | 세션 52 (2026-04-25) 등록 → 세션 53 (2026-04-25) 해소 | - | HQFinanceScreen Phase 2 완료. 월별 수확액 vs 인건비 ComposedChart, 지점별 수익성 실데이터, 비용 구조 PieChart, 예산 집행률 실연결, FinanceTrendCard(DashboardInteractive) 실데이터, kg당 원가 harvest_records JOIN. Playwright PASS 48 / FAIL 0. | docs/DESIGN_HQ_FINANCE_001.md |
| HQ-FINANCE-003 | 기능 미구현 | open | 세션 52 (2026-04-25) | P3 | HQFinanceScreen Phase 3 — 월별 재무 입력 폼 + 예산 수정 UI. Gate-F-03(farm_admin 입력 권한) + Gate-F-05(예산 수정 UI) 결정 후 진입. 박민식·김민국 운영 구조 확인 필요. | docs/DESIGN_HQ_FINANCE_001.md |
| HQ-GROWTH-001 | 재연결 | open | 세션 22 (2026-04-22) | - | GrowthCompare.jsx 실데이터 연결 — HQ_GR_DATA 완전 하드코딩, growth_surveys 테이블 직접 매핑 복잡. 집계 쿼리 설계 후 별 세션 처리. | docs/BACKLOG.md |
| HQ-PERFORMANCE-001 | 재연결 | resolved | 세션 22 (2026-04-22) 등록 → 세션 40 (2026-04-25) 해소 | - | FARM-PERF-DATA-001과 동일 세션 해소. HQPerformanceScreen early return 제거 + harvest_records 집계 + jhkim(hr_admin) 접근 Playwright 확인. Playwright B-3 PASS. | docs/HANDOVER_PHASE5_SESSION40.md |
| HQ-DASHBOARD-INTERACTIVE-001 | 재연결 | resolved | 세션 22 (2026-04-22) 등록 → 세션 49 (2026-04-25) 해소 | - | 핵심 위젯 실데이터 연결 완료. branches useMemo(harvestStore/employeeStore/branchStore/attendanceMap), KPI 수확량·미해결이슈 실데이터, IssueFeedCard 실이슈 4건, 바차트 실집계, 드릴다운, navigate 연결. 하드코딩 잔여(인건비/가동률기간/승인허브/SVG)는 하위 BACKLOG 분리. Playwright O-1~O-14 PASS. 커밋: 세션 49. | docs/HANDOVER_PHASE5_SESSION49.md |
| HQ-DASHBOARD-INTERACTIVE-002 | 기능 미구현 | resolved | 세션 49 (2026-04-25) 등록 → 세션 71 (2026-04-26) 해소 | - | DashboardInteractive 가동률 attendanceMap 실측 연결 완료. periodMeta에서 하드코딩 ga(87-90%) 제거 → branches.checkedIn/workers 합산으로 realGa 계산. 데이터 없을 시 "—" 빈 상태 + "데이터 없음" trend 표시. 기간별 수확량은 월 실데이터×mult 유지(합리적 근사). 인건비는 payroll DB 미연결 "추정" 라벨 유지. | docs/BACKLOG.md |
| HQ-DASHBOARD-INTERACTIVE-003 | 기능 미구현 | open | 세션 49 (2026-04-25) | - | DashboardInteractive 승인 허브 실데이터 미연결 — 승인 테이블 구조 미조사. 현재 7건 하드코딩. 승인 트랙 별도 세션 필요. | docs/BACKLOG.md |
| PROTECTED-ROUTE-001 | UX | resolved | 세션 21 (2026-04-22) 등록 → 세션 43 (2026-04-25) 해소 | - | farm_admin의 /admin/hq/* 직접 URL 접근 차단 완료. App.jsx HQ 라우트를 nested 그룹으로 재구성 + ProtectedRoute(allowedRoles=HQ_ROLES, redirectTo="/admin") 적용. Playwright I-1~9 PASS 9/9 — hr_admin 허용, farm_admin 리디렉트 확인. 커밋: 세션 43. | docs/HANDOVER_PHASE5_SESSION43.md |
| DASHBOARD-PHASE2-001 | 재연결 | resolved | 세션 21 (2026-04-22) 등록 → 세션 47 (2026-04-25) 해소 | - | AdminDashboard 주간 바 차트 + 주간 스케줄 카드 실데이터 연결. weekChartData/weekTotalKg/weekTrend/weekScheduleData useMemo 신설, harvestStore+taskStore 연결, farm_admin 지점 필터 적용, 하드코딩 3,280 kg 및 고정 task 배열 제거. Playwright M-1~8 PASS. 커밋: 세션 47. | docs/HANDOVER_PHASE5_SESSION47.md |
| HARVEST-TARGETS-001 | 목표치 설계 | resolved | 세션 23 (2026-04-23) 발견 → 세션 46 (2026-04-25) 해소 | - | branches.monthly_harvest_target_kg 컬럼 추가(마이그레이션 20260425_session46). 운영 3지점 목표 시드(busan=5000/jinju=3000/hadong=5500 kg). 달성률 KPI를 HQBranchesScreen·BranchStatsPage·AdminDashboard 3곳에 실연결. BranchSettingsPage hr_admin 목표 편집 UI 추가. Playwright L-1~7 PASS. 커밋: 세션 46. | docs/BACKLOG.md |
| HARVEST-WEEKLY-001 | 재연결 | resolved | 세션 23 (2026-04-23) 발견 → 세션 27 (2026-04-24) 해소 | - | Dashboard 주간 수확량 차트 실데이터 연결 완료. 커밋 9731ddc — branchWeekHarvest useMemo(지점×최근 4주 2차원) + weekMax 동적 max + opacity 분기. cropFilter 반영. 전제 시드 509건 투입(세션 27 Task 2). | docs/BACKLOG.md |
| HQ-EMP-PAGINATION-001 | UI | open | 세션 23 (2026-04-23) | - | HQEmployeesScreen 페이지네이션 버튼(1~6) 하드코딩 — 실 직원 수 기반 페이지 분할 로직 미연결. 현 인원(38명) 대비 낮은 우선순위. | docs/BACKLOG.md |
| NOTIFICATION-DROPDOWN-001 | 기능 미구현 | resolved | 세션 24 (2026-04-23) 등록 → 세션 34 (2026-04-24) 해소 | - | HQTopBar 알림 드롭다운 구현 완료. leave_requests(pending)·issues(미해결)·notices 실데이터 useMemo 집계, unreadCount 뱃지, 타입별 아이콘, 클릭 시 해당 경로 이동, 외부 클릭 닫힘. Playwright PASS 23/23. 커밋 75a2293. | docs/BACKLOG.md |
| GLOBAL-SEARCH-001 | 기능 미구현 | resolved | 세션 24 (2026-04-23) 등록 → 세션 34 (2026-04-24) 해소 | - | HQTopBar 전역 검색 드롭다운 구현 완료. employees(name/username 필터)·notices(title 필터) useMemo 실시간 자동완성, 클리어 버튼, 결과 없음 상태, 외부 클릭 닫힘. Playwright PASS. 커밋 75a2293. | docs/BACKLOG.md |
| HQ-PERIOD-PICKER-001 | 기능 미구현 | resolved | 세션 24 (2026-04-23) 등록 → 세션 34 (2026-04-24) 해소 | - | HQTopBar 기간 피커 실작동 구현 완료. period/onPeriodChange props + Dashboard.jsx useState('월') 연결. h1 titleStr 기간 레이블(일간/주간/월간/분기) 동적 반영. Playwright "주"·"분기" 클릭 h1 변경 PASS. 커밋 75a2293. | docs/BACKLOG.md |
| APPROVAL-CATEGORY-001 | 데이터 보완 | resolved | 세션 24 (2026-04-23) 등록 → 세션 34 (2026-04-24) 해소 | - | 예산·인사·자재 탭(n=0) disabled 처리 완료: opacity 0.4, cursor not-allowed, onClick 제거. 근태·전체 탭은 정상 clickable 유지. 신규 P3 BACKLOG: APPROVAL-BUDGET-001·APPROVAL-HR-001·APPROVAL-MATERIAL-001. Playwright PASS. 커밋 75a2293. | docs/BACKLOG.md |
| APPROVAL-BUDGET-001 | 기능 미구현 | open | 세션 34 (2026-04-24) | P3 | 승인허브 "예산" 카테고리 — 예산 결재 테이블(budget_requests) 미존재. 예산 품의·지출 결재 워크플로우 설계 후 구현. 박민식·김민국 도메인 확인 필요. | docs/BACKLOG.md |
| APPROVAL-HR-001 | 기능 미구현 | open | 세션 34 (2026-04-24) | P3 | 승인허브 "인사" 카테고리 — 인사 결재 테이블(hr_requests) 미존재. 채용/해고/전배 등 인사 결재 워크플로우 설계 후 구현. 박민식·김민국 도메인 확인 필요. | docs/BACKLOG.md |
| APPROVAL-MATERIAL-001 | 기능 미구현 | open | 세션 34 (2026-04-24) | P3 | 승인허브 "자재" 카테고리 — 자재 구매 결재 테이블(material_requests) 미존재. 자재 구매 요청·결재 워크플로우 설계 후 구현. 박민식·김민국 도메인 확인 필요. | docs/BACKLOG.md |
| HQ-EMPLOYEE-EDIT-MODAL-001 | 기능 미구현 | resolved | 세션 24 (2026-04-23) 등록 → 세션 35 (2026-04-24) 편집 구현 | - | 상세 모달 연결(세션 24). 세션 35: EmployeeEditModal 신설(name/phone/jobTitle/isActive, master는 branch/role 추가), EmployeeDetailModal onEdit 연결, editEmployee state 추가. master/hr_admin 권한(canEditEmployee 기존 로직 준수). Playwright PASS. 커밋 ed4eb36. | docs/BACKLOG.md |
| HQ-REPORT-EXPORT-001 | 기능 미구현 | resolved | 세션 25 (2026-04-23) 등록 → 세션 64 (2026-04-26) 해소 | - | HQDashboardScreen "리포트 내보내기" 버튼 — downloadHQReportExcel(branches, totalWorkers, totalCheckedIn, totalHarvest) 연결. src/lib/hqReportExcel.js 신규. 시트 1: 지점별현황(코드/이름/직원수/출근수/출근률/수확/목표/달성률), 시트 2: 전사KPI(기준일/직원수/출근수/가동률/수확). 파일명 gref_HQ리포트_YYYY-MM-DD.xlsx. Playwright V-4 PASS 18132bytes. | docs/BACKLOG.md |
| HQ-CROP-REPORT-001 | 기능 미구현 | resolved | 세션 25 (2026-04-23) 등록 → 세션 64 (2026-04-26) 해소 | - | HQDashboardScreen "작물별 상세 분석 보고서 열기" — downloadCropReportExcel(branchCropData, trendData, selectedCrop) 연결. src/lib/hqReportExcel.js에 추가. 시트 1: 지점×작물 교차표, 시트 2: 선택 작물 30일 추이(selectedCrop 있을 때). 파일명 gref_작물보고서_YYYY-MM-DD.xlsx. Playwright V-5 PASS 16474bytes. 주의: getByText(exact:true)로 inner span 타겟팅 필요(outer span과 텍스트 중복). | docs/BACKLOG.md |
| HQ-KPI-DRILLDOWN-001 | 기능 미구현 | resolved | 세션 25 (2026-04-23) 등록 → 세션 35 (2026-04-24) 해소 | - | 가동률→/admin/hq/employees, 수확량/인건비→/admin/hq/finance navigate. 미해결이슈 alert 유지(HQ-ISSUE-PAGE-001 미구현). Playwright PASS. 커밋 55838e3. | docs/BACKLOG.md |
| HARVEST-CROP-FILTER-001 | 재연결 | resolved | 세션 25 (2026-04-23) 발견 → 세션 27 (2026-04-24) 해소 | - | HQDashboardScreen 작물 탭 실 필터링 완료. 커밋 9731ddc — cropFilteredRecords useMemo(harvestRecords.filter(r => r.crop?.name === cropFilter)) → branchWeekHarvest 재계산 연쇄. 토마토/파프리카/딸기/오이 탭 전환 시 주별 차트 bar 즉시 업데이트. | docs/BACKLOG.md |
| HQ-HARVEST-MENU-001 | UI 조사 | open | 세션 27 (2026-04-24) | - | HQSidebar 사이드바에 수확 기록 메뉴 노출 여부 확인 — /admin/harvest 입력 페이지는 기존 AdminLayout(재배팀 사이드바)에서만 접근 가능. HQ 컨텍스트(관리팀·본사 role)에서 수확 입력·조회 진입 경로 설계 필요. 세션 27 Task 1 Q1 선택지로 후속 정찰 이관 결정. | docs/BACKLOG.md |
| HQ-ISSUE-PAGE-001 | 재연결 | resolved | 세션 25 (2026-04-23) 등록 → 세션 48 (2026-04-25) 해소 | - | HQIssuesScreen 신규 구현 + /admin/hq/issues 라우트 + HQSidebar "이상 신고" 메뉴 + HQ_ROUTES issues 추가. issues 테이블 직접 supabase 쿼리(farm_admin 필터 미포함). Dashboard alert() 3곳 navigate()로 교체. 시드 12건(미해결 8 + 해결됨 4). Playwright N-1~N-11 PASS 152/152. 커밋: 세션 48. | docs/HANDOVER_PHASE5_SESSION48.md |
| HQ-BRANCH-MAP-001 | 기능 미구현 | partial | 세션 29 등록 → 세션 30 (2026-04-24) alert 연결 | - | 버튼 무반응 → alert('지점 지도 기능 준비 중입니다.') 임시 처리. 지도 API 선정/연동은 별 트랙. | docs/BACKLOG.md |
| HQ-BRANCH-ADD-001 | 기능 미구현 | partial | 세션 29 등록 → 세션 30 (2026-04-24) alert 연결 | - | 버튼 무반응 → alert('지점 추가 기능 준비 중입니다.') 임시 처리. 지점 추가 모달/DB INSERT 로직은 별 트랙. | docs/BACKLOG.md |
| HQ-BRANCH-CONTACT-001 | 기능 미구현 | resolved | 세션 29 (2026-04-24) 등록 → 세션 64 (2026-04-26) 해소 | - | HQBranchesScreen "연락" 버튼 → contactBranch state + 오버레이 모달 구현. 표시: 지점명/지점장/직원수/출근률/수확량. 전화/주소는 DB 미등록 안내 문구. 오버레이 클릭 또는 × 버튼으로 닫힘. Playwright V-3 PASS. | docs/BACKLOG.md |
| HQ-APPROVAL-EXPORT-001 | 기능 미구현 | resolved | 세션 29 등록 → 세션 63 (2026-04-26) 해소 | - | HQApprovalsScreen "내보내기" 버튼 — downloadApprovalExcel(requests, employees) 연결. src/lib/approvalExcel.js 신규. 시트 1: 전체 내역(지점/직원명/유형/날짜/사유/상태/신청일/처리일), 시트 2: 현황요약. 파일명 gref_승인내역_YYYY-MM-DD.xlsx. Playwright V-1 PASS. | docs/BACKLOG.md |
| HQ-APPROVAL-RULE-001 | 기능 미구현 | partial | 세션 29 등록 → 세션 30 (2026-04-24) alert 연결 | - | 버튼 무반응 → alert('승인 규칙 설정 기능 준비 중입니다.') 임시 처리. 규칙 설정 모달/페이지는 미구현 유지. | docs/BACKLOG.md |
| HQ-NOTICE-CREATE-001 | 기능 미구현 | resolved | 세션 29 등록 → 세션 30 (2026-04-24) 해소 | - | HQNoticesScreen "새 공지 작성" 버튼 — 인라인 모달 구현 완료. 우선순위 선택(일반/중요/긴급), 제목·내용 입력, `noticeStore.addNotice()` 연결. 등록 후 목록 즉시 반영. | docs/BACKLOG.md |
| HQ-NOTICE-READ-REPORT-001 | 기능 미구현 | open | 세션 29 (2026-04-24) | - | HQNoticesScreen "열람 리포트" 버튼 — alert 임시 처리 미진행. 열람률 집계(HQ-NOTICES-META-001) 완료 후 의미 있음. 지금은 미연결 유지. | docs/BACKLOG.md |
| HQ-FINANCE-PDF-EXPORT-001 | 기능 미구현 | resolved | 세션 29 등록 → 세션 64 (2026-04-26) 해소 | - | HQFinanceScreen "PDF 내보내기" 버튼 → window.print() 연결. @media print CSS를 src/index.css에 추가(사이드바·버튼 숨김, SVG 인쇄 보정, break-inside avoid). jsPDF/pdfmake 설치 없이 브라우저 네이티브 인쇄로 대체. Playwright V-6 PASS(headless에서 print=no-op, pageerror 없음). | docs/BACKLOG.md |
| HQ-FINANCE-CONSOLE-ERR-001 | BUG | wontfix | 세션 29 등록 → 세션 30 (2026-04-24) 재조사 | - | 세션 30 타겟 Playwright 재검증: console error 0건. 세션 29 감사 스크립트 오탐으로 판정 (React Router future flag warning이 error 분류된 것으로 추정). | docs/BACKLOG.md |
| HQ-GROWTH-ALERT-SEND-001 | 기능 미구현 | partial | 세션 29 등록 → 세션 30 (2026-04-24) alert 연결 | - | GrowthCompare "지점 알림 발송" → alert('지점 알림 발송 기능 준비 중입니다.') 임시 처리. FCM 연동은 HQ-GROWTH-001 후 처리. | docs/BACKLOG.md |
| HQ-BRANCH-DETAIL-001 | 기능 미구현 | resolved | 세션 30 (2026-04-24) | 세션 55 (2026-04-26) | `/admin/hq/branches/:branchId` 신규 라우트+페이지 신설 완료. KPI 4개(활성 인원/수확/TBM/수익), 작업자 현황 테이블, 재무 요약 카드 구현. Playwright PASS 61/0/0. | docs/BACKLOG.md |
| HQ-GROWTH-BRANCH-DETAIL-001 | 기능 미구현 | resolved | 세션 30 (2026-04-24) 등록 → 세션 57 (2026-04-26) 해소 | - | `/admin/hq/growth/branches/:branchId` 신규 라우트+페이지 신설 완료. mock crops 상세 테이블(건전도/편차/작기/이상 건) + 지점별 KPI 4개(건전도/표식주/이상/주의작물) + 주의 필요 섹션. GrowthCompare id b1/b2/b3→busan/jinju/hadong 수정 + navigate 연결. | docs/BACKLOG.md |
| HQ-EMP-INACTIVE-DISPLAY-001 | UI 결정 | wontfix | 세션 29 등록 → 세션 30 (2026-04-24) 결정 | - | 태우님 결정: 현재 동작(비활성 직원 포함 전원 표시) 의도적 유지. KPI 카드에 "활성 X · 비활성 Y" 명시되어 있어 혼선 없음. 추후 상태 필터 추가 시 재검토 가능. | docs/BACKLOG.md |
| FARM-DASH-DATE-001 | 하드코딩 | resolved | 세션 31 등록 → 세션 32 (2026-04-24) | - | AdminDashboard.jsx TopBar title 날짜 하드코딩 → useMemo + new Date() 동적 계산으로 수정. 회귀 PASS. | docs/AUDIT_SESSION31_FARM.md |
| FARM-DASH-SCHED-HARDCODE-001 | 하드코딩 | resolved | 세션 31 등록 → 세션 32 (2026-04-24) | - | 스케줄 그리드 날짜/isToday 하드코딩 → weekDays useMemo(현재 주 월요일 기준 7일) 동적 계산으로 수정. 회귀 PASS. | docs/AUDIT_SESSION31_FARM.md |
| FARM-DASH-BTN-001 | 기능 미구현 | resolved | 세션 31 등록 → 세션 32 (2026-04-24) | - | "내보내기"·AI "적용하기"·"자세히" onClick alert 임시 처리 완료. "새 작업 등록"은 /admin/tasks/new navigate로 구현. 신규 패턴 A 스텁: FARM-DASH-EXPORT-001, FARM-AI-APPLY-001, FARM-AI-DETAIL-001 등록. | docs/AUDIT_SESSION31_FARM.md |
| FARM-LEAVE-SCOPE-001 | 데이터 스코프 | resolved | 세션 31 등록 → 세션 32 (2026-04-24) | - | leaveStore.fetchRequests(currentUser) branch 필터 추가. farm_admin 시 employee_id IN (branch 직원 IDs) 적용. HQ는 currentUser 미전달 → 전체 조회 유지. 회귀 PASS. | docs/AUDIT_SESSION31_FARM.md |
| FARM-TASK-SCOPE-001 | 데이터 스코프 | resolved | 세션 31 등록 → 세션 32 (2026-04-24) | - | taskStore/issueStore/attendanceStore 동일 패턴(worker_id/employee_id IN branch 직원 IDs) 적용. useDataLoader.js currentUser 전달. HQ regression 18/18 PASS. | docs/AUDIT_SESSION31_FARM.md |
| FARM-TASK-ADD-001 | 기능 미구현 | resolved | 세션 31 등록 → 세션 32 (2026-04-24) | - | TaskPlanPage TopBar에 btnPrimary('작업 추가', icons.plus, () => navigate('/admin/tasks/new')) 추가. 회귀 PASS. | docs/AUDIT_SESSION31_FARM.md |
| FARM-DASH-EXPORT-001 | 기능 미구현 | resolved | 세션 32 등록 → 세션 63 (2026-04-26) 해소 | - | AdminDashboard "내보내기" 버튼 — downloadDashboardExcel({todayStr,kpis,weekChartData,taskRows}) 연결. src/lib/dashboardExcel.js 신규. 시트 1: KPI요약, 시트 2: 주간수확량, 시트 3: 오늘작업(있을 때). 파일명 gref_대시보드_YYYY-MM-DD.xlsx. Playwright V-2 PASS. | docs/BACKLOG.md |
| FARM-AI-APPLY-001 | 기능 미구현 | open | 세션 32 (2026-04-24) | - | AdminDashboard AI 제안 "적용하기" 버튼 — alert 임시 처리. AI 제안 자동 적용(환기 등 제어) 기능 설계 후 구현. 트랙 I 연계. | docs/BACKLOG.md |
| FARM-AI-DETAIL-001 | 기능 미구현 | open | 세션 32 (2026-04-24) | - | AdminDashboard AI 제안 "자세히" 버튼 — alert 임시 처리. AI 제안 상세 뷰(근거·이력) 설계 후 구현. 트랙 I 연계. | docs/BACKLOG.md |
| FARM-GROWTH-DB-001 | 데이터 재연결 | resolved | 세션 31 등록 → 세션 38 (2026-04-24) 해소 | - | useGrowthData 훅 전면 재작성(buildCrops/buildTimeseries/buildMarkerPlants). crops.category·growth_surveys.week_number·marker_plants.marker_number 컬럼 추가. branch_crop_sample_config 신규 테이블 + 샘플 설정 UI. 시드 15 marker_plants × 8주 = 120 surveys. 화이트 스크린 해소. Playwright PASS 26/26. 커밋 세션 38. | docs/BACKLOG.md |
| GROWTH-SURVEYS-001 | 데이터 연결 | resolved | 세션 38 (2026-04-24) | - | FARM-GROWTH-DB-001 구현 세부. DDL(4 알터/신규 테이블) + 시드(DELETE 196건 + INSERT 135건) + 훅 재작성 + 샘플 설정 UI. | docs/BACKLOG.md |
| GROWTH-INPUT-SESSION39-001 | 기능 미구현 | resolved | 세션 38 (2026-04-24) 등록 → 세션 39 (2026-04-24) 해소 | P2 | GrowthInputScreen 제어 입력 + handleSubmit + 권한 분기 구현. selectedWeek null-초기화로 초기 렌더 flash 제거. p.dbId를 React key로 교체(중복 key 경고 해소). addSurvey에 markerPlantId/weekNumber/cropId 추가. Playwright PASS 24/24. | docs/BACKLOG.md |
| FARM-PERF-DATA-001 | 데이터 재연결 | resolved | 세션 31 (2026-04-24) 등록 → 세션 40 (2026-04-25) 해소 | - | usePerformanceData 훅 전면 재작성(employees + harvest_records 집계). PERF_DATA·SAM 하드코딩 제거. early return 4건 제거. BRANCHES/CROPS_LIST 상수화. 라벨 변경(efficiency→수확 성과율, speedStem→주간 수확량 kg/주). Playwright PASS 49/49. 커밋 세션 40. | docs/HANDOVER_PHASE5_SESSION40.md |
| FARM-HQ-NOTICE-001 | HQ 연동 | open | 세션 31 (2026-04-24) | - | noticeStore는 HQ·farm 공용 notices 테이블 사용. DB 0건이라 양쪽 연동 동작 미검증. DB 공지 1건 삽입 후 양쪽 UI 확인으로 빠른 검증 가능. | docs/AUDIT_SESSION31_FARM.md |
| WORKER-M-STATIC-001 | 데이터 재연결 | resolved | 세션 33 (2026-04-24) 등록 → 세션 35 (2026-04-24) 해소 | - | 4개 화면 스토어 연결 완료. useAuthStore(currentUser)/useAttendanceStore/useLeaveStore 연결. 이름·날짜·근무시간 동적화, 주간 요약·최근 5일·월 달력·신청 이력 실데이터. Playwright PASS 29/29. 커밋 402baa4. | docs/BACKLOG.md |
| MOBILE-LOGOUT-001 | 버그 수정 | resolved | 세션 36 (2026-04-24) 발견 → 세션 36 해소 | - | MobileProfileScreen 로그아웃 버튼 onClick 누락. useNavigate 미임포트 + logout 훅 미선언. _screens.jsx에 useNavigate import 추가, MobileProfileScreen 최상위에 logout/navigate 선언, button onClick 연결. 양 사이드바(primitives·hq-shell)도 로그아웃 아이콘만 있던 것을 "로그아웃" 텍스트 레이블 버튼으로 개선. | docs/BACKLOG.md |
| HARVEST-RESEED-S36-001 | 데이터 재구성 | resolved | 세션 36 (2026-04-24) | - | harvest_records 509건 삭제 + 재시드. 신규 분배: busan=토마토·방울토마토·완숙토마토(균등 1/3), jinju=미니오이, hadong=완숙토마토. 515건 생성. Dashboard BRANCH_CROPS·CROP_COLORS 업데이트. | docs/BACKLOG.md |
| CROP-ADD-S36-001 | 기능 추가 | resolved | 세션 36 (2026-04-24) | - | 미니오이·완숙토마토 crops 테이블 INSERT. task_types JSONB 포함. 이후 harvest 재시드에서 jinju·hadong·busan 연계 사용. | docs/BACKLOG.md |
| DASHBOARD-CHART-LAYOUT-001 | UX 개선 | resolved | 세션 36 (2026-04-24) | - | Dashboard 지점별 수확량 차트 flexDirection column→row (3지점 가로 배치). 3번째 작물 색상(sub2) 지원. busan 3종 막대 수평 표시. Playwright PASS. | docs/BACKLOG.md |
| GROWTH-EMPTY-STATE-001 | 진단 | resolved (스킵) | 세션 36 (2026-04-24) | - | /admin/growth·performance·stats "화이트 스크린" 신고. 진단 결과: DB 빈 상태 → 코드 정상 동작. standard_curves·marker_plants·growth_surveys·performance 데이터 없음. 코드 수정 불필요. FARM-GROWTH-DB-001·FARM-PERF-DATA-001 트랙으로 이관. 교훈 62 추가. | docs/BACKLOG.md |
| SCHEDULE-PAGE-S37-001 | UI 이식 | resolved | 세션 37 (2026-04-24) | - | SchedulePage.jsx 전면 재작성. 목업(screen-others.jsx ScheduleScreen) 구조 이식. 일간/주간/월간 3뷰, ‹/› 날짜 네비게이션, 타임라인 Gantt (tasks.started_at/completed_at 기반), NOW 선(실시간), 점심 해치, approved leave → warningSolid 풀바, 월간 캘린더. TopBar: 출퇴근 기록 navigate + 스케줄 등록 alert. Playwright PASS 30/31. 커밋 예정. | docs/BACKLOG.md |
| SCHED-REGISTER-001 | 기능 미구현 | open | 세션 37 (2026-04-24) | P3 | "스케줄 등록" 버튼 — 현재 alert("준비 중") 처리. 스케줄 수동 등록 모달(작업자·날짜·시간·작업유형) 구현 필요. tasks 테이블 insert 활용. | docs/BACKLOG.md |
| TASKS-WORKER-ID-MISMATCH-001 | 데이터 정합 | resolved | 세션 40 (2026-04-25) 등록 → 세션 45 (2026-04-25) 해소 | - | 전략 B 채택: 시드_작업자01~03 UUID orphan tasks 358건 DELETE + 활성 worker 24명(busan 9/jinju 7/hadong 8) × 15건 신규 시드 360건 INSERT. 총 361건(완료168/진행중24/대기169). taskStore.fetchTasks farm_admin 브랜치 쿼리 is_active=true 필터 추가. SchedulePage barsForDate 활성 작업자 전용 주석 추가. Playwright K-1~7 PASS 15/15. | docs/HANDOVER_PHASE5_SESSION45.md |
| STATS-AGGREGATION-001 | 데이터 재연결 | resolved | 세션 31 (2026-04-24) 등록 → 세션 41 (2026-04-25) 해소 | - | StatsPage — performanceStore(영구 빈 배열 stub) 제거, usePerformanceData 훅 연결. KPI 카드: 평균 수확 성과율(%), 주간 최고 수확량(kg/주), 평가 인원(명). 랭킹: harvestPct 내림차순. farm_admin → 본인 지점 필터. performanceStore.js 삭제. Playwright PASS 62/63(WARN 1: farm_admin 분기 jhkim 불가). 커밋 세션 41. | docs/HANDOVER_PHASE5_SESSION41.md |
| WORK-STATS-PAGE-001 | 검증·수정 | resolved | 세션 41 등록 → 세션 42 (2026-04-25) 해소 | - | /admin/work-stats — is_active 필터 누락(비활성 시드 포함) 수정 + attendance 시드 480건+ 투입(세션 42 migration). WorkStatsPage.jsx workers useMemo에 e.isActive 필터 추가. Playwright F-1~F-4 PASS. | docs/HANDOVER_PHASE5_SESSION42.md |
| BRANCH-STATS-PAGE-001 | 기능 구현 | resolved | 세션 41 등록 → 세션 42 (2026-04-25) 해소 | - | /admin/branch-stats — "준비 중" stub 전면 재작성. usePerformanceData + useEmployeeStore 기반 3지점 KPI(활성 작업자/평균 성과율/주간 수확량) + 평균 성과율 비교 + 주간 수확량 비교 바 차트. Playwright G-1~G-4 PASS. | docs/HANDOVER_PHASE5_SESSION42.md |
| BRANCH-WORK-SCHEDULE-UI-001 | 기능 미구현 | resolved | 세션 42 (2026-04-25) 등록 → 세션 44 (2026-04-25) 해소 | - | BranchSettingsPage.jsx에 "근무시간 설정" 섹션 추가. RLS 정책 신설(SELECT is_admin_level / UPDATE can_view_all_branches). start_time/end_time time 입력 + workdays 요일 버튼(7개). hr_admin 편집, farm_admin 읽기 전용. Playwright J-1~6 PASS 13/13. 세션 44 커밋. | docs/HANDOVER_PHASE5_SESSION44.md |
| GROWTH-RLS-001 | RLS 회귀 | resolved | 세션 50 (2026-04-25) 발견·해소 | - | growth_surveys SELECT RLS 정책 worker_id IS NOT NULL 조건이 marker_plant 기반 surveys(worker_id=NULL, 전체 120건)를 farm_admin에게 차단. farm_admin /admin/growth 접근 시 timeseries={}→ts=undefined→ts.length 크래시(ErrorBoundary). 수정: growth_surveys_authenticated_select → is_admin_level() (marker_plants 정책 동일). 코드 방어: GrowthDashboardScreen/GrowthMarkerDetailScreen timeseries empty guard 추가. Playwright P-1~7 PASS. 커밋: 세션 50. | docs/HANDOVER_PHASE5_SESSION50.md |
| TBM-COMPLETION-001 | BUG | resolved | 세션 54 (2026-04-26) | - | SafetyChecksPage(/admin/safety-checks) 실데이터 미표시 해소(케이스 B). 원인: safetyCheckStore에 checks 상태 없음 + 필드 불일치(employeeId→workerId, submittedAt→completedAt, hasIssue/items/note 스키마 무관 참조). 수정: fetchByDate 로컬 useEffect 연결 + 필드 전수 정정 + '이상 보고'→'승인 완료' KPI + 상태 Pill info/success/warning. safety_checks 시드 10건(오늘 2026-04-26, 3지점) INSERT. Playwright PASS. 커밋: 세션 54. | docs/BACKLOG.md |
| STORE-MISSING-001 | BUG | resolved | 세션 55 (2026-04-26) | 세션 56 (2026-04-26) | issueStore.updateIssue(id,patch) 추가. status='resolved'→is_resolved=true DB반영, 'in_progress'→로컬 상태만. fetchIssues에 is_resolved→status 매핑 추가. IssueCallPage employeeId→workerId, message→comment 필드 수정. | docs/BACKLOG.md |
| STORE-MISSING-002 | BUG | resolved | 세션 55 (2026-04-26) | 세션 56 (2026-04-26) | leaveStore.approveRequest(id)/rejectRequest(id) 래퍼 추가 — 내부적으로 farmReview 호출. | docs/BACKLOG.md |
| STORE-MISSING-003 | BUG | resolved | 세션 55 (2026-04-26) | 세션 56 (2026-04-26) | noticeStore.markRead(id,userId) 추가 (로컬 상태 — read_by DB컬럼 없음, 세션 내 읽음 처리). WorkerNoticePage n.content→n.body 수정(2곳). | docs/BACKLOG.md |
| NOTICE-AUTH-001 | 인프라 공백 | resolved | 세션 56 (2026-04-26) | 세션 58 (2026-04-26) | 아키텍처 오해 정정: worker는 Supabase Auth 미사용, device_token(anon RLS) 방식. device_token NULL 20명 → gen_random_uuid() DB UPDATE 완료(총 24/24명 보유). Playwright addInitScript(교훈 58)로 /worker/* E2E 전 라우트 PASS. | docs/BACKLOG.md |
| WORKER-NOTICE-READ-001 | DB 부채 | open | 세션 58 (2026-04-26) | - | noticeStore.markRead 로컬 상태 전용 — notices 테이블에 read_by 컬럼 없음. 새로고침 시 읽음 상태 소실. 영속화 필요 시 `read_by UUID[] DEFAULT '{}'` 컬럼 추가 마이그레이션 + noticeStore.markRead DB UPDATE 연결. | docs/BACKLOG.md |
| ISSUE-STATUS-COLUMN-001 | DB 부채 | open | 세션 56 (2026-04-26) | - | issues 테이블에 `status` 컬럼 없음 — issueStore.updateIssue 'in_progress' 로컬 상태만 유지, 새로고침 시 'pending'으로 복원. 영속화 필요 시 별 마이그레이션 세션에서 `status VARCHAR(20) DEFAULT 'pending'` 컬럼 추가. | docs/BACKLOG.md |
| UI-PORT-LOGIN-001 | UI 이식 | resolved | 세션 59 (2026-04-26) | - | LoginPage.jsx 전면 재작성. 목업(screen-others.jsx LoginScreen) 이식. 2컬럼 레이아웃: 좌측 인디고 그래디언트 브랜드패널(로고+카피+통계그리드) + 우측 폼(관리자/작업자 탭, 로그인 유지, 비밀번호 찾기). 데이터 로직(login/navigate/error/loading) 완전 보존. Playwright PASS 53/53. | docs/BACKLOG.md |
| UI-PORT-EMPLOYEES-001 | UI 이식 | resolved | 세션 60 (2026-04-26) | - | EmployeesPage.jsx 전면 재작성. 직군 필터(전체/재배/관리/기타), 4 KPI 카드, 페이지네이션(PAGE_SIZE=8), 직원 등록 모달 보존. Playwright PASS 63/63. | docs/BACKLOG.md |
| UI-PORT-LEAVE-001 | UI 이식 | resolved | 세션 60 (2026-04-26) | - | LeavePage.jsx 전면 재작성. 2컬럼 레이아웃(1fr 1.4fr): 좌측 승인 대기 카드 + 우측 팀 휴가 캘린더(월 이동). approveRequest/rejectRequest 완전 보존. Playwright PASS 63/63. | docs/BACKLOG.md |
| UI-PORT-TASKS-001 | UI 이식 | resolved | 세션 61 (2026-04-26) | - | TaskBoardPage.jsx 기존 칸반 구현 활용 + 데이터 매핑 5건 수정(pending→planned/workerId/date/taskType/progress). App.jsx /admin/tasks 라우트 스왑. 통합 회귀 PASS 63/63. | docs/BACKLOG.md |
| P2-PERF-SPEED-METRIC-001 | 기능 구현 | resolved | 세션 66 조사 → 세션 67 (2026-04-26) 구현 | - | 작업 속도 기반 성과 평가. tasks.duration_minutes/quantity 시드(361건) + usePerformanceData 속도 정규화(100기준) + StatsPage 우수/평균/저성과 KPI 카드 + 작업 속도 랭킹 재설계. Playwright X-D PASS. | docs/BACKLOG.md |
| P2-SPEED-STANDARD-UI-001 | 기능 미구현 | open (운영 후) | 세션 66 (2026-04-26) 조사 | - | 작업 속도 기준 설정 UI (작물/작업 종류별 기준값 입력). P2-PERF-SPEED-METRIC-001 선행 필요 + 신규 테이블(task_speed_standards) 설계 미정. 운영 후 트랙. | docs/BACKLOG.md |
| P2-STATS-BRANCH-FILTER-001 | 기능 추가 | resolved | 세션 66 (2026-04-26) | - | StatsPage(성과 분석) hr_admin/master용 지점 필터 드롭다운 추가. 전체/부산LAB/진주HUB/하동HUB 버튼. farm_admin은 기존 자동 필터 유지. Playwright X-3 PASS. | docs/BACKLOG.md |
| P2-MENU-CLEANUP-001 | UX 개선 | resolved | 세션 66 (2026-04-26) | - | 사이드바 "작업자 성과"(/admin/performance) + "통계 분석"(/admin/stats) 중복 노출 해소. "작업자 성과" 메뉴 제거, "통계 분석" → "성과 분석" 이름 변경. AdminLayout FARM_ROUTES performance 항목 제거. Playwright X-4 PASS. | docs/BACKLOG.md |
| P1-LEAVE-SILENT-FAIL | 버그 | resolved | 세션 65 (2026-04-26) | - | LeavePage.jsx fetchRequests on mount 누락 + 승인/반려 fire-and-forget 패턴. 수정: useEffect(fetchRequests(currentUser)) 추가, farmReview 직접 호출(reviewer ID 전달), 실패 시 alert 에러 피드백. Playwright W-1 reload-after-action DB 반영 확인. | docs/BACKLOG.md |
| P1-ROLE-MKKIM-MSPARK | 데이터 오류 | resolved | 세션 65 (2026-04-26) | - | mkkim(김민국)/mspark(박민식) role='general' → farm 팀 UI(/admin) 라우팅 오분류. DB UPDATE role='hr_admin' (RETURNING 확인). 이후 /admin/hq 라우팅 + 인사관리 표시. Playwright W-2-1 PASS. | docs/BACKLOG.md |
| P3-SEARCH-REMOVE | UX 개선 | resolved | 세션 65 (2026-04-26) | - | 관리자 페이지 TopBar 우상단 정적 검색란(기능 없음, ⌘K 표시만) 제거. primitives.jsx TopBar에서 해당 div 삭제. Playwright W-3 PASS. | docs/BACKLOG.md |
| P3-HQ-BADGE-001 | BUG | resolved | 세션 67 (2026-04-26) | - | HQSidebar "승인 허브" badge 하드코딩=12 → leaveStore.requests 대기 건수 동적 연동. pendingLeaveCount || null 패턴. Playwright X-A-2 PASS. | docs/BACKLOG.md |
| P3-HQ-SEARCH-REMOVE-001 | UX 개선 | resolved | 세션 67 (2026-04-26) | - | HQTopBar 전역 검색 입력창("직원, 공지 검색" + ⌘K) 제거. 관련 state(searchQuery/searchOpen/searchRef) + useMemo(searchResults) 일괄 정리. Playwright X-A-3 PASS. | docs/BACKLOG.md |
| P3-HQ-LOGOUT-001 | UX | resolved | 세션 67 (2026-04-26) | - | HQSidebar + farm Sidebar nav에 flex:1 + overflow 미지정 → 메뉴 많을 시 로그아웃 버튼 화면 밖으로 밀림. overflowY:'auto' 추가. Playwright X-A-4 PASS. | docs/BACKLOG.md |
| P3-HQ-SETTINGS-001 | UX | resolved | 세션 67 (2026-04-26) | - | HQSidebar "시스템 설정" 메뉴 항목 제거 (미구현 기능 노출 금지). Playwright X-A-1 PASS. | docs/BACKLOG.md |
| P3-HQ-BRANCH-NAV-001 | UX | resolved | 세션 67 (2026-04-26) | - | HQSidebar 지점 바로가기(부산LAB/진주HUB/하동HUB) 클릭 무반응 → navigate('/admin/hq/branches') 연결 + hover 효과 추가. Playwright X-A-5 PASS. | docs/BACKLOG.md |
| P2-TASK-SPEED-SEED-001 | 데이터 | resolved | 세션 67 (2026-04-26) | - | tasks.duration_minutes/quantity 361건 모두 NULL → 작업자 티어(부산 우수×2/평균×5/저성과×2, 하동 우수×2/평균×5/저성과×1, 진주 우수×1/평균×4/저성과×2) + 지점 차등(부산1.05/진주1.0/하동0.975) 시드 완료. | docs/BACKLOG.md |
| HQ-PERF-ROUTE-MISMATCH-001 | BUG | resolved | 세션 68 (2026-04-26) | - | HQ 사이드바 "작업자 성과" 클릭 시 HQ_ROUTES.performance='/admin/hq/performance'(구형 Top5 카드)로 라우팅 → StatsPage('/admin/stats', 세션 67 재설계) 미반영. AdminLayout HQ_ROUTES.performance → '/admin/stats' + getHQActiveId() /admin/stats 분기 추가. Playwright X-1 PASS. | docs/BACKLOG.md |
| P3-HQ-SIDEBAR-GROUPS-001 | UX 개선 | resolved | 세션 68 (2026-04-26) | - | HQSidebar 9개 메뉴 평면 나열 → 5개 그룹(대시보드/지점관리/인사직원/생산/승인리포트) 헤더 + 메뉴 중첩 구조로 재편. 지점 바로가기(부산LAB/진주HUB/하동HUB) 지점관리 그룹 내 들여쓰기 서브 항목으로 이동. 이모지 제거, 아이콘 유지, 라우트 매핑 불변. Playwright X-2 PASS. | docs/BACKLOG.md |
| P3-DEAD-PERF-FILE-001 | 코드 부채 | resolved | 세션 68 (2026-04-26) 등록 → 세션 71 (2026-04-26) 해소 | - | src/pages/admin/Performance.jsx (928줄) — import 0건 재확인 후 git rm 삭제. src/pages/Performance.jsx(실사용)는 유지. 교훈 115 적용. | docs/BACKLOG.md |
| P3-DEAD-GROWTH-FILE-001 | 코드 부채 | resolved | 세션 69 (2026-04-26) 등록 → 세션 71 (2026-04-26) 해소 | - | src/pages/admin/Growth.jsx (834줄) — import 0건 재확인 후 git rm 삭제. src/pages/Growth.jsx(실사용)는 유지. GrowthSurveyAdminPage는 별도 파일. 교훈 115 적용. | docs/BACKLOG.md |
| HQ-SIDEBAR-PERF-LABEL-001 | UX 개선 | resolved | 세션 71 (2026-04-26) | - | HQSidebar "작업자 성과" → "성과 분석" 통일. StatsPage.jsx TopBar title="성과 분석" 기준으로 사이드바 hq-shell.jsx 라벨 정정. 라우트 매핑 불변. 교훈 119 적용 (사이드바 라벨 vs 페이지 H1 일치 패턴). | docs/BACKLOG.md |
| STATS-PERIOD-FILTER-001 | 기능 추가 | resolved | 세션 69 (2026-04-26) | - | StatsPage(성과 분석) 기간 필터 없음 → 이번 주/이번 달/전체 버튼 추가. usePerformanceData(dateFrom, dateTo) 파라미터화 — harvest_records 날짜 필터 적용. tasks speedPct는 전체 기간 유지. 교훈 77 적용(로컬 날짜). Playwright X-1 PASS. | docs/BACKLOG.md |
| HQ-SIDEBAR-INLINE-001 | UX 개선 | resolved | 세션 70 (2026-04-26) | - | HQSidebar 5그룹 평면 → 8그룹(대시보드/성과/직원근태관리/생산/승인결재/운영이슈/공지정책/지점관리) 인라인 펼침. getActiveGroup(pathname) → 활성 그룹 자동 펼침. hoveredGroup useState → 호버 시 추가 펼침. max-height 0.18s ease-out 트랜지션. onClick 모바일 토글 fallback. "승인 허브" → "승인 결재" 명칭 정정. Playwright X-1 PASS. | docs/BACKLOG.md |
| HQ-LEAVE-HQ-ACCESS-001 | 기능 추가 | resolved | 세션 70 (2026-04-26) | - | /admin/hq/leave 라우트 신설(App.jsx 내 HQ 그룹) + HQSidebar "직원/근태 관리" 그룹에 "휴가 관리" 항목 추가. LeavePage hr_admin/master 접근 시 전체 지점 데이터 조회(leaveStore null currentUser 패스스루). TopBar 지점 필터 바(전체/부산LAB/진주HUB/하동HUB) hr_admin 전용 노출. Playwright X-2 PASS. | docs/BACKLOG.md |
| HQ-DASHBOARD-INTERACTIVE-003 | 기능 구현 | resolved | 세션 49 (2026-04-25) 등록 → 세션 70 (2026-04-26) 해소 | - | DashboardInteractive "승인 허브" → "승인 결재" 명칭 정정. 하드코딩 7건 제거, leaveStore.requests(pending) 실데이터 연결. useLeaveStore 추가 import. approvals useMemo(leaveRequests, employees) — 근태 실건수, 예산/인사/자재 0. Playwright X-3 PASS. | docs/BACKLOG.md |
| HQ-PERF-ROUTE-REGRESSION-001 | BUG | resolved | 세션 72 (2026-04-26) | - | 세션 68 HQ-PERF-ROUTE-MISMATCH-001 해소 시 HQ_ROUTES.performance를 '/admin/stats'로 변경하여 /admin/hq/performance 라우트가 4세션간 dead 상태 유지. 세션 72에서 HQ_ROUTES.performance → '/admin/hq/performance' 복원 + getHQActiveId/getActiveGroup/Sidebar/BottomNav/AdminDashboard 6곳 정합성 정정. FARM_ROUTES.stats → '/admin/performance'로 수정. 교훈 121·122 적용. Playwright PASS 35 / FAIL 0 / WARN 0. | docs/HANDOVER_PHASE5_SESSION72.md |
| P3-DEAD-STATS-PAGE-001 | 코드 부채 | resolved | 세션 72 (2026-04-26) | - | src/pages/admin/StatsPage.jsx — 사용자 지시로 폐기. App.jsx import + Route('stats') 제거 + git rm. /admin/stats 라우트 전체 제거. 관련 내부 링크 6곳 /admin/performance 또는 /admin/hq/performance로 교체. 교훈 123 적용. | docs/HANDOVER_PHASE5_SESSION72.md |
| HQ-SIDEBAR-CLICK-UX-001 | UX 개선 | resolved | 세션 72.6 (2026-04-26) | - | HQ 사이드바 그룹 펼침 트리거: hover(onMouseEnter/Leave) → 클릭 토글 전환. hoveredGroup 상태 → openGroup 단일 변수(단일 펼침). useEffect(location.pathname) → 라우트 이동 시 활성 그룹 자동 펼침. 그룹 헤더 fontSize 10→12, 하위 항목 fontSize 13→14. 애니메이션 0.18s → maxHeight 0.25s + opacity 0.2s. 교훈 125 적용. Playwright PASS 37 / FAIL 0 / WARN 3(CSS전환감지한계). | docs/HANDOVER_PHASE5_SESSION72_6.md |
| LABOR-COST-001 | 데이터 미연결 | open | 세션 73 (2026-04-26) | - | MobileAdminHomeHQ KPI "이번달 인건비" — finance_monthly 테이블 미연결, "추정" 라벨 + 하드코딩 0원 표시. PC DashboardInteractive와 동일 처리(HQ-FINANCE-001 Phase3 이후). HQ-FINANCE-003 입력UI 완료 후 연결. | docs/BACKLOG.md |
| TASK-MOBILE-001 | 기능 미구현 | open | 세션 73 (2026-04-26) | - | MobileAdminHomeFarm "오늘 작업 진행" — taskStore 승인 Store 목록에 포함되지 않아 placeholder("—") 표시. farm_admin 모바일 홈 진행 작업 카드 실연결 보류. 승인된 작업자 그룹 별 taskStore 필터 설계 후 처리. | docs/BACKLOG.md |
| NOTIFICATION-STORE-001 | 기능 미구현 | open | 세션 73-B (2026-04-26) | - | MobileInboxScreen 퍼시스턴트 알림 이력 store 미존재. notificationStore는 toast 전용(6~10초 자동 소멸)이라 인박스로 사용 불가. Case Z' Option 1 적용: leaveStore(pending) + issueStore(미해결)로 조합. 실 알림 이력이 필요하면 별도 notification_history 테이블 + store 설계 필요. | docs/BACKLOG.md |
| MOBILE-FLOOR-001 | 기능 미구현 | open | 세션 73-B (2026-04-26) | - | MobileFloorScreen 평면도 뷰 — QR 위치 추적 기반. 73-C: attendanceStore 출근 통계 + "준비 중" 카드. 74-B: DB 테이블 세트 완성(greenhouses/qr_codes/qr_scans). 74-C 이월: GreenhousePlan 컴포넌트 이식 + 모바일 반응형 조정. PC-FLOOR-DATA-001(resolved) 참조. | docs/HANDOVER_SESSION74B.md |
| MOBILE-PERF-001 | 기능 미구현 | resolved | 세션 73-B (2026-04-26) 등록 → 세션 73-C (2026-04-26) 해소 | - | MobilePerfScreen usePerformanceData 실 연결 완료. 기간 피커(일/주/월/분기) + dateFrom useMemo + Top 5 실 데이터(harvestPct 정규화) + 지점별 평균 막대(branchAvg) + 로딩·빈 상태. mock 데이터 전면 제거. | docs/BACKLOG.md |
| PC-FLOOR-DATA-001 | 기능 미구현 | resolved | 세션 73-C (2026-04-26) 등록 → 세션 74-B (2026-04-27) 해소 | - | DB 테이블 greenhouses(4행)/qr_codes(92행)/qr_scans + employees.speed_factor 세트 완성. timeAgo() 10:25 하드코딩 → Date.now() 기반 교체(교훈 77). 히스토리 슬라이더 max=625 → nowMin() 동적 계산. QrScanPage scan_type 'task_start'→'start' 수정. dead code 2건 삭제. PC 평면도 /admin/floor 실데이터 표시 복원. | docs/HANDOVER_SESSION74B.md |
| MOBILE-AUTO-DETECT-001 | 기능 미구현 | resolved | 세션 73-C (2026-04-27) | - | 관리자 모바일 자동 감지 미구현. AdminLayout useEffect: window.innerWidth < 768(Tailwind md) + /admin/m/* 미진입 시 /admin/m/home 자동 전환. AdminBottomNav는 /admin/m/* 진입 시 숨김(AdminMobileShell 자체 탭바 사용). AdminMobileShell 탭 클릭 navigate 연결(TAB_ROUTES). | docs/BACKLOG.md |
| QR-ISSUE-001 | 기능 미구현 | resolved | 세션 73-C (2026-04-27) | - | 작업자 QR 로그인 토큰 발급 UI 미구현. employees.device_token + loginWithDeviceToken 백엔드 완성돼있었으나 관리자 발급 화면 없음 → 운영 진입 차단. EmployeesPage 작업자 행 "QR" 버튼 + 모달(qrcode.react QRCodeSVG) + employeeStore.issueDeviceToken 추가로 해소. | docs/BACKLOG.md |
| P3-DEAD-FLOORPLAN-FILE-001 | dead code 정리 | resolved | 세션 74-B (2026-04-27) 등록·해소 | - | src/pages/admin/FloorPlan.jsx(731줄, floor-schema.js import) + src/data/floor-schema.js(189줄) dead code 2건 git rm 삭제 완료. 교훈 115 적용: import 0건 재확인 후 삭제. 빌드 0 에러. FLOOR-SCHEMA-SKIP-001 동반 해소. | docs/HANDOVER_SESSION74B.md |
| ASSIGNMENT-PLAN-001 | 기능 미구현 | open | 세션 74-B (2026-04-27) | Tier 6 | 골 작업 사전 배정 기능(ACTIVE_ASSIGNMENTS) — useFloorData.js에서 항상 [] 반환. assignments 테이블 + 관리자 배정 UI(어느 동 몇 번골을 누구에게 배정) + 작업자 앱 표시(내 배정 골 목록) 포함. 별 트랙. | docs/HANDOVER_SESSION74B.md |

---

## ID 미부여 항목 (2026-04-08 핸드오버)

아래 항목들은 2026-04-08.md의 "기타 백로그" 섹션에 서술됐으나 공식 ID가 부여되지
않았다. 다음 세션에서 다룰 때 ID를 부여하거나 wontfix 처리할 것.

| 항목 | 상태 | 한 줄 설명 |
|---|---|---|
| 작업 M | open (상태 미확인) | 마스터 전용 콘솔 UI — 사용자 관리·비밀번호 재설정·감사 로그 조회 |
| 작업 L | open (상태 미확인) | 감사 로그 테이블(audit_log) + 트리거 자동 기록 |
| Site URL | open (상태 미확인) | Supabase Auth 비밀번호 재설정 메일의 링크 미동작 — Auth → URL Configuration 확인 필요 |
| 비활성 admin 정리 | open (상태 미확인) | 기존 비활성 admin 2명 참조 데이터 정리 후 삭제 검토 |
| LoginPage 라벨 | open (상태 미확인) | "근무 시간" vs "근무 관리" 네이밍 혼선 — "근무 통계" 등 명확한 이름으로 변경 검토 |

---

## 상태 정의

| 값 | 의미 |
|---|---|
| open | 미처리 |
| in-progress | 현재 세션에서 진행 중 |
| resolved | 커밋으로 완료됨 |
| wontfix | 의도적으로 처리하지 않기로 결정 |
