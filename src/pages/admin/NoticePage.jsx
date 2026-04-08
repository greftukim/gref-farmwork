import { useState, useMemo } from 'react';
import useNoticeStore from '../../stores/noticeStore';
import useAuthStore from '../../stores/authStore';
import useBranchStore from '../../stores/branchStore';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Modal from '../../components/common/Modal';
import { sendPushToWorkers } from '../../lib/pushNotify';

const priorities = [
  { value: 'normal',    label: '일반', color: 'bg-gray-100 text-gray-600' },
  { value: 'important', label: '중요', color: 'bg-amber-100 text-amber-700' },
  { value: 'urgent',    label: '긴급', color: 'bg-red-100 text-red-700' },
];

export default function NoticePage() {
  const currentUser = useAuthStore((s) => s.currentUser);
  const notices = useNoticeStore((s) => s.notices);
  const addNotice = useNoticeStore((s) => s.addNotice);
  const deleteNotice = useNoticeStore((s) => s.deleteNotice);
  const branches = useBranchStore((s) => s.branches);

  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ title: '', body: '', priority: 'normal' });

  // 푸시 관련 상태
  const [sendPush, setSendPush] = useState(false);
  const [pushTarget, setPushTarget] = useState('all');   // 'all' | branch.code | jobType
  const [pushTargetType, setPushTargetType] = useState('all'); // 'all' | 'branch' | 'jobType'
  const [pushBranch, setPushBranch] = useState('');
  const [pushJobType, setPushJobType] = useState('');
  const [pushing, setPushing] = useState(false);

  // 중요도가 바뀌면 중요/긴급은 푸시 기본 ON
  const handlePriorityChange = (p) => {
    setForm((f) => ({ ...f, priority: p }));
    setSendPush(p !== 'normal');
  };

  const sorted = useMemo(
    () => [...notices].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [notices]
  );

  const handleAdd = async () => {
    if (!form.title.trim() || !form.body.trim()) return;
    await addNotice({ ...form, createdBy: currentUser.id, authorTeam: currentUser.role || null });

    if (sendPush) {
      setPushing(true);
      try {
        await sendPushToWorkers({
          title: form.title,
          body: form.body,
          type: 'notice',
          urgent: form.priority === 'urgent',
          targetBranch: pushTargetType === 'branch' ? pushBranch || undefined : undefined,
          targetJobType: pushTargetType === 'jobType' ? pushJobType || undefined : undefined,
        });
      } catch (e) {
        console.error('[Notice] 푸시 발송 실패:', e);
      } finally {
        setPushing(false);
      }
    }

    setForm({ title: '', body: '', priority: 'normal' });
    setSendPush(false);
    setPushTargetType('all');
    setPushBranch('');
    setPushJobType('');
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
          const canDelete = !n.authorTeam || n.authorTeam === currentUser?.team;
          const teamBadge = n.authorTeam === 'farm'
            ? { label: '재배팀', cls: 'bg-emerald-100 text-emerald-700' }
            : n.authorTeam === 'management'
            ? { label: '관리팀', cls: 'bg-blue-100 text-blue-700' }
            : null;
          return (
            <Card key={n.id} accent={accentFor(n.priority)} className="p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-gray-900">{n.title}</span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${pr?.color}`}>{pr?.label}</span>
                  {teamBadge && (
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${teamBadge.cls}`}>{teamBadge.label}</span>
                  )}
                </div>
                {canDelete && (
                  <Button size="sm" variant="ghost" onClick={() => deleteNotice(n.id)}>삭제</Button>
                )}
              </div>
              <p className="text-sm text-gray-600 whitespace-pre-wrap">{n.body}</p>
              <div className="text-xs text-gray-400 mt-2">{new Date(n.createdAt).toLocaleDateString('ko-KR')}</div>
            </Card>
          );
        })}
      </div>

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="공지 작성">
        <div className="space-y-3">
          {/* 제목 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">제목</label>
            <input type="text" value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm min-h-[44px]"
              placeholder="공지 제목" />
          </div>

          {/* 중요도 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">중요도</label>
            <div className="flex gap-2">
              {priorities.map((p) => (
                <button key={p.value} onClick={() => handlePriorityChange(p.value)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium min-h-[36px] transition-colors ${
                    form.priority === p.value ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'
                  }`}>{p.label}</button>
              ))}
            </div>
          </div>

          {/* 내용 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">내용</label>
            <textarea value={form.body}
              onChange={(e) => setForm({ ...form, body: e.target.value })}
              rows={4} className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm"
              placeholder="공지 내용을 입력하세요" />
          </div>

          {/* 푸시 발송 */}
          <div className="border border-gray-100 rounded-xl p-3 bg-gray-50">
            <label className="flex items-center gap-2 cursor-pointer mb-3">
              <input type="checkbox" checked={sendPush} onChange={(e) => setSendPush(e.target.checked)}
                className="w-4 h-4 rounded accent-blue-600" />
              <span className="text-sm font-medium text-gray-700">작업자에게 푸시 알림 발송</span>
            </label>

            {sendPush && (
              <div className="space-y-2 pl-6">
                <div className="flex gap-2 flex-wrap">
                  {[
                    { key: 'all', label: '전체 작업자' },
                    { key: 'branch', label: '지점별' },
                    { key: 'jobType', label: '직무별' },
                  ].map((t) => (
                    <button key={t.key} onClick={() => setPushTargetType(t.key)}
                      className={`px-3 py-1 rounded-lg text-xs font-medium min-h-[32px] transition-colors ${
                        pushTargetType === t.key ? 'bg-blue-600 text-white' : 'bg-white border border-gray-200 text-gray-600'
                      }`}>{t.label}</button>
                  ))}
                </div>

                {pushTargetType === 'branch' && (
                  <select value={pushBranch} onChange={(e) => setPushBranch(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm min-h-[40px]">
                    <option value="">지점 선택</option>
                    {branches.map((b) => (
                      <option key={b.code} value={b.code}>{b.name}</option>
                    ))}
                  </select>
                )}

                {pushTargetType === 'jobType' && (
                  <select value={pushJobType} onChange={(e) => setPushJobType(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm min-h-[40px]">
                    <option value="">직무 선택</option>
                    {['재배', '포장', '관리', '기타'].map((j) => (
                      <option key={j} value={j}>{j}</option>
                    ))}
                  </select>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="flex gap-2 mt-4">
          <Button className="flex-1" onClick={handleAdd} disabled={pushing}>
            {pushing ? '발송 중...' : '게시'}
          </Button>
          <Button className="flex-1" variant="secondary" onClick={() => setShowModal(false)} disabled={pushing}>
            취소
          </Button>
        </div>
      </Modal>
    </div>
  );
}
