import { useState, useMemo } from 'react';
import useLeaveStore from '../../stores/leaveStore';
import useEmployeeStore from '../../stores/employeeStore';
import useBranchStore from '../../stores/branchStore';

const statusConfig = {
  pending:  { label: '재배팀 승인 대기', badge: 'bg-amber-100 text-amber-700' },
  approved: { label: '승인',             badge: 'bg-emerald-100 text-emerald-700' },
  rejected: { label: '반려',             badge: 'bg-red-100 text-red-700' },
};

export default function LeaveStatusPage() {
  const requests = useLeaveStore((s) => s.requests);
  const employees = useEmployeeStore((s) => s.employees);
  const branches = useBranchStore((s) => s.branches);

  const [filterBranch, setFilterBranch] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterStart, setFilterStart] = useState('');
  const [filterEnd, setFilterEnd] = useState('');
  const [filterName, setFilterName] = useState('');

  const empMap = useMemo(
    () => Object.fromEntries(employees.map((e) => [e.id, e])),
    [employees]
  );
  const branchMap = useMemo(
    () => Object.fromEntries(branches.map((b) => [b.code, b.name])),
    [branches]
  );

  const filtered = useMemo(() => {
    return requests
      .filter((r) => {
        const emp = empMap[r.employeeId];
        if (!emp) return false;
        if (filterBranch !== 'all' && emp.branch !== filterBranch) return false;
        if (filterStatus !== 'all') {
          if (r.status !== filterStatus) return false;
        }
        if (filterStart && r.date < filterStart) return false;
        if (filterEnd && r.date > filterEnd) return false;
        if (filterName && !emp.name.includes(filterName)) return false;
        return true;
      })
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [requests, empMap, filterBranch, filterStatus, filterStart, filterEnd, filterName]);

  const hasFilter = filterBranch !== 'all' || filterStatus !== 'all' || filterStart || filterEnd || filterName;

  return (
    <div>
      <div className="flex items-baseline gap-3 mb-6 flex-wrap">
        <h2 className="text-2xl font-heading font-bold text-gray-900">근태 현황</h2>
        <span className="text-sm text-gray-400">{filtered.length}건</span>
      </div>

      {/* 필터 */}
      <div className="flex flex-wrap gap-2 mb-5">
        <select
          value={filterBranch}
          onChange={(e) => setFilterBranch(e.target.value)}
          className="border border-gray-200 rounded-xl px-3 py-2 text-sm min-h-[40px] bg-white focus:outline-none focus:ring-2 focus:ring-indigo-200"
        >
          <option value="all">전체 지점</option>
          {branches.map((b) => (
            <option key={b.code} value={b.code}>{b.name}</option>
          ))}
        </select>

        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="border border-gray-200 rounded-xl px-3 py-2 text-sm min-h-[40px] bg-white focus:outline-none focus:ring-2 focus:ring-indigo-200"
        >
          <option value="all">전체 상태</option>
          <option value="pending">대기</option>
          <option value="approved">승인</option>
          <option value="rejected">반려</option>
        </select>

        <input
          type="date"
          value={filterStart}
          onChange={(e) => setFilterStart(e.target.value)}
          className="border border-gray-200 rounded-xl px-3 py-2 text-sm min-h-[40px] bg-white focus:outline-none focus:ring-2 focus:ring-indigo-200"
        />
        <input
          type="date"
          value={filterEnd}
          onChange={(e) => setFilterEnd(e.target.value)}
          className="border border-gray-200 rounded-xl px-3 py-2 text-sm min-h-[40px] bg-white focus:outline-none focus:ring-2 focus:ring-indigo-200"
        />
        <input
          type="text"
          value={filterName}
          onChange={(e) => setFilterName(e.target.value)}
          placeholder="작업자 검색"
          className="border border-gray-200 rounded-xl px-3 py-2 text-sm min-h-[40px] bg-white focus:outline-none focus:ring-2 focus:ring-indigo-200 w-32"
        />
        {hasFilter && (
          <button
            onClick={() => { setFilterBranch('all'); setFilterStatus('all'); setFilterStart(''); setFilterEnd(''); setFilterName(''); }}
            className="px-3 py-2 text-sm text-gray-500 border border-gray-200 rounded-xl hover:bg-gray-50 min-h-[40px] transition-colors"
          >
            초기화
          </button>
        )}
      </div>

      {/* 모바일 카드 뷰 */}
      <div className="md:hidden space-y-2.5">
        {filtered.length === 0 && (
          <p className="text-center text-gray-400 py-12">해당 조건의 근태 신청이 없습니다</p>
        )}
        {filtered.map((req) => {
          const emp = empMap[req.employeeId];
          const st = statusConfig[req.status] || statusConfig.pending;
          const reviewer = req.farmReviewedBy ? empMap[req.farmReviewedBy] : null;
          return (
            <div key={req.id} className="bg-white rounded-[24px] shadow-sm border border-gray-100 p-4">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-sm font-bold flex-shrink-0">
                    {emp?.name?.[0] || '?'}
                  </div>
                  <div>
                    <span className="font-semibold text-gray-900">{emp?.name || '—'}</span>
                    <span className="text-xs text-gray-400 ml-2">{branchMap[emp?.branch] || emp?.branch || ''}</span>
                  </div>
                </div>
                <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${st.badge}`}>{st.label}</span>
              </div>
              <div className="text-sm text-gray-500 pl-10.5 mb-0.5">{req.type} · {req.date}</div>
              {req.reason && <div className="text-sm text-gray-400 pl-10.5 mb-0.5 truncate">{req.reason}</div>}
              {reviewer && (
                <div className="text-xs text-gray-400 pl-10.5 mt-1">승인자: {reviewer.name}</div>
              )}
            </div>
          );
        })}
      </div>

      {/* 데스크탑 테이블 뷰 */}
      <div className="hidden md:block bg-white rounded-[24px] shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="px-5 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">지점</th>
                <th className="px-5 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">작업자</th>
                <th className="px-5 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">근태 유형</th>
                <th className="px-5 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">날짜</th>
                <th className="px-5 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">사유</th>
                <th className="px-5 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">신청일</th>
                <th className="px-5 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">승인자</th>
                <th className="px-5 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">상태</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center text-gray-400 py-12">해당 조건의 근태 신청이 없습니다</td>
                </tr>
              ) : (
                filtered.map((req) => {
                  const emp = empMap[req.employeeId];
                  const st = statusConfig[req.status] || statusConfig.pending;
                  const reviewer = req.farmReviewedBy ? empMap[req.farmReviewedBy] : null;
                  return (
                    <tr key={req.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-3.5 text-gray-600">{branchMap[emp?.branch] || emp?.branch || '—'}</td>
                      <td className="px-5 py-3.5 font-medium text-gray-900">{emp?.name || '—'}</td>
                      <td className="px-5 py-3.5 text-gray-600">{req.type}</td>
                      <td className="px-5 py-3.5 text-gray-600">{req.date}</td>
                      <td className="px-5 py-3.5 text-gray-500 max-w-[180px] truncate">{req.reason || '—'}</td>
                      <td className="px-5 py-3.5 text-gray-500">{req.createdAt ? req.createdAt.slice(0, 10) : '—'}</td>
                      <td className="px-5 py-3.5 text-gray-500">{reviewer?.name || '—'}</td>
                      <td className="px-5 py-3.5">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${st.badge}`}>{st.label}</span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
