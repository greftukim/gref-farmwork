import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '../../stores/authStore';
import useTaskStore from '../../stores/taskStore';
import useCropStore from '../../stores/cropStore';
import useZoneStore from '../../stores/zoneStore';
import useSafetyCheckStore from '../../stores/safetyCheckStore';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import BottomSheet from '../../components/common/BottomSheet';
import SafetyCheckBottomSheet from '../../components/worker/SafetyCheckBottomSheet';

const SURVEY_TASK_TYPE = '생육 조사';

const statusMap = {
  pending: { label: '대기', color: 'bg-amber-100 text-amber-700' },
  in_progress: { label: '진행 중', color: 'bg-blue-100 text-blue-700' },
  completed: { label: '완료', color: 'bg-green-100 text-green-700' },
};

export default function WorkerTasksPage() {
  const navigate = useNavigate();
  const currentUser = useAuthStore((s) => s.currentUser);
  const tasks = useTaskStore((s) => s.tasks);
  const startTask = useTaskStore((s) => s.startTask);
  const completeTask = useTaskStore((s) => s.completeTask);
  const crops = useCropStore((s) => s.crops);
  const zones = useZoneStore((s) => s.zones);
  const getTodayCheck = useSafetyCheckStore((s) => s.getTodayCheck);

  const [completeTarget, setCompleteTarget] = useState(null);
  const [quantity, setQuantity] = useState('');
  const [tbmModal, setTbmModal] = useState({ open: false, cropIds: [], taskIds: [], taskTitles: [] });
  const [pendingTaskId, setPendingTaskId] = useState(null);
  const [todayCheck, setTodayCheck] = useState(null);

  const today = new Date().toISOString().split('T')[0];

  useEffect(() => {
    if (!currentUser) return;
    getTodayCheck(currentUser.id, 'pre_task')
      .then((check) => setTodayCheck(check))
      .catch(() => {});
  }, []);

  const cropMap = useMemo(() => Object.fromEntries(crops.map((c) => [c.id, c])), [crops]);
  const zoneMap = useMemo(() => Object.fromEntries(zones.map((z) => [z.id, z])), [zones]);

  const myTasks = useMemo(
    () => tasks
      .filter((t) => t.workerId === currentUser?.id && t.date === today)
      .sort((a, b) => {
        const order = { in_progress: 0, pending: 1, completed: 2 };
        return (order[a.status] ?? 3) - (order[b.status] ?? 3);
      }),
    [tasks, currentUser, today]
  );

  const handleStartTask = async (taskId) => {
    let existingCheck = null;
    try {
      existingCheck = await getTodayCheck(currentUser.id, 'pre_task');
    } catch (e) {
      console.error('TBM 조회 실패:', e);
    }

    if (existingCheck) {
      if (existingCheck.status === 'submitted') {
        alert('반장 승인 대기 중입니다. 승인 후 작업을 시작할 수 있습니다.');
        return;
      }
      if (existingCheck.status === 'approved') {
        try {
          await startTask(taskId);
        } catch (e) {
          console.error('작업 시작 실패:', e);
          alert('작업 시작 실패: ' + (e.message || '알 수 없는 오류'));
        }
        return;
      }
    }

    // 미제출 → TBM 모달
    const cropIds = Array.from(
      new Set(myTasks.map((t) => t.cropId).filter(Boolean))
    );
    const taskIds = myTasks.map((t) => t.id);
    const taskTitles = myTasks.map((t) => t.title).filter(Boolean);

    setPendingTaskId(taskId);
    setTbmModal({ open: true, cropIds, taskIds, taskTitles });
  };

  const handlePreTaskComplete = async (checkId) => {
    setTbmModal({ open: false, cropIds: [], taskIds: [], taskTitles: [] });
    setPendingTaskId(null);
    // TBM 제출 후 배너 갱신 (startTask 호출 없음 — 반장 승인 대기)
    try {
      const check = await getTodayCheck(currentUser.id, 'pre_task');
      setTodayCheck(check);
    } catch (e) {
      // 조용히 실패
    }
    alert('TBM이 제출되었습니다. 반장 승인 후 작업을 시작할 수 있습니다.');
  };

  const handleTbmClose = () => {
    setTbmModal({ open: false, cropIds: [], taskIds: [], taskTitles: [] });
    setPendingTaskId(null);
  };

  const handleComplete = () => {
    if (!completeTarget) return;
    completeTask(completeTarget.id, quantity ? Number(quantity) : null);
    setCompleteTarget(null);
    setQuantity('');
  };

  return (
    <div>
      <h2 className="text-lg font-heading font-semibold text-gray-900 mb-4">오늘의 작업</h2>

      {todayCheck?.status === 'submitted' && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-3 flex items-center gap-2">
          <span className="text-red-600">⛔</span>
          <div className="flex-1">
            <div className="text-sm font-medium text-red-900">반장 승인 대기 중</div>
            <div className="text-xs text-red-700">반장 승인 후에만 작업 시작이 가능합니다.</div>
          </div>
        </div>
      )}

      {myTasks.length === 0 && (
        <p className="text-gray-400 text-sm text-center py-12">배정된 작업이 없습니다</p>
      )}

      <div className="space-y-3">
        {myTasks.map((task) => {
          const st = statusMap[task.status];
          const zone = zoneMap[task.zoneId];
          const crop = cropMap[task.cropId];
          return (
            <Card
              key={task.id}
              accent={task.status === 'completed' ? 'blue' : task.status === 'in_progress' ? 'blue' : 'amber'}
              className="p-4"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium text-gray-900">{task.title}</span>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${st.color}`}>{st.label}</span>
              </div>

              <div className="text-sm text-gray-500 mb-3">
                {[zone?.name, task.rowRange && `${task.rowRange}열`].filter(Boolean).join(' ')}
              </div>

              {task.status === 'completed' && task.quantity != null && (
                <div className="text-sm text-gray-500 mb-2">
                  {task.quantity}{task.quantityUnit}
                </div>
              )}

              <div className="flex gap-2">
                {task.taskType === SURVEY_TASK_TYPE ? (
                  task.status !== 'completed' && (
                    <Button size="lg" className="flex-1" onClick={() => navigate(`/worker/survey?taskId=${task.id}`)}>
                      생육 조사 입력
                    </Button>
                  )
                ) : (
                  <>
                    {task.status === 'pending' && (
                      <Button
                        size="lg"
                        className={`flex-1 ${todayCheck?.status === 'submitted' ? 'opacity-50' : ''}`}
                        disabled={todayCheck?.status === 'submitted'}
                        onClick={() => handleStartTask(task.id)}
                      >
                        작업 시작
                      </Button>
                    )}
                    {task.status === 'in_progress' && (
                      <Button size="lg" className="flex-1" onClick={() => { setCompleteTarget(task); setQuantity(''); }}>
                        작업 완료
                      </Button>
                    )}
                  </>
                )}
              </div>
            </Card>
          );
        })}
      </div>

      <BottomSheet
        isOpen={!!completeTarget}
        onClose={() => setCompleteTarget(null)}
        title="작업 완료"
      >
        <div className="mb-4">
          <p className="text-sm text-gray-500 mb-3">{completeTarget?.title}</p>
          {completeTarget?.quantityUnit && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                수량 ({completeTarget.quantityUnit})
              </label>
              <input
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm min-h-[44px]"
                placeholder="작업 수량 입력"
              />
            </div>
          )}
        </div>
        <Button size="lg" className="w-full" onClick={handleComplete}>
          완료 처리
        </Button>
      </BottomSheet>

      <SafetyCheckBottomSheet
        isOpen={tbmModal.open}
        onClose={handleTbmClose}
        checkType="pre_task"
        workerId={currentUser?.id}
        cropIds={tbmModal.cropIds}
        taskIds={tbmModal.taskIds}
        taskTitles={tbmModal.taskTitles}
        onPreTaskComplete={handlePreTaskComplete}
      />
    </div>
  );
}
