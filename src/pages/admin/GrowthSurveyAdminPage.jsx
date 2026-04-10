import { useState, useMemo, useEffect } from 'react';
import useGrowthSurveyStore from '../../stores/growthSurveyStore';
import useGrowthSurveyItemStore from '../../stores/growthSurveyItemStore';
import useEmployeeStore from '../../stores/employeeStore';
import useCropStore from '../../stores/cropStore';
import useZoneStore from '../../stores/zoneStore';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

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

// ─── 그래프 탭 ──────────────────────────────────────────────────────────────
const CMP_COLORS = {
  1: '#ef4444',
  2: '#f59e0b',
  3: '#10b981',
  4: '#ec4899',
};
const CMP_LABELS = { 1: '1cmp', 2: '2cmp', 3: '3cmp', 4: '4cmp' };

const PERIOD_OPTIONS = [
  { value: '1m',  label: '최근 1개월' },
  { value: '3m',  label: '최근 3개월' },
  { value: '6m',  label: '최근 6개월' },
  { value: 'all', label: '전체' },
];

function subtractMonths(dateStr, months) {
  const d = new Date(dateStr);
  d.setMonth(d.getMonth() - months);
  return d.toISOString().split('T')[0];
}

function ChartsTab() {
  const surveys = useGrowthSurveyStore((s) => s.surveys);
  const fetchSurveys = useGrowthSurveyStore((s) => s.fetchSurveys);
  const surveyItems = useGrowthSurveyItemStore((s) => s.items);
  const crops = useCropStore((s) => s.crops);

  const [selectedCropId, setSelectedCropId] = useState('');
  const [selectedCmp, setSelectedCmp] = useState('');
  const [period, setPeriod] = useState('3m');

  useEffect(() => {
    if (surveys.length === 0) fetchSurveys();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 부산 작물만 (컴파트먼트 기반)
  const busanCrops = useMemo(() =>
    crops.filter((c) => ['토마토', '미니파프리카', '오이', '딸기'].includes(c.name)),
    [crops]
  );

  // 선택된 작물의 조사 항목
  const cropItems = useMemo(
    () => surveyItems.filter((i) => i.cropId === selectedCropId),
    [surveyItems, selectedCropId]
  );

  // 필터링된 조사 데이터
  const filteredSurveys = useMemo(() => {
    if (!selectedCropId) return [];
    const today = new Date().toISOString().split('T')[0];
    let minDate = '';
    if (period === '1m') minDate = subtractMonths(today, 1);
    else if (period === '3m') minDate = subtractMonths(today, 3);
    else if (period === '6m') minDate = subtractMonths(today, 6);

    return surveys.filter((s) => {
      if (s.cropId !== selectedCropId) return false;
      if (s.compartment == null) return false;
      if (minDate && s.surveyDate < minDate) return false;
      if (selectedCmp && Number(s.compartment) !== Number(selectedCmp)) return false;
      return true;
    });
  }, [surveys, selectedCropId, selectedCmp, period]);

  // 항목별 차트 데이터 가공
  const chartDataByItem = useMemo(() => {
    if (cropItems.length === 0 || filteredSurveys.length === 0) return {};

    const result = {};
    for (const item of cropItems) {
      // { date -> { cmpN: [values] } }
      const dateMap = {};
      for (const s of filteredSurveys) {
        if (!Array.isArray(s.measurements)) continue;
        const m = s.measurements.find((mm) => mm.itemId === item.id);
        if (!m || m.value == null || m.value === '') continue;
        const val = Number(m.value);
        if (isNaN(val)) continue;
        const cmpKey = `cmp${s.compartment}`;
        if (!dateMap[s.surveyDate]) dateMap[s.surveyDate] = {};
        if (!dateMap[s.surveyDate][cmpKey]) dateMap[s.surveyDate][cmpKey] = [];
        dateMap[s.surveyDate][cmpKey].push(val);
      }

      // 평균 계산 + 날짜 정렬
      const chartData = Object.keys(dateMap)
        .sort()
        .map((date) => {
          const row = { date: date.slice(5) }; // MM-DD
          for (const [cmpKey, vals] of Object.entries(dateMap[date])) {
            row[cmpKey] = parseFloat((vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(2));
          }
          return row;
        });

      if (chartData.length > 0) {
        result[item.id] = chartData;
      }
    }
    return result;
  }, [cropItems, filteredSurveys]);

  // 어떤 컴파트먼트가 데이터에 존재하는지
  const activeCmps = useMemo(() => {
    if (selectedCmp) return [Number(selectedCmp)];
    const cmps = new Set();
    for (const data of Object.values(chartDataByItem)) {
      for (const row of data) {
        for (const key of Object.keys(row)) {
          if (key.startsWith('cmp')) cmps.add(Number(key.replace('cmp', '')));
        }
      }
    }
    return [...cmps].sort();
  }, [chartDataByItem, selectedCmp]);

  return (
    <div className="space-y-4">
      {/* 필터 */}
      <div className="flex flex-wrap gap-2">
        <select
          value={selectedCropId}
          onChange={(e) => setSelectedCropId(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm min-h-[40px] bg-white"
        >
          <option value="">작물 선택</option>
          {busanCrops.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>

        <select
          value={selectedCmp}
          onChange={(e) => setSelectedCmp(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm min-h-[40px] bg-white"
        >
          <option value="">전체 컴파트먼트</option>
          <option value="1">1cmp</option>
          <option value="2">2cmp</option>
          <option value="3">3cmp</option>
          <option value="4">4cmp</option>
        </select>

        <select
          value={period}
          onChange={(e) => setPeriod(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm min-h-[40px] bg-white"
        >
          {PERIOD_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

      {!selectedCropId ? (
        <p className="text-gray-400 text-sm text-center py-16">작물을 선택하세요</p>
      ) : cropItems.length === 0 ? (
        <p className="text-gray-400 text-sm text-center py-16">이 작물에 등록된 조사 항목이 없습니다</p>
      ) : Object.keys(chartDataByItem).length === 0 ? (
        <p className="text-gray-400 text-sm text-center py-16">데이터가 없습니다</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {cropItems.map((item) => {
            const data = chartDataByItem[item.id];
            if (!data) return null;
            return (
              <Card key={item.id} accent="emerald" className="p-4">
                <div className="text-sm font-semibold text-gray-700 mb-3">
                  {item.name}
                  {item.unit && <span className="text-gray-400 font-normal ml-1">({item.unit})</span>}
                </div>
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={data}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    {activeCmps.length > 1 && <Legend />}
                    {activeCmps.map((cmp) => (
                      <Line
                        key={cmp}
                        type="monotone"
                        dataKey={`cmp${cmp}`}
                        stroke={CMP_COLORS[cmp]}
                        name={CMP_LABELS[cmp]}
                        dot={{ r: 3 }}
                        connectNulls
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── 메인 페이지 ──────────────────────────────────────────────────────────────
const TABS = [
  { id: 'records', label: '조사 기록' },
  { id: 'items',   label: '조사 항목' },
  { id: 'charts',  label: '그래프' },
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
      {activeTab === 'charts'  && <ChartsTab />}
    </div>
  );
}
