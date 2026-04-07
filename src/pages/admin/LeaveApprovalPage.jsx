import { useMemo, useState } from 'react';
import useLeaveStore from '../../stores/leaveStore';
import useEmployeeStore from '../../stores/employeeStore';
import useAuthStore from '../../stores/authStore';
import useNotificationStore from '../../stores/notificationStore';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import { sendPushToEmployee } from '../../lib/pushNotify';

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
  const addNotification = useNotificationStore((s) => s.addNotification);

  const isFarmTeam = currentUser?.team === 'farm';
  const title = isFarmTeam ? '근태 승인 (1차)' : '근태 승인 (최종)';

  const [processing, setProcessing] = useState(null); // 처리 중인 requestId

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

  const handleApprove = async (id) => {
    if (processing) return;
    setProcessing(id);
    const req = requests.find((r) => r.id === id);
    const ok = await (isFarmTeam ? farmReview(id, true, currentUser.id) : hrReview(id, true, currentUser.id));
    setProcessing(null);
    if (!ok) {
      addNotification({ type: 'info', title: '승인 실패', message: '처리 중 오류가 발생했습니다. 콘솔을 확인하세요.', urgent: false });
      return;
    }
    if (req) {
      const label = isFarmTeam ? '1차 승인' : '최종 승인';
      sendPushToEmployee({
        employeeId: req.employeeId,
        title: `근태 신청이 ${label}되었습니다`,
        body: `${req.date} ${req.type}${req.reason ? ` · ${req.reason}` : ''} 신청이 ${label} 처리되었습니다`,
        type: 'leave',
      }).catch(() => {});
    }
  };

  const handleReject = async (id) => {
    if (processing) return;
    setProcessing(id);
    const req = requests.find((r) => r.id === id);
    const ok = await (isFarmTeam ? farmReview(id, false, currentUser.id) : hrReview(id, false, currentUser.id));
    setProcessing(null);
    if (!ok) {
      addNotification({ type: 'info', title: '반려 실패', message: '처리 중 오류가 발생했습니다. 콘솔을 확인하세요.', urgent: false });
      return;
    }
    if (req) {
      sendPushToEmployee({
        employeeId: req.employeeId,
        title: '근태 신청이 반려되었습니다',
        body: `${req.date} ${req.type}${req.reason ? ` · ${req.reason}` : ''} 신청이 반려 처리되었습니다`,
        type: 'leave',
      }).catch(() => {});
    }
  };

  const allRequests = [...pendingRequests, ...processedRequests];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-heading font-bold text-gray-900">{title}</h2>
        <span className="text-sm text-gray-400">대기 {pendingRequests.length}건</span>
      </div>

      {/* 모바일 카드 뷰 */}
      <div className="md:hidden space-y-3">
        {allRequests.length === 0 && (
          <p className="text-center text-gray-400 py-12">근태 신청 내역이 없습니다</p>
        )}
        {allRequests.map((req) => {
          const emp = empMap[req.employeeId];
          const st = statusConfig[req.status];
          const isPending = pendingRequests.some((p) => p.id === req.id);
          return (
            <Card key={req.id} accent="gray" className={`p-4 ${isPending ? 'border-l-amber-400' : ''}`}>
              <div className="flex items-start justify-between mb-2">
                <div>
                  <span className="font-semibold text-gray-900">{emp?.name || '—'}</span>
                  <span className="text-gray-500 text-sm ml-2">{req.type}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className={`w-2 h-2 rounded-full ${st.dot}`} />
                  <span className={`text-xs font-medium ${st.color}`}>{st.label}</span>
                </div>
              </div>
              <div className="text-sm text-gray-600 mb-1">{req.date}</div>
              {req.reason && (
                <div className="text-sm text-gray-500 mb-3">{req.reason}</div>
              )}
              {isPending ? (
                <div className="flex gap-2 justify-end mt-2">
                  <Button size="sm" onClick={() => handleApprove(req.id)} disabled={processing === req.id}>
                    {processing === req.id ? '처리 중...' : '승인'}
                  </Button>
                  <Button size="sm" variant="danger" onClick={() => handleReject(req.id)} disabled={processing === req.id}>
                    반려
                  </Button>
                </div>
              ) : (
                <div className="text-right text-xs text-gray-400">처리 완료</div>
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
                          <Button size="sm" onClick={() => handleApprove(req.id)} disabled={processing === req.id}>
                            {processing === req.id ? '처리 중...' : '승인'}
                          </Button>
                          <Button size="sm" variant="danger" onClick={() => handleReject(req.id)} disabled={processing === req.id}>반려</Button>
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
