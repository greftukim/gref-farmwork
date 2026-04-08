import { useState, useMemo, useRef } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import useEmployeeStore from '../../stores/employeeStore';
import useBranchStore from '../../stores/branchStore';
import useAuthStore from '../../stores/authStore';
import Button from '../../components/common/Button';
import Card from '../../components/common/Card';
import Modal from '../../components/common/Modal';

// 본 앱의 기본 URL (배포 환경 우선, 로컬에서는 현재 origin)
const APP_BASE_URL =
  window.location.hostname === 'localhost'
    ? window.location.origin
    : 'https://gref-farmwork.vercel.app';

const emptyForm = {
  name: '',
  phone: '',
  role: 'worker',
  jobType: '재배',
  hireDate: '',
  workHoursPerWeek: 40,
  annualLeaveDays: 15,
  branch: '',
  workStartTime: '',
  workEndTime: '',
};

function EmployeeForm({ form, setForm, branchOptions }) {
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
        { value: '포장', label: '포장' },
        { value: '관리', label: '관리' },
        { value: '기타', label: '기타' },
      ])}
      {field('근무 지점', 'branch', 'text', branchOptions)}
      <div className="grid grid-cols-2 gap-3 mb-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">출근 시간</label>
          <input
            type="time"
            value={form.workStartTime}
            onChange={(e) => setForm({ ...form, workStartTime: e.target.value })}
            className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm min-h-[44px]"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">퇴근 시간</label>
          <input
            type="time"
            value={form.workEndTime}
            onChange={(e) => setForm({ ...form, workEndTime: e.target.value })}
            className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm min-h-[44px]"
          />
        </div>
      </div>
      {field('입사일', 'hireDate', 'date')}
      {field('주당 근무시간', 'workHoursPerWeek', 'number')}
      {field('연차 일수', 'annualLeaveDays', 'number')}
    </div>
  );
}

/** QR 코드 모달 */
function QrModal({ employee, onClose, onReissue, onRevoke }) {
  const canvasRef = useRef(null);
  const qrUrl = `${APP_BASE_URL}/auth?token=${employee.deviceToken}`;

  const handleDownload = () => {
    if (!canvasRef.current) return;
    const link = document.createElement('a');
    link.download = `qr-${employee.name}.png`;
    link.href = canvasRef.current.toDataURL('image/png');
    link.click();
  };

  const handlePrint = () => {
    if (!canvasRef.current) return;
    const dataUrl = canvasRef.current.toDataURL('image/png');
    const win = window.open('', '_blank');
    win.document.write(`
      <html>
        <head><title>QR - ${employee.name}</title></head>
        <body style="text-align:center;padding:40px;font-family:sans-serif;">
          <h2 style="font-size:24px;margin-bottom:8px;">${employee.name}</h2>
          <p style="color:#888;font-size:14px;margin-bottom:24px;">GREF FarmWork 출퇴근 QR</p>
          <img src="${dataUrl}" style="width:220px;height:220px;" />
          <p style="color:#aaa;font-size:11px;margin-top:24px;">스캔하여 출퇴근 등록</p>
          <script>window.onload=function(){ window.print(); setTimeout(function(){ window.close(); }, 500); }</script>
        </body>
      </html>
    `);
    win.document.close();
  };

  return (
    <Modal isOpen onClose={onClose} title={`QR 코드 — ${employee.name}`}>
      <div className="flex flex-col items-center gap-4">
        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
          <QRCodeCanvas
            ref={canvasRef}
            value={qrUrl}
            size={200}
            level="M"
            includeMargin
          />
        </div>
        <p className="text-xs text-gray-400 text-center break-all px-2">{qrUrl}</p>

        <div className="flex gap-2 w-full">
          <Button className="flex-1" onClick={handleDownload}>다운로드</Button>
          <Button className="flex-1" variant="secondary" onClick={handlePrint}>인쇄</Button>
        </div>

        <div className="w-full border-t border-gray-100 pt-3 flex gap-2">
          <Button className="flex-1" variant="secondary" onClick={onReissue}>
            QR 재발급
          </Button>
          <button
            onClick={onRevoke}
            className="flex-1 px-4 py-2.5 text-sm font-medium text-red-500 border border-red-200 rounded-xl hover:bg-red-50 transition-colors min-h-[44px]"
          >
            디바이스 해제
          </button>
        </div>
        <p className="text-xs text-gray-400 text-center">
          재발급 시 기존 QR은 무효화됩니다. 해제 시 다음 로그인 불가.
        </p>
      </div>
    </Modal>
  );
}

