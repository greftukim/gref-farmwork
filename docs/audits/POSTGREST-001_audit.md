# POSTGREST-001 전수 검토 — Phase 5 세션 3

> 조사 일시: 2026-04-11  
> 검토 기준: 교훈 12 (Postgrest 다중 FK disambiguation 필요)  
> 범위: `src/stores/*.js`, `src/pages/admin/**/*.jsx`, `src/lib/*.js`

---

## 분류 기준

| 분류 | 설명 |
|---|---|
| (a) 제약명 명시 OK | `employees!constraint_name(...)` 형태로 FK 제약명 이미 명시됨 |
| (b) 모호성 위험 | FK 제약명 없이 `employees(...)` 또는 `employees!inner(...)` — 동일 외부 테이블 참조 FK 2개 이상 시 에러 |
| (c) 직접 접근 안전 | `.from('employees')` 직접 호출 — embed 아님, 모호성 없음 |

---

## 검토 결과

| 파일 | 라인 | 패턴 | 분류 | 조치 |
|---|---|---|---|---|
| `src/pages/admin/AdminDashboard.jsx` | 134 | `worker:employees!safety_checks_worker_id_fkey(branch)` | **(a) OK** | 없음 |
| `src/pages/admin/SafetyChecksPage.jsx` | 176 | `worker:employees!safety_checks_worker_id_fkey(name, branch)` | **(a) OK** | 없음 |
| `src/pages/admin/SafetyChecksPage.jsx` | 177 | `approver:employees!safety_checks_approved_by_fkey(name)` | **(a) OK** | 없음 |
| `src/stores/safetyCheckStore.js` | 71 | `worker:employees!safety_checks_worker_id_fkey ( id, name, branch )` | **(a) OK** | 없음 |
| `src/stores/safetyCheckStore.js` | 174 | `employees!safety_checks_worker_id_fkey!inner ( id, name, branch )` | **(a) OK** | 없음 |
| `src/lib/excelExport.js` | 128 | `.from('employees').select(...)` | **(c) 직접** | 없음 |
| `src/stores/attendanceStore.js` | 113 | `.from('employees').select(...)` | **(c) 직접** | 없음 |
| `src/stores/authStore.js` | 23·44·80·107·135 | `.from('employees').select(...)` | **(c) 직접** | 없음 |
| `src/stores/employeeStore.js` | 11·18·26·35·55 | `.from('employees')...` | **(c) 직접** | 없음 |

---

## 결론

- **(b) 모호성 위험 건수: 0건**
- 모든 embed 패턴(5곳)이 이미 FK 제약명 명시됨 — E-8.5(`2fbcc13`)에서 fetchByDate 수정 시 동일 패턴 적용된 결과.
- 직접 `.from('employees')` 호출(9곳)은 embed 아니므로 모호성 없음.
- 타 테이블(tasks, leaves, overtime, attendance)에서 employees를 embed하는 패턴 없음.

**POSTGREST-001 → resolved. BACKLOG.md 상태 갱신 필요.**
