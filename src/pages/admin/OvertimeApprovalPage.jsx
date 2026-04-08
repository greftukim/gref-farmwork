import { useMemo, useState, useEffect } from 'react';
import useOvertimeStore from '../../stores/overtimeStore';
import useEmployeeStore from '../../stores/employeeStore';
import useAuthStore from '../../stores/authStore';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import BottomSheet from '../../components/common/BottomSheet';
import { sendPushToEmployee } from '../../lib/pushNotify';

const statusConfig = {
  pending:  { label: '대기', dot: 'bg-amber-400', color: 'text-amber-600' },
  approved: { label: '승인', dot: 'bg-green-500', color: 'text-green-600' },
  rejected: { label: '반려', dot: 'bg-red-500',   color: 'text-red-600'   },
};

function formatOvertimeTime(hours, minutes) {
  if (hours > 0 && minutes > 0) return `${hours}시간 ${minutes}분`;
  if (hours > 0) return `${hours}시간`;
  return `${minutes}분`;
}

export default function OvertimeApprovalPage() {
  const currentUser = useAuthStore((s) => s.currentUser);
  const requests = useOvertimeStore((s) => s.requests);
  const fetchRequests = useOvertimeStore((s) => s.fetchRequests);
  const approveRequest = useOvertimeStore((s) => s.approveRequest);
  const rejectRequest = useOvertimeStore((s) => s.rejectRequest);
  const adjustAndApprove = useOvertimeStore((s) => s.adjustAndApprove);
  const subscribeRealtime = useOvertimeStore((s) => s.subscribeRealtime);
  const employees = useEmployeeStore((s) => s.employees);

  const [processing, setProcessing] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterName, setFilterName] = useState('');

  // 시간 조정 모달
  const [adjustTarget, setAdjustTarget] = useState(null);
  const [adjustForm, setAdjustForm] = useState({ hours: 0, minutes: 0 });

  useEffect(() => {
    fetchRequests();
    const unsub = subscribeRealtime();
    return unsub;
  }, []);

  const empMap = useMemo(
    () => Object.fromEntries(employees.map((e) => [e.id, e])),
    [employees]
  );

  // 본인 지점 데이터만 필터링
  const filtered = useMemo(() => {
    return requests
      .filter((r) => {
        const emp = empMap[r.employeeId];
        if (!emp) return false;
        // 재배팀 본인 지점만
        if (currentUser?.branch && emp.branch !== currentUser.branch) return false;
        if (filterStatus !== 'all' && r.status !== filterStatus) return false;
        if (filterName && !emp.name.includes(filterName)) return false;
        return true;
      })
      .sort((a, b) => {
        if (a.status === 'pending' && b.status !== 'pending') return -1;
        if (a.status !== 'pending' && b.status === 'pending') return 1;
        return (b.createdAt || '').localeCompare(a.createdAt || '');
      });
  }, [requests, empMap, currentUser, filterStatus, filterName]);

  const pendingCount = filtered.filter((r) => r.status === 'pending').length;

  const handleApprove = async (id) => {
    if (processing) return;
    setProcessing(id);
    const req = requests.find((r) => r.id === id);
    const { error } = await approveRequest(id, currentUser.id);
    setProcessing(null);
    if (!error && req) {
      const emp = empMap[req.employeeId];
      sendPushToEmployee({
        employeeId: req.employeeId,
        title: '연장근무 신청이 승인되었습니다',
        body: `${req.date} ${formatOvertimeTime(req.hours, req.minutes)} 연장근무가 승인되었습니다`,
        type: 'overtime_request',
      }).catch(() => {});
    }
  };

  const handleReject = async (id) => {
    if (processing) return;
    setProcessing(id);
    const req = requests.find((r) => r.id === id);
    const { error } = await rejectRequest(id, currentUser.id);
    setProcessing(null);
    if (!error && req) {
      sendPushToEmployee({
        employeeId: req.employeeId,
        title: '연장근무 신청이 반려되었습니다',
        body: `${req.date} 연장근무 신청이 반려되었습니다`,
        type: 'overtime_request',
      }).catch(() => {});
    }
  };

  const openAdjust = (req) => {
    setAdjustTarget(req);
    setAdjustForm({ hours: req.hours, minutes: req.minutes });
  };

  const handleAdjustSubmit = async () => {
    if (!adjustTarget || processing) return;
    if (adjustForm.hours === 0 && adjustForm.minutes === 0) return;
    setProcessing(adjustTarget.id);
    const { error } = await adjustAndApprove(adjustTarget.id, currentUser.id, adjustForm.hours, adjustForm.minutes);
    setProcessing(null);
    if (!error) {
      const emp = empMap[adjustTarget.employeeId];
      sendPushToEmployee({
        employeeId: adjustTarget.employeeId,
        title: '연장근무가 시간 조정 후 승인되었습니다',
        body: `${adjustTarget.date} 연장근무 ${formatOvertimeTime(adjustForm.hours, adjustForm.minutes)}으로 조정 승인되었습니다`,
        type: 'overtime_request',
      }).catch(() => {});
    }
    setAdjustTarget(null);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-heading font-bold text-gray-900">연장근무 승인</h2>
        <span className="text-sm text-gray-400">대기 {pendingCount}건</span>
      </div>

      {/* 필터 */}
      <div className="flex flex-wrap gap-2 mb-4">
        {[
          { value: 'all', label: '전체' },
          { value: 'pending', label: '대기' },
          { value: 'approved', label: '승인' },
          { value: 'rejected', label: '반려' },
        ].map((opt) => (
          <button
            key={opt.value}
            onClick={() => setFilterStatus(opt.value)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium min-h-[36px] transition-colors ${
              filterStatus === opt.value ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {opt.label}
          </button>
        ))}
        <input
          type="text"
          value={filterName}
          onChange={(e) => setFilterName(e.target.value)}
          placeholder="작업자명 검색"
          className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm min-h-[36px] w-32"
        />
      </div>

      {/* 모바일 카드 뷰 */}
      <div className="md:hidden space-y-3">
        {filtered.length === 0 && (
          <p className="text-center text-gray-400 py-12">연장근무 신청 내역이 없습니다</p>
        )}
        {filtered.map((req) => {
          const emp = empMap[req.employeeId];
          const st = statusConfig[req.status] || statusConfig.pending;
          const isPending = req.status === 'pending';
          return (
            <Card key={req.id} accent="gray" className={`p-4 ${isPending ? 'border-l-amber-400' : ''}`}>
              <div className="flex items-start justify-between mb-2">
                <div>
                  <span className="font-semibold text-gray-900">{emp?.name || '—'}</span>
                  <span className="text-gray-500 text-sm ml-2">{formatOvertimeTime(req.hours, req.minutes)}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className={`w-2 h-2 rounded-full ${st.dot}`} />
                  <span className={`text-xs font-medium ${st.color}`}>{st.label}</span>
                </div>
              </div>
              <div className="text-sm text-gray-600 mb-1">{req.date}</div>
              {req.reason && <div className="text-sm text-gray-500 mb-1">{req.reason}</div>}
              {req.adjustedByReviewer && (
                <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-medium bg-green-100 text-green-700 mb-2">재배팀 조정</span>
              )}
              {isPending ? (
                <div className="flex gap-2 justify-end mt-2">
                  <Button size="sm" onClick={() => handleApprove(req.id)} disabled={processing === req.id}>
                    {processing === req.id ? '처리 중...' : '승인'}
                  </Button>
                  <button
                    onClick={() => openAdjust(req)}
                    className="px-3 py-1.5 rounded-lg text-sm font-medium bg-blue-50 text-blue-600 active:scale-[0.98]"
                  >
                    시간 조정
                  </button>
                  <Button size="sm" variant="danger" onClick={() => handleReject(req.id)} disabled={processing === req.id}>반려</Button>
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
                <th className="px-5 py-3 font-medium">신청 시간</th>
                <th className="px-5 py-3 font-medium">사유</th>
                <th className="px-5 py-3 font-medium">신청일시</th>
                <th className="px-5 py-3 font-medium text-right">처리</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center text-gray-400 py-12">연장근무 신청 내역이 없습니다</td>
                </tr>
              )}
              {filtered.map((req) => {
                const emp = empMap[req.employeeId];
                const st = statusConfig[req.status] || statusConfig.pending;
                const isPending = req.status === 'pending';
                return (
                  <tr key={req.id} className={isPending ? 'bg-amber-50/50' : ''}>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <span className={`w-2.5 h-2.5 rounded-full ${st.dot}`} />
                        <span className={`text-xs font-medium ${st.color}`}>{st.label}</span>
                        {req.adjustedByReviewer && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-green-100 text-green-700">조정</span>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-3 font-medium text-gray-900">{emp?.name || '—'}</td>
                    <td className="px-5 py-3 text-gray-600">{req.date}</td>
                    <td className="px-5 py-3 text-gray-600">{formatOvertimeTime(req.hours, req.minutes)}</td>
                    <td className="px-5 py-3 text-gray-500 max-w-[200px] truncate">{req.reason || '—'}</td>
                    <td className="px-5 py-3 text-gray-400 text-xs">
                      {req.createdAt ? new Date(req.createdAt).toLocaleString('ko-KR', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}
                    </td>
                    <td className="px-5 py-3 text-right">
                      {isPending ? (
                        <div className="flex gap-2 justify-end">
                          <Button size="sm" onClick={() => handleApprove(req.id)} disabled={processing === req.id}>
                            {processing === req.id ? '처리 중...' : '승인'}
                          </Button>
                          <button
                            onClick={() => openAdjust(req)}
                            className="px-3 py-1.5 rounded-lg text-sm font-medium bg-blue-50 text-blue-600 active:scale-[0.98]"
                          >
                            시간 조정
                          </button>
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

      {/* 시간 조정 후 승인 모달 */}
      <BottomSheet
        isOpen={!!adjustTarget}
        onClose={() => setAdjustTarget(null)}
        title="시간 조정 후 승인"
      >
        {adjustTarget && (
          <div className="space-y-4">
            <div className="bg-gray-50 rounded-xl px-4 py-3 text-sm">
              <span className="text-gray-500">원래 신청: </span>
              <span className="font-medium text-gray-900">{formatOvertimeTime(adjustTarget.hours, adjustTarget.minutes)}</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">시간</label>
                <select
                  value={adjustForm.hours}
                  onChange={(e) => setAdjustForm({ ...adjustForm, hours: Number(e.target.value) })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm min-h-[44px]"
                >
                  {Array.from({ length: 13 }, (_, i) => (
                    <option key={i} value={i}>{i}시간</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">분</label>
                <select
                  value={adjustForm.minutes}
                  onChange={(e) => setAdjustForm({ ...adjustForm, minutes: Number(e.target.value) })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm min-h-[44px]"
                >
                  {[0, 15, 30, 45].map((m) => (
                    <option key={m} value={m}>{m}분</option>
                  ))}
                </select>
              </div>
            </div>
            <Button
              size="lg"
              className="w-full"
              onClick={handleAdjustSubmit}
              disabled={processing || (adjustForm.hours === 0 && adjustForm.minutes === 0)}
            >
              {processing ? '처리 중...' : '조정하여 승인'}
            </Button>
          </div>
        )}
      </BottomSheet>
    </div>
  );
}
