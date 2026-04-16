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

// StatCard — 기존 코드 보존 (하위 호환)
function StatCard({ label, value, color, sub }) {
  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 text-center">
      <div className="text-sm text-gray-500 mb-1">{label}</div>
      <div className={`text-3xl font-bold ${color}`}>{value}</div>
      {sub && <div className="text-sm text-gray-400 mt-0.5">{sub}</div>}
    </div>
  );
}

// 지점별 accent — 목업 순서 teal / indigo / pink
const BRANCH_ACCENT = [
  { iconBg: 'bg-teal-50',   iconText: 'text-teal-500',   pctBg: 'bg-teal-50',   pctText: 'text-teal-600',   bar: 'bg-teal-400' },
  { iconBg: 'bg-indigo-50', iconText: 'text-indigo-500', pctBg: 'bg-indigo-50', pctText: 'text-indigo-600', bar: 'bg-indigo-400' },
  { iconBg: 'bg-pink-50',   iconText: 'text-pink-500',   pctBg: 'bg-pink-50',   pctText: 'text-pink-600',   bar: 'bg-pink-400' },
];

function relativeTime(iso) {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}분 전`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}시간 전`;
  return `${Math.floor(hrs / 24)}일 전`;
}

function issueStyle(type) {
  if (type === '병해충' || type === '긴급')
    return { dot: 'bg-red-400',    wrap: 'bg-red-50 rounded-xl border border-red-100 transition hover:shadow-md' };
  if (type === '기타')
    return { dot: 'bg-teal-400',   wrap: 'bg-teal-50 rounded-xl border border-teal-100 transition hover:shadow-md' };
  return   { dot: 'bg-yellow-400', wrap: 'bg-yellow-50 rounded-xl border border-yellow-100 transition hover:shadow-md' };
}

