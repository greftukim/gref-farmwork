import { useMemo } from 'react';
import useLeaveStore from '../../stores/leaveStore';
import useEmployeeStore from '../../stores/employeeStore';
import useAuthStore from '../../stores/authStore';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';

const statusMap = {
  pending: { label: '대기', color: 'bg-amber-100 text-amber-700' },
  farm_approved: { label: '1차 승인', color: 'bg-blue-100 text-blue-700' },
  hr_approved: { label: '최종 승인', color: 'bg-green-100 text-green-700' },
  rejected: { label: '반려', color: 'bg-red-100 text-red-700' },
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

  // 재배팀: pending 상태 건 표시, 관리팀: farm_approved 상태 건 표시
  const pendingRequests = useMemo(() => {
    const targetStatus = isFarmTeam ? 'pending' : 'farm_approved';
    return requests
      .filter((r) => r.status === targetStatus)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [requests, isFarmTeam]);

  // 처리 완료된 건
  const processedRequests = useMemo(() => {
    const processedStatuses = isFarmTeam
      ? ['farm_approved', 'rejected']
      : ['hr_approved', 'rejected'];
    return requests
      .filter((r) => processedStatuses.includes(r.status))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, 20);
  }, [requests, isFarmTeam]);

  const handleApprove = (requestId) => {
    if (isFarmTeam) {
      farmReview(requestId, true, currentUser.id);
    } else {
      hrReview(requestId, true, currentUser.id);
    }
  };

  const handleReject = (requestId) => {
    if (isFarmTeam) {
      farmReview(requestId, false, currentUser.id);
    } else {
      hrReview(requestId, false, currentUser.id);
    }
  };

  return (
    <div>
      <h2 className="text-xl font-heading font-semibold text-gray-900 mb-6">{title}</h2>

      {/* 승인 대기 */}
      <h3 className="text-sm font-medium text-gray-500 mb-3">
        승인 대기 ({pendingRequests.length}건)
      </h3>
      {pendingRequests.length === 0 && (
        <p className="text-gray-400 text-sm text-center py-6 mb-6">승인 대기 건이 없습니다</p>
      )}
      <div className="space-y-3 mb-8">
        {pendingRequests.map((req) => {
          const emp = empMap[req.employeeId];
          const st = statusMap[req.status];
          return (
            <Card key={req.id} accent="amber" className="p-4">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <span className="font-medium text-gray-900">{emp?.name || '알 수 없음'}</span>
                  <span className="text-gray-400 text-sm ml-2">{req.date}</span>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${st.color}`}>
                  {st.label}
                </span>
              </div>
              <div className="text-sm text-gray-500 mb-3">{req.type} · {req.reason}</div>
              <div className="flex gap-2">
                <Button size="sm" onClick={() => handleApprove(req.id)}>
                  승인
                </Button>
                <Button size="sm" variant="danger" onClick={() => handleReject(req.id)}>
                  반려
                </Button>
              </div>
            </Card>
          );
        })}
      </div>

      {/* 처리 완료 */}
      <h3 className="text-sm font-medium text-gray-500 mb-3">처리 완료</h3>
      <div className="space-y-3">
        {processedRequests.map((req) => {
          const emp = empMap[req.employeeId];
          const st = statusMap[req.status];
          return (
            <Card
              key={req.id}
              accent={req.status === 'rejected' ? 'red' : 'blue'}
              className="p-4"
            >
              <div className="flex items-center justify-between mb-1">
                <div>
                  <span className="font-medium text-gray-900">{emp?.name || '알 수 없음'}</span>
                  <span className="text-gray-400 text-sm ml-2">{req.date}</span>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${st.color}`}>
                  {st.label}
                </span>
              </div>
              <div className="text-sm text-gray-500">{req.type} · {req.reason}</div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