export default function EmployeesPage() {
  const currentUser = useAuthStore((s) => s.currentUser);
  const isManagement = currentUser?.team === 'management';

  const employees = useEmployeeStore((s) => s.employees);
  const addEmployee = useEmployeeStore((s) => s.addEmployee);
  const updateEmployee = useEmployeeStore((s) => s.updateEmployee);
  const toggleActive = useEmployeeStore((s) => s.toggleActive);
  const branches = useBranchStore((s) => s.branches);

  const branchOptions = useMemo(() => [
    { value: '', label: '선택 안 함' },
    ...branches.map((b) => ({ value: b.code, label: b.name })),
  ], [branches]);

  const branchNameMap = useMemo(() =>
    Object.fromEntries(branches.map((b) => [b.code, b.name])),
  [branches]);

  const [showModal, setShowModal] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [filter, setFilter] = useState('all');

  // QR 모달
  const [qrEmployee, setQrEmployee] = useState(null); // 현재 QR 보고 있는 직원

  const filtered = useMemo(() => {
    let list = employees;
    // 재배팀: 본인 지점 직원만 표시
    if (!isManagement && currentUser?.branch) {
      list = list.filter((e) => e.branch === currentUser.branch);
    }
    if (filter === 'active') return list.filter((e) => e.isActive);
    if (filter === 'inactive') return list.filter((e) => !e.isActive);
    return list;
  }, [employees, filter, isManagement, currentUser]);

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
      branch: emp.branch || '',
      workStartTime: emp.workStartTime || '',
      workEndTime: emp.workEndTime || '',
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

  // QR 토큰 발급 (신규 또는 재발급)
  const issueToken = async (emp) => {
    const token = crypto.randomUUID();
    await updateEmployee(emp.id, { deviceToken: token });
    // 스토어에서 업데이트된 직원 데이터로 모달 갱신
    setQrEmployee({ ...emp, deviceToken: token });
  };

  const handleQrOpen = async (emp) => {
    if (!emp.deviceToken) {
      // 토큰 없으면 즉시 발급 후 모달 오픈
      await issueToken(emp);
    } else {
      setQrEmployee(emp);
    }
  };

  const handleReissue = async () => {
    if (!qrEmployee) return;
    await issueToken(qrEmployee);
  };

  const handleRevoke = async () => {
    if (!qrEmployee) return;
    await updateEmployee(qrEmployee.id, { deviceToken: null });
    setQrEmployee(null);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-heading font-semibold text-gray-900">직원 관리</h2>
        {isManagement && <Button onClick={openAdd}>+ 직원 등록</Button>}
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
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* 모바일 카드 뷰 */}
      <div className="md:hidden space-y-3">
        {filtered.length === 0 && (
          <p className="text-center text-gray-400 py-12">등록된 직원이 없습니다</p>
        )}
        {filtered.map((emp) => (
          <Card key={emp.id} accent="gray" className={`p-4 ${!emp.isActive ? 'opacity-50' : ''}`}>
            <div className="flex items-start justify-between mb-2">
              <span className="font-semibold text-gray-900 text-base">{emp.name}</span>
              <div className="flex items-center gap-1.5">
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                  emp.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                }`}>
                  {emp.isActive ? '재직' : '비활성'}
                </span>
                <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                  {emp.role === 'admin' ? '관리자' : '작업자'}
                </span>
              </div>
            </div>
            <div className="text-sm text-gray-500 space-y-0.5 mb-3">
              <div>
                {emp.jobType}
                {emp.branch && (
                  <span className="ml-1.5 px-1.5 py-0.5 rounded text-xs bg-emerald-100 text-emerald-700">
                    {branchNameMap[emp.branch] || emp.branch}
                  </span>
                )}
              </div>
              {(emp.workStartTime || emp.workEndTime) && (
                <div>{emp.workStartTime || '—'} ~ {emp.workEndTime || '—'}</div>
              )}
              {emp.phone && <div>{emp.phone}</div>}
              {emp.hireDate && <div>입사 {emp.hireDate}</div>}
            </div>
            <div className="flex gap-2 justify-end">
              {(emp.role === 'worker' || emp.role === 'admin') && (
                <button
                  onClick={() => handleQrOpen(emp)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors min-h-[36px] ${
                    emp.deviceToken
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-blue-100 text-blue-700'
                  }`}
                >
                  {emp.deviceToken ? 'QR확인' : 'QR발급'}
                </button>
              )}
              {isManagement && (
                <>
                  <Button size="sm" variant="ghost" onClick={() => openEdit(emp)}>수정</Button>
                  <Button size="sm" variant="ghost" onClick={() => toggleActive(emp.id)}>
                    {emp.isActive ? '비활성' : '활성'}
                  </Button>
                </>
              )}
            </div>
          </Card>
        ))}
      </div>

      {/* 데스크탑 테이블 뷰 */}
      <Card accent="gray" className="hidden md:block overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-left text-gray-500">
                <th className="px-4 py-3 font-medium">이름</th>
                <th className="px-4 py-3 font-medium">역할</th>
                <th className="px-4 py-3 font-medium">직무</th>
                <th className="px-4 py-3 font-medium">근무 지점</th>
                <th className="px-4 py-3 font-medium">근무 시간</th>
                <th className="px-4 py-3 font-medium">연락처</th>
                <th className="px-4 py-3 font-medium">입사일</th>
                <th className="px-4 py-3 font-medium">상태</th>
                <th className="px-4 py-3 font-medium">QR</th>
                <th className="px-4 py-3 font-medium">관리</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((emp) => (
                <tr key={emp.id} className={`${!emp.isActive ? 'opacity-50' : ''}`}>
                  <td className="px-4 py-3 font-medium text-gray-900">{emp.name}</td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                      {emp.role === 'admin' ? '관리자' : '작업자'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{emp.jobType}</td>
                  <td className="px-4 py-3">
                    {emp.branch ? (
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">
                        {branchNameMap[emp.branch] || emp.branch}
                      </span>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                    {emp.workStartTime && emp.workEndTime
                      ? `${emp.workStartTime} ~ ${emp.workEndTime}`
                      : '—'}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{emp.phone}</td>
                  <td className="px-4 py-3 text-gray-600">{emp.hireDate}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        emp.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                      }`}
                    >
                      {emp.isActive ? '재직' : '비활성'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {(emp.role === 'worker' || emp.role === 'admin') && (
                      <button
                        onClick={() => handleQrOpen(emp)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors min-h-[32px] ${
                          emp.deviceToken
                            ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                            : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                        }`}
                      >
                        {emp.deviceToken ? 'QR확인' : 'QR발급'}
                      </button>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {isManagement && (
                      <div className="flex gap-1">
                        <Button size="sm" variant="ghost" onClick={() => openEdit(emp)}>수정</Button>
                        <Button size="sm" variant="ghost" onClick={() => toggleActive(emp.id)}>
                          {emp.isActive ? '비활성' : '활성'}
                        </Button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* 직원 등록/수정 모달 */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editTarget ? '직원 수정' : '직원 등록'}
      >
        <EmployeeForm form={form} setForm={setForm} branchOptions={branchOptions} />
        <div className="flex gap-2 mt-4">
          <Button className="flex-1" onClick={handleSave}>
            {editTarget ? '수정' : '등록'}
          </Button>
          <Button className="flex-1" variant="secondary" onClick={() => setShowModal(false)}>
            취소
          </Button>
        </div>
      </Modal>

      {/* QR 코드 모달 */}
      {qrEmployee?.deviceToken && (
        <QrModal
          employee={qrEmployee}
          onClose={() => setQrEmployee(null)}
          onReissue={handleReissue}
          onRevoke={handleRevoke}
        />
      )}
    </div>
  );
}
