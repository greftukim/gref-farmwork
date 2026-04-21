// 일일 보고 — /admin/daily-report
import React, { useMemo, useState } from 'react';
import { Avatar, Card, Dot, Icon, Pill, T, TopBar, icons } from '../../design/primitives';
import useDailyReportStore from '../../stores/dailyReportStore';
import useEmployeeStore from '../../stores/employeeStore';

export default function DailyReportPage() {
  const reports = useDailyReportStore((s) => s.reports);
  const employees = useEmployeeStore((s) => s.employees);

  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [selected, setSelected] = useState(null);

  const empMap = useMemo(() => Object.fromEntries(employees.map((e) => [e.id, e])), [employees]);
  const dayReports = useMemo(() => (reports || []).filter((r) => r.date === date), [reports, date]);

  const active = selected || dayReports[0];

  return (
    <div style={{ flex: 1, overflow: 'auto', background: T.bg, minWidth: 0 }}>
      <TopBar subtitle="보고서" title="일일 업무 보고" />
      <div style={{ padding: 24 }}>
        <Card pad={14} style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
          <Icon d={icons.calendar} size={14} c={T.mutedSoft} />
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
            style={{ height: 34, padding: '0 10px', border: `1px solid ${T.border}`, borderRadius: 7, fontSize: 13 }} />
          <span style={{ fontSize: 12, color: T.mutedSoft }}>제출: {dayReports.length}건</span>
        </Card>

        <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: 20, alignItems: 'start' }}>
          <Card pad={0} style={{ maxHeight: '70vh', overflow: 'auto' }}>
            <div style={{ padding: '12px 16px', borderBottom: `1px solid ${T.borderSoft}`, fontSize: 12, fontWeight: 700, color: T.muted }}>작업자 보고</div>
            {dayReports.length === 0 ? (
              <div style={{ padding: 40, textAlign: 'center', color: T.mutedSoft, fontSize: 12 }}>제출된 보고가 없습니다</div>
            ) : dayReports.map((r, i) => {
              const emp = empMap[r.employeeId];
              const on = active?.id === r.id;
              return (
                <div key={r.id} onClick={() => setSelected(r)} style={{
                  padding: '14px 16px', cursor: 'pointer',
                  borderTop: i ? `1px solid ${T.borderSoft}` : 'none',
                  background: on ? T.primarySoft : 'transparent',
                  borderLeft: on ? `3px solid ${T.primary}` : '3px solid transparent',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Avatar name={emp?.name || '?'} color="indigo" size={32} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: T.text }}>{emp?.name || '—'}</div>
                      <div style={{ fontSize: 11, color: T.mutedSoft }}>{emp?.jobType || ''}</div>
                    </div>
                    {r.status === 'submitted' ? <Pill tone="success">제출</Pill> : <Pill tone="warning">초안</Pill>}
                  </div>
                </div>
              );
            })}
          </Card>

          <div>
            {active ? (
              <Card pad={24}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, paddingBottom: 14, borderBottom: `1px solid ${T.borderSoft}`, marginBottom: 16 }}>
                  <Avatar name={empMap[active.employeeId]?.name || '?'} color="indigo" size={40} />
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: T.text }}>{empMap[active.employeeId]?.name || '—'}</div>
                    <div style={{ fontSize: 11, color: T.mutedSoft }}>{active.date} 일일 보고</div>
                  </div>
                </div>

                {[
                  { l: '완료 작업', v: active.completedWork, icon: icons.check, c: T.success },
                  { l: '진행중 작업', v: active.inProgressWork, icon: icons.clock, c: T.warning },
                  { l: '이슈·건의', v: active.issues, icon: icons.alert, c: T.danger },
                  { l: '내일 계획', v: active.tomorrowPlan, icon: icons.calendar, c: T.primary },
                ].map((s, i) => (
                  <div key={i} style={{ marginBottom: 14 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 700, color: T.muted, marginBottom: 6 }}>
                      <Icon d={s.icon} size={12} c={s.c} />
                      {s.l}
                    </div>
                    <div style={{ padding: 12, background: T.bg, borderRadius: 8, fontSize: 13, color: T.text, lineHeight: 1.55, whiteSpace: 'pre-wrap', minHeight: 40 }}>
                      {s.v || <span style={{ color: T.mutedSoft }}>—</span>}
                    </div>
                  </div>
                ))}
              </Card>
            ) : (
              <Card pad={60} style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 13, color: T.mutedSoft }}>보고서를 선택하세요</div>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
