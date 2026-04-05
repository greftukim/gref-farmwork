import { useState, useMemo } from 'react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import useAttendanceStore from '../../stores/attendanceStore';
import useTaskStore from '../../stores/taskStore';
import useEmployeeStore from '../../stores/employeeStore';
import useCropStore from '../../stores/cropStore';
import Card from '../../components/common/Card';

const COLORS = ['#059669', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6'];

export default function WorkStatsPage() {
  const attendance = useAttendanceStore((s) => s.records);
  const tasks = useTaskStore((s) => s.tasks);
  const employees = useEmployeeStore((s) => s.employees);
  const crops = useCropStore((s) => s.crops);
  const [tab, setTab] = useState('hours');

  const workers = useMemo(() => employees.filter((e) => e.role === 'worker' && e.isActive), [employees]);
  const cropMap = useMemo(() => Object.fromEntries(crops.map((c) => [c.id, c])), [crops]);

  // 근무 시간: 작업자별 일별 근무시간
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

  // 수확량 추이: 날짜별 작물별 수확량
  const harvestTasks = useMemo(
    () => tasks.filter((t) => t.status === 'completed' && t.taskType === '수확' && t.quantity),
    [tasks]
  );

  const harvestTrend = useMemo(() => {
    const dateMap = {};
    harvestTasks.forEach((t) => {
      const date = t.date;
      if (!dateMap[date]) dateMap[date] = { date: date.slice(5).replace('-', '/') };
      const cropName = cropMap[t.cropId]?.name || '기타';
      dateMap[date][cropName] = (dateMap[date][cropName] || 0) + (t.quantity || 0);
    });
    return Object.values(dateMap).sort((a, b) => a.date.localeCompare(b.date));
  }, [harvestTasks, cropMap]);

  const harvestCrops = useMemo(() => {
    const names = new Set();
    harvestTasks.forEach((t) => names.add(cropMap[t.cropId]?.name || '기타'));
    return [...names];
  }, [harvestTasks, cropMap]);

  // 수확량 요약
  const harvestSummary = useMemo(() => {
    const map = {};
    harvestTasks.forEach((t) => {
      const name = cropMap[t.cropId]?.name || '기타';
      if (!map[name]) map[name] = { name, total: 0, count: 0 };
      map[name].total += t.quantity || 0;
      map[name].count++;
    });
    return Object.values(map).sort((a, b) => b.total - a.total);
  }, [harvestTasks, cropMap]);

  return (
    <div>
      <h2 className="text-xl font-heading font-semibold text-gray-900 mb-6">근무·수확 통계</h2>

      <div className="flex gap-2 mb-6">
        <button onClick={() => setTab('hours')}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium min-h-[36px] transition-colors ${
            tab === 'hours' ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}>근무 시간</button>
        <button onClick={() => setTab('harvest')}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium min-h-[36px] transition-colors ${
            tab === 'harvest' ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}>수확량 추이</button>
      </div>

      {tab === 'hours' && (
        <div className="space-y-6">
          <Card accent="emerald" className="p-5">
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
                  {hoursSummary.map((s) => (
                    <tr key={s.name}>
                      <td className="px-4 py-3 font-medium text-gray-900">{s.name}</td>
                      <td className="px-4 py-3 text-gray-600">{s.days}일</td>
                      <td className="px-4 py-3 text-gray-600">{s.totalHours}시간</td>
                      <td className="px-4 py-3 text-gray-600">{s.avgHours}시간</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {tab === 'harvest' && (
        <div className="space-y-6">
          <Card accent="blue" className="p-5">
            <h3 className="text-sm font-semibold text-gray-500 mb-4">수확량 추이</h3>
            <div className="h-72">
              {harvestTrend.length === 0 ? (
                <p className="text-gray-400 text-sm text-center py-12">수확 데이터가 없습니다</p>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={harvestTrend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Legend />
                    {harvestCrops.map((name, i) => (
                      <Line key={name} type="monotone" dataKey={name} stroke={COLORS[i % COLORS.length]}
                        strokeWidth={2} dot={{ r: 3 }} />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          </Card>

          <Card accent="gray" className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 text-left text-gray-500">
                    <th className="px-4 py-3 font-medium">작물</th>
                    <th className="px-4 py-3 font-medium">수확 횟수</th>
                    <th className="px-4 py-3 font-medium">총 수확량</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {harvestSummary.map((s) => (
                    <tr key={s.name}>
                      <td className="px-4 py-3 font-medium text-gray-900">{s.name}</td>
                      <td className="px-4 py-3 text-gray-600">{s.count}회</td>
                      <td className="px-4 py-3 text-gray-600">{s.total}kg</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
