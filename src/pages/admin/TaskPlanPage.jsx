import { useState, useMemo } from 'react';
import useTaskStore from '../../stores/taskStore';
import useEmployeeStore from '../../stores/employeeStore';
import useCropStore from '../../stores/cropStore';
import useZoneStore from '../../stores/zoneStore';
import Button from '../../components/common/Button';
import Card from '../../components/common/Card';
import Modal from '../../components/common/Modal';
import { sendPushToEmployee } from '../../lib/pushNotify';

const statusMap = {
  pending: { label: '대기', color: 'bg-amber-100 text-amber-700' },
  in_progress: { label: '진행', color: 'bg-blue-100 text-blue-700' },
  completed: { label: '완료', color: 'bg-green-100 text-green-700' },
};

const emptyForm = {
  workerId: '',
  cropId: '',
  taskType: '',
  zoneId: '',
  rowRange: '',
  estimatedMinutes: 60,
  quantityUnit: 'kg',
  description: '',
};

export default function TaskPlanPage() {
  const tasks = useTaskStore((s) => s.tasks);
  const addTask = useTaskStore((s) => s.addTask);
  const deleteTask = useTaskStore((s) => s.deleteTask);
  const employees = useEmployeeStore((s) => s.employees);
  const crops = useCropStore((s) => s.crops);
  const zones = useZoneStore((s) => s.zones);

  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const workers = useMemo(() => employees.filter((e) => e.role === 'worker' && e.isActive), [employees]);
  const activeCrops = useMemo(() => crops.filter((c) => c.isActive), [crops]);

  const selectedCrop = useMemo(() => crops.find((c) => c.id === form.cropId), [crops, form.cropId]);
  const taskTypes = selectedCrop?.taskTypes || [];

  const empMap = useMemo(() => Object.fromEntries(employees.map((e) => [e.id, e])), [employees]);
  const cropMap = useMemo(() => Object.fromEntries(crops.map((c) => [c.id, c])), [crops]);
  const zoneMap = useMemo(() => Object.fromEntries(zones.map((z) => [z.id, z])), [zones]);

  const dayTasks = useMemo(
    () => tasks.filter((t) => t.date === selectedDate).sort((a, b) => {
      const order = { pending: 0, in_progress: 1, completed: 2 };
      return (order[a.status] ?? 3) - (order[b.status] ?? 3);
    }),
    [tasks, selectedDate]
  );

  const handleAdd = async () => {
    if (!form.workerId || !form.cropId || !form.taskType || !form.zoneId) return;
    const crop = cropMap[form.cropId];
    const zone = zoneMap[form.zoneId];
    const title = `${crop?.name || ''} ${form.taskType}`;
    await addTask({
      ...form,
      date: selectedDate,
      title,
      description: `${zone?.name || ''} ${form.rowRange ? form.rowRange + '열' : ''} ${crop?.name || ''} ${form.taskType}`,
      quantity: null,
    });
    // 배정된 작업자에게 푸시 발송 (실패해도 무시)
    sendPushToEmployee({
      employeeId: form.workerId,
      title: '새 작업이 배정되었습니다',
      body: `${selectedDate} · ${title} (${zone?.name || ''})`,
      type: 'task',
    }).catch(() => {});
    setForm(emptyForm);
    setShowModal(false);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-heading font-semibold text-gray-900">작업 계획</h2>
        <Button onClick={() => setShowModal(true)}>+ 작업 배정</Button>
      </div>

      <div className="mb-4">
        <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm min-h-[44px]" />
      </div>

      <div className="space-y-3">
        {dayTasks.length === 0 && (
          <p className="text-gray-400 text-sm text-center py-8">해당 날짜에 배정된 작업이 없습니다</p>
        )}
        {dayTasks.map((task) => {
          const st = statusMap[task.status] || statusMap.pending;
          return (
            <Card key={task.id} accent={task.status === 'completed' ? 'blue' : task.status === 'in_progress' ? 'blue' : 'amber'} className="p-4">
              <div className="flex items-center justify-between mb-1">
                <span className="font-medium text-gray-900">{task.title}</span>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${st.color}`}>{st.label}</span>
              </div>
              <div className="text-sm text-gray-500 mb-2">
                {empMap[task.workerId]?.name || '미배정'} · {zoneMap[task.zoneId]?.name || ''} {task.rowRange && `${task.rowRange}열`} · 예상 {task.estimatedMinutes}분
              </div>
              {task.status === 'completed' && task.quantity && (
                <div className="text-sm text-blue-600">수량: {task.quantity}{task.quantityUnit}</div>
              )}
              {task.status === 'pending' && (
                <Button size="sm" variant="danger" onClick={() => deleteTask(task.id)}>삭제</Button>
              )}
            </Card>
          );
        })}
      </div>

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="작업 배정">
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">작업자</label>
            <select value={form.workerId} onChange={(e) => setForm({ ...form, workerId: e.target.value })}
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm min-h-[44px]">
              <option value="">선택</option>
              {workers.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">작물</label>
            <select value={form.cropId} onChange={(e) => setForm({ ...form, cropId: e.target.value, taskType: '' })}
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm min-h-[44px]">
              <option value="">선택</option>
              {activeCrops.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          {taskTypes.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">작업 유형</label>
              <div className="flex flex-wrap gap-2">
                {taskTypes.map((t) => (
                  <button key={t} onClick={() => setForm({ ...form, taskType: t })}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium min-h-[36px] transition-colors ${
                      form.taskType === t ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'
                    }`}>{t}</button>
                ))}
              </div>
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">구역</label>
            <select value={form.zoneId} onChange={(e) => setForm({ ...form, zoneId: e.target.value })}
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm min-h-[44px]">
              <option value="">선택</option>
              {zones.map((z) => <option key={z.id} value={z.id}>{z.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">열 범위</label>
            <input type="text" value={form.rowRange} onChange={(e) => setForm({ ...form, rowRange: e.target.value })}
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm min-h-[44px]" placeholder="예: 1-8" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">예상 시간(분)</label>
              <input type="number" value={form.estimatedMinutes} onChange={(e) => setForm({ ...form, estimatedMinutes: Number(e.target.value) })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm min-h-[44px]" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">수량 단위</label>
              <select value={form.quantityUnit} onChange={(e) => setForm({ ...form, quantityUnit: e.target.value })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm min-h-[44px]">
                <option value="kg">kg</option>
                <option value="개">개</option>
                <option value="매">매</option>
                <option value="">없음</option>
              </select>
            </div>
          </div>
        </div>
        <div className="flex gap-2 mt-4">
          <Button className="flex-1" onClick={handleAdd}>배정</Button>
          <Button className="flex-1" variant="secondary" onClick={() => setShowModal(false)}>취소</Button>
        </div>
      </Modal>
    </div>
  );
}
