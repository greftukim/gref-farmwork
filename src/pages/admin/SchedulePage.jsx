// 근무 관리 — /admin/schedule
import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Avatar, Card, Icon, Pill, T, TopBar, btnPrimary, btnSecondary, icons } from '../../design/primitives';
import useAuthStore from '../../stores/authStore';
import useEmployeeStore from '../../stores/employeeStore';
import useTaskStore from '../../stores/taskStore';
import useLeaveStore from '../../stores/leaveStore';

const HOURS = ['08', '09', '10', '11', '12', '13', '14', '15', '16', '17'];
const HOUR_START = 8;
const HOUR_COUNT = HOURS.length;

const TONE_BG = {
  primary:      { bg: T.primarySoft, fg: T.primaryText, bar: T.primary },
  success:      { bg: T.successSoft, fg: T.success,     bar: T.success },
  info:         { bg: T.infoSoft,    fg: T.info,        bar: T.info },
  warning:      { bg: T.warningSoft, fg: T.warning,     bar: T.warning },
  danger:       { bg: T.dangerSoft,  fg: T.danger,      bar: T.danger },
  muted:        { bg: '#F1F5F9',     fg: T.muted,       bar: T.mutedSoft },
  warningSolid: { bg: T.warning,     fg: '#fff',        bar: T.warning },
};

const AVATAR_COLORS = ['indigo', 'emerald', 'rose', 'amber', 'slate'];

const TASK_TYPE_TONE_MAP = [
  ['TBM',     'primary'],
  ['수확',    'success'],
  ['EC/pH',   'info'],
  ['적엽',    'info'],
  ['유인',    'info'],
  ['결속',    'info'],
  ['병해충',  'warning'],
  ['수분',    'warning'],
];

function taskTone(taskType) {
  if (!taskType) return 'muted';
  for (const [key, tone] of TASK_TYPE_TONE_MAP) {
    if (taskType.includes(key)) return tone;
  }
  return 'muted';
}

function tsOffset(ts) {
  if (!ts) return null;
  const d = new Date(ts);
  return (d.getHours() + d.getMinutes() / 60) - HOUR_START;
}

function toDateStr(d) {
  return d.toISOString().split('T')[0];
}

function fmtMD(d) {
  return `${d.getMonth() + 1}월 ${d.getDate()}일`;
}

function fmtFull(d) {
  const DAY = ['일', '월', '화', '수', '목', '금', '토'];
  return `${d.getMonth() + 1}월 ${d.getDate()}일 ${DAY[d.getDay()]}요일`;
}

function fmtHM(d) {
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function getWeekMon(date) {
  const d = new Date(date);
  const day = d.getDay();
  d.setDate(d.getDate() - (day === 0 ? 6 : day - 1));
  d.setHours(0, 0, 0, 0);
  return d;
}

function getWeekNumber(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
  const w1 = new Date(d.getFullYear(), 0, 4);
  return 1 + Math.round(((d - w1) / 86400000 - 3 + ((w1.getDay() + 6) % 7)) / 7);
}

function getDaysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}

