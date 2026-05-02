// 연장근무 신청 모달 — 트랙 77 U7
// 시안: screens/worker-screens-v2.jsx ScreenOvertimeModal
// 자산: useOvertimeStore.submitRequest 기존 호출 (DB 변경 0)
//
// G77-J (U7 결정): 근태 페이지는 휴가만 다루고, 연장근무는 홈 출퇴근 카드(출근 중)에서만 진입.
//   → 본 모달은 WorkerHome에서만 사용. WorkerAttendancePage에서 분리됨.

import React, { useMemo, useState } from 'react';
import { Icon, T_worker as T, icons } from '../../design/primitives';
import useAuthStore from '../../stores/authStore';
import useOvertimeStore from '../../stores/overtimeStore';
import useNotificationStore from '../../stores/notificationStore';

export default function OvertimeModal({ open, onClose, defaultDate }) {
  const currentUser = useAuthStore((s) => s.currentUser);
  const submitRequest = useOvertimeStore((s) => s.submitRequest);
  // U9: alert → toast (notificationStore 활용)
  const addNotification = useNotificationStore((s) => s.addNotification);

  const todayStr = new Date().toISOString().split('T')[0];
  const [date, setDate] = useState(defaultDate || todayStr);
  const [startTime, setStartTime] = useState('18:00');
  const [endTime, setEndTime] = useState('21:00');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const duration = useMemo(() => {
    const [sh, sm] = startTime.split(':').map(Number);
    const [eh, em] = endTime.split(':').map(Number);
    const totalMin = (eh * 60 + em) - (sh * 60 + sm);
    if (totalMin <= 0) return null;
    return { hours: Math.floor(totalMin / 60), minutes: totalMin % 60, totalMin };
  }, [startTime, endTime]);

  if (!open) return null;

  const valid = !!date && !!duration && reason.trim().length > 0;

  const handleSubmit = async () => {
    if (!valid || submitting) return;
    setSubmitting(true);
    try {
      const result = await submitRequest?.({
        employeeId: currentUser?.id,
        date,
        hours: duration.hours,
        minutes: duration.minutes,
        reason: reason.trim(),
      });
      if (result?.error) {
        addNotification({
          type: 'error',
          title: '연장근무 신청 실패',
          message: result.error.message || '잠시 후 다시 시도해주세요.',
        });
        return;
      }
      // 성공
      setReason('');
      onClose?.();
      addNotification({
        type: 'success',
        title: '연장근무 신청이 접수되었습니다',
        message: '관리자 승인 후 인정됩니다.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.55)',
      display: 'flex', alignItems: 'flex-end', zIndex: 100,
    }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        background: T.surface, width: '100%',
        borderTopLeftRadius: 20, borderTopRightRadius: 20,
        padding: 20, paddingBottom: 24,
      }}>
        <div style={{ width: 36, height: 4, borderRadius: 999, background: T.borderSoft, margin: '0 auto 14px' }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <Icon d={icons.clock} size={18} c={T.info} sw={2} />
          <div style={{ fontSize: 17, fontWeight: 800, color: T.text }}>연장근무 신청</div>
        </div>
        <div style={{ fontSize: 12, color: T.muted, marginBottom: 16 }}>
          퇴근 전 미리 신청해 주세요. 관리자 승인 후 인정됩니다.
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <label style={{ fontSize: 11, color: T.muted, fontWeight: 600, display: 'block', marginBottom: 6 }}>날짜</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
              style={{ width: '100%', height: 42, padding: '0 12px', border: `1px solid ${T.border}`, borderRadius: 8, fontSize: 14 }} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <div>
              <label style={{ fontSize: 11, color: T.muted, fontWeight: 600, display: 'block', marginBottom: 6 }}>시작 시간</label>
              <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)}
                style={{ width: '100%', height: 42, padding: '0 12px', border: `1px solid ${T.border}`, borderRadius: 8, fontSize: 14, fontFamily: 'ui-monospace,monospace' }} />
            </div>
            <div>
              <label style={{ fontSize: 11, color: T.muted, fontWeight: 600, display: 'block', marginBottom: 6 }}>종료 시간</label>
              <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)}
                style={{ width: '100%', height: 42, padding: '0 12px', border: `1px solid ${T.border}`, borderRadius: 8, fontSize: 14, fontFamily: 'ui-monospace,monospace' }} />
            </div>
          </div>
          <div style={{
            background: duration ? T.infoSoft : T.dangerSoft,
            padding: '8px 10px', borderRadius: 8,
            fontSize: 12, color: duration ? T.info : T.danger, fontWeight: 600,
          }}>
            {duration
              ? `예상 연장근무 시간: ${duration.hours}시간 ${duration.minutes ? duration.minutes + '분' : ''}`
              : '종료 시간이 시작 이후여야 합니다'}
          </div>
          <div>
            <label style={{ fontSize: 11, color: T.muted, fontWeight: 600, display: 'block', marginBottom: 6 }}>사유</label>
            <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3}
              placeholder="연장근무 사유를 입력하세요"
              style={{ width: '100%', padding: 10, border: `1px solid ${T.border}`, borderRadius: 8, fontSize: 14, fontFamily: 'inherit', resize: 'vertical' }} />
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
            <button onClick={onClose} disabled={submitting} style={{
              flex: 1, height: 46, borderRadius: 10,
              border: `1px solid ${T.border}`, background: T.surface, color: T.muted,
              fontSize: 14, fontWeight: 600, cursor: submitting ? 'default' : 'pointer',
              opacity: submitting ? 0.5 : 1,
            }}>취소</button>
            <button onClick={handleSubmit} disabled={!valid || submitting} style={{
              flex: 2, height: 46, borderRadius: 10, border: 0,
              background: valid && !submitting ? T.info : T.borderSoft,
              color: valid && !submitting ? '#fff' : T.mutedSoft,
              fontSize: 14, fontWeight: 700, cursor: valid && !submitting ? 'pointer' : 'not-allowed',
            }}>{submitting ? '처리 중...' : '신청'}</button>
          </div>
        </div>
      </div>
    </div>
  );
}
