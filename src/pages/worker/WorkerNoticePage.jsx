import { useMemo } from 'react';
import useNoticeStore from '../../stores/noticeStore';
import Card from '../../components/common/Card';

const priorityLabel = { normal: '일반', important: '중요', urgent: '긴급' };
const priorityColor = {
  normal: 'bg-gray-100 text-gray-600',
  important: 'bg-amber-100 text-amber-700',
  urgent: 'bg-red-100 text-red-700',
};

export default function WorkerNoticePage() {
  const notices = useNoticeStore((s) => s.notices);

  const sorted = useMemo(
    () => [...notices].sort((a, b) => {
      const pOrder = { urgent: 0, important: 1, normal: 2 };
      if (pOrder[a.priority] !== pOrder[b.priority]) return pOrder[a.priority] - pOrder[b.priority];
      return b.createdAt.localeCompare(a.createdAt);
    }),
    [notices]
  );

  const accentFor = (p) => p === 'urgent' ? 'red' : p === 'important' ? 'amber' : 'gray';

  return (
    <div>
      <h2 className="text-lg font-heading font-semibold text-gray-900 mb-4">공지사항</h2>

      {sorted.length === 0 && (
        <p className="text-gray-400 text-sm text-center py-12">공지사항이 없습니다</p>
      )}

      <div className="space-y-3">
        {sorted.map((n) => (
          <Card key={n.id} accent={accentFor(n.priority)} className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${priorityColor[n.priority]}`}>
                {priorityLabel[n.priority]}
              </span>
              <span className="font-medium text-gray-900">{n.title}</span>
            </div>
            <p className="text-sm text-gray-600 whitespace-pre-wrap">{n.body}</p>
            <div className="text-xs text-gray-400 mt-2">{new Date(n.createdAt).toLocaleDateString('ko-KR')}</div>
          </Card>
        ))}
      </div>
    </div>
  );
}
