import { useState, useMemo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
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
import useCropStore from '../../stores/cropStore';
import Card from '../../components/common/Card';
import { isFarmAdmin } from '../../lib/permissions';

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
  const isFarmTeam = isFarmAdmin(currentUser);

  const employees = useEmployeeStore((s) => s.employees);
  const attendance = useAttendanceStore((s) => s.records);
  const tasks = useTaskStore((s) => s.tasks);
  const issues = useIssueStore((s) => s.issues);
  const calls = useCallStore((s) => s.calls);
  const leaveRequests = useLeaveStore((s) => s.requests);
  const farmReview = useLeaveStore((s) => s.farmReview);
  const notices = useNoticeStore((s) => s.notices);
  const crops = useCropStore((s) => s.crops);
  const branches = useBranchStore((s) => s.branches);
  const selectedBranch = useBranchStore((s) => s.selectedBranch);

  const [missedDays, setMissedDays] = useState(7);
  const [tbmStats, setTbmStats] = useState({ approved: 0, submitted: 0 });
  const [scheduleTab, setScheduleTab] = useState('today');
  const todayStr = today();
  const todayLabel = new Date().toLocaleDateString('ko-KR', {
    year: 'numeric', month: 'long', day: 'numeric', weekday: 'short',
  });

  // selectedBranch(UUID) → branch code ('busan') 변환
  // farm_admin은 항상 본인 지점, hr_admin/master는 선택 지점
  const currentBranchCode = useMemo(() => {
    if (isFarmAdmin(currentUser)) return currentUser.branch ?? null;
    if (selectedBranch === 'all') return null;
    return branches.find((b) => b.id === selectedBranch)?.code ?? null;
  }, [selectedBranch, branches, currentUser]);

  const currentBranchName = useMemo(() => {
    if (isFarmAdmin(currentUser)) return branches.find((b) => b.code === currentUser.branch)?.name || currentUser.branch || '농장';
    if (selectedBranch === 'all') return '전체';
    return branches.find((b) => b.id === selectedBranch)?.name || '농장';
  }, [selectedBranch, branches, currentUser]);

  // 지점 필터링
  const filteredEmployees = useMemo(() => {
    const active = employees.filter((e) => e.isActive);
    if (selectedBranch === 'all') return active;
    return active.filter((e) => e.branchId === selectedBranch);
  }, [employees, selectedBranch]);

  const workers = useMemo(() => filteredEmployees.filter((e) => e.role === 'worker'), [filteredEmployees]);
  const teamLeaderCount = useMemo(() => workers.filter((w) => w.isTeamLeader).length, [workers]);
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
    () => leaveRequests.filter((r) => r.date === todayStr && r.status === 'approved' && workerIds.has(r.employeeId)),
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
    return leaveRequests.filter((r) => r.status === 'pending');
  }, [leaveRequests, isFarmTeam]);
  const unresolvedIssues = useMemo(() => issues.filter((i) => !i.isResolved), [issues]);
  const unconfirmedCalls = useMemo(() => calls.filter((c) => !c.isConfirmed), [calls]);
  const alertCount = pendingLeaves.length + unresolvedIssues.length + unconfirmedCalls.length;

  // ─── 공지사항 ───
  const recentNotices = useMemo(
    () => [...notices].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 4),
    [notices]
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

  const cropMap = useMemo(() => Object.fromEntries(crops.map((c) => [c.id, c])), [crops]);

  const teamLeader = useMemo(() => workers.find((w) => w.isTeamLeader), [workers]);

  const weekDays = useMemo(() => {
    const days = [];
    const d = new Date();
    const dow = d.getDay();
    const monday = new Date(d);
    monday.setDate(d.getDate() - (dow === 0 ? 6 : dow - 1));
    for (let i = 0; i < 7; i++) {
      const day = new Date(monday);
      day.setDate(monday.getDate() + i);
      const dateStr = day.toISOString().split('T')[0];
      const dayTasks = tasks.filter((t) => t.date === dateStr && workerIds.has(t.workerId));
      days.push({
        dateStr,
        label: day.toLocaleDateString('ko-KR', { weekday: 'short', day: 'numeric' }),
        total: dayTasks.length,
        completed: dayTasks.filter((t) => t.status === 'completed').length,
      });
    }
    return days;
  }, [tasks, workerIds]);

  // ─── TBM 통계 (오늘, 현재 지점) ───
  useEffect(() => {
    let cancelled = false;
    const fetch = async () => {
      const { data } = await supabase
        .from('safety_checks')
        .select('id, status, worker:employees!safety_checks_worker_id_fkey(branch)')
        .eq('date', todayStr)
        .eq('check_type', 'pre_task');
      if (cancelled || !data) return;
      const rows = currentBranchCode ? data.filter((c) => c.worker?.branch === currentBranchCode) : data;
      setTbmStats({
        approved: rows.filter((c) => c.status === 'approved').length,
        submitted: rows.filter((c) => c.status === 'submitted').length,
      });
    };
    fetch();
    return () => { cancelled = true; };
  }, [todayStr, currentBranchCode]);

  // 작업 그룹: cropId + taskType 조합별 집계
  const taskGroups = useMemo(() => {
    const groups = {};
    todayTasks.forEach((t) => {
      const key = `${t.cropId ?? ''}-${t.taskType ?? ''}`;
      if (!groups[key]) {
        groups[key] = { cropId: t.cropId, taskType: t.taskType, total: 0, completed: 0, inProgress: 0 };
      }
      groups[key].total++;
      if (t.status === 'completed') groups[key].completed++;
      else if (t.status === 'in_progress') groups[key].inProgress++;
    });
    return Object.values(groups).sort((a, b) => {
      // 진행중 → 대기 → 완료 순
      const score = (g) => (g.inProgress > 0 ? 0 : g.completed < g.total ? 1 : 2);
      return score(a) - score(b);
    });
  }, [todayTasks]);

  const donutData = [
    { name: '완료', value: taskCompleted, color: '#10B981' },
    { name: '진행', value: taskInProgress, color: '#2563EB' },
    { name: '대기', value: taskPending, color: '#D1D5DB' },
  ].filter((d) => d.value > 0);
  if (donutData.length === 0) donutData.push({ name: '없음', value: 1, color: '#E5E7EB' });

  // ── 재배팀 전용 대시보드 ──────────────────────────────────────────────
  if (isFarmTeam) {
    const tbmStatus = tbmStats.submitted > 0 ? 'pending' : tbmStats.approved > 0 ? 'approved' : 'none';
    const tbmMissing = Math.max(0, workers.length - tbmStats.approved - tbmStats.submitted);

    return (
      <div>
        <div className="flex items-baseline gap-3 mb-6 flex-wrap">
          <h2 className="text-2xl font-heading font-bold text-gray-900">대시보드</h2>
          <span className="text-sm text-gray-400">{todayLabel}</span>
        </div>

        <div className="grid grid-cols-12 gap-6">
          {/* W1: 출근 현황 */}
          <div className="col-span-12 md:col-span-7 bg-white rounded-[24px] shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-semibold text-gray-900">출근 현황</h3>
              <span className="text-xs text-gray-400">{currentBranchName}</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl bg-indigo-50 p-4 text-center">
                <div className="text-3xl font-bold text-indigo-600">{checkedIn}</div>
                <div className="text-xs text-indigo-400 mt-1">출근</div>
              </div>
              <div className="rounded-2xl bg-amber-50 p-4 text-center">
                <div className="text-3xl font-bold text-amber-500">{lateCount}</div>
                <div className="text-xs text-amber-400 mt-1">지각</div>
              </div>
              <div className="rounded-2xl bg-gray-50 p-4 text-center">
                <div className="text-3xl font-bold text-gray-400">{notCheckedIn}</div>
                <div className="text-xs text-gray-400 mt-1">미출근</div>
              </div>
              <div className="rounded-2xl bg-emerald-50 p-4 text-center">
                <div className="text-3xl font-bold text-emerald-500">{todayLeaves.length}</div>
                <div className="text-xs text-emerald-400 mt-1">휴가</div>
              </div>
            </div>
          </div>

          {/* W2: TBM 상태 */}
          <div className="col-span-12 md:col-span-5 bg-white rounded-[24px] shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-semibold text-gray-900">TBM 상태</h3>
              {tbmStatus === 'approved' && (
                <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700 text-xs font-medium">승인 완료</span>
              )}
              {tbmStatus === 'pending' && (
                <span className="px-2.5 py-1 rounded-full bg-amber-100 text-amber-700 text-xs font-medium">승인 대기</span>
              )}
              {tbmStatus === 'none' && (
                <span className="px-2.5 py-1 rounded-full bg-gray-100 text-gray-500 text-xs font-medium">미제출</span>
              )}
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">담당 반장</span>
                <span className="font-medium text-gray-900">{teamLeader?.name ?? '—'}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">승인 완료</span>
                <span className="font-semibold text-emerald-600">{tbmStats.approved}명</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">승인 대기</span>
                <span className={`font-semibold ${tbmStats.submitted > 0 ? 'text-amber-500' : 'text-gray-400'}`}>{tbmStats.submitted}명</span>
              </div>
              {tbmMissing > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">미제출</span>
                  <span className="font-semibold text-red-500">{tbmMissing}명</span>
                </div>
              )}
            </div>
          </div>

          {/* W3: 수확량 */}
          <div className="col-span-12 md:col-span-5 bg-white rounded-[24px] shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-semibold text-gray-900">수확량</h3>
              <span className="text-xs text-gray-400">주간</span>
            </div>
            {crops.length === 0 ? (
              <div className="flex items-center justify-center h-[120px] text-gray-300 text-sm">데이터 연동 예정</div>
            ) : (
              <div className="space-y-3">
                {crops.slice(0, 4).map((crop) => (
                  <div key={crop.id} className="flex items-center gap-3 text-sm">
                    <span className="text-gray-600 w-16 truncate">{crop.name}</span>
                    <div className="flex-1 bg-gray-100 rounded-full h-2">
                      <div className="bg-indigo-300 rounded-full h-2 w-0" />
                    </div>
                    <span className="text-gray-300 text-xs w-10 text-right">— kg</span>
                  </div>
                ))}
                <p className="text-xs text-gray-300 text-center pt-1">데이터 연동 예정</p>
              </div>
            )}
          </div>

          {/* W4: 작업 일정 */}
          <div className="col-span-12 md:col-span-7 bg-white rounded-[24px] shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">작업 일정</h3>
              <div className="flex gap-1">
                {[{ key: 'today', label: '오늘' }, { key: 'week', label: '주간' }].map(({ key, label }) => (
                  <button
                    key={key}
                    onClick={() => setScheduleTab(key)}
                    className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                      scheduleTab === key
                        ? 'bg-[#6366F1] text-white'
                        : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            {scheduleTab === 'today' ? (
              <div className="space-y-2 max-h-[160px] overflow-y-auto">
                {taskGroups.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-6">오늘 배정된 작업 없음</p>
                ) : (
                  taskGroups.map((g, i) => {
                    const allDone = g.completed === g.total;
                    const isActive = g.inProgress > 0;
                    return (
                      <div key={i} className={`flex items-center justify-between text-xs rounded-xl px-3 py-2.5 ${
                        allDone ? 'bg-emerald-50 text-emerald-700' : isActive ? 'bg-indigo-50 text-indigo-700' : 'bg-gray-50 text-gray-600'
                      }`}>
                        <span className="font-medium truncate mr-2">
                          {cropMap[g.cropId]?.name || '—'} · {g.taskType}
                        </span>
                        <span className="flex-shrink-0 font-semibold">{g.completed}/{g.total}</span>
                      </div>
                    );
                  })
                )}
              </div>
            ) : (
              <div className="grid grid-cols-7 gap-1">
                {weekDays.map((day) => (
                  <div key={day.dateStr} className={`text-center rounded-xl p-2 ${day.dateStr === todayStr ? 'bg-indigo-50' : ''}`}>
                    <div className={`text-xs mb-1 ${day.dateStr === todayStr ? 'font-bold text-indigo-600' : 'text-gray-400'}`}>
                      {day.label}
                    </div>
                    <div className={`text-sm font-bold ${
                      day.total === 0 ? 'text-gray-300' :
                      day.completed === day.total ? 'text-emerald-500' : 'text-gray-700'
                    }`}>
                      {day.total === 0 ? '—' : `${day.completed}/${day.total}`}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* W5: 승인 대기 */}
          <div className="col-span-12 md:col-span-6 bg-white rounded-[24px] shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">승인 대기</h3>
              {pendingLeaves.length > 0 && (
                <span className="px-2.5 py-1 rounded-full bg-amber-100 text-amber-700 text-xs font-medium">{pendingLeaves.length}건</span>
              )}
            </div>
            {pendingLeaves.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-6">대기 중인 신청 없음</p>
            ) : (
              <div className="space-y-2">
                {pendingLeaves.slice(0, 3).map((req) => (
                  <div key={req.id} className="flex items-center justify-between rounded-xl bg-amber-50 px-3 py-2.5">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-900 truncate">{empMap[req.employeeId]?.name}</p>
                      <p className="text-xs text-gray-400">{req.date} · {req.leaveType}</p>
                    </div>
                    <div className="flex gap-1.5 ml-2 flex-shrink-0">
                      <button
                        onClick={() => farmReview(req.id, 'approved')}
                        className="px-2.5 py-1 rounded-lg bg-[#6366F1] text-white text-xs font-medium hover:bg-[#4F46E5]"
                      >
                        승인
                      </button>
                      <button
                        onClick={() => farmReview(req.id, 'rejected')}
                        className="px-2.5 py-1 rounded-lg bg-red-50 text-red-600 text-xs font-medium hover:bg-red-100"
                      >
                        반려
                      </button>
                    </div>
                  </div>
                ))}
                {pendingLeaves.length > 3 && (
                  <Link to="/admin/leave-approval" className="block text-center text-xs text-indigo-600 hover:underline pt-1">
                    {pendingLeaves.length - 3}건 더보기
                  </Link>
                )}
              </div>
            )}
          </div>

          {/* W6: 공지사항 */}
          <div className="col-span-12 md:col-span-6 bg-white rounded-[24px] shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">공지사항</h3>
              <Link to="/admin/notices" className="text-xs text-indigo-600 hover:underline">더보기</Link>
            </div>
            {recentNotices.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-6">등록된 공지 없음</p>
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
          </div>
        </div>
      </div>
    );
  }

  // ── 인사팀(hr_admin / master) 대시보드 ──────────────────────────────
  return (
    <div>
      <div className="flex items-baseline gap-3 mb-6 flex-wrap">
        <h2 className="text-2xl font-heading font-bold text-gray-900">대시보드</h2>
        <span className="text-sm text-gray-400">{todayLabel}</span>
      </div>

      {/* 1행: 출근 현황 4열 카드 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
        <StatCard label="출근" value={checkedIn} color="text-blue-600" sub="명" />
        <StatCard label="지각" value={lateCount} color="text-amber-500" sub="명" />
        <StatCard label="휴가" value={todayLeaves.length} color="text-green-500" sub="명" />
        <StatCard label="미출근" value={notCheckedIn} color="text-gray-400" sub="명" />
      </div>

      {/* TBM 지표 4열 카드 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
        <StatCard label="오늘 TBM 승인" value={tbmStats.approved} color="text-emerald-600" sub="건" />
        <StatCard label="오늘 TBM 미승인" value={tbmStats.submitted} color={tbmStats.submitted > 0 ? 'text-red-500' : 'text-gray-400'} sub="건" />
        <StatCard label="활성 작업자" value={workers.length} color="text-blue-600" sub="명" />
        <StatCard label="활성 반장" value={teamLeaderCount} color="text-emerald-600" sub="명" />
      </div>

      {/* 2행: 작업 도넛(재배팀) + 출퇴근 누락 */}
      <div className={`grid grid-cols-1 ${isFarmTeam ? 'md:grid-cols-2' : ''} gap-4 mb-4`}>
        {isFarmTeam && (
          <Card accent="blue" className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="text-sm font-medium text-gray-500">작업 진행</div>
              <span className="text-xs text-gray-400">총 {taskTotal}건</span>
            </div>
            <div className="flex items-start gap-4">
              {/* 도넛 차트 */}
              <div className="w-24 h-24 flex-shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={donutData} cx="50%" cy="50%" innerRadius={25} outerRadius={42} dataKey="value" strokeWidth={0}>
                      {donutData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>
              {/* 작업 그룹 목록 */}
              <div className="flex-1 min-w-0 space-y-1.5 max-h-[140px] overflow-y-auto">
                {taskGroups.length === 0 ? (
                  <p className="text-xs text-gray-400 pt-2">오늘 배정된 작업 없음</p>
                ) : (
                  taskGroups.map((g, i) => {
                    const allDone = g.completed === g.total;
                    const isActive = g.inProgress > 0;
                    return (
                      <div key={i} className={`flex items-center justify-between text-xs rounded-lg px-2.5 py-1.5 ${
                        allDone ? 'bg-green-50 text-green-700' : isActive ? 'bg-blue-50 text-blue-700' : 'bg-gray-50 text-gray-600'
                      }`}>
                        <span className="font-medium truncate mr-2">
                          {cropMap[g.cropId]?.name || '—'} {g.taskType}
                        </span>
                        <span className="flex-shrink-0 font-semibold">
                          {allDone ? '완료' : isActive ? '진행중'  : '대기'} ({g.completed}/{g.total})
                        </span>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
            {/* 범례 */}
            <div className="flex gap-3 mt-3 pt-3 border-t border-gray-100 text-xs text-gray-500">
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-green-500" />완료 {taskCompleted}</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-blue-600" />진행 {taskInProgress}</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-gray-300" />대기 {taskPending}</span>
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


    </div>
  );
}
