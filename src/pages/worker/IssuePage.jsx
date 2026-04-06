import { useState, useMemo } from 'react';
import useAuthStore from '../../stores/authStore';
import useIssueStore from '../../stores/issueStore';
import useZoneStore from '../../stores/zoneStore';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import BottomSheet from '../../components/common/BottomSheet';

const issueTypes = ['병해충', '작물이상', '시설이상', '기타'];

export default function IssuePage() {
  const currentUser = useAuthStore((s) => s.currentUser);
  const issues = useIssueStore((s) => s.issues);
  const addIssue = useIssueStore((s) => s.addIssue);
  const zones = useZoneStore((s) => s.zones);
  const [showSheet, setShowSheet] = useState(false);
  const [form, setForm] = useState({ zoneId: '', type: '병해충', comment: '' });

  const zoneMap = useMemo(() => Object.fromEntries(zones.map((z) => [z.id, z])), [zones]);

  const myIssues = useMemo(
    () => issues
      .filter((i) => i.workerId === currentUser?.id)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [issues, currentUser]
  );

  const handleSubmit = () => {
    if (!form.zoneId || !form.comment.trim()) return;
    addIssue({
      workerId: currentUser.id,
      zoneId: form.zoneId,
      type: form.type,
      comment: form.comment,
      photo: null,
    });
    setForm({ zoneId: '', type: '병해충', comment: '' });
    setShowSheet(false);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-heading font-semibold text-gray-900">이상 신고</h2>
        <Button size="sm" variant="danger" onClick={() => setShowSheet(true)}>신고하기</Button>
      </div>

      {myIssues.length === 0 && (
        <p className="text-gray-400 text-sm text-center py-12">신고 이력이 없습니다</p>
      )}

      <div className="space-y-3">
        {myIssues.map((issue) => (
          <Card key={issue.id} accent={issue.isResolved ? 'blue' : 'red'} className="p-4">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <span className="font-medium text-gray-900">{issue.type}</span>
                <span className="text-xs text-gray-400">{zoneMap[issue.zoneId]?.name}</span>
              </div>
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                issue.isResolved ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
              }`}>
                {issue.isResolved ? '처리완료' : '미처리'}
              </span>
            </div>
            <p className="text-sm text-gray-500">{issue.comment}</p>
            <div className="text-xs text-gray-400 mt-1">
              {new Date(issue.createdAt).toLocaleDateString('ko-KR')}
            </div>
          </Card>
        ))}
      </div>

      <BottomSheet isOpen={showSheet} onClose={() => setShowSheet(false)} title="이상 신고">
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">구역</label>
            <select value={form.zoneId} onChange={(e) => setForm({ ...form, zoneId: e.target.value })}
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm min-h-[44px]">
              <option value="">선택</option>
              {zones.map((z) => <option key={z.id} value={z.id}>{z.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">유형</label>
            <div className="flex flex-wrap gap-2">
              {issueTypes.map((t) => (
                <button key={t} onClick={() => setForm({ ...form, type: t })}
                  className={`px-3 py-2 rounded-lg text-sm font-medium min-h-[44px] transition-colors ${
                    form.type === t ? 'bg-red-500 text-white' : 'bg-gray-100 text-gray-600'
                  }`}>{t}</button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">상세 내용</label>
            <textarea value={form.comment} onChange={(e) => setForm({ ...form, comment: e.target.value })}
              rows={3} className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm"
              placeholder="이상 증상을 상세히 기록해주세요" />
          </div>
          <Button size="lg" variant="danger" className="w-full" onClick={handleSubmit}>신고 접수</Button>
        </div>
      </BottomSheet>
    </div>
  );
}
