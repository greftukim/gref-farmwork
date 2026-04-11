import { useState, useMemo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import * as XLSX from 'xlsx';
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
import Button from '../../components/common/Button';
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
  const notices = useNoticeStore((s) => s.notices);
  const crops = useCropStore((s) => s.crops);
  const branches = useBranchStore((s) => s.branches);
  const selectedBranch = useBranchStore((s) => s.selectedBranch);

  const [missedDays, setMissedDays] = useState(7);
  const [tbmStats, setTbmStats] = useState({ approved: 0, submitted: 0 });
  const [exportRange, setExportRange] = useState(() => {
    const end = new Date().toISOString().split('T')[0];
    const start = new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    return { start, end };
  });
  const [exporting, setExporting] = useState(false);
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

  // ─── Excel 내보내기 ───
  const handleExport = async () => {
    setExporting(true);
    try {
      // 교훈 12 적용: FK 제약명 명시로 Postgrest 모호성 회피
      const { data, error } = await supabase
        .from('safety_checks')
        .select(`
          id, date, risks_confirmed_at, approved_at, shown_risks,
          worker:employees!safety_checks_worker_id_fkey(name, branch),
          approver:employees!safety_checks_approved_by_fkey(name)
        `)
        .eq('check_type', 'pre_task')
        .gte('date', exportRange.start)
        .lte('date', exportRange.end)
        .order('date', { ascending: true })
        .order('risks_confirmed_at', { ascending: true });

      if (error || !data) return;

      // JS 레벨 지점 필터 (nested filter 미사용 — POSTGREST-001 교훈)
      const rows = currentBranchCode ? data.filter((r) => r.worker?.branch === currentBranchCode) : data;
      const branchCodeToName = Object.fromEntries(branches.map((b) => [b.code, b.name]));

      // UTC → KST HH:mm 변환
      const toKstHHmm = (iso) => {
        if (!iso) return '—';
        const kst = new Date(new Date(iso).getTime() + 9 * 60 * 60 * 1000);
        return kst.toISOString().slice(11, 16);
      };

      // shown_risks JSONB → 쉼표 구분 텍스트
      const formatRisks = (risks) => {
        if (!risks || !Array.isArray(risks) || risks.length === 0) return '—';
        return risks.map((r) => r.name || r.title || r.category || '항목').join(', ');
      };

      const header = ['일자', '농장', '작업자명', '위험요소', '동의시각(HH:mm)', '최종승인자', '승인시각(HH:mm)', 'TBM ID'];
      const sheetRows = rows.map((r) => [
        r.date,
        branchCodeToName[r.worker?.branch] || r.worker?.branch || '—',
        r.worker?.name || '—',
        formatRisks(r.shown_risks),
        toKstHHmm(r.risks_confirmed_at),
        r.approver?.name || '—',
        toKstHHmm(r.approved_at),
        r.id,
      ]);

      const ws = XLSX.utils.aoa_to_sheet([header, ...sheetRows]);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'TBM기록');
      XLSX.writeFile(wb, `TBM기록_${currentBranchName}_${exportRange.start}_${exportRange.end}.xlsx`);
    } finally {
      setExporting(false);
    }
  };

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

      {/* TBM 기록 내보내기 */}
      <Card accent="gray" className="p-6 mt-4">
        <div className="text-sm font-medium text-gray-500 mb-4">TBM 기록 내보내기</div>
        <div className="flex flex-col sm:flex-row gap-3 mb-3">
          <div className="flex-1">
            <label className="block text-xs text-gray-400 mb-1">시작일</label>
            <input
              type="date"
              value={exportRange.start}
              onChange={(e) => setExportRange((r) => ({ ...r, start: e.target.value }))}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm min-h-[44px]"
            />
          </div>
          <div className="flex-1">
            <label className="block text-xs text-gray-400 mb-1">종료일</label>
            <input
              type="date"
              value={exportRange.end}
              onChange={(e) => setExportRange((r) => ({ ...r, end: e.target.value }))}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm min-h-[44px]"
            />
          </div>
        </div>
        <p className="text-xs text-gray-400 mb-3">
          농장: {currentBranchName} · 산안법 TBM 실시 기록 (pre_task, 행 단위 원본)
        </p>
        <Button onClick={handleExport} disabled={exporting} className="w-full active:scale-[0.98]">
          {exporting ? '생성 중...' : 'TBM 기록 내보내기 (.xlsx)'}
        </Button>
      </Card>

    </div>
  );
}
