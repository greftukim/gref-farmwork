import { useState, useMemo } from 'react';
import useAttendanceStore from '../../stores/attendanceStore';
import useEmployeeStore from '../../stores/employeeStore';
import Card from '../../components/common/Card';

export default function AttendanceRecordsPage() {
  const records = useAttendanceStore((s) => s.records);
  const employees = useEmployeeStore((s) => s.employees);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedEmployee, setSelectedEmployee] = useState('all');

  const workers = useMemo(
    () => employees.filter((e) => e.role === 'worker' && e.isActive),
    [employees]
  );

  const empMap = useMemo(
    () => Object.fromEntries(employees.map((e) => [e.id, e])),
    [employees]
  );

  const filtered = useMemo(() => {
    let result = records.filter((r) => r.date === selectedDate);
    if (selectedEmployee !== 'all') {
      result = result.filter((r) => r.employeeId === selectedEmployee);
    }
    return result;
  }, [records, selectedDate, selectedEmployee]);

  const formatTime = (iso) => {
    if (!iso) return '—';
    const d = new Date(iso);
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  };

  const formatMinutes = (min) => {
    if (!min) return '—';
    return `${Math.floor(min / 60)}시간 ${min % 60}분`;
  };

  const statusLabel = (s) => ({ normal: '정상', late: '지각', working: '근무중', absent: '결근' }[s] || s);
  const statusColor = (s) => ({
    normal: 'bg-green-100 text-green-700',
    late: 'bg-amber-100 text-amber-700',
    working: 'bg-blue-100 text-blue-700',
    absent: 'bg-red-100 text-red-700',
  }[s] || 'bg-gray-100 text-gray-600');

  return (
    <div>
      <h2 className="text-2xl font-heading font-bold text-gray-900 mb-6">출퇴근 기록</h2>

      <div className="flex flex-wrap gap-3 mb-4">
        <input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="border border-gray-200 rounded-xl px-3 py-2 text-sm min-h-[44px]"
        />
        <select
          value={selectedEmployee}
          onChange={(e) => setSelectedEmployee(e.target.value)}
          className="border border-gray-200 rounded-xl px-3 py-2 text-sm min-h-[44px] bg-white"
        >
          <option value="all">전체 직원</option>
          {workers.map((w) => (
            <option key={w.id} value={w.id}>{w.name}</option>
          ))}
        </select>
      </div>

      {/* 모바일 카드 뷰 */}
      <div className="md:hidden space-y-3">
        {filtered.length === 0 ? (
          <p className="text-center text-gray-400 py-12">해당 날짜에 출퇴근 기록이 없습니다</p>
        ) : (
          filtered.map((r) => {
            const emp = empMap[r.employeeId];
            return (
              <Card key={r.id} accent="gray" className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <span className="font-semibold text-gray-900">{emp?.name || '—'}</span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColor(r.status)}`}>
                    {statusLabel(r.status)}
                  </span>
                </div>
                <div className="text-sm text-gray-600">
                  출근 {formatTime(r.checkIn)} / 퇴근 {formatTime(r.checkOut)}
                </div>
                <div className="text-sm text-gray-400">{formatMinutes(r.workMinutes)}</div>
              </Card>
            );
          })
        )}
      </div>

      {/* 데스크탑 테이블 뷰 */}
      <Card accent="gray" className="hidden md:block overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-left text-gray-500 border-b border-gray-100">
                <th className="px-5 py-3 font-medium">이름</th>
                <th className="px-5 py-3 font-medium">출근</th>
                <th className="px-5 py-3 font-medium">퇴근</th>
                <th className="px-5 py-3 font-medium">근무시간</th>
                <th className="px-5 py-3 font-medium">상태</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center text-gray-400 py-12">해당 날짜에 출퇴근 기록이 없습니다</td>
                </tr>
              ) : (
                filtered.map((r) => (
                  <tr key={r.id}>
                    <td className="px-5 py-3 font-medium text-gray-900">{empMap[r.employeeId]?.name || '—'}</td>
                    <td className="px-5 py-3 text-gray-600">{formatTime(r.checkIn)}</td>
                    <td className="px-5 py-3 text-gray-600">{formatTime(r.checkOut)}</td>
                    <td className="px-5 py-3 text-gray-600">{formatMinutes(r.workMinutes)}</td>
                    <td className="px-5 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColor(r.status)}`}>
                        {statusLabel(r.status)}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
