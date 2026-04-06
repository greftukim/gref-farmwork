import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import useEmployeeStore from '../../stores/employeeStore';
import useAttendanceStore from '../../stores/attendanceStore';
import useTaskStore from '../../stores/taskStore';
import useIssueStore from '../../stores/issueStore';
import useCallStore from '../../stores/callStore';
import useLeaveStore from '../../stores/leaveStore';
import useNoticeStore from '../../stores/noticeStore';
import useAuthStore from '../../stores/authStore';
import useBranchStore from '../../stores/branchStore';
import Card from '../../components/common/Card';

const today = () => new Date().toISOString().split('T')[0];

function StatCard({ label, value, color, sub }) {
  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 text-center">
      <div className="text-sm text-gray-500 mb-1">{label}</div>
      <div className={`text-3xl font-bold ${color}`}>{value}</div>
      {sub && <div className="text-sm text-gray-400 mt-0.5">{sub}</div>}
    </div>
  );
}

export default function AdminDashboard() {
  const currentUser = useAuthStore((s) => s.currentUser);
  const isFarmTeam = currentUser?.team === 'farm';

  const employees = useEmployeeStore((s) => s.employees);
  const attendance = useAttendanceStore((s) => s.records);
  const tasks = useTaskStore((s) => s.tasks);
  const issues = useIssueStore((s) => s.issues);
  const calls = useCallStore((s) => s.calls);
  const leaveRequests = useLeaveStore((s) => s.requests);
  const leaveBalances = useLeaveStore((s) => s.balances);
  const notices = useNoticeStore((s) => s.notices);
  const selectedBranch = useBranchStore((s) => s.selectedBranch);

  const [missedDays, setMissedDays] = useState(7);
  const todayStr = today();

  // 지점 필터링
  const filteredEmployees = useMemo(() => {
    const active = employees.filter((e) => e.isActive);
    if (selectedBranch === 'all') return active;
    return active.filter((e) => e.branchId === selectedBranch);
  }, [employees, selectedBranch]);

  const workers = useMemo(() => filteredEmployees.filter((e) => e.role === 'worker'), [filteredEmployees]);
  const workerIds = useMemo(() => new Set(workers.map((w) => w.id)), [workers]);
  const empMap = useMemo(() => Object.fromEntries(employees.map((e) => [e.id, e])), [employees]);

  // ─── 출근 현황 ───
  const todayAttendance = useMemo(
    () => attendance.filter((a) => a.date === todayStr && workerIds.has(a.employeeId)),
    [attendance, todayStr, workerIds]
  );
  const checkedIn = todayAttendance.filter((a) => a.status !== 'late').length;
  const lateCount = todayAttendance.filter((a) => a.status === 'late').length;
  const notCheckedIn = workers.length - todayAttendance.length;
  const todayLeaves = useMemo(
    () => leaveRequests.filter((r) => r.date === todayStr && r.status === 'hr_approved' && workerIds.has(r.employeeId)),
    [leaveRequests, todayStr, workerIds]
  );

  // ─── 출퇴근 누락 ───
  const missedRecords = useMemo(() => {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - missedDays);
    const cutoffStr = cutoff.toISOString().split('T')[0];
    return attendance.filter(
      (a) => a.date >= cutoffStr && a.date < todayStr && workerIds.has(a.employeeId) && a.checkIn && !a.checkOut
    );
  }, [attendance, todayStr, missedDays, workerIds]);

  // ─── 처리 필요 ───
  const pendingLeaves = useMemo(() => {
    if (isFarmTeam) return leaveRequests.filter((r) => r.status === 'pending');
    return leaveRequests.filter((r) => r.status === 'farm_approved');
  }, [leaveRequests, isFarmTeam]);
  const unresolvedIssues = useMemo(() => issues.filter((i) => !i.isResolved), [issues]);
  const unconfirmedCalls = useMemo(() => calls.filter((c) => !c.isConfirmed), [calls]);
  const alertCount = pendingLeaves.length + unresolvedIssues.length + unconfirmedCalls.length;

  // ─── 공지사항 ───
  const recentNotices = useMemo(
    () => [...notices].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 4),
    [notices]
  );

  // ─── 휴가 현황 ───
  const balanceList = useMemo(
    () => leaveBalances
      .filter((b) => workerIds.has(b.employeeId) && b.year === new Date().getFullYear())
      .map((b) => ({
        ...b,
        name: empMap[b.employeeId]?.name || '—',
        remaining: b.totalDays - b.usedDays,
        pct: b.totalDays > 0 ? Math.round((b.usedDays / b.totalDays) * 100) : 0,
      })),
    [leaveBalances, workerIds, empMap]
  );

  // ─── 작업 진행 (재배팀) ───
  const todayTasks = useMemo(
    () => tasks.filter((t) => t.date === todayStr && workerIds.has(t.workerId)),
    [tasks, todayStr, workerIds]
  );
  const taskTotal = todayTasks.length;
  const taskCompleted = todayTasks.filter((t) => t.status === 'completed').length;
  const taskInProgress = todayTasks.filter((t) => t.status === 'in_progress').length;
  const taskPending = todayTasks.filter((t) => t.status === 'pending').length;

  const donutData = [
    { name: '완료', value: taskCompleted, color: '#10B981' },
    { name: '진행', value: taskInProgress, color: '#2563EB' },
    { name: '대기', value: taskPending, color: '#D1D5DB' },
  ].filter((d) => d.value > 0);
  if (donutData.length === 0) donutData.push({ name: '없음', value: 1, color: '#E5E7EB' });

  return (
    <div>
      <h2 className="text-2xl font-heading font-bold text-gray-900 mb-6">대시보드</h2>

      {/* 1행: 출근 현황 4열 카드 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
        <StatCard label="출근" value={checkedIn} color="text-blue-600" sub="명" />
        <StatCard label="지각" value={lateCount} color="text-amber-500" sub="명" />
        <StatCard label="휴가" value={todayLeaves.length} color="text-green-500" sub="명" />
        <StatCard label="미출근" value={notCheckedIn} color="text-gray-400" sub="명" />
      </div>

      {/* 2행: 작업 도넛(재배팀) + 출퇴근 누락 */}
      <div className={`grid grid-cols-1 ${isFarmTeam ? 'md:grid-cols-2' : ''} gap-4 mb-4`}>
        {isFarmTeam && (
          <Card accent="blue" className="p-6">
            <div className="text-sm font-medium text-gray-500 mb-4">작업 진행</div>
            <div className="flex items-center gap-6">
              <div className="w-32 h-32">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={donutData}
                      cx="50%"
                      cy="50%"
                      innerRadius={35}
                      outerRadius={55}
                      dataKey="value"
                      strokeWidth={0}
                    >
                      {donutData.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <span className="w-3 h-3 rounded-full bg-green-500" />
                  <span className="text-gray-600">완료</span>
                  <span className="font-bold text-gray-900 ml-auto">{taskCompleted}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <span className="w-3 h-3 rounded-full bg-blue-600" />
                  <span className="text-gray-600">진행</span>
                  <span className="font-bold text-gray-900 ml-auto">{taskInProgress}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <span className="w-3 h-3 rounded-full bg-gray-300" />
                  <span className="text-gray-600">대기</span>
                  <span className="font-bold text-gray-900 ml-auto">{taskPending}</span>
                </div>
              </div>
            </div>
          </Card>
        )}

        <Card accent={missedRecords.length > 0 ? 'amber' : 'gray'} className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="text-sm font-medium text-gray-500">출퇴근 누락</div>
            <select
              value={missedDays}
              onChange={(e) => setMissedDays(Number(e.target.value))}
              className="border border-gray-200 rounded-lg px-2 py-1 text-xs bg-white"
            >
              <option value={3}>최근 3일</option>
              <option value={7}>최근 7일</option>
              <option value={14}>최근 14일</option>
              <option value={30}>최근 30일</option>
            </select>
          </div>
          {missedRecords.length === 0 ? (
            <div className="text-center py-6">
              <div className="text-3xl font-bold text-gray-300">0</div>
              <div className="text-xs text-gray-400 mt-1">누락 없음</div>
            </div>
          ) : (
            <div className="space-y-2 max-h-[140px] overflow-y-auto">
              {missedRecords.map((r) => (
                <div key={r.id} className="flex items-center justify-between text-sm bg-amber-50 rounded-lg px-3 py-2">
                  <span className="font-medium text-gray-900">{empMap[r.employeeId]?.name}</span>
                  <span className="text-gray-400 text-xs">{r.date}</span>
                  <span className="text-xs text-amber-600 font-medium">퇴근 미등록</span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* 3행: 승인 대기 + 공지사항 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <Link to="/admin/leave-approval">
          <Card accent={alertCount > 0 ? 'red' : 'gray'} className="p-6 active:scale-[0.98] transition-transform">
            <div className="text-sm font-medium text-gray-500 mb-3">승인 대기</div>
            <div className="text-3xl font-bold text-gray-900 mb-3">
              {alertCount}<span className="text-sm text-gray-400 ml-1">건</span>
            </div>
            <div className="flex flex-wrap gap-2 text-xs">
              {pendingLeaves.length > 0 && (
                <span className="px-2.5 py-1 rounded-full bg-amber-50 text-amber-600 font-medium">
                  근태 {pendingLeaves.length}
                </span>
              )}
              {unresolvedIssues.length > 0 && (
                <span className="px-2.5 py-1 rounded-full bg-red-50 text-red-600 font-medium">
                  신고 {unresolvedIssues.length}
                </span>
              )}
              {unconfirmedCalls.length > 0 && (
                <span className="px-2.5 py-1 rounded-full bg-red-50 text-red-600 font-medium">
                  호출 {unconfirmedCalls.length}
                </span>
              )}
              {alertCount === 0 && <span className="text-gray-400">처리할 건이 없습니다</span>}
            </div>
          </Card>
        </Link>

        <Card accent="gray" className="p-6">
          <div className="flex items-center justify-between mb-3">
            <div className="text-sm font-medium text-gray-500">공지사항</div>
            <Link to="/admin/notices" className="text-xs text-blue-600 hover:underline">더보기</Link>
          </div>
          {recentNotices.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-6">등록된 공지 없음</p>
          ) : (
            <div className="space-y-2.5">
              {recentNotices.map((n) => (
                <div key={n.id} className="flex items-center justify-between text-sm">
                  <span className="text-gray-900 truncate flex-1 mr-3">{n.title}</span>
                  <span className="text-xs text-gray-400 flex-shrink-0">{n.createdAt?.split('T')[0]}</span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* 4행: 휴가 현황 */}
      <Card accent="blue" className="p-6">
        <div className="text-sm font-medium text-gray-500 mb-4">휴가 현황</div>
        {balanceList.length === 0 ? (
          <p className="text-gray-400 text-sm text-center py-4">데이터 없음</p>
        ) : (
          <div className="space-y-3 max-h-[200px] overflow-y-auto">
            {balanceList.map((b) => (
              <div key={b.id}>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="font-medium text-gray-900">{b.name}</span>
                  <span className="text-xs text-gray-500">
                    {b.usedDays}/{b.totalDays}일 · 잔여{' '}
                    <span className={b.remaining <= 3 ? 'text-red-500 font-bold' : 'text-blue-600 font-bold'}>
                      {b.remaining}일
                    </span>
                  </span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${b.pct >= 80 ? 'bg-red-400' : 'bg-blue-500'}`}
                    style={{ width: `${b.pct}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
