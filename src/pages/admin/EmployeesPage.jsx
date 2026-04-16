import { useState, useMemo, useRef } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import useEmployeeStore from '../../stores/employeeStore';
import useBranchStore from '../../stores/branchStore';
import useAuthStore from '../../stores/authStore';
import Button from '../../components/common/Button';
import {
  isFarmAdmin,
  canHrCrud,
  canWrite,
  roleLabel,
  canEditEmployee,
  canAssignLeader,
  canViewBirthDate,
  canViewContractExpiry,
} from '../../lib/permissions';
import { getContractExpiryStatus, getExpiryColorClass } from '../../utils/contractExpiry';
import useNotificationStore from '../../stores/notificationStore';
import Modal from '../../components/common/Modal';
import { BRANCH_NULL_FALLBACK } from '../../constants/branchLabels';
import EmployeeDetailModal from '../../components/employees/EmployeeDetailModal';

// 본 앱의 기본 URL (배포 환경 우선, 로컬에서는 현재 origin)
const APP_BASE_URL =
  window.location.hostname === 'localhost'
    ? window.location.origin
    : 'https://gref-farmwork.vercel.app';

// ─── UI 스타일 상수 ────────────────────────────────────────────────────────────
const AVATAR_COLORS = {
  worker: 'bg-indigo-100 text-indigo-700',
  farm_admin: 'bg-emerald-100 text-emerald-700',
  hr_admin: 'bg-blue-100 text-blue-700',
  master: 'bg-purple-100 text-purple-700',
  general: 'bg-amber-100 text-amber-700',
};