export default function AdminDashboard() {
  const currentUser = useAuthStore((s) => s.currentUser);
  const isFarmTeam = isFarmAdmin(currentUser);

  const employees   = useEmployeeStore((s) => s.employees);
  const attendance  = useAttendanceStore((s) => s.records);
  const tasks       = useTaskStore((s) => s.tasks);
  const issues      = useIssueStore((s) => s.issues);
  const calls       = useCallStore((s) => s.calls);
  const leaveRequests = useLeaveStore((s) => s.requests);
  const farmReview  = useLeaveStore((s) => s.farmReview);
  const notices     = useNoticeStore((s) => s.notices);
  const crops       = useCropStore((s) => s.crops);
  const branches    = useBranchStore((s) => s.branches);
  const selectedBranch = useBranchStore((s) => s.selectedBranch);

  const [missedDays,            setMissedDays]            = useState(7);
  const [tbmStats,              setTbmStats]              = useState({ approved: 0, submitted: 0 });
  const [scheduleTab,           setScheduleTab]           = useState('today');
  const [attendanceModalBranch, setAttendanceModalBranch] = useState(null);

  const todayStr        = today();
  const todayDateStr    = new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' });
  const todayWeekdayStr = new Date().toLocaleDateString('ko-KR', { weekday: 'long' });
  // 기존 todayLabel 보존 (하위 호환)
  const todayLabel = new Date().toLocaleDateString('ko-KR', {
    year: 'numeric', month: 'long', day: 'numeric', weekday: 'short',
  });

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

  const filteredEmployees = useMemo(() => {
    const active = employees.filter((e) => e.isActive);
    if (selectedBranch === 'all') return active;
    return active.filter((e) => e.branchId === selectedBranch);
  }, [employees, selectedBranch]);

  const workers        = useMemo(() => filteredEmployees.filter((e) => e.role === 'worker'), [filteredEmployees]);
  const teamLeaderCount = useMemo(() => workers.filter((w) => w.isTeamLeader).length, [workers]);
  const workerIds      = useMemo(() => new Set(workers.map((w) => w.id)), [workers]);
  const empMap         = useMemo(() => Object.fromEntries(employees.map((e) => [e.id, e])), [employees]);

  const todayAttendance = useMemo(
    () => attendance.filter((a) => a.date === todayStr && workerIds.has(a.employeeId)),
    [attendance, todayStr, workerIds]
  );
  const checkedIn    = todayAttendance.filter((a) => a.status !== 'late').length;
  const lateCount    = todayAttendance.filter((a) => a.status === 'late').length;
  const notCheckedIn = workers.length - todayAttendance.length;
  const todayLeaves  = useMemo(
    () => leaveRequests.filter((r) => r.date === todayStr && r.status === 'approved' && workerIds.has(r.employeeId)),
    [leaveRequests, todayStr, workerIds]
  );

  const missedRecords = useMemo(() => {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - missedDays);
    const cutoffStr = cutoff.toISOString().split('T')[0];
    return attendance.filter(
      (a) => a.date >= cutoffStr && a.date < todayStr && workerIds.has(a.employeeId) && a.checkIn && !a.checkOut
    );
  }, [attendance, todayStr, missedDays, workerIds]);

  const pendingLeaves = useMemo(
    () => leaveRequests.filter((r) => r.status === 'pending'),
    [leaveRequests]
  );
  const unresolvedIssues = useMemo(() => issues.filter((i) => !i.isResolved), [issues]);
  const unconfirmedCalls = useMemo(() => calls.filter((c) => !c.isConfirmed), [calls]);
  const alertCount = pendingLeaves.length + unresolvedIssues.length + unconfirmedCalls.length;

  const recentNotices = useMemo(
    () => [...notices].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 4),
    [notices]
  );

  const todayTasks = useMemo(
    () => tasks.filter((t) => t.date === todayStr && workerIds.has(t.workerId)),
    [tasks, todayStr, workerIds]
  );
  const taskTotal     = todayTasks.length;
  const taskCompleted = todayTasks.filter((t) => t.status === 'completed').length;
  const taskInProgress = todayTasks.filter((t) => t.status === 'in_progress').length;
  const taskPending   = todayTasks.filter((t) => t.status === 'pending').length;

  const cropMap    = useMemo(() => Object.fromEntries(crops.map((c) => [c.id, c])), [crops]);
  const teamLeader = useMemo(() => workers.find((w) => w.isTeamLeader), [workers]);

  const weekDays = useMemo(() => {
    const days = [];
    const d    = new Date();
    const dow  = d.getDay();
    const monday = new Date(d);
    monday.setDate(d.getDate() - (dow === 0 ? 6 : dow - 1));
    for (let i = 0; i < 7; i++) {
      const day = new Date(monday);
      day.setDate(monday.getDate() + i);
      const dateStr = day.toISOString().split('T')[0];
      const dayTasks = tasks.filter((t) => t.date === dateStr && workerIds.has(t.workerId));
      days.push({
        dateStr,
        label:     day.toLocaleDateString('ko-KR', { weekday: 'short', day: 'numeric' }),
        total:     dayTasks.length,
        completed: dayTasks.filter((t) => t.status === 'completed').length,
      });
    }
    return days;
  }, [tasks, workerIds]);

  useEffect(() => {
    let cancelled = false;
    const fetch = async () => {
      const { data } = await supabase
        .from('safety_checks')
        .select('id, status, worker:employees!safety_checks_worker_id_fkey(branch)')
        .eq('date', todayStr)
        .eq('check_type', 'pre_task');
      if (cancelled || !data) return;
      const rows = currentBranchCode
        ? data.filter((c) => c.worker?.branch === currentBranchCode)
        : data;
      setTbmStats({
        approved:  rows.filter((c) => c.status === 'approved').length,
        submitted: rows.filter((c) => c.status === 'submitted').length,
      });
    };
    fetch();
    return () => { cancelled = true; };
  }, [todayStr, currentBranchCode]);

  const taskGroups = useMemo(() => {
    const groups = {};
    todayTasks.forEach((t) => {
      const key = `${t.cropId ?? ''}-${t.taskType ?? ''}`;
      if (!groups[key]) {
        groups[key] = { cropId: t.cropId, taskType: t.taskType, total: 0, completed: 0, inProgress: 0 };
      }
      groups[key].total++;
      if (t.status === 'completed')  groups[key].completed++;
      else if (t.status === 'in_progress') groups[key].inProgress++;
    });
    return Object.values(groups).sort((a, b) => {
      const score = (g) => (g.inProgress > 0 ? 0 : g.completed < g.total ? 1 : 2);
      return score(a) - score(b);
    });
  }, [todayTasks]);

  // 기존 donutData 보존
  const donutData = [
    { name: '완료', value: taskCompleted,  color: '#10B981' },
    { name: '진행', value: taskInProgress, color: '#2563EB' },
    { name: '대기', value: taskPending,    color: '#D1D5DB' },
  ].filter((d) => d.value > 0);
  if (donutData.length === 0) donutData.push({ name: '없음', value: 1, color: '#E5E7EB' });

  const tbmMissing     = Math.max(0, workers.length - tbmStats.approved - tbmStats.submitted);
  const tbmStatusLabel = tbmStats.approved > 0 ? 'approved' : tbmStats.submitted > 0 ? 'submitted' : 'none';

  // ─────────────────────────────────────────────────────────────────
  // 재배팀 대시보드 (farm_admin)
  // ─────────────────────────────────────────────────────────────────
  if (isFarmTeam) {
    return (
      <section className="p-8 lg:p-12 border-b border-gray-200 bg-white/30">
        <header className="flex justify-between items-end mb-8">
          <div>
            <p className="text-sm font-bold text-[#6366F1] mb-1 uppercase tracking-widest">
              재배팀 대시보드{' '}
              <span className="text-xs text-gray-400 font-medium ml-2">({currentBranchName})</span>
            </p>
            <h1 className="text-3xl font-bold text-gray-800">
              {todayDateStr} <span className="text-xl font-normal text-gray-400">{todayWeekdayStr}</span>
            </h1>
          </div>
          <Link
            to="/admin/tasks"
            className="bg-[#6366F1] hover:bg-indigo-600 text-white px-6 py-2.5 rounded-full text-sm font-medium shadow-lg shadow-indigo-200 transition"
          >
            + 새 작업 등록
          </Link>
        </header>

        <div className="grid grid-cols-12 gap-6">
          {/* 오늘 출근 현황 */}
          <div className="bg-white rounded-[24px] shadow-sm p-6 col-span-12 lg:col-span-7 flex flex-col justify-center">
            <div className="flex justify-between items-center mb-4">
              <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block">오늘 출근 현황</span>
              <span className="text-xs font-bold text-gray-400 bg-gray-100 px-2 py-1 rounded-md">총 {workers.length}명</span>
            </div>
            <div className="grid grid-cols-4 gap-4 h-24">
              <div className="bg-teal-50 rounded-xl flex flex-col justify-center items-center">
                <p className="text-[11px] font-bold text-teal-600 mb-1">출근</p>
                <p className="text-2xl font-bold text-teal-700">{checkedIn}</p>
              </div>
              <div className="bg-yellow-50 rounded-xl flex flex-col justify-center items-center">
                <p className="text-[11px] font-bold text-yellow-600 mb-1">지각</p>
                <p className="text-2xl font-bold text-yellow-700">{lateCount}</p>
              </div>
              <div className="bg-red-50 rounded-xl flex flex-col justify-center items-center">
                <p className="text-[11px] font-bold text-red-500 mb-1">미출근</p>
                <p className="text-2xl font-bold text-red-600">{notCheckedIn}</p>
              </div>
              <div className="bg-gray-100 rounded-xl flex flex-col justify-center items-center">
                <p className="text-[11px] font-bold text-gray-500 mb-1">제외 (근태)</p>
                <p className="text-2xl font-bold text-gray-600">{todayLeaves.length}</p>
              </div>
            </div>
          </div>

          {/* 오늘 TBM 상태 */}
          <div className="bg-white rounded-[24px] shadow-sm p-6 col-span-12 lg:col-span-5 flex flex-col justify-between">
            <div>
              <span className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4 block">오늘 TBM 상태</span>
              <div className="mt-4">
                {tbmStatusLabel === 'approved' && (
                  <span className="bg-indigo-100 text-indigo-600 px-4 py-2 rounded-xl text-sm font-bold inline-block mb-4">반장 승인 완료</span>
                )}
                {tbmStatusLabel === 'submitted' && (
                  <span className="bg-amber-100 text-amber-600 px-4 py-2 rounded-xl text-sm font-bold inline-block mb-4">승인 대기</span>
                )}
                {tbmStatusLabel === 'none' && (
                  <span className="bg-gray-100 text-gray-500 px-4 py-2 rounded-xl text-sm font-bold inline-block mb-4">미제출</span>
                )}
                <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  승인 시각: —
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  반장: {teamLeader?.name || '—'}
                </div>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-gray-100 flex justify-between items-center">
              <span className="text-sm text-gray-500 font-medium">불참자</span>
              <span className="text-lg font-bold text-gray-800">{tbmMissing}명</span>
            </div>
          </div>

          {/* 작물별 이번 주 수확량 */}
          <div className="bg-white rounded-[24px] shadow-sm p-6 col-span-12 lg:col-span-5 relative">
            <div className="h-full flex flex-col">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <span className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1 block">작물별 이번 주 수확량</span>
                  <div className="flex items-end gap-3 mt-2">
                    <h2 className="text-4xl font-bold text-gray-800">— <span className="text-xl font-medium text-gray-500">kg</span></h2>
                  </div>
                </div>
                <span className="bg-teal-50 text-teal-500 px-2 py-1 rounded-md text-xs font-bold mb-1 flex items-center gap-1">—%</span>
              </div>
              <div className="flex items-end gap-6 h-32 mt-auto px-4 border-b border-gray-200 pb-2">
                {crops.length === 0 ? (
                  <div className="flex-1 flex items-center justify-center text-gray-300 text-sm pb-4">데이터 연동 예정</div>
                ) : (
                  crops.slice(0, 3).map((crop, i) => {
                    const hs = ['40%', '80%', '50%'];
                    const cs = ['bg-teal-200', 'bg-teal-400', 'bg-teal-600'];
                    return (
                      <div key={crop.id} className="flex-1 flex flex-col items-center gap-2 group h-full justify-end cursor-pointer hover:-translate-y-1.5 transition-transform duration-300">
                        <span className="text-sm font-bold text-teal-600 mb-1">—</span>
                        <div className={`w-full max-w-[3rem] ${cs[i % 3]} rounded-t-lg transition-all shadow-sm`} style={{ height: hs[i % 3] }} />
                        <span className="text-xs font-bold text-gray-500 mt-1">{crop.name}</span>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {/* 작업 일정 */}
          <div className="bg-white rounded-[24px] shadow-sm p-6 col-span-12 lg:col-span-7">
            <div className="flex justify-between items-center mb-6">
              <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block">작업 일정</span>
              <div className="flex bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setScheduleTab('today')}
                  className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${
                    scheduleTab === 'today'
                      ? 'bg-white shadow-sm text-gray-800'
                      : 'text-gray-400 hover:text-gray-600'
                  }`}
                >
                  오늘
                </button>
                <button
                  onClick={() => setScheduleTab('week')}
                  className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${
                    scheduleTab === 'week'
                      ? 'bg-white shadow-sm text-gray-800'
                      : 'text-gray-400 hover:text-gray-600'
                  }`}
                >
                  주간
                </button>
              </div>
            </div>

            {scheduleTab === 'today' ? (
              <div className="space-y-4">
                {taskGroups.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-6">오늘 배정된 작업 없음</p>
                ) : (
                  taskGroups.map((g, i) => {
                    const allDone  = g.completed === g.total;
                    const isActive = g.inProgress > 0;
                    const pct = g.total > 0 ? Math.round((g.completed / g.total) * 100) : 0;
                    const c = allDone
                      ? { border: 'border-purple-400', timeBg: 'bg-purple-100', timeText: 'text-purple-600', badgeBg: 'bg-purple-50',  badgeText: 'text-purple-600', bar: 'bg-purple-400', label: '완료' }
                      : isActive
                        ? { border: 'border-teal-400',   timeBg: 'bg-teal-100',   timeText: 'text-teal-600',   badgeBg: 'bg-teal-50',    badgeText: 'text-teal-600',   bar: 'bg-teal-400',   label: '진행중' }
                        : { border: 'border-yellow-400', timeBg: 'bg-yellow-100', timeText: 'text-yellow-600', badgeBg: 'bg-gray-100',   badgeText: 'text-gray-400',   bar: 'bg-yellow-400', label: '대기' };
                    return (
                      <div key={i} className={`flex items-start gap-4 p-3 hover:bg-gray-50 rounded-xl transition border-l-4 ${c.border}`}>
                        <span className={`${c.timeBg} ${c.timeText} px-3 py-1 rounded-lg text-xs font-bold w-20 text-center shrink-0`}>—</span>
                        <div className="flex-1 w-full">
                          <div className="flex justify-between items-center mb-1">
                            <h4 className="text-gray-800 font-bold text-sm">
                              {cropMap[g.cropId]?.name || '—'} {g.taskType}
                            </h4>
                            <span className={`text-[10px] font-bold ${c.badgeText} ${c.badgeBg} px-2 py-0.5 rounded`}>
                              {pct}% {c.label}
                            </span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-1.5 mb-2">
                            <div className={`${c.bar} h-1.5 rounded-full`} style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            ) : (
              <div className="grid grid-cols-7 gap-1 md:gap-2">
                {weekDays.map((day) => {
                  const isToday   = day.dateStr === todayStr;
                  const dayTypes  = [...new Set(
                    tasks
                      .filter((t) => t.date === day.dateStr && workerIds.has(t.workerId))
                      .map((t) => t.taskType)
                      .filter(Boolean)
                  )].slice(0, 2);
                  return (
                    <div
                      key={day.dateStr}
                      className={`flex flex-col gap-1.5 ${
                        isToday
                          ? 'bg-indigo-50/50 rounded-lg p-1 border border-indigo-100 -mx-1 -mt-1 shadow-sm relative'
                          : ''
                      }`}
                    >
                      {isToday && (
                        <div className="absolute -top-2 left-1/2 -translate-x-1/2 bg-[#6366F1] text-white text-[8px] font-bold px-1.5 rounded-full">오늘</div>
                      )}
                      <div className={`text-center pb-2 ${isToday ? 'pt-1 border-b border-indigo-200' : 'border-b border-gray-100'}`}>
                        <p className={`text-[10px] font-bold ${isToday ? 'text-[#6366F1]' : 'text-gray-400'}`}>{day.label}</p>
                      </div>
                      {dayTypes.length === 0 ? (
                        <div className="bg-gray-50 text-gray-400 rounded px-1.5 py-1 text-[10px] text-center border border-gray-100">없음</div>
                      ) : (
                        dayTypes.map((type, ti) => (
                          <div
                            key={ti}
                            className={`rounded px-1.5 py-1 text-[10px] font-bold text-center ${
                              isToday
                                ? 'bg-teal-100 text-teal-600'
                                : 'bg-teal-50 text-teal-600 border border-teal-100'
                            }`}
                          >
                            {type}
                          </div>
                        ))
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* 승인 대기 */}
          <div className="bg-white rounded-[24px] shadow-sm p-6 col-span-12 lg:col-span-6">
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block">승인 대기</span>
                {pendingLeaves.length > 0 && (
                  <span className="bg-red-100 text-red-500 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold">
                    {pendingLeaves.length}
                  </span>
                )}
              </div>
            </div>
            <div className="space-y-4">
              {pendingLeaves.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-4">대기 중인 신청 없음</p>
              ) : (
                pendingLeaves.slice(0, 2).map((req, idx) => {
                  const emp    = empMap[req.employeeId];
                  const initial = emp?.name?.[0] || '?';
                  const avatarCls = ['bg-indigo-100 text-indigo-500', 'bg-yellow-100 text-yellow-600', 'bg-pink-100 text-pink-600'];
                  return (
                    <div
                      key={req.id}
                      className={`flex items-center justify-between ${
                        idx < Math.min(pendingLeaves.length, 2) - 1 ? 'border-b border-gray-100 pb-4' : ''
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-full ${avatarCls[idx % avatarCls.length]} font-bold flex items-center justify-center`}>
                          {initial}
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-gray-800">{emp?.name || '—'}</h4>
                          <p className="text-xs text-gray-400">{req.leaveType} ({req.date})</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => farmReview(req.id, 'rejected')}
                          className="px-3 py-1.5 border border-gray-200 text-gray-500 rounded-lg text-xs font-bold hover:bg-gray-50 transition"
                        >
                          반려
                        </button>
                        <button
                          onClick={() => farmReview(req.id, 'approved')}
                          className="px-3 py-1.5 bg-teal-50 text-teal-600 rounded-lg text-xs font-bold hover:bg-teal-100 transition"
                        >
                          승인
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
              {pendingLeaves.length > 2 && (
                <Link to="/admin/leave-approval" className="block text-center text-xs text-indigo-600 hover:underline pt-1">
                  {pendingLeaves.length - 2}건 더보기
                </Link>
              )}
            </div>
          </div>

          {/* 공지사항 */}
          <div className="bg-white rounded-[24px] shadow-sm p-6 col-span-12 lg:col-span-6">
            <div className="flex justify-between items-center mb-6">
              <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block">공지사항</span>
            </div>
            <ul className="space-y-4">
              {recentNotices.length === 0 ? (
                <li className="text-sm text-gray-400 text-center py-4">등록된 공지 없음</li>
              ) : (
                recentNotices.slice(0, 3).map((n) => (
                  <li key={n.id} className="flex gap-4 items-start">
                    <span className="text-xs font-bold text-gray-400 pt-1 shrink-0">
                      {n.createdAt?.substring(5, 10)?.replace('-', '-')}
                    </span>
                    <div>
                      {n.priority === 'high' && (
                        <span className="bg-red-50 text-red-500 px-2 py-0.5 rounded text-[10px] font-bold mr-1">중요</span>
                      )}
                      <Link
                        to="/admin/notices"
                        className="text-sm text-gray-800 font-medium hover:text-[#6366F1] transition"
                      >
                        {n.title}
                      </Link>
                    </div>
                  </li>
                ))
              )}
            </ul>
          </div>
        </div>
      </section>
    );
  }

  // ─────────────────────────────────────────────────────────────────
  // 관리팀 대시보드 (hr_admin / master)
  // ─────────────────────────────────────────────────────────────────
  return (
    <>
      <section className="p-8 lg:p-12 border-b border-gray-200 bg-white/50">
        <header className="flex justify-between items-end mb-8">
          <div>
            <p className="text-sm font-bold text-teal-600 mb-1 uppercase tracking-widest">관리팀 대시보드</p>
            <h1 className="text-3xl font-bold text-gray-800">
              {todayDateStr} <span className="text-xl font-normal text-gray-400">{todayWeekdayStr}</span>
            </h1>
          </div>
          <Link
            to="/admin/notices"
            className="bg-[#6366F1] hover:bg-indigo-600 text-white px-6 py-2.5 rounded-full text-sm font-medium shadow-lg shadow-indigo-200 transition"
          >
            + 공지 등록
          </Link>
        </header>

        <div className="grid grid-cols-12 gap-6">
          {/* 1. 지점별 오늘 출근 현황 */}
          <div className="col-span-12 grid grid-cols-1 md:grid-cols-3 gap-6">
            {branches.length === 0 ? (
              <div className="md:col-span-3 bg-white rounded-[24px] shadow-sm p-6 text-center text-gray-400 text-sm">
                지점 데이터 없음
              </div>
            ) : (
              branches.map((branch, idx) => {
                const ac = BRANCH_ACCENT[idx % BRANCH_ACCENT.length];
                return (
                  <div
                    key={branch.id}
                    className="bg-white rounded-[24px] shadow-sm p-6 flex flex-col justify-between border border-gray-200 cursor-pointer hover:border-[#6366F1] hover:shadow-md transition-all group"
                    onClick={() => setAttendanceModalBranch(branch)}
                  >
                    <div className="flex justify-between items-center mb-2">
                      <h3 className="text-sm font-bold text-gray-500 group-hover:text-[#6366F1] transition-colors">{branch.name}</h3>
                      <div className={`w-8 h-8 rounded-full ${ac.iconBg} flex items-center justify-center ${ac.iconText}`}>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                      </div>
                    </div>
                    <div className="flex items-end justify-between mt-4">
                      <span className="text-3xl font-bold text-gray-800">—<span className="text-lg text-gray-400 font-medium">/—명</span></span>
                      <span className={`${ac.pctBg} ${ac.pctText} px-2 py-1 rounded text-xs font-bold`}>—%</span>
                    </div>
                    <p className="text-[10px] text-gray-400 mt-2">데이터 연동 예정</p>
                  </div>
                );
              })
            )}
          </div>

          {/* 2. 지점별 이번 주 수확량 */}
          <div className="col-span-12 lg:col-span-6 relative bg-white rounded-[24px] shadow-sm p-6">
            <div className="flex justify-between items-start mb-6">
              <div>
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1 block">지점별 이번 주 수확량</span>
                <div className="flex items-end gap-3 mt-2">
                  <h2 className="text-4xl font-bold text-gray-800">— <span className="text-xl font-medium text-gray-500">kg</span></h2>
                  <span className="bg-teal-50 text-teal-500 px-2 py-1 rounded-md text-xs font-bold mb-1">—%</span>
                </div>
              </div>
            </div>
            <div className="flex items-end gap-6 h-48 mt-8 px-4 border-b border-gray-200 pb-2">
              {branches.length === 0 ? (
                <div className="flex-1 flex items-center justify-center text-gray-300 text-sm">데이터 연동 예정</div>
              ) : (
                branches.map((branch, idx) => {
                  const ac = BRANCH_ACCENT[idx % BRANCH_ACCENT.length];
                  const hs = ['35%', '55%', '70%'];
                  return (
                    <div key={branch.id} className="flex-1 flex flex-col items-center gap-2 group h-full justify-end cursor-pointer hover:-translate-y-1.5 transition-transform">
                      <span className={`text-sm font-bold ${ac.pctText} mb-1`}>—</span>
                      <div className={`w-full max-w-[3rem] ${ac.bar} rounded-t-lg shadow-sm`} style={{ height: hs[idx % 3] }} />
                      <span className="text-xs font-bold text-gray-500 mt-1">{branch.name}</span>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* 3. 최근 이슈 피드 */}
          <div className="bg-white rounded-[24px] shadow-sm p-6 col-span-12 lg:col-span-6">
            <div className="flex justify-between items-center mb-6">
              <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block">최근 이슈 피드</span>
            </div>
            {unresolvedIssues.length === 0 ? (
              <div className="text-center py-8 text-gray-400 text-sm">미해결 이슈 없음</div>
            ) : (
              <div className="space-y-4">
                {unresolvedIssues.slice(0, 3).map((issue) => {
                  const s = issueStyle(issue.type);
                  const branchName = branches.find((b) => b.id === empMap[issue.workerId]?.branchId)?.name || '—';
                  return (
                    <div key={issue.id} className={`flex items-start gap-4 p-4 ${s.wrap}`}>
                      <span className={`w-2.5 h-2.5 rounded-full ${s.dot} shrink-0 mt-1.5`} />
                      <div>
                        <p className="text-sm font-bold text-gray-800">
                          {branchName}{' '}
                          <span className="text-xs font-normal text-gray-500 ml-2">{relativeTime(issue.createdAt)}</span>
                        </p>
                        <p className="text-sm text-gray-600 mt-1">{issue.comment || `[${issue.type}] 이상 신고 접수`}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* 4. 지점별 TBM 완료율 */}
          <div className="bg-white rounded-[24px] shadow-sm p-6 col-span-12 lg:col-span-4">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4 block">지점별 TBM 완료율</span>
            {branches.length === 0 ? (
              <p className="text-sm text-gray-300 text-center py-4">데이터 연동 예정</p>
            ) : (
              <div className="space-y-5 mt-4">
                {branches.map((branch, idx) => {
                  const ac = BRANCH_ACCENT[idx % BRANCH_ACCENT.length];
                  return (
                    <div key={branch.id}>
                      <div className="flex justify-between text-xs font-bold mb-1">
                        <span className="text-gray-600">{branch.name}</span>
                        <span className={ac.pctText}>—%</span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-2">
                        <div className={`${ac.bar} h-2 rounded-full w-0`} />
                      </div>
                    </div>
                  );
                })}
                <p className="text-xs text-gray-300 text-center pt-1">데이터 연동 예정</p>
              </div>
            )}
          </div>

          {/* 5. 성과 상위 명단 */}
          <div className="bg-white rounded-[24px] shadow-sm p-6 col-span-12 lg:col-span-4">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4 block">작업자 성과 상위 명단</span>
            <div className="flex items-center justify-center h-[120px] text-gray-300 text-sm mt-4">
              데이터 연동 예정
            </div>
          </div>

          {/* 6. 공지사항 관리 */}
          <div className="bg-white rounded-[24px] shadow-sm p-6 col-span-12 lg:col-span-4">
            <div className="flex justify-between items-center mb-4">
              <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block">공지사항 관리</span>
              <Link to="/admin/notices" className="text-xs font-bold text-[#6366F1] hover:underline">+ 새 공지</Link>
            </div>
            <ul className="space-y-3 mt-4">
              {recentNotices.length === 0 ? (
                <li className="text-sm text-gray-400 text-center py-2">등록된 공지 없음</li>
              ) : (
                recentNotices.slice(0, 3).map((n) => (
                  <li key={n.id} className="flex items-center gap-3 bg-gray-50 p-2.5 rounded-xl border border-gray-100">
                    <span className="bg-teal-100 text-teal-600 px-2 py-0.5 rounded text-[10px] font-bold">활성</span>
                    <div className="flex-1 truncate">
                      <p className="text-xs text-gray-800 font-medium truncate">{n.title}</p>
                    </div>
                  </li>
                ))
              )}
            </ul>
          </div>
        </div>
      </section>

      {/* 출근 현황 상세 모달 */}
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
                className="text-gray-400 hover:text-gray-600 bg-white rounded-full p-1 shadow-sm"
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
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <span className="w-2 h-2 rounded-full bg-red-500" />
                  <h4 className="text-sm font-bold text-gray-800">미출근자 <span className="text-red-500 text-xs ml-1">—명</span></h4>
                </div>
                <div className="bg-red-50 border border-red-100 rounded-xl p-3 flex flex-wrap gap-2">
                  <span className="text-xs text-red-400">데이터 연동 예정</span>
                </div>
              </div>
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <span className="w-2 h-2 rounded-full bg-yellow-400" />
                  <h4 className="text-sm font-bold text-gray-800">근태 신청자 <span className="text-yellow-600 text-xs ml-1">—명</span></h4>
                </div>
                <ul className="space-y-2 border border-gray-100 rounded-xl p-3 bg-white">
                  <li className="text-xs text-gray-400">데이터 연동 예정</li>
                </ul>
              </div>
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <span className="w-2 h-2 rounded-full bg-teal-400" />
                  <h4 className="text-sm font-bold text-gray-800">출근자 명단 <span className="text-teal-600 text-xs ml-1">—명</span></h4>
                </div>
                <div className="border border-gray-100 rounded-xl p-3 bg-white flex flex-wrap gap-2">
                  <span className="text-xs text-gray-400">데이터 연동 예정</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
