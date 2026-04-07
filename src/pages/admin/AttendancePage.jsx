import { useState, useMemo } from 'react';
import useAttendanceStore from '../../stores/attendanceStore';
import useEmployeeStore from '../../stores/employeeStore';
import useAuthStore from '../../stores/authStore';
import Card from '../../components/common/Card';

const BRANCH_LABEL = { busan: '부산LAB', jinju: '진주', hadong: '하동' };
const BRANCH_ORDER = ['busan', 'jinju', 'hadong', ''];

function formatTime(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}
function formatMinutes(min) {
  if (!min) return '—';
  return `${Math.floor(min / 60)}시간 ${min % 60}분`;
}
const STATUS_LABEL = { normal: '정상', late: '지각', working: '근무중', absent: '결근', early_leave: '조기퇴근' };
const STATUS_COLOR = {
  normal: 'bg-green-100 text-green-700',
  late: 'bg-amber-100 text-amber-700',
  working: 'bg-blue-100 text-blue-700',
  absent: 'bg-red-100 text-red-700',
  early_leave: 'bg-orange-100 text-orange-700',
};

export default function AttendancePage() {
  const records = useAttendanceStore((s) => s.records);
  const employees = useEmployeeStore((s) => s.employees);
  const updateEmployee = useEmployeeStore((s) => s.updateEmployee);
  const currentUser = useAuthStore((s) => s.currentUser);

  const [view, setView] = useState('daily');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));

  // 관리팀은 작업 시간(근무 시간) 열 숨김
  const isManagement = currentUser?.team === 'management';

  const workers = useMemo(
    () => employees.filter((e) => e.role === 'worker' && e.isActive),
    [employees]
  );

  // 지점별 그룹
  const workersByBranch = useMemo(() => {
    const groups = {};
    workers.forEach((w) => {
      const key = w.branch || '';
      if (!groups[key]) groups[key] = [];
      groups[key].push(w);
    });
    return groups;
  }, [workers]);

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

  // 근무 시간 인라인 편집 상태
  const [editTimes, setEditTimes] = useState({}); // { [empId]: { workStartTime, workEndTime } }

  const getEditTime = (emp, key) =>
    editTimes[emp.id]?.[key] ?? emp[key] ?? '';

  const handleTimeChange = (empId, key, value) => {
    setEditTimes((prev) => ({
      ...prev,
      [empId]: { ...(prev[empId] || {}), [key]: value },
    }));
  };

  const handleTimeBlur = (emp, key) => {
    const value = editTimes[emp.id]?.[key];
    if (value === undefined) return;
    if (value === (emp[key] ?? '')) return; // unchanged
    updateEmployee(emp.id, { [key]: value });
  };

  const orderedBranches = BRANCH_ORDER.filter((b) => workersByBranch[b]?.length > 0);

  return (
    <div>
      <h2 className="text-xl font-heading font-semibold text-gray-900 mb-6">근무 관리</h2>

      <div className="flex gap-2 mb-4">
        {[{ key: 'daily', label: '일별 기록' }, { key: 'monthly', label: '월별 집계' }].map((v) => (
          <button
            key={v.key}
            onClick={() => setView(v.key)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium min-h-[36px] transition-colors ${
              view === v.key ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >{v.label}</button>
        ))}
      </div>

      {/* ── 일별 기록 ── */}
      {view === 'daily' && (
        <>
          <div className="mb-4">
            <input type="date" value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm min-h-[44px]" />
          </div>

          <div className="space-y-6">
            {orderedBranches.map((branchKey) => {
              const groupWorkers = workersByBranch[branchKey] || [];
              return (
                <div key={branchKey}>
                  <h3 className="text-sm font-semibold text-gray-500 mb-2 flex items-center gap-2">
                    <span className="inline-block w-2 h-2 rounded-full bg-blue-400" />
                    {BRANCH_LABEL[branchKey] || '미지정'}
                    <span className="text-xs text-gray-400 font-normal">({groupWorkers.length}명)</span>
                  </h3>
                  <Card accent="gray" className="overflow-hidden mb-2">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-gray-50 text-left text-gray-500">
                            <th className="px-4 py-2.5 font-medium">이름</th>
                            <th className="px-4 py-2.5 font-medium">출근 기준</th>
                            <th className="px-4 py-2.5 font-medium">퇴근 기준</th>
                            <th className="px-4 py-2.5 font-medium">출근</th>
                            <th className="px-4 py-2.5 font-medium">퇴근</th>
                            {!isManagement && <th className="px-4 py-2.5 font-medium">근무시간</th>}
                            <th className="px-4 py-2.5 font-medium">상태</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {groupWorkers.map((w) => {
                            const rec = dailyRecords.find((r) => r.employeeId === w.id);
                            return (
                              <tr key={w.id}>
                                <td className="px-4 py-2.5 font-medium text-gray-900">{w.name}</td>
                                {/* 출근 기준 시간 인라인 편집 */}
                                <td className="px-4 py-2.5">
                                  <input
                                    type="time"
                                    value={getEditTime(w, 'workStartTime')}
                                    onChange={(e) => handleTimeChange(w.id, 'workStartTime', e.target.value)}
                                    onBlur={() => handleTimeBlur(w, 'workStartTime')}
                                    className="border border-gray-200 rounded px-2 py-1 text-xs w-24"
                                  />
                                </td>
                                {/* 퇴근 기준 시간 인라인 편집 */}
                                <td className="px-4 py-2.5">
                                  <input
                                    type="time"
                                    value={getEditTime(w, 'workEndTime')}
                                    onChange={(e) => handleTimeChange(w.id, 'workEndTime', e.target.value)}
                                    onBlur={() => handleTimeBlur(w, 'workEndTime')}
                                    className="border border-gray-200 rounded px-2 py-1 text-xs w-24"
                                  />
                                </td>
                                <td className="px-4 py-2.5 text-gray-600">{rec ? formatTime(rec.checkIn) : '—'}</td>
                                <td className="px-4 py-2.5 text-gray-600">{rec ? formatTime(rec.checkOut) : '—'}</td>
                                {!isManagement && (
                                  <td className="px-4 py-2.5 text-gray-600">{rec ? formatMinutes(rec.workMinutes) : '—'}</td>
                                )}
                                <td className="px-4 py-2.5">
                                  {rec ? (
                                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLOR[rec.status] || 'bg-gray-100 text-gray-600'}`}>
                                      {STATUS_LABEL[rec.status] || rec.status}
                                    </span>
                                  ) : (
                                    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-400">미출근</span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </Card>
                </div>
              );
            })}

            {orderedBranches.length === 0 && (
              <p className="text-gray-400 text-sm text-center py-12">등록된 작업자가 없습니다</p>
            )}
          </div>
        </>
      )}

      {/* ── 월별 집계 ── */}
      {view === 'monthly' && (
        <>
          <div className="mb-4">
            <input type="month" value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm min-h-[44px]" />
          </div>

          <div className="space-y-6">
            {orderedBranches.map((branchKey) => {
              const groupWorkers = workersByBranch[branchKey] || [];
              const groupStats = monthlyStats.filter((s) => groupWorkers.some((w) => w.id === s.employee.id));
              return (
                <div key={branchKey}>
                  <h3 className="text-sm font-semibold text-gray-500 mb-2 flex items-center gap-2">
                    <span className="inline-block w-2 h-2 rounded-full bg-blue-400" />
                    {BRANCH_LABEL[branchKey] || '미지정'}
                  </h3>
                  <Card accent="gray" className="overflow-hidden mb-2">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-gray-50 text-left text-gray-500">
                            <th className="px-4 py-2.5 font-medium">이름</th>
                            <th className="px-4 py-2.5 font-medium">근무 시간</th>
                            <th className="px-4 py-2.5 font-medium">출근일수</th>
                            {!isManagement && <th className="px-4 py-2.5 font-medium">총 근무시간</th>}
                            {!isManagement && <th className="px-4 py-2.5 font-medium">평균 근무</th>}
                            <th className="px-4 py-2.5 font-medium">지각</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {groupStats.map((s) => (
                            <tr key={s.employee.id}>
                              <td className="px-4 py-2.5 font-medium text-gray-900">{s.employee.name}</td>
                              <td className="px-4 py-2.5 text-gray-500 text-xs">
                                {s.employee.workStartTime && s.employee.workEndTime
                                  ? `${s.employee.workStartTime}~${s.employee.workEndTime}`
                                  : '—'}
                              </td>
                              <td className="px-4 py-2.5 text-gray-600">{s.workDays}일</td>
                              {!isManagement && <td className="px-4 py-2.5 text-gray-600">{formatMinutes(s.totalMinutes)}</td>}
                              {!isManagement && <td className="px-4 py-2.5 text-gray-600">{formatMinutes(s.avgMinutes)}</td>}
                              <td className="px-4 py-2.5">
                                {s.lateDays > 0 ? (
                                  <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">{s.lateDays}회</span>
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
                </div>
              );
            })}

            {orderedBranches.length === 0 && (
              <p className="text-gray-400 text-sm text-center py-12">등록된 작업자가 없습니다</p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