const JOB_TYPE_BADGE = {
  '재배': 'bg-indigo-100 text-indigo-700',
  '포장': 'bg-emerald-100 text-emerald-700',
  '관리': 'bg-blue-100 text-blue-700',
  '기타': 'bg-gray-100 text-gray-600',
};
// ──────────────────────────────────────────────────────────────────────────────

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
  // 세션 17 UI-A 추가 (4필드, residentId는 UI-C에서 처리)
  jobTitle: '',
  jobRank: '',
  birthDate: '',
  contractEndDate: '',
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
        { value: 'worker', label: '작업자' },
        { value: 'farm_admin', label: '지점 관리자' },
        { value: 'hr_admin', label: '인사 관리자' },
        { value: 'general', label: '총괄' },
        { value: 'master', label: '최고 관리자' },
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
      {/* 세션 17 UI-B 추가 (4필드, residentId는 UI-C에서 처리) */}
      {field('직책', 'jobTitle')}
      {field('직급', 'jobRank')}
      {field('생년월일', 'birthDate', 'date')}
      {field('계약만료일', 'contractEndDate', 'date')}
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
  const isManagement = canHrCrud(currentUser);
  const canToggleTeamLeader = canWrite(currentUser); // farm_admin, hr_admin, master

  const employees = useEmployeeStore((s) => s.employees);
  const addEmployee = useEmployeeStore((s) => s.addEmployee);
  const updateEmployee = useEmployeeStore((s) => s.updateEmployee);
  const toggleActive = useEmployeeStore((s) => s.toggleActive);
  const toggleTeamLeader = useEmployeeStore((s) => s.toggleTeamLeader);
  const branches = useBranchStore((s) => s.branches);
  const addNotification = useNotificationStore((s) => s.addNotification);

  const branchOptions = useMemo(() => [
    { value: '', label: '선택 안 함' },
    ...branches.map((b) => ({ value: b.code, label: b.name })),
  ], [branches]);

  const branchNameMap = useMemo(() =>
    Object.fromEntries(branches.map((b) => [b.code, b.name])),
  [branches]);

  // farm_admin 지점명 (권한 배너용)
  const currentBranchName = useMemo(() => {
    if (!isFarmAdmin(currentUser)) return null;
    return branchNameMap[currentUser.branch] || currentUser.branch || '본인 지점';
  }, [currentUser, branchNameMap]);

  const [lastLeaderConfirm, setLastLeaderConfirm] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [filter, setFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // 상세 슬라이드 패널
  const [detailTarget, setDetailTarget] = useState(null);

  // QR 모달
  const [qrEmployee, setQrEmployee] = useState(null);

  const filtered = useMemo(() => {
    let list = employees;
    // 재배팀: 본인 지점 직원만 표시
    if (isFarmAdmin(currentUser) && currentUser?.branch) {
      list = list.filter((e) => e.branch === currentUser.branch);
    }
    if (filter === 'active') return list.filter((e) => e.isActive);
    if (filter === 'inactive') return list.filter((e) => !e.isActive);
    return list;
  }, [employees, filter, isManagement, currentUser]);

  // 검색어 필터 (이름·연락처)
  const displayList = useMemo(() => {
    if (!searchQuery.trim()) return filtered;
    const q = searchQuery.toLowerCase().trim();
    return filtered.filter(
      (e) => e.name?.toLowerCase().includes(q) || e.phone?.toLowerCase().includes(q)
    );
  }, [filtered, searchQuery]);

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
      // 세션 17 UI-B 추가 (4필드, residentId는 UI-C에서)
      jobTitle: emp.jobTitle || '',
      jobRank: emp.jobRank || '',
      birthDate: emp.birthDate || '',
      contractEndDate: emp.contractEndDate || '',
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
    setQrEmployee({ ...emp, deviceToken: token });
  };

  const handleQrOpen = async (emp) => {
    if (!emp.deviceToken) {
      await issueToken(emp);
    } else {
      setQrEmployee(emp);
    }
  };

  const handleReissue = async () => {
    if (!qrEmployee) return;
    await issueToken(qrEmployee);
  };

  const handleToggleTeamLeader = async (emp, nextValue) => {
    // 반장 해제 시 마지막 반장 여부 확인
    if (!nextValue) {
      const othersInBranch = employees.filter(
        (e) => e.branch === emp.branch && e.isTeamLeader && e.id !== emp.id
      );
      if (othersInBranch.length === 0) {
        const branchName = branchNameMap[emp.branch] || emp.branch;
        setLastLeaderConfirm({ emp, branchName });
        return;
      }
    }
    await doToggleTeamLeader(emp, nextValue);
  };

  const doToggleTeamLeader = async (emp, nextValue) => {
    const { error } = await toggleTeamLeader(emp.id, nextValue);
    if (error) {
      addNotification({
        type: 'issue_report',
        title: '반장 변경 실패',
        message: `${emp.name} 반장 ${nextValue ? '지정' : '해제'}에 실패했습니다. 권한을 확인하세요.`,
      });
    }
  };

  const handleRevoke = async () => {
    if (!qrEmployee) return;
    await updateEmployee(qrEmployee.id, { deviceToken: null });
    setQrEmployee(null);
  };

  // 팀 리더 토글 공통 컴포넌트
  const LeaderToggle = ({ emp }) => (
    <div className="flex items-center gap-1.5">
      <button
        onClick={(e) => { e.stopPropagation(); handleToggleTeamLeader(emp, !emp.isTeamLeader); }}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors active:scale-[0.98] ${
          emp.isTeamLeader ? 'bg-[#6366F1]' : 'bg-gray-200'
        }`}
        aria-label={emp.isTeamLeader ? '반장 해제' : '반장 지정'}
      >
        <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
          emp.isTeamLeader ? 'translate-x-6' : 'translate-x-1'
        }`} />
      </button>
    </div>
  );

  return (
    <div>
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-heading font-bold text-gray-900">
          직원 관리
          <span className="ml-2 text-sm font-normal text-gray-400 bg-gray-100 px-2.5 py-1 rounded-full">
            {displayList.length}명
          </span>
        </h2>
        {isManagement && <Button onClick={openAdd}>+ 직원 등록</Button>}
      </div>

      {/* Farm Admin 권한 배너 */}
      {isFarmAdmin(currentUser) && (
        <div className="bg-indigo-50 border border-indigo-100 rounded-2xl px-4 py-3 mb-4 flex items-center gap-3">
          <span className="text-indigo-400 flex-shrink-0">🔒</span>
          <span className="text-sm text-indigo-700">
            <span className="font-semibold">{currentBranchName}</span> 지점 직원만 표시됩니다
          </span>
        </div>
      )}

      {/* 필터 탭 + 검색 */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="flex gap-2">
          {[
            { key: 'all', label: '전체' },
            { key: 'active', label: '재직' },
            { key: 'inactive', label: '비활성' },
          ].map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors min-h-[40px] ${
                filter === f.key
                  ? 'bg-[#6366F1] text-white shadow-sm shadow-indigo-200'
                  : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="relative flex-1">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="이름 또는 연락처 검색"
            className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2 pr-9 text-sm min-h-[40px] focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* 모바일 카드 뷰 */}
      <div className="md:hidden space-y-3">
        {displayList.length === 0 && (
          <p className="text-center text-gray-400 py-12">등록된 직원이 없습니다</p>
        )}
        {displayList.map((emp) => (
          <div
            key={emp.id}
            className={`bg-white rounded-[24px] shadow-sm border border-gray-100 p-4 active:scale-[0.99] transition-transform cursor-pointer ${
              !emp.isActive ? 'opacity-50' : ''
            }`}
            onClick={() => setDetailTarget(emp)}
          >
            {/* 이름 + 배지 */}
            <div className="flex items-center gap-3 mb-3">
              <div className={`w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0 text-base font-bold ${
                AVATAR_COLORS[emp.role] || 'bg-gray-100 text-gray-600'
              }`}>
                {emp.name[0]}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-gray-900">{emp.name}</span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                    emp.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'
                  }`}>
                    {emp.isActive ? '재직' : '비활성'}
                  </span>
                  {emp.isTeamLeader && (
                    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-700">반장</span>
                  )}
                </div>
                <div className="text-xs text-gray-400 mt-0.5">{roleLabel(emp.role)}</div>
              </div>
              <span className="text-gray-300 text-lg flex-shrink-0">›</span>
            </div>

            {/* 직무 + 지점 배지 */}
            <div className="flex flex-wrap gap-2 text-xs mb-3">
              {emp.jobType && (
                <span className={`px-2.5 py-1 rounded-full font-medium ${JOB_TYPE_BADGE[emp.jobType] || 'bg-gray-100 text-gray-600'}`}>
                  {emp.jobType}
                </span>
              )}
              {emp.branch && (
                <span className="px-2.5 py-1 rounded-full bg-gray-100 text-gray-600 font-medium">
                  {branchNameMap[emp.branch] || emp.branch}
                </span>
              )}
            </div>

            {emp.phone && (
              <div className="text-xs text-gray-500 mb-3">{emp.phone}</div>
            )}

            {/* 반장 토글 */}
            {canAssignLeader(currentUser, emp) && emp.role === 'worker' && (
              <div className="flex items-center gap-2 border-t border-gray-50 pt-3">
                <LeaderToggle emp={emp} />
                <span className="text-xs text-gray-500">반장 지정</span>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* 데스크탑 테이블 뷰 */}
      <div className="hidden md:block bg-white rounded-[24px] shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="px-5 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">이름</th>
                <th className="px-5 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">직무</th>
                <th className="px-5 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">직책·직급</th>
                <th className="px-5 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">연락처</th>
                {canToggleTeamLeader && (
                  <th className="px-5 py-4 text-center text-xs font-semibold text-gray-400 uppercase tracking-wider">반장</th>
                )}
                <th className="px-5 py-4 text-right text-xs font-semibold text-gray-400 uppercase tracking-wider">상세</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {displayList.length === 0 && (
                <tr>
                  <td colSpan={canToggleTeamLeader ? 6 : 5} className="text-center text-gray-400 py-12">
                    등록된 직원이 없습니다
                  </td>
                </tr>
              )}
              {displayList.map((emp) => (
                <tr
                  key={emp.id}
                  className={`cursor-pointer hover:bg-gray-50 transition-colors ${!emp.isActive ? 'opacity-50' : ''}`}
                  onClick={() => setDetailTarget(emp)}
                >
                  {/* 이름: 아바타 + 이름 + 역할 */}
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 font-bold ${
                        AVATAR_COLORS[emp.role] || 'bg-gray-100 text-gray-600'
                      }`}>
                        {emp.name[0]}
                      </div>
                      <div>
                        <div className="font-semibold text-gray-900">{emp.name}</div>
                        <div className="text-xs text-gray-400">{roleLabel(emp.role)}</div>
                      </div>
                    </div>
                  </td>

                  {/* 직무 배지 */}
                  <td className="px-5 py-4">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                      JOB_TYPE_BADGE[emp.jobType] || 'bg-gray-100 text-gray-600'
                    }`}>
                      {emp.jobType || '—'}
                    </span>
                  </td>

                  {/* 직책·직급 */}
                  <td className="px-5 py-4 text-sm text-gray-700">
                    {[emp.jobTitle, emp.jobRank].filter(Boolean).join(' / ') || (
                      <span className="text-gray-300">{BRANCH_NULL_FALLBACK}</span>
                    )}
                  </td>

                  {/* 연락처 */}
                  <td className="px-5 py-4 text-sm text-gray-600">
                    {emp.phone || <span className="text-gray-300">{BRANCH_NULL_FALLBACK}</span>}
                  </td>

                  {/* 반장 토글 */}
                  {canToggleTeamLeader && (
                    <td className="px-5 py-4 text-center">
                      {canAssignLeader(currentUser, emp) && emp.role === 'worker' ? (
                        <LeaderToggle emp={emp} />
                      ) : (
                        <span className="text-gray-200 text-xs">—</span>
                      )}
                    </td>
                  )}

                  {/* 상세 보기 버튼 */}
                  <td className="px-5 py-4 text-right">
                    <button
                      onClick={(e) => { e.stopPropagation(); setDetailTarget(emp); }}
                      className="px-3 py-1.5 rounded-xl text-xs font-medium bg-gray-100 text-gray-600 hover:bg-indigo-50 hover:text-indigo-600 transition-colors min-h-[32px]"
                    >
                      보기
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

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

      {/* 마지막 반장 해제 확인 모달 */}
      {lastLeaderConfirm && (
        <Modal
          isOpen
          onClose={() => setLastLeaderConfirm(null)}
          title="마지막 반장 해제"
        >
          <p className="text-sm text-gray-700 leading-relaxed">
            <span className="font-semibold">{lastLeaderConfirm.branchName}</span>의 마지막 반장을 해제합니다.
            반장이 0명이 되면 신규 TBM 승인이 불가능합니다.
            계속하시겠습니까?
          </p>
          <div className="flex gap-2 mt-5">
            <button
              onClick={async () => {
                const { emp } = lastLeaderConfirm;
                setLastLeaderConfirm(null);
                await doToggleTeamLeader(emp, false);
              }}
              className="flex-1 px-4 py-2.5 text-sm font-medium text-red-600 border border-red-300 rounded-xl hover:bg-red-50 transition-colors active:scale-[0.98] min-h-[44px]"
            >
              해제
            </button>
            <Button className="flex-1" variant="secondary" onClick={() => setLastLeaderConfirm(null)}>
              취소
            </Button>
          </div>
        </Modal>
      )}

      {/* 직원 상세 슬라이드 패널 (QrModal보다 먼저 렌더 → QrModal이 위에 쌓임) */}
      <EmployeeDetailModal
        employee={detailTarget}
        onClose={() => setDetailTarget(null)}
        onEdit={openEdit}
        onQrOpen={handleQrOpen}
        onToggleActive={(emp) => { toggleActive(emp.id); setDetailTarget(null); }}
        branchNameMap={branchNameMap}
      />

      {/* QR 코드 모달 (슬라이드 패널보다 나중에 렌더 → z-50 동일, DOM 순서상 위에 표시) */}
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
