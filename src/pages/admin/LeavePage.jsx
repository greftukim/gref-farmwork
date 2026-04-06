import { useState, useMemo } from 'react';
import useLeaveStore from '../../stores/leaveStore';
import useEmployeeStore from '../../stores/employeeStore';
import useAuthStore from '../../stores/authStore';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';

const statusMap = {
  pending: { label: '대기', color: 'bg-amber-100 text-amber-700' },
  approved: { label: '승인', color: 'bg-green-100 text-green-700' },
  rejected: { label: '반려', color: 'bg-red-100 text-red-700' },
};

export default function LeavePage() {
  const currentUser = useAuthStore((s) => s.currentUser);
  const requests = useLeaveStore((s) => s.requests);
  const balances = useLeaveStore((s) => s.balances);
  const reviewRequest = useLeaveStore((s) => s.reviewRequest);
  const employees = useEmployeeStore((s) => s.employees);
  const [view, setView] = useState('requests');

  const empMap = useMemo(
    () => Object.fromEntries(employees.map((e) => [e.id, e])),
    [employees]
  );

  const sortedRequests = useMemo(
    () => [...requests].sort((a, b) => {
      if (a.status === 'pending' && b.status !== 'pending') return -1;
      if (a.status !== 'pending' && b.status === 'pending') return 1;
      return b.createdAt.localeCompare(a.createdAt);
    }),
    [requests]
  );

  const balanceList = useMemo(
    () => balances.map((b) => ({
      ...b,
      employee: empMap[b.employeeId],
      remaining: b.totalDays - b.usedDays,
    })),
    [balances, empMap]
  );

  return (
    <div>
      <h2 className="text-xl font-heading font-semibold text-gray-900 mb-6">휴가 관리</h2>

      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setView('requests')}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium min-h-[36px] transition-colors ${
            view === 'requests' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          신청 목록
        </button>
        <button
          onClick={() => setView('balances')}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium min-h-[36px] transition-colors ${
            view === 'balances' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          잔여 현황
        </button>
      </div>

      {view === 'requests' && (
        <div className="space-y-3">
          {sortedRequests.map((req) => {
            const emp = empMap[req.employeeId];
            const st = statusMap[req.status];
            return (
              <Card
                key={req.id}
                accent={req.status === 'pending' ? 'amber' : req.status === 'approved' ? 'blue' : 'red'}
                className="p-4"
              >
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <span className="font-medium text-gray-900">{emp?.name || '알 수 없음'}</span>
                    <span className="text-gray-400 text-sm ml-2">{req.date}</span>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${st.color}`}>
                    {st.label}
                  </span>
                </div>
                <div className="text-sm text-gray-500 mb-2">{req.type} · {req.reason}</div>
                {req.status === 'pending' && (
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => reviewRequest(req.id, 'approved', currentUser.id)}
                    >
                      승인
                    </Button>
                    <Button
                      size="sm"
                      variant="danger"
                      onClick={() => reviewRequest(req.id, 'rejected', currentUser.id)}
                    >
                      반려
                    </Button>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {view === 'balances' && (
        <Card accent="gray" className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-left text-gray-500">
                  <th className="px-4 py-3 font-medium">이름</th>
                  <th className="px-4 py-3 font-medium">총 휴가</th>
                  <th className="px-4 py-3 font-medium">사용</th>
                  <th className="px-4 py-3 font-medium">잔여</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {balanceList.map((b) => (
                  <tr key={b.id}>
                    <td className="px-4 py-3 font-medium text-gray-900">{b.employee?.name}</td>
                    <td className="px-4 py-3 text-gray-600">{b.totalDays}일</td>
                    <td className="px-4 py-3 text-gray-600">{b.usedDays}일</td>
                    <td className="px-4 py-3">
                      <span className={`font-bold ${b.remaining <= 3 ? 'text-red-500' : 'text-blue-600'}`}>
                        {b.remaining}일
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
