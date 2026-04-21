import React, { useMemo } from 'react';
import { Avatar, Icon, Pill, T, icons } from '../../design/primitives';
import useAuthStore from '../../stores/authStore';
import useAttendanceStore from '../../stores/attendanceStore';
import useTaskStore from '../../stores/taskStore';
import useLeaveStore from '../../stores/leaveStore';
import useOvertimeStore from '../../stores/overtimeStore';
import useNoticeStore from '../../stores/noticeStore';
import useCropStore from '../../stores/cropStore';
import useZoneStore from '../../stores/zoneStore';
import useEmployeeStore from '../../stores/employeeStore';

const TODAY = new Date().toISOString().split('T')[0];
const NOW = new Date();
const KO_DAYS = ['일', '월', '화', '수', '목', '금', '토'];

function fmtKoDate(d = NOW) {
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일 ${KO_DAYS[d.getDay()]}요일`;
}

function fmtTime(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function calcElapsed(checkInISO) {
  if (!checkInISO) return '00:00';
  const diff = Date.now() - new Date(checkInISO).getTime();
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function calcEndTime(assignedAt, estimatedMinutes) {
  if (!assignedAt || !estimatedMinutes) return '—';
  const end = new Date(new Date(assignedAt).getTime() + estimatedMinutes * 60000);
  return fmtTime(end.toISOString());
}

function timeAgo(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  const days = Math.floor((Date.now() - d.getTime()) / 86400000);
  if (days === 0) return '오늘';
  if (days === 1) return '어제';
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

function fmtLeaveDate(startDate, endDate) {
  if (!startDate) return '—';
  const s = new Date(startDate);
  const label = `${s.getMonth() + 1}/${s.getDate()} (${KO_DAYS[s.getDay()]})`;
  if (!endDate || startDate === endDate) return `${label} · 1일`;
  const e = new Date(endDate);
  const dayDiff = Math.round((e - s) / 86400000) + 1;
  return `${label}~${e.getMonth() + 1}/${e.getDate()} · ${dayDiff}일`;
}

const LEAVE_TYPE_KO = {
  annual: '연차', half_am: '오전반차', half_pm: '오후반차',
  special: '특별휴가', sick: '병가',
};

const TASK_TONE = {
  in_progress: T.success,
  completed: T.success,
  pending: T.info,
};

const TASK_STATUS_PILL = {
  in_progress: { tone: 'success', label: '진행중' },
  completed: { tone: 'muted', label: '완료' },
  pending: { tone: 'muted', label: '예정' },
};

// 현재 주의 월~일 날짜 배열 반환
function getWeekDates(ref = NOW) {
  const day = ref.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const mon = new Date(ref);
  mon.setDate(ref.getDate() + diff);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(mon);
    d.setDate(mon.getDate() + i);
    return d;
  });
}

// ─────────────────────────────────────────────────────────
// 홈 화면
// ─────────────────────────────────────────────────────────
function MobileHomeScreen() {
  const currentUser = useAuthStore((s) => s.currentUser);
  const records = useAttendanceStore((s) => s.records);
  const tasks = useTaskStore((s) => s.tasks);
  const notices = useNoticeStore((s) => s.notices);
  const crops = useCropStore((s) => s.crops);
  const zones = useZoneStore((s) => s.zones);

  const cropMap = useMemo(() => Object.fromEntries(crops.map((c) => [c.id, c])), [crops]);
  const zoneMap = useMemo(() => Object.fromEntries(zones.map((z) => [z.id, z])), [zones]);

  const myRecord = useMemo(
    () => records.find((r) => r.employeeId === currentUser?.id && r.date === TODAY),
    [records, currentUser]
  );
  const myTasks = useMemo(
    () => tasks.filter((t) => t.workerId === currentUser?.id && t.date === TODAY),
    [tasks, currentUser]
  );

  const isCheckedIn = !!myRecord?.checkIn;
  const isCheckedOut = !!myRecord?.checkOut;
  const elapsed = isCheckedIn && !isCheckedOut ? calcElapsed(myRecord.checkIn) : '00:00';
  const checkInTime = myRecord?.checkIn ? fmtTime(myRecord.checkIn) : '—';
  const checkOutTime = myRecord?.checkOut ? fmtTime(myRecord.checkOut) : '—';
  const workerName = currentUser?.name ?? '—';
  const branchLabel = [currentUser?.branch, currentUser?.jobType, currentUser?.isTeamLeader ? '반장' : null]
    .filter(Boolean).join(' · ');

  const taskRows = myTasks.length > 0 ? myTasks.slice(0, 3).map((t) => {
    const crop = cropMap[t.cropId]?.name ?? '';
    const zone = zoneMap[t.zoneId]?.name ?? '';
    const display = t.title ?? [crop, zone].filter(Boolean).join(' · ');
    return {
      t: display || '작업',
      time: `${fmtTime(t.assignedAt)}~${calcEndTime(t.assignedAt, t.estimatedMinutes)}`,
      status: t.status,
      tone: TASK_TONE[t.status] ?? T.mutedSoft,
    };
  }) : [
    { t: '오늘 배정된 작업이 없습니다', time: '—', status: 'pending', tone: T.mutedSoft },
  ];

  const latestNotice = notices[0] ?? null;

  return (
    <div style={{ background: '#F2F2F7', height: '100%', overflow: 'auto', fontFamily: '-apple-system, Pretendard, system-ui' }}>
      {/* 상단 그린 헤더 */}
      <div style={{
        background: `linear-gradient(160deg, ${T.primary} 0%, ${T.primaryDark} 100%)`,
        color: '#fff', padding: '20px 20px 90px', marginTop: -1,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <div>
            <div style={{ fontSize: 13, opacity: 0.8 }}>{fmtKoDate()}</div>
            <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: -0.4, marginTop: 2 }}>안녕하세요, {workerName}님</div>
          </div>
          <div style={{ width: 40, height: 40, borderRadius: 999, background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
            <Icon d={icons.bell} size={18} c="#fff" sw={2} />
            <span style={{ position: 'absolute', top: 9, right: 11, width: 7, height: 7, borderRadius: 999, background: '#FDE047', border: '1.5px solid #fff' }} />
          </div>
        </div>
        {branchLabel && <div style={{ fontSize: 13, opacity: 0.85 }}>{branchLabel}</div>}
      </div>

      {/* 출퇴근 카드 (오버랩) */}
      <div style={{ padding: '0 16px', marginTop: -70, position: 'relative', zIndex: 2 }}>
        <div style={{
          background: '#fff', borderRadius: 18, padding: 20,
          boxShadow: '0 10px 30px rgba(15,23,42,0.1), 0 2px 6px rgba(15,23,42,0.05)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <div>
              <div style={{ fontSize: 12, color: T.mutedSoft, fontWeight: 600 }}>오늘 근무</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginTop: 3 }}>
                <span style={{ fontSize: 28, fontWeight: 700, color: T.text, letterSpacing: -0.6 }}>
                  {isCheckedOut && myRecord.workMinutes
                    ? `${Math.floor(myRecord.workMinutes / 60)}h ${myRecord.workMinutes % 60}m`
                    : elapsed}
                </span>
                <span style={{ fontSize: 13, color: T.muted }}>/ 8시간</span>
              </div>
            </div>
            {!isCheckedIn ? (
              <div style={{ padding: '6px 12px', borderRadius: 999, background: T.bg, display: 'flex', alignItems: 'center', gap: 5 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: T.mutedSoft }}>미출근</span>
              </div>
            ) : isCheckedOut ? (
              <div style={{ padding: '6px 12px', borderRadius: 999, background: T.bg, display: 'flex', alignItems: 'center', gap: 5 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: T.muted }}>퇴근 완료</span>
              </div>
            ) : (
              <div style={{ padding: '6px 12px', borderRadius: 999, background: T.successSoft, display: 'flex', alignItems: 'center', gap: 5 }}>
                <span style={{ width: 8, height: 8, borderRadius: 999, background: T.success }} />
                <span style={{ fontSize: 12, fontWeight: 700, color: T.success }}>근무중</span>
              </div>
            )}
          </div>

          {/* 시간 기록 */}
          <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
            <div style={{ flex: 1, padding: 12, background: T.bg, borderRadius: 10 }}>
              <div style={{ fontSize: 10, color: T.mutedSoft, fontWeight: 600 }}>출근</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: T.text, marginTop: 3 }}>{checkInTime}</div>
              {myRecord?.status === 'late' && <div style={{ fontSize: 10, color: T.warning, marginTop: 2 }}>지각</div>}
              {myRecord && myRecord.status !== 'late' && isCheckedIn && (
                <div style={{ fontSize: 10, color: T.success, marginTop: 2 }}>정시 출근</div>
              )}
            </div>
            <div style={{ flex: 1, padding: 12, background: T.bg, borderRadius: 10 }}>
              <div style={{ fontSize: 10, color: T.mutedSoft, fontWeight: 600 }}>퇴근 {isCheckedOut ? '' : '예정'}</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: isCheckedOut ? T.text : T.mutedSoft, marginTop: 3 }}>
                {isCheckedOut ? checkOutTime : (currentUser?.workEndTime?.slice(0, 5) ?? '17:00')}
              </div>
              {!isCheckedOut && <div style={{ fontSize: 10, color: T.mutedSoft, marginTop: 2 }}>— · —</div>}
            </div>
          </div>

          {/* 출근 / 퇴근 버튼 */}
          <div style={{ display: 'flex', gap: 8 }}>
            <button style={{
              flex: 1, padding: '14px 0', borderRadius: 12, border: `1px solid ${T.border}`,
              background: T.surface, color: isCheckedIn ? T.mutedSoft : T.text,
              fontSize: 15, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            }}>
              출근
              {isCheckedIn && <span style={{ fontSize: 11, color: T.success, fontWeight: 600 }}>✓ {checkInTime}</span>}
            </button>
            <button style={{
              flex: 1, padding: '14px 0', borderRadius: 12, border: 0,
              background: isCheckedOut ? T.bg : T.danger, color: isCheckedOut ? T.mutedSoft : '#fff',
              fontSize: 15, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              boxShadow: isCheckedOut ? 'none' : '0 4px 12px rgba(220,38,38,0.3)',
            }}>
              <Icon d={icons.logout} size={16} c={isCheckedOut ? T.mutedSoft : '#fff'} sw={2} />
              퇴근
            </button>
          </div>
          <div style={{ fontSize: 11, color: T.mutedSoft, textAlign: 'center', marginTop: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
            <Icon d={icons.location} size={11} c={T.success} sw={2} />
            {currentUser?.branch ? `${currentUser.branch} 온실 내 · GPS 확인됨` : 'GPS 확인됨'}
          </div>
        </div>
      </div>

      {/* 오늘 내 작업 */}
      <div style={{ padding: '20px 16px 8px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, padding: '0 4px' }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, color: T.text, margin: 0 }}>오늘 내 작업</h3>
          <span style={{ fontSize: 12, color: T.primary, fontWeight: 600 }}>전체 보기</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {taskRows.map((w, i) => (
            <div key={i} style={{
              background: '#fff', borderRadius: 14, padding: 14,
              borderLeft: `3px solid ${w.tone}`,
            }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: T.text, lineHeight: 1.3 }}>{w.t}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
                    <span style={{ fontSize: 11, color: T.muted, display: 'flex', alignItems: 'center', gap: 3 }}>
                      <Icon d={icons.clock} size={11} /> {w.time}
                    </span>
                  </div>
                </div>
                {w.status === 'in_progress' && <Pill tone="success">진행중</Pill>}
                {w.status === 'completed' && <Pill tone="muted">완료</Pill>}
                {w.status === 'pending' && <Pill tone="info">예정</Pill>}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 빠른 기능 */}
      <div style={{ padding: '12px 16px 8px' }}>
        <h3 style={{ fontSize: 15, fontWeight: 700, color: T.text, margin: '8px 4px 10px' }}>빠른 기능</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
          {[
            { l: '작업 보고', icon: icons.clipboard, c: T.primary },
            { l: '생육 조사', icon: icons.leaf, c: T.success },
            { l: '이상 신고', icon: icons.alert, c: T.danger },
            { l: '휴가 신청', icon: icons.calendar, c: T.info },
          ].map((b, i) => (
            <div key={i} style={{
              background: '#fff', borderRadius: 14, padding: '14px 6px',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
            }}>
              <div style={{ width: 38, height: 38, borderRadius: 10, background: `${b.c}15`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon d={b.icon} size={18} c={b.c} sw={2} />
              </div>
              <div style={{ fontSize: 11, fontWeight: 600, color: T.text }}>{b.l}</div>
            </div>
          ))}
        </div>
      </div>

      {/* 공지 */}
      {latestNotice && (
        <div style={{ padding: '16px 16px 20px' }}>
          <div style={{
            background: '#fff', borderRadius: 14, padding: 14,
            display: 'flex', alignItems: 'center', gap: 12,
          }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: T.warningSoft, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon d={icons.bell} size={18} c={T.warning} sw={2} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: T.text, marginBottom: 2 }}>{latestNotice.title}</div>
              <div style={{ fontSize: 11, color: T.mutedSoft, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {latestNotice.content ?? timeAgo(latestNotice.createdAt)}
              </div>
            </div>
            <Icon d={<polyline points="9 18 15 12 9 6" />} size={16} c={T.mutedSoft} />
          </div>
        </div>
      )}

      {/* 이상 신고 플로팅 버튼 */}
      <button style={{
        position: 'fixed', bottom: 96, right: 20,
        width: 56, height: 56, borderRadius: 999, border: 0,
        background: T.danger, color: '#fff',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        gap: 1, cursor: 'pointer', zIndex: 10,
        boxShadow: '0 6px 16px rgba(220,38,38,0.4), 0 2px 4px rgba(220,38,38,0.2)',
      }}>
        <Icon d={icons.alert} size={18} c="#fff" sw={2.2} />
        <span style={{ fontSize: 9, fontWeight: 700 }}>신고</span>
      </button>

      {/* 하단 네비 */}
      <div style={{
        position: 'sticky', bottom: 0,
        display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
        background: '#fff', borderTop: `1px solid ${T.borderSoft}`,
        padding: '8px 0 24px',
      }}>
        {[
          { l: '홈', icon: icons.dashboard, on: true },
          { l: '작업', icon: icons.clipboard },
          { l: '근태', icon: icons.calendar },
          { l: '내 정보', icon: icons.settings },
        ].map((n, i) => (
          <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, padding: '6px 0', color: n.on ? T.primary : T.mutedSoft }}>
            <Icon d={n.icon} size={20} sw={n.on ? 2.2 : 1.8} c={n.on ? T.primary : T.mutedSoft} />
            <span style={{ fontSize: 10, fontWeight: n.on ? 700 : 500 }}>{n.l}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// 출퇴근 전용 화면
// ─────────────────────────────────────────────────────────
function MobileCheckInScreen() {
  const currentUser = useAuthStore((s) => s.currentUser);
  const records = useAttendanceStore((s) => s.records);

  const myRecord = useMemo(
    () => records.find((r) => r.employeeId === currentUser?.id && r.date === TODAY),
    [records, currentUser]
  );

  const isCheckedIn = !!myRecord?.checkIn;
  const isCheckedOut = !!myRecord?.checkOut;
  const checkInTime = myRecord?.checkIn ? fmtTime(myRecord.checkIn) : null;

  // 이번 주 7일 계산
  const weekDates = useMemo(() => getWeekDates(), []);
  const weekRows = useMemo(() => {
    const recsByDate = Object.fromEntries(
      records.filter((r) => r.employeeId === currentUser?.id).map((r) => [r.date, r])
    );
    return weekDates.map((d) => {
      const dateStr = d.toISOString().split('T')[0];
      const rec = recsByDate[dateStr];
      const isToday = dateStr === TODAY;
      const dow = d.getDay();
      const isWeekend = dow === 0 || dow === 6;
      let h = '—';
      if (isWeekend) h = '휴';
      else if (rec?.workMinutes) h = `${Math.floor(rec.workMinutes / 60)}h`;
      else if (rec?.checkIn && !rec?.checkOut) h = '근무';
      return { d: KO_DAYS[dow], n: d.getDate(), h, ok: !!(rec && rec.status !== 'absent'), isWeekend, today: isToday, upcoming: !isToday && dateStr > TODAY && !isWeekend };
    });
  }, [weekDates, records, currentUser]);

  const workedMinutesThisWeek = useMemo(() => {
    const weekStrs = weekDates.map((d) => d.toISOString().split('T')[0]);
    return records
      .filter((r) => r.employeeId === currentUser?.id && weekStrs.includes(r.date))
      .reduce((acc, r) => acc + (r.workMinutes ?? 0), 0);
  }, [weekDates, records, currentUser]);

  const weekHoursLabel = `${Math.floor(workedMinutesThisWeek / 60)}시간 ${workedMinutesThisWeek % 60}분`;

  return (
    <div style={{ background: '#F2F2F7', height: '100%', fontFamily: '-apple-system, Pretendard, system-ui', display: 'flex', flexDirection: 'column', overflow: 'auto' }}>
      {/* 헤더 */}
      <div style={{ padding: '16px 20px 8px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 32, height: 32, borderRadius: 8, background: T.surface, border: `1px solid ${T.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon d={<polyline points="15 18 9 12 15 6" />} size={16} c={T.text} />
        </div>
        <div style={{ fontSize: 16, fontWeight: 700, color: T.text }}>출퇴근</div>
      </div>

      {/* 오늘 요약 배너 */}
      <div style={{ padding: '0 16px 8px' }}>
        <div style={{
          background: `linear-gradient(135deg, ${T.primary} 0%, ${T.primaryDark} 100%)`,
          color: '#fff', padding: 18, borderRadius: 16,
          position: 'relative', overflow: 'hidden',
        }}>
          <div style={{ position: 'absolute', top: -20, right: -20, width: 120, height: 120, borderRadius: 999, background: 'rgba(255,255,255,0.08)' }} />
          <div style={{ position: 'absolute', top: 30, right: 40, width: 60, height: 60, borderRadius: 999, background: 'rgba(255,255,255,0.05)' }} />
          <div style={{ position: 'relative' }}>
            <div style={{ fontSize: 12, opacity: 0.85, fontWeight: 600 }}>{fmtKoDate()}</div>
            <div style={{ fontSize: 42, fontWeight: 700, letterSpacing: -1.5, marginTop: 4, fontFamily: 'ui-monospace, monospace' }}>
              {`${String(NOW.getHours()).padStart(2, '0')}:${String(NOW.getMinutes()).padStart(2, '0')}`}
            </div>
            {isCheckedIn && !isCheckedOut && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8, fontSize: 12 }}>
                <span style={{ width: 6, height: 6, borderRadius: 999, background: '#FDE047' }} />
                <span style={{ opacity: 0.9 }}>근무중 · {calcElapsed(myRecord.checkIn)} 경과</span>
              </div>
            )}
            {!isCheckedIn && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8, fontSize: 12, opacity: 0.8 }}>미출근</div>
            )}
            {isCheckedOut && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8, fontSize: 12, opacity: 0.9 }}>퇴근 완료 · {checkInTime} ~ {fmtTime(myRecord.checkOut)}</div>
            )}
          </div>
        </div>
      </div>

      {/* 출근/퇴근 카드 */}
      <div style={{ padding: '8px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {/* 출근 */}
        <div style={{
          background: T.surface, borderRadius: 14, padding: 16,
          borderLeft: `3px solid ${isCheckedIn ? T.success : T.border}`,
          display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: isCheckedIn ? T.successSoft : T.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon d={icons.check} size={22} c={isCheckedIn ? T.success : T.mutedSoft} sw={2.4} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11, color: T.mutedSoft, fontWeight: 600 }}>출근</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: T.text, marginTop: 1 }}>
              {checkInTime ?? '—'}
              {isCheckedIn && myRecord.status !== 'late' && (
                <span style={{ fontSize: 12, color: T.success, fontWeight: 600, marginLeft: 4 }}>· 정시</span>
              )}
              {isCheckedIn && myRecord.status === 'late' && (
                <span style={{ fontSize: 12, color: T.warning, fontWeight: 600, marginLeft: 4 }}>· 지각</span>
              )}
            </div>
            {isCheckedIn && (
              <div style={{ fontSize: 11, color: T.mutedSoft, marginTop: 3, display: 'flex', alignItems: 'center', gap: 4 }}>
                <Icon d={icons.location} size={10} />
                {currentUser?.branch ? `${currentUser.branch} 온실 · GPS 인증됨` : 'GPS 인증됨'}
              </div>
            )}
          </div>
          <Pill tone={isCheckedIn ? 'success' : 'muted'}>{isCheckedIn ? '완료' : '미출근'}</Pill>
        </div>

        {/* 퇴근 */}
        <div style={{ background: T.surface, borderRadius: 14, padding: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <div>
              <div style={{ fontSize: 11, color: T.mutedSoft, fontWeight: 600 }}>퇴근</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: T.text, marginTop: 2 }}>
                {isCheckedOut ? fmtTime(myRecord.checkOut) : `예정 ${currentUser?.workEndTime?.slice(0, 5) ?? '17:00'}`}
              </div>
            </div>
            <Pill tone={isCheckedOut ? 'success' : 'muted'}>{isCheckedOut ? '완료' : '대기'}</Pill>
          </div>

          {!isCheckedOut && (
            <>
              <div style={{
                padding: '10px 12px', background: T.successSoft, borderRadius: 10,
                display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12,
              }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: T.success, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon d={icons.location} size={16} c="#fff" sw={2.2} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: T.success }}>근무지 반경 내 위치함</div>
                  <div style={{ fontSize: 11, color: T.muted, marginTop: 2 }}>
                    {currentUser?.branch ? `${currentUser.branch}에서 12m` : '현재 위치 확인됨'} · 정확도 5m
                  </div>
                </div>
                <Icon d={icons.check} size={16} c={T.success} sw={2.5} />
              </div>

              <button style={{
                width: '100%', padding: '16px 0', borderRadius: 12, border: 0,
                background: `linear-gradient(180deg, ${T.danger} 0%, #B91C1C 100%)`,
                color: '#fff', fontSize: 16, fontWeight: 700,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                boxShadow: '0 4px 12px rgba(220,38,38,0.3), inset 0 1px 0 rgba(255,255,255,0.2)',
                cursor: 'pointer',
              }}>
                <Icon d={icons.logout} size={20} c="#fff" sw={2.2} />
                퇴근 체크하기
              </button>
              <div style={{ fontSize: 11, color: T.mutedSoft, textAlign: 'center', marginTop: 8 }}>
                버튼을 눌러 현재 위치에서 퇴근을 보고하세요
              </div>
            </>
          )}
        </div>
      </div>

      {/* 이번 주 근무 기록 */}
      <div style={{ padding: '12px 16px' }}>
        <div style={{ background: T.surface, borderRadius: 14, padding: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: T.text }}>이번 주 근무 기록</div>
            <span style={{ fontSize: 11, color: T.primary, fontWeight: 600 }}>전체 보기</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 6 }}>
            {weekRows.map((d, i) => (
              <div key={i} style={{
                padding: '8px 4px', borderRadius: 8, textAlign: 'center',
                background: d.today ? T.primary : d.ok ? T.successSoft : d.isWeekend ? T.bg : T.bg,
                color: d.today ? '#fff' : d.ok ? T.success : d.isWeekend ? T.mutedSoft : T.mutedSoft,
                border: d.upcoming ? `1px dashed ${T.border}` : 'none',
              }}>
                <div style={{ fontSize: 10, fontWeight: 600, opacity: d.today ? 0.9 : 0.7 }}>{d.d}</div>
                <div style={{ fontSize: 14, fontWeight: 700, margin: '3px 0' }}>{d.n}</div>
                <div style={{ fontSize: 9, fontWeight: 600 }}>{d.h}</div>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 12, paddingTop: 12, borderTop: `1px solid ${T.borderSoft}`, fontSize: 11, color: T.mutedSoft }}>
            <span>이번 주 누적 <strong style={{ color: T.text, fontWeight: 700 }}>{weekHoursLabel}</strong></span>
            <span>목표 40시간</span>
          </div>
        </div>
      </div>

      {/* 최근 5일 기록 */}
      <div style={{ padding: '0 16px 20px' }}>
        <div style={{ background: T.surface, borderRadius: 14, padding: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: T.text, marginBottom: 10 }}>최근 5일 기록</div>
          {(() => {
            const myRecs = records
              .filter((r) => r.employeeId === currentUser?.id && r.checkIn)
              .sort((a, b) => b.date.localeCompare(a.date))
              .slice(0, 5);
            if (myRecs.length === 0) {
              return <div style={{ fontSize: 12, color: T.mutedSoft, padding: '8px 0' }}>기록 없음</div>;
            }
            return myRecs.map((r, i) => {
              const d = new Date(r.date);
              const dateLabel = `${d.getMonth() + 1}/${d.getDate()} ${KO_DAYS[d.getDay()]}`;
              const io = r.checkOut ? `${fmtTime(r.checkIn)} / ${fmtTime(r.checkOut)}` : `${fmtTime(r.checkIn)} / —`;
              const h = r.workMinutes ? `${Math.floor(r.workMinutes / 60)}h ${r.workMinutes % 60}m` : '—';
              return (
                <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderTop: i > 0 ? `1px solid ${T.borderSoft}` : 'none' }}>
                  <div style={{ fontSize: 12, color: T.muted, fontWeight: 600, width: 60 }}>{dateLabel}</div>
                  <div style={{ fontSize: 12, color: T.text, flex: 1, fontFamily: 'ui-monospace, monospace' }}>{io}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    {r.status === 'late' && <Pill tone="warning">지각</Pill>}
                    <span style={{ fontSize: 12, fontWeight: 700, color: r.status === 'late' ? T.warning : T.success }}>{h}</span>
                  </div>
                </div>
              );
            });
          })()}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// 작업 탭
