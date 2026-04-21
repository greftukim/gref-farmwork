// TBM 안전점검 현황 — /admin/safety-checks
import React, { useMemo, useState } from 'react';
import { Avatar, Card, Dot, Icon, Pill, T, TopBar, icons } from '../../design/primitives';
import useSafetyCheckStore from '../../stores/safetyCheckStore';
import useEmployeeStore from '../../stores/employeeStore';

export default function SafetyChecksPage() {
  const checks = useSafetyCheckStore((s) => s.checks);
  const employees = useEmployeeStore((s) => s.employees);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const empMap = useMemo(() => Object.fromEntries(employees.map((e) => [e.id, e])), [employees]);
  const workers = useMemo(() => employees.filter((e) => e.role === 'worker' && e.isActive), [employees]);

  const dayChecks = useMemo(() => (checks || []).filter((c) => c.date === date), [checks, date]);
  const rows = useMemo(() => workers.map((w) => {
    const c = dayChecks.find((x) => x.employeeId === w.id);
    return { emp: w, check: c };
  }), [workers, dayChecks]);

  const done = rows.filter((r) => r.check).length;
  const issues = rows.filter((r) => r.check?.hasIssue).length;
  const rate = workers.length ? Math.round((done / workers.length) * 100) : 0;

  return (
    <div style={{ flex: 1, overflow: 'auto', background: T.bg, minWidth: 0 }}>
      <TopBar subtitle="안전 관리" title="TBM 안전점검 현황" />
      <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr 1fr 1fr', gap: 12 }}>
          <Card pad={20} style={{ position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: T.primary }} />
            <div style={{ fontSize: 12, color: T.muted, fontWeight: 600, marginBottom: 12 }}>오늘 점검 완료율</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
              <span style={{ fontSize: 44, fontWeight: 700, color: T.text, letterSpacing: -1.2, lineHeight: 1, fontFamily: 'ui-monospace,monospace' }}>{rate}</span>
              <span style={{ fontSize: 16, color: T.mutedSoft, fontWeight: 600 }}>%</span>
              <span style={{ marginLeft: 'auto', fontSize: 12, color: T.muted, fontWeight: 600 }}>{done} / {workers.length}명</span>
            </div>
            <div style={{ marginTop: 12, height: 8, background: T.bg, borderRadius: 4, overflow: 'hidden' }}>
              <div style={{ width: `${rate}%`, height: '100%', background: `linear-gradient(90deg, ${T.primary}, ${T.success})` }} />
            </div>
          </Card>
          {[
            { l: '점검 완료', v: done, tone: T.success },
            { l: '미점검', v: workers.length - done, tone: T.warning },
            { l: '이상 보고', v: issues, tone: T.danger },
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
        </Card>

        <Card pad={0}>
          <div style={{ padding: '14px 20px', borderBottom: `1px solid ${T.borderSoft}`, fontSize: 13, fontWeight: 700, color: T.text }}>점검 내역</div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: T.bg, textAlign: 'left', color: T.mutedSoft, fontSize: 11, fontWeight: 700, letterSpacing: 0.3 }}>
                <th style={{ padding: '10px 20px' }}>작업자</th>
                <th style={{ padding: '10px 12px' }}>점검 항목</th>
                <th style={{ padding: '10px 12px' }}>시각</th>
                <th style={{ padding: '10px 12px' }}>특이사항</th>
                <th style={{ padding: '10px 20px', textAlign: 'right' }}>상태</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ emp, check }, i) => (
                <tr key={emp.id} style={{ borderTop: i ? `1px solid ${T.borderSoft}` : 'none' }}>
                  <td style={{ padding: '12px 20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <Avatar name={emp.name} color="indigo" size={30} />
                      <div>
                        <div style={{ fontWeight: 600, color: T.text }}>{emp.name}</div>
                        <div style={{ fontSize: 10, color: T.mutedSoft }}>{emp.jobType}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '12px', color: T.muted }}>{check ? `${(check.items || []).length}개 항목` : '—'}</td>
                  <td style={{ padding: '12px', color: T.text, fontFamily: 'ui-monospace,monospace' }}>
                    {check?.submittedAt ? new Date(check.submittedAt).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }) : '—'}
                  </td>
                  <td style={{ padding: '12px', color: T.muted, maxWidth: 240, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{check?.note || '—'}</td>
                  <td style={{ padding: '12px 20px', textAlign: 'right' }}>
                    {check
                      ? check.hasIssue ? <Pill tone="danger"><Dot c={T.danger} />이상</Pill> : <Pill tone="success"><Dot c={T.success} />정상</Pill>
                      : <Pill tone="warning"><Dot c={T.warning} />미점검</Pill>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>
    </div>
  );
}
