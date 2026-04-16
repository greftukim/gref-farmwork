/**
 * 계약만료 상태 유틸
 *
 * - getContractExpiryStatus: contractEndDate → 'expired' | 'urgent' | 'normal' | null
 * - getExpiryColorClass: status → Tailwind 색상 클래스
 *
 * J-4-UI-E 세션 17 신설.
 */

/**
 * 계약만료 상태 계산
 * @param {string|null} contractEndDate - 'YYYY-MM-DD' 형식 또는 null
 * @returns {'expired'|'urgent'|'normal'|null}
 */
export function getContractExpiryStatus(contractEndDate) {
  if (!contractEndDate) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiry = new Date(contractEndDate);
  expiry.setHours(0, 0, 0, 0);
  const diffMs = expiry - today;
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays <= 0) return 'expired';
  if (diffDays <= 30) return 'urgent';
  return 'normal';
}

/**
 * 계약만료 상태 → Tailwind 색상 클래스
 * @param {'expired'|'urgent'|'normal'|null} status
 * @returns {string}
 */
export function getExpiryColorClass(status) {
  if (status === 'expired') return 'text-red-600 font-bold';
  if (status === 'urgent') return 'text-amber-600';
  return '';
}
