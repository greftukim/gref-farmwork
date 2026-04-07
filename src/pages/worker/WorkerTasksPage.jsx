import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '../../stores/authStore';
import useTaskStore from '../../stores/taskStore';
import useCropStore from '../../stores/cropStore';
import useZoneStore from '../../stores/zoneStore';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import BottomSheet from '../../components/common/BottomSheet';

const SURVEY_TASK_TYPE = '생육 조사';

function Timer({ startedAt }) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!startedAt) return;
    const start = new Date(startedAt).getTime();
    const tick = () => setElapsed(Math.floor((Date.now() - start) / 1000));
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [startedAt]);

  const h = Math.floor(elapsed / 3600);
  const m = Math.floor((elapsed % 3600) / 60);
  const s = elapsed % 60;
  const pad = (n) => String(n).padStart(2, '0');

  return (
    <span className="font-mono text-lg font-bold text-blue-600">
      {pad(h)}:{pad(m)}:{pad(s)}
    </span>
  );
}

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

  const [completeTarget, setCompleteTarget] = useState(null);
  const [quantity, setQuantity] = useState('');

  const today = new Date().toISOString().split('T')[0];

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

  const handleComplete = () => {
    if (!completeTarget) return;
    completeTask(completeTarget.id, quantity ? Number(quantity) : null);
    setCompleteTarget(null);
    setQuantity('');
  };

  return (
    <div>
      <h2 className="text-lg font-heading font-semibold text-gray-900 mb-4">오늘의 작업</h2>

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
                {zone?.name} {task.rowRange && `${task.rowRange}열`} · 예상 {task.estimatedMinutes}분
              </div>

              {task.status === 'in_progress' && (
                <div className="flex items-center justify-between mb-3">
                  <Timer startedAt={task.startedAt} />
                </div>
              )}

              {task.status === 'completed' && (
                <div className="text-sm text-gray-500 mb-2">
                  소요 {task.durationMinutes}분
                  {task.quantity != null && ` · ${task.quantity}${task.quantityUnit}`}
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
                      <Button size="lg" className="flex-1" onClick={() => startTask(task.id)}>
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
    </div>
  );
}
