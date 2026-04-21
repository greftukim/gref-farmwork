// 일용직/시급제 근무 로그 — /admin/daily-work-logs
import React, { useMemo, useState } from 'react';
import { Avatar, Card, Icon, Pill, T, TopBar, icons } from '../../design/primitives';
import useDailyWorkLogStore from '../../stores/dailyWorkLogStore';
import useEmployeeStore from '../../stores/employeeStore';

const fmtHM = (min) => `${Math.floor(min / 60)}시간 ${min % 60}분`;

export default function DailyWorkLogsPage() {
  const logs = useDailyWorkLogStore((s) => s.logs);
  const employees = useEmployeeStore((s) => s.employees);

  const today = new Date().toISOString().split('T')[0];
  const first = today.slice(0, 8) + '01';
  const [from, setFrom] = useState(first);
  const [to, setTo] = useState(today);
  const [empFilter, setEmpFilter] = useState('all');
  const [q, setQ] = useState('');

  const empMap = useMemo(() => Object.fromEntries(employees.map((e) => [e.id, e])), [employees]);
  const dayWorkers = useMemo(() => employees.filter((e) => e.employmentType === 'daily' || e.employmentType === 'hourly'), [employees]);

  const filtered = useMemo(() => {
    const s = q.trim();
    return (logs || []).filter((r) =>
      r.date >= from && r.date <= to &&
      (empFilter === 'all' || r.employeeId === empFilter) &&
      (!s || (empMap[r.employeeId]?.name || '').includes(s))
    ).sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  }, [logs, from, to, empFilter, q, empMap]);

  const stats = useMemo(() => {
    let minutes = 0, pay = 0;
    filtered.forEach((r) => { minutes += r.minutes || 0; pay += r.pay || 0; });
    return { total: filtered.length, minutes, pay };
  }, [filtered]);

  return (
    <div style={{ flex: 1, overflow: 'auto', background: T.bg, minWidth: 0 }}>
      <TopBar subtitle="근태 관리" title="일용직·시급제 근무 로그" />
      <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
          {[
            { l: '총 기록', v: stats.total, sub: '건', tone: T.primary },
            { l: '총 근무', v: Math.floor(stats.minutes / 60), unit: 'h', sub: `${stats.minutes % 60}분`, tone: T.info },
            { l: '총 지급액', v: stats.pay.toLocaleString(), sub: '원', tone: T.success },
          ].map((k, i) => (
            <Card key={i} pad={18} style={{ position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: k.tone }} />
              <div style={{ fontSize: 12, color: T.muted, fontWeight: 600, marginBottom: 14 }}>{k.l}</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                <span style={{ fontSize: 32, fontWeight: 700, color: T.text, letterSpacing: -0.8, lineHeight: 1, fontFamily: 'ui-monospace,monospace' }}>{k.v}</span>
                {k.unit && <span style={{ fontSize: 14, color: T.mutedSoft, fontWeight: 500 }}>{k.unit}</span>}
              </div>
              <div style={{ fontSize: 11, color: T.mutedSoft, marginTop: 8 }}>{k.sub}</div>
            </Card>
          ))}
        </div>

        <Card pad={14} style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} style={{ height: 34, padding: '0 10px', border: `1px solid ${T.border}`, borderRadius: 7, fontSize: 12 }} />
          <span style={{ color: T.mutedSoft }}>~</span>
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} style={{ height: 34, padding: '0 10px', border: `1px solid ${T.border}`, borderRadius: 7, fontSize: 12 }} />
          <select value={empFilter} onChange={(e) => setEmpFilter(e.target.value)} style={{ height: 34, padding: '0 10px', border: `1px solid ${T.border}`, borderRadius: 7, fontSize: 12, minWidth: 140 }}>
            <option value="all">전체 인원</option>
            {dayWorkers.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
          </select>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 10px', background: T.bg, border: `1px solid ${T.border}`, borderRadius: 7, flex: 1, maxWidth: 260, marginLeft: 'auto' }}>
            <Icon d={icons.search} size={14} c={T.mutedSoft} />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="이름 검색" style={{ border: 0, background: 'transparent', outline: 'none', flex: 1, fontSize: 13 }} />
          </div>
        </Card>

        <Card pad={0}>
          <div style={{ padding: '14px 20px', borderBottom: `1px solid ${T.borderSoft}`, fontSize: 13, fontWeight: 700, color: T.text }}>근무 기록 ({filtered.length})</div>
          {filtered.length === 0 ? (
            <div style={{ padding: 60, textAlign: 'center', color: T.mutedSoft, fontSize: 13 }}>기록이 없습니다</div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: T.bg, textAlign: 'left', color: T.mutedSoft, fontSize: 11, fontWeight: 700, letterSpacing: 0.3 }}>
                  <th style={{ padding: '10px 20px' }}>날짜</th>
                  <th style={{ padding: '10px 12px' }}>작업자</th>
                  <th style={{ padding: '10px 12px' }}>유형</th>
                  <th style={{ padding: '10px 12px' }}>작업 시간</th>
                  <th style={{ padding: '10px 12px', textAlign: 'right' }}>지급액</th>
                  <th style={{ padding: '10px 20px', textAlign: 'right' }}>비고</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r, i) => {
                  const emp = empMap[r.employeeId];
                  return (
                    <tr key={r.id || i} style={{ borderTop: i ? `1px solid ${T.borderSoft}` : 'none' }}>
                      <td style={{ padding: '12px 20px', color: T.text, fontWeight: 600, fontFamily: 'ui-monospace,monospace' }}>{r.date}</td>
                      <td style={{ padding: '12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <Avatar name={emp?.name || '?'} color="indigo" size={28} />
                          <span style={{ fontWeight: 600, color: T.text }}>{emp?.name || '—'}</span>
                        </div>
                      </td>
                      <td style={{ padding: '12px' }}>
                        <Pill tone={emp?.employmentType === 'daily' ? 'primary' : 'info'}>{emp?.employmentType === 'daily' ? '일용직' : '시급제'}</Pill>
                      </td>
                      <td style={{ padding: '12px', color: T.text, fontFamily: 'ui-monospace,monospace' }}>{fmtHM(r.minutes || 0)}</td>
                      <td style={{ padding: '12px', textAlign: 'right', fontFamily: 'ui-monospace,monospace', fontWeight: 700, color: T.text }}>{(r.pay || 0).toLocaleString()}원</td>
                      <td style={{ padding: '12px 20px', textAlign: 'right', color: T.mutedSoft, fontSize: 11 }}>{r.note || ''}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </Card>
      </div>
    </div>
  );
}
