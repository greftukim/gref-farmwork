import { useState, useMemo } from 'react';
import useAuthStore from '../../stores/authStore';
import useGrowthSurveyStore from '../../stores/growthSurveyStore';
import useCropStore from '../../stores/cropStore';
import useZoneStore from '../../stores/zoneStore';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import BottomSheet from '../../components/common/BottomSheet';

const fields = [
  { key: 'plantHeight', label: '초장(cm)', unit: 'cm', type: 'number', step: '0.1' },
  { key: 'stemDiameter', label: '경경(mm)', unit: 'mm', type: 'number', step: '0.1' },
  { key: 'leafCount', label: '엽수', unit: '매', type: 'number', step: '1' },
  { key: 'trussNumber', label: '개화 화방', unit: '번째', type: 'number', step: '1' },
  { key: 'fruitCount', label: '착과수', unit: '개', type: 'number', step: '1' },
  { key: 'fruitWeight', label: '과중(g)', unit: 'g', type: 'number', step: '0.1' },
];

const emptyForm = {
  cropId: '',
  zoneId: '',
  rowNumber: '',
  plantNumber: '',
  plantHeight: '',
  stemDiameter: '',
  leafCount: '',
  trussNumber: '',
  fruitCount: '',
  fruitWeight: '',
  notes: '',
};

