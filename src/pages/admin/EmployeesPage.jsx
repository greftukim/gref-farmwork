// 직원 관리 — /admin/employees
import React, { useMemo, useState } from 'react';
import { Avatar, Card, Dot, Icon, Pill, T, TopBar, btnPrimary, btnSecondary, icons } from '../../design/primitives';
import useEmployeeStore from '../../stores/employeeStore';

const JOB_FILTER = {
  '전체': () => true,
  '재배': (e) => e.role === 'worker',
  '관리': (e) => e.role !== 'worker',
  '기타': () => false,
};

const PAGE_SIZE = 8;

export default function EmployeesPage() {
  const employees = useEmployeeStore((s) => s.employees);
  const addEmployee = useEmployeeStore((s) => s.addEmployee);
  const updateEmployee = useEmployeeStore((s) => s.updateEmployee);

  const [q, setQ] = useState('');
  const [jobFilter, setJobFilter] = useState('전체');
  const [page, setPage] = useState(0);
  const [showAdd, setShowAdd] = useState(false);
  const [draft, setDraft] = useState({ name: '', role: 'worker', jobType: '', employmentType: 'regular', phone: '' });

  const filtered = useMemo(() => {
    const s = q.trim();
    const fn = JOB_FILTER[jobFilter] || (() => true);
    return employees.filter((e) => fn(e) && (!s || e.name.includes(s) || (e.jobType || '').includes(s)));
  }, [employees, q, jobFilter]);

  const paginated = useMemo(() => filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE), [filtered, page]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));

  const counts = useMemo(() => ({
    total: employees.length,
    active: employees.filter((e) => e.isActive).length,
    worker: employees.filter((e) => e.role === 'worker').length,
    admin: employees.filter((e) => e.role !== 'worker' && e.isActive).length,
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
        <div style={{ display: 'flex', gap: 8 }}>
          {btnSecondary('엑셀 내보내기')}
          {btnPrimary('직원 등록', icons.plus, () => setShowAdd(true))}
        </div>
      } />
      <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* KPI 카드 */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
          {[
            { l: '전체 직원', v: counts.total, sub: `작업자 ${counts.worker} · 관리 ${counts.admin}` },
            { l: '재직중', v: counts.active, sub: '출근 가능' },
            { l: '작업자', v: counts.worker, sub: '재배팀' },
            { l: '관리자', v: counts.admin, sub: '관리팀', tone: 'warning' },
          ].map((k, i) => (
            <Card key={i} pad={16}>
              <div style={{ fontSize: 12, color: T.muted, fontWeight: 600, marginBottom: 6 }}>{k.l}</div>
              <div style={{ fontSize: 30, fontWeight: 700, color: k.tone === 'warning' ? T.warning : T.text, letterSpacing: -0.8, lineHeight: 1 }}>
                {k.v}<span style={{ fontSize: 14, color: T.mutedSoft, fontWeight: 500, marginLeft: 4 }}>명</span>
              </div>
              <div style={{ fontSize: 11, color: T.mutedSoft, marginTop: 6 }}>{k.sub}</div>
            </Card>
          ))}
        </div>

        <Card pad={0}>
          {/* 툴바 */}
          <div style={{ padding: '14px 18px', borderBottom: `1px solid ${T.borderSoft}`, display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 10px', background: T.bg, border: `1px solid ${T.border}`, borderRadius: 7, width: 260 }}>
              <Icon d={icons.search} size={14} c={T.mutedSoft} />
              <input
                value={q}
                onChange={(e) => { setQ(e.target.value); setPage(0); }}
                placeholder="이름, 직군 검색"
                style={{ border: 0, background: 'transparent', outline: 'none', flex: 1, fontSize: 13, color: T.text }}
              />
            </div>
            {['전체', '재배', '관리', '기타'].map((t) => (
              <span key={t} onClick={() => { setJobFilter(t); setPage(0); }} style={{
                fontSize: 12, fontWeight: 600, padding: '6px 12px', borderRadius: 6, cursor: 'pointer',
                background: jobFilter === t ? T.primarySoft : 'transparent',
                color: jobFilter === t ? T.primaryText : T.muted,
              }}>{t}</span>
            ))}
          </div>

          {/* 테이블 */}
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: T.bg }}>
                {['직원', '직무', '입사일', '연락처', '상태', ''].map((h, i) => (
                  <th key={i} style={{ textAlign: i === 5 ? 'right' : 'left', padding: '10px 16px', fontSize: 11, fontWeight: 700, color: T.mutedSoft, letterSpacing: 0.3, borderBottom: `1px solid ${T.border}` }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paginated.map((e, i) => (
                <tr key={e.id} style={{ borderBottom: `1px solid ${T.borderSoft}` }}>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <Avatar name={e.name} size={32} c={['indigo', 'emerald', 'amber', 'slate', 'rose'][i % 5]} />
                      <div>
                        <div style={{ fontWeight: 700, color: T.text, display: 'flex', alignItems: 'center', gap: 6 }}>
                          {e.name}
                          {e.isTeamLeader && <Pill tone="primary">반장</Pill>}
                        </div>
                        <div style={{ fontSize: 11, color: T.mutedSoft, marginTop: 2 }}>
                          {e.role === 'worker' ? '작업자' : '관리자'}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '12px 16px', color: T.text }}>{e.jobType || '—'}</td>
                  <td style={{ padding: '12px 16px', color: T.muted, fontFamily: 'ui-monospace, monospace', fontSize: 12 }}>{e.joinedAt || '—'}</td>
                  <td style={{ padding: '12px 16px', color: T.muted, fontFamily: 'ui-monospace, monospace', fontSize: 12 }}>{e.phone || '—'}</td>
                  <td style={{ padding: '12px 16px' }}>
                    {e.isActive
                      ? <Pill tone="success"><Dot c={T.success} />재직중</Pill>
                      : <Pill tone="muted">비활성</Pill>}
                  </td>
                  <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                    <button
                      onClick={() => updateEmployee?.(e.id, { isActive: !e.isActive })}
                      style={{ height: 26, padding: '0 10px', borderRadius: 6, border: `1px solid ${T.border}`, background: T.surface, fontSize: 11, fontWeight: 600, color: T.muted, cursor: 'pointer' }}
                    >
                      {e.isActive ? '비활성화' : '활성화'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* 페이지네이션 */}
          <div style={{ padding: '12px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: T.mutedSoft, fontSize: 12 }}>
            <span>총 {filtered.length}명 중 {Math.min(page * PAGE_SIZE + 1, filtered.length)}–{Math.min((page + 1) * PAGE_SIZE, filtered.length)}명</span>
            <div style={{ display: 'flex', gap: 4 }}>
              <span onClick={() => setPage((p) => Math.max(0, p - 1))} style={{ padding: '5px 10px', borderRadius: 5, fontSize: 12, cursor: 'pointer', background: T.surface, color: T.muted, border: `1px solid ${T.border}` }}>이전</span>
              {Array.from({ length: totalPages }).map((_, i) => (
                <span key={i} onClick={() => setPage(i)} style={{
                  padding: '5px 10px', borderRadius: 5, fontSize: 12, cursor: 'pointer',
                  background: page === i ? T.primary : T.surface,
                  color: page === i ? '#fff' : T.muted,
                  border: `1px solid ${page === i ? T.primary : T.border}`,
                }}>{i + 1}</span>
              ))}
              <span onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))} style={{ padding: '5px 10px', borderRadius: 5, fontSize: 12, cursor: 'pointer', background: T.surface, color: T.muted, border: `1px solid ${T.border}` }}>다음</span>
            </div>
          </div>
        </Card>
      </div>

      {/* 직원 등록 모달 */}
      {showAdd && (
        <div onClick={() => setShowAdd(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
          <Card onClick={(e) => e.stopPropagation()} pad={24} style={{ width: 440, maxWidth: '90vw' }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: T.text, marginBottom: 14 }}>신규 직원 등록</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <input placeholder="이름" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} style={{ height: 36, padding: '0 12px', border: `1px solid ${T.border}`, borderRadius: 7, fontSize: 13 }} />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <select value={draft.role} onChange={(e) => setDraft({ ...draft, role: e.target.value })} style={{ height: 36, padding: '0 10px', border: `1px solid ${T.border}`, borderRadius: 7, fontSize: 13 }}>
                  <option value="worker">작업자</option>
                  <option value="admin">관리자</option>
                </select>
                <select value={draft.employmentType} onChange={(e) => setDraft({ ...draft, employmentType: e.target.value })} style={{ height: 36, padding: '0 10px', border: `1px solid ${T.border}`, borderRadius: 7, fontSize: 13 }}>
                  <option value="regular">정규직</option>
                  <option value="contract">계약직</option>
                  <option value="daily">일용직</option>
                  <option value="hourly">시급제</option>
                </select>
              </div>
              <input placeholder="직군" value={draft.jobType} onChange={(e) => setDraft({ ...draft, jobType: e.target.value })} style={{ height: 36, padding: '0 12px', border: `1px solid ${T.border}`, borderRadius: 7, fontSize: 13 }} />
              <input placeholder="연락처" value={draft.phone} onChange={(e) => setDraft({ ...draft, phone: e.target.value })} style={{ height: 36, padding: '0 12px', border: `1px solid ${T.border}`, borderRadius: 7, fontSize: 13 }} />
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
              <button onClick={() => setShowAdd(false)} style={{ flex: 1, height: 36, borderRadius: 7, border: `1px solid ${T.border}`, background: T.surface, color: T.muted, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>취소</button>
              <button onClick={handleAdd} style={{ flex: 1, height: 36, borderRadius: 7, border: 0, background: T.text, color: T.surface, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>등록</button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
