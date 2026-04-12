import { useMemo, useState } from 'react';
import Modal from '../common/Modal';
import Button from '../common/Button';
import useDailyWorkLogStore from '../../stores/dailyWorkLogStore';
import { isFarmAdmin } from '../../lib/permissions';

const BRANCH_OPTIONS = [
  { value: 'busan', label: '부산LAB' },
  { value: 'jinju', label: '진주' },
  { value: 'hadong', label: '하동' },
];

// [TEMP-DECISION-1] payment_status 2단계. 박민식·김민국 답 수신 시 옵션 확장
const PAYMENT_STATUS_OPTIONS = [
  { value: 'pending', label: '미지급' },
  { value: 'paid', label: '지급완료' },
];

// 교훈 3: Supabase TIME 컬럼 → 'HH:MM:SS'. time input에는 'HH:MM'
function toTimeInput(t) {
  if (!t) return '';
  return String(t).slice(0, 5);
}

// HH:MM 자동 포맷팅
// "0830" → "08:30", "8" → "8", "08" → "08", "083" → "08:3"
const formatTimeInput = (raw) => {
  const digits = raw.replace(/\D/g, '').slice(0, 4);
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}:${digits.slice(2)}`;
};

// "08:30" 완성된 HH:MM 여부
const isValidTime = (value) => /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value);

// [TEMP-DECISION-4] 일당 프리뷰 반올림: ROUND (DB GENERATED와 동일)
function calcPreview(startTime, endTime, breakMinutes, hourlyWage) {
  if (!startTime || !endTime || !hourlyWage) return null;
  const [sh, sm] = startTime.split(':').map(Number);
  const [eh, em] = endTime.split(':').map(Number);
  if ([sh, sm, eh, em].some(isNaN)) return null;
  const totalMins = (eh * 60 + em) - (sh * 60 + sm);
  // [TEMP-DECISION-2] break_minutes 미입력 허용 (null = 미기록 → 0으로 계산)
  const breakMins = Number(breakMinutes) || 0;
  const workMins  = totalMins - breakMins;
  if (workMins <= 0) return null;
  const wage = Number(hourlyWage);
  if (!wage || isNaN(wage)) return null;
  const dailyWage = Math.round(wage * workMins / 60);
  return { workMins, dailyWage };
}

function formatWon(n) {
  return n.toLocaleString('ko-KR') + '원';
}

const inputCls = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm min-h-[44px] focus:outline-none focus:ring-2 focus:ring-blue-500/30';
const labelCls = 'block text-xs font-medium text-gray-600 mb-1';

/**
 * 일용직 등록/수정 모달
 * @param {'create'|'edit'} mode
 * @param {object} [initialData] - edit 모드 시 camelCase log 객체
 * @param {string} defaultDate - 'YYYY-MM-DD'
 * @param {string} defaultBranch - 'busan' | 'jinju' | 'hadong'
 * @param {object} currentUser
 * @param {()=>void} onClose
 * @param {()=>void} onSaved - 저장 성공 후 호출
 */
export default function DailyWorkLogFormModal({
  mode,
  initialData,
  defaultDate,
  defaultBranch,
  currentUser,
  onClose,
  onSaved,
}) {
  const createLog  = useDailyWorkLogStore((s) => s.createLog);
  const updateLog  = useDailyWorkLogStore((s) => s.updateLog);
  const storeError = useDailyWorkLogStore((s) => s.error);
  const clearError = useDailyWorkLogStore((s) => s.clearError);

  const [form, setForm] = useState({
    work_date:       initialData?.workDate    || defaultDate,
    branch:          initialData?.branch      || defaultBranch,
    worker_name:     initialData?.workerName  || '',
    worker_phone:    initialData?.workerPhone || '',
    start_time:      toTimeInput(initialData?.startTime),
    end_time:        toTimeInput(initialData?.endTime),
    // [TEMP-DECISION-2] break_minutes nullable — 빈 문자열 = 미입력
    break_minutes:   initialData?.breakMinutes != null ? String(initialData.breakMinutes) : '',
    hourly_wage:     initialData?.hourlyWage  != null ? String(initialData.hourlyWage)  : '',
    work_description: initialData?.workDescription || '',
    payment_status:  initialData?.paymentStatus || 'pending',
    paid_at:         initialData?.paidAt || '',
  });

  const [clientError, setClientError] = useState('');
  const [saving, setSaving] = useState(false);

  const farmAdmin = isFarmAdmin(currentUser);

  // 실시간 프리뷰 (JS 계산 — DB GENERATED와 동일 공식)
  // isValidTime 통과 시에만 계산 — 불완전 입력("08:3" 등) NaN 방지
  const preview = useMemo(() => {
    if (!isValidTime(form.start_time) || !isValidTime(form.end_time)) return null;
    return calcPreview(form.start_time, form.end_time, form.break_minutes, form.hourly_wage);
  }, [form.start_time, form.end_time, form.break_minutes, form.hourly_wage]);

  function set(key, val) {
    setForm((prev) => ({ ...prev, [key]: val }));
    if (clientError) setClientError('');
    if (storeError) clearError();
  }

  function validate() {
    if (!form.worker_name.trim()) return '작업자 이름을 입력하세요';
    // 형식 체크 먼저 — 불완전 입력 상태에서 문자열 비교 방지
    if (!isValidTime(form.start_time) || !isValidTime(form.end_time)) {
      return '시간 형식이 올바르지 않습니다. HH:MM 형식으로 입력해주세요. 예: 08:30';
    }
    if (form.end_time <= form.start_time) return '퇴근 시각은 출근 시각보다 늦어야 합니다';
    if (form.break_minutes !== '' && Number(form.break_minutes) < 0) return '휴게시간은 0 이상이어야 합니다';
    if (!form.hourly_wage || Number(form.hourly_wage) <= 0) return '시급을 올바르게 입력하세요';
    if (!preview) return '입력값을 확인하세요 (근무시간이 0 이하입니다)';
    return '';
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const err = validate();
    if (err) { setClientError(err); return; }

    const payload = {
      work_date:    form.work_date,
      branch:       farmAdmin ? currentUser.branch : form.branch,
      worker_name:  form.worker_name.trim(),
      worker_phone: form.worker_phone.trim() || null,
      start_time:   form.start_time,
      end_time:     form.end_time,
      // [TEMP-DECISION-2] break_minutes: 빈 문자열 → null (미기록)
      break_minutes: form.break_minutes !== '' ? Number(form.break_minutes) : null,
      hourly_wage:   Number(form.hourly_wage),
      work_description: form.work_description.trim() || null,
      payment_status: form.payment_status,
      paid_at: form.payment_status === 'paid' && form.paid_at ? form.paid_at : null,
      // ⚠️ work_minutes / daily_wage 포함 금지 (GENERATED 컬럼, DB 자동 계산)
    };

    setSaving(true);
    if (mode === 'create') {
      await createLog(payload);
    } else {
      await updateLog(initialData.id, payload);
    }
    setSaving(false);

    // 저장 성공 여부는 store error로 판단
    const latestError = useDailyWorkLogStore.getState().error;
    if (!latestError) {
      onSaved();
      onClose();
    }
  }

  const displayError = clientError || storeError;

  return (
    <Modal
      isOpen
      onClose={onClose}
      title={mode === 'create' ? '일용직 등록' : '일용직 수정'}
    >
      <form onSubmit={handleSubmit} className="space-y-3">

        {/* work_date */}
        <div>
          <label className={labelCls}>근무 일자 *</label>
          <input
            type="date"
            value={form.work_date}
            onChange={(e) => set('work_date', e.target.value)}
            className={inputCls}
            required
          />
        </div>

        {/* branch */}
        <div>
          <label className={labelCls}>농장 *</label>
          {farmAdmin ? (
            <div className={`${inputCls} bg-gray-50 text-gray-500 cursor-not-allowed`}>
              {BRANCH_OPTIONS.find((b) => b.value === currentUser.branch)?.label || currentUser.branch}
            </div>
          ) : (
            <select
              value={form.branch}
              onChange={(e) => set('branch', e.target.value)}
              className={inputCls}
            >
              {BRANCH_OPTIONS.map((b) => (
                <option key={b.value} value={b.value}>{b.label}</option>
              ))}
            </select>
          )}
        </div>

        {/* worker_name */}
        <div>
          <label className={labelCls}>작업자 이름 *</label>
          <input
            type="text"
            value={form.worker_name}
            onChange={(e) => set('worker_name', e.target.value)}
            placeholder="홍길동"
            className={inputCls}
            required
          />
        </div>

        {/* worker_phone */}
        <div>
          <label className={labelCls}>연락처</label>
          <input
            type="tel"
            value={form.worker_phone}
            onChange={(e) => set('worker_phone', e.target.value)}
            placeholder="010-0000-0000 (선택)"
            className={inputCls}
          />
        </div>

        {/* start_time / end_time — 텍스트 입력 + 자동 HH:MM 포맷팅 */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>출근 시각 *</label>
            <input
              type="text"
              inputMode="numeric"
              value={form.start_time}
              onChange={(e) => set('start_time', formatTimeInput(e.target.value))}
              placeholder="08:30"
              maxLength={5}
              pattern="^(?:[01]\d|2[0-3]):[0-5]\d$"
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>퇴근 시각 *</label>
            <input
              type="text"
              inputMode="numeric"
              value={form.end_time}
              onChange={(e) => set('end_time', formatTimeInput(e.target.value))}
              placeholder="16:30"
              maxLength={5}
              pattern="^(?:[01]\d|2[0-3]):[0-5]\d$"
              className={inputCls}
            />
          </div>
        </div>

        {/* break_minutes */}
        {/* [TEMP-DECISION-2] break_minutes 미입력 허용 (null = 미기록) */}
        <div>
          <label className={labelCls}>휴게시간 (분)</label>
          <input
            type="number"
            value={form.break_minutes}
            onChange={(e) => set('break_minutes', e.target.value)}
            placeholder="0 (선택)"
            min="0"
            className={inputCls}
          />
        </div>

        {/* hourly_wage */}
        <div>
          <label className={labelCls}>시급 (원) *</label>
          <input
            type="number"
            value={form.hourly_wage}
            onChange={(e) => set('hourly_wage', e.target.value)}
            placeholder="10000"
            min="10"
            step="10"
            className={inputCls}
            required
          />
        </div>

        {/* 예상 근무시간·일당 프리뷰 (GENERATED 컬럼 입력 필드 없음 — 읽기 전용 표시) */}
        {preview ? (
          <div className="bg-emerald-50 border border-emerald-100 rounded-lg px-3 py-2 text-sm text-emerald-700 flex justify-between">
            {/* [TEMP-DECISION-4] 일당 프리뷰 반올림: ROUND (DB GENERATED와 동일) */}
            <span>예상 근무: <strong>{preview.workMins}분</strong></span>
            <span>예상 일당: <strong>{formatWon(preview.dailyWage)}</strong></span>
          </div>
        ) : (
          <p className="text-xs text-gray-400 text-center py-1">
            시간 입력 후 근무시간·일당이 자동 계산됩니다
          </p>
        )}

        {/* work_description */}
        <div>
          <label className={labelCls}>작업 내용</label>
          <textarea
            value={form.work_description}
            onChange={(e) => set('work_description', e.target.value)}
            placeholder="포장 보조, 수확 등 (선택)"
            rows={2}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 resize-none"
          />
        </div>

        {/* payment_status */}
        {/* [TEMP-DECISION-1] payment_status 2단계. 박민식·김민국 답 수신 시 옵션 확장 */}
        <div>
          <label className={labelCls}>지급 상태 *</label>
          <select
            value={form.payment_status}
            onChange={(e) => set('payment_status', e.target.value)}
            className={inputCls}
          >
            {PAYMENT_STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>

        {/* paid_at — payment_status='paid'일 때만 활성화 */}
        {form.payment_status === 'paid' && (
          <div>
            <label className={labelCls}>지급일</label>
            <input
              type="date"
              value={form.paid_at}
              onChange={(e) => set('paid_at', e.target.value)}
              className={inputCls}
            />
          </div>
        )}

        {/* 에러 메시지 */}
        {displayError && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
            {displayError}
          </p>
        )}

        {/* 액션 버튼 */}
        <div className="flex gap-3 pt-1">
          <Button
            type="button"
            variant="secondary"
            className="flex-1"
            onClick={onClose}
            disabled={saving}
          >
            취소
          </Button>
          <Button
            type="submit"
            className="flex-1"
            disabled={saving}
          >
            {saving ? '저장 중...' : mode === 'create' ? '등록' : '저장'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
