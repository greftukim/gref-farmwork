/**
 * HQ 승인 허브 — 내보내기 유틸 (HQ-APPROVAL-EXPORT-001)
 * 라이브러리: xlsx (SheetJS) — dailyWorkLogExcel.js 패턴 재사용
 */
import * as XLSX from 'xlsx';

const STATUS_LABEL  = { pending: '대기', approved: '승인', rejected: '반려' };
const BRANCH_LABEL  = { busan: '부산LAB', jinju: '진주HUB', hadong: '하동HUB', management: '관리팀', headquarters: '총괄본사', seedlab: 'Seed LAB' };
const ROLE_LABEL    = { master: '총괄', hr_admin: '인사관리', farm_admin: '관리자', worker: '작업자' };
const TYPE_LABEL    = { annual: '연차', sick: '병가', personal: '개인', family: '경조사', '연차': '연차', '병가': '병가', '오전반차': '오전반차', '오후반차': '오후반차', '출장': '출장', '대휴': '대휴' };

function fmtDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' });
}

/**
 * 승인 내역 XLSX 다운로드
 * @param {Array} requests  - leaveStore.requests
 * @param {Array} employees - employeeStore.employees
 */
export function downloadApprovalExcel(requests, employees) {
  const today = new Date().toISOString().split('T')[0];
  const empMap = Object.fromEntries((employees || []).map((e) => [e.id, e]));

  // ─── 시트 1: 전체 승인 내역 ───
  const header1 = ['지점', '직원명', '역할', '신청유형', '날짜', '사유', '상태', '신청일', '처리일'];
  const rows1 = (requests || [])
    .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''))
    .map((r) => {
      const emp = empMap[r.employeeId] || {};
      return [
        BRANCH_LABEL[emp.branch]     || emp.branch    || '—',
        emp.name                     || '—',
        ROLE_LABEL[emp.role]         || '작업자',
        TYPE_LABEL[r.type]           || r.type        || '—',
        r.date                       || '—',
        r.reason                     || '—',
        STATUS_LABEL[r.status]       || r.status      || '—',
        fmtDate(r.createdAt),
        fmtDate(r.farmReviewedAt),
      ];
    });

  const ws1 = XLSX.utils.aoa_to_sheet([header1, ...rows1]);

  // ─── 시트 2: 현황 요약 ───
  const reqs = requests || [];
  const pending  = reqs.filter((r) => r.status === 'pending').length;
  const approved = reqs.filter((r) => r.status === 'approved').length;
  const rejected = reqs.filter((r) => r.status === 'rejected').length;

  const header2 = ['구분', '건수'];
  const rows2 = [
    ['대기 중',  pending],
    ['승인됨',   approved],
    ['반려됨',   rejected],
    ['전체',     reqs.length],
  ];
  const ws2 = XLSX.utils.aoa_to_sheet([header2, ...rows2]);

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws1, '승인내역');
  XLSX.utils.book_append_sheet(wb, ws2, '현황요약');
  XLSX.writeFile(wb, `gref_승인내역_${today}.xlsx`);
}
