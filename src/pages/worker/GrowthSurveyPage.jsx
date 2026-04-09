import { useState, useMemo, useEffect, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import useAuthStore from '../../stores/authStore';
import useGrowthSurveyStore from '../../stores/growthSurveyStore';
import useGrowthSurveyItemStore from '../../stores/growthSurveyItemStore';
import useTaskStore from '../../stores/taskStore';
import useZoneStore from '../../stores/zoneStore';
import useCropStore from '../../stores/cropStore';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';

const BUSAN_COMPARTMENTS = [
  { cmp: 1, label: '1cmp (토마토)', cropName: '토마토', maxGutter: 10 },
  { cmp: 2, label: '2cmp (미니파프리카)', cropName: '미니파프리카', maxGutter: 10 },
  { cmp: 3, label: '3cmp (오이)', cropName: '오이', maxGutter: 8 },
  { cmp: 4, label: '4cmp (딸기)', cropName: '딸기', maxGutter: 10 },
];

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

function draftKey(taskId) {
  return taskId ? `survey_draft_${taskId}` : 'survey_draft_standalone';
}

function makeEmptyEntry(cropItems) {
  const entry = { zoneId: '', rowNumber: '', plantNumber: '', compartment: '', gutterNumber: '', positionNumber: '' };
  cropItems.forEach((item) => { entry[item.id] = ''; });
  return entry;
}

export default function GrowthSurveyPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const taskId = searchParams.get('taskId');

  const currentUser = useAuthStore((s) => s.currentUser);
  const addSurvey = useGrowthSurveyStore((s) => s.addSurvey);
  const allItems = useGrowthSurveyItemStore((s) => s.items);
  const fetchItems = useGrowthSurveyItemStore((s) => s.fetchItems);
  const tasks = useTaskStore((s) => s.tasks);
  const completeTask = useTaskStore((s) => s.completeTask);
  const zones = useZoneStore((s) => s.zones);
  const crops = useCropStore((s) => s.crops);

  const isBusan = currentUser?.branch === 'busan';

  const task = useMemo(() => tasks.find((t) => t.id === taskId), [tasks, taskId]);

  // 항목이 없는 경우 로딩 후 재시도
  useEffect(() => {
    if (allItems.length === 0) fetchItems();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 임시저장: localStorage에서 불러오기
  const [entries, setEntries] = useState(() => {
    try {
      const saved = localStorage.getItem(draftKey(taskId));
      if (saved) return JSON.parse(saved);
    } catch {}
    return [];
  });

  const [currentForm, setCurrentForm] = useState(() => makeEmptyEntry([]));
  const [submitting, setSubmitting] = useState(false);
  const [editIndex, setEditIndex] = useState(null);

  // 부산: 컴파트먼트 선택 → 작물 자동 결정 / 그 외: task에서 결정
  const activeCropId = useMemo(() => {
    if (task?.cropId) return task.cropId;
    if (isBusan && currentForm.compartment) {
      const cfg = BUSAN_COMPARTMENTS.find((c) => c.cmp === Number(currentForm.compartment));
      if (cfg) {
        const crop = crops.find((c) => c.name === cfg.cropName);
        return crop?.id || null;
      }
    }
    return null;
  }, [task, isBusan, currentForm.compartment, crops]);

  const cropItems = useMemo(
    () => allItems.filter((i) => i.cropId === activeCropId),
    [allItems, activeCropId]
  );

  // cropItems 로드 완료 시 currentForm 초기화 (항목 키 반영)
  useEffect(() => {
    setCurrentForm((prev) => {
      const next = makeEmptyEntry(cropItems);
      // 기존에 입력한 공통 필드 유지
      next.zoneId = prev.zoneId || '';
      next.rowNumber = prev.rowNumber || '';
      next.plantNumber = prev.plantNumber || '';
      next.compartment = prev.compartment || '';
      next.gutterNumber = prev.gutterNumber || '';
      next.positionNumber = prev.positionNumber || '';
      return next;
    });
  }, [cropItems]);

  // entries 변경 시 localStorage 저장
  useEffect(() => {
    try {
      localStorage.setItem(draftKey(taskId), JSON.stringify(entries));
    } catch {}
  }, [entries, taskId]);

  const setField = useCallback((key, value) => {
    setCurrentForm((f) => ({ ...f, [key]: value }));
  }, []);

  const canAddEntry = isBusan
    ? currentForm.compartment && currentForm.gutterNumber && currentForm.positionNumber
    : currentForm.rowNumber && currentForm.plantNumber;

  const handleAddEntry = () => {
    if (!canAddEntry) return;
    if (editIndex !== null) {
      setEntries((prev) => prev.map((e, i) => (i === editIndex ? { ...currentForm } : e)));
      setEditIndex(null);
    } else {
      setEntries((prev) => [...prev, { ...currentForm }]);
    }
    if (isBusan) {
      const nextPos = currentForm.positionNumber ? String(Number(currentForm.positionNumber) + 1) : '';
      setCurrentForm({
        ...makeEmptyEntry(cropItems),
        compartment: currentForm.compartment,
        gutterNumber: currentForm.gutterNumber,
        positionNumber: nextPos,
      });
    } else {
      const nextPlant = currentForm.plantNumber ? String(Number(currentForm.plantNumber) + 1) : '';
      setCurrentForm({
        ...makeEmptyEntry(cropItems),
        zoneId: currentForm.zoneId,
        rowNumber: currentForm.rowNumber,
        plantNumber: nextPlant,
      });
    }
  };

  const handleEditEntry = (idx) => {
    setCurrentForm({ ...entries[idx] });
    setEditIndex(idx);
  };

  const handleDeleteEntry = (idx) => {
    setEntries((prev) => prev.filter((_, i) => i !== idx));
    if (editIndex === idx) {
      setEditIndex(null);
      setCurrentForm(makeEmptyEntry(cropItems));
    }
  };

  const handleSubmit = async () => {
    if (entries.length === 0 || submitting) return;
    setSubmitting(true);

    const today = new Date().toISOString().split('T')[0];

    for (const e of entries) {
      // 동적 항목을 measurements 배열로 변환
      const measurements = cropItems
        .map((item) => ({
          itemId: item.id,
          name: item.name,
          unit: item.unit || '',
          value: e[item.id] !== '' && e[item.id] != null ? e[item.id] : null,
        }))
        .filter((m) => m.value !== null);

      await addSurvey({
        workerId: currentUser.id,
        surveyDate: today,
        cropId: activeCropId,
        zoneId: isBusan ? null : (e.zoneId || null),
        rowNumber: isBusan ? null : (e.rowNumber ? Number(e.rowNumber) : null),
        plantNumber: isBusan ? null : (e.plantNumber ? Number(e.plantNumber) : null),
        compartment: isBusan ? (e.compartment ? Number(e.compartment) : null) : null,
        gutterNumber: isBusan ? (e.gutterNumber ? Number(e.gutterNumber) : null) : null,
        positionNumber: isBusan ? (e.positionNumber ? Number(e.positionNumber) : null) : null,
        measurements,
      });
    }

    if (taskId) await completeTask(taskId, null);

    try { localStorage.removeItem(draftKey(taskId)); } catch {}
    setSubmitting(false);
    navigate(-1);
  };

  const zoneMap = useMemo(() => Object.fromEntries(zones.map((z) => [z.id, z])), [zones]);

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

      {/* 조사 항목 없음 안내 */}
      {task && cropItems.length === 0 && (
        <div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-700">
          이 작물에 등록된 조사 항목이 없습니다. 관리자 화면의 [생육 조사 → 조사 항목]에서 먼저 항목을 등록해 주세요.
        </div>
      )}

      {/* 입력 폼 */}
      <Card accent="blue" className="p-4 mb-4">
        <div className="text-sm font-semibold text-gray-700 mb-3">
          {editIndex !== null ? `${editIndex + 1}번 항목 수정` : '측정값 입력'}
        </div>

        {/* 위치 입력: 부산 vs 기타 */}
        {isBusan ? (
          <>
            <div className="mb-3">
              <label className="block text-xs font-medium text-gray-500 mb-1">컴파트먼트</label>
              <select
                value={currentForm.compartment}
                onChange={(e) => setField('compartment', e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-3 text-sm min-h-[48px]"
              >
                <option value="">선택</option>
                {BUSAN_COMPARTMENTS.map((c) => (
                  <option key={c.cmp} value={c.cmp}>{c.label}</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">거터 번호</label>
                <Stepper
                  value={currentForm.gutterNumber}
                  onChange={(v) => setField('gutterNumber', v)}
                  step={1}
                  min={1}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">구역 번호</label>
                <Stepper
                  value={currentForm.positionNumber}
                  onChange={(v) => setField('positionNumber', v)}
                  step={1}
                  min={1}
                />
              </div>
            </div>
          </>
        ) : (
          <>
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
          </>
        )}

        {/* 동적 조사 항목 */}
        {cropItems.length > 0 && (
          <div className="space-y-3 mb-4">
            {cropItems.map((item) => (
              <div key={item.id}>
                <label className="block text-xs font-medium text-gray-500 mb-1">
                  {item.name}
                  {item.unit && <span className="text-gray-400 ml-1">({item.unit})</span>}
                </label>
                {item.inputType === 'text' ? (
                  <input
                    type="text"
                    value={currentForm[item.id] || ''}
                    onChange={(e) => setField(item.id, e.target.value)}
                    className="w-full h-12 border border-gray-200 rounded-lg px-3 text-sm"
                    placeholder={item.name}
                  />
                ) : (
                  <Stepper
                    value={currentForm[item.id] || ''}
                    onChange={(v) => setField(item.id, v)}
                    step={0.1}
                  />
                )}
              </div>
            ))}
          </div>
        )}

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
          <p className="text-xs text-gray-400 text-center mt-1">
            {isBusan ? '컴파트먼트, 거터, 구역 번호를 입력하세요' : '열 번호와 주 번호를 입력하세요'}
          </p>
        )}
      </Card>

      {/* 누적된 조사 항목 */}
      {entries.length > 0 && (
        <div className="mb-4">
          <div className="text-sm font-semibold text-gray-700 mb-2">
            조사 항목 ({entries.length}건)
          </div>
          <div className="space-y-2">
            {entries.map((e, idx) => {
              const filledItems = cropItems.filter(
                (item) => e[item.id] !== '' && e[item.id] != null
              );
              return (
                <Card key={idx} accent={editIndex === idx ? 'blue' : 'gray'} className="p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="text-xs font-semibold text-gray-500">#{idx + 1}</span>
                        {isBusan ? (
                          <>
                            <span className="text-xs bg-emerald-50 text-emerald-600 px-1.5 py-0.5 rounded">
                              {BUSAN_COMPARTMENTS.find((c) => c.cmp === Number(e.compartment))?.label || `${e.compartment}cmp`}
                            </span>
                            <span className="text-sm font-medium text-gray-800">
                              G{e.gutterNumber} #{e.positionNumber}
                            </span>
                          </>
                        ) : (
                          <>
                            {e.zoneId && (
                              <span className="text-xs bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded">
                                {zoneMap[e.zoneId]?.name || '구역'}
                              </span>
                            )}
                            <span className="text-sm font-medium text-gray-800">
                              {e.rowNumber}열 {e.plantNumber}번주
                            </span>
                          </>
                        )}
                      </div>
                      <div className="grid grid-cols-3 gap-x-3 gap-y-0.5">
                        {filledItems.map((item) => (
                          <div key={item.id} className="text-xs text-gray-500">
                            <span className="text-gray-400">{item.name} </span>
                            <span className="font-medium text-gray-700">
                              {e[item.id]}{item.unit}
                            </span>
                          </div>
                        ))}
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
              );
            })}
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
    </div>
  );
}
