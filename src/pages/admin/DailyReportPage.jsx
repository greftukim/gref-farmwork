import { useState, useMemo } from 'react';
import useAttendanceStore from '../../stores/attendanceStore';
import useTaskStore from '../../stores/taskStore';
import useIssueStore from '../../stores/issueStore';
import useEmployeeStore from '../../stores/employeeStore';
import useCropStore from '../../stores/cropStore';
import useZoneStore from '../../stores/zoneStore';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';

export default function DailyReportPage() {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const attendance = useAttendanceStore((s) => s.records);
  const tasks = useTaskStore((s) => s.tasks);
  const issues = useIssueStore((s) => s.issues);
  const employees = useEmployeeStore((s) => s.employees);
  const crops = useCropStore((s) => s.crops);
  const zones = useZoneStore((s) => s.zones);

  const workers = useMemo(() => employees.filter((e) => e.role === 'worker' && e.isActive), [employees]);
  const empMap = useMemo(() => Object.fromEntries(employees.map((e) => [e.id, e])), [employees]);
  const cropMap = useMemo(() => Object.fromEntries(crops.map((c) => [c.id, c])), [crops]);
  const zoneMap = useMemo(() => Object.fromEntries(zones.map((z) => [z.id, z])), [zones]);

  const dayAttendance = useMemo(() => attendance.filter((r) => r.date === selectedDate), [attendance, selectedDate]);
  const dayTasks = useMemo(() => tasks.filter((t) => t.date === selectedDate), [tasks, selectedDate]);
  const dayIssues = useMemo(
    () => issues.filter((i) => i.createdAt.startsWith(selectedDate)),
    [issues, selectedDate]
  );

  const totalWorkMinutes = dayAttendance.reduce((s, r) => s + (r.workMinutes || 0), 0);
  const completedTasks = dayTasks.filter((t) => t.status === 'completed');
  const totalQuantity = completedTasks.reduce((s, t) => s + (t.quantity || 0), 0);

  const formatTime = (iso) => {
    if (!iso) return '—';
    const d = new Date(iso);
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  };

  const formatDate = (d) => {
    const date = new Date(d);
    const days = ['일', '월', '화', '수', '목', '금', '토'];
    return `${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일 (${days[date.getDay()]})`;
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-heading font-semibold text-gray-900">일일 보고서</h2>
        <div className="flex items-center gap-3">
          <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm min-h-[44px]" />
          <Button size="sm" variant="secondary" onClick={() => window.print()}>인쇄</Button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-6 print:shadow-none">
        <div className="text-center mb-6 print:mb-4">
          <h1 className="text-lg font-heading font-bold text-gray-900">GREF FarmWork 일일 보고서</h1>
          <p className="text-sm text-gray-500 mt-1">{formatDate(selectedDate)}</p>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-emerald-50 rounded-lg p-4 text-center">
            <div className="text-xs text-emerald-600 mb-1">출근 인원</div>
            <div className="text-2xl font-bold text-emerald-700">{dayAttendance.length}/{workers.length}</div>
          </div>
          <div className="bg-blue-50 rounded-lg p-4 text-center">
            <div className="text-xs text-blue-600 mb-1">완료 작업</div>
            <div className="text-2xl font-bold text-blue-700">{completedTasks.length}/{dayTasks.length}</div>
          </div>
          <div className="bg-amber-50 rounded-lg p-4 text-center">
            <div className="text-xs text-amber-600 mb-1">이상 신고</div>
            <div className="text-2xl font-bold text-amber-700">{dayIssues.length}</div>
          </div>
        </div>

        <div className="mb-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-3 border-b pb-2">출퇴근 현황</h3>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500">
                <th className="py-2 font-medium">이름</th>
                <th className="py-2 font-medium">출근</th>
                <th className="py-2 font-medium">퇴근</th>
                <th className="py-2 font-medium">근무시간</th>
                <th className="py-2 font-medium">상태</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {workers.map((w) => {
                const rec = dayAttendance.find((r) => r.employeeId === w.id);
                return (
                  <tr key={w.id}>
                    <td className="py-2 text-gray-900">{w.name}</td>
                    <td className="py-2 text-gray-600">{rec ? formatTime(rec.checkIn) : '—'}</td>
                    <td className="py-2 text-gray-600">{rec ? formatTime(rec.checkOut) : '—'}</td>
                    <td className="py-2 text-gray-600">{rec?.workMinutes ? `${Math.floor(rec.workMinutes / 60)}h ${rec.workMinutes % 60}m` : '—'}</td>
                    <td className="py-2">
                      <span className={`text-xs ${rec ? (rec.status === 'late' ? 'text-amber-600' : 'text-green-600') : 'text-gray-400'}`}>
                        {rec ? (rec.status === 'late' ? '지각' : rec.status === 'working' ? '근무중' : '정상') : '미출근'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div className="text-xs text-gray-400 mt-2 text-right">
            총 근무: {Math.floor(totalWorkMinutes / 60)}시간 {totalWorkMinutes % 60}분
          </div>
        </div>

        <div className="mb-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-3 border-b pb-2">작업 내역</h3>
          {dayTasks.length === 0 ? (
            <p className="text-gray-400 text-sm py-2">작업 없음</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500">
                  <th className="py-2 font-medium">작업</th>
                  <th className="py-2 font-medium">작업자</th>
                  <th className="py-2 font-medium">상태</th>
                  <th className="py-2 font-medium">소요</th>
                  <th className="py-2 font-medium">수량</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {dayTasks.map((t) => (
                  <tr key={t.id}>
                    <td className="py-2 text-gray-900">{t.title}</td>
                    <td className="py-2 text-gray-600">{empMap[t.workerId]?.name}</td>
                    <td className="py-2">
                      <span className={`text-xs ${
                        t.status === 'completed' ? 'text-green-600' : t.status === 'in_progress' ? 'text-blue-600' : 'text-amber-600'
                      }`}>
                        {t.status === 'completed' ? '완료' : t.status === 'in_progress' ? '진행' : '대기'}
                      </span>
                    </td>
                    <td className="py-2 text-gray-600">{t.durationMinutes ? `${t.durationMinutes}분` : '—'}</td>
                    <td className="py-2 text-gray-600">{t.quantity ? `${t.quantity}${t.quantityUnit}` : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {totalQuantity > 0 && (
            <div className="text-xs text-gray-400 mt-2 text-right">총 수확: {totalQuantity}kg</div>
          )}
        </div>

        {dayIssues.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3 border-b pb-2">이상 신고</h3>
            <div className="space-y-2">
              {dayIssues.map((issue) => (
                <div key={issue.id} className="text-sm">
                  <span className="font-medium text-gray-900">[{issue.type}]</span>
                  <span className="text-gray-500 ml-1">{zoneMap[issue.zoneId]?.name}</span>
                  <span className="text-gray-400 ml-1">— {empMap[issue.workerId]?.name}</span>
                  <p className="text-gray-600 mt-0.5">{issue.comment}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
