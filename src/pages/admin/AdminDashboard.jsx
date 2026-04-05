import { useMemo } from 'react';
import Card from '../../components/common/Card';
import useEmployeeStore from '../../stores/employeeStore';

export default function AdminDashboard() {
  const employees = useEmployeeStore((s) => s.employees);
  const workers = useMemo(() => employees.filter((e) => e.role === 'worker' && e.isActive), [employees]);

  return (
    <div>
      <h2 className="text-xl font-heading font-semibold text-gray-900 mb-6">대시보드</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card accent="emerald" className="p-5">
          <div className="text-sm text-gray-500 mb-1">전체 작업자</div>
          <div className="text-2xl font-bold text-gray-900">{workers.length}명</div>
        </Card>
        <Card accent="blue" className="p-5">
          <div className="text-sm text-gray-500 mb-1">오늘 출근</div>
          <div className="text-2xl font-bold text-gray-900">—</div>
        </Card>
        <Card accent="amber" className="p-5">
          <div className="text-sm text-gray-500 mb-1">진행 중 작업</div>
          <div className="text-2xl font-bold text-gray-900">—</div>
        </Card>
      </div>
    </div>
  );
}
