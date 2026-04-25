// 이상신고/긴급연락 관리 — /admin/issue-call
import React, { useMemo, useState } from 'react';
import { Avatar, Card, Dot, Icon, Pill, T, TopBar, icons } from '../../design/primitives';
import useIssueStore from '../../stores/issueStore';
import useEmployeeStore from '../../stores/employeeStore';

const STATUS = {
  pending: { l: '미처리', tone: 'danger', c: T.danger },
  in_progress: { l: '처리중', tone: 'warning', c: T.warning },
  resolved: { l: '완료', tone: 'success', c: T.success },
};

const SEVERITY = {
  critical: { l: '긴급', c: T.danger, soft: T.dangerSoft },
  high: { l: '높음', c: T.warning, soft: T.warningSoft },
  normal: { l: '보통', c: T.info, soft: T.infoSoft },
};

const fmtAgo = (iso) => {
  if (!iso) return '';
  const m = Math.floor((Date.now() - new Date(iso)) / 60000);
  if (m < 60) return `${m}분 전`;
  if (m < 1440) return `${Math.floor(m / 60)}시간 전`;
  return `${Math.floor(m / 1440)}일 전`;
};

export default function IssueCallPage() {
  const issues = useIssueStore((s) => s.issues);
  const updateIssue = useIssueStore((s) => s.updateIssue);
  const employees = useEmployeeStore((s) => s.employees);
  const [filter, setFilter] = useState('pending');
  const empMap = useMemo(() => Object.fromEntries(employees.map((e) => [e.id, e])), [employees]);

  const counts = useMemo(() => {
    const c = { all: issues.length, pending: 0, in_progress: 0, resolved: 0, critical: 0 };
    issues.forEach((i) => { if (c[i.status] != null) c[i.status]++; if (i.severity === 'critical' && i.status !== 'resolved') c.critical++; });
    return c;
  }, [issues]);

  const filtered = useMemo(() => issues
    .filter((i) => filter === 'all' || i.status === filter)
    .sort((a, b) => {
      const prio = { pending: 0, in_progress: 1, resolved: 2 };
      if (prio[a.status] !== prio[b.status]) return prio[a.status] - prio[b.status];
      return (b.createdAt || '').localeCompare(a.createdAt || '');
    }), [issues, filter]);

  return (
    <div style={{ flex: 1, overflow: 'auto', background: T.bg, minWidth: 0 }}>
      <TopBar subtitle="안전 관리" title="이상신고·긴급연락" actions={
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 12, color: T.mutedSoft }}>실시간 반영</span>
          <Dot c={T.success} />
        </div>
      } />
      <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
          {[
            { l: '긴급 미처리', v: counts.critical, tone: T.danger, soft: T.dangerSoft },
            { l: '미처리', v: counts.pending, tone: T.warning, soft: T.warningSoft },
            { l: '처리중', v: counts.in_progress, tone: T.info, soft: T.infoSoft },
            { l: '완료', v: counts.resolved, tone: T.success, soft: T.successSoft },
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
          <div style={{ padding: '14px 18px', borderBottom: `1px solid ${T.borderSoft}`, display: 'flex', gap: 4, background: T.bg }}>
            {[['pending', '미처리'], ['in_progress', '처리중'], ['resolved', '완료'], ['all', '전체']].map(([v, l]) => {
              const on = filter === v;
              return <span key={v} onClick={() => setFilter(v)} style={{
                padding: '6px 12px', borderRadius: 5, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                background: on ? T.surface : 'transparent', color: on ? T.text : T.mutedSoft,
                boxShadow: on ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
              }}>{l}</span>;
            })}
          </div>
          {filtered.length === 0 ? (
            <div style={{ padding: 60, textAlign: 'center', color: T.mutedSoft, fontSize: 13 }}>신고 내역이 없습니다</div>
          ) : filtered.map((it, i) => {
            const emp = empMap[it.workerId];
            const sv = SEVERITY[it.severity] || SEVERITY.normal;
            const st = STATUS[it.status] || STATUS.pending;
            return (
              <div key={it.id} style={{
                padding: '16px 20px',
                borderTop: i ? `1px solid ${T.borderSoft}` : 'none',
                borderLeft: it.severity === 'critical' ? `3px solid ${T.danger}` : '3px solid transparent',
                background: it.severity === 'critical' && it.status !== 'resolved' ? 'rgba(220,38,38,0.03)' : T.surface,
                display: 'flex', alignItems: 'flex-start', gap: 14,
              }}>
                <Avatar name={emp?.name || '?'} color={it.severity === 'critical' ? 'rose' : 'indigo'} size={36} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 4, background: sv.soft, color: sv.c }}>{sv.l}</span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: T.text }}>{emp?.name || '익명'}</span>
                    <span style={{ fontSize: 11, color: T.mutedSoft }}>· {it.category || '기타'}</span>
                    <span style={{ fontSize: 11, color: T.mutedSoft, marginLeft: 'auto' }}>{fmtAgo(it.createdAt)}</span>
                  </div>
                  <div style={{ fontSize: 13, color: T.muted, lineHeight: 1.5 }}>{it.comment}</div>
                  {it.location && <div style={{ fontSize: 11, color: T.mutedSoft, marginTop: 6, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    <Icon d={icons.location} size={11} c={T.mutedSoft} sw={2} />{it.location}
                  </div>}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
                  <Pill tone={st.tone}><Dot c={st.c} />{st.l}</Pill>
                  {it.status !== 'resolved' && (
                    <div style={{ display: 'flex', gap: 6 }}>
                      {it.status === 'pending' && <button onClick={() => updateIssue?.(it.id, { status: 'in_progress' })}
                        style={{ height: 28, padding: '0 10px', borderRadius: 6, border: `1px solid ${T.border}`, background: T.surface, color: T.primary, fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>처리 시작</button>}
                      <button onClick={() => updateIssue?.(it.id, { status: 'resolved', resolvedAt: new Date().toISOString() })}
                        style={{ height: 28, padding: '0 10px', borderRadius: 6, border: 0, background: T.success, color: '#fff', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>완료</button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </Card>
      </div>
    </div>
  );
}
