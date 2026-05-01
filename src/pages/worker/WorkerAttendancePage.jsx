// 작업자 - 내 출퇴근 (모바일) — 트랙 77 U3 시각 재설계
// 시안: screens/worker-screens-v2.jsx ScreenAttendance + ScreenAttendanceDayModal + ScreenOvertimeModal
// 적용: Q8 (헤더 신청 버튼+시트), Q9 (공휴일 빨간색), Q10 (자체 캘린더 유지), Q18 (일별 상세 모달)

import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Card, Dot, Icon, Pill, T_worker as T, icons,
} from '../../design/primitives';
import useAuthStore from '../../stores/authStore';
import useAttendanceStore from '../../stores/attendanceStore';
import useLeaveStore from '../../stores/leaveStore';
import useOvertimeStore from '../../stores/overtimeStore';
import { HOLIDAYS_KR } from '../../lib/holidaysKr';

const fmtTime = (iso) => {
  if (!iso) return '—';
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};
const pad2 = (n) => String(n).padStart(2, '0');
const ymd = (y, m, d) => `${y}-${pad2(m + 1)}-${pad2(d)}`;

const STATE_COLOR = {
  normal: T.success,
  late: T.warning,
  early: T.warning,
  absent: T.danger,
  holiday: T.mutedSoft,
  leave: T.info,
};

const DOW = ['일', '월', '화', '수', '목', '금', '토'];

