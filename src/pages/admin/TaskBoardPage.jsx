import { useState, useMemo } from 'react';
import useTaskStore from '../../stores/taskStore';
import useEmployeeStore from '../../stores/employeeStore';
import useZoneStore from '../../stores/zoneStore';
import Card from '../../components/common/Card';

const columns = [
  { key: 'pending', label: '대기', accent: 'amber', headerBg: 'bg-amber-50', headerText: 'text-amber-700' },
  { key: 'in_progress', label: '진행 중', accent: 'blue', headerBg: 'bg-blue-50', headerText: 'text-blue-700' },
  { key: 'completed', label: '완료', accent: 'emerald', headerBg: 'bg-emerald-50', headerText: 'text-emerald-700' },
];

export default function TaskBoardPage() {
  const tasks = useTaskStore((s) => s.tasks);
  const employees = useEmployeeStore((s) => s.employees);
  const zones = useZoneStore((s) => s.zones);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  const empMap = useMemo(() => Object.fromEntries(employees.map((e) => [e.id, e])), [employees]);
  const zoneMap = useMemo(() => Object.fromEntries(zones.map((z) => [z.id, z])), [zones]);

  const dayTasks = useMemo(() => tasks.filter((t) => t.date === selectedDate), [tasks, selectedDate]);

  const grouped = useMemo(() => {
    const g = { pending: [], in_progress: [], completed: [] };
    dayTasks.forEach((t) => {
      if (g[t.status]) g[t.status].push(t);
    });
    return g;
  }, [dayTasks]);

  const total = dayTasks.length;
  const completedCount = grouped.completed.length;
  const progressPct = total > 0 ? Math.round((completedCount / total) * 100) : 0;

  return (
    <div>
      <h2 className="text-xl font-heading font-semibold text-gray-900 mb-6">작업 현황</h2>

      <div className="flex items-center gap-4 mb-4">
        <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm min-h-[44px]" />
        <div className="flex items-center gap-2 flex-1">
          <div className="flex-1 h-3 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${progressPct}%` }} />
          </div>
          <span className="text-sm font-medium text-gray-600 min-w-[80px] text-right">
            {completedCount}/{total} ({progressPct}%)
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {columns.map((col) => (
          <div key={col.key}>
            <div className={`${col.headerBg} rounded-lg px-3 py-2 mb-3 flex items-center justify-between`}>
              <span className={`text-sm font-semibold ${col.headerText}`}>{col.label}</span>
              <span className={`text-xs font-medium ${col.headerText}`}>{grouped[col.key].length}</span>
            </div>
            <div className="space-y-2">
              {grouped[col.key].length === 0 && (
                <p className="text-gray-300 text-xs text-center py-4">없음</p>
              )}
              {grouped[col.key].map((task) => (
                <Card key={task.id} accent={col.accent} className="p-3">
                  <div className="font-medium text-sm text-gray-900 mb-1">{task.title}</div>
                  <div className="text-xs text-gray-500">
                    {empMap[task.workerId]?.name || '미배정'} · {zoneMap[task.zoneId]?.name || ''}
                  </div>
                  {task.status === 'in_progress' && task.startedAt && (
                    <div className="text-xs text-blue-500 mt-1">
                      시작: {new Date(task.startedAt).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  )}
                  {task.status === 'completed' && (
                    <div className="text-xs text-emerald-600 mt-1">
                      {task.durationMinutes}분 소요
                      {task.quantity != null && ` · ${task.quantity}${task.quantityUnit}`}
                    </div>
                  )}
                </Card>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
