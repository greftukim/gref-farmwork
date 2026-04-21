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
| TRACK-L-G-MERGE-001 | 트랙 매핑 | open | 세션 15 (2026-04-14) | - | 트랙 L (거터 QR 작업 흐름) 진입 시 Track G (포장 작업)와 통합 검토. 둘 다 작업자 흐름 재설계 영역 겹침. | docs/handoff/2026-04-14_session15.md |

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
| J-CLEANUP-DEEP-001 | 데이터 정리 | open | 세션 17 (2026-04-16) | 중간 | J-CLEANUP-001 옵션 C 채택으로 보류된 14명 직원 완전 정리 — 시드_작업자 10명 (~38,700+건 tasks 포함) + 비활성 김민국·박민식 (~940건) + 이강모 (7건) + 최수진 (2건). FK 위반 방지 위해 선행 자식 삭제 필수 (NO ACTION·RESTRICT 16건 + CASCADE 3건 + SET NULL 1건). 처리 방식: 각 직원별 관련 데이터 평가 → 선행 자식 DELETE 또는 UPDATE NULL → employees DELETE 단계적 진행. auth_user_id 자동 NULL 동작 확인 (J-CLEANUP-001 사례, FK delete_rule SET NULL 추정), 세션 18+ 진입 시 delete_rule 전체 재확인 권장. 판정 기준: 운영 중 안정성 확보 후 별 트랙 진입 또는 세션 18+. 연관: J-CLEANUP-001 (세션 17, 옵션 C 커밋 예정), 박제 후보 #13 (FK 조사 방법론). | docs/BACKLOG.md |
| FLOOR-SCHEMA-SKIP-001 | 설계 메모 | wontfix | 세션 19 (2026-04-22) | - | src/data/floor-schema.js는 의도적으로 생성하지 않음. FloorPlan.jsx가 useFloorData 훅 기반 실데이터로 작동하므로 스키마 상수 import 불필요. 목업(screen-floor-data.jsx)은 참조용으로만 보관. 빌드·런타임 영향 없음 확인 (세션 19 점검). | docs/HANDOVER_PHASE5_SESSION19.md |

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
