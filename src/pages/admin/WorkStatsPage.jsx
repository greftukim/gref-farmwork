import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import useAttendanceStore from '../../stores/attendanceStore';
import useEmployeeStore from '../../stores/employeeStore';
import Card from '../../components/common/Card';

const COLORS = ['#059669', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6'];

export default function WorkStatsPage() {
  const attendance = useAttendanceStore((s) => s.records);
  const employees = useEmployeeStore((s) => s.employees);

  const workers = useMemo(() => employees.filter((e) => e.role === 'worker' && e.isActive), [employees]);

  // 작업자별 일별 근무시간
  const hoursByWorker = useMemo(() => {
    const dates = [...new Set(attendance.map((r) => r.date))].sort();
    return dates.map((date) => {
      const row = { date: date.slice(5).replace('-', '/') };
      workers.forEach((w) => {
        const rec = attendance.find((r) => r.employeeId === w.id && r.date === date);
        row[w.name] = rec?.workMinutes ? Math.round(rec.workMinutes / 60 * 10) / 10 : 0;
      });
      return row;
    });
  }, [attendance, workers]);

  // 작업자별 총 근무시간 요약
  const hoursSummary = useMemo(() => {
    return workers.map((w) => {
      const recs = attendance.filter((r) => r.employeeId === w.id && r.workMinutes);
      const totalMin = recs.reduce((s, r) => s + r.workMinutes, 0);
      const days = recs.length;
      return {
        name: w.name,
        totalHours: Math.round(totalMin / 60 * 10) / 10,
        days,
        avgHours: days > 0 ? Math.round(totalMin / days / 60 * 10) / 10 : 0,
      };
    });
  }, [attendance, workers]);

  return (
    <div>
      <h2 className="text-xl font-heading font-semibold text-gray-900 mb-6">근무 시간 통계</h2>

      <div className="space-y-6">
        <Card accent="blue" className="p-5">
          <h3 className="text-sm font-semibold text-gray-500 mb-4">일별 근무 시간 (시간)</h3>
          <div className="h-72">
            {hoursByWorker.length === 0 ? (
              <p className="text-gray-400 text-sm text-center py-12">출퇴근 데이터가 없습니다</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={hoursByWorker}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Legend />
                  {workers.map((w, i) => (
                    <Bar key={w.id} dataKey={w.name} fill={COLORS[i % COLORS.length]} radius={[2, 2, 0, 0]} />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>

        <Card accent="gray" className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-left text-gray-500">
                  <th className="px-4 py-3 font-medium">작업자</th>
                  <th className="px-4 py-3 font-medium">출근일</th>
                  <th className="px-4 py-3 font-medium">총 근무</th>
                  <th className="px-4 py-3 font-medium">일평균</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {hoursSummary.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-gray-400">데이터 없음</td>
                  </tr>
                ) : (
                  hoursSummary.map((s) => (
                    <tr key={s.name}>
                      <td className="px-4 py-3 font-medium text-gray-900">{s.name}</td>
                      <td className="px-4 py-3 text-gray-600">{s.days}일</td>
                      <td className="px-4 py-3 text-gray-600">{s.totalHours}시간</td>
                      <td className="px-4 py-3 text-gray-600">{s.avgHours}시간</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
}
