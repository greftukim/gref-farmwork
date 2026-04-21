// 근무 일정 — /admin/schedule
import React, { useMemo, useState } from 'react';
import { Avatar, Card, Icon, Pill, T, TopBar, icons } from '../../design/primitives';
import useScheduleStore from '../../stores/scheduleStore';
import useEmployeeStore from '../../stores/employeeStore';

const GROUPS = [
  { key: 'work', l: '오늘 근무자', c: T.primary },
  { key: 'off',  l: '휴무',       c: T.mutedSoft },
];

export default function SchedulePage() {
  const schedules = useScheduleStore((s) => s.schedules);
  const employees = useEmployeeStore((s) => s.employees);
  const today = new Date().toISOString().split('T')[0];
  const [date, setDate] = useState(today);

  const workers = useMemo(() => employees.filter((e) => e.role === 'worker'), [employees]);
  const daySched = useMemo(() => (schedules || []).filter((s) => s.date === date), [schedules, date]);

  const byGroup = useMemo(() => {
    const m = { work: [], off: [] };
    workers.forEach((w) => {
      const s = daySched.find((x) => x.employeeId === w.id);
      const shift = s?.shift || 'day';
      (shift === 'off' ? m.off : m.work).push(w);
    });
    return m;
  }, [workers, daySched]);

  return (
    <div style={{ flex: 1, overflow: 'auto', background: T.bg, minWidth: 0 }}>
      <TopBar subtitle="근태 관리" title="근무 일정" />
      <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
        <Card pad={14} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Icon d={icons.calendar} size={14} c={T.mutedSoft} />
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
            style={{ height: 34, padding: '0 10px', border: `1px solid ${T.border}`, borderRadius: 7, fontSize: 13 }} />
          <span style={{ fontSize: 12, color: T.mutedSoft }}>총 {workers.length}명</span>
        </Card>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
          {GROUPS.map(({ key, l, c }) => {
            const list = byGroup[key] || [];
            return (
              <Card key={key} pad={0} style={{ overflow: 'hidden' }}>
                <div style={{ padding: '14px 16px', borderBottom: `1px solid ${T.borderSoft}`, background: T.bg, borderTop: `3px solid ${c}` }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: T.text }}>{l}</span>
                    <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 999, background: c + '22', color: c }}>{list.length}명</span>
                  </div>
                </div>
                <div style={{ padding: 10, display: 'flex', flexDirection: 'column', gap: 6, minHeight: 240 }}>
                  {list.length === 0 ? (
                    <div style={{ padding: 30, textAlign: 'center', fontSize: 12, color: T.mutedSoft }}>배정 없음</div>
                  ) : list.map((w) => (
                    <div key={w.id} style={{ padding: '8px 10px', borderRadius: 7, background: T.bg, display: 'flex', alignItems: 'center', gap: 10 }}>
                      <Avatar name={w.name} color="indigo" size={28} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: T.text }}>{w.name}</div>
                        <div style={{ fontSize: 10, color: T.mutedSoft }}>{w.jobType || ''}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
