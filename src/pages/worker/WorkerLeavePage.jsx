import { useState, useMemo } from 'react';
import useAuthStore from '../../stores/authStore';
import useLeaveStore from '../../stores/leaveStore';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import BottomSheet from '../../components/common/BottomSheet';

const leaveTypes = ['연차', '오전반차', '오후반차', '특별휴가'];

const statusMap = {
  pending:       { label: '대기', color: 'bg-amber-100 text-amber-700' },
  approved:      { label: '승인', color: 'bg-green-100 text-green-700' },
  rejected:      { label: '반려', color: 'bg-red-100 text-red-700'    },
  // 하위 호환
  farm_approved: { label: '승인', color: 'bg-green-100 text-green-700' },
  hr_approved:   { label: '승인', color: 'bg-green-100 text-green-700' },
};

export default function WorkerLeavePage() {
  const currentUser = useAuthStore((s) => s.currentUser);
  const requests = useLeaveStore((s) => s.requests);
  const balances = useLeaveStore((s) => s.balances);
  const addRequest = useLeaveStore((s) => s.addRequest);
  const [showSheet, setShowSheet] = useState(false);
  const [form, setForm] = useState({ date: '', type: '연차', reason: '' });

  const myRequests = useMemo(
    () => requests.filter((r) => r.employeeId === currentUser?.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [requests, currentUser]
  );

  const myBalance = useMemo(
    () => balances.find((b) => b.employeeId === currentUser?.id && b.year === new Date().getFullYear()),
    [balances, currentUser]
  );

  const handleSubmit = () => {
    if (!form.date || !form.reason.trim()) return;
    addRequest({
      employeeId: currentUser.id,
      date: form.date,
      type: form.type,
      reason: form.reason,
    });
    setForm({ date: '', type: '연차', reason: '' });
    setShowSheet(false);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-heading font-semibold text-gray-900">휴가</h2>
        <Button size="sm" onClick={() => setShowSheet(true)}>휴가 신청</Button>
      </div>

      {myBalance && (
        <Card accent="blue" className="p-4 mb-4">
          <div className="text-sm text-gray-500 mb-2">잔여 휴가</div>
          <div className="flex gap-6 text-sm">
            <div>
              <span className="text-gray-400">총 </span>
              <span className="font-bold text-gray-900">{myBalance.totalDays}일</span>
            </div>
            <div>
              <span className="text-gray-400">사용 </span>
              <span className="font-bold text-gray-900">{myBalance.usedDays}일</span>
            </div>
            <div>
              <span className="text-gray-400">잔여 </span>
              <span className="font-bold text-blue-600">{myBalance.totalDays - myBalance.usedDays}일</span>
            </div>
          </div>
        </Card>
      )}

      <div className="space-y-3">
        {myRequests.length === 0 && (
          <p className="text-gray-400 text-sm text-center py-8">휴가 신청 내역이 없습니다</p>
        )}
        {myRequests.map((req) => {
          const st = statusMap[req.status];
          return (
            <Card key={req.id} accent={['approved','hr_approved','farm_approved'].includes(req.status) ? 'green' : req.status === 'rejected' ? 'red' : 'amber'} className="p-4">
              <div className="flex items-center justify-between mb-1">
                <span className="font-medium text-gray-900">{req.date}</span>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${st.color}`}>
                  {st.label}
                </span>
              </div>
              <div className="text-sm text-gray-500">{req.type} · {req.reason}</div>
            </Card>
          );
        })}
      </div>

      <BottomSheet isOpen={showSheet} onClose={() => setShowSheet(false)} title="휴가 신청">
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">날짜</label>
            <input
              type="date"
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm min-h-[44px]"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">유형</label>
            <div className="flex flex-wrap gap-2">
              {leaveTypes.map((t) => (
                <button
                  key={t}
                  onClick={() => setForm({ ...form, type: t })}
                  className={`px-3 py-2 rounded-lg text-sm font-medium min-h-[44px] transition-colors ${
                    form.type === t
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">사유</label>
            <textarea
              value={form.reason}
              onChange={(e) => setForm({ ...form, reason: e.target.value })}
              rows={3}
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm"
              placeholder="휴가 사유를 입력하세요"
            />
          </div>
          <Button className="w-full" size="lg" onClick={handleSubmit}>
            신청하기
          </Button>
        </div>
      </BottomSheet>
    </div>
  );
}
