import { useMemo } from 'react';
import useLeaveStore from '../../stores/leaveStore';
import useEmployeeStore from '../../stores/employeeStore';
import useAuthStore from '../../stores/authStore';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';

const statusConfig = {
  pending: { label: '1차 대기', dot: 'bg-amber-400', color: 'text-amber-600' },
  farm_approved: { label: '1차 완료', dot: 'bg-blue-500', color: 'text-blue-600' },
  hr_approved: { label: '최종 완료', dot: 'bg-green-500', color: 'text-green-600' },
  rejected: { label: '반려', dot: 'bg-red-500', color: 'text-red-600' },
};

export default function LeaveApprovalPage() {
  const currentUser = useAuthStore((s) => s.currentUser);
  const requests = useLeaveStore((s) => s.requests);
  const farmReview = useLeaveStore((s) => s.farmReview);
  const hrReview = useLeaveStore((s) => s.hrReview);
  const employees = useEmployeeStore((s) => s.employees);

  const isFarmTeam = currentUser?.team === 'farm';
  const title = isFarmTeam ? '근태 승인 (1차)' : '근태 승인 (최종)';

  const empMap = useMemo(
    () => Object.fromEntries(employees.map((e) => [e.id, e])),
    [employees]
  );

  const pendingRequests = useMemo(() => {
    const targetStatus = isFarmTeam ? 'pending' : 'farm_approved';
    return requests
      .filter((r) => r.status === targetStatus)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [requests, isFarmTeam]);

  const processedRequests = useMemo(() => {
    const statuses = isFarmTeam
      ? ['farm_approved', 'rejected']
      : ['hr_approved', 'rejected'];
    return requests
      .filter((r) => statuses.includes(r.status))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, 20);
  }, [requests, isFarmTeam]);

  const handleApprove = (id) => isFarmTeam ? farmReview(id, true, currentUser.id) : hrReview(id, true, currentUser.id);
  const handleReject = (id) => isFarmTeam ? farmReview(id, false, currentUser.id) : hrReview(id, false, currentUser.id);

  const allRequests = [...pendingRequests, ...processedRequests];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-heading font-bold text-gray-900">{title}</h2>
        <span className="text-sm text-gray-400">대기 {pendingRequests.length}건</span>
      </div>

      <Card accent="gray" className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-left text-gray-500 border-b border-gray-100">
                <th className="px-5 py-3 font-medium">상태</th>
                <th className="px-5 py-3 font-medium">이름</th>
                <th className="px-5 py-3 font-medium">날짜</th>
                <th className="px-5 py-3 font-medium">유형</th>
                <th className="px-5 py-3 font-medium">사유</th>
                <th className="px-5 py-3 font-medium text-right">처리</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {allRequests.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center text-gray-400 py-12">
                    근태 신청 내역이 없습니다
                  </td>
                </tr>
              )}
              {allRequests.map((req) => {
                const emp = empMap[req.employeeId];
                const st = statusConfig[req.status];
                const isPending = pendingRequests.some((p) => p.id === req.id);

                return (
                  <tr key={req.id} className={isPending ? 'bg-amber-50/50' : ''}>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <span className={`w-2.5 h-2.5 rounded-full ${st.dot}`} />
                        <span className={`text-xs font-medium ${st.color}`}>{st.label}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3 font-medium text-gray-900">{emp?.name || '—'}</td>
                    <td className="px-5 py-3 text-gray-600">{req.date}</td>
                    <td className="px-5 py-3 text-gray-600">{req.type}</td>
                    <td className="px-5 py-3 text-gray-500 max-w-[200px] truncate">{req.reason}</td>
                    <td className="px-5 py-3 text-right">
                      {isPending ? (
                        <div className="flex gap-2 justify-end">
                          <Button size="sm" onClick={() => handleApprove(req.id)}>승인</Button>
                          <Button size="sm" variant="danger" onClick={() => handleReject(req.id)}>반려</Button>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400">처리 완료</span>
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
  );
}
