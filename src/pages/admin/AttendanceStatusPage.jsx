import { useMemo } from 'react';
import useAttendanceStore from '../../stores/attendanceStore';
import useEmployeeStore from '../../stores/employeeStore';
import Card from '../../components/common/Card';

const today = () => new Date().toISOString().split('T')[0];

const statusConfig = {
  normal: { label: '출근', color: 'bg-green-100 text-green-700' },
  late: { label: '지각', color: 'bg-amber-100 text-amber-700' },
  working: { label: '근무중', color: 'bg-blue-100 text-blue-700' },
};

export default function AttendanceStatusPage() {
  const records = useAttendanceStore((s) => s.records);
  const employees = useEmployeeStore((s) => s.employees);

  const workers = useMemo(
    () => employees.filter((e) => e.role === 'worker' && e.isActive),
    [employees]
  );

  const todayRecords = useMemo(
    () => records.filter((r) => r.date === today()),
    [records]
  );

  const checkedIn = todayRecords.length;
  const total = workers.length;

  const formatTime = (iso) => {
    if (!iso) return '—';
    const d = new Date(iso);
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  };

  return (
    <div>
      <h2 className="text-xl font-heading font-semibold text-gray-900 mb-6">출근 현황</h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card accent="blue" className="p-5 text-center">
          <div className="text-sm text-gray-500 mb-1">전체 인원</div>
          <div className="text-3xl font-bold text-gray-900">{total}<span className="text-lg text-gray-400">명</span></div>
        </Card>
        <Card accent="green" className="p-5 text-center">
          <div className="text-sm text-gray-500 mb-1">출근 완료</div>
          <div className="text-3xl font-bold text-green-600">{checkedIn}<span className="text-lg text-gray-400">명</span></div>
        </Card>
        <Card accent="gray" className="p-5 text-center">
          <div className="text-sm text-gray-500 mb-1">미출근</div>
          <div className="text-3xl font-bold text-gray-400">{total - checkedIn}<span className="text-lg text-gray-400">명</span></div>
        </Card>
      </div>

      <div className="space-y-3">
        {workers.map((w) => {
          const rec = todayRecords.find((r) => r.employeeId === w.id);
          const st = rec ? statusConfig[rec.status] || statusConfig.normal : null;

          return (
            <Card key={w.id} accent={rec ? 'green' : 'gray'} className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-medium text-gray-900">{w.name}</span>
                  <span className="text-sm text-gray-400 ml-2">{w.jobType}</span>
                </div>
                <div className="flex items-center gap-3">
                  {rec ? (
                    <>
                      <span className="text-sm text-gray-500">
                        {formatTime(rec.checkIn)}
                        {rec.checkOut ? ` ~ ${formatTime(rec.checkOut)}` : ''}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${st.color}`}>
                        {st.label}
                      </span>
                    </>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-400">
                      미출근
                    </span>
                  )}
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