export default function WorkerAttendancePage() {
  const navigate = useNavigate();
  const currentUser = useAuthStore((s) => s.currentUser);
  const records = useAttendanceStore((s) => s.records);
  const leaveRequests = useLeaveStore((s) => s.requests) || [];
  const overtimeRequests = useOvertimeStore((s) => s.requests) || [];
  const fetchOvertime = useOvertimeStore((s) => s.fetchRequests);
  const submitOvertime = useOvertimeStore((s) => s.submitRequest);

  const now = new Date();
  const [ym, setYm] = useState({ y: now.getFullYear(), m: now.getMonth() });
  const [selected, setSelected] = useState(now.toISOString().split('T')[0]);
  const [showRequestSheet, setShowRequestSheet] = useState(false);
  const [showOvertimeModal, setShowOvertimeModal] = useState(false);
  const [showDayModal, setShowDayModal] = useState(false);

  // 연장근무 기록 fetch (마운트 1회) — 일별 모달에서 노출
  useEffect(() => {
    fetchOvertime?.();
  }, [fetchOvertime]);

  const monthRecords = useMemo(() => {
    const prefix = `${ym.y}-${pad2(ym.m + 1)}`;
    return records.filter((r) =>
      r.employeeId === currentUser?.id && r.date && r.date.startsWith(prefix)
    );
  }, [records, currentUser, ym]);

  const recordMap = useMemo(
    () => Object.fromEntries(monthRecords.map((r) => [r.date, r])),
    [monthRecords]
  );

  const stats = useMemo(() => {
    const s = { worked: 0, late: 0, minutes: 0 };
    monthRecords.forEach((r) => {
      if (r.checkIn) s.worked++;
      if (r.status === 'late') s.late++;
      if (r.checkIn && r.checkOut) {
        s.minutes += Math.round((new Date(r.checkOut) - new Date(r.checkIn)) / 60000);
      }
    });
    return s;
  }, [monthRecords]);

  // 달력
  const firstDay = new Date(ym.y, ym.m, 1);
  const daysInMonth = new Date(ym.y, ym.m + 1, 0).getDate();
  const startWeek = firstDay.getDay();
  const todayStr = now.toISOString().split('T')[0];

  const cells = [];
  for (let i = 0; i < startWeek; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  const shiftMonth = (delta) => {
    const d = new Date(ym.y, ym.m + delta, 1);
    setYm({ y: d.getFullYear(), m: d.getMonth() });
  };

  // Q18 — 일별 클릭 → 모달 오픈
  const handleSelectDate = (dateStr) => {
    setSelected(dateStr);
    setShowDayModal(true);
  };

  // Q8 — 신청 시트
  const handlePickLeave = () => {
    setShowRequestSheet(false);
    navigate('/worker/leave');
  };
  const handlePickOvertime = () => {
    setShowRequestSheet(false);
    setShowOvertimeModal(true);
  };

  return (
    <div style={{ flex: 1, overflow: 'auto', background: T.bg, paddingBottom: 80 }}>
      {/* 헤더 — Q8: 우상단 근태 신청 버튼 */}
      <div style={{ background: T.surface, borderBottom: `1px solid ${T.border}`, padding: '12px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button onClick={() => navigate('/worker')} style={{
            width: 36, height: 36, borderRadius: 10, border: `1px solid ${T.border}`,
            background: T.bg, color: T.muted, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Icon d={<polyline points="15 18 9 12 15 6" />} size={14} sw={2.2} />
          </button>
          <h1 style={{ fontSize: 15, fontWeight: 700, color: T.text, margin: 0, flex: 1 }}>내 출퇴근</h1>
          <button onClick={() => setShowRequestSheet(true)} style={{
            height: 36, padding: '0 14px', borderRadius: 10, border: 0,
            background: T.primary, color: '#fff',
            fontSize: 13, fontWeight: 700, cursor: 'pointer',
            display: 'inline-flex', alignItems: 'center', gap: 6,
            boxShadow: T.shadowSm,
          }}>
            <Icon d={icons.plus} size={12} c="#fff" sw={2.4} />
            근태 신청
          </button>
        </div>
      </div>

      {/* 월별 통계 */}
      <div style={{ padding: 16 }}>
        <Card pad={14}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <button onClick={() => shiftMonth(-1)} style={{
              width: 28, height: 28, borderRadius: 6, border: `1px solid ${T.border}`, background: T.surface,
              color: T.muted, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Icon d={<polyline points="15 18 9 12 15 6" />} size={13} sw={2} />
            </button>
            <div style={{ fontSize: 11, fontWeight: 700, color: T.muted, letterSpacing: 0.3 }}>
              {ym.y}년 {ym.m + 1}월
            </div>
            <button onClick={() => shiftMonth(1)} style={{
              width: 28, height: 28, borderRadius: 6, border: `1px solid ${T.border}`, background: T.surface,
              color: T.muted, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Icon d={<polyline points="9 18 15 12 9 6" />} size={13} sw={2} />
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
            {[
              { l: '출근', v: stats.worked, c: T.success },
              { l: '지각', v: stats.late, c: T.warning },
              { l: '근무 시간', v: `${Math.floor(stats.minutes / 60)}h`, c: T.primary },
            ].map((k, i) => (
              <div key={i} style={{ padding: 10, background: T.bg, borderRadius: 8 }}>
                <div style={{ fontSize: 10, color: T.mutedSoft, fontWeight: 600 }}>{k.l}</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: k.c, fontFamily: 'ui-monospace,monospace' }}>{k.v}</div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* 달력 — Q9 공휴일 빨간색, Q10 자체 구현 유지 */}
      <div style={{ padding: '0 16px' }}>
        <Card pad={14}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, marginBottom: 6 }}>
            {DOW.map((d, i) => (
              <div key={d} style={{
                textAlign: 'center', fontSize: 11, fontWeight: 700,
                color: i === 0 ? T.holidayText : i === 6 ? T.saturdayText : T.mutedSoft,
                padding: 4,
              }}>{d}</div>
            ))}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
            {cells.map((d, i) => {
              if (d == null) return <div key={i} />;
              const dateStr = ymd(ym.y, ym.m, d);
              const r = recordMap[dateStr];
              const isToday = dateStr === todayStr;
              const isSel = dateStr === selected;
              const dow = new Date(ym.y, ym.m, d).getDay();
              const state = r?.status || (r?.checkIn ? 'normal' : null);
              const dotC = STATE_COLOR[state];
              // Q9: 공휴일 = 일요일과 동일 빨간색
              const isHoliday = !!HOLIDAYS_KR[dateStr];
              const isRed = dow === 0 || isHoliday;
              const dayColor = isSel
                ? T.primaryText
                : isRed
                  ? T.holidayText
                  : dow === 6
                    ? T.saturdayText
                    : T.text;
              return (
                <button
                  key={i}
                  onClick={() => handleSelectDate(dateStr)}
                  title={isHoliday ? HOLIDAYS_KR[dateStr] : undefined}
                  style={{
                    aspectRatio: '1', border: isSel ? `1.5px solid ${T.primary}` : '1.5px solid transparent',
                    borderRadius: 8, background: isSel ? T.primarySoft : isToday ? T.bg : 'transparent',
                    cursor: 'pointer',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2,
                    padding: 2, position: 'relative',
                  }}>
                  <span style={{
                    fontSize: 13, fontWeight: isSel || isToday ? 700 : 500,
                    color: dayColor,
                    fontFamily: 'ui-monospace,monospace',
                  }}>{d}</span>
                  {dotC ? <Dot c={dotC} /> : <span style={{ width: 6, height: 6 }} />}
                </button>
              );
            })}
          </div>

          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap', marginTop: 12, paddingTop: 10, borderTop: `1px solid ${T.borderSoft}`, fontSize: 10, color: T.mutedSoft }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><Dot c={T.success} /> 정상</span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><Dot c={T.warning} /> 지각</span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><Dot c={T.danger} /> 결근</span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><Dot c={T.info} /> 휴가</span>
          </div>
        </Card>
      </div>

      {/* Q8 — 근태 신청 시트 (휴가 / 연장근무 선택) */}
      {showRequestSheet && (
        <RequestTypeSheet
          onClose={() => setShowRequestSheet(false)}
          onPickLeave={handlePickLeave}
          onPickOvertime={handlePickOvertime}
        />
      )}

      {/* Q18 — 일별 상세 모달 */}
      {showDayModal && (
        <DayDetailModal
          date={selected}
          record={recordMap[selected]}
          leaveRequests={leaveRequests}
          overtimeRequests={overtimeRequests}
          currentUserId={currentUser?.id}
          onClose={() => setShowDayModal(false)}
        />
      )}

      {/* 연장근무 신청 모달 */}
      {showOvertimeModal && (
        <OvertimeModal
          defaultDate={todayStr}
          onClose={() => setShowOvertimeModal(false)}
          onSubmit={async (payload) => {
            const result = await submitOvertime?.({
              employeeId: currentUser?.id,
              ...payload,
            });
            if (result?.error) {
              alert('연장근무 신청에 실패했습니다.\n' + (result.error.message || ''));
              return false;
            }
            return true;
          }}
        />
      )}
    </div>
  );
}

// ─────────── 근태 신청 시트 (휴가 / 연장근무 선택) ───────────
function RequestTypeSheet({ onClose, onPickLeave, onPickOvertime }) {
  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.55)',
      display: 'flex', alignItems: 'flex-end', zIndex: 50,
    }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        background: T.surface, width: '100%',
        borderTopLeftRadius: 20, borderTopRightRadius: 20,
        padding: 20, paddingBottom: 24,
      }}>
        <div style={{ width: 36, height: 4, borderRadius: 999, background: T.borderSoft, margin: '0 auto 14px' }} />
        <div style={{ fontSize: 16, fontWeight: 700, color: T.text, marginBottom: 16 }}>근태 신청</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <button onClick={onPickLeave} style={{
            display: 'flex', alignItems: 'center', gap: 12,
            padding: '14px 16px', borderRadius: 10,
            border: `1px solid ${T.border}`, background: T.surface,
            cursor: 'pointer', textAlign: 'left',
          }}>
            <div style={{
              width: 40, height: 40, borderRadius: 10, background: T.warningSoft,
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              <Icon d={icons.leaf} size={18} c={T.warning} sw={2} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: T.text }}>휴가 신청</div>
              <div style={{ fontSize: 11, color: T.muted, marginTop: 2 }}>연차 / 병가 / 개인 / 경조사</div>
            </div>
            <Icon d={<polyline points="9 18 15 12 9 6" />} size={14} c={T.mutedSoft} sw={2} />
          </button>
          <button onClick={onPickOvertime} style={{
            display: 'flex', alignItems: 'center', gap: 12,
            padding: '14px 16px', borderRadius: 10,
            border: `1px solid ${T.border}`, background: T.surface,
            cursor: 'pointer', textAlign: 'left',
          }}>
            <div style={{
              width: 40, height: 40, borderRadius: 10, background: T.infoSoft,
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              <Icon d={icons.clock} size={18} c={T.info} sw={2} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: T.text }}>연장근무 신청</div>
              <div style={{ fontSize: 11, color: T.muted, marginTop: 2 }}>퇴근 전 사전 신청 → 관리자 승인</div>
            </div>
            <Icon d={<polyline points="9 18 15 12 9 6" />} size={14} c={T.mutedSoft} sw={2} />
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────── 일별 상세 모달 (Q18) ───────────
function DayDetailModal({ date, record, leaveRequests, overtimeRequests, currentUserId, onClose }) {
  const dt = new Date(date);
  const holiday = HOLIDAYS_KR[date];
  const myLeave = (leaveRequests || []).filter(
    (r) => r.employeeId === currentUserId && r.date === date
  );
  const myOvertime = (overtimeRequests || []).filter(
    (r) => r.employeeId === currentUserId && r.date === date
  );

  const workMinutes = record?.checkIn && record?.checkOut
    ? Math.round((new Date(record.checkOut) - new Date(record.checkIn)) / 60000)
    : 0;

  const statusPill = (status) => {
    const map = { pending: { l: '대기', t: 'warning' }, approved: { l: '승인', t: 'success' }, rejected: { l: '반려', t: 'danger' } };
    const s = map[status] || map.pending;
    return <Pill tone={s.t} size="sm">{s.l}</Pill>;
  };

  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.55)',
      display: 'flex', alignItems: 'flex-end', zIndex: 50,
    }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        background: T.surface, width: '100%',
        borderTopLeftRadius: 20, borderTopRightRadius: 20,
        padding: 20, paddingBottom: 28, maxHeight: '85vh', overflowY: 'auto',
      }}>
        <div style={{ width: 36, height: 4, borderRadius: 999, background: T.borderSoft, margin: '0 auto 14px' }} />

        {/* 헤더 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: 11, color: T.mutedSoft, fontWeight: 600 }}>{dt.getFullYear()}년 {dt.getMonth() + 1}월</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: T.text, letterSpacing: -0.5 }}>
              {dt.getDate()}일 ({DOW[dt.getDay()]})
            </div>
          </div>
          {holiday && <Pill tone="danger">{holiday}</Pill>}
          {!holiday && record?.checkIn && record?.status === 'normal' && <Pill tone="success">정상 출근</Pill>}
          {!holiday && record?.status === 'late' && <Pill tone="warning">지각</Pill>}
          <button onClick={onClose} style={{
            marginLeft: 'auto', width: 32, height: 32, borderRadius: 16, border: 0,
            background: T.borderSoft, color: T.muted, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Icon d={icons.x} size={14} sw={2.4} />
          </button>
        </div>

        {/* 출퇴근 기록 */}
        {record?.checkIn ? (
          <div style={{ background: T.bg, borderRadius: 10, padding: 12, marginBottom: 14, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <div style={{ fontSize: 10, color: T.mutedSoft, fontWeight: 600, marginBottom: 2 }}>출근</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: T.success, fontFamily: 'ui-monospace,monospace' }}>{fmtTime(record.checkIn)}</div>
            </div>
            <div>
              <div style={{ fontSize: 10, color: T.mutedSoft, fontWeight: 600, marginBottom: 2 }}>퇴근</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: record.checkOut ? T.text : T.mutedSoft, fontFamily: 'ui-monospace,monospace' }}>
                {fmtTime(record.checkOut)}
              </div>
            </div>
            {workMinutes > 0 && (
              <div style={{ gridColumn: 'span 2', display: 'flex', alignItems: 'center', gap: 8, paddingTop: 8, borderTop: `1px solid ${T.borderSoft}` }}>
                <Icon d={icons.clock} size={12} c={T.muted} />
                <span style={{ fontSize: 11, color: T.muted, fontWeight: 600 }}>근무</span>
                <span style={{ marginLeft: 'auto', fontSize: 13, fontWeight: 700, color: T.text, fontFamily: 'ui-monospace,monospace' }}>
                  {Math.floor(workMinutes / 60)}h {workMinutes % 60}m
                </span>
              </div>
            )}
          </div>
        ) : (
          <Card pad={14} style={{ marginBottom: 14, textAlign: 'center' }}>
            <div style={{ fontSize: 12, color: T.mutedSoft }}>출퇴근 기록이 없습니다</div>
          </Card>
        )}

        {/* 휴가 신청 내역 */}
        {myLeave.length > 0 && (
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: T.muted, marginBottom: 8, letterSpacing: 0.3 }}>휴가 신청</div>
            {myLeave.map((r) => (
              <Card key={r.id} pad={12} style={{ marginBottom: 6 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  <Pill tone="info" size="sm">휴가</Pill>
                  {statusPill(r.status)}
                  <span style={{ marginLeft: 'auto', fontSize: 11, color: T.mutedSoft, fontFamily: 'ui-monospace,monospace' }}>{r.days}일</span>
                </div>
                <div style={{ fontSize: 12, color: T.muted, lineHeight: 1.5 }}>{r.reason}</div>
              </Card>
            ))}
          </div>
        )}

        {/* 연장근무 신청 내역 */}
        {myOvertime.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: T.muted, marginBottom: 8, letterSpacing: 0.3 }}>연장근무 신청</div>
            {myOvertime.map((r) => (
              <Card key={r.id} pad={12} style={{ marginBottom: 6 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  <Pill tone="info" size="sm">연장</Pill>
                  {statusPill(r.status)}
                  <span style={{ marginLeft: 'auto', fontSize: 11, color: T.mutedSoft, fontFamily: 'ui-monospace,monospace' }}>
                    {r.hours}h {r.minutes || 0}m
                  </span>
                </div>
                {r.reason && <div style={{ fontSize: 12, color: T.muted, lineHeight: 1.5 }}>{r.reason}</div>}
              </Card>
            ))}
          </div>
        )}

        <button onClick={onClose} style={{
          width: '100%', height: 44, borderRadius: 10,
          border: `1px solid ${T.border}`, background: T.surface, color: T.muted,
          fontSize: 14, fontWeight: 600, cursor: 'pointer',
        }}>닫기</button>
      </div>
    </div>
  );
}

// ─────────── 연장근무 신청 모달 ───────────
function OvertimeModal({ defaultDate, onClose, onSubmit }) {
  const [date, setDate] = useState(defaultDate);
  const [startTime, setStartTime] = useState('18:00');
  const [endTime, setEndTime] = useState('21:00');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // hours/minutes 자동 계산
  const duration = useMemo(() => {
    const [sh, sm] = startTime.split(':').map(Number);
    const [eh, em] = endTime.split(':').map(Number);
    const totalMin = (eh * 60 + em) - (sh * 60 + sm);
    if (totalMin <= 0) return null;
    return { hours: Math.floor(totalMin / 60), minutes: totalMin % 60, totalMin };
  }, [startTime, endTime]);

  const valid = !!date && !!duration && reason.trim().length > 0;

  const handleSubmit = async () => {
    if (!valid || submitting) return;
    setSubmitting(true);
    const ok = await onSubmit({
      date,
      hours: duration.hours,
      minutes: duration.minutes,
      reason: reason.trim(),
    });
    setSubmitting(false);
    if (ok) onClose();
  };

  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.55)',
      display: 'flex', alignItems: 'flex-end', zIndex: 50,
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
