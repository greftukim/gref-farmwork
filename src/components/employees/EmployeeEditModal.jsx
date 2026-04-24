import { useState, useEffect } from 'react';
import useAuthStore from '../../stores/authStore';
import useEmployeeStore from '../../stores/employeeStore';
import useNotificationStore from '../../stores/notificationStore';
import Modal from '../common/Modal';
import Button from '../common/Button';

const BRANCH_OPTIONS = [
  { value: 'busan',        label: '부산LAB' },
  { value: 'jinju',        label: '진주HUB' },
  { value: 'hadong',       label: '하동HUB' },
  { value: 'headquarters', label: '총괄본사' },
  { value: 'management',   label: '관리팀' },
  { value: 'seedlab',      label: 'Seed LAB' },
];

const ROLE_OPTIONS = [
  { value: 'worker',     label: '작업자' },
  { value: 'farm_admin', label: '관리자' },
  { value: 'hr_admin',   label: '인사관리' },
  { value: 'hq_admin',   label: 'HQ관리자' },
  { value: 'master',     label: '총괄' },
];

const inputCls = 'w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-indigo-400';
const labelCls = 'block text-xs font-semibold text-gray-500 mb-1';

export default function EmployeeEditModal({ employee, onClose }) {
  const currentUser = useAuthStore((s) => s.currentUser);
  const { updateEmployee } = useEmployeeStore();
  const { addNotification } = useNotificationStore();

  const isMaster = currentUser?.role === 'master';

  const [form, setForm] = useState({ name: '', phone: '', jobTitle: '', branch: '', role: 'worker', isActive: true });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (employee) {
      setForm({
        name: employee.name || '',
        phone: employee.phone || '',
        jobTitle: employee.jobTitle || '',
        branch: employee.branch || '',
        role: employee.role || 'worker',
        isActive: employee.isActive !== false,
      });
    }
  }, [employee?.id]);

  if (!employee) return null;

  const upd = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!form.name.trim() || saving) return;
    setSaving(true);
    const changes = {
      name: form.name.trim(),
      phone: form.phone.trim() || null,
      jobTitle: form.jobTitle.trim() || null,
      isActive: form.isActive,
    };
    if (isMaster) {
      changes.branch = form.branch || null;
      changes.role = form.role || 'worker';
    }
    await updateEmployee(employee.id, changes);
    addNotification({ type: 'task_completed', title: '저장 완료', message: `${form.name} 정보 수정 완료` });
    setSaving(false);
    onClose();
  };

  return (
    <Modal isOpen={!!employee} onClose={onClose} title="직원 정보 수정">
      <div className="space-y-3 text-sm">
        <div>
          <label className={labelCls}>이름</label>
          <input type="text" value={form.name} onChange={(e) => upd('name', e.target.value)} className={inputCls} />
        </div>

        <div>
          <label className={labelCls}>연락처</label>
          <input type="text" value={form.phone} onChange={(e) => upd('phone', e.target.value)} placeholder="010-0000-0000" className={inputCls} />
        </div>

        <div>
          <label className={labelCls}>직책</label>
          <input type="text" value={form.jobTitle} onChange={(e) => upd('jobTitle', e.target.value)} className={inputCls} />
        </div>

        {isMaster && (
          <div>
            <label className={labelCls}>근무 지점</label>
            <select value={form.branch} onChange={(e) => upd('branch', e.target.value)} className={inputCls}>
              <option value="">—</option>
              {BRANCH_OPTIONS.map((b) => <option key={b.value} value={b.value}>{b.label}</option>)}
            </select>
          </div>
        )}

        {isMaster && (
          <div>
            <label className={labelCls}>역할</label>
            <select value={form.role} onChange={(e) => upd('role', e.target.value)} className={inputCls}>
              {ROLE_OPTIONS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
          </div>
        )}

        <div className="flex items-center gap-3 pt-1">
          <span className={labelCls} style={{ marginBottom: 0 }}>재직 상태</span>
          <button
            type="button"
            onClick={() => upd('isActive', !form.isActive)}
            className="flex items-center gap-2"
          >
            <span className={`inline-block w-10 h-6 rounded-full relative transition-colors ${form.isActive ? 'bg-green-500' : 'bg-gray-300'}`}>
              <span className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all ${form.isActive ? 'left-5' : 'left-1'}`} />
            </span>
            <span className={`text-sm font-semibold ${form.isActive ? 'text-green-600' : 'text-gray-400'}`}>
              {form.isActive ? '재직' : '비활성'}
            </span>
          </button>
        </div>

        <div className="flex gap-2 justify-end border-t pt-3">
          <Button variant="primary" size="sm" onClick={handleSave} disabled={!form.name.trim() || saving}>
            {saving ? '저장 중...' : '저장'}
          </Button>
          <Button variant="secondary" size="sm" onClick={onClose}>취소</Button>
        </div>
      </div>
    </Modal>
  );
}
