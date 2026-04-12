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
| IOS-001 | UX | open | Phase 5 세션 6 (2026-04-12) | - | iOS PWA 설치 가이드 + 인앱 브라우저(카카오톡/네이버) 감지 → Safari 안내. iOS는 홈 화면 추가 후에만 푸시 수신. 트랙 F 마감 후 처리 권고. UX-009와 통합 검토. | docs/BACKLOG.md |
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
| TEMP-DECISION-1 | 도메인 미확정 | open | Phase 5 세션 6 (2026-04-12) | payment_status enum 임시 2단계(pending/paid). 박민식·김민국 답 수신 시 ALTER TYPE 확장. 위치: 마이그레이션 + 도메인 노트 |
| TEMP-DECISION-2 | 도메인 미확정 | open | Phase 5 세션 6 (2026-04-12) | break_minutes nullable 임시. 답 수신 시 NOT NULL DEFAULT 0 전환. 위치: 마이그레이션 + 도메인 노트 |
| TEMP-DECISION-3 | 도메인 미확정 | open | Phase 5 세션 6 (2026-04-12) | branch CHECK 3개 지점 모두 허용 임시. 진주·하동 운영 여부 미확인. 위치: 마이그레이션. 도메인 노트 §8 추적 |
| TEMP-DECISION-4 | 도메인 미확정 | open | Phase 5 세션 6 (2026-04-12) | daily_wage 반올림 정책 ROUND() 임시. 답 수신 시 GENERATED 식만 교체. 위치: 마이그레이션 + 도메인 노트 |

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
