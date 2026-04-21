// 휴가 현황 (인사팀) — /admin/leave-status
import React, { useMemo, useState } from 'react';
import { Avatar, Card, Dot, Icon, Pill, T, TopBar, icons } from '../../design/primitives';
import useLeaveStore from '../../stores/leaveStore';
import useEmployeeStore from '../../stores/employeeStore';

const STATUS = {
  pending: { l: '대기', tone: 'warning' },
  approved: { l: '승인', tone: 'success' },
  rejected: { l: '반려', tone: 'danger' },
};

export default function LeaveStatusPage() {
  const requests = useLeaveStore((s) => s.requests);
  const employees = useEmployeeStore((s) => s.employees);
  const empMap = useMemo(() => Object.fromEntries(employees.map((e) => [e.id, e])), [employees]);
  const [q, setQ] = useState('');

  const year = new Date().getFullYear();
  const approved = useMemo(() => (requests || []).filter((r) => r.status === 'approved' && (r.date || '').startsWith(String(year))), [requests, year]);

  const perEmp = useMemo(() => {
    const m = {};
    employees.filter((e) => e.role === 'worker').forEach((e) => {
      m[e.id] = { emp: e, used: 0, pending: 0 };
    });
    approved.forEach((r) => { if (m[r.employeeId]) m[r.employeeId].used += 1; });
    (requests || []).filter((r) => r.status === 'pending').forEach((r) => { if (m[r.employeeId]) m[r.employeeId].pending += 1; });
    return Object.values(m).filter((x) => !q.trim() || x.emp.name.includes(q.trim())).sort((a, b) => b.used - a.used);
  }, [employees, approved, requests, q]);

  return (
    <div style={{ flex: 1, overflow: 'auto', background: T.bg, minWidth: 0 }}>
      <TopBar subtitle="인사 관리" title={`${year}년 휴가 사용 현황`} />
      <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
          {[
            { l: '총 사용', v: approved.length, tone: T.success },
            { l: '대기', v: (requests || []).filter((r) => r.status === 'pending').length, tone: T.warning },
            { l: '대상 인원', v: perEmp.length, tone: T.primary },
          ].map((k, i) => (
            <Card key={i} pad={18} style={{ position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: k.tone }} />
              <div style={{ fontSize: 12, color: T.muted, fontWeight: 600, marginBottom: 14 }}>{k.l}</div>
              <div style={{ fontSize: 36, fontWeight: 700, color: T.text, letterSpacing: -1, lineHeight: 1 }}>{k.v}</div>
              <div style={{ fontSize: 11, color: T.mutedSoft, marginTop: 8 }}>건</div>
            </Card>
          ))}
        </div>

        <Card pad={0}>
          <div style={{ padding: '14px 20px', borderBottom: `1px solid ${T.borderSoft}`, display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: T.text }}>직원별 현황 ({perEmp.length})</div>
            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6, padding: '7px 10px', background: T.bg, border: `1px solid ${T.border}`, borderRadius: 7, maxWidth: 240 }}>
              <Icon d={icons.search} size={14} c={T.mutedSoft} />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="이름 검색" style={{ border: 0, background: 'transparent', outline: 'none', flex: 1, fontSize: 13 }} />
            </div>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: T.bg, textAlign: 'left', color: T.mutedSoft, fontSize: 11, fontWeight: 700, letterSpacing: 0.3 }}>
                <th style={{ padding: '10px 20px' }}>직원</th>
                <th style={{ padding: '10px 12px' }}>직군</th>
                <th style={{ padding: '10px 12px', textAlign: 'right' }}>사용</th>
                <th style={{ padding: '10px 12px', textAlign: 'right' }}>대기</th>
                <th style={{ padding: '10px 20px', textAlign: 'right' }}>잔여</th>
              </tr>
            </thead>
            <tbody>
              {perEmp.map((r, i) => {
                const annual = r.emp.annualLeave || 15;
                const remain = Math.max(0, annual - r.used);
                return (
                  <tr key={r.emp.id} style={{ borderTop: i ? `1px solid ${T.borderSoft}` : 'none' }}>
                    <td style={{ padding: '12px 20px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <Avatar name={r.emp.name} color="indigo" size={30} />
                        <span style={{ fontWeight: 600, color: T.text }}>{r.emp.name}</span>
                      </div>
                    </td>
                    <td style={{ padding: '12px', color: T.muted }}>{r.emp.jobType || '—'}</td>
                    <td style={{ padding: '12px', textAlign: 'right', fontFamily: 'ui-monospace,monospace', fontWeight: 700, color: T.text }}>{r.used}일</td>
                    <td style={{ padding: '12px', textAlign: 'right' }}>{r.pending > 0 ? <Pill tone="warning">{r.pending}</Pill> : <span style={{ color: T.mutedSoft }}>—</span>}</td>
                    <td style={{ padding: '12px 20px', textAlign: 'right', fontFamily: 'ui-monospace,monospace', fontWeight: 700, color: remain > 0 ? T.success : T.danger }}>{remain}일</td>
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
