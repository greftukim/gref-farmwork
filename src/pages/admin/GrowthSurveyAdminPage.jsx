import { useState, useMemo } from 'react';
import useGrowthSurveyStore from '../../stores/growthSurveyStore';
import useEmployeeStore from '../../stores/employeeStore';
import useZoneStore from '../../stores/zoneStore';
import Card from '../../components/common/Card';

const fields = [
  { key: 'plantHeight',  label: '초장',   unit: 'cm' },
  { key: 'stemDiameter', label: '경경',   unit: 'mm' },
  { key: 'leafCount',    label: '엽수',   unit: '매' },
  { key: 'trussNumber',  label: '화방',   unit: '번째' },
  { key: 'fruitCount',   label: '착과수', unit: '개' },
  { key: 'fruitWeight',  label: '과중',   unit: 'g' },
];

export default function GrowthSurveyAdminPage() {
  const surveys = useGrowthSurveyStore((s) => s.surveys);
  const employees = useEmployeeStore((s) => s.employees);
  const zones = useZoneStore((s) => s.zones);

  const [filterZone, setFilterZone] = useState('');
  const [filterWorker, setFilterWorker] = useState('');
  const [filterDate, setFilterDate] = useState('');

  const empMap = useMemo(() => Object.fromEntries(employees.map((e) => [e.id, e])), [employees]);
  const zoneMap = useMemo(() => Object.fromEntries(zones.map((z) => [z.id, z])), [zones]);

  const filtered = useMemo(() => {
    return surveys
      .filter((s) => !filterZone   || s.zoneId    === filterZone)
      .filter((s) => !filterWorker || s.workerId  === filterWorker)
      .filter((s) => !filterDate   || s.surveyDate === filterDate)
      .sort((a, b) => b.surveyDate.localeCompare(a.surveyDate))
      .slice(0, 100);
  }, [surveys, filterZone, filterWorker, filterDate]);

  // 조사 날짜 목록 (중복 제거)
  const surveyDates = useMemo(() => {
    const dates = [...new Set(surveys.map((s) => s.surveyDate))].sort((a, b) => b.localeCompare(a));
    return dates;
  }, [surveys]);

  return (
    <div>
      <h2 className="text-xl font-heading font-semibold text-gray-900 mb-4">생육 조사 현황</h2>

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

        {(filterDate || filterZone || filterWorker) && (
          <button
            onClick={() => { setFilterDate(''); setFilterZone(''); setFilterWorker(''); }}
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
          {filtered.map((s) => (
            <Card key={s.id} accent="emerald" className="p-4">
              <div className="flex items-center justify-between mb-2 flex-wrap gap-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-gray-900 text-sm">{s.surveyDate}</span>
                  <span className="text-xs text-gray-500 bg-gray-100 rounded px-2 py-0.5">
                    {zoneMap[s.zoneId]?.name || '구역 미상'} {s.rowNumber}열 {s.plantNumber}번주
                  </span>
                </div>
                <span className="text-xs text-emerald-700 font-medium">
                  {empMap[s.workerId]?.name || '작업자 미상'}
                </span>
              </div>

              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                {fields.map((f) =>
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
          ))}
        </div>
      )}
    </div>
  );
}
