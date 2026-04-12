/**
 * 일용직/시급제 엑셀 유틸
 * 도메인 노트: docs/DOMAIN_DAILY_WORKERS.md §4.3
 *
 * 라이브러리: xlsx (SheetJS) — 기존 SafetyChecksPage 패턴과 동일
 * F-4 재사용: buildDailySheet()가 중간 데이터를 반환하므로
 *   워크북을 직접 건드리지 않음 → F-4에서 시트를 자유롭게 조합 가능
 */
import * as XLSX from 'xlsx';

// [TEMP-DECISION-1] payment_status 한국어 표기
const PAYMENT_LABEL = { pending: '미지급', paid: '지급완료' };

// 교훈 3: Supabase TIME 컬럼 'HH:MM:SS' → 'HH:MM'
function fmtTime(t) {
  if (!t) return '';
  return String(t).slice(0, 5);
}

function fmtWon(n) {
  if (n == null) return '';
  return n;  // 숫자 그대로 — 엑셀에서 셀 포맷으로 표시
}

/**
 * daily_work_logs row 배열 → 시트 중간 데이터 반환
 * 도메인 노트 §4.3(i) 컬럼 순서 엄수:
 *   일자 / 농장 / 이름 / 시작 / 종료 / 휴게 / 근무시간 / 시급 / 일당 / 지급상태
 *
 * @param {Array}  logs        - daily_work_logs camelCase row 배열
 * @param {Object} options
 * @param {string} options.branchLabel - 농장 표시명 (예: "부산LAB")
 * @param {string} options.dateLabel   - 일자 문자열 (예: "2026-04-12")
 * @returns {{ header: string[], rows: any[][], summaryRow: any[], sheetName: string }}
 *
 * F-4 사용 예시:
 *   const { header, rows, summaryRow, sheetName } = buildDailySheet(logs, opts);
 *   const ws = XLSX.utils.aoa_to_sheet([header, ...rows, summaryRow]);
 *   XLSX.utils.book_append_sheet(wb, ws, sheetName);
 */
export function buildDailySheet(logs, { branchLabel, dateLabel }) {
  // 도메인 노트 §4.3(i) 10개 컬럼 — 순서·헤더 변경 금지
  const header = [
    '일자',
    '농장',
    '이름',
    '시작',
    '종료',
    '휴게(분)',
    '근무시간(분)',
    '시급(원)',
    '일당(원)',
    '지급상태',
  ];

  const rows = (logs || []).map((log) => [
    log.workDate  || dateLabel,          // 일자
    branchLabel,                          // 농장
    log.workerName,                       // 이름
    fmtTime(log.startTime),               // 시작
    fmtTime(log.endTime),                 // 종료
    log.breakMinutes ?? '',               // 휴게(분) — nullable → 빈 셀
    log.workMinutes  ?? '',               // 근무시간(분) — GENERATED, 읽기 전용
    fmtWon(log.hourlyWage),               // 시급(원)
    fmtWon(log.dailyWage),                // 일당(원) — GENERATED, 읽기 전용
    PAYMENT_LABEL[log.paymentStatus] || log.paymentStatus,  // 지급상태
  ]);

  // 합계 행: 일당(원) 합계만 (8번째 인덱스)
  const totalDailyWage = (logs || []).reduce((sum, l) => sum + (l.dailyWage || 0), 0);
  const summaryRow = [
    '합계',             // 일자
    '',                 // 농장
    `${(logs || []).length}명`,  // 이름
    '', '', '', '',     // 시작·종료·휴게·근무시간
    '',                 // 시급
    totalDailyWage,     // 일당 합계
    '',                 // 지급상태
  ];

  const sheetName = dateLabel || '일별';

  return { header, rows, summaryRow, sheetName };
}

/**
 * 일별 엑셀 단일 시트 다운로드 (F-3)
 * 파일명: 일용직_{branchLabel}_{dateLabel}.xlsx
 *
 * @param {Array}  logs
 * @param {Object} options - { branchLabel, dateLabel }
 */
