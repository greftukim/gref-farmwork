import { useState, useMemo } from 'react';
import useGrowthSurveyStore from '../../stores/growthSurveyStore';
import useGrowthSurveyItemStore from '../../stores/growthSurveyItemStore';
import useEmployeeStore from '../../stores/employeeStore';
import useCropStore from '../../stores/cropStore';
import useZoneStore from '../../stores/zoneStore';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';

// ─── 조사 기록 탭 ────────────────────────────────────────────────────────────
function SurveyRecordsTab() {
  const surveys = useGrowthSurveyStore((s) => s.surveys);
  const surveyItems = useGrowthSurveyItemStore((s) => s.items);
  const employees = useEmployeeStore((s) => s.employees);
  const crops = useCropStore((s) => s.crops);
  const zones = useZoneStore((s) => s.zones);

  const [filterZone, setFilterZone] = useState('');
  const [filterCrop, setFilterCrop] = useState('');
  const [filterWorker, setFilterWorker] = useState('');
  const [filterDate, setFilterDate] = useState('');

  const empMap = useMemo(() => Object.fromEntries(employees.map((e) => [e.id, e])), [employees]);
  const cropMap = useMemo(() => Object.fromEntries(crops.map((c) => [c.id, c])), [crops]);
  const zoneMap = useMemo(() => Object.fromEntries(zones.map((z) => [z.id, z])), [zones]);
  const itemMap = useMemo(() => Object.fromEntries(surveyItems.map((i) => [i.id, i])), [surveyItems]);

  const surveyDates = useMemo(() => {
    const dates = [...new Set(surveys.map((s) => s.surveyDate))].sort((a, b) => b.localeCompare(a));
    return dates;
  }, [surveys]);

  const filtered = useMemo(() => {
    return surveys
      .filter((s) => !filterZone   || s.zoneId    === filterZone)
      .filter((s) => !filterCrop   || s.cropId    === filterCrop)
      .filter((s) => !filterWorker || s.workerId  === filterWorker)
      .filter((s) => !filterDate   || s.surveyDate === filterDate)
      .sort((a, b) => b.surveyDate.localeCompare(a.surveyDate))
      .slice(0, 100);
  }, [surveys, filterZone, filterCrop, filterWorker, filterDate]);

  const hasFilter = filterDate || filterZone || filterCrop || filterWorker;

  // 기존 고정 필드 (레거시 데이터용)
  const legacyFields = [
    { key: 'plantHeight',  label: '초장',   unit: 'cm' },
    { key: 'stemDiameter', label: '경경',   unit: 'mm' },
    { key: 'leafCount',    label: '엽수',   unit: '매' },
    { key: 'trussNumber',  label: '화방',   unit: '번째' },
    { key: 'fruitCount',   label: '착과수', unit: '개' },
    { key: 'fruitWeight',  label: '과중',   unit: 'g' },
  ];

  return (
    <>
      {/* 필터 */}
      <div className="flex flex-wrap gap-2 mb-4">
        <select
          value={filterDate}
          onChange={(e) => setFilterDate(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm min-h-[40px] bg-white"
        >
          <option value="">전체 날짜</option>
          {surveyDates.map((d) => (
            <option key={d} value={d}>{d}</option>
          ))}
        </select>

        <select
          value={filterCrop}
          onChange={(e) => setFilterCrop(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm min-h-[40px] bg-white"
        >
          <option value="">전체 작물</option>
          {crops.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>

        <select
          value={filterZone}
          onChange={(e) => setFilterZone(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm min-h-[40px] bg-white"
        >
          <option value="">전체 구역</option>
          {zones.map((z) => (
            <option key={z.id} value={z.id}>{z.name}</option>
          ))}
        </select>

        <select
          value={filterWorker}
          onChange={(e) => setFilterWorker(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm min-h-[40px] bg-white"
        >
          <option value="">전체 작업자</option>
          {employees.filter((e) => e.role === 'worker' && e.isActive).map((e) => (
            <option key={e.id} value={e.id}>{e.name}</option>
          ))}
        </select>

        {hasFilter && (
          <button
            onClick={() => { setFilterDate(''); setFilterZone(''); setFilterCrop(''); setFilterWorker(''); }}
            className="px-3 py-2 text-sm text-gray-500 hover:text-gray-700 underline"
          >
            초기화
          </button>
        )}
      </div>

      <div className="text-xs text-gray-400 mb-3">{filtered.length}건</div>

      {filtered.length === 0 ? (
        <p className="text-gray-400 text-sm text-center py-16">조사 기록이 없습니다</p>
      ) : (
        <div className="space-y-3">
          {filtered.map((s) => {
            // measurements JSONB가 있으면 동적 표시, 없으면 레거시 필드
            const hasMeasurements = Array.isArray(s.measurements) && s.measurements.length > 0;
            return (
              <Card key={s.id} accent="emerald" className="p-4">
                <div className="flex items-center justify-between mb-2 flex-wrap gap-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-gray-900 text-sm">{s.surveyDate}</span>
                    {s.cropId && (
                      <span className="text-xs bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full font-medium">
                        {cropMap[s.cropId]?.name || '작물'}
                      </span>
                    )}
                    <span className="text-xs text-gray-500 bg-gray-100 rounded px-2 py-0.5">
                      {zoneMap[s.zoneId]?.name || '구역 미상'} {s.rowNumber}열 {s.plantNumber}번주
                    </span>
                  </div>
                  <span className="text-xs text-emerald-700 font-medium">
                    {empMap[s.workerId]?.name || '작업자 미상'}
                  </span>
                </div>

                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                  {hasMeasurements
                    ? s.measurements.map((m) => (
                        <div key={m.itemId || m.name} className="text-center">
                          <div className="text-[10px] text-gray-400">{m.name}</div>
                          <div className="text-sm font-semibold text-gray-800">
                            {m.value}<span className="text-xs text-gray-400 font-normal">{m.unit}</span>
                          </div>
                        </div>
                      ))
                    : legacyFields.map((f) =>
                        s[f.key] != null ? (
                          <div key={f.key} className="text-center">
                            <div className="text-[10px] text-gray-400">{f.label}</div>
                            <div className="text-sm font-semibold text-gray-800">
                              {s[f.key]}<span className="text-xs text-gray-400 font-normal">{f.unit}</span>
                            </div>
                          </div>
                        ) : null
                      )}
                </div>

                {s.notes && (
                  <div className="text-xs text-gray-500 mt-2 pt-2 border-t border-gray-100">{s.notes}</div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </>
  );
}

// ─── 조사 항목 탭 ────────────────────────────────────────────────────────────
const INPUT_TYPES = [
  { value: 'number', label: '숫자' },
  { value: 'text',   label: '텍스트' },
];

const emptyForm = { name: '', unit: '', inputType: 'number' };

function SurveyItemsTab() {
  const crops = useCropStore((s) => s.crops);
  const surveyItems = useGrowthSurveyItemStore((s) => s.items);
  const addItem = useGrowthSurveyItemStore((s) => s.addItem);
  const updateItem = useGrowthSurveyItemStore((s) => s.updateItem);
  const deleteItem = useGrowthSurveyItemStore((s) => s.deleteItem);

  const activeCrops = useMemo(() => crops.filter((c) => c.isActive), [crops]);

  const [selectedCropId, setSelectedCropId] = useState('');
  const [form, setForm] = useState(emptyForm);
  const [editId, setEditId] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const cropItems = useMemo(
    () => surveyItems.filter((i) => i.cropId === selectedCropId),
    [surveyItems, selectedCropId]
  );

  const handleStartEdit = (item) => {
    setEditId(item.id);
    setForm({ name: item.name, unit: item.unit || '', inputType: item.inputType || 'number' });
  };

  const handleCancelEdit = () => {
    setEditId(null);
    setForm(emptyForm);
  };

  const handleSubmit = async () => {
    if (!selectedCropId || !form.name.trim()) return;
    setSubmitting(true);
    if (editId) {
      await updateItem(editId, { name: form.name.trim(), unit: form.unit.trim(), inputType: form.inputType });
      setEditId(null);
    } else {
      await addItem({
        cropId: selectedCropId,
        name: form.name.trim(),
        unit: form.unit.trim(),
        inputType: form.inputType,
        sortOrder: cropItems.length,
      });
    }
    setForm(emptyForm);
    setSubmitting(false);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('이 항목을 삭제하시겠습니까?')) return;
    await deleteItem(id);
  };

  return (
    <div className="space-y-4">
      {/* 작물 선택 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">작물 선택</label>
        <select
          value={selectedCropId}
          onChange={(e) => { setSelectedCropId(e.target.value); setEditId(null); setForm(emptyForm); }}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm min-h-[40px] bg-white"
        >
          <option value="">작물을 선택하세요</option>
          {activeCrops.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>

      {selectedCropId && (
        <>
          {/* 항목 목록 */}
          {cropItems.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6 bg-gray-50 rounded-xl">
              등록된 조사 항목이 없습니다
            </p>
          ) : (
            <div className="space-y-2">
              {cropItems.map((item) => (
                <Card key={item.id} accent="gray" className="p-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <span className="font-medium text-gray-900 text-sm">{item.name}</span>
                      {item.unit && (
                        <span className="text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">{item.unit}</span>
                      )}
                      <span className="text-xs text-gray-400">
                        {INPUT_TYPES.find((t) => t.value === item.inputType)?.label || item.inputType}
                      </span>
                    </div>
                    <div className="flex gap-1 flex-shrink-0">
                      <button
                        onClick={() => handleStartEdit(item)}
                        className="px-2 py-1.5 text-xs text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100"
                      >
                        수정
                      </button>
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="px-2 py-1.5 text-xs text-red-500 bg-red-50 rounded-lg hover:bg-red-100"
                      >
                        삭제
                      </button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}

          {/* 추가 / 수정 폼 */}
          <div className="border border-gray-200 rounded-xl p-4 space-y-3 bg-gray-50">
            <div className="text-sm font-semibold text-gray-700">
              {editId ? '항목 수정' : '항목 추가'}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">항목 이름 *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm min-h-[40px] bg-white"
                  placeholder="예: 초장, 경경, 엽수"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">단위</label>
                <input
                  type="text"
                  value={form.unit}
                  onChange={(e) => setForm({ ...form, unit: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm min-h-[40px] bg-white"
                  placeholder="예: cm, mm, 개, g"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">입력 타입</label>
              <div className="flex gap-2">
                {INPUT_TYPES.map((t) => (
                  <button
                    key={t.value}
                    onClick={() => setForm({ ...form, inputType: t.value })}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      form.inputType === t.value
                        ? 'bg-emerald-600 text-white'
                        : 'bg-white text-gray-600 border border-gray-200'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-2 pt-1">
              <Button
                onClick={handleSubmit}
                disabled={submitting || !form.name.trim()}
              >
                {submitting ? '저장 중...' : editId ? '수정 완료' : '항목 추가'}
              </Button>
              {editId && (
                <Button variant="secondary" onClick={handleCancelEdit}>취소</Button>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ─── 메인 페이지 ──────────────────────────────────────────────────────────────
const TABS = [
  { id: 'records', label: '조사 기록' },
  { id: 'items',   label: '조사 항목' },
];

export default function GrowthSurveyAdminPage() {
  const [activeTab, setActiveTab] = useState('records');

  return (
    <div>
      <h2 className="text-xl font-heading font-semibold text-gray-900 mb-4">생육 조사 현황</h2>

      {/* 하위 탭 */}
      <div className="flex gap-1 mb-5 border-b border-gray-200">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
              activeTab === tab.id
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'records' && <SurveyRecordsTab />}
      {activeTab === 'items'   && <SurveyItemsTab />}
    </div>
  );
}
