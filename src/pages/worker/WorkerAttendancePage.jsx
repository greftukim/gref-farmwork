import { useMemo } from 'react';
import useAuthStore from '../../stores/authStore';
import useAttendanceStore from '../../stores/attendanceStore';
import Card from '../../components/common/Card';

export default function WorkerAttendancePage() {
  const currentUser = useAuthStore((s) => s.currentUser);
  const records = useAttendanceStore((s) => s.records);

  const thisMonth = new Date().toISOString().slice(0, 7);

  const monthRecords = useMemo(
    () => records.filter((r) => r.employeeId === currentUser?.id && r.date.startsWith(thisMonth)),
    [records, currentUser, thisMonth]
  );

  const totalMinutes = useMemo(
    () => monthRecords.reduce((sum, r) => sum + (r.workMinutes || 0), 0),
    [monthRecords]
  );

  const workDays = monthRecords.filter((r) => r.workMinutes).length;
  const lateDays = monthRecords.filter((r) => r.status === 'late').length;

  const formatTime = (iso) => {
    if (!iso) return '—';
    const d = new Date(iso);
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  };

  return (
    <div>
      <h2 className="text-lg font-heading font-semibold text-gray-900 mb-4">근태</h2>

      <div className="grid grid-cols-3 gap-3 mb-4">
        <Card accent="blue" className="p-3 text-center">
          <div className="text-xs text-gray-400">출근일</div>
          <div className="text-lg font-bold text-gray-900">{workDays}일</div>
        </Card>
        <Card accent="blue" className="p-3 text-center">
          <div className="text-xs text-gray-400">총 근무</div>
          <div className="text-lg font-bold text-gray-900">{Math.floor(totalMinutes / 60)}h</div>
        </Card>
        <Card accent={lateDays > 0 ? 'amber' : 'gray'} className="p-3 text-center">
          <div className="text-xs text-gray-400">지각</div>
          <div className="text-lg font-bold text-gray-900">{lateDays}회</div>
        </Card>
      </div>

      <div className="space-y-2">
        {monthRecords.length === 0 && (
          <p className="text-gray-400 text-sm text-center py-8">이번 달 출퇴근 기록이 없습니다</p>
        )}
        {[...monthRecords].reverse().map((rec) => (
          <div key={rec.id} className="flex items-center justify-between bg-white rounded-lg px-4 py-3 text-sm">
            <div className="font-medium text-gray-700">{rec.date}</div>
            <div className="flex items-center gap-4 text-gray-500">
              <span>{formatTime(rec.checkIn)}</span>
              <span>~</span>
              <span>{formatTime(rec.checkOut)}</span>
              {rec.status === 'late' && (
                <span className="px-1.5 py-0.5 rounded text-xs bg-amber-100 text-amber-700">지각</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