export default function GrowthSurveyPage() {
  const currentUser = useAuthStore((s) => s.currentUser);
  const surveys = useGrowthSurveyStore((s) => s.surveys);
  const addSurvey = useGrowthSurveyStore((s) => s.addSurvey);
  const crops = useCropStore((s) => s.crops);
  const zones = useZoneStore((s) => s.zones);
  const [showSheet, setShowSheet] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const cropMap = useMemo(() => Object.fromEntries(crops.map((c) => [c.id, c])), [crops]);
  const zoneMap = useMemo(() => Object.fromEntries(zones.map((z) => [z.id, z])), [zones]);

  const previousSurvey = useMemo(() => {
    if (!form.zoneId || !form.rowNumber || !form.plantNumber) return null;
    return surveys
      .filter(
        (s) =>
          s.zoneId === form.zoneId &&
          s.rowNumber === Number(form.rowNumber) &&
          s.plantNumber === Number(form.plantNumber)
      )
      .sort((a, b) => b.surveyDate.localeCompare(a.surveyDate))[0] || null;
  }, [surveys, form.zoneId, form.rowNumber, form.plantNumber]);

  const recentSurveys = useMemo(
    () => surveys
      .filter((s) => s.workerId === currentUser?.id)
      .sort((a, b) => b.surveyDate.localeCompare(a.surveyDate))
      .slice(0, 10),
    [surveys, currentUser]
  );

  const activeCrops = useMemo(() => crops.filter((c) => c.isActive), [crops]);

  const handleSubmit = () => {
    if (!form.zoneId || !form.rowNumber || !form.plantNumber) return;
    addSurvey({
      workerId: currentUser.id,
      surveyDate: new Date().toISOString().split('T')[0],
      cropId: form.cropId || null,
      zoneId: form.zoneId,
      rowNumber: Number(form.rowNumber),
      plantNumber: Number(form.plantNumber),
      plantHeight: form.plantHeight ? Number(form.plantHeight) : null,
      stemDiameter: form.stemDiameter ? Number(form.stemDiameter) : null,
      leafCount: form.leafCount ? Number(form.leafCount) : null,
      trussNumber: form.trussNumber ? Number(form.trussNumber) : null,
      fruitCount: form.fruitCount ? Number(form.fruitCount) : null,
      fruitWeight: form.fruitWeight ? Number(form.fruitWeight) : null,
      notes: form.notes,
      photos: [],
    });
    setForm(emptyForm);
    setShowSheet(false);
  };

  const diff = (current, previous) => {
    if (!current || !previous) return null;
    const d = current - previous;
    if (d === 0) return null;
    return d > 0 ? `+${d.toFixed(1)}` : d.toFixed(1);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-heading font-semibold text-gray-900">생육 조사</h2>
        <Button size="sm" onClick={() => setShowSheet(true)}>새 조사</Button>
      </div>

      {recentSurveys.length === 0 && (
        <p className="text-gray-400 text-sm text-center py-12">조사 기록이 없습니다</p>
      )}

      <div className="space-y-3">
        {recentSurveys.map((s) => (
          <Card key={s.id} accent="blue" className="p-4">
            <div className="flex items-center justify-between mb-2 flex-wrap gap-1">
              <span className="font-medium text-gray-900">{s.surveyDate}</span>
              <div className="flex items-center gap-2 text-xs text-gray-400">
                {s.cropId && (
                  <span className="bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full font-medium">
                    {cropMap[s.cropId]?.name || '작물'}
                  </span>
                )}
                <span>{zoneMap[s.zoneId]?.name} {s.rowNumber}열 {s.plantNumber}번주</span>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 text-sm">
              {fields.map((f) => (
                s[f.key] != null && (
                  <div key={f.key}>
                    <div className="text-xs text-gray-400">{f.label}</div>
                    <div className="font-medium text-gray-700">{s[f.key]}{f.unit}</div>
                  </div>
                )
              ))}
            </div>
            {s.notes && <div className="text-sm text-gray-500 mt-2">{s.notes}</div>}
          </Card>
        ))}
      </div>

      <BottomSheet isOpen={showSheet} onClose={() => setShowSheet(false)} title="생육 조사 입력">
        <div className="space-y-3">
          {/* 작물 선택 */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">작물</label>
            <select
              value={form.cropId}
              onChange={(e) => setForm({ ...form, cropId: e.target.value })}
              className="w-full border border-gray-200 rounded-lg px-2 py-2 text-sm min-h-[44px]"
            >
              <option value="">선택 안 함</option>
              {activeCrops.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          {/* 구역 / 열 / 주 */}
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">구역</label>
              <select value={form.zoneId} onChange={(e) => setForm({ ...form, zoneId: e.target.value })}
                className="w-full border border-gray-200 rounded-lg px-2 py-2 text-sm min-h-[44px]">
                <option value="">선택</option>
                {zones.map((z) => <option key={z.id} value={z.id}>{z.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">열 번호</label>
              <input type="number" value={form.rowNumber} onChange={(e) => setForm({ ...form, rowNumber: e.target.value })}
                className="w-full border border-gray-200 rounded-lg px-2 py-2 text-sm min-h-[44px]" placeholder="열" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">주 번호</label>
              <input type="number" value={form.plantNumber} onChange={(e) => setForm({ ...form, plantNumber: e.target.value })}
                className="w-full border border-gray-200 rounded-lg px-2 py-2 text-sm min-h-[44px]" placeholder="주" />
            </div>
          </div>

          {previousSurvey && (
            <div className="bg-blue-50 rounded-lg p-3">
              <div className="text-xs font-medium text-blue-600 mb-1">이전 조사 ({previousSurvey.surveyDate})</div>
              <div className="grid grid-cols-3 gap-2 text-xs">
                {fields.map((f) => (
                  previousSurvey[f.key] != null && (
                    <div key={f.key}>
                      <span className="text-blue-400">{f.label}: </span>
                      <span className="text-blue-700">{previousSurvey[f.key]}</span>
                    </div>
                  )
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-2">
            {fields.map((f) => (
              <div key={f.key}>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  {f.label}
                  {previousSurvey && form[f.key] && diff(Number(form[f.key]), previousSurvey[f.key]) && (
                    <span className={`ml-1 ${Number(form[f.key]) > previousSurvey[f.key] ? 'text-blue-500' : 'text-red-500'}`}>
                      ({diff(Number(form[f.key]), previousSurvey[f.key])})
                    </span>
                  )}
                </label>
                <input
                  type={f.type}
                  step={f.step}
                  value={form[f.key]}
                  onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-2 py-2 text-sm min-h-[44px]"
                />
              </div>
            ))}
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">메모</label>
            <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })}
              rows={2} className="w-full border border-gray-200 rounded-lg px-2 py-2 text-sm" placeholder="특이사항" />
          </div>

          <Button size="lg" className="w-full" onClick={handleSubmit}>저장</Button>
        </div>
      </BottomSheet>
    </div>
  );
}
