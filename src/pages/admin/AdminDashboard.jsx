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
import { isFarmAdmin } from '../../lib/permissions';

const today = () => new Date().toISOString().split('T')[0];

function StatCard({ label, value, color, sub }) {
  return (
    <div className="bg-white p-6 rounded-[24px] shadow-sm border border-gray-100 text-center">
      <div className="text-sm text-gray-500 mb-1">{label}</div>
      <div className={`text-3xl font-bold ${color}`}>{value}</div>
      {sub && <div className="text-sm text-gray-400 mt-0.5">{sub}</div>}
    </div>
  );
}

// 더미 수확량 바 차트 (실데이터 미연동 시 placeholder)
function HarvestBarChart({ crops }) {
  const dummyValues = [280, 145, 390, 210, 165];
  const data =
    crops.length > 0
      ? crops.slice(0, 5).map((c, i) => ({ name: c.name, value: dummyValues[i] ?? 100 }))
      : [
          { name: '파프리카', value: 280 },
          { name: '토마토', value: 145 },
          { name: '오이', value: 390 },
          { name: '상추', value: 210 },
          { name: '딸기', value: 165 },
        ];
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <div className="space-y-3">
      {data.map((d) => (
        <div key={d.name} className="flex items-center gap-3">
          <div className="text-xs text-gray-500 w-14 text-right flex-shrink-0">{d.name}</div>
          <div className="flex-1 bg-gray-100 rounded-full h-2.5 overflow-hidden">
            <div
              className="h-full bg-[#6366F1] rounded-full"
              style={{ width: `${(d.value / max) * 100}%` }}
            />
          </div>
          <div className="text-xs text-gray-600 font-medium w-12 flex-shrink-0">{d.value}kg</div>
        </div>
      ))}
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
  const notices = useNoticeStore((s) => s.notices);
  const crops = useCropStore((s) => s.crops);
  const branches = useBranchStore((s) => s.branches);
  const selectedBranch = useBranchStore((s) => s.selectedBranch);

  const [missedDays, setMissedDays] = useState(7);
  const [tbmStats, setTbmStats] = useState({ approved: 0, submitted: 0 });
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
    { name: '진행', value: taskInProgress, color: '#6366F1' },
    { name: '대기', value: taskPending, color: '#D1D5DB' },
  ].filter((d) => d.value > 0);
  if (donutData.length === 0) donutData.push({ name: '없음', value: 1, color: '#E5E7EB' });

  // 출퇴근 누락 카드 (공통 — 재배팀/비재배팀 모두 사용)
  const MissedCheckoutCard = () => (
    <div className="bg-white rounded-[24px] shadow-sm border border-gray-100 p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="text-sm font-semibold text-gray-500 flex items-center gap-2">
          출퇴근 누락
          {missedRecords.length > 0 && (
            <span className="text-xs bg-amber-100 text-amber-600 font-semibold px-2 py-0.5 rounded-full">
              {missedRecords.length}건
            </span>
          )}
        </div>
        <select
          value={missedDays}
          onChange={(e) => setMissedDays(Number(e.target.value))}
          className="border border-gray-200 rounded-xl px-3 py-1.5 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-indigo-200"
        >
          <option value={3}>최근 3일</option>
          <option value={7}>최근 7일</option>
          <option value={14}>최근 14일</option>
          <option value={30}>최근 30일</option>
        </select>
      </div>
      {missedRecords.length === 0 ? (
        <div className="text-center py-4">
          <div className="text-3xl font-bold text-gray-200 mb-1">0</div>
          <div className="text-xs text-gray-400">누락 없음</div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
          {missedRecords.map((r) => (
            <div key={r.id} className="flex items-center justify-between bg-amber-50 rounded-xl px-3 py-2.5">
              <span className="font-medium text-sm text-gray-900">{empMap[r.employeeId]?.name}</span>
              <div className="text-right">
                <div className="text-xs text-gray-400">{r.date}</div>
                <div className="text-xs text-amber-600 font-medium">퇴근 미등록</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div>
      {/* 헤더 */}
      <div className="flex items-baseline gap-3 mb-6 flex-wrap">
        <h2 className="text-2xl font-heading font-bold text-gray-900">대시보드</h2>
        <span className="text-sm text-gray-400">{todayLabel}</span>
        {currentBranchName && (
          <span className="text-xs bg-indigo-50 text-indigo-600 font-medium px-2.5 py-1 rounded-full">
            {currentBranchName}
          </span>
        )}
      </div>

      <div className="grid grid-cols-12 gap-6">

        {/* 1행: 출근 현황 (공통) */}
        <div className="col-span-12 grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="출근" value={checkedIn} color="text-indigo-600" sub="명" />
          <StatCard label="지각" value={lateCount} color="text-amber-500" sub="명" />
          <StatCard label="휴가" value={todayLeaves.length} color="text-emerald-500" sub="명" />
          <StatCard label="미출근" value={notCheckedIn} color="text-gray-400" sub="명" />
        </div>

        {isFarmTeam ? (
          <>
            {/* 재배팀 2행: TBM 상태 + 작업 진행 현황 */}
            <div className="col-span-12 md:col-span-4 bg-white rounded-[24px] shadow-sm border border-gray-100 p-6">
              <div className="text-sm font-semibold text-gray-500 mb-4">TBM 상태</div>
              <div className="flex items-end gap-2 mb-5">
                <span className="text-4xl font-bold text-indigo-600">{tbmStats.approved}</span>
                <span className="text-sm text-gray-400 mb-1">
                  / {tbmStats.approved + tbmStats.submitted}건 승인
                </span>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-indigo-50 rounded-2xl p-3 text-center">
                  <div className="text-xs text-gray-500 mb-1">승인</div>
                  <div className="text-2xl font-bold text-indigo-600">{tbmStats.approved}</div>
                </div>
                <div className="bg-red-50 rounded-2xl p-3 text-center">
                  <div className="text-xs text-gray-500 mb-1">미승인</div>
                  <div className={`text-2xl font-bold ${tbmStats.submitted > 0 ? 'text-red-500' : 'text-gray-300'}`}>
                    {tbmStats.submitted}
                  </div>
                </div>
                <div className="bg-gray-50 rounded-2xl p-3 text-center">
                  <div className="text-xs text-gray-500 mb-1">작업자</div>
                  <div className="text-2xl font-bold text-gray-700">{workers.length}</div>
                </div>
              </div>
            </div>

            <div className="col-span-12 md:col-span-8 bg-white rounded-[24px] shadow-sm border border-gray-100 p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="text-sm font-semibold text-gray-500">작업 진행 현황</div>
                <span className="text-xs text-gray-400">총 {taskTotal}건</span>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-[100px] h-[100px] flex-shrink-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={donutData} cx="50%" cy="50%" innerRadius={28} outerRadius={46} dataKey="value" strokeWidth={0}>
                        {donutData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap gap-4 text-xs text-gray-500 mb-3">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 flex-shrink-0" />완료 {taskCompleted}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#6366F1] flex-shrink-0" />진행 {taskInProgress}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-gray-300 flex-shrink-0" />대기 {taskPending}
                    </span>
                  </div>
                  <div className="space-y-1.5 max-h-[120px] overflow-y-auto pr-1">
                    {taskGroups.length === 0 ? (
                      <p className="text-xs text-gray-400">오늘 배정된 작업 없음</p>
                    ) : (
                      taskGroups.map((g, i) => {
                        const allDone = g.completed === g.total;
                        const isActive = g.inProgress > 0;
                        return (
                          <div
                            key={i}
                            className={`flex items-center justify-between text-xs rounded-xl px-3 py-2 ${
                              allDone ? 'bg-emerald-50 text-emerald-700' : isActive ? 'bg-indigo-50 text-indigo-700' : 'bg-gray-50 text-gray-600'
                            }`}
                          >
                            <span className="font-medium truncate mr-2">
                              {cropMap[g.cropId]?.name || '—'} {g.taskType}
                            </span>
                            <span className="flex-shrink-0">
                              {allDone ? '완료' : isActive ? '진행중' : '대기'} ({g.completed}/{g.total})
                            </span>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* 재배팀 3행: 이번 주 수확량 + 오늘 작업 일정 */}
            <div className="col-span-12 md:col-span-7 bg-white rounded-[24px] shadow-sm border border-gray-100 p-6">
              <div className="flex items-center justify-between mb-5">
                <div className="text-sm font-semibold text-gray-500">이번 주 수확량</div>
                <span className="text-xs text-gray-400 bg-gray-100 px-2.5 py-1 rounded-full">더미 데이터</span>
              </div>
              <HarvestBarChart crops={crops} />
            </div>

            <div className="col-span-12 md:col-span-5 bg-white rounded-[24px] shadow-sm border border-gray-100 p-6">
              <div className="text-sm font-semibold text-gray-500 mb-4">오늘 작업 일정</div>
              <div className="space-y-2 max-h-[200px] overflow-y-auto">
                {taskGroups.length === 0 ? (
                  <p className="text-xs text-gray-400 text-center py-8">배정된 작업 없음</p>
                ) : (
                  taskGroups.map((g, i) => {
                    const allDone = g.completed === g.total;
                    const isActive = g.inProgress > 0;
                    const dotColor = allDone ? 'bg-emerald-500' : isActive ? 'bg-[#6366F1]' : 'bg-gray-300';
                    return (
                      <div key={i} className="flex items-start gap-3 pb-2 border-b border-gray-50 last:border-0">
                        <span className={`mt-1.5 flex-shrink-0 block w-2.5 h-2.5 rounded-full ${dotColor}`} />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-gray-900">
                            {cropMap[g.cropId]?.name || '미지정'} — {g.taskType || '기타'}
                          </div>
                          <div className="text-xs text-gray-400 mt-0.5">
                            {g.completed}/{g.total}건 {allDone ? '완료' : isActive ? '진행중' : '대기'}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* 재배팀 4행: 출퇴근 누락 */}
            <div className="col-span-12">
              <MissedCheckoutCard />
            </div>
          </>
        ) : (
          <>
            {/* 비재배팀 2행: TBM + 인력 지표 */}
            <div className="col-span-12 grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard label="오늘 TBM 승인" value={tbmStats.approved} color="text-indigo-600" sub="건" />
              <StatCard
                label="오늘 TBM 미승인"
                value={tbmStats.submitted}
                color={tbmStats.submitted > 0 ? 'text-red-500' : 'text-gray-400'}
                sub="건"
              />
              <StatCard label="활성 작업자" value={workers.length} color="text-indigo-600" sub="명" />
              <StatCard label="활성 반장" value={teamLeaderCount} color="text-emerald-600" sub="명" />
            </div>

            {/* 비재배팀: 출퇴근 누락 */}
            <div className="col-span-12">
              <MissedCheckoutCard />
            </div>
          </>
        )}

        {/* 하단 공통: 승인 대기 + 공지사항 */}
        <div className="col-span-12 md:col-span-6">
          <Link to="/admin/leave-approval" className="block h-full">
            <div
              className={`h-full bg-white rounded-[24px] shadow-sm border p-6 active:scale-[0.98] transition-transform cursor-pointer ${
                alertCount > 0 ? 'border-red-200' : 'border-gray-100'
              }`}
            >
              <div className="text-sm font-semibold text-gray-500 mb-3">승인 대기</div>
              <div className="flex items-end gap-1 mb-3">
                <span className="text-4xl font-bold text-gray-900">{alertCount}</span>
                <span className="text-sm text-gray-400 mb-1">건</span>
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
            </div>
          </Link>
        </div>

        <div className="col-span-12 md:col-span-6 bg-white rounded-[24px] shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-3">
            <div className="text-sm font-semibold text-gray-500">공지사항</div>
            <Link to="/admin/notices" className="text-xs text-indigo-600 hover:underline">더보기</Link>
          </div>
          {recentNotices.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-6">등록된 공지 없음</p>
          ) : (
            <div className="space-y-3">
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
