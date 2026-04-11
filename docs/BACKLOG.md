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
| RLS-DEBT-019 | RLS | open | Phase 5 세션 1 (2026-04-11) | - | safety_checks_anon_select 정책이 지점 격리 없이 전체 조회 허용 — 보안 느슨 | [docs/HANDOVER_PHASE5_SESSION1.md](HANDOVER_PHASE5_SESSION1.md#신규-백로그-3건) |
| RLS-DEBT-020 | RLS | open | Phase 5 세션 1 (2026-04-11) | **E-6.5 블로커** | fcm_tokens 테이블 INSERT RLS 정책 누락 — 반장 FCM 토큰 등록 불가 | [docs/HANDOVER_PHASE5_SESSION1.md](HANDOVER_PHASE5_SESSION1.md#신규-백로그-3건) |
| POSTGREST-001 | POSTGREST | open | Phase 5 세션 1 (2026-04-11) | - | employees JOIN 포함 스토어에서 동일 패턴의 FK 모호성 잠재 — 일괄 검토 필요 | [docs/HANDOVER_PHASE5_SESSION1.md](HANDOVER_PHASE5_SESSION1.md#신규-백로그-3건) |
| BUG-005 | BUG | resolved | Phase 5 세션 1 (2026-04-11) | - | loginWithDeviceToken select 목록에 is_team_leader 누락 — 반장 권한 판정 불가 | [docs/HANDOVER_PHASE5_SESSION1.md](HANDOVER_PHASE5_SESSION1.md#해결됨-) |
| UX-005 | UX | open | Phase 2 (2026-04-09) | - | master가 LeaveStatusPage(읽기 전용)로 라우팅되나 RLS상 UPDATE 권한 있음 — UI/RLS 불일치 | [docs/handoff/2026-04-09.md](handoff/2026-04-09.md#ux-관련) |
| UX-006 | UX | open | Phase 2 (2026-04-09) | - | farm_admin 대리 입력 전용 간소화 페이지 필요 여부 — 실사용 후 재평가 | [docs/handoff/2026-04-09.md](handoff/2026-04-09.md#ux-관련) |
| UX-007 | UX | open | Phase 2 (2026-04-09) | - | 반차/휴가 발생 시 attendance와 leave_requests 통합 처리 검토 — 현재 완전 분리 | [docs/handoff/2026-04-09.md](handoff/2026-04-09.md#ux-관련) |
| UX-008 | UX | open | Phase 2 (2026-04-09) | - | working(근무중) 상태 기록 시각 수정 허용 여부 — B-4에서 차단 결정, 실사용 후 재평가 | [docs/handoff/2026-04-09.md](handoff/2026-04-09.md#ux-관련) |
| AUDIT-001 | 기타 | open | Phase 2 (2026-04-09) | - | attendance 감사 추적 강화 — last_edited_by / last_edited_at 컬럼 추가 (B-4에서 원본 input_by 보존으로 우선 결정) | [docs/handoff/2026-04-09.md](handoff/2026-04-09.md#데이터감사) |
| DATA-001 | 기타 | open | Phase 2 (2026-04-09) | - | 하동 지점 branches 레코드 없음 — farm_admin(하동재배팀) 존재하나 GPS 좌표/반경 미등록, 실운영 전 필수 | [docs/handoff/2026-04-09.md](handoff/2026-04-09.md#데이터감사) |
| DATA-002 | 기타 | open | Phase 2 (2026-04-09) | - | EmployeesPage:203, WorkStatsPage:70의 currentUser.branch 직접 참조 — master(branch=NULL) 동작 미검증 | [docs/handoff/2026-04-09.md](handoff/2026-04-09.md#데이터감사) |

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
