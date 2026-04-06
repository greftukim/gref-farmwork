import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import useEmployeeStore from '../../stores/employeeStore';
import useAttendanceStore from '../../stores/attendanceStore';
import useTaskStore from '../../stores/taskStore';
import useIssueStore from '../../stores/issueStore';
import useCallStore from '../../stores/callStore';
import useCropStore from '../../stores/cropStore';
import useZoneStore from '../../stores/zoneStore';
import Card from '../../components/common/Card';

const WEEK_DAYS = ['일', '월', '화', '수', '목', '금', '토'];

function formatToday() {
  const d = new Date();
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일 (${WEEK_DAYS[d.getDay()]})`;
}

export default function AdminDashboard() {
  const employees = useEmployeeStore((s) => s.employees);
  const attendance = useAttendanceStore((s) => s.records);
  const tasks = useTaskStore((s) => s.tasks);
  const issues = useIssueStore((s) => s.issues);
  const calls = useCallStore((s) => s.calls);
  const crops = useCropStore((s) => s.crops);
  const zones = useZoneStore((s) => s.zones);

  const today = new Date().toISOString().split('T')[0];
  const todayLabel = useMemo(() => formatToday(), []);

  const workers = useMemo(() => employees.filter((e) => e.role === 'worker' && e.isActive), [employees]);
  const empMap = useMemo(() => Object.fromEntries(employees.map((e) => [e.id, e])), [employees]);
  const cropMap = useMemo(() => Object.fromEntries(crops.map((c) => [c.id, c])), [crops]);
  const zoneMap = useMemo(() => Object.fromEntries(zones.map((z) => [z.id, z])), [zones]);

  const todayAttendance = useMemo(() => attendance.filter((a) => a.date === today), [attendance, today]);
  const checkedInCount = todayAttendance.length;
  const workingCount = todayAttendance.filter((a) => !a.checkOut).length;

  const todayTasks = useMemo(() => tasks.filter((t) => t.date === today), [tasks, today]);
  const taskTotal = todayTasks.length;
  const taskCompleted = todayTasks.filter((t) => t.status === 'completed').length;
  const taskInProgress = todayTasks.filter((t) => t.status === 'in_progress').length;
  const taskPct = taskTotal > 0 ? Math.round((taskCompleted / taskTotal) * 100) : 0;

  // 작업 그룹: 같은 작물+작업유형+구역+열범위를 하나의 작업으로 묶어 표시
  const taskGroups = useMemo(() => {
    if (todayTasks.length === 0) return [];
    const map = {};
    todayTasks.forEach((t) => {
      const key = `${t.cropId || ''}_${t.taskType || ''}_${t.zoneId || ''}_${t.rowRange || ''}`;
      if (!map[key]) {
        map[key] = { cropId: t.cropId, taskType: t.taskType, zoneId: t.zoneId, rowRange: t.rowRange, workers: [] };
      }
      map[key].workers.push(t);
    });
    return Object.values(map);
  }, [todayTasks]);

  const unresolvedIssues = useMemo(() => issues.filter((i) => !i.isResolved), [issues]);
  const unconfirmedCalls = useMemo(() => calls.filter((c) => !c.isConfirmed), [calls]);
  const alertCount = unresolvedIssues.length + unconfirmedCalls.length;

  const recentIssues = useMemo(
    () => [...issues].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 3),
    [issues]
  );

  return (
    <div>
      <div className="flex flex-wrap items-baseline gap-3 mb-6">
        <h2 className="text-xl font-heading font-semibold text-gray-900">대시보드</h2>
        <span className="text-sm text-gray-400">{todayLabel}</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {/* 출근 현황 */}
        <Card accent="emerald" className="p-5">
          <div className="text-sm text-gray-500 mb-1">출근 현황</div>
          <div className="flex items-end gap-1">
            <span className="text-3xl font-bold text-gray-900">{checkedInCount}</span>
            <span className="text-sm text-gray-400 mb-1">/ {workers.length}명</span>
          </div>
          <div className="text-xs text-emerald-600 mt-1">{workingCount}명 근무 중</div>
        </Card>

        {/* 작업 진행 - 상세 내용 포함 */}
        <Card accent="blue" className="p-5 md:col-span-1">
          <div className="text-sm text-gray-500 mb-1">작업 진행</div>
          <div className="flex items-end gap-1">
            <span className="text-3xl font-bold text-gray-900">{taskCompleted}</span>
            <span className="text-sm text-gray-400 mb-1">/ {taskTotal}건 완료</span>
          </div>
          <div className="mt-2 h-2 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${taskPct}%` }} />
          </div>
          <div className="text-xs text-blue-600 mt-1 mb-3">{taskInProgress}건 진행 중</div>

          {taskGroups.length > 0 && (
            <div className="space-y-1.5 max-h-40 overflow-y-auto">
              {taskGroups.map((g, i) => {
                const completed = g.workers.filter((w) => w.status === 'completed').length;
                const inProgress = g.workers.filter((w) => w.status === 'in_progress').length;
                const total = g.workers.length;
                const allDone = completed === total;
                const anyProgress = inProgress > 0;
                const cropName = cropMap[g.cropId]?.name || '';
                const zoneName = zoneMap[g.zoneId]?.name || '';
                const locationPart = [zoneName, g.rowRange].filter(Boolean).join(' ');
                const label = [cropName, g.taskType].filter(Boolean).join(' ');
                return (
                  <div key={i} className="flex items-start justify-between text-xs gap-2">
                    <span className="text-gray-700 leading-tight flex-1 min-w-0 truncate">
                      {label || '(작업명 없음)'}
                      {locationPart && <span className="text-gray-400 ml-1">({locationPart})</span>}
                    </span>
                    <span className={`shrink-0 px-1.5 py-0.5 rounded-full font-medium whitespace-nowrap ${
                      allDone ? 'bg-green-100 text-green-700' :
                      anyProgress ? 'bg-blue-100 text-blue-700' :
                      'bg-amber-100 text-amber-700'
                    }`}>
                      {allDone ? '완료' : anyProgress ? '진행중' : '대기'} ({completed}/{total}명)
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        {/* 처리 필요 (이상신고 + 긴급호출만, 휴가 현황 제외) */}
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
              {alertCount === 0 && <span className="text-gray-400">처리할 항목 없음</span>}
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
                  <div className="min-w-0 flex-1">
                    <span className="font-medium text-gray-900 truncate block">
                      {[cropMap[t.cropId]?.name, t.taskType].filter(Boolean).join(' ') || t.title}
                    </span>
                    <span className="text-xs text-gray-400">
                      {empMap[t.workerId]?.name}
                      {zoneMap[t.zoneId]?.name && <> · {zoneMap[t.zoneId].name}{t.rowRange && ` ${t.rowRange}`}</>}
                    </span>
                  </div>
                  <span className={`ml-2 shrink-0 px-2 py-0.5 rounded-full text-xs font-medium ${
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
