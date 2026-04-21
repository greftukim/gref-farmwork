// 휴가 관리 (공용) — /admin/leave
import React, { useMemo, useState } from 'react';
import { Avatar, Card, Dot, Icon, Pill, T, TopBar, icons } from '../../design/primitives';
import useLeaveStore from '../../stores/leaveStore';
import useEmployeeStore from '../../stores/employeeStore';

const STATUS = {
  pending: { l: '대기', tone: 'warning' },
  approved: { l: '승인', tone: 'success' },
  rejected: { l: '반려', tone: 'danger' },
};

const TYPES = { annual: '연차', sick: '병가', personal: '개인', family: '경조사' };

export default function LeavePage() {
  const requests = useLeaveStore((s) => s.requests);
  const approveRequest = useLeaveStore((s) => s.approveRequest);
  const rejectRequest = useLeaveStore((s) => s.rejectRequest);
  const employees = useEmployeeStore((s) => s.employees);

  const [filter, setFilter] = useState('pending');
  const [q, setQ] = useState('');
  const empMap = useMemo(() => Object.fromEntries(employees.map((e) => [e.id, e])), [employees]);

  const filtered = useMemo(() => {
    const s = q.trim();
    return (requests || [])
      .filter((r) => filter === 'all' || r.status === filter)
      .filter((r) => !s || (empMap[r.employeeId]?.name || '').includes(s))
      .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
  }, [requests, filter, q, empMap]);

  const counts = useMemo(() => ({
    pending: (requests || []).filter((r) => r.status === 'pending').length,
    approved: (requests || []).filter((r) => r.status === 'approved').length,
    rejected: (requests || []).filter((r) => r.status === 'rejected').length,
    all: requests?.length || 0,
  }), [requests]);

  return (
    <div style={{ flex: 1, overflow: 'auto', background: T.bg, minWidth: 0 }}>
      <TopBar subtitle="인사 관리" title="휴가 신청 관리" />
      <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
          {[
            { l: '대기', v: counts.pending, tone: T.warning },
            { l: '승인', v: counts.approved, tone: T.success },
            { l: '반려', v: counts.rejected, tone: T.danger },
            { l: '전체', v: counts.all, tone: T.primary },
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
          <div style={{ padding: '12px 18px', borderBottom: `1px solid ${T.borderSoft}`, display: 'flex', alignItems: 'center', gap: 10, background: T.bg }}>
            <div style={{ display: 'flex', gap: 4, padding: 3, background: T.surface, borderRadius: 8, border: `1px solid ${T.border}` }}>
              {[['pending', '대기'], ['approved', '승인'], ['rejected', '반려'], ['all', '전체']].map(([v, l]) => {
                const on = filter === v;
                return <span key={v} onClick={() => setFilter(v)} style={{ padding: '6px 12px', borderRadius: 5, fontSize: 12, fontWeight: 600, cursor: 'pointer', background: on ? T.text : 'transparent', color: on ? T.surface : T.mutedSoft }}>{l}</span>;
              })}
            </div>
            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6, padding: '7px 10px', background: T.surface, border: `1px solid ${T.border}`, borderRadius: 7, maxWidth: 240 }}>
              <Icon d={icons.search} size={14} c={T.mutedSoft} />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="이름 검색" style={{ border: 0, background: 'transparent', outline: 'none', flex: 1, fontSize: 13 }} />
            </div>
          </div>

          {filtered.length === 0 ? (
            <div style={{ padding: 60, textAlign: 'center', color: T.mutedSoft, fontSize: 13 }}>신청 내역이 없습니다</div>
          ) : filtered.map((r, i) => {
            const emp = empMap[r.employeeId];
            const st = STATUS[r.status] || STATUS.pending;
            return (
              <div key={r.id} style={{
                padding: '14px 20px', borderTop: i ? `1px solid ${T.borderSoft}` : 'none',
                background: r.status === 'pending' ? 'rgba(245,158,11,0.03)' : T.surface,
                display: 'flex', alignItems: 'flex-start', gap: 14,
              }}>
                <Avatar name={emp?.name || '?'} color="indigo" size={34} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: T.text }}>{emp?.name || '—'}</span>
                    <Pill tone="info">{TYPES[r.type] || r.type}</Pill>
                    <Pill tone={st.tone}>{st.l}</Pill>
                    <span style={{ marginLeft: 'auto', fontSize: 11, color: T.mutedSoft, fontFamily: 'ui-monospace,monospace' }}>{r.date} · {r.days}일</span>
                  </div>
                  <div style={{ fontSize: 12, color: T.muted, lineHeight: 1.5 }}>{r.reason}</div>
                </div>
                {r.status === 'pending' && (
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button onClick={() => rejectRequest?.(r.id)}
                      style={{ height: 30, padding: '0 12px', borderRadius: 6, border: `1px solid ${T.border}`, background: T.surface, color: T.danger, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>반려</button>
                    <button onClick={() => approveRequest?.(r.id)}
                      style={{ height: 30, padding: '0 12px', borderRadius: 6, border: 0, background: T.success, color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>승인</button>
                  </div>
                )}
              </div>
            );
          })}
        </Card>
      </div>
    </div>
  );
}
