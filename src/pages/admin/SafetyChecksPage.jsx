import { useEffect, useMemo, useState } from 'react';
import useSafetyCheckStore from '../../stores/safetyCheckStore';
import useEmployeeStore from '../../stores/employeeStore';
import useAttendanceStore from '../../stores/attendanceStore';
import Card from '../../components/common/Card';

const BRANCH_LABEL = { busan: '부산LAB', hadong: '하동', jinju: '진주' };
const ATT_LABEL = { normal: '정상', late: '지각', working: '출근 중' };

function formatTime(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

// 모바일용 TBM 상태 표시 (라벨 + 시각)
function TbmBadge({ check, label }) {
  const isApproved = check?.status === 'approved';
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-gray-500 text-xs">{label}:</span>
      {check ? (
        <span className={`text-xs font-medium ${isApproved ? 'text-emerald-600' : 'text-amber-600'}`}>
          {isApproved ? '승인됨' : '대기'} {formatTime(check.completedAt)}
        </span>
      ) : (
        <span className="text-gray-400 text-xs">미완료</span>
      )}
    </div>
  );
}

// 데스크탑용 TBM 상태 셀
function TbmCell({ check }) {
  if (!check) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-400">
        미완료
      </span>
    );
  }
  const isApproved = check.status === 'approved';
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
      isApproved ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
    }`}>
      {isApproved ? '승인됨' : '대기'} {formatTime(check.completedAt)}
    </span>
  );
}

// 근태 뱃지
function AttBadge({ attRec }) {
  if (!attRec) {
    return (
      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-400">
        미출근
      </span>
    );
  }
  const cls =
    attRec.status === 'late' ? 'bg-amber-100 text-amber-700' :
    attRec.status === 'working' ? 'bg-blue-100 text-blue-700' :
    'bg-green-100 text-green-700';
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${cls}`}>
      {ATT_LABEL[attRec.status] || attRec.status}
    </span>
  );
}

export default function SafetyChecksPage() {
  const employees = useEmployeeStore((s) => s.employees);
  const fetchEmployees = useEmployeeStore((s) => s.fetchEmployees);
  const fetchByDate = useSafetyCheckStore((s) => s.fetchByDate);
  const attendance = useAttendanceStore((s) => s.records);
  const fetchRecords = useAttendanceStore((s) => s.fetchRecords);

  const todayStr = new Date().toISOString().slice(0, 10);
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [checks, setChecks] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => { fetchEmployees(); }, [fetchEmployees]);
  useEffect(() => { fetchRecords(); }, [fetchRecords]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchByDate(selectedDate)
      .then((data) => { if (!cancelled) setChecks(data); })
      .catch((e) => { console.error(e); if (!cancelled) setChecks([]); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [selectedDate, fetchByDate]);

  // selectedDate 기준 출근 여부 맵: employeeId → attendance record
  // 출근 = attendance row 존재 (status: normal/late/working 모두 출근)
  // 미출근 = row 없음 (absent 값은 DB에 존재하지 않음)
  const attendanceMap = useMemo(() => {
    const map = {};
    attendance.filter((a) => a.date === selectedDate).forEach((a) => {
      map[a.employeeId] = a;
    });
    return map;
  }, [attendance, selectedDate]);

  const workers = useMemo(
    () => employees.filter((e) => e.role === 'worker' && e.isActive),
    [employees]
  );

  // 지점별 작업자 그룹
  const byBranch = useMemo(() => {
    const groups = {};
    workers.forEach((w) => {
      const b = w.branch || 'unknown';
      if (!groups[b]) groups[b] = [];
      groups[b].push(w);
    });
    return groups;
  }, [workers]);

  const getCheck = (workerId, checkType) =>
    checks.find((c) => c.workerId === workerId && c.checkType === checkType);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-lg font-bold text-gray-900">TBM 안전점검 현황</h1>
        <input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm min-h-[44px]"
        />
      </div>

      {loading && <p className="text-gray-400 text-sm text-center py-4">로딩 중...</p>}

      {/* 지점별 카드 — 카드 1개 = 지점 1개 */}
      {Object.entries(byBranch).map(([branch, list]) => {
        // 분모 Y: selectedDate에 attendance row가 있는 작업자만
        const presentWorkers = list.filter((w) => attendanceMap[w.id]);
        const Y = presentWorkers.length;

        // 분자 X: 출근자 중 TBM status='approved'인 사람 수
        const preApproved = presentWorkers.filter((w) => getCheck(w.id, 'pre_task')?.status === 'approved').length;
        const postApproved = presentWorkers.filter((w) => getCheck(w.id, 'post_task')?.status === 'approved').length;

        return (
          <Card key={branch} accent="gray" className="overflow-hidden">
            {/* 지점 헤더 */}
            <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <span className="inline-block w-2 h-2 rounded-full bg-emerald-400" />
                <span className="font-semibold text-gray-900">{BRANCH_LABEL[branch] || branch}</span>
              </div>
              <div className="flex gap-4 text-sm items-center">
                <span>
                  작업 전{' '}
                  <span className={`font-bold ${preApproved === Y && Y > 0 ? 'text-emerald-600' : 'text-blue-600'}`}>
                    {preApproved}
                  </span>
                  <span className="text-gray-400">/{Y}</span>
                </span>
                <span>
                  작업 후{' '}
                  <span className={`font-bold ${postApproved === Y && Y > 0 ? 'text-emerald-600' : 'text-gray-500'}`}>
                    {postApproved}
                  </span>
                  <span className="text-gray-400">/{Y}</span>
                </span>
                <span className="text-xs text-gray-400">출근자 기준</span>
              </div>
            </div>

            {/* 모바일 카드 뷰 */}
            <div className="md:hidden divide-y divide-gray-100">
              {list.map((w) => {
                const attRec = attendanceMap[w.id];
                const isPresent = !!attRec;
                return (
                  <div key={w.id} className={`px-4 py-3 ${!isPresent ? 'opacity-50' : ''}`}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-gray-900">{w.name}</span>
                      <AttBadge attRec={attRec} />
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <TbmBadge check={getCheck(w.id, 'pre_task')} label="작업 전" />
                      <TbmBadge check={getCheck(w.id, 'post_task')} label="작업 후" />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* 데스크탑 테이블 뷰 */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 text-left text-gray-500">
                    <th className="px-4 py-2.5 font-medium">이름</th>
                    <th className="px-4 py-2.5 font-medium">근태</th>
                    <th className="px-4 py-2.5 font-medium">작업 전 점검</th>
                    <th className="px-4 py-2.5 font-medium">작업 후 점검</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {list.map((w) => {
                    const attRec = attendanceMap[w.id];
                    const isPresent = !!attRec;
                    return (
                      <tr key={w.id} className={!isPresent ? 'opacity-50' : ''}>
                        <td className="px-4 py-2.5 font-medium text-gray-900">{w.name}</td>
                        <td className="px-4 py-2.5"><AttBadge attRec={attRec} /></td>
                        <td className="px-4 py-2.5"><TbmCell check={getCheck(w.id, 'pre_task')} /></td>
                        <td className="px-4 py-2.5"><TbmCell check={getCheck(w.id, 'post_task')} /></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        );
      })}

      {Object.keys(byBranch).length === 0 && !loading && (
        <p className="text-gray-400 text-sm text-center py-12">표시할 작업자가 없습니다</p>
      )}
    </div>
  );
}
