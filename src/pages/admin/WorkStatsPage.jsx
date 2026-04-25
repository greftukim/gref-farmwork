// 근무 통계 — /admin/work-stats
import React, { useMemo, useState } from 'react';
import { Avatar, Card, Icon, T, TopBar, icons } from '../../design/primitives';
import useAttendanceStore from '../../stores/attendanceStore';
import useEmployeeStore from '../../stores/employeeStore';

export default function WorkStatsPage() {
  const records = useAttendanceStore((s) => s.records);
  const employees = useEmployeeStore((s) => s.employees);
  const today = new Date().toISOString().split('T')[0];
  const first = today.slice(0, 8) + '01';
  const [from, setFrom] = useState(first);
  const [to, setTo] = useState(today);

  const empMap = useMemo(() => Object.fromEntries(employees.map((e) => [e.id, e])), [employees]);
  const workers = useMemo(() => employees.filter((e) => e.role === 'worker' && e.isActive), [employees]);

  const perWorker = useMemo(() => {
    return workers.map((w) => {
      const recs = (records || []).filter((r) => r.employeeId === w.id && r.date >= from && r.date <= to);
      let minutes = 0, late = 0;
      recs.forEach((r) => {
        if (r.checkIn && r.checkOut) minutes += Math.round((new Date(r.checkOut) - new Date(r.checkIn)) / 60000);
        if (r.status === 'late') late++;
      });
      return { emp: w, days: recs.filter((r) => r.checkIn).length, minutes, late };
    }).sort((a, b) => b.minutes - a.minutes);
  }, [workers, records, from, to]);

  const totalMin = perWorker.reduce((s, r) => s + r.minutes, 0);
  const totalDays = perWorker.reduce((s, r) => s + r.days, 0);
  const topMin = perWorker[0]?.minutes || 1;

  return (
    <div style={{ flex: 1, overflow: 'auto', background: T.bg, minWidth: 0 }}>
      <TopBar subtitle="분석" title="근무 통계" />
      <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
          {[
            { l: '총 근무 시간', v: Math.floor(totalMin / 60), unit: 'h', sub: `${totalMin % 60}분`, tone: T.primary },
            { l: '총 출근 일수', v: totalDays, unit: '일', sub: '누적', tone: T.success },
            { l: '평가 인원', v: perWorker.length, unit: '명', sub: '활성', tone: T.info },
          ].map((k, i) => (
            <Card key={i} pad={18} style={{ position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: k.tone }} />
              <div style={{ fontSize: 12, color: T.muted, fontWeight: 600, marginBottom: 14 }}>{k.l}</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                <span style={{ fontSize: 36, fontWeight: 700, color: T.text, letterSpacing: -1, lineHeight: 1, fontFamily: 'ui-monospace,monospace' }}>{k.v}</span>
                <span style={{ fontSize: 14, color: T.mutedSoft, fontWeight: 500 }}>{k.unit}</span>
              </div>
              <div style={{ fontSize: 11, color: T.mutedSoft, marginTop: 8 }}>{k.sub}</div>
            </Card>
          ))}
        </div>

        <Card pad={14} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: T.muted }}>기간</span>
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)}
            style={{ height: 34, padding: '0 10px', border: `1px solid ${T.border}`, borderRadius: 7, fontSize: 13 }} />
          <span style={{ color: T.mutedSoft }}>~</span>
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)}
            style={{ height: 34, padding: '0 10px', border: `1px solid ${T.border}`, borderRadius: 7, fontSize: 13 }} />
        </Card>

        <Card pad={0}>
          <div style={{ padding: '14px 20px', borderBottom: `1px solid ${T.borderSoft}`, fontSize: 13, fontWeight: 700, color: T.text }}>직원별 근무 시간</div>
          {perWorker.map((r, i) => {
            const pct = topMin ? Math.round((r.minutes / topMin) * 100) : 0;
            return (
              <div key={r.emp.id} style={{
                padding: '12px 20px', borderTop: i ? `1px solid ${T.borderSoft}` : 'none',
                display: 'grid', gridTemplateColumns: '1.5fr 2fr 100px 80px', gap: 14, alignItems: 'center',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <Avatar name={r.emp.name} color="indigo" size={30} />
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: T.text }}>{r.emp.name}</div>
                    <div style={{ fontSize: 10, color: T.mutedSoft }}>{r.emp.jobType}</div>
                  </div>
                </div>
                <div>
                  <div style={{ height: 6, background: T.bg, borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{ width: `${pct}%`, height: '100%', background: T.primary }} />
                  </div>
                </div>
                <div style={{ fontSize: 13, fontWeight: 700, color: T.text, fontFamily: 'ui-monospace,monospace' }}>
                  {Math.floor(r.minutes / 60)}h {r.minutes % 60}m
                </div>
                <div style={{ fontSize: 11, color: T.mutedSoft, textAlign: 'right' }}>
                  {r.days}일 / 지각 {r.late}
                </div>
              </div>
            );
          })}
        </Card>
      </div>
    </div>
  );
}
