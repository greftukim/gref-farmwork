/**
 * 재배팀 대시보드 — 내보내기 유틸 (FARM-DASH-EXPORT-001)
 * 라이브러리: xlsx (SheetJS) — dailyWorkLogExcel.js 패턴 재사용
 */
import * as XLSX from 'xlsx';

const STATUS_KO = { done: '완료', active: '진행중', waiting: '대기' };

/**
 * 대시보드 XLSX 다운로드 — 3시트 (KPI / 주간수확 / 오늘작업)
 *
 * @param {object} opts
 * @param {string} opts.todayStr       - 표시용 날짜 (예: "2026년 4월 26일 일요일")
 * @param {Array}  opts.kpis           - KPI 배열 [{ label, value, sub }]
 * @param {Array}  opts.weekChartData  - [{ d: '월', kg: 120, isToday }]
 * @param {Array}  opts.taskRows       - [{ crop, zone, type, progress, status }]
 */
export function downloadDashboardExcel({ todayStr, kpis, weekChartData, taskRows }) {
  const today = new Date().toISOString().split('T')[0];

  // ─── 시트 1: 오늘 KPI 스냅샷 ───
  const weekTotalKg = Math.round(
    (weekChartData || []).reduce((s, d) => s + (d.kg || 0), 0) * 10
  ) / 10;

  const header1 = ['기준일', '출근 인원', '진행중 작업', '승인 대기', '미해결 이상신고', '이번 주 수확(kg)'];
  const rows1 = [[
    today,
    kpis[0]?.value ?? '—',
    kpis[1]?.value ?? '—',
    kpis[2]?.value ?? '—',
    kpis[3]?.value ?? '—',
    weekTotalKg,
  ]];
  const ws1 = XLSX.utils.aoa_to_sheet([header1, ...rows1]);

  // ─── 시트 2: 주간 수확량 ───
  const header2 = ['요일', '수확량(kg)'];
  const rows2 = (weekChartData || []).map((d) => [d.d, d.kg]);
  const ws2 = XLSX.utils.aoa_to_sheet([header2, ...rows2]);

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws1, 'KPI요약');
  XLSX.utils.book_append_sheet(wb, ws2, '주간수확량');

  // ─── 시트 3: 오늘 작업 목록 (데이터 있을 때만) ───
  if ((taskRows || []).length > 0) {
    const header3 = ['작물', '구역', '작업유형', '진행도(%)', '상태'];
    const rows3 = taskRows.map((t) => [
      t.crop,
      t.zone,
      t.type,
      t.progress,
      STATUS_KO[t.status] || t.status,
    ]);
    const ws3 = XLSX.utils.aoa_to_sheet([header3, ...rows3]);
    XLSX.utils.book_append_sheet(wb, ws3, '오늘작업');
  }

  XLSX.writeFile(wb, `gref_대시보드_${today}.xlsx`);
}
