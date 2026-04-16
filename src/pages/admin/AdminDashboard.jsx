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

function relativeTime(iso) {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}분 전`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}시간 전`;
  return `${Math.floor(hrs / 24)}일 전`;
}

const BRANCH_ACCENTS = [
  { dot: 'bg-teal-400', bg: 'bg-teal-50', text: 'text-teal-600', iconBg: 'bg-teal-50', iconText: 'text-teal-500' },
  { dot: 'bg-indigo-400', bg: 'bg-indigo-50', text: 'text-indigo-600', iconBg: 'bg-indigo-50', iconText: 'text-indigo-500' },
  { dot: 'bg-pink-400', bg: 'bg-pink-50', text: 'text-pink-600', iconBg: 'bg-pink-50', iconText: 'text-pink-500' },
];

function issueDotStyle(type) {
  if (type === '병해충' || type === '긴급') return { dot: 'bg-red-400', card: 'bg-red-50 border-red-100' };
  if (type === '기타') return { dot: 'bg-teal-400', card: 'bg-teal-50 border-teal-100' };
  return { dot: 'bg-amber-400', card: 'bg-yellow-50 border-yellow-100' };
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
  const [attendanceModalBranch, setAttendanceModalBranch] = useState(null);
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
  const recentIssues = issues.filter((i) => !i.isResolved).slice(0, 4);

  return (
    <div>
      {/* 헤더 */}
      <div className="flex items-end justify-between mb-8 flex-wrap gap-4">
        <div>
          <p className="text-xs font-bold text-teal-600 mb-1 uppercase tracking-widest">관리팀 대시보드</p>
          <h2 className="text-2xl font-heading font-bold text-gray-900">{todayLabel}</h2>
        </div>
        <Link
          to="/admin/notices"
          className="bg-[#6366F1] hover:bg-[#4F46E5] text-white px-5 py-2.5 rounded-full text-sm font-medium shadow-lg shadow-indigo-200 transition"
        >
          + 공지 등록
        </Link>
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* W1: 지점별 출근 카드 */}
        <div className="col-span-12 grid grid-cols-1 md:grid-cols-3 gap-6">
          {branches.length === 0 ? (
            <div className="md:col-span-3 bg-white rounded-[24px] border border-gray-100 p-6 text-center text-gray-400 text-sm">
              지점 데이터 없음
            </div>
          ) : (
            branches.map((branch, idx) => {
              const accent = BRANCH_ACCENTS[idx % BRANCH_ACCENTS.length];
              return (
                <button
                  key={branch.id}
                  onClick={() => setAttendanceModalBranch(branch)}
                  className="bg-white rounded-[24px] border border-gray-200 p-6 text-left cursor-pointer hover:border-indigo-300 hover:shadow-md transition-all group flex flex-col justify-between"
                >
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="text-sm font-bold text-gray-500 group-hover:text-[#6366F1] transition-colors">{branch.name}</h3>
                    <div className={`w-8 h-8 rounded-full ${accent.iconBg} flex items-center justify-center ${accent.iconText}`}>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                  </div>
                  <div className="flex items-end justify-between mt-4">
                    <span className="text-2xl font-bold text-gray-400">—<span className="text-base text-gray-300 font-medium ml-1">명</span></span>
                    <span className={`${accent.bg} ${accent.text} px-2 py-1 rounded text-xs font-bold`}>연동 예정</span>
                  </div>
                  <p className="text-[10px] text-gray-400 mt-2">데이터 연동 후 활성화</p>
                </button>
              );
            })
          )}
        </div>

        {/* W2: 지점별 수확량 */}
        <div className="col-span-12 lg:col-span-6 bg-white rounded-[24px] shadow-sm border border-gray-100 p-6">
          <div className="mb-6">
            <h3 className="font-semibold text-gray-900">지점별 이번 주 수확량</h3>
          </div>
          <div className="flex items-end gap-6 h-40 px-4 border-b border-gray-100 pb-2">
            {branches.length === 0 ? (
              <div className="flex-1 flex items-center justify-center text-gray-300 text-sm">데이터 연동 예정</div>
            ) : (
              branches.map((branch, idx) => {
                const accent = BRANCH_ACCENTS[idx % BRANCH_ACCENTS.length];
                return (
                  <div key={branch.id} className="flex-1 flex flex-col items-center gap-1 h-full justify-end">
                    <span className={`text-xs font-bold ${accent.text} mb-1`}>— kg</span>
                    <div className={`w-full max-w-[3rem] ${accent.bg} rounded-t-lg`} style={{ height: '20%' }} />
                    <span className="text-xs font-bold text-gray-400 mt-1">{branch.name}</span>
                  </div>
                );
              })
            )}
          </div>
          <p className="text-xs text-gray-300 text-center mt-3">데이터 연동 예정</p>
        </div>

        {/* W3: 최근 이슈 피드 */}
        <div className="col-span-12 lg:col-span-6 bg-white rounded-[24px] shadow-sm border border-gray-100 p-6">
          <h3 className="font-semibold text-gray-900 mb-6">최근 이슈 피드</h3>
          {recentIssues.length === 0 ? (
            <div className="text-center py-8 text-gray-400 text-sm">미해결 이슈 없음</div>
          ) : (
            <div className="space-y-4">
              {recentIssues.map((issue) => {
                const ds = issueDotStyle(issue.type);
                const branchName = branches.find((b) => b.id === empMap[issue.workerId]?.branchId)?.name || '—';
                return (
                  <div key={issue.id} className={`flex items-start gap-4 p-4 ${ds.card} rounded-xl border transition hover:shadow-sm`}>
                    <span className={`w-2.5 h-2.5 rounded-full ${ds.dot} shrink-0 mt-1.5`} />
                    <div>
                      <p className="text-sm font-bold text-gray-800">
                        {branchName}
                        <span className="text-xs font-normal text-gray-500 ml-2">{relativeTime(issue.createdAt)}</span>
                      </p>
                      <p className="text-sm text-gray-600 mt-1">[{issue.type}] {issue.comment || '이상 신고 접수'}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* W4: 지점별 TBM 완료율 */}
        <div className="col-span-12 lg:col-span-4 bg-white rounded-[24px] shadow-sm border border-gray-100 p-6">
          <h3 className="font-semibold text-gray-900 mb-5">지점별 TBM 완료율</h3>
          {branches.length === 0 ? (
            <p className="text-sm text-gray-300 text-center py-4">데이터 연동 예정</p>
          ) : (
            <div className="space-y-5">
              {branches.map((branch, idx) => {
                const accent = BRANCH_ACCENTS[idx % BRANCH_ACCENTS.length];
                return (
                  <div key={branch.id}>
                    <div className="flex justify-between text-xs font-bold mb-1">
                      <span className="text-gray-600">{branch.name}</span>
                      <span className="text-gray-300">—%</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2">
                      <div className={`${accent.dot} h-2 rounded-full w-0`} />
                    </div>
                  </div>
                );
              })}
              <p className="text-xs text-gray-300 text-center pt-1">데이터 연동 예정</p>
            </div>
          )}
        </div>

        {/* W5: 성과 상위 명단 */}
        <div className="col-span-12 lg:col-span-4 bg-white rounded-[24px] shadow-sm border border-gray-100 p-6">
          <h3 className="font-semibold text-gray-900 mb-5">작업자 성과 상위 명단</h3>
          <div className="flex items-center justify-center h-[120px] text-gray-300 text-sm">
            데이터 연동 예정
          </div>
        </div>

        {/* W6: 공지사항 관리 */}
        <div className="col-span-12 lg:col-span-4 bg-white rounded-[24px] shadow-sm border border-gray-100 p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold text-gray-900">공지사항 관리</h3>
            <Link to="/admin/notices" className="text-xs font-bold text-[#6366F1] hover:underline">+ 새 공지</Link>
          </div>
          {recentNotices.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">등록된 공지 없음</p>
          ) : (
            <ul className="space-y-3 mt-4">
              {recentNotices.slice(0, 4).map((n) => (
                <li key={n.id} className="flex items-center gap-3 bg-gray-50 p-2.5 rounded-xl border border-gray-100">
                  <span className="bg-teal-100 text-teal-600 px-2 py-0.5 rounded text-[10px] font-bold shrink-0">최신</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-gray-800 font-medium truncate">{n.title}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* 지점 출근 상세 모달 */}
      {attendanceModalBranch && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm cursor-pointer"
            onClick={() => setAttendanceModalBranch(null)}
          />
          <div className="bg-white rounded-[24px] shadow-2xl w-full max-w-md mx-4 relative z-10 overflow-hidden flex flex-col max-h-[80vh]">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h3 className="text-lg font-bold text-gray-800">{attendanceModalBranch.name} 출근 상세</h3>
              <button
                onClick={() => setAttendanceModalBranch(null)}
                className="text-gray-400 hover:text-gray-600 bg-white rounded-full p-1 shadow-sm min-w-[32px] min-h-[32px] flex items-center justify-center"
              >
                ✕
              </button>
            </div>
            <div className="p-6 overflow-y-auto flex-1 space-y-6">
              <div className="flex justify-between bg-indigo-50 rounded-xl p-4 border border-indigo-100">
                <div className="text-center">
                  <p className="text-[10px] text-indigo-400 font-bold mb-1">총 인원</p>
                  <p className="text-lg font-bold text-indigo-700">—명</p>
                </div>
                <div className="text-center border-x border-indigo-200 px-4">
                  <p className="text-[10px] text-gray-500 font-bold mb-1">근태 (제외)</p>
                  <p className="text-lg font-bold text-gray-700">—명</p>
                </div>
                <div className="text-center">
                  <p className="text-[10px] text-teal-500 font-bold mb-1">실 출근</p>
                  <p className="text-lg font-bold text-teal-600">—명</p>
                </div>
              </div>
              <div className="text-center text-gray-300 text-sm py-6">지점별 출근 데이터 연동 예정</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
