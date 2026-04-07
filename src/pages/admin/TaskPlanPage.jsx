import { useState, useMemo } from 'react';
import useTaskStore from '../../stores/taskStore';
import useEmployeeStore from '../../stores/employeeStore';
import useCropStore from '../../stores/cropStore';
import useBranchFilter from '../../hooks/useBranchFilter';
import Button from '../../components/common/Button';
import Card from '../../components/common/Card';
import Modal from '../../components/common/Modal';

const statusMap = {
  pending: { label: '대기', color: 'bg-amber-100 text-amber-700' },
  in_progress: { label: '진행', color: 'bg-blue-100 text-blue-700' },
  completed: { label: '완료', color: 'bg-green-100 text-green-700' },
};

const emptyForm = {
  cropId: '',
  taskType: '',
  workerIds: [],
  title: '',
  memo: '',
};

export default function TaskPlanPage() {
  const tasks = useTaskStore((s) => s.tasks);
  const addTask = useTaskStore((s) => s.addTask);
  const deleteTask = useTaskStore((s) => s.deleteTask);
  const employees = useEmployeeStore((s) => s.employees);
  const crops = useCropStore((s) => s.crops);
  const { branchFilter } = useBranchFilter();

  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);

  // 지점 필터 적용한 작업자 목록
  const workers = useMemo(() =>
    employees.filter((e) =>
      e.role === 'worker' &&
      e.isActive &&
      (!branchFilter || e.branch === branchFilter)
    ),
    [employees, branchFilter]
  );

  const activeCrops = useMemo(() => crops.filter((c) => c.isActive), [crops]);

  const selectedCrop = useMemo(() => crops.find((c) => c.id === form.cropId), [crops, form.cropId]);
  const taskTypes = selectedCrop?.taskTypes || [];

  const empMap = useMemo(() => Object.fromEntries(employees.map((e) => [e.id, e])), [employees]);
  const cropMap = useMemo(() => Object.fromEntries(crops.map((c) => [c.id, c])), [crops]);

  const dayTasks = useMemo(
    () => tasks
      .filter((t) => {
        if (t.date !== selectedDate) return false;
        if (branchFilter) {
          const worker = empMap[t.workerId];
          if (worker && worker.branch !== branchFilter) return false;
        }
        return true;
      })
      .sort((a, b) => {
        const order = { pending: 0, in_progress: 1, completed: 2 };
        return (order[a.status] ?? 3) - (order[b.status] ?? 3);
      }),
    [tasks, selectedDate, branchFilter, empMap]
  );

  // 작업자 선택 토글
  const toggleWorker = (workerId) => {
    setForm((f) => ({
      ...f,
      workerIds: f.workerIds.includes(workerId)
        ? f.workerIds.filter((id) => id !== workerId)
        : [...f.workerIds, workerId],
    }));
  };

  const resetForm = () => setForm(emptyForm);

  const handleCropChange = (cropId) => {
    setForm((f) => ({
      ...f,
      cropId,
      taskType: '',
      title: '',
    }));
  };

  const handleTaskTypeChange = (taskType) => {
    const crop = cropMap[form.cropId];
    const autoTitle = crop ? `${crop.name} ${taskType}` : taskType;
    setForm((f) => ({ ...f, taskType, title: autoTitle }));
  };

  const handleAdd = async () => {
    if (!form.cropId || !form.taskType || form.workerIds.length === 0) return;
    if (submitting) return;
    setSubmitting(true);

    const crop = cropMap[form.cropId];
    const title = form.title.trim() || `${crop?.name || ''} ${form.taskType}`;

    await Promise.all(
      form.workerIds.map((workerId) =>
        addTask({
          workerId,
          cropId: form.cropId,
          taskType: form.taskType,
          title,
          description: form.memo || null,
          date: selectedDate,
          zoneId: null,
          rowRange: null,
          estimatedMinutes: null,
          quantityUnit: null,
        })
      )
    );

    setSubmitting(false);
    resetForm();
    setShowModal(false);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-heading font-semibold text-gray-900">작업 배정</h2>
        <Button onClick={() => { resetForm(); setShowModal(true); }}>+ 작업 배정</Button>
      </div>

      <div className="mb-4">
        <input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm min-h-[44px]"
        />
      </div>

      <div className="space-y-3">
        {dayTasks.length === 0 && (
          <p className="text-gray-400 text-sm text-center py-8">해당 날짜에 배정된 작업이 없습니다</p>
        )}
        {dayTasks.map((task) => {
          const st = statusMap[task.status] || statusMap.pending;
          return (
            <Card
              key={task.id}
              accent={task.status === 'completed' ? 'emerald' : task.status === 'in_progress' ? 'blue' : 'amber'}
              className="p-4"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-medium text-gray-900">{task.title}</span>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${st.color}`}>{st.label}</span>
              </div>
              <div className="text-sm text-gray-500 mb-1">
                {empMap[task.workerId]?.name || '미배정'} · {cropMap[task.cropId]?.name || ''} · {task.taskType}
              </div>
              {task.description && (
                <p className="text-xs text-gray-400 mb-2">{task.description}</p>
              )}
              {task.status === 'pending' && (
                <Button size="sm" variant="danger" onClick={() => deleteTask(task.id)}>삭제</Button>
              )}
            </Card>
          );
        })}
      </div>

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="작업 배정">
        <div className="space-y-4">
          {/* 1. 작물 선택 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">작물</label>
            <select
              value={form.cropId}
              onChange={(e) => handleCropChange(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm min-h-[44px]"
            >
              <option value="">선택</option>
              {activeCrops.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          {/* 2. 작업 유형 (작물 선택 후 표시) */}
          {form.cropId && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">작업 유형</label>
              {taskTypes.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {taskTypes.map((t) => (
                    <button
                      key={t}
                      onClick={() => handleTaskTypeChange(t)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium min-h-[36px] transition-colors ${
                        form.taskType === t ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-gray-400">해당 작물에 등록된 작업 유형이 없습니다</p>
              )}
            </div>
          )}

          {/* 3. 작업자 복수 선택 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              작업자
              {form.workerIds.length > 0 && (
                <span className="ml-1.5 text-emerald-600 text-xs">{form.workerIds.length}명 선택</span>
              )}
            </label>
            <div className="border border-gray-200 rounded-lg overflow-hidden max-h-48 overflow-y-auto">
              {workers.length === 0 ? (
                <p className="text-gray-400 text-sm text-center py-4">작업자가 없습니다</p>
              ) : (
                workers.map((w) => (
                  <button
                    key={w.id}
                    onClick={() => toggleWorker(w.id)}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm text-left transition-colors border-b border-gray-50 last:border-0 ${
                      form.workerIds.includes(w.id)
                        ? 'bg-emerald-50 text-emerald-700'
                        : 'hover:bg-gray-50 text-gray-700'
                    }`}
                  >
                    <span className={`w-4 h-4 rounded flex-shrink-0 border-2 flex items-center justify-center ${
                      form.workerIds.includes(w.id) ? 'bg-emerald-600 border-emerald-600' : 'border-gray-300'
                    }`}>
                      {form.workerIds.includes(w.id) && (
                        <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </span>
                    <span className="font-medium">{w.name}</span>
                    {w.jobType && <span className="text-gray-400 text-xs">{w.jobType}</span>}
                  </button>
                ))
              )}
            </div>
          </div>

          {/* 4. 작업 제목 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">작업 제목</label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm min-h-[44px]"
              placeholder="자동 생성 (수정 가능)"
            />
          </div>

          {/* 5. 메모 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">메모 (선택)</label>
            <textarea
              value={form.memo}
              onChange={(e) => setForm({ ...form, memo: e.target.value })}
              rows={2}
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm"
              placeholder="작업 관련 메모"
            />
          </div>
        </div>

        <div className="flex gap-2 mt-4">
          <Button
            className="flex-1"
            onClick={handleAdd}
            disabled={submitting || !form.cropId || !form.taskType || form.workerIds.length === 0}
          >
            {submitting ? '배정 중...' : `배정${form.workerIds.length > 1 ? ` (${form.workerIds.length}명)` : ''}`}
          </Button>
          <Button className="flex-1" variant="secondary" onClick={() => setShowModal(false)}>취소</Button>
        </div>
      </Modal>
    </div>
  );
}