export function downloadDailyExcel(logs, { branchLabel, dateLabel }) {
  const { header, rows, summaryRow } = buildDailySheet(logs, { branchLabel, dateLabel });

  const ws = XLSX.utils.aoa_to_sheet([header, ...rows, summaryRow]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, '일별');
  XLSX.writeFile(wb, `일용직_${branchLabel}_${dateLabel}.xlsx`);
}

// ─── F-4 월별 엑셀 ────────────────────────────────────────────────────────────

/**
 * worker_name 기준 사람별 집계
 * 도메인 노트 D-2: 사람 테이블 없음, 동명이인 식별 안 함 → worker_name으로만 group by.
 * 동명이인은 합쳐짐 — 이는 도메인 결정사항이며 의도된 동작.
 *
 * @param {Array} logs - daily_work_logs camelCase row 배열
 * @returns {{ name, days, totalMinutes, totalWage }[]} totalWage desc 정렬
 */
export function aggregateByPerson(logs) {
  const map = new Map();
  for (const log of (logs || [])) {
    const key = log.workerName;
    const existing = map.get(key) || { name: key, days: 0, totalMinutes: 0, totalWage: 0 };
    existing.days         += 1;
    existing.totalMinutes += log.workMinutes || 0;
    existing.totalWage    += log.dailyWage   || 0;
    map.set(key, existing);
  }
  return Array.from(map.values()).sort((a, b) => b.totalWage - a.totalWage);
}

/**
 * 사람별 합계 시트 데이터
 * 도메인 노트 §4.3(ii) 시트 2:
 *   worker_name group by → 근무일수 / 총시간 / 총임금
 * 컬럼: 이름 / 근무일수 / 총 근무시간(분) / 총 일당(원)
 *
 * @param {Array} logs
 * @returns {{ header, rows, summaryRow }}
 */
export function buildPersonSummarySheet(logs) {
  const header = ['이름', '근무일수', '총 근무시간(분)', '총 일당(원)'];

  const people = aggregateByPerson(logs);
  const rows = people.map((p) => [p.name, p.days, p.totalMinutes, p.totalWage]);

  const totalMinutes = people.reduce((s, p) => s + p.totalMinutes, 0);
  const totalWage    = people.reduce((s, p) => s + p.totalWage,    0);
  const summaryRow   = ['합계', `${people.length}명`, totalMinutes, totalWage];

  return { header, rows, summaryRow };
}

/**
 * 월별 엑셀 다운로드 — 2시트 (F-4)
 * 시트 1: 전체 raw (buildDailySheet 재사용)
 * 시트 2: 사람별 합계 (buildPersonSummarySheet)
 * 파일명: 일용직임금_{branchLabel}_{YYYY-MM}.xlsx  (도메인 노트 §4.3(ii))
 *
 * @param {Array}  logs
 * @param {Object} options - { branchLabel, monthLabel } monthLabel: 'YYYY-MM'
 */
export function downloadMonthlyExcel(logs, { branchLabel, monthLabel }) {
  const wb = XLSX.utils.book_new();

  // 시트 1: 행 단위 raw (F-3 buildDailySheet 재사용)
  const daily = buildDailySheet(logs, { branchLabel, dateLabel: monthLabel });
  const ws1   = XLSX.utils.aoa_to_sheet([daily.header, ...daily.rows, daily.summaryRow]);
  XLSX.utils.book_append_sheet(wb, ws1, '전체');

  // 시트 2: 사람별 합계
  const person = buildPersonSummarySheet(logs);
  const ws2    = XLSX.utils.aoa_to_sheet([person.header, ...person.rows, person.summaryRow]);
  XLSX.utils.book_append_sheet(wb, ws2, '사람별합계');

  // 도메인 노트 §4.3(ii): 파일명 = 일용직임금_{농장}_{YYYY-MM}.xlsx
  XLSX.writeFile(wb, `일용직임금_${branchLabel}_${monthLabel}.xlsx`);
}
