import { useMemo, useState } from 'react';
import useLeaveStore from '../../stores/leaveStore';
import useEmployeeStore from '../../stores/employeeStore';
import useAuthStore from '../../stores/authStore';
import useNotificationStore from '../../stores/notificationStore';
import Button from '../../components/common/Button';
import { sendPushToEmployee } from '../../lib/pushNotify';

const statusConfig = {
  pending:  { label: '대기',    badge: 'bg-amber-100 text-amber-700' },
  approved: { label: '승인',    badge: 'bg-emerald-100 text-emerald-700' },
  rejected: { label: '반려',    badge: 'bg-red-100 text-red-700' },
};

export default function LeaveApprovalPage() {
  const currentUser = useAuthStore((s) => s.currentUser);
  const requests = useLeaveStore((s) => s.requests);
  const farmReview = useLeaveStore((s) => s.farmReview);
  const employees = useEmployeeStore((s) => s.employees);
  const addNotification = useNotificationStore((s) => s.addNotification);

  const [processing, setProcessing] = useState(null);
  const [activeTab, setActiveTab] = useState('pending');

  const empMap = useMemo(
    () => Object.fromEntries(employees.map((e) => [e.id, e])),
    [employees]
  );

  const pendingRequests = useMemo(
    () => requests
      .filter((r) => r.status === 'pending')
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [requests]
  );

  const processedRequests = useMemo(
    () => requests
      .filter((r) => ['approved', 'rejected'].includes(r.status))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, 30),
    [requests]
  );

  const displayList = activeTab === 'pending' ? pendingRequests : processedRequests;

  const handleApprove = async (id) => {
    if (processing) return;
    setProcessing(id);
    const req = requests.find((r) => r.id === id);
    const ok = await farmReview(id, true, currentUser.id);
    setProcessing(null);
    if (!ok) {
      addNotification({ type: 'info', title: '승인 실패', message: '처리 중 오류가 발생했습니다.', urgent: false });
      return;
    }
    if (req) {
      sendPushToEmployee({
        employeeId: req.employeeId,
        title: '근태 신청이 승인되었습니다',
        body: `${req.date} ${req.type}${req.reason ? ` · ${req.reason}` : ''} 신청이 승인 처리되었습니다`,
        type: 'leave',
      }).catch(() => {});
    }
  };

  const handleReject = async (id) => {
    if (processing) return;
    setProcessing(id);
    const req = requests.find((r) => r.id === id);
    const ok = await farmReview(id, false, currentUser.id);
    setProcessing(null);
    if (!ok) {
      addNotification({ type: 'info', title: '반려 실패', message: '처리 중 오류가 발생했습니다.', urgent: false });
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

  return (
    <div>
      <div className="flex items-baseline gap-3 mb-6 flex-wrap">
        <h2 className="text-2xl font-heading font-bold text-gray-900">근태 승인</h2>
      </div>

      {/* 탭 */}
      <div className="flex gap-2 mb-5">
        <button
          onClick={() => setActiveTab('pending')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors min-h-[40px] ${
            activeTab === 'pending'
              ? 'bg-[#6366F1] text-white shadow-sm shadow-indigo-200'
              : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
          }`}
        >
          대기
          {pendingRequests.length > 0 && (
            <span className={`text-xs px-1.5 py-0.5 rounded-full font-semibold ${
              activeTab === 'pending' ? 'bg-white/20 text-white' : 'bg-amber-100 text-amber-700'
            }`}>
              {pendingRequests.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('processed')}
          className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors min-h-[40px] ${
            activeTab === 'processed'
              ? 'bg-[#6366F1] text-white shadow-sm shadow-indigo-200'
              : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
          }`}
        >
          처리 완료
        </button>
      </div>

      {/* 모바일 카드 뷰 */}
      <div className="md:hidden space-y-2.5">
        {displayList.length === 0 && (
          <p className="text-center text-gray-400 py-12">
            {activeTab === 'pending' ? '대기 중인 근태 신청이 없습니다' : '처리 완료된 신청이 없습니다'}
          </p>
        )}
        {displayList.map((req) => {
          const emp = empMap[req.employeeId];
          const st = statusConfig[req.status] || statusConfig.pending;
          const isPending = req.status === 'pending';
          return (
            <div
              key={req.id}
              className={`bg-white rounded-[24px] shadow-sm border p-4 ${
                isPending ? 'border-amber-200' : 'border-gray-100'
              }`}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-sm font-bold flex-shrink-0">
                    {emp?.name?.[0] || '?'}
                  </div>
                  <div>
                    <span className="font-semibold text-gray-900">{emp?.name || '—'}</span>
                    <span className="text-gray-500 text-sm ml-2">{req.type}</span>
                  </div>
                </div>
                <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${st.badge}`}>{st.label}</span>
              </div>
              <div className="text-sm text-gray-500 pl-10.5 mb-1">{req.date}</div>
              {req.reason && <div className="text-sm text-gray-400 pl-10.5 mb-3">{req.reason}</div>}
              {isPending && (
                <div className="flex gap-2 justify-end mt-2">
                  <button
                    onClick={() => handleApprove(req.id)}
                    disabled={processing === req.id}
                    className="px-4 py-2 rounded-xl text-sm font-medium bg-[#6366F1] text-white hover:bg-[#4F46E5] disabled:opacity-50 transition-colors min-h-[36px] active:scale-[0.98]"
                  >
                    {processing === req.id ? '처리 중...' : '승인'}
                  </button>
                  <button
                    onClick={() => handleReject(req.id)}
                    disabled={processing === req.id}
                    className="px-4 py-2 rounded-xl text-sm font-medium bg-red-50 text-red-600 hover:bg-red-100 disabled:opacity-50 transition-colors min-h-[36px] active:scale-[0.98]"
                  >
                    반려
                  </button>
                </div>
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
                <th className="px-5 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">이름</th>
                <th className="px-5 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">날짜</th>
                <th className="px-5 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">유형</th>
                <th className="px-5 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">사유</th>
                <th className="px-5 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">상태</th>
                <th className="px-5 py-4 text-right text-xs font-semibold text-gray-400 uppercase tracking-wider">처리</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {displayList.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center text-gray-400 py-12">
                    {activeTab === 'pending' ? '대기 중인 근태 신청이 없습니다' : '처리 완료된 신청이 없습니다'}
                  </td>
                </tr>
              ) : (
                displayList.map((req) => {
                  const emp = empMap[req.employeeId];
                  const st = statusConfig[req.status] || statusConfig.pending;
                  const isPending = req.status === 'pending';
                  return (
                    <tr key={req.id} className={`hover:bg-gray-50 transition-colors ${isPending ? 'bg-amber-50/30' : ''}`}>
                      <td className="px-5 py-3.5 font-medium text-gray-900">{emp?.name || '—'}</td>
                      <td className="px-5 py-3.5 text-gray-600">{req.date}</td>
                      <td className="px-5 py-3.5 text-gray-600">{req.type}</td>
                      <td className="px-5 py-3.5 text-gray-500 max-w-[200px] truncate">{req.reason || '—'}</td>
                      <td className="px-5 py-3.5">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${st.badge}`}>{st.label}</span>
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        {isPending ? (
                          <div className="flex gap-2 justify-end">
                            <button
                              onClick={() => handleApprove(req.id)}
                              disabled={processing === req.id}
                              className="px-3 py-1.5 rounded-lg text-sm font-medium bg-[#6366F1] text-white hover:bg-[#4F46E5] disabled:opacity-50 transition-colors active:scale-[0.98]"
                            >
                              {processing === req.id ? '처리 중...' : '승인'}
                            </button>
                            <button
                              onClick={() => handleReject(req.id)}
                              disabled={processing === req.id}
                              className="px-3 py-1.5 rounded-lg text-sm font-medium bg-red-50 text-red-600 hover:bg-red-100 disabled:opacity-50 transition-colors active:scale-[0.98]"
                            >
                              반려
                            </button>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400">처리 완료</span>
                        )}
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
