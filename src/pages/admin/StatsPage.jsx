import { useState, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import useTaskStore from '../../stores/taskStore';
import useEmployeeStore from '../../stores/employeeStore';
import useCropStore from '../../stores/cropStore';
import Card from '../../components/common/Card';

const COLORS = ['#059669', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];

export default function StatsPage() {
  const tasks = useTaskStore((s) => s.tasks);
  const employees = useEmployeeStore((s) => s.employees);
  const crops = useCropStore((s) => s.crops);
  const [tab, setTab] = useState('worker');

  const empMap = useMemo(() => Object.fromEntries(employees.map((e) => [e.id, e])), [employees]);
  const cropMap = useMemo(() => Object.fromEntries(crops.map((c) => [c.id, c])), [crops]);

  const completedTasks = useMemo(() => tasks.filter((t) => t.status === 'completed'), [tasks]);

  // 작업자별 통계
  const workerStats = useMemo(() => {
    const map = {};
    completedTasks.forEach((t) => {
      if (!map[t.workerId]) map[t.workerId] = { name: empMap[t.workerId]?.name || '?', count: 0, totalMin: 0, totalQty: 0 };
      map[t.workerId].count++;
      map[t.workerId].totalMin += t.durationMinutes || 0;
      map[t.workerId].totalQty += t.quantity || 0;
    });
    return Object.values(map).sort((a, b) => b.count - a.count);
  }, [completedTasks, empMap]);

  // 작물별 통계
  const cropStats = useMemo(() => {
    const map = {};
    completedTasks.forEach((t) => {
      const name = cropMap[t.cropId]?.name || '기타';
      if (!map[name]) map[name] = { name, count: 0, totalMin: 0 };
      map[name].count++;
      map[name].totalMin += t.durationMinutes || 0;
    });
    return Object.values(map).sort((a, b) => b.count - a.count);
  }, [completedTasks, cropMap]);

  // 작업유형별 통계
  const typeStats = useMemo(() => {
    const map = {};
    completedTasks.forEach((t) => {
      const type = t.taskType || '기타';
      if (!map[type]) map[type] = { name: type, count: 0, totalMin: 0 };
      map[type].count++;
      map[type].totalMin += t.durationMinutes || 0;
    });
    return Object.values(map).sort((a, b) => b.count - a.count);
  }, [completedTasks]);

  const tabs = [
    { key: 'worker', label: '작업자별' },
    { key: 'crop', label: '작물별' },
    { key: 'type', label: '작업유형별' },
  ];

  const currentData = tab === 'worker' ? workerStats : tab === 'crop' ? cropStats : typeStats;

  return (
    <div>
      <h2 className="text-xl font-heading font-semibold text-gray-900 mb-6">작업 성과 분석</h2>

      <div className="flex gap-2 mb-6">
        {tabs.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium min-h-[36px] transition-colors ${
              tab === t.key ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}>{t.label}</button>
        ))}
      </div>

      {currentData.length === 0 ? (
        <p className="text-gray-400 text-sm text-center py-12">완료된 작업 데이터가 없습니다</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card accent="emerald" className="p-5">
            <h3 className="text-sm font-semibold text-gray-500 mb-4">완료 건수</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={currentData} layout="vertical" margin={{ left: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis type="number" tick={{ fontSize: 12 }} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 12 }} width={70} />
                  <Tooltip formatter={(value) => [`${value}건`, '완료']} />
                  <Bar dataKey="count" fill="#059669" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card accent="blue" className="p-5">
            <h3 className="text-sm font-semibold text-gray-500 mb-4">비율</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={currentData} dataKey="count" nameKey="name" cx="50%" cy="50%"
                    outerRadius={80} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    labelLine={{ stroke: '#999' }} fontSize={11}>
                    {currentData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(value) => [`${value}건`]} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card accent="gray" className="p-5 md:col-span-2">
            <h3 className="text-sm font-semibold text-gray-500 mb-4">소요 시간 (분)</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={currentData} layout="vertical" margin={{ left: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis type="number" tick={{ fontSize: 12 }} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 12 }} width={70} />
                  <Tooltip formatter={(value) => [`${value}분`, '소요 시간']} />
                  <Bar dataKey="totalMin" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
