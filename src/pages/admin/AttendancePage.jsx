// 출퇴근 관리 — /admin/attendance
import React, { useMemo, useState } from 'react';
import { Avatar, Card, Dot, Icon, Pill, T, TopBar, icons } from '../../design/primitives';
import useAttendanceStore from '../../stores/attendanceStore';
import useEmployeeStore from '../../stores/employeeStore';

const fmtTime = (iso) => iso ? new Date(iso).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false }) : '—';

export default function AttendancePage() {
  const records = useAttendanceStore((s) => s.records);
  const employees = useEmployeeStore((s) => s.employees);
  const today = new Date().toISOString().split('T')[0];
  const [date, setDate] = useState(today);
  const empMap = useMemo(() => Object.fromEntries(employees.map((e) => [e.id, e])), [employees]);
  const workers = useMemo(() => employees.filter((e) => e.role === 'worker' && e.isActive), [employees]);

  const rows = useMemo(() => workers.map((w) => {
    const r = (records || []).find((x) => x.employeeId === w.id && x.date === date);
    return { emp: w, rec: r };
  }), [workers, records, date]);

  const c = { in: 0, late: 0, absent: 0, out: 0 };
  rows.forEach(({ rec }) => {
    if (!rec || !rec.checkIn) c.absent++;
    else {
      if (rec.status === 'late') c.late++; else c.in++;
      if (rec.checkOut) c.out++;
    }
  });

  return (
    <div style={{ flex: 1, overflow: 'auto', background: T.bg, minWidth: 0 }}>
      <TopBar subtitle="근태 관리" title="출퇴근 관리" />
      <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
          {[
            { l: '정상 출근', v: c.in, tone: T.success },
            { l: '지각', v: c.late, tone: T.warning },
            { l: '결근', v: c.absent, tone: T.danger },
            { l: '퇴근 완료', v: c.out, tone: T.info },
          ].map((k, i) => (
            <Card key={i} pad={18} style={{ position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: k.tone }} />
              <div style={{ fontSize: 12, color: T.muted, fontWeight: 600, marginBottom: 14 }}>{k.l}</div>
              <div style={{ fontSize: 36, fontWeight: 700, color: T.text, letterSpacing: -1, lineHeight: 1 }}>{k.v}</div>
              <div style={{ fontSize: 11, color: T.mutedSoft, marginTop: 8 }}>명</div>
            </Card>
          ))}
        </div>

        <Card pad={14} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Icon d={icons.calendar} size={14} c={T.mutedSoft} />
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
            style={{ height: 34, padding: '0 10px', border: `1px solid ${T.border}`, borderRadius: 7, fontSize: 13 }} />
          <span style={{ fontSize: 12, color: T.mutedSoft, marginLeft: 'auto' }}>총 {workers.length}명</span>
        </Card>

        <Card pad={0}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: T.bg, textAlign: 'left', color: T.mutedSoft, fontSize: 11, fontWeight: 700, letterSpacing: 0.3 }}>
                <th style={{ padding: '10px 20px' }}>직원</th>
                <th style={{ padding: '10px 12px' }}>직군</th>
                <th style={{ padding: '10px 12px' }}>출근</th>
                <th style={{ padding: '10px 12px' }}>퇴근</th>
                <th style={{ padding: '10px 12px' }}>근무 시간</th>
                <th style={{ padding: '10px 20px', textAlign: 'right' }}>상태</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ emp, rec }, i) => {
                const minutes = rec?.checkIn && rec?.checkOut ? Math.round((new Date(rec.checkOut) - new Date(rec.checkIn)) / 60000) : 0;
                return (
                  <tr key={emp.id} style={{ borderTop: i ? `1px solid ${T.borderSoft}` : 'none' }}>
                    <td style={{ padding: '12px 20px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <Avatar name={emp.name} color="indigo" size={30} />
                        <span style={{ fontWeight: 600, color: T.text }}>{emp.name}</span>
                      </div>
                    </td>
                    <td style={{ padding: '12px', color: T.muted }}>{emp.jobType || '—'}</td>
                    <td style={{ padding: '12px', color: T.text, fontFamily: 'ui-monospace,monospace' }}>{fmtTime(rec?.checkIn)}</td>
                    <td style={{ padding: '12px', color: T.text, fontFamily: 'ui-monospace,monospace' }}>{fmtTime(rec?.checkOut)}</td>
                    <td style={{ padding: '12px', color: T.muted, fontFamily: 'ui-monospace,monospace' }}>
                      {minutes ? `${Math.floor(minutes / 60)}h ${minutes % 60}m` : '—'}
                    </td>
                    <td style={{ padding: '12px 20px', textAlign: 'right' }}>
                      {!rec || !rec.checkIn ? <Pill tone="danger"><Dot c={T.danger} />결근</Pill>
                        : rec.status === 'late' ? <Pill tone="warning"><Dot c={T.warning} />지각</Pill>
                        : rec.checkOut ? <Pill tone="info"><Dot c={T.info} />퇴근</Pill>
                        : <Pill tone="success"><Dot c={T.success} />근무중</Pill>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      </div>
    </div>
  );
}
