import { useState, useMemo, useEffect, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import useAuthStore from '../../stores/authStore';
import useGrowthSurveyStore from '../../stores/growthSurveyStore';
import useTaskStore from '../../stores/taskStore';
import useCropStore from '../../stores/cropStore';
import useZoneStore from '../../stores/zoneStore';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';

// 숫자 스테퍼 컴포넌트 (장갑 착용 고려, 큰 터치 타겟)
function Stepper({ value, onChange, step = 1, min = 0 }) {
  const num = value === '' ? '' : Number(value);

  const decrement = () => {
    const next = Math.max(min, (num || 0) - step);
    onChange(String(parseFloat(next.toFixed(2))));
  };
  const increment = () => {
    const next = (num || 0) + step;
    onChange(String(parseFloat(next.toFixed(2))));
  };

  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        onClick={decrement}
        className="w-12 h-12 rounded-lg bg-gray-100 text-gray-700 text-xl font-bold flex items-center justify-center active:bg-gray-200 transition-colors flex-shrink-0"
      >
        −
      </button>
      <input
        type="number"
        inputMode="decimal"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="flex-1 h-12 border border-gray-200 rounded-lg px-2 text-center text-base font-medium min-w-0"
      />
      <button
        type="button"
        onClick={increment}
        className="w-12 h-12 rounded-lg bg-gray-100 text-gray-700 text-xl font-bold flex items-center justify-center active:bg-gray-200 transition-colors flex-shrink-0"
      >
        +
      </button>
    </div>
  );
}

const measureFields = [
  { key: 'plantHeight', label: '초장', unit: 'cm', step: 0.5 },
  { key: 'stemDiameter', label: '경경', unit: 'mm', step: 0.1 },
  { key: 'leafCount', label: '엽수', unit: '매', step: 1 },
  { key: 'trussNumber', label: '화방', unit: '번째', step: 1 },
  { key: 'fruitCount', label: '착과수', unit: '개', step: 1 },
  { key: 'fruitWeight', label: '과중', unit: 'g', step: 0.5 },
];

const emptyEntry = {
  zoneId: '',
  rowNumber: '',
  plantNumber: '',
  plantHeight: '',
  stemDiameter: '',
  leafCount: '',
  trussNumber: '',
  fruitCount: '',
  fruitWeight: '',
};

function draftKey(taskId) {
  return taskId ? `survey_draft_${taskId}` : 'survey_draft_standalone';
}

