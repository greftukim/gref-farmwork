import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import useAuthStore from '../../stores/authStore';
import useEmployeeStore from '../../stores/employeeStore';
import useNotificationStore from '../../stores/notificationStore';
import { canViewResidentId, canEditEmployee, canViewBirthDate, canViewContractExpiry } from '../../lib/permissions';
import { getContractExpiryStatus, getExpiryColorClass } from '../../utils/contractExpiry';
import { BRANCH_NULL_FALLBACK } from '../../constants/branchLabels';
import Modal from '../common/Modal';
import Button from '../common/Button';

/**
 * 직원 상세 정보 모달
 *
 * 기능:
 * - 기본 정보 표시 (이름/역할/직책/직급/생년월일/입사일/계약만료일 등)
 * - resident_id 입력 (평문 → encrypt_resident_id RPC)
 * - resident_id 표시 (마스킹 + 보기 버튼 → decrypt_resident_id RPC)
 * - 수정 버튼 (상세 모달 닫고 편집 모달 열기)
 *
 * 세션 17 UI-C 신설.
 *
 * @param {Object} props
 * @param {Object|null} props.employee - 표시 대상 직원 (null이면 모달 닫힘)
 * @param {Function} props.onClose - 모달 닫기 콜백
 * @param {Function} props.onEdit - 수정 버튼 클릭 콜백 (employee 전달)
 * @param {Object} props.branchNameMap - branch code → label 매핑
 */
export default function EmployeeDetailModal({ employee, onClose, onEdit, branchNameMap }) {
  const currentUser = useAuthStore((s) => s.currentUser);
  const { updateEmployee } = useEmployeeStore();
  const { addNotification } = useNotificationStore();

  const [residentInput, setResidentInput] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [plaintext, setPlaintext] = useState(null);
  const [isDecrypting, setIsDecrypting] = useState(false);
  const [isResidentIdSaved, setIsResidentIdSaved] = useState(false);

  // 모달 대상 변경 시 상태 리셋 (이전 직원 평문 잔존 방지)
  useEffect(() => {
    setResidentInput('');
    setPlaintext(null);
    setIsSaving(false);
    setIsDecrypting(false);
    setIsResidentIdSaved(false);
  }, [employee?.id]);

  if (!employee) return null;

  const canView = canViewResidentId(currentUser);
  const canEdit = canEditEmployee(currentUser);
  const hasResidentId = employee.residentId !== null && employee.residentId !== undefined || isResidentIdSaved;

  // 복호화 보기 버튼 클릭
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

  // 복호화 숨기기
  const handleHidePlaintext = () => {
    setPlaintext(null);
  };

  // resident_id 저장 (평문 입력 → encrypt RPC → updateEmployee)
  const handleSaveResidentId = async () => {
    if (!residentInput || isSaving) return;
    setIsSaving(true);
    try {
      // 1. encrypt RPC 호출
      const { data: encrypted, error: encryptError } = await supabase.rpc('encrypt_resident_id', {
        p_plaintext: residentInput,
      });
      if (encryptError) throw encryptError;

      // 2. DB UPDATE + 스토어 갱신 (updateEmployee 단일 호출, camelToSnake 내부 변환)
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

  // 수정 버튼 클릭 — 상세 모달 닫고 편집 모달 열기
  const handleEditClick = () => {
    onClose();
    if (onEdit) onEdit(employee);
  };

  return (
    <Modal isOpen={!!employee} onClose={onClose} title="직원 상세">
      <div className="space-y-3 text-sm">
        {/* 기본 정보 */}
        <div>
          <div className="font-semibold text-lg mb-2">{employee.name}</div>
          <dl className="space-y-1">
            <div className="flex gap-2">
              <dt className="w-20 text-gray-500 flex-shrink-0">역할</dt>
              <dd>{employee.role || BRANCH_NULL_FALLBACK}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="w-20 text-gray-500 flex-shrink-0">직책</dt>
              <dd>{employee.jobTitle || BRANCH_NULL_FALLBACK}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="w-20 text-gray-500 flex-shrink-0">직급</dt>
              <dd>{employee.jobRank || BRANCH_NULL_FALLBACK}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="w-20 text-gray-500 flex-shrink-0">직무</dt>
              <dd>{employee.jobType || BRANCH_NULL_FALLBACK}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="w-20 text-gray-500 flex-shrink-0">근무 지점</dt>
              <dd>
                {employee.branch
                  ? (branchNameMap[employee.branch] || employee.branch)
                  : BRANCH_NULL_FALLBACK}
              </dd>
            </div>
            <div className="flex gap-2">
              <dt className="w-20 text-gray-500 flex-shrink-0">연락처</dt>
              <dd>{employee.phone || BRANCH_NULL_FALLBACK}</dd>
            </div>
            {canViewBirthDate(currentUser) && (
              <div className="flex gap-2">
                <dt className="w-20 text-gray-500 flex-shrink-0">생년월일</dt>
                <dd>{employee.birthDate || BRANCH_NULL_FALLBACK}</dd>
              </div>
            )}
            <div className="flex gap-2">
              <dt className="w-20 text-gray-500 flex-shrink-0">입사일</dt>
              <dd>{employee.hireDate || BRANCH_NULL_FALLBACK}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="w-20 text-gray-500 flex-shrink-0">계약만료일</dt>
              <dd className={
                canViewContractExpiry(currentUser) && employee.contractEndDate
                  ? getExpiryColorClass(getContractExpiryStatus(employee.contractEndDate))
                  : ''
              }>
                {employee.contractEndDate || BRANCH_NULL_FALLBACK}
              </dd>
            </div>
          </dl>
        </div>

        {/* 주민번호 영역 (canViewResidentId 분기) */}
        {canView && (
          <div className="border-t pt-3">
            <div className="font-semibold mb-2">주민번호</div>

            {/* 기존 값 표시 */}
            {hasResidentId ? (
              <div className="flex gap-2 items-center mb-2">
                <span className="font-mono text-gray-700">
                  {plaintext !== null ? plaintext : '******-*******'}
                </span>
                {plaintext !== null ? (
                  <Button size="sm" variant="ghost" onClick={handleHidePlaintext}>
                    숨기기
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={handleDecrypt}
                    disabled={isDecrypting}
                  >
                    {isDecrypting ? '로딩...' : '보기'}
                  </Button>
                )}
              </div>
            ) : (
              <div className="text-gray-400 mb-2">미등록</div>
            )}

            {/* 입력 필드 (편집 권한 있을 때) */}
            {canEdit && (
              <div className="flex gap-2 items-center">
                <input
                  type="text"
                  value={residentInput}
                  onChange={(e) => setResidentInput(e.target.value)}
                  placeholder={hasResidentId ? '새 값 입력 시 덮어쓰기' : '주민번호 입력'}
                  className="flex-1 px-2 py-1.5 border border-gray-200 rounded-lg text-sm min-h-[36px]"
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
          </div>
        )}

        {/* 하단 버튼 */}
        <div className="flex gap-2 justify-end border-t pt-3">
          {canEdit && (
            <Button variant="primary" size="sm" onClick={handleEditClick}>
              수정
            </Button>
          )}
          <Button variant="secondary" size="sm" onClick={onClose}>
            닫기
          </Button>
        </div>
      </div>
    </Modal>
  );
}
