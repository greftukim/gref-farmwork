import { useState, useMemo } from 'react';
import useEmployeeStore from '../../stores/employeeStore';
import useBranchFilter from '../../hooks/useBranchFilter';
import Button from '../../components/common/Button';
import Card from '../../components/common/Card';
import Modal from '../../components/common/Modal';

const emptyForm = {
  name: '',
  phone: '',
  role: 'worker',
  jobType: '재배',
  hireDate: '',
  workHoursPerWeek: 40,
  annualLeaveDays: 15,
  pinCode: '',
};

function EmployeeForm({ form, setForm }) {
  const field = (label, name, type = 'text', options = null) => (
    <div className="mb-3">
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      {options ? (
        <select
          value={form[name]}
          onChange={(e) => setForm({ ...form, [name]: e.target.value })}
          className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm min-h-[44px]"
        >
          {options.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      ) : (
        <input
          type={type}
          value={form[name]}
          onChange={(e) =>
            setForm({
              ...form,
              [name]: type === 'number' ? Number(e.target.value) : e.target.value,
            })
          }
          className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm min-h-[44px]"
        />
      )}
    </div>
  );

  return (
    <div>
      {field('이름', 'name')}
      {field('연락처', 'phone', 'tel')}
      {field('역할', 'role', 'text', [
        { value: 'admin', label: '관리자' },
        { value: 'worker', label: '작업자' },
      ])}
      {field('직무', 'jobType', 'text', [
        { value: '재배', label: '재배' },
        { value: '관리', label: '관리' },
        { value: '기타', label: '기타' },
      ])}
      {field('입사일', 'hireDate', 'date')}
      {field('주당 근무시간', 'workHoursPerWeek', 'number')}
      {field('연차 일수', 'annualLeaveDays', 'number')}
      {field('PIN 코드 (6자리)', 'pinCode')}
    </div>
  );
}

export default function EmployeesPage() {
  const employees = useEmployeeStore((s) => s.employees);
  const addEmployee = useEmployeeStore((s) => s.addEmployee);
  const updateEmployee = useEmployeeStore((s) => s.updateEmployee);
  const toggleActive = useEmployeeStore((s) => s.toggleActive);
  const { branchFilter } = useBranchFilter();

  const [showModal, setShowModal] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [filter, setFilter] = useState('all');

  const filtered = useMemo(() => {
    let list = employees;
    if (branchFilter) list = list.filter((e) => e.branch === branchFilter);
    if (filter === 'active') return list.filter((e) => e.isActive);
    if (filter === 'inactive') return list.filter((e) => !e.isActive);
    return list;
  }, [employees, filter, branchFilter]);

  const openAdd = () => {
    setEditTarget(null);
    setForm(emptyForm);
    setShowModal(true);
  };

  const openEdit = (emp) => {
    setEditTarget(emp);
    setForm({
      name: emp.name,
      phone: emp.phone || '',
      role: emp.role,
      jobType: emp.jobType || '',
      hireDate: emp.hireDate || '',
      workHoursPerWeek: emp.workHoursPerWeek || 40,
      annualLeaveDays: emp.annualLeaveDays || 15,
      pinCode: emp.pinCode || '',
    });
    setShowModal(true);
  };

  const handleSave = () => {
    if (!form.name.trim()) return;
    if (editTarget) {
      updateEmployee(editTarget.id, form);
    } else {
      addEmployee(form);
    }
    setShowModal(false);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-heading font-semibold text-gray-900">직원 관리</h2>
        <Button onClick={openAdd}>+ 직원 등록</Button>
      </div>

      <div className="flex gap-2 mb-4">
        {[
          { key: 'all', label: '전체' },
          { key: 'active', label: '재직' },
          { key: 'inactive', label: '비활성' },
        ].map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors min-h-[36px] ${
              filter === f.key
                ? 'bg-emerald-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <Card accent="gray" className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-left text-gray-500">
                <th className="px-4 py-3 font-medium">사번</th>
                <th className="px-4 py-3 font-medium">이름</th>
                <th className="px-4 py-3 font-medium">역할</th>
                <th className="px-4 py-3 font-medium">직무</th>
                <th className="px-4 py-3 font-medium">연락처</th>
                <th className="px-4 py-3 font-medium">입사일</th>
                <th className="px-4 py-3 font-medium">상태</th>
                <th className="px-4 py-3 font-medium">관리</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((emp) => (
                <tr key={emp.id} className={`${!emp.isActive ? 'opacity-50' : ''}`}>
                  <td className="px-4 py-3 text-gray-500">{emp.empNo}</td>
                  <td className="px-4 py-3 font-medium text-gray-900">{emp.name}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        emp.role === 'admin'
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-blue-100 text-blue-700'
                      }`}
                    >
                      {emp.role === 'admin' ? '관리자' : '작업자'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{emp.jobType}</td>
                  <td className="px-4 py-3 text-gray-600">{emp.phone}</td>
                  <td className="px-4 py-3 text-gray-600">{emp.hireDate}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        emp.isActive
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-500'
                      }`}
                    >
                      {emp.isActive ? '재직' : '비활성'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      <Button size="sm" variant="ghost" onClick={() => openEdit(emp)}>
                        수정
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => toggleActive(emp.id)}
                      >
                        {emp.isActive ? '비활성' : '활성'}
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editTarget ? '직원 수정' : '직원 등록'}
      >
        <EmployeeForm form={form} setForm={setForm} />
        <div className="flex gap-2 mt-4">
          <Button className="flex-1" onClick={handleSave}>
            {editTarget ? '수정' : '등록'}
          </Button>
          <Button className="flex-1" variant="secondary" onClick={() => setShowModal(false)}>
            취소
          </Button>
        </div>
      </Modal>
    </div>
  );
}