export default function GrowthSurveyPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const taskId = searchParams.get('taskId');

  const currentUser = useAuthStore((s) => s.currentUser);
  const surveys = useGrowthSurveyStore((s) => s.surveys);
  const addSurvey = useGrowthSurveyStore((s) => s.addSurvey);
  const tasks = useTaskStore((s) => s.tasks);
  const completeTask = useTaskStore((s) => s.completeTask);
  const crops = useCropStore((s) => s.crops);
  const zones = useZoneStore((s) => s.zones);

  const task = useMemo(() => tasks.find((t) => t.id === taskId), [tasks, taskId]);
  const activeCrops = useMemo(() => crops.filter((c) => c.isActive), [crops]);
  const cropMap = useMemo(() => Object.fromEntries(crops.map((c) => [c.id, c])), [crops]);
  const zoneMap = useMemo(() => Object.fromEntries(zones.map((z) => [z.id, z])), [zones]);

  // 임시저장: localStorage에서 불러오기
  const [entries, setEntries] = useState(() => {
    try {
      const saved = localStorage.getItem(draftKey(taskId));
      if (saved) return JSON.parse(saved);
    } catch {}
    return [];
  });

  // 현재 입력 중인 폼
  const [currentForm, setCurrentForm] = useState(() => {
    // 작업에 연결된 cropId가 있으면 기본값으로 사용
    return { ...emptyEntry };
  });
  const [submitting, setSubmitting] = useState(false);
  const [editIndex, setEditIndex] = useState(null); // 수정 중인 항목 인덱스

  // entries 변경 시 localStorage 저장
  useEffect(() => {
    try {
      localStorage.setItem(draftKey(taskId), JSON.stringify(entries));
    } catch {}
  }, [entries, taskId]);

  const setField = useCallback((key, value) => {
    setCurrentForm((f) => ({ ...f, [key]: value }));
  }, []);

  const canAddEntry = currentForm.rowNumber && currentForm.plantNumber;

  const handleAddEntry = () => {
    if (!canAddEntry) return;
    if (editIndex !== null) {
      // 수정 모드
      setEntries((prev) => prev.map((e, i) => (i === editIndex ? { ...currentForm } : e)));
      setEditIndex(null);
    } else {
      setEntries((prev) => [...prev, { ...currentForm }]);
    }
    // 열/주 번호 자동 증가 (같은 구역 연속 입력 편의)
    const nextPlant = currentForm.plantNumber ? String(Number(currentForm.plantNumber) + 1) : '';
    setCurrentForm({
      ...emptyEntry,
      zoneId: currentForm.zoneId,
      rowNumber: currentForm.rowNumber,
      plantNumber: nextPlant,
    });
  };

  const handleEditEntry = (idx) => {
    setCurrentForm({ ...entries[idx] });
    setEditIndex(idx);
  };

  const handleDeleteEntry = (idx) => {
    setEntries((prev) => prev.filter((_, i) => i !== idx));
    if (editIndex === idx) {
      setEditIndex(null);
      setCurrentForm({ ...emptyEntry });
    }
  };

  const handleSubmit = async () => {
    if (entries.length === 0) return;
    if (submitting) return;
    setSubmitting(true);

    const today = new Date().toISOString().split('T')[0];
    const cropId = task?.cropId || null;

    for (const e of entries) {
      await addSurvey({
        workerId: currentUser.id,
        surveyDate: today,
        cropId,
        zoneId: e.zoneId || null,
        rowNumber: e.rowNumber ? Number(e.rowNumber) : null,
        plantNumber: e.plantNumber ? Number(e.plantNumber) : null,
        plantHeight: e.plantHeight ? Number(e.plantHeight) : null,
        stemDiameter: e.stemDiameter ? Number(e.stemDiameter) : null,
        leafCount: e.leafCount ? Number(e.leafCount) : null,
        trussNumber: e.trussNumber ? Number(e.trussNumber) : null,
        fruitCount: e.fruitCount ? Number(e.fruitCount) : null,
        fruitWeight: e.fruitWeight ? Number(e.fruitWeight) : null,
        notes: '',
        photos: [],
      });
    }

    // 작업 완료 처리
    if (taskId) {
      await completeTask(taskId, null);
    }

    // 임시저장 삭제
    try { localStorage.removeItem(draftKey(taskId)); } catch {}

    setSubmitting(false);
    navigate(-1);
  };

  // 최근 조사 목록 (task-linked 아닐 때)
  const recentSurveys = useMemo(
    () => surveys
      .filter((s) => s.workerId === currentUser?.id)
      .sort((a, b) => b.surveyDate.localeCompare(a.surveyDate))
      .slice(0, 10),
    [surveys, currentUser]
  );

  return (
    <div className="pb-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-heading font-semibold text-gray-900">생육 조사</h2>
          {task && (
            <p className="text-sm text-gray-400 mt-0.5">{task.title}</p>
          )}
        </div>
        {taskId && (
          <button onClick={() => navigate(-1)} className="text-sm text-gray-400 px-2 py-1">
            취소
          </button>
        )}
      </div>

      {/* 입력 폼 */}
      <Card accent="blue" className="p-4 mb-4">
        <div className="text-sm font-semibold text-gray-700 mb-3">
          {editIndex !== null ? `${editIndex + 1}번 항목 수정` : '측정값 입력'}
        </div>

        {/* 구역 선택 */}
        {zones.length > 0 && (
          <div className="mb-3">
            <label className="block text-xs font-medium text-gray-500 mb-1">구역</label>
            <select
              value={currentForm.zoneId}
              onChange={(e) => setField('zoneId', e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-3 text-sm min-h-[48px]"
            >
              <option value="">선택 안 함</option>
              {zones.map((z) => <option key={z.id} value={z.id}>{z.name}</option>)}
            </select>
          </div>
        )}

        {/* 열 번호 / 주 번호 */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">열 번호</label>
            <Stepper value={currentForm.rowNumber} onChange={(v) => setField('rowNumber', v)} step={1} min={1} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">주 번호</label>
            <Stepper value={currentForm.plantNumber} onChange={(v) => setField('plantNumber', v)} step={1} min={1} />
          </div>
        </div>

        {/* 측정 필드 */}
        <div className="space-y-3 mb-4">
          {measureFields.map((f) => (
            <div key={f.key}>
              <label className="block text-xs font-medium text-gray-500 mb-1">
                {f.label} <span className="text-gray-400">({f.unit})</span>
              </label>
              <Stepper
                value={currentForm[f.key]}
                onChange={(v) => setField(f.key, v)}
                step={f.step}
              />
            </div>
          ))}
        </div>

        <button
          onClick={handleAddEntry}
          disabled={!canAddEntry}
          className={`w-full py-3 rounded-xl text-sm font-semibold transition-colors min-h-[48px] ${
            canAddEntry
              ? 'bg-blue-600 text-white active:bg-blue-700'
              : 'bg-gray-100 text-gray-400'
          }`}
        >
          {editIndex !== null ? '수정 완료' : '+ 조사 추가'}
        </button>
        {!canAddEntry && (
          <p className="text-xs text-gray-400 text-center mt-1">열 번호와 주 번호를 입력하세요</p>
        )}
      </Card>

      {/* 누적된 조사 항목 */}
      {entries.length > 0 && (
        <div className="mb-4">
          <div className="text-sm font-semibold text-gray-700 mb-2">
            조사 항목 ({entries.length}건)
          </div>
          <div className="space-y-2">
            {entries.map((e, idx) => (
              <Card key={idx} accent={editIndex === idx ? 'blue' : 'gray'} className="p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="text-xs font-semibold text-gray-500">#{idx + 1}</span>
                      {e.zoneId && (
                        <span className="text-xs bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded">
                          {zoneMap[e.zoneId]?.name || '구역'}
                        </span>
                      )}
                      <span className="text-sm font-medium text-gray-800">
                        {e.rowNumber}열 {e.plantNumber}번주
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-x-3 gap-y-0.5">
                      {measureFields.map((f) =>
                        e[f.key] ? (
                          <div key={f.key} className="text-xs text-gray-500">
                            <span className="text-gray-400">{f.label} </span>
                            <span className="font-medium text-gray-700">{e[f.key]}{f.unit}</span>
                          </div>
                        ) : null
                      )}
                    </div>
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    <button
                      onClick={() => handleEditEntry(idx)}
                      className="px-2 py-1.5 text-xs text-blue-600 bg-blue-50 rounded-lg active:bg-blue-100"
                    >
                      수정
                    </button>
                    <button
                      onClick={() => handleDeleteEntry(idx)}
                      className="px-2 py-1.5 text-xs text-red-500 bg-red-50 rounded-lg active:bg-red-100"
                    >
                      삭제
                    </button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* 제출 버튼 */}
      {entries.length > 0 && (
        <Button
          size="lg"
          className="w-full"
          onClick={handleSubmit}
          disabled={submitting}
        >
          {submitting
            ? '저장 중...'
            : taskId
            ? `제출하기 (${entries.length}건) · 작업 완료`
            : `저장하기 (${entries.length}건)`}
        </Button>
      )}

      {/* 최근 조사 목록 (task-linked 아닐 때만) */}
      {!taskId && recentSurveys.length > 0 && (
        <div className="mt-6">
          <div className="text-sm font-semibold text-gray-700 mb-2">최근 조사 기록</div>
          <div className="space-y-2">
            {recentSurveys.map((s) => (
              <Card key={s.id} accent="gray" className="p-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-gray-800">{s.surveyDate}</span>
                  <div className="flex items-center gap-2 text-xs text-gray-400">
                    {s.cropId && (
                      <span className="bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded-full font-medium">
                        {cropMap[s.cropId]?.name}
                      </span>
                    )}
                    <span>{zoneMap[s.zoneId]?.name} {s.rowNumber}열 {s.plantNumber}번주</span>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-x-3 gap-y-0.5">
                  {measureFields.map((f) =>
                    s[f.key] != null ? (
                      <div key={f.key} className="text-xs text-gray-500">
                        <span className="text-gray-400">{f.label} </span>
                        <span className="font-medium text-gray-700">{s[f.key]}{f.unit}</span>
                      </div>
                    ) : null
                  )}
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
