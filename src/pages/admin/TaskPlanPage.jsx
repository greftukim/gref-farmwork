// 작업 계획 — /admin/task-plan
import React, { useMemo, useState } from 'react';
import { Avatar, Card, Icon, Pill, T, TopBar, icons } from '../../design/primitives';
import useTaskStore from '../../stores/taskStore';
import useEmployeeStore from '../../stores/employeeStore';

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

function weekStart(d) {
  const x = new Date(d);
  x.setDate(x.getDate() - x.getDay());
  x.setHours(0, 0, 0, 0);
  return x;
}

export default function TaskPlanPage() {
  const tasks = useTaskStore((s) => s.tasks);
  const employees = useEmployeeStore((s) => s.employees);

  const [anchor, setAnchor] = useState(weekStart(new Date()));
  const empMap = useMemo(() => Object.fromEntries(employees.map((e) => [e.id, e])), [employees]);

  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => {
    const d = new Date(anchor); d.setDate(anchor.getDate() + i);
    return d.toISOString().split('T')[0];
  }), [anchor]);

  const byDay = useMemo(() => {
    const m = {};
    days.forEach((d) => { m[d] = []; });
    (tasks || []).forEach((t) => { if (t.dueDate && m[t.dueDate]) m[t.dueDate].push(t); });
    return m;
  }, [tasks, days]);

  const shift = (n) => {
    const d = new Date(anchor); d.setDate(anchor.getDate() + n * 7);
    setAnchor(d);
  };

  const rangeLabel = `${anchor.getMonth() + 1}.${anchor.getDate()} - ${new Date(new Date(anchor).setDate(anchor.getDate() + 6)).getMonth() + 1}.${new Date(new Date(anchor).setDate(anchor.getDate() + 6)).getDate()}`;
  const today = new Date().toISOString().split('T')[0];

  return (
    <div style={{ flex: 1, overflow: 'auto', background: T.bg, minWidth: 0 }}>
      <TopBar subtitle="작업 관리" title="작업 주간 계획" />
      <div style={{ padding: 24 }}>
        <Card pad={14} style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
          <button onClick={() => shift(-1)} style={{ width: 30, height: 30, borderRadius: 7, border: `1px solid ${T.border}`, background: T.surface, cursor: 'pointer', color: T.muted, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon d={<polyline points="15 18 9 12 15 6" />} size={13} sw={2} />
          </button>
          <span style={{ fontSize: 14, fontWeight: 700, color: T.text, minWidth: 140, textAlign: 'center' }}>{anchor.getFullYear()} · {rangeLabel}</span>
          <button onClick={() => shift(1)} style={{ width: 30, height: 30, borderRadius: 7, border: `1px solid ${T.border}`, background: T.surface, cursor: 'pointer', color: T.muted, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon d={<polyline points="9 18 15 12 9 6" />} size={13} sw={2} />
          </button>
          <button onClick={() => setAnchor(weekStart(new Date()))} style={{ marginLeft: 'auto', height: 30, padding: '0 12px', borderRadius: 7, border: `1px solid ${T.border}`, background: T.surface, cursor: 'pointer', fontSize: 12, fontWeight: 600, color: T.muted }}>오늘</button>
        </Card>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 10 }}>
          {days.map((d, i) => {
            const items = byDay[d] || [];
            const dDate = new Date(d);
            const isToday = d === today;
            const isWeekend = i === 0 || i === 6;
            return (
              <Card key={d} pad={0} style={{
                overflow: 'hidden', border: isToday ? `1.5px solid ${T.primary}` : `1px solid ${T.border}`,
              }}>
                <div style={{ padding: '10px 12px', borderBottom: `1px solid ${T.borderSoft}`, background: isToday ? T.primarySoft : T.bg }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: isWeekend ? (i === 0 ? T.danger : T.primary) : T.mutedSoft, letterSpacing: 0.3 }}>{WEEKDAYS[i]}</div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginTop: 2 }}>
                    <span style={{ fontSize: 16, fontWeight: 700, color: isToday ? T.primary : T.text, fontFamily: 'ui-monospace,monospace' }}>{dDate.getDate()}</span>
                    {items.length > 0 && <span style={{ fontSize: 10, color: T.mutedSoft, marginLeft: 'auto' }}>{items.length}건</span>}
                  </div>
                </div>
                <div style={{ padding: 8, minHeight: 200, display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {items.length === 0 ? (
                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: T.mutedSoft }}>작업 없음</div>
                  ) : items.map((t) => {
                    const prioC = t.priority === 'high' ? T.danger : t.priority === 'medium' ? T.warning : T.mutedSoft;
                    const firstAssignee = empMap[(t.assignees || [])[0]];
                    return (
                      <div key={t.id} style={{
                        padding: 8, background: T.bg, borderRadius: 6,
                        borderLeft: `3px solid ${prioC}`,
                      }}>
                        <div style={{ fontSize: 11, fontWeight: 600, color: T.text, marginBottom: 4, lineHeight: 1.35 }}>{t.title}</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 9, color: T.mutedSoft }}>
                          {t.crop && <span>{t.crop}</span>}
                          {firstAssignee && <>{t.crop && <span>·</span>}<span>{firstAssignee.name}</span></>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
