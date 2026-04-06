import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import useEmployeeStore from '../../stores/employeeStore';
import useAttendanceStore from '../../stores/attendanceStore';
import useTaskStore from '../../stores/taskStore';
import useIssueStore from '../../stores/issueStore';
import useCallStore from '../../stores/callStore';
import useLeaveStore from '../../stores/leaveStore';
import Card from '../../components/common/Card';

export default function AdminDashboard() {
  const employees = useEmployeeStore((s) => s.employees);
  const attendance = useAttendanceStore((s) => s.records);
  const tasks = useTaskStore((s) => s.tasks);
  const issues = useIssueStore((s) => s.issues);
  const calls = useCallStore((s) => s.calls);
  const leaveRequests = useLeaveStore((s) => s.requests);

  const today = new Date().toISOString().split('T')[0];

  const workers = useMemo(() => employees.filter((e) => e.role === 'worker' && e.isActive), [employees]);
  const empMap = useMemo(() => Object.fromEntries(employees.map((e) => [e.id, e])), [employees]);

  const todayAttendance = useMemo(() => attendance.filter((a) => a.date === today), [attendance, today]);
  const checkedInCount = todayAttendance.length;
  const workingCount = todayAttendance.filter((a) => !a.checkOut).length;

  const todayTasks = useMemo(() => tasks.filter((t) => t.date === today), [tasks, today]);
  const taskTotal = todayTasks.length;
  const taskCompleted = todayTasks.filter((t) => t.status === 'completed').length;
  const taskInProgress = todayTasks.filter((t) => t.status === 'in_progress').length;
  const taskPct = taskTotal > 0 ? Math.round((taskCompleted / taskTotal) * 100) : 0;

  const unresolvedIssues = useMemo(() => issues.filter((i) => !i.isResolved), [issues]);
  const unconfirmedCalls = useMemo(() => calls.filter((c) => !c.isConfirmed), [calls]);
  const pendingLeaves = useMemo(() => leaveRequests.filter((r) => r.status === 'pending'), [leaveRequests]);
  const alertCount = unresolvedIssues.length + unconfirmedCalls.length + pendingLeaves.length;

  const recentIssues = useMemo(
    () => [...issues].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 3),
    [issues]
  );

  return (
    <div>
      <h2 className="text-xl font-heading font-semibold text-gray-900 mb-6">대시보드</h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card accent="blue" className="p-5">
          <div className="text-sm text-gray-500 mb-1">출근 현황</div>
          <div className="flex items-end gap-1">
            <span className="text-3xl font-bold text-gray-900">{checkedInCount}</span>
            <span className="text-sm text-gray-400 mb-1">/ {workers.length}명</span>
          </div>
          <div className="text-xs text-blue-600 mt-1">{workingCount}명 근무 중</div>
        </Card>

        <Card accent="blue" className="p-5">
          <div className="text-sm text-gray-500 mb-1">작업 진행</div>
          <div className="flex items-end gap-1">
            <span className="text-3xl font-bold text-gray-900">{taskCompleted}</span>
            <span className="text-sm text-gray-400 mb-1">/ {taskTotal}건 완료</span>
          </div>
          <div className="mt-2 h-2 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${taskPct}%` }} />
          </div>
          <div className="text-xs text-blue-600 mt-1">{taskInProgress}건 진행 중</div>
        </Card>

        <Link to="/admin/records">
          <Card accent={alertCount > 0 ? 'red' : 'gray'} className="p-5 active:scale-[0.98] transition-transform">
            <div className="text-sm text-gray-500 mb-1">처리 필요</div>
            <div className="flex items-end gap-1">
              <span className="text-3xl font-bold text-gray-900">{alertCount}</span>
              <span className="text-sm text-gray-400 mb-1">건</span>
            </div>
            <div className="flex gap-3 mt-1 text-xs">
              {unresolvedIssues.length > 0 && <span className="text-red-500">신고 {unresolvedIssues.length}</span>}
              {unconfirmedCalls.length > 0 && <span className="text-red-500">호출 {unconfirmedCalls.length}</span>}
              {pendingLeaves.length > 0 && <span className="text-amber-500">휴가 {pendingLeaves.length}</span>}
            </div>
          </Card>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h3 className="text-sm font-semibold text-gray-500 mb-3">오늘 작업</h3>
          {todayTasks.length === 0 ? (
            <p className="text-gray-400 text-sm">배정된 작업 없음</p>
          ) : (
            <div className="space-y-2">
              {todayTasks.map((t) => (
                <div key={t.id} className="flex items-center justify-between bg-white rounded-lg px-4 py-3 text-sm shadow-sm">
                  <div>
                    <span className="font-medium text-gray-900">{t.title}</span>
                    <span className="text-gray-400 ml-2">{empMap[t.workerId]?.name}</span>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                    t.status === 'completed' ? 'bg-green-100 text-green-700' :
                    t.status === 'in_progress' ? 'bg-blue-100 text-blue-700' :
                    'bg-amber-100 text-amber-700'
                  }`}>
                    {t.status === 'completed' ? '완료' : t.status === 'in_progress' ? '진행' : '대기'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <h3 className="text-sm font-semibold text-gray-500 mb-3">최근 이상 신고</h3>
          {recentIssues.length === 0 ? (
            <p className="text-gray-400 text-sm">신고 없음</p>
          ) : (
            <div className="space-y-2">
              {recentIssues.map((issue) => (
                <div key={issue.id} className="flex items-center justify-between bg-white rounded-lg px-4 py-3 text-sm shadow-sm">
                  <div>
                    <span className="font-medium text-gray-900">{issue.type}</span>
                    <span className="text-gray-400 ml-2">{empMap[issue.workerId]?.name}</span>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                    issue.isResolved ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                  }`}>
                    {issue.isResolved ? '처리' : '미처리'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
