/**
 * 출근 시각과 기준 근무 시작 시각을 비교해 status를 판정.
 * @param {string} checkInTime - 'HH:MM', 'HH:MM:SS', 또는 ISO timestamp
 * @param {string|null} workStartTime - 'HH:MM' 또는 'HH:MM:SS'
 * @returns {'normal'|'late'}
 */
export function judgeAttendanceStatus(checkInTime, workStartTime) {
  if (!workStartTime || !checkInTime) return 'normal';

  let hhmm;
  if (typeof checkInTime === 'string' && checkInTime.includes('T')) {
    const d = new Date(checkInTime);
    if (isNaN(d.getTime())) return 'normal';
    hhmm = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  } else {
    hhmm = String(checkInTime).slice(0, 5);
  }

  const standard = String(workStartTime).slice(0, 5);
  return hhmm > standard ? 'late' : 'normal';
}
