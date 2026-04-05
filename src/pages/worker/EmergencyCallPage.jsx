import { useState, useMemo } from 'react';
import useAuthStore from '../../stores/authStore';
import useCallStore from '../../stores/callStore';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import BottomSheet from '../../components/common/BottomSheet';

const callTypes = ['긴급호출', '질문확인', '장비이상'];

export default function EmergencyCallPage() {
  const currentUser = useAuthStore((s) => s.currentUser);
  const calls = useCallStore((s) => s.calls);
  const addCall = useCallStore((s) => s.addCall);
  const [showSheet, setShowSheet] = useState(false);
  const [form, setForm] = useState({ type: '긴급호출', memo: '' });

  const myCalls = useMemo(
    () => calls
      .filter((c) => c.workerId === currentUser?.id)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [calls, currentUser]
  );

  const handleSubmit = () => {
    addCall({ workerId: currentUser.id, type: form.type, memo: form.memo });
    setForm({ type: '긴급호출', memo: '' });
    setShowSheet(false);
  };

  return (
    <div>
      <div className="mb-4">
        <h2 className="text-lg font-heading font-semibold text-gray-900 mb-4">긴급 호출</h2>
        <Button size="lg" variant="danger" className="w-full" onClick={() => setShowSheet(true)}>
          관리자 호출하기
        </Button>
      </div>

      <div className="space-y-3 mt-6">
        <h3 className="text-sm font-medium text-gray-500">호출 이력</h3>
        {myCalls.length === 0 && (
          <p className="text-gray-400 text-sm text-center py-6">호출 이력이 없습니다</p>
        )}
        {myCalls.map((call) => (
          <Card key={call.id} accent={call.isConfirmed ? 'emerald' : 'red'} className="p-4">
            <div className="flex items-center justify-between mb-1">
              <span className="font-medium text-gray-900">{call.type}</span>
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                call.isConfirmed ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
              }`}>
                {call.isConfirmed ? '확인됨' : '대기 중'}
              </span>
            </div>
            {call.memo && <p className="text-sm text-gray-500">{call.memo}</p>}
            <div className="text-xs text-gray-400 mt-1">
              {new Date(call.createdAt).toLocaleDateString('ko-KR')}
            </div>
          </Card>
        ))}
      </div>

      <BottomSheet isOpen={showSheet} onClose={() => setShowSheet(false)} title="긴급 호출">
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">호출 유형</label>
            <div className="flex flex-wrap gap-2">
              {callTypes.map((t) => (
                <button key={t} onClick={() => setForm({ ...form, type: t })}
                  className={`px-3 py-2 rounded-lg text-sm font-medium min-h-[44px] transition-colors ${
                    form.type === t ? 'bg-red-500 text-white' : 'bg-gray-100 text-gray-600'
                  }`}>{t}</button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">메모 (선택)</label>
            <textarea value={form.memo} onChange={(e) => setForm({ ...form, memo: e.target.value })}
              rows={2} className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm" placeholder="상황 설명" />
          </div>
          <Button size="lg" variant="danger" className="w-full" onClick={handleSubmit}>호출 전송</Button>
        </div>
      </BottomSheet>
    </div>
  );
}
