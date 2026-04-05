import { useState, useMemo } from 'react';
import useNoticeStore from '../../stores/noticeStore';
import useAuthStore from '../../stores/authStore';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Modal from '../../components/common/Modal';

const priorities = [
  { value: 'normal', label: '일반', color: 'bg-gray-100 text-gray-600' },
  { value: 'important', label: '중요', color: 'bg-amber-100 text-amber-700' },
  { value: 'urgent', label: '긴급', color: 'bg-red-100 text-red-700' },
];

export default function NoticePage() {
  const currentUser = useAuthStore((s) => s.currentUser);
  const notices = useNoticeStore((s) => s.notices);
  const addNotice = useNoticeStore((s) => s.addNotice);
  const deleteNotice = useNoticeStore((s) => s.deleteNotice);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ title: '', body: '', priority: 'normal' });

  const sorted = useMemo(
    () => [...notices].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [notices]
  );

  const handleAdd = () => {
    if (!form.title.trim() || !form.body.trim()) return;
    addNotice({ ...form, createdBy: currentUser.id });
    setForm({ title: '', body: '', priority: 'normal' });
    setShowModal(false);
  };

  const accentFor = (p) => p === 'urgent' ? 'red' : p === 'important' ? 'amber' : 'gray';
  const priorityLabel = (p) => priorities.find((pr) => pr.value === p);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-heading font-semibold text-gray-900">공지사항</h2>
        <Button onClick={() => setShowModal(true)}>+ 공지 작성</Button>
      </div>

      <div className="space-y-3">
        {sorted.map((n) => {
          const pr = priorityLabel(n.priority);
          return (
            <Card key={n.id} accent={accentFor(n.priority)} className="p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-gray-900">{n.title}</span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${pr?.color}`}>{pr?.label}</span>
                </div>
                <Button size="sm" variant="ghost" onClick={() => deleteNotice(n.id)}>삭제</Button>
              </div>
              <p className="text-sm text-gray-600 whitespace-pre-wrap">{n.body}</p>
              <div className="text-xs text-gray-400 mt-2">{new Date(n.createdAt).toLocaleDateString('ko-KR')}</div>
            </Card>
          );
        })}
      </div>

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="공지 작성">
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">제목</label>
            <input type="text" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm min-h-[44px]" placeholder="공지 제목" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">중요도</label>
            <div className="flex gap-2">
              {priorities.map((p) => (
                <button key={p.value} onClick={() => setForm({ ...form, priority: p.value })}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium min-h-[36px] transition-colors ${
                    form.priority === p.value ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-600'
                  }`}>{p.label}</button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">내용</label>
            <textarea value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })}
              rows={4} className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm" placeholder="공지 내용을 입력하세요" />
          </div>
        </div>
        <div className="flex gap-2 mt-4">
          <Button className="flex-1" onClick={handleAdd}>게시</Button>
          <Button className="flex-1" variant="secondary" onClick={() => setShowModal(false)}>취소</Button>
        </div>
      </Modal>
    </div>
  );
}