// ─────────────────────────────────────────────────────────
function MobileTasksScreen() {
  const currentUser = useAuthStore((s) => s.currentUser);
  const tasks = useTaskStore((s) => s.tasks);
  const crops = useCropStore((s) => s.crops);
  const zones = useZoneStore((s) => s.zones);

  const cropMap = useMemo(() => Object.fromEntries(crops.map((c) => [c.id, c])), [crops]);
  const zoneMap = useMemo(() => Object.fromEntries(zones.map((z) => [z.id, z])), [zones]);

  const myTasks = useMemo(
    () => tasks.filter((t) => t.workerId === currentUser?.id && t.date === TODAY),
    [tasks, currentUser]
  );

  const tabs = ['오늘', '이번 주', '지난 작업'];
  const completedCount = myTasks.filter((t) => t.status === 'completed').length;
  const inProgressCount = myTasks.filter((t) => t.status === 'in_progress').length;
  const pendingCount = myTasks.filter((t) => t.status === 'pending').length;

  const inProgressTasks = myTasks.filter((t) => t.status === 'in_progress');
  const pendingTasks = myTasks.filter((t) => t.status === 'pending');

  function getTaskDisplay(t) {
    const crop = cropMap[t.cropId]?.name ?? '';
    const zone = zoneMap[t.zoneId]?.name ?? '';
    return t.title ?? ([crop, zone].filter(Boolean).join(' · ') || '작업');
  }

  return (
    <div style={{ background: '#F2F2F7', height: '100%', fontFamily: '-apple-system, Pretendard, system-ui', display: 'flex', flexDirection: 'column', overflow: 'auto' }}>
      {/* 헤더 */}
      <div style={{ background: T.surface, padding: '16px 20px 0', borderBottom: `1px solid ${T.borderSoft}` }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <div style={{ fontSize: 22, fontWeight: 700, color: T.text, letterSpacing: -0.4 }}>작업</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: T.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon d={icons.filter} size={16} c={T.muted} />
            </div>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: T.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon d={icons.calendar} size={16} c={T.muted} />
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 20 }}>
          {tabs.map((t, i) => (
            <div key={t} style={{
              padding: '10px 0', fontSize: 13, fontWeight: 700,
              color: i === 0 ? T.primary : T.mutedSoft,
              borderBottom: i === 0 ? `2px solid ${T.primary}` : '2px solid transparent',
            }}>{t}{i === 0 && myTasks.length > 0 && <span style={{ marginLeft: 4, fontSize: 10, color: T.primary }}>{myTasks.length}</span>}</div>
          ))}
        </div>
      </div>

      {/* 요약 */}
      <div style={{ padding: '14px 16px 8px', display: 'flex', gap: 8 }}>
        {[
          { l: '완료', v: completedCount, c: T.success },
          { l: '진행', v: inProgressCount, c: T.primary },
          { l: '대기', v: pendingCount, c: T.mutedSoft },
        ].map((k) => (
          <div key={k.l} style={{ flex: 1, background: T.surface, borderRadius: 12, padding: 12, borderTop: `3px solid ${k.c}` }}>
            <div style={{ fontSize: 10, color: T.mutedSoft, fontWeight: 700 }}>{k.l}</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: T.text, letterSpacing: -0.4, marginTop: 2 }}>{k.v}</div>
          </div>
        ))}
      </div>

      {/* 진행중 작업 */}
      {inProgressTasks.length > 0 && (
        <div style={{ padding: '8px 16px' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: T.mutedSoft, letterSpacing: 0.3, padding: '6px 4px' }}>
            진행중 · {inProgressTasks.length}건
          </div>
          {inProgressTasks.map((t) => (
            <div key={t.id} style={{
              background: T.surface, borderRadius: 16, padding: 16, marginBottom: 8,
              borderLeft: `3px solid ${T.success}`,
              boxShadow: '0 2px 8px rgba(15,23,42,0.04)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                {cropMap[t.cropId] && (
                  <span style={{ fontSize: 10, fontWeight: 700, color: T.success, background: T.successSoft, padding: '3px 7px', borderRadius: 4 }}>
                    {cropMap[t.cropId].name}
                  </span>
                )}
                <Pill tone="success">진행중</Pill>
              </div>
              <div style={{ fontSize: 16, fontWeight: 700, color: T.text, lineHeight: 1.3 }}>{getTaskDisplay(t)}</div>
              <div style={{ fontSize: 12, color: T.muted, marginTop: 6, display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Icon d={icons.clock} size={12} /> {fmtTime(t.assignedAt)} ~ {calcEndTime(t.assignedAt, t.estimatedMinutes)}
                </span>
                {zoneMap[t.zoneId] && (
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Icon d={icons.location} size={12} /> {zoneMap[t.zoneId].name}
                  </span>
                )}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 12, paddingTop: 12, borderTop: `1px solid ${T.borderSoft}` }}>
                <span style={{ fontSize: 11, color: T.mutedSoft }}>진행중</span>
                <button style={{
                  padding: '8px 16px', borderRadius: 8, border: 0,
                  background: T.primary, color: '#fff', fontSize: 12, fontWeight: 700,
                }}>보고하기</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 대기 작업 */}
      {pendingTasks.length > 0 && (
        <div style={{ padding: '12px 16px' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: T.mutedSoft, letterSpacing: 0.3, padding: '6px 4px' }}>
            오늘 예정 · {pendingTasks.length}건
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {pendingTasks.map((t) => {
              const crop = cropMap[t.cropId];
              const cropColor = T.info;
              return (
                <div key={t.id} style={{
                  background: T.surface, borderRadius: 12, padding: 14,
                  display: 'flex', alignItems: 'center', gap: 12,
                }}>
                  <div style={{ width: 4, alignSelf: 'stretch', background: cropColor, borderRadius: 999 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                      {crop && <span style={{ fontSize: 10, fontWeight: 700, color: cropColor, background: `${cropColor}15`, padding: '2px 6px', borderRadius: 3 }}>{crop.name}</span>}
                      <span style={{ fontSize: 11, color: T.mutedSoft }}>{fmtTime(t.assignedAt)}~{calcEndTime(t.assignedAt, t.estimatedMinutes)}</span>
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: T.text, lineHeight: 1.3 }}>{getTaskDisplay(t)}</div>
                    {t.estimatedMinutes && (
                      <div style={{ fontSize: 11, color: T.mutedSoft, marginTop: 3 }}>예상 {Math.floor(t.estimatedMinutes / 60)}h {t.estimatedMinutes % 60}m</div>
                    )}
                  </div>
                  <Icon d={<polyline points="9 18 15 12 9 6" />} size={16} c={T.mutedSoft} />
                </div>
              );
            })}
          </div>
        </div>
      )}

      {myTasks.length === 0 && (
        <div style={{ padding: '40px 16px', textAlign: 'center', color: T.mutedSoft, fontSize: 13 }}>
          오늘 배정된 작업이 없습니다
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// 근태 탭
// ─────────────────────────────────────────────────────────
function MobileAttendanceScreen() {
  const currentUser = useAuthStore((s) => s.currentUser);
  const records = useAttendanceStore((s) => s.records);
  const leaveRequests = useLeaveStore((s) => s.requests);
  const leaveBalances = useLeaveStore((s) => s.balances);
  const overtimeRequests = useOvertimeStore((s) => s.requests);

  const currentYear = NOW.getFullYear();
  const currentMonth = NOW.getMonth(); // 0-indexed
  const monthStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`;

  const myMonthRecords = useMemo(
    () => records.filter((r) => r.employeeId === currentUser?.id && r.date?.startsWith(monthStr)),
    [records, currentUser, monthStr]
  );

  const workedDays = myMonthRecords.filter((r) => r.checkIn).length;
  const totalMinutes = myMonthRecords.reduce((acc, r) => acc + (r.workMinutes ?? 0), 0);
  const totalHours = Math.floor(totalMinutes / 60);

  const myBalance = leaveBalances.find((b) => b.employeeId === currentUser?.id && b.year === currentYear);
  const totalLeaveDays = myBalance?.totalDays ?? 15;
  const usedLeaveDays = myBalance?.usedDays ?? 0;
  const remainingLeaveDays = totalLeaveDays - usedLeaveDays;

  const myMonthOT = useMemo(
    () => overtimeRequests.filter((r) => r.employeeId === currentUser?.id && r.status === 'approved' && r.date?.startsWith(monthStr)),
    [overtimeRequests, currentUser, monthStr]
  );
  const otHours = myMonthOT.reduce((acc, r) => acc + (r.hours ?? 0), 0);

  // 캘린더 계산
  const firstDayOfWeek = new Date(currentYear, currentMonth, 1).getDay(); // 0=일
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const recsByDate = useMemo(() => Object.fromEntries(myMonthRecords.map((r) => [r.date, r])), [myMonthRecords]);

  function getCalStatus(day) {
    const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const isToday = dateStr === TODAY;
    if (isToday) return 'today';
    const d = new Date(currentYear, currentMonth, day);
    const dow = d.getDay();
    const isWeekend = dow === 0 || dow === 6;
    const isFuture = dateStr > TODAY;
    if (isFuture) return isWeekend ? 'off' : 'plan';
    const rec = recsByDate[dateStr];
    if (!rec || !rec.checkIn) return 'off';
    if (rec.status === 'late') return 'late';
    // 휴가 여부 확인
    const hasLeave = leaveRequests.some((lr) => lr.employeeId === currentUser?.id && lr.status === 'approved' && lr.startDate <= dateStr && dateStr <= (lr.endDate ?? lr.startDate));
    if (hasLeave) return 'leave';
    return 'work';
  }

  const calColors = {
    work: { bg: T.successSoft, fg: T.success },
    late: { bg: T.warningSoft, fg: T.warning },
    leave: { bg: T.primarySoft, fg: T.primary },
    off: { bg: T.bg, fg: T.mutedSoft },
    plan: { bg: 'transparent', fg: T.mutedSoft, dashed: true },
    today: { bg: T.primary, fg: '#fff' },
  };

  // 신청 이력 (휴가 + 연장) 최근 4건
  const myLeaveReqs = useMemo(
    () => leaveRequests.filter((r) => r.employeeId === currentUser?.id),
    [leaveRequests, currentUser]
  );
  const myOTReqs = useMemo(
    () => overtimeRequests.filter((r) => r.employeeId === currentUser?.id),
    [overtimeRequests, currentUser]
  );

  const historyItems = useMemo(() => {
    const leaves = myLeaveReqs.map((r) => ({
      type: LEAVE_TYPE_KO[r.type] ?? r.type ?? '휴가',
      detail: fmtLeaveDate(r.startDate, r.endDate),
      status: r.status,
      date: timeAgo(r.createdAt),
    }));
    const ots = myOTReqs.map((r) => ({
      type: '연장근무',
      detail: `${r.date ? new Date(r.date).getMonth() + 1 + '/' + new Date(r.date).getDate() : '—'} · ${r.hours ?? 0}시간`,
      status: r.status,
      date: timeAgo(r.createdAt),
    }));
    return [...leaves, ...ots]
      .sort((a, b) => (a.date > b.date ? -1 : 1))
      .slice(0, 4);
  }, [myLeaveReqs, myOTReqs]);

  const stats = [
    { l: '이번 달 근무', v: String(totalHours), u: '시간', sub: `${workedDays}일 출근` },
    { l: '연차 잔여', v: String(remainingLeaveDays), u: '일', sub: `${totalLeaveDays}일 중 ${usedLeaveDays}일 사용` },
    { l: '연장 근무', v: String(otHours), u: '시간', sub: '이번 달' },
  ];

  return (
    <div style={{ background: '#F2F2F7', height: '100%', fontFamily: '-apple-system, Pretendard, system-ui', display: 'flex', flexDirection: 'column', overflow: 'auto' }}>
      <div style={{ background: T.surface, padding: '16px 20px 12px' }}>
        <div style={{ fontSize: 22, fontWeight: 700, color: T.text, letterSpacing: -0.4 }}>근태</div>
        <div style={{ fontSize: 13, color: T.mutedSoft, marginTop: 2 }}>
          {currentYear}년 {currentMonth + 1}월 · {currentUser?.name ?? '—'}
        </div>
      </div>

      {/* 월 요약 KPI */}
      <div style={{ padding: '14px 16px 8px', display: 'flex', gap: 8 }}>
        {stats.map((s, i) => (
          <div key={i} style={{ flex: 1, background: T.surface, borderRadius: 12, padding: 12 }}>
            <div style={{ fontSize: 10, color: T.mutedSoft, fontWeight: 700 }}>{s.l}</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 3, marginTop: 4 }}>
              <span style={{ fontSize: 22, fontWeight: 700, color: T.text, letterSpacing: -0.5 }}>{s.v}</span>
              <span style={{ fontSize: 10, color: T.mutedSoft, fontWeight: 500 }}>{s.u}</span>
            </div>
            <div style={{ fontSize: 10, color: T.mutedSoft, marginTop: 2, lineHeight: 1.3 }}>{s.sub}</div>
          </div>
        ))}
      </div>

      {/* 휴가 신청 배너 */}
      <div style={{ padding: '6px 16px 12px' }}>
        <div style={{
          background: `linear-gradient(135deg, ${T.primary} 0%, ${T.primaryDark} 100%)`,
          borderRadius: 14, padding: 14, display: 'flex', alignItems: 'center', gap: 12,
          color: '#fff', position: 'relative', overflow: 'hidden',
        }}>
          <div style={{ position: 'absolute', top: -15, right: -10, width: 80, height: 80, borderRadius: 999, background: 'rgba(255,255,255,0.1)' }} />
          <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
            <Icon d={icons.calendar} size={18} c="#fff" sw={2} />
          </div>
          <div style={{ flex: 1, position: 'relative' }}>
            <div style={{ fontSize: 13, fontWeight: 700 }}>휴가 신청하기</div>
            <div style={{ fontSize: 11, opacity: 0.85, marginTop: 2 }}>연차 · 반차 · 특별휴가</div>
          </div>
          <Icon d={<polyline points="9 18 15 12 9 6" />} size={16} c="#fff" />
        </div>
      </div>

      {/* 월 캘린더 */}
      <div style={{ padding: '0 16px 12px' }}>
        <div style={{ background: T.surface, borderRadius: 14, padding: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: T.text }}>{currentMonth + 1}월 근무 현황</div>
            <div style={{ display: 'flex', gap: 4 }}>
              <button style={{ width: 24, height: 24, borderRadius: 6, border: `1px solid ${T.border}`, background: T.surface, fontSize: 10 }}>‹</button>
              <button style={{ width: 24, height: 24, borderRadius: 6, border: `1px solid ${T.border}`, background: T.surface, fontSize: 10 }}>›</button>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 3 }}>
            {['일', '월', '화', '수', '목', '금', '토'].map((d, i) => (
              <div key={d} style={{ fontSize: 10, fontWeight: 700, color: i === 0 ? T.danger : i === 6 ? T.primary : T.mutedSoft, textAlign: 'center', padding: '4px 0' }}>{d}</div>
            ))}
            {Array.from({ length: firstDayOfWeek + daysInMonth }).map((_, i) => {
              const day = i - firstDayOfWeek + 1;
              if (day < 1) return <div key={i} />;
              const st = getCalStatus(day);
              const c = calColors[st] ?? calColors.off;
              return (
                <div key={i} style={{
                  aspectRatio: '1', padding: 3, borderRadius: 6, textAlign: 'center',
                  background: c.bg,
                  border: c.dashed ? `1px dashed ${T.border}` : 'none',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 12, fontWeight: 700, color: c.fg,
                }}>
                  {day}
                </div>
              );
            })}
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 12, paddingTop: 12, borderTop: `1px solid ${T.borderSoft}`, fontSize: 10, color: T.muted, flexWrap: 'wrap' }}>
            {[
              { l: '정상', c: T.success },
              { l: '지각', c: T.warning },
              { l: '휴가', c: T.primary },
              { l: '예정', c: T.mutedSoft },
            ].map((l) => (
              <span key={l.l} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ width: 8, height: 8, borderRadius: 2, background: `${l.c}40`, border: `1px solid ${l.c}` }} />
                {l.l}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* 내 신청 이력 */}
      <div style={{ padding: '0 16px 24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 4px' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: T.mutedSoft, letterSpacing: 0.3 }}>내 신청 이력</div>
          <span style={{ fontSize: 11, color: T.primary, fontWeight: 600 }}>전체 보기</span>
        </div>
        <div style={{ background: T.surface, borderRadius: 12, overflow: 'hidden' }}>
          {historyItems.length === 0 ? (
            <div style={{ padding: '16px 14px', fontSize: 12, color: T.mutedSoft }}>신청 이력이 없습니다</div>
          ) : historyItems.map((r, i) => {
            const sm = {
              pending: { tone: 'warning', l: '승인 대기' },
              approved: { tone: 'success', l: '승인됨' },
              rejected: { tone: 'danger', l: '반려' },
            }[r.status] ?? { tone: 'muted', l: r.status };
            return (
              <div key={i} style={{
                padding: '12px 14px',
                borderBottom: i < historyItems.length - 1 ? `1px solid ${T.borderSoft}` : 'none',
                display: 'flex', alignItems: 'center', gap: 10,
              }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: T.text }}>{r.type}</span>
                    <Pill tone={sm.tone}>{sm.l}</Pill>
                  </div>
                  <div style={{ fontSize: 11, color: T.mutedSoft, marginTop: 3 }}>{r.detail}</div>
                </div>
                <div style={{ fontSize: 10, color: T.mutedSoft }}>{r.date}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// 내 정보 탭
// ─────────────────────────────────────────────────────────
function MobileProfileScreen() {
  const currentUser = useAuthStore((s) => s.currentUser);
  const employees = useEmployeeStore((s) => s.employees);
  const notices = useNoticeStore((s) => s.notices);

  const myEmployee = useMemo(
    () => employees.find((e) => e.id === currentUser?.id),
    [employees, currentUser]
  );

  const name = currentUser?.name ?? '—';
  const firstChar = name.charAt(0);
  const roleLabel = currentUser?.isTeamLeader ? '반장' : currentUser?.role === 'admin' ? '관리자' : '작업자';
  const branchJob = [currentUser?.branch, currentUser?.jobType].filter(Boolean).join(' ');
  const hireDate = myEmployee?.hireDate ? new Date(myEmployee.hireDate).toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\. /g, '.') : '—';
  const contractType = myEmployee?.contractType ?? '정규직';

  const unreadNotices = notices.filter((n) => n.priority === 'urgent' || n.priority === 'high').length;

  const logout = useAuthStore((s) => s.logout);

  return (
    <div style={{ background: '#F2F2F7', height: '100%', fontFamily: '-apple-system, Pretendard, system-ui', overflow: 'auto' }}>
      {/* 프로필 헤더 */}
      <div style={{
        background: `linear-gradient(160deg, ${T.primaryDark} 0%, ${T.primary} 100%)`,
        color: '#fff', padding: '20px 20px 70px',
        position: 'relative', overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', top: -40, right: -40, width: 180, height: 180, borderRadius: 999, background: 'rgba(255,255,255,0.08)' }} />
        <div style={{ position: 'absolute', bottom: 20, right: -20, width: 100, height: 100, borderRadius: 999, background: 'rgba(255,255,255,0.05)' }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, position: 'relative' }}>
          <div style={{ fontSize: 17, fontWeight: 700 }}>내 정보</div>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(255,255,255,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon d={icons.settings} size={16} c="#fff" sw={2} />
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, position: 'relative' }}>
          <div style={{
            width: 64, height: 64, borderRadius: 999,
            background: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(10px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 28, fontWeight: 700, color: '#fff', border: '2px solid rgba(255,255,255,0.3)',
          }}>{firstChar}</div>
          <div>
            <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: -0.4 }}>{name}</div>
            <div style={{ fontSize: 12, opacity: 0.85, marginTop: 3 }}>{roleLabel}</div>
            {(branchJob || hireDate !== '—') && (
              <div style={{ fontSize: 11, opacity: 0.75, marginTop: 2 }}>{branchJob}{hireDate !== '—' ? ` · ${hireDate} 입사` : ''}</div>
            )}
          </div>
        </div>
      </div>

      {/* 메뉴 리스트 */}
      <div style={{ padding: '32px 16px 8px' }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: T.mutedSoft, letterSpacing: 0.3, padding: '4px 4px 8px' }}>계정</div>
        <div style={{ background: T.surface, borderRadius: 14, overflow: 'hidden' }}>
          {[
            { icon: icons.users, l: '개인정보 수정', sub: '연락처, 비상연락망' },
            { icon: icons.clipboard, l: '계약 정보', sub: `${contractType} · 주 5일` },
            { icon: icons.leaf, l: '담당 작물 · 구역', sub: branchJob || '—' },
          ].map((m, i, arr) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '14px 16px',
              borderBottom: i < arr.length - 1 ? `1px solid ${T.borderSoft}` : 'none',
            }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: T.primarySoft, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon d={m.icon} size={16} c={T.primary} sw={2} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: T.text }}>{m.l}</div>
                <div style={{ fontSize: 11, color: T.mutedSoft, marginTop: 2 }}>{m.sub}</div>
              </div>
              <Icon d={<polyline points="9 18 15 12 9 6" />} size={14} c={T.mutedSoft} />
            </div>
          ))}
        </div>
      </div>

      <div style={{ padding: '8px 16px' }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: T.mutedSoft, letterSpacing: 0.3, padding: '4px 4px 8px' }}>알림 · 설정</div>
        <div style={{ background: T.surface, borderRadius: 14, overflow: 'hidden' }}>
          {[
            { icon: icons.bell, l: '알림 설정', toggle: true, on: true },
            { icon: icons.location, l: '위치 서비스', toggle: true, on: true, sub: '출퇴근 인증용' },
            { icon: icons.phone, l: '비상 호출 연락망', sub: '관리자 · 안전팀' },
          ].map((m, i, arr) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '14px 16px',
              borderBottom: i < arr.length - 1 ? `1px solid ${T.borderSoft}` : 'none',
            }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: T.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon d={m.icon} size={16} c={T.muted} sw={2} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: T.text }}>{m.l}</div>
                {m.sub && <div style={{ fontSize: 11, color: T.mutedSoft, marginTop: 2 }}>{m.sub}</div>}
              </div>
              {m.toggle ? (
                <div style={{
                  width: 40, height: 24, borderRadius: 999,
                  background: m.on ? T.success : T.border,
                  position: 'relative',
                }}>
                  <div style={{
                    position: 'absolute', top: 2, left: m.on ? 18 : 2,
                    width: 20, height: 20, borderRadius: 999, background: '#fff',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                  }} />
                </div>
              ) : <Icon d={<polyline points="9 18 15 12 9 6" />} size={14} c={T.mutedSoft} />}
            </div>
          ))}
        </div>
      </div>

      <div style={{ padding: '8px 16px' }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: T.mutedSoft, letterSpacing: 0.3, padding: '4px 4px 8px' }}>지원</div>
        <div style={{ background: T.surface, borderRadius: 14, overflow: 'hidden' }}>
          {[
            { l: '공지사항', sub: unreadNotices > 0 ? `새 공지 ${unreadNotices}건` : undefined, badge: unreadNotices > 0 ? unreadNotices : 0 },
            { l: '사용 가이드' },
            { l: '문의하기' },
            { l: '버전 정보', detail: 'v2.4.1' },
          ].map((m, i, arr) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '14px 16px',
              borderBottom: i < arr.length - 1 ? `1px solid ${T.borderSoft}` : 'none',
            }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: T.text, display: 'flex', alignItems: 'center', gap: 6 }}>
                  {m.l}
                  {m.badge > 0 && <span style={{ background: T.danger, color: '#fff', fontSize: 9, fontWeight: 700, padding: '1px 5px', borderRadius: 999 }}>{m.badge}</span>}
                </div>
                {m.sub && <div style={{ fontSize: 11, color: T.mutedSoft, marginTop: 2 }}>{m.sub}</div>}
              </div>
              {m.detail && <span style={{ fontSize: 12, color: T.mutedSoft, fontFamily: 'ui-monospace, monospace' }}>{m.detail}</span>}
              {!m.detail && <Icon d={<polyline points="9 18 15 12 9 6" />} size={14} c={T.mutedSoft} />}
            </div>
          ))}
        </div>
      </div>

      {/* 로그아웃 */}
      <div style={{ padding: '16px 16px 24px' }}>
        <button
          onClick={logout}
          style={{
            width: '100%', padding: '13px 0', borderRadius: 12,
            background: T.surface, border: `1px solid ${T.border}`,
            color: T.danger, fontSize: 13, fontWeight: 700,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          }}>
          <Icon d={icons.logout} size={15} c={T.danger} sw={2} />
          로그아웃
        </button>
      </div>
    </div>
  );
}

export { MobileAttendanceScreen, MobileCheckInScreen, MobileHomeScreen, MobileProfileScreen, MobileTasksScreen };
