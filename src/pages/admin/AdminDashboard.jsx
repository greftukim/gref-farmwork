import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import useEmployeeStore from '../../stores/employeeStore';
import useAttendanceStore from '../../stores/attendanceStore';
import useTaskStore from '../../stores/taskStore';
import useIssueStore from '../../stores/issueStore';
import useCallStore from '../../stores/callStore';
import useLeaveStore from '../../stores/leaveStore';
import useNoticeStore from '../../stores/noticeStore';
import useBranchStore from '../../stores/branchStore';
import useAuthStore from '../../stores/authStore';
import Card from '../../components/common/Card';

const today = () => new Date().toISOString().split('T')[0];

function StatBox({ label, value, color = 'text-gray-900' }) {
  return (
    <div className="text-center">
      <div className={`text-2xl font-bold ${color}`}>{value}</div>
      <div className="text-xs text-gray-500 mt-0.5">{label}</div>
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
  const branches = useBranchStore((s) => s.branches);
  const selectedBranch = useBranchStore((s) => s.selectedBranch);
  const setSelectedBranch = useBranchStore((s) => s.setSelectedBranch);

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
  const taskPct = taskTotal > 0 ? Math.round((taskCompleted / taskTotal) * 100) : 0;

  return (
    <div>
      {/* 헤더 + 지점 선택 */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-heading font-semibold text-gray-900">대시보드</h2>
        <select
          value={selectedBranch}
          onChange={(e) => setSelectedBranch(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm min-h-[40px] bg-white"
        >
          <option value="all">전체 지점</option>
          {branches.map((b) => (
            <option key={b.id} value={b.id}>{b.name}</option>
          ))}
        </select>
      </div>

      {/* 1행: 출근 현황 + 출퇴근 누락 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        {/* 출근 현황 */}
        <Card accent="blue" className="p-5">
          <div className="text-sm font-medium text-gray-700 mb-4">오늘의 출근 현황</div>
          <div className="grid grid-cols-4 gap-2">
            <StatBox label="출근" value={checkedIn} color="text-green-600" />
            <StatBox label="지각" value={lateCount} color="text-amber-500" />
            <StatBox label="미출근" value={notCheckedIn} color="text-gray-400" />
            <StatBox label="휴가" value={todayLeaves.length} color="text-blue-500" />
          </div>
          <div className="mt-3 h-2 bg-gray-100 rounded-full overflow-hidden flex">
            {workers.length > 0 && (
              <>
                <div className="h-full bg-green-500" style={{ width: `${(checkedIn / workers.length) * 100}%` }} />
                <div className="h-full bg-amber-400" style={{ width: `${(lateCount / workers.length) * 100}%` }} />
                <div className="h-full bg-blue-400" style={{ width: `${(todayLeaves.length / workers.length) * 100}%` }} />
              </>
            )}
          </div>
        </Card>

        {/* 출퇴근 누락 */}
        <Card accent={missedRecords.length > 0 ? 'amber' : 'gray'} className="p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="text-sm font-medium text-gray-700">출퇴근 누락</div>
            <select
              value={missedDays}
              onChange={(e) => setMissedDays(Number(e.target.value))}
              className="border border-gray-200 rounded px-2 py-1 text-xs bg-white"
            >
              <option value={3}>최근 3일</option>
              <option value={7}>최근 7일</option>
              <option value={14}>최근 14일</option>
              <option value={30}>최근 30일</option>
            </select>
          </div>
          {missedRecords.length === 0 ? (
            <div className="text-center py-4">
              <div className="text-2xl font-bold text-gray-400">0</div>
              <div className="text-xs text-gray-400 mt-1">누락 없음</div>
            </div>
          ) : (
            <div className="space-y-2 max-h-[120px] overflow-y-auto">
              {missedRecords.map((r) => (
                <div key={r.id} className="flex items-center justify-between text-sm">
                  <span className="font-medium text-gray-900">{empMap[r.employeeId]?.name}</span>
                  <span className="text-gray-400">{r.date}</span>
                  <span className="text-xs text-amber-600 font-medium">퇴근 미등록</span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* 2행: 처리 필요 + 공지사항 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        {/* 처리 필요 */}
        <Link to="/admin/leave-approval">
          <Card accent={alertCount > 0 ? 'red' : 'gray'} className="p-5 active:scale-[0.98] transition-transform">
            <div className="text-sm font-medium text-gray-700 mb-3">처리 필요</div>
            <div className="text-3xl font-bold text-gray-900 mb-2">
              {alertCount}<span className="text-lg text-gray-400 ml-1">건</span>
            </div>
            <div className="flex flex-wrap gap-3 text-xs">
              {pendingLeaves.length > 0 && (
                <span className="px-2 py-1 rounded-full bg-amber-50 text-amber-600">
                  근태 승인 {pendingLeaves.length}
                </span>
              )}
              {unresolvedIssues.length > 0 && (
                <span className="px-2 py-1 rounded-full bg-red-50 text-red-600">
                  이상 신고 {unresolvedIssues.length}
                </span>
              )}
              {unconfirmedCalls.length > 0 && (
                <span className="px-2 py-1 rounded-full bg-red-50 text-red-600">
                  긴급 호출 {unconfirmedCalls.length}
                </span>
              )}
              {alertCount === 0 && <span className="text-gray-400">처리할 건이 없습니다</span>}
            </div>
          </Card>
        </Link>

        {/* 공지사항 */}
        <Card accent="gray" className="p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="text-sm font-medium text-gray-700">공지사항</div>
            <Link to="/admin/notices" className="text-xs text-blue-600 hover:underline">더보기</Link>
          </div>
          {recentNotices.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-4">등록된 공지 없음</p>
          ) : (
            <div className="space-y-2">
              {recentNotices.map((n) => (
                <div key={n.id} className="flex items-center justify-between text-sm">
                  <span className="text-gray-900 truncate flex-1 mr-2">{n.title}</span>
                  <span className="text-xs text-gray-400 flex-shrink-0">
                    {n.createdAt?.split('T')[0]}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* 3행: 휴가 현황 + 작업 진행(재배팀만) */}
      <div className={`grid grid-cols-1 ${isFarmTeam ? 'md:grid-cols-2' : ''} gap-4`}>
        {/* 휴가 현황 */}
        <Card accent="blue" className="p-5">
          <div className="text-sm font-medium text-gray-700 mb-4">휴가 현황</div>
          {balanceList.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-4">데이터 없음</p>
          ) : (
            <div className="space-y-3 max-h-[200px] overflow-y-auto">
              {balanceList.map((b) => (
                <div key={b.id}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="font-medium text-gray-900">{b.name}</span>
                    <span className="text-xs text-gray-500">
                      {b.usedDays}/{b.totalDays}일 사용 · 잔여 <span className={b.remaining <= 3 ? 'text-red-500 font-bold' : 'text-blue-600 font-bold'}>{b.remaining}일</span>
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

        {/* 작업 진행 현황 (재배팀만) */}
        {isFarmTeam && (
          <Card accent="blue" className="p-5">
            <div className="text-sm font-medium text-gray-700 mb-4">작업 진행 현황</div>
            <div className="grid grid-cols-3 gap-2 mb-4">
              <StatBox label="완료" value={taskCompleted} color="text-green-600" />
              <StatBox label="진행" value={taskInProgress} color="text-blue-600" />
              <StatBox label="대기" value={taskPending} color="text-gray-400" />
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden mb-2">
              <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${taskPct}%` }} />
            </div>
            <div className="text-xs text-gray-500 text-center">
              전체 {taskTotal}건 중 {taskCompleted}건 완료 ({taskPct}%)
            </div>
            {todayTasks.length > 0 && (
              <div className="mt-3 space-y-1.5 max-h-[120px] overflow-y-auto">
                {todayTasks.slice(0, 5).map((t) => (
                  <div key={t.id} className="flex items-center justify-between text-sm">
                    <div className="truncate flex-1 mr-2">
                      <span className="font-medium text-gray-900">{t.title}</span>
                      <span className="text-gray-400 ml-1">{empMap[t.workerId]?.name}</span>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium flex-shrink-0 ${
                      t.status === 'completed' ? 'bg-green-100 text-green-700' :
                      t.status === 'in_progress' ? 'bg-blue-100 text-blue-700' :
                      'bg-gray-100 text-gray-500'
                    }`}>
                      {t.status === 'completed' ? '완료' : t.status === 'in_progress' ? '진행' : '대기'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Card>
        )}
      </div>
    </div>
  );
}
