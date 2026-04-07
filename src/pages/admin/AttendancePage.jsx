import { useState, useMemo } from 'react';
import useAttendanceStore from '../../stores/attendanceStore';
import useEmployeeStore from '../../stores/employeeStore';
import useBranchFilter from '../../hooks/useBranchFilter';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';

export default function AttendancePage() {
  const records = useAttendanceStore((s) => s.records);
  const employees = useEmployeeStore((s) => s.employees);
  const { branchFilter } = useBranchFilter();
  const [view, setView] = useState('daily');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedMonth, setSelectedMonth] = useState(
    new Date().toISOString().slice(0, 7)
  );

  const workers = useMemo(
    () => employees.filter((e) =>
      e.role === 'worker' &&
      e.isActive &&
      (!branchFilter || e.branch === branchFilter)
    ),
    [employees, branchFilter]
  );

  const empMap = useMemo(
    () => Object.fromEntries(employees.map((e) => [e.id, e])),
    [employees]
  );

  const dailyRecords = useMemo(
    () => records.filter((r) => r.date === selectedDate),
    [records, selectedDate]
  );

  const monthlyStats = useMemo(() => {
    const monthRecords = records.filter((r) => r.date.startsWith(selectedMonth));
    return workers.map((w) => {
      const workerRecords = monthRecords.filter((r) => r.employeeId === w.id);
      const totalMinutes = workerRecords.reduce((sum, r) => sum + (r.workMinutes || 0), 0);
      const workDays = workerRecords.filter((r) => r.workMinutes).length;
      const lateDays = workerRecords.filter((r) => r.status === 'late').length;
      return {
        employee: w,
        workDays,
        totalMinutes,
        lateDays,
        avgMinutes: workDays > 0 ? Math.round(totalMinutes / workDays) : 0,
      };
    });
  }, [records, workers, selectedMonth]);

  const formatTime = (iso) => {
    if (!iso) return '—';
    const d = new Date(iso);
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  };

  const formatMinutes = (min) => {
    if (!min) return '—';
    return `${Math.floor(min / 60)}시간 ${min % 60}분`;
  };

  const statusLabel = (status) => {
    const map = { normal: '정상', late: '지각', working: '근무중', absent: '결근' };
    return map[status] || status;
  };

  const statusColor = (status) => {
    const map = {
      normal: 'bg-green-100 text-green-700',
      late: 'bg-amber-100 text-amber-700',
      working: 'bg-blue-100 text-blue-700',
      absent: 'bg-red-100 text-red-700',
    };
    return map[status] || 'bg-gray-100 text-gray-600';
  };

  return (
    <div>
      <h2 className="text-xl font-heading font-semibold text-gray-900 mb-6">근무 관리</h2>

      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setView('daily')}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium min-h-[36px] transition-colors ${
            view === 'daily' ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          일별 기록
        </button>
        <button
          onClick={() => setView('monthly')}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium min-h-[36px] transition-colors ${
            view === 'monthly' ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          월별 집계
        </button>
      </div>

      {view === 'daily' && (
        <>
          <div className="mb-4">
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm min-h-[44px]"
            />
          </div>
          <Card accent="gray" className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 text-left text-gray-500">
                    <th className="px-4 py-3 font-medium">이름</th>
                    <th className="px-4 py-3 font-medium">출근</th>
                    <th className="px-4 py-3 font-medium">퇴근</th>
                    <th className="px-4 py-3 font-medium">근무시간</th>
                    <th className="px-4 py-3 font-medium">상태</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {workers.map((w) => {
                    const rec = dailyRecords.find((r) => r.employeeId === w.id);
                    return (
                      <tr key={w.id}>
                        <td className="px-4 py-3 font-medium text-gray-900">{w.name}</td>
                        <td className="px-4 py-3 text-gray-600">{rec ? formatTime(rec.checkIn) : '—'}</td>
                        <td className="px-4 py-3 text-gray-600">{rec ? formatTime(rec.checkOut) : '—'}</td>
                        <td className="px-4 py-3 text-gray-600">{rec ? formatMinutes(rec.workMinutes) : '—'}</td>
                        <td className="px-4 py-3">
                          {rec ? (
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColor(rec.status)}`}>
                              {statusLabel(rec.status)}
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-400">
                              미출근
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}

      {view === 'monthly' && (
        <>
          <div className="mb-4">
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm min-h-[44px]"
            />
          </div>
          <Card accent="gray" className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 text-left text-gray-500">
                    <th className="px-4 py-3 font-medium">이름</th>
                    <th className="px-4 py-3 font-medium">출근일수</th>
                    <th className="px-4 py-3 font-medium">총 근무시간</th>
                    <th className="px-4 py-3 font-medium">평균 근무</th>
                    <th className="px-4 py-3 font-medium">지각</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {monthlyStats.map((s) => (
                    <tr key={s.employee.id}>
                      <td className="px-4 py-3 font-medium text-gray-900">{s.employee.name}</td>
                      <td className="px-4 py-3 text-gray-600">{s.workDays}일</td>
                      <td className="px-4 py-3 text-gray-600">{formatMinutes(s.totalMinutes)}</td>
                      <td className="px-4 py-3 text-gray-600">{formatMinutes(s.avgMinutes)}</td>
                      <td className="px-4 py-3">
                        {s.lateDays > 0 ? (
                          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
                            {s.lateDays}회
                          </span>
                        ) : (
                          <span className="text-gray-400">0</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
