import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import useAuthStore from '../../stores/authStore';
import useEmployeeStore from '../../stores/employeeStore';
import useNotificationStore from '../../stores/notificationStore';
import {
  canViewResidentId,
  canEditEmployee,
  canViewBirthDate,
  canViewContractExpiry,
  canHrCrud,
  roleLabel,
} from '../../lib/permissions';
import { getContractExpiryStatus, getExpiryColorClass } from '../../utils/contractExpiry';
import { BRANCH_NULL_FALLBACK } from '../../constants/branchLabels';
import Button from '../common/Button';

/**
 * 직원 상세 슬라이드 패널 (우측 슬라이드 인)
 *
 * 기능:
 * - 프로필 헤더 (인디고 배경, 아바타, 이름·역할·지점)
 * - 기본 정보, QR 코드 영역, 주민번호 (encrypt/decrypt RPC)
 * - 수정 / 비활성 / 닫기 버튼
 *
 * @param {Object|null} employee - 표시 대상 직원 (null이면 패널 오프스크린)
 * @param {Function} onClose
 * @param {Function} onEdit
 * @param {Function} onQrOpen   - (emp) => void, QR 발급/확인 트리거
 * @param {Function} onToggleActive - (emp) => void
 * @param {Object} branchNameMap
 */
export default function EmployeeDetailModal({
  employee,
  onClose,
  onEdit,
  onQrOpen,
  onToggleActive,
  branchNameMap,
}) {
  const currentUser = useAuthStore((s) => s.currentUser);
  const { updateEmployee } = useEmployeeStore();
  const { addNotification } = useNotificationStore();

  const [residentInput, setResidentInput] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [plaintext, setPlaintext] = useState(null);
  const [isDecrypting, setIsDecrypting] = useState(false);
  const [isResidentIdSaved, setIsResidentIdSaved] = useState(false);

  // 패널 대상 변경 시 상태 리셋 (이전 직원 평문 잔존 방지)
  useEffect(() => {
    setResidentInput('');
    setPlaintext(null);
    setIsSaving(false);
    setIsDecrypting(false);
    setIsResidentIdSaved(false);
  }, [employee?.id]);

  // 패널 열림 시 body 스크롤 잠금
  useEffect(() => {
    if (employee) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [employee]);

  const isOpen = !!employee;
  const canView = canViewResidentId(currentUser);
  const canEdit = canEditEmployee(currentUser);
  const isManagement = canHrCrud(currentUser);
  const hasResidentId =
    (employee?.residentId !== null && employee?.residentId !== undefined) ||
    isResidentIdSaved;

  // 복호화 보기
  const handleDecrypt = async () => {
    if (isDecrypting) return;
    setIsDecrypting(true);
    try {
      const { data, error } = await supabase.rpc('decrypt_resident_id', {
        p_employee_id: employee.id,
      });
      if (error) throw error;
      setPlaintext(data);
    } catch (err) {
      console.error('decrypt_resident_id error:', err);
      addNotification({ type: 'issue_report', title: '복호화 실패', message: err.message || '주민번호 조회 실패' });
    } finally {
      setIsDecrypting(false);
    }
  };

  const handleHidePlaintext = () => setPlaintext(null);

  // resident_id 저장
  const handleSaveResidentId = async () => {
    if (!residentInput || isSaving) return;
    setIsSaving(true);
    try {
      const { data: encrypted, error: encryptError } = await supabase.rpc('encrypt_resident_id', {
        p_plaintext: residentInput,
      });
      if (encryptError) throw encryptError;
      await updateEmployee(employee.id, { residentId: encrypted });
      setResidentInput('');
      setPlaintext(null);
      setIsResidentIdSaved(true);
      addNotification({ type: 'task_completed', title: '저장 완료', message: '주민번호 저장 완료' });
    } catch (err) {
      console.error('encrypt/save resident_id error:', err);
      addNotification({ type: 'issue_report', title: '저장 실패', message: err.message || '주민번호 저장 실패' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleEditClick = () => {
    onClose();
    if (onEdit) onEdit(employee);
  };

  return (
    <>
      {/* 백드롭 */}
      <div
        className={`fixed inset-0 bg-black/40 z-40 transition-opacity duration-300 ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      />

      {/* 슬라이드 패널 */}
      <div
        className={`fixed top-0 right-0 h-full w-full sm:w-[400px] bg-white z-50 shadow-2xl
          flex flex-col transition-transform duration-300 ease-in-out
          ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
      >
        {employee ? (
          <>
            {/* 프로필 헤더 — 인디고 배경 */}
            <div className="bg-[#6366F1] px-6 pt-10 pb-6 flex-shrink-0">
              <div className="flex justify-end mb-3">
                <button
                  onClick={onClose}
                  className="text-white/60 hover:text-white p-1.5 rounded-xl active:scale-95 transition-all min-w-[40px] min-h-[40px] flex items-center justify-center"
                  aria-label="닫기"
                >
                  ✕
                </button>
              </div>
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                  <span className="text-2xl font-bold text-white">{employee.name[0]}</span>
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-xl font-bold text-white">{employee.name}</h3>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      employee.isActive ? 'bg-white/20 text-white' : 'bg-white/10 text-white/60'
                    }`}>
                      {employee.isActive ? '재직' : '비활성'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-1.5 text-white/70 text-sm flex-wrap">
                    <span>{roleLabel(employee.role)}</span>
                    {employee.branch && (
                      <>
                        <span className="text-white/30">·</span>
                        <span>{branchNameMap[employee.branch] || employee.branch}</span>
                      </>
                    )}
                    {employee.isTeamLeader && (
                      <>
                        <span className="text-white/30">·</span>
                        <span className="text-white/90 font-semibold">반장</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* 스크롤 콘텐츠 */}
            <div className="flex-1 overflow-y-auto">
              <div className="p-6 space-y-6">

                {/* 기본 정보 섹션 */}
                <section>
                  <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">기본 정보</h4>
                  <div className="space-y-2.5">
                    {[
                      { label: '직무', value: employee.jobType },
                      { label: '직책', value: employee.jobTitle },
                      { label: '직급', value: employee.jobRank },
                      { label: '연락처', value: employee.phone },
                      { label: '입사일', value: employee.hireDate },
                    ].map(({ label, value }) =>
                      value ? (
                        <div key={label} className="flex items-center gap-3">
                          <span className="text-xs text-gray-400 w-14 flex-shrink-0">{label}</span>
                          <span className="text-sm text-gray-900">{value}</span>
                        </div>
                      ) : null
                    )}

                    {canViewBirthDate(currentUser) && employee.birthDate && (
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-gray-400 w-14 flex-shrink-0">생년월일</span>
                        <span className="text-sm text-gray-900">{employee.birthDate}</span>
                      </div>
                    )}

                    {employee.contractEndDate && (
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-gray-400 w-14 flex-shrink-0">계약만료일</span>
                        <span className={`text-sm ${
                          canViewContractExpiry(currentUser)
                            ? getExpiryColorClass(getContractExpiryStatus(employee.contractEndDate))
                            : 'text-gray-900'
                        }`}>
                          {employee.contractEndDate}
                        </span>
                      </div>
                    )}

                    {(employee.workStartTime || employee.workEndTime) && (
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-gray-400 w-14 flex-shrink-0">근무 시간</span>
                        <span className="text-sm text-gray-900">
                          {employee.workStartTime || BRANCH_NULL_FALLBACK} ~ {employee.workEndTime || BRANCH_NULL_FALLBACK}
                        </span>
                      </div>
                    )}
                  </div>
                </section>

                {/* QR 코드 영역 (작업자 전용) */}
                {employee.role === 'worker' && onQrOpen && (
                  <section>
                    <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">QR 코드</h4>
                    <button
                      onClick={() => onQrOpen(employee)}
                      className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl text-sm font-medium transition-colors active:scale-[0.98] ${
                        employee.deviceToken
                          ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                          : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100'
                      }`}
                    >
                      <span>{employee.deviceToken ? 'QR 코드 확인 · 재발급' : 'QR 코드 발급'}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        employee.deviceToken
                          ? 'bg-emerald-100 text-emerald-600'
                          : 'bg-indigo-100 text-indigo-600'
                      }`}>
                        {employee.deviceToken ? '발급됨' : '미발급'}
                      </span>
                    </button>
                  </section>
                )}

                {/* 주민번호 영역 (canViewResidentId 분기) */}
                {canView && (
                  <section>
                    <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">주민번호</h4>

                    {hasResidentId ? (
                      <div className="flex gap-2 items-center mb-3 bg-gray-50 rounded-2xl px-4 py-3">
                        <span className="font-mono text-gray-700 flex-1 text-sm">
                          {plaintext !== null ? plaintext : '******-*******'}
                        </span>
                        {plaintext !== null ? (
                          <Button size="sm" variant="ghost" onClick={handleHidePlaintext}>숨기기</Button>
                        ) : (
                          <Button size="sm" variant="ghost" onClick={handleDecrypt} disabled={isDecrypting}>
                            {isDecrypting ? '로딩...' : '보기'}
                          </Button>
                        )}
                      </div>
                    ) : (
                      <div className="text-sm text-gray-400 mb-3">미등록</div>
                    )}

                    {canEdit && (
                      <div className="flex gap-2 items-center">
                        <input
                          type="text"
                          value={residentInput}
                          onChange={(e) => setResidentInput(e.target.value)}
                          placeholder={hasResidentId ? '새 값 입력 시 덮어쓰기' : '주민번호 입력'}
                          className="flex-1 px-3 py-2 border border-gray-200 rounded-xl text-sm min-h-[40px] focus:outline-none focus:ring-2 focus:ring-indigo-200"
                          disabled={isSaving}
                        />
                        <Button
                          size="sm"
                          onClick={handleSaveResidentId}
                          disabled={!residentInput || isSaving}
                        >
                          {isSaving ? '저장 중...' : '저장'}
                        </Button>
                      </div>
                    )}
                  </section>
                )}
              </div>
            </div>

            {/* 하단 버튼 */}
            <div className="px-6 py-4 border-t border-gray-100 flex gap-2 flex-shrink-0">
              {canEdit && (
                <Button className="flex-1" onClick={handleEditClick}>수정</Button>
              )}
              {isManagement && onToggleActive && (
                <button
                  onClick={() => onToggleActive(employee)}
                  className={`flex-1 px-4 py-2.5 text-sm font-medium rounded-xl border transition-colors active:scale-[0.98] min-h-[44px] ${
                    employee.isActive
                      ? 'text-gray-500 border-gray-200 hover:bg-gray-50'
                      : 'text-indigo-600 border-indigo-200 hover:bg-indigo-50'
                  }`}
                >
                  {employee.isActive ? '비활성 처리' : '활성 처리'}
                </button>
              )}
              <button
                onClick={onClose}
                className="px-4 py-2.5 text-sm font-medium text-gray-500 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors active:scale-[0.98] min-h-[44px]"
              >
                닫기
              </button>
            </div>
          </>
        ) : null}
      </div>
    </>
  );
}
