// 직원 관리 — /admin/employees
import React, { useMemo, useState } from 'react';
import { Avatar, Card, Dot, Icon, Pill, T, TopBar, icons } from '../../design/primitives';
import useEmployeeStore from '../../stores/employeeStore';

const EMPLOYMENT_TYPES = {
  regular: { l: '정규직', tone: 'success' },
  contract: { l: '계약직', tone: 'info' },
  daily: { l: '일용직', tone: 'warning' },
  hourly: { l: '시급제', tone: 'primary' },
};

export default function EmployeesPage() {
  const employees = useEmployeeStore((s) => s.employees);
  const addEmployee = useEmployeeStore((s) => s.addEmployee);
  const updateEmployee = useEmployeeStore((s) => s.updateEmployee);
  const removeEmployee = useEmployeeStore((s) => s.removeEmployee);

  const [q, setQ] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [showAdd, setShowAdd] = useState(false);
  const [draft, setDraft] = useState({ name: '', role: 'worker', jobType: '', employmentType: 'regular', phone: '' });

  const filtered = useMemo(() => {
    const s = q.trim();
    return employees.filter((e) =>
      (roleFilter === 'all' || e.role === roleFilter) &&
      (!s || e.name.includes(s) || (e.jobType || '').includes(s))
    );
  }, [employees, q, roleFilter]);

  const counts = useMemo(() => ({
    all: employees.length,
    admin: employees.filter((e) => e.role === 'admin' || e.role === 'hq_admin').length,
    worker: employees.filter((e) => e.role === 'worker').length,
    active: employees.filter((e) => e.isActive).length,
  }), [employees]);

  const handleAdd = () => {
    if (!draft.name.trim()) return;
    addEmployee?.({ ...draft, id: 'emp_' + Date.now(), isActive: true, joinedAt: new Date().toISOString().split('T')[0] });
    setDraft({ name: '', role: 'worker', jobType: '', employmentType: 'regular', phone: '' });
    setShowAdd(false);
  };

  return (
    <div style={{ flex: 1, overflow: 'auto', background: T.bg, minWidth: 0 }}>
      <TopBar subtitle="인사 관리" title="직원 관리" actions={
        <button onClick={() => setShowAdd(true)} style={{ height: 34, padding: '0 14px', borderRadius: 8, border: 0, background: T.text, color: T.surface, fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <Icon d={icons.plus} size={12} sw={2.4} />직원 추가
        </button>
      } />
      <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
          {[
            { l: '전체', v: counts.all, tone: T.primary },
            { l: '관리자', v: counts.admin, tone: T.info },
            { l: '작업자', v: counts.worker, tone: T.success },
            { l: '활성', v: counts.active, tone: T.warning },
          ].map((k, i) => (
            <Card key={i} pad={18} style={{ position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: k.tone }} />
              <div style={{ fontSize: 12, color: T.muted, fontWeight: 600, marginBottom: 14 }}>{k.l}</div>
              <div style={{ fontSize: 36, fontWeight: 700, color: T.text, letterSpacing: -1, lineHeight: 1 }}>{k.v}</div>
              <div style={{ fontSize: 11, color: T.mutedSoft, marginTop: 8 }}>명</div>
            </Card>
          ))}
        </div>

        <Card pad={14} style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: 4, padding: 3, background: T.bg, borderRadius: 8 }}>
            {[['all', '전체'], ['admin', '관리자'], ['worker', '작업자']].map(([v, l]) => {
              const on = roleFilter === v;
              return <span key={v} onClick={() => setRoleFilter(v)} style={{ padding: '6px 12px', borderRadius: 5, fontSize: 12, fontWeight: 600, cursor: 'pointer', background: on ? T.surface : 'transparent', color: on ? T.text : T.mutedSoft, boxShadow: on ? '0 1px 2px rgba(0,0,0,0.06)' : 'none' }}>{l}</span>;
            })}
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6, padding: '7px 10px', background: T.bg, border: `1px solid ${T.border}`, borderRadius: 7, maxWidth: 240 }}>
            <Icon d={icons.search} size={14} c={T.mutedSoft} />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="이름·직군 검색" style={{ border: 0, background: 'transparent', outline: 'none', flex: 1, fontSize: 13 }} />
          </div>
        </Card>

        <Card pad={0}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: T.bg, textAlign: 'left', color: T.mutedSoft, fontSize: 11, fontWeight: 700, letterSpacing: 0.3 }}>
                <th style={{ padding: '10px 20px' }}>이름</th>
                <th style={{ padding: '10px 12px' }}>역할</th>
                <th style={{ padding: '10px 12px' }}>직군</th>
                <th style={{ padding: '10px 12px' }}>고용형태</th>
                <th style={{ padding: '10px 12px' }}>연락처</th>
                <th style={{ padding: '10px 12px', textAlign: 'right' }}>상태</th>
                <th style={{ padding: '10px 20px', textAlign: 'right' }} />
              </tr>
            </thead>
            <tbody>
              {filtered.map((e, i) => {
                const ec = EMPLOYMENT_TYPES[e.employmentType] || EMPLOYMENT_TYPES.regular;
                return (
                  <tr key={e.id} style={{ borderTop: i ? `1px solid ${T.borderSoft}` : 'none' }}>
                    <td style={{ padding: '12px 20px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <Avatar name={e.name} color="indigo" size={30} />
                        <span style={{ fontWeight: 600, color: T.text }}>{e.name}</span>
                      </div>
                    </td>
                    <td style={{ padding: '12px' }}><Pill tone={e.role === 'worker' ? 'primary' : 'info'}>{e.role === 'worker' ? '작업자' : e.role === 'hq_admin' ? '본사' : '관리자'}</Pill></td>
                    <td style={{ padding: '12px', color: T.muted }}>{e.jobType || '—'}</td>
                    <td style={{ padding: '12px' }}><Pill tone={ec.tone}>{ec.l}</Pill></td>
                    <td style={{ padding: '12px', color: T.muted, fontFamily: 'ui-monospace,monospace' }}>{e.phone || '—'}</td>
                    <td style={{ padding: '12px', textAlign: 'right' }}>
                      {e.isActive ? <Pill tone="success"><Dot c={T.success} />활성</Pill> : <Pill tone="muted">비활성</Pill>}
                    </td>
                    <td style={{ padding: '12px 20px', textAlign: 'right' }}>
                      <button onClick={() => updateEmployee?.(e.id, { isActive: !e.isActive })}
                        style={{ height: 26, padding: '0 10px', borderRadius: 6, border: `1px solid ${T.border}`, background: T.surface, fontSize: 11, fontWeight: 600, color: T.muted, cursor: 'pointer' }}>
                        {e.isActive ? '비활성화' : '활성화'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      </div>

      {showAdd && (
        <div onClick={() => setShowAdd(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
          <Card onClick={(e) => e.stopPropagation()} pad={24} style={{ width: 440, maxWidth: '90vw' }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: T.text, marginBottom: 14 }}>신규 직원 추가</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <input placeholder="이름" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} style={{ height: 36, padding: '0 12px', border: `1px solid ${T.border}`, borderRadius: 7, fontSize: 13 }} />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <select value={draft.role} onChange={(e) => setDraft({ ...draft, role: e.target.value })} style={{ height: 36, padding: '0 10px', border: `1px solid ${T.border}`, borderRadius: 7, fontSize: 13 }}>
                  <option value="worker">작업자</option>
                  <option value="admin">관리자</option>
                </select>
                <select value={draft.employmentType} onChange={(e) => setDraft({ ...draft, employmentType: e.target.value })} style={{ height: 36, padding: '0 10px', border: `1px solid ${T.border}`, borderRadius: 7, fontSize: 13 }}>
                  {Object.entries(EMPLOYMENT_TYPES).map(([v, { l }]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </div>
              <input placeholder="직군" value={draft.jobType} onChange={(e) => setDraft({ ...draft, jobType: e.target.value })} style={{ height: 36, padding: '0 12px', border: `1px solid ${T.border}`, borderRadius: 7, fontSize: 13 }} />
              <input placeholder="연락처" value={draft.phone} onChange={(e) => setDraft({ ...draft, phone: e.target.value })} style={{ height: 36, padding: '0 12px', border: `1px solid ${T.border}`, borderRadius: 7, fontSize: 13 }} />
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
              <button onClick={() => setShowAdd(false)} style={{ flex: 1, height: 36, borderRadius: 7, border: `1px solid ${T.border}`, background: T.surface, color: T.muted, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>취소</button>
              <button onClick={handleAdd} style={{ flex: 1, height: 36, borderRadius: 7, border: 0, background: T.text, color: T.surface, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>추가</button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
