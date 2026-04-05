import { useState, useMemo } from 'react';
import useScheduleStore from '../../stores/scheduleStore';
import useEmployeeStore from '../../stores/employeeStore';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';

function getWeekDates(offset = 0) {
  const today = new Date();
  const monday = new Date(today);
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7) + offset * 7);
  const dates = [];
  for (let i = 0; i < 5; i++) {
    const d = new Date(monday);
    d.setDate(d.getDate() + i);
    dates.push(d.toISOString().split('T')[0]);
  }
  return dates;
}

const dayNames = ['월', '화', '수', '목', '금'];

function TimeBlock({ schedule }) {
  if (!schedule) {
    return <div className="h-12 bg-gray-50 rounded-lg border border-dashed border-gray-200" />;
  }
  return (
    <div className="h-12 bg-emerald-100 rounded-lg border border-emerald-200 flex items-center justify-center px-2">
      <span className="text-xs font-medium text-emerald-700 truncate">
        {schedule.startTime} - {schedule.endTime}
      </span>
    </div>
  );
}

export default function SchedulePage() {
  const [weekOffset, setWeekOffset] = useState(0);
  const schedules = useScheduleStore((s) => s.schedules);
  const employees = useEmployeeStore((s) => s.employees);

  const weekDates = useMemo(() => getWeekDates(weekOffset), [weekOffset]);

  const workers = useMemo(
    () => employees.filter((e) => e.role === 'worker' && e.isActive),
    [employees]
  );

  const scheduleMap = useMemo(() => {
    const map = {};
    schedules.forEach((s) => {
      const key = `${s.employeeId}-${s.date}`;
      map[key] = s;
    });
    return map;
  }, [schedules]);

  const weekLabel = useMemo(() => {
    if (!weekDates.length) return '';
    const start = weekDates[0];
    const end = weekDates[weekDates.length - 1];
    return `${start.slice(5).replace('-', '/')} ~ ${end.slice(5).replace('-', '/')}`;
  }, [weekDates]);

  return (
    <div>
      <h2 className="text-xl font-heading font-semibold text-gray-900 mb-6">주간 근무 일정</h2>

      <div className="flex items-center gap-3 mb-4">
        <Button size="sm" variant="ghost" onClick={() => setWeekOffset((o) => o - 1)}>
          ← 이전 주
        </Button>
        <span className="text-sm font-medium text-gray-700 min-w-[120px] text-center">
          {weekLabel}
        </span>
        <Button size="sm" variant="ghost" onClick={() => setWeekOffset((o) => o + 1)}>
          다음 주 →
        </Button>
      </div>

      <Card accent="gray" className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 w-24">작업자</th>
                {weekDates.map((date, i) => (
                  <th key={date} className="px-2 py-3 text-center text-sm font-medium text-gray-500 min-w-[100px]">
                    <div>{dayNames[i]}</div>
                    <div className="text-xs text-gray-400 font-normal">{date.slice(5).replace('-', '/')}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {workers.map((w) => (
                <tr key={w.id}>
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">{w.name}</td>
                  {weekDates.map((date) => (
                    <td key={date} className="px-2 py-2">
                      <TimeBlock schedule={scheduleMap[`${w.id}-${date}`]} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="flex items-center gap-4 mt-4 text-xs text-gray-400">
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-3 bg-emerald-100 rounded border border-emerald-200" />
          <span>근무 예정</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-3 bg-gray-50 rounded border border-dashed border-gray-200" />
          <span>일정 없음</span>
        </div>
      </div>
    </div>
  );
}
