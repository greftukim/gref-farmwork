import { useState, useMemo } from 'react';
import useLeaveStore from '../../stores/leaveStore';
import useEmployeeStore from '../../stores/employeeStore';
import useBranchStore from '../../stores/branchStore';
import Card from '../../components/common/Card';

const statusConfig = {
  pending:       { label: '재배팀 승인 대기', badge: 'bg-amber-100 text-amber-700' },
  approved:      { label: '승인',             badge: 'bg-green-100 text-green-700'  },
  rejected:      { label: '반려',             badge: 'bg-red-100 text-red-700'      },
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

  return (
    <div>
      <h2 className="text-2xl font-heading font-bold text-gray-900 mb-6">근태 현황</h2>

      {/* 필터 */}
      <div className="flex flex-wrap gap-2 mb-4">
        <select
          value={filterBranch}
          onChange={(e) => setFilterBranch(e.target.value)}
          className="border border-gray-200 rounded-xl px-3 py-2 text-sm min-h-[44px] bg-white"
        >
          <option value="all">전체 지점</option>
          {branches.map((b) => (
            <option key={b.code} value={b.code}>{b.name}</option>
          ))}
        </select>

        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="border border-gray-200 rounded-xl px-3 py-2 text-sm min-h-[44px] bg-white"
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
          placeholder="시작일"
          className="border border-gray-200 rounded-xl px-3 py-2 text-sm min-h-[44px]"
        />
        <input
          type="date"
          value={filterEnd}
          onChange={(e) => setFilterEnd(e.target.value)}
          placeholder="종료일"
          className="border border-gray-200 rounded-xl px-3 py-2 text-sm min-h-[44px]"
        />
        <input
          type="text"
          value={filterName}
          onChange={(e) => setFilterName(e.target.value)}
          placeholder="작업자 검색"
          className="border border-gray-200 rounded-xl px-3 py-2 text-sm min-h-[44px] w-32"
        />
        {(filterBranch !== 'all' || filterStatus !== 'all' || filterStart || filterEnd || filterName) && (
          <button
            onClick={() => { setFilterBranch('all'); setFilterStatus('all'); setFilterStart(''); setFilterEnd(''); setFilterName(''); }}
            className="px-3 py-2 text-sm text-gray-500 border border-gray-200 rounded-xl hover:bg-gray-50 min-h-[44px]"
          >초기화</button>
        )}
      </div>

      <div className="text-xs text-gray-400 mb-3">{filtered.length}건</div>

      {/* 모바일 카드 뷰 */}
      <div className="md:hidden space-y-3">
        {filtered.length === 0 && (
          <p className="text-center text-gray-400 py-12">해당 조건의 근태 신청이 없습니다</p>
        )}
        {filtered.map((req) => {
          const emp = empMap[req.employeeId];
          const st = statusConfig[req.status] || statusConfig.pending;
          const reviewer = req.farmReviewedBy ? empMap[req.farmReviewedBy] : null;
          return (
            <Card key={req.id} accent="gray" className="p-4">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <span className="font-semibold text-gray-900">{emp?.name || '—'}</span>
                  <span className="text-xs text-gray-400 ml-2">{branchMap[emp?.branch] || emp?.branch || ''}</span>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${st.badge}`}>{st.label}</span>
              </div>
              <div className="text-sm text-gray-600 mb-0.5">{req.type} · {req.date}</div>
              {req.reason && <div className="text-sm text-gray-500 mb-0.5 truncate">{req.reason}</div>}
              {reviewer && (
                <div className="text-xs text-gray-400 mt-1">승인자: {reviewer.name}</div>
              )}
            </Card>
          );
        })}
      </div>

      {/* 데스크탑 테이블 뷰 */}
      <Card accent="gray" className="hidden md:block overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-left text-gray-500 border-b border-gray-100">
                <th className="px-4 py-3 font-medium">지점</th>
                <th className="px-4 py-3 font-medium">작업자</th>
                <th className="px-4 py-3 font-medium">근태 유형</th>
                <th className="px-4 py-3 font-medium">날짜</th>
                <th className="px-4 py-3 font-medium">사유</th>
                <th className="px-4 py-3 font-medium">신청일</th>
                <th className="px-4 py-3 font-medium">승인자</th>
                <th className="px-4 py-3 font-medium">상태</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="text-center text-gray-400 py-12">해당 조건의 근태 신청이 없습니다</td>
                </tr>
              )}
              {filtered.map((req) => {
                const emp = empMap[req.employeeId];
                const st = statusConfig[req.status] || statusConfig.pending;
                const reviewer = req.farmReviewedBy ? empMap[req.farmReviewedBy] : null;
                return (
                  <tr key={req.id}>
                    <td className="px-4 py-3 text-gray-600">{branchMap[emp?.branch] || emp?.branch || '—'}</td>
                    <td className="px-4 py-3 font-medium text-gray-900">{emp?.name || '—'}</td>
                    <td className="px-4 py-3 text-gray-600">{req.type}</td>
                    <td className="px-4 py-3 text-gray-600">{req.date}</td>
                    <td className="px-4 py-3 text-gray-500 max-w-[180px] truncate">{req.reason}</td>
                    <td className="px-4 py-3 text-gray-500">{req.createdAt ? req.createdAt.slice(0, 10) : '—'}</td>
                    <td className="px-4 py-3 text-gray-500">{reviewer?.name || '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${st.badge}`}>{st.label}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
