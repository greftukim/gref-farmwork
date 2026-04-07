import { useState, useMemo } from 'react';
import useLeaveStore from '../../stores/leaveStore';
import useEmployeeStore from '../../stores/employeeStore';
import useAuthStore from '../../stores/authStore';
import useBranchFilter from '../../hooks/useBranchFilter';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';

const statusMap = {
  pending: { label: '대기', color: 'bg-amber-100 text-amber-700' },
  farm_approved: { label: '승인', color: 'bg-green-100 text-green-700' },
  rejected: { label: '반려', color: 'bg-red-100 text-red-700' },
};

export default function LeaveApprovalPage() {
  const currentUser = useAuthStore((s) => s.currentUser);
  const requests = useLeaveStore((s) => s.requests);
  const farmReview = useLeaveStore((s) => s.farmReview);
  const employees = useEmployeeStore((s) => s.employees);
  const { branchFilter } = useBranchFilter();

  const [processing, setProcessing] = useState(null); // requestId being processed
  const [filterStatus, setFilterStatus] = useState('pending'); // 'pending' | 'all'

  const empMap = useMemo(
    () => Object.fromEntries(employees.map((e) => [e.id, e])),
    [employees]
  );

  // 지점 필터: 해당 지점 직원의 신청만 표시
  const branchEmpIds = useMemo(() => {
    if (!branchFilter) return null;
    return new Set(employees.filter((e) => e.branch === branchFilter).map((e) => e.id));
  }, [employees, branchFilter]);

  const filteredRequests = useMemo(() => {
    let list = [...requests];
    if (branchEmpIds) list = list.filter((r) => branchEmpIds.has(r.employeeId));
    if (filterStatus === 'pending') list = list.filter((r) => r.status === 'pending');
    return list.sort((a, b) => {
      if (a.status === 'pending' && b.status !== 'pending') return -1;
      if (a.status !== 'pending' && b.status === 'pending') return 1;
      return b.createdAt.localeCompare(a.createdAt);
    });
  }, [requests, branchEmpIds, filterStatus]);

  const pendingCount = useMemo(
    () => (branchEmpIds
      ? requests.filter((r) => r.status === 'pending' && branchEmpIds.has(r.employeeId)).length
      : requests.filter((r) => r.status === 'pending').length),
    [requests, branchEmpIds]
  );

  const handleReview = async (requestId, approved) => {
    setProcessing(requestId);
    await farmReview(requestId, approved, currentUser.id);
    setProcessing(null);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-heading font-semibold text-gray-900">
          근태 승인
          {pendingCount > 0 && (
            <span className="ml-2 px-2 py-0.5 rounded-full text-sm bg-amber-100 text-amber-700 font-medium">
              {pendingCount}건 대기
            </span>
          )}
        </h2>
      </div>

      {/* 필터 탭 */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setFilterStatus('pending')}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium min-h-[36px] transition-colors ${
            filterStatus === 'pending' ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          대기 중
        </button>
        <button
          onClick={() => setFilterStatus('all')}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium min-h-[36px] transition-colors ${
            filterStatus === 'all' ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          전체
        </button>
      </div>

      {filteredRequests.length === 0 && (
        <p className="text-gray-400 text-sm text-center py-12">
          {filterStatus === 'pending' ? '승인 대기 중인 신청이 없습니다' : '근태 신청 내역이 없습니다'}
        </p>
      )}

      <div className="space-y-3">
        {filteredRequests.map((req) => {
          const emp = empMap[req.employeeId];
          const st = statusMap[req.status] || { label: req.status, color: 'bg-gray-100 text-gray-600' };
          const isProcessing = processing === req.id;

          return (
            <Card
              key={req.id}
              accent={req.status === 'pending' ? 'amber' : req.status === 'farm_approved' ? 'emerald' : 'red'}
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
              <div className="text-sm text-gray-500 mb-3">
                {req.type} · {req.reason}
              </div>
              <div className="text-xs text-gray-400 mb-3">
                신청일 {new Date(req.createdAt).toLocaleDateString('ko-KR')}
              </div>
              {req.status === 'pending' && (
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    disabled={isProcessing}
                    onClick={() => handleReview(req.id, true)}
                  >
                    {isProcessing ? '처리 중...' : '승인'}
                  </Button>
                  <Button
                    size="sm"
                    variant="danger"
                    disabled={isProcessing}
                    onClick={() => handleReview(req.id, false)}
                  >
                    반려
                  </Button>
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
