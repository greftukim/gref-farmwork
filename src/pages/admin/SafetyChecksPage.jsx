import { useEffect, useMemo, useState } from 'react';
import useSafetyCheckStore from '../../stores/safetyCheckStore';
import useEmployeeStore from '../../stores/employeeStore';
import Card from '../../components/common/Card';

const BRANCH_LABEL = { busan: '부산LAB', hadong: '하동', jinju: '진주' };

function formatTime(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export default function SafetyChecksPage() {
  const employees = useEmployeeStore((s) => s.employees);
  const fetchEmployees = useEmployeeStore((s) => s.fetchEmployees);
  const fetchByDate = useSafetyCheckStore((s) => s.fetchByDate);

  const todayStr = new Date().toISOString().slice(0, 10);
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [checks, setChecks] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchByDate(selectedDate)
      .then((data) => { if (!cancelled) setChecks(data); })
      .catch((e) => { console.error(e); if (!cancelled) setChecks([]); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [selectedDate, fetchByDate]);

  const workers = useMemo(
    () => employees.filter((e) => e.role === 'worker' && e.isActive),
    [employees]
  );

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

  const totalWorkers = workers.length;
  const preCount = checks.filter((c) => c.checkType === 'pre_work').length;
  const postCount = checks.filter((c) => c.checkType === 'post_work').length;

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

      {/* 요약 카드 */}
      <div className="grid grid-cols-2 gap-3">
        <Card accent="blue" className="p-4 text-center">
          <div className="text-xs text-gray-500 mb-1">작업 전 점검</div>
          <div className="text-2xl font-bold text-blue-600">{preCount}<span className="text-sm font-normal text-gray-400">/{totalWorkers}</span></div>
        </Card>
        <Card accent="blue" className="p-4 text-center">
          <div className="text-xs text-gray-500 mb-1">작업 후 점검</div>
          <div className="text-2xl font-bold text-blue-600">{postCount}<span className="text-sm font-normal text-gray-400">/{totalWorkers}</span></div>
        </Card>
      </div>

      {loading && <p className="text-gray-400 text-sm text-center py-4">로딩 중...</p>}

      {Object.entries(byBranch).map(([branch, list]) => (
        <div key={branch}>
          <h3 className="text-sm font-semibold text-gray-500 mb-2 flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-blue-400" />
            {BRANCH_LABEL[branch] || branch}
            <span className="text-xs text-gray-400 font-normal">({list.length}명)</span>
          </h3>

          {/* 모바일 카드 뷰 */}
          <div className="md:hidden space-y-2 mb-2">
            {list.map((w) => {
              const pre = getCheck(w.id, 'pre_work');
              const post = getCheck(w.id, 'post_work');
              return (
                <Card key={w.id} accent="gray" className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold text-gray-900">{w.name}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="flex items-center gap-1.5">
                      <span className="text-gray-500">작업 전:</span>
                      {pre ? (
                        <span className="text-green-600 font-medium">{formatTime(pre.completedAt)}</span>
                      ) : (
                        <span className="text-gray-400">미완료</span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-gray-500">작업 후:</span>
                      {post ? (
                        <span className="text-green-600 font-medium">{formatTime(post.completedAt)}</span>
                      ) : (
                        <span className="text-gray-400">미완료</span>
                      )}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>

          {/* 데스크탑 테이블 뷰 */}
          <Card accent="gray" className="hidden md:block overflow-hidden mb-2">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 text-left text-gray-500">
                    <th className="px-4 py-2.5 font-medium">이름</th>
                    <th className="px-4 py-2.5 font-medium">작업 전 점검</th>
                    <th className="px-4 py-2.5 font-medium">작업 후 점검</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {list.map((w) => {
                    const pre = getCheck(w.id, 'pre_work');
                    const post = getCheck(w.id, 'post_work');
                    return (
                      <tr key={w.id}>
                        <td className="px-4 py-2.5 font-medium text-gray-900">{w.name}</td>
                        <td className="px-4 py-2.5">
                          {pre ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                              완료 {formatTime(pre.completedAt)}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-400">
                              미완료
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-2.5">
                          {post ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                              완료 {formatTime(post.completedAt)}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-400">
                              미완료
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      ))}

      {Object.keys(byBranch).length === 0 && !loading && (
        <p className="text-gray-400 text-sm text-center py-12">표시할 작업자가 없습니다</p>
      )}
    </div>
  );
}
