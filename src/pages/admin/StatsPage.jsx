import { useState, useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, LineChart, Line,
} from 'recharts';
import useTaskStore from '../../stores/taskStore';
import useEmployeeStore from '../../stores/employeeStore';
import useCropStore from '../../stores/cropStore';
import Card from '../../components/common/Card';

const COLORS = ['#059669', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];

// 날짜 범위 계산
function getDateRange(mode, customStart, customEnd, month) {
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];
  if (mode === '전체') return { start: null, end: null };
  if (mode === '1주') {
    const d = new Date(now);
    d.setDate(d.getDate() - 7);
    return { start: d.toISOString().split('T')[0], end: todayStr };
  }
  if (mode === '1달') {
    const d = new Date(now);
    d.setDate(d.getDate() - 30);
    return { start: d.toISOString().split('T')[0], end: todayStr };
  }
  if (mode === '월별') {
    if (!month) return { start: null, end: null };
    const [y, m] = month.split('-').map(Number);
    const last = new Date(y, m, 0).getDate();
    return { start: `${month}-01`, end: `${month}-${String(last).padStart(2, '0')}` };
  }
  if (mode === '직접') {
    return { start: customStart || null, end: customEnd || null };
  }
  return { start: null, end: null };
}

const RANGE_MODES = ['전체', '1주', '1달', '월별', '직접'];

export default function StatsPage() {
  const tasks = useTaskStore((s) => s.tasks);
  const employees = useEmployeeStore((s) => s.employees);
  const crops = useCropStore((s) => s.crops);

  const [tab, setTab] = useState('worker');
  const [rangeMode, setRangeMode] = useState('전체');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [month, setMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });

  const empMap = useMemo(() => Object.fromEntries(employees.map((e) => [e.id, e])), [employees]);
  const cropMap = useMemo(() => Object.fromEntries(crops.map((c) => [c.id, c])), [crops]);

  const { start, end } = useMemo(
    () => getDateRange(rangeMode, customStart, customEnd, month),
    [rangeMode, customStart, customEnd, month]
  );

  const completedTasks = useMemo(() => {
    return tasks.filter((t) => {
      if (t.status !== 'completed') return false;
      if (start && t.date < start) return false;
      if (end && t.date > end) return false;
      return true;
    });
  }, [tasks, start, end]);

  // ─── 작업 성과 통계 ───
  const workerStats = useMemo(() => {
    const map = {};
    completedTasks.forEach((t) => {
      if (!map[t.workerId]) map[t.workerId] = { name: empMap[t.workerId]?.name || '?', count: 0, totalMin: 0 };
      map[t.workerId].count++;
      map[t.workerId].totalMin += t.durationMinutes || 0;
    });
    return Object.values(map).sort((a, b) => b.count - a.count);
  }, [completedTasks, empMap]);

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

  // ─── 수확량 통계 ───
  const harvestTasks = useMemo(
    () => completedTasks.filter((t) => t.taskType === '수확' && t.quantity),
    [completedTasks]
  );

  const harvestTrend = useMemo(() => {
    const dateMap = {};
    harvestTasks.forEach((t) => {
      if (!dateMap[t.date]) dateMap[t.date] = { date: t.date.slice(5).replace('-', '/') };
      const cropName = cropMap[t.cropId]?.name || '기타';
      dateMap[t.date][cropName] = (dateMap[t.date][cropName] || 0) + (t.quantity || 0);
    });
    return Object.values(dateMap).sort((a, b) => a.date.localeCompare(b.date));
  }, [harvestTasks, cropMap]);

  const harvestCrops = useMemo(() => {
    const names = new Set();
    harvestTasks.forEach((t) => names.add(cropMap[t.cropId]?.name || '기타'));
    return [...names];
  }, [harvestTasks, cropMap]);

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

  const performanceTabs = [
    { key: 'worker', label: '작업자별' },
    { key: 'crop',   label: '작물별' },
    { key: 'type',   label: '작업유형별' },
  ];
  const currentData = tab === 'worker' ? workerStats : tab === 'crop' ? cropStats : typeStats;

  return (
    <div>
      <h2 className="text-xl font-heading font-semibold text-gray-900 mb-4">작업 성과 분석</h2>

      {/* 기간 필터 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6">
        <div className="text-xs font-medium text-gray-500 mb-2">기간 선택</div>
        <div className="flex flex-wrap gap-2 mb-3">
          {RANGE_MODES.map((m) => (
            <button
              key={m}
              onClick={() => setRangeMode(m)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                rangeMode === m
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {m}
            </button>
          ))}
        </div>

        {rangeMode === '월별' && (
          <input
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm"
          />
        )}
        {rangeMode === '직접' && (
          <div className="flex items-center gap-2 flex-wrap">
            <input type="date" value={customStart} onChange={(e) => setCustomStart(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm" />
            <span className="text-gray-400 text-sm">~</span>
            <input type="date" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm" />
          </div>
        )}
        {start && (
          <div className="text-xs text-gray-400 mt-2">
            {start} ~ {end || '오늘'} · 완료 {completedTasks.length}건
          </div>
        )}
        {!start && (
          <div className="text-xs text-gray-400 mt-2">전체 기간 · 완료 {completedTasks.length}건</div>
        )}
      </div>

      {/* ── 작업 성과 ── */}
      <h3 className="text-sm font-semibold text-gray-500 mb-3">작업 성과</h3>
      <div className="flex gap-2 mb-4">
        {performanceTabs.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium min-h-[36px] transition-colors ${
              tab === t.key ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}>{t.label}</button>
        ))}
      </div>

      {currentData.length === 0 ? (
        <p className="text-gray-400 text-sm text-center py-8 mb-6">완료된 작업 데이터가 없습니다</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <Card accent="blue" className="p-5">
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

      {/* ── 수확량 ── */}
      <h3 className="text-sm font-semibold text-gray-500 mb-3">수확량</h3>
      {harvestTasks.length === 0 ? (
        <p className="text-gray-400 text-sm text-center py-8">수확 데이터가 없습니다</p>
      ) : (
        <div className="space-y-6">
          <Card accent="emerald" className="p-5">
            <h3 className="text-sm font-semibold text-gray-500 mb-4">수확량 추이</h3>
            <div className="h-64">
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