export default function SchedulePage() {
  const navigate = useNavigate();
  const currentUser = useAuthStore((s) => s.currentUser);
  const employees = useEmployeeStore((s) => s.employees);
  const fetchEmployees = useEmployeeStore((s) => s.fetchEmployees);
  const tasks = useTaskStore((s) => s.tasks);
  const fetchTasks = useTaskStore((s) => s.fetchTasks);
  const requests = useLeaveStore((s) => s.requests);
  const fetchRequests = useLeaveStore((s) => s.fetchRequests);

  const [viewMode, setViewMode] = useState('day');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    if (currentUser) {
      fetchEmployees(currentUser);
      fetchTasks(currentUser);
      fetchRequests(currentUser);
    }
  }, [currentUser]);

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(id);
  }, []);

  const workers = useMemo(() =>
    employees
      .filter((e) => e.role === 'worker' && e.isActive !== false)
      .map((e, i) => ({ ...e, avatarColor: AVATAR_COLORS[i % AVATAR_COLORS.length] })),
    [employees]
  );

  const selDateStr = useMemo(() => toDateStr(selectedDate), [selectedDate]);
  const todayStr = useMemo(() => toDateStr(now), [now]);

  const barsForDate = useMemo(() => {
    const result = {};
    workers.forEach((w) => { result[w.id] = []; });

    // approved leave → full-width warningSolid bar
    requests
      .filter((r) => r.date === selDateStr && r.status === 'approved')
      .forEach((r) => {
        if (!result[r.employeeId]) return;
        result[r.employeeId].push({ s: 0, e: HOUR_COUNT, t: r.type || '휴가', tone: 'warningSolid' });
      });

    // tasks that have a start time
    tasks
      .filter((t) => t.date === selDateStr)
      .forEach((t) => {
        if (!result[t.workerId]) return; // workers = is_active=true 만 포함, 비활성 작업자 태스크 무시
        let s = tsOffset(t.startedAt);
        if (s === null) return; // not started yet — skip
        let e = tsOffset(t.completedAt);
        if (e === null) {
          e = s + (t.estimatedMinutes ? t.estimatedMinutes / 60 : 1);
        }
        s = Math.max(0, Math.min(s, HOUR_COUNT));
        e = Math.max(s + 0.1, Math.min(e, HOUR_COUNT));
        result[t.workerId].push({ s, e, t: t.title, tone: taskTone(t.taskType) });
      });

    return result;
  }, [workers, tasks, requests, selDateStr]);

  const nowOffset = useMemo(() => {
    if (selDateStr !== todayStr) return null;
    const off = (now.getHours() + now.getMinutes() / 60) - HOUR_START;
    if (off < 0 || off >= HOUR_COUNT) return null;
    return off;
  }, [selDateStr, todayStr, now]);

  const weekMon = useMemo(() => getWeekMon(selectedDate), [selectedDate]);
  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(weekMon);
      d.setDate(weekMon.getDate() + i);
      return d;
    });
  }, [weekMon]);

  const weekSun = weekDays[6];

  function shiftDate(delta) {
    const d = new Date(selectedDate);
    if (viewMode === 'day') d.setDate(d.getDate() + delta);
    else if (viewMode === 'week') d.setDate(d.getDate() + delta * 7);
    else d.setMonth(d.getMonth() + delta);
    setSelectedDate(d);
  }

  // ── 주 선택 바 ──
  function WeekBar() {
    let label, sub;
    if (viewMode === 'day') {
      label = fmtFull(selectedDate);
      sub = `${selectedDate.getFullYear()}년 ${getWeekNumber(selectedDate)}주차`;
    } else if (viewMode === 'week') {
      label = `${fmtMD(weekMon)} — ${fmtMD(weekSun)}`;
      sub = `${selectedDate.getFullYear()}년 ${getWeekNumber(selectedDate)}주차`;
    } else {
      label = `${selectedDate.getFullYear()}년 ${selectedDate.getMonth() + 1}월`;
      sub = '월간 일정';
    }

    return (
      <Card pad={16} style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ display: 'flex', gap: 4 }}>
              <button onClick={() => shiftDate(-1)} style={{ width: 32, height: 32, borderRadius: 6, border: `1px solid ${T.border}`, background: T.surface, cursor: 'pointer', fontSize: 16, lineHeight: 1 }}>‹</button>
              <button onClick={() => shiftDate(1)} style={{ width: 32, height: 32, borderRadius: 6, border: `1px solid ${T.border}`, background: T.surface, cursor: 'pointer', fontSize: 16, lineHeight: 1 }}>›</button>
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: T.text }}>{label}</div>
              <div style={{ fontSize: 11, color: T.mutedSoft, marginTop: 2 }}>{sub}</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 4, background: T.bg, padding: 3, borderRadius: 6 }}>
            {[['일간', 'day'], ['주간', 'week'], ['월간', 'month']].map(([lbl, mode]) => (
              <span key={mode} onClick={() => setViewMode(mode)} style={{
                padding: '6px 14px', borderRadius: 4, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                background: viewMode === mode ? T.surface : 'transparent',
                color: viewMode === mode ? T.text : T.mutedSoft,
                boxShadow: viewMode === mode ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
              }}>{lbl}</span>
            ))}
          </div>
        </div>

        {viewMode === 'week' && (
          <div style={{ display: 'flex', gap: 4, marginTop: 12, borderTop: `1px solid ${T.borderSoft}`, paddingTop: 12 }}>
            {weekDays.map((d, i) => {
              const DAY_KO = ['일', '월', '화', '수', '목', '금', '토'];
              const isActive = toDateStr(d) === selDateStr;
              const isToday = toDateStr(d) === todayStr;
              return (
                <button key={i} onClick={() => setSelectedDate(new Date(d))} style={{
                  flex: 1, padding: '6px 0', borderRadius: 6, border: 'none', cursor: 'pointer', outline: 'none',
                  background: isActive ? T.primary : 'transparent',
                  color: isActive ? '#fff' : isToday ? T.primary : T.muted,
                  fontSize: 11, fontWeight: 600,
                }}>
                  <div>{DAY_KO[d.getDay()]}</div>
                  <div style={{ fontSize: 13, fontWeight: 700, marginTop: 2 }}>{d.getDate()}</div>
                </button>
              );
            })}
          </div>
        )}
      </Card>
    );
  }

  // ── 타임라인 Gantt ──
  function Timeline() {
    return (
      <Card pad={0}>
        <div style={{ padding: '14px 18px', borderBottom: `1px solid ${T.borderSoft}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: T.text }}>{fmtFull(selectedDate)} 타임라인</div>
            <div style={{ fontSize: 11, color: T.mutedSoft, marginTop: 2 }}>08:00 ~ 17:00 · 점심 12:00~13:00</div>
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', fontSize: 11, color: T.muted }}>
            {[
              { l: 'TBM', c: T.primary }, { l: '수확', c: T.success }, { l: '측정', c: T.info },
              { l: '주의', c: T.warning }, { l: '이상', c: T.danger },
            ].map((item) => (
              <span key={item.l} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ width: 10, height: 10, borderRadius: 2, background: item.c }} />
                {item.l}
              </span>
            ))}
          </div>
        </div>

        {/* 시간 헤더 */}
        <div style={{ display: 'grid', gridTemplateColumns: '180px 1fr', background: T.bg, borderBottom: `1px solid ${T.borderSoft}` }}>
          <div style={{ padding: '10px 16px', fontSize: 11, color: T.mutedSoft, fontWeight: 700 }}>작업자</div>
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${HOUR_COUNT}, 1fr)` }}>
            {HOURS.map((h, i) => (
              <div key={i} style={{
                fontSize: 11, color: T.mutedSoft, fontWeight: 600, padding: '10px 0 10px 6px',
                borderLeft: i > 0 ? `1px solid ${T.borderSoft}` : 'none',
              }}>{h}:00</div>
            ))}
          </div>
        </div>

        {/* 작업자 행 */}
        {workers.length === 0 ? (
          <div style={{ padding: 48, textAlign: 'center', fontSize: 13, color: T.mutedSoft }}>작업자 데이터가 없습니다</div>
        ) : workers.map((w, wi) => {
          const bars = barsForDate[w.id] || [];
          return (
            <div key={w.id} style={{ display: 'grid', gridTemplateColumns: '180px 1fr', borderBottom: wi < workers.length - 1 ? `1px solid ${T.borderSoft}` : 'none' }}>
              <div style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
                <Avatar name={w.name} size={30} c={w.avatarColor} />
                <div style={{ fontSize: 13, fontWeight: 700, color: T.text, display: 'flex', alignItems: 'center', gap: 5 }}>
                  {w.name}
                  {w.isTeamLeader && <Pill tone="primary">반장</Pill>}
                </div>
              </div>
              <div style={{ position: 'relative', height: 64 }}>
                {/* 세로 그리드 */}
                {HOURS.map((_, i) => (
                  <div key={i} style={{ position: 'absolute', left: `${(i / HOUR_COUNT) * 100}%`, top: 0, bottom: 0, width: 1, background: T.borderSoft }} />
                ))}
                {/* 점심 해치 */}
                <div style={{
                  position: 'absolute',
                  left: `${(4 / HOUR_COUNT) * 100}%`,
                  width: `${(1 / HOUR_COUNT) * 100}%`,
                  top: 0, bottom: 0,
                  background: 'repeating-linear-gradient(45deg,rgba(0,0,0,0.025),rgba(0,0,0,0.025) 4px,transparent 4px,transparent 8px)',
                }} />
                {/* NOW 선 */}
                {nowOffset !== null && (
                  <div style={{ position: 'absolute', left: `${(nowOffset / HOUR_COUNT) * 100}%`, top: 0, bottom: 0, width: 2, background: T.danger, zIndex: 2 }}>
                    {wi === 0 && (
                      <div style={{ position: 'absolute', top: -8, left: -12, fontSize: 9, fontWeight: 700, color: '#fff', background: T.danger, padding: '2px 5px', borderRadius: 3, whiteSpace: 'nowrap' }}>
                        NOW {fmtHM(now)}
                      </div>
                    )}
                  </div>
                )}
                {/* 작업 블록 */}
                {bars.map((b, bi) => {
                  const tn = TONE_BG[b.tone] || TONE_BG.muted;
                  return (
                    <div key={bi} style={{
                      position: 'absolute',
                      left: `calc(${(b.s / HOUR_COUNT) * 100}% + 2px)`,
                      width: `calc(${((b.e - b.s) / HOUR_COUNT) * 100}% - 4px)`,
                      top: 8, bottom: 8,
                      background: tn.bg, color: tn.fg,
                      borderLeft: `3px solid ${tn.bar}`,
                      borderRadius: 4, padding: '4px 8px',
                      fontSize: 11, fontWeight: 600,
                      display: 'flex', alignItems: 'center',
                      overflow: 'hidden', whiteSpace: 'nowrap',
                    }}>{b.t}</div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </Card>
    );
  }

  // ── 월간 캘린더 ──
  function MonthCal() {
    const year = selectedDate.getFullYear();
    const month = selectedDate.getMonth();
    const daysInMonth = getDaysInMonth(year, month);
    const firstDow = new Date(year, month, 1).getDay(); // 0=Sun

    const leaveByDate = {};
    requests.filter((r) => r.status === 'approved' && r.date).forEach((r) => {
      leaveByDate[r.date] = (leaveByDate[r.date] || 0) + 1;
    });
    const taskByDate = {};
    tasks.forEach((t) => {
      taskByDate[t.date] = (taskByDate[t.date] || 0) + 1;
    });

    // leading empties: Mon-based grid (Mon=0)
    const leading = firstDow === 0 ? 6 : firstDow - 1;
    const cells = [...Array(leading).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];

    const DAY_HDR = ['월', '화', '수', '목', '금', '토', '일'];

    return (
      <Card pad={0}>
        <div style={{ padding: '14px 18px', borderBottom: `1px solid ${T.borderSoft}` }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: T.text }}>{year}년 {month + 1}월 일정</div>
          <div style={{ fontSize: 11, color: T.mutedSoft, marginTop: 2 }}>날짜 클릭 시 일간 타임라인으로 이동합니다</div>
        </div>
        <div style={{ padding: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2, marginBottom: 6 }}>
            {DAY_HDR.map((d, i) => (
              <div key={d} style={{ textAlign: 'center', fontSize: 11, fontWeight: 700, color: i === 6 ? T.danger : T.mutedSoft, padding: '4px 0' }}>{d}</div>
            ))}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 }}>
            {cells.map((d, i) => {
              if (!d) return <div key={`e${i}`} />;
              const ds = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
              const isSel = ds === selDateStr;
              const isToday = ds === todayStr;
              const hasLeave = (leaveByDate[ds] || 0) > 0;
              const hasTask = (taskByDate[ds] || 0) > 0;
              return (
                <div key={ds} onClick={() => { setSelectedDate(new Date(ds)); setViewMode('day'); }} style={{
                  padding: '6px 4px', borderRadius: 6, minHeight: 44, cursor: 'pointer', textAlign: 'center',
                  background: isSel ? T.primary : isToday ? T.primarySoft : 'transparent',
                  border: `1px solid ${isSel ? T.primary : T.borderSoft}`,
                }}>
                  <div style={{ fontSize: 12, fontWeight: isSel || isToday ? 700 : 400, color: isSel ? '#fff' : isToday ? T.primary : T.text }}>{d}</div>
                  <div style={{ display: 'flex', justifyContent: 'center', gap: 2, marginTop: 3 }}>
                    {hasLeave && <span style={{ width: 6, height: 6, borderRadius: 3, background: isSel ? 'rgba(255,255,255,0.7)' : T.warning }} />}
                    {hasTask  && <span style={{ width: 6, height: 6, borderRadius: 3, background: isSel ? 'rgba(255,255,255,0.7)' : T.success }} />}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </Card>
    );
  }

  return (
    <div style={{ flex: 1, overflow: 'auto', background: T.bg }}>
      <TopBar
        subtitle="근태"
        title="근무 관리"
        actions={<>
          {btnSecondary('출퇴근 기록', null, () => navigate('/admin/attendance-status'))}
          {btnPrimary('스케줄 등록', icons.plus, () => alert('스케줄 등록 기능은 준비 중입니다.'))}
        </>}
      />
      <div style={{ padding: 24 }}>
        <WeekBar />
        {viewMode === 'month' ? <MonthCal /> : <Timeline />}
      </div>
    </div>
  );
}
