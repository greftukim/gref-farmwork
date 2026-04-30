import React, { useMemo, useState } from 'react';
import { T } from '../../design/primitives';
import { TaskCard } from './TaskCard';

// 트랙 76-A-3a — 주간 보기 (7일 컬럼 × 동/상태 필터 적용 task)
// fetch만, write 없음

const startOfWeek = (date) => {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day; // 월요일 기준
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
};

const sameDay = (a, b) => {
  const da = new Date(a);
  const db = new Date(b);
  return da.toISOString().slice(0, 10) === db.toISOString().slice(0, 10);
};

const colKeyOfStatus = (s) => {
  if (s === 'completed' || s === 'done') return 'done';
  if (s === 'in_progress') return 'progress';
  return 'plan';
};

export function WeekView({ tasks, onCardClick, onAssignClick }) {
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));

  const days = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(weekStart);
      d.setDate(d.getDate() + i);
      return d;
    });
  }, [weekStart]);

  const groupedByDay = useMemo(() => {
    return days.map((day) => ({
      date: day,
      tasks: (tasks || []).filter((t) => {
        const due = t.dueDate || t.due_date;
        return due && sameDay(due, day);
      }),
    }));
  }, [days, tasks]);

  const prevWeek = () => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() - 7);
    setWeekStart(d);
  };
  const nextWeek = () => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + 7);
    setWeekStart(d);
  };
  const thisWeek = () => setWeekStart(startOfWeek(new Date()));

  const today = new Date();
  const dayLabels = ['월', '화', '수', '목', '금', '토', '일'];

  return (
    <div style={{ padding: '0 28px' }}>
      <div style={weekHeader}>
        <button onClick={prevWeek} style={navBtn}>‹</button>
        <span style={{ fontSize: 14, fontWeight: 600, color: T.text, minWidth: 160, textAlign: 'center' }}>
          {weekStart.getFullYear()}년 {weekStart.getMonth() + 1}월 {weekStart.getDate()}일 주
        </span>
        <button onClick={nextWeek} style={navBtn}>›</button>
        <button onClick={thisWeek} style={todayBtn}>이번 주</button>
      </div>
      <div style={weekGrid}>
        {groupedByDay.map(({ date, tasks: dayTasks }, idx) => {
          const isToday = sameDay(date, today);
          const isWeekend = idx >= 5;
          return (
            <section key={date.toISOString()}>
              <header style={dayHeader(isToday, isWeekend)}>
                <span>{dayLabels[idx]}</span>
                <span style={{ fontSize: 12, color: isWeekend ? T.mutedSoft : T.muted, fontWeight: 600 }}>
                  {date.getMonth() + 1}/{date.getDate()}
                </span>
              </header>
              <div style={dayBody}>
                {dayTasks.length === 0 ? (
                  <div style={emptyDay}>—</div>
                ) : (
                  dayTasks.map((t) => (
                    <TaskCard
                      key={t.id}
                      task={t}
                      columnKey={colKeyOfStatus(t.status)}
                      onClick={() => onCardClick?.(t)}
                      onAddWorker={onAssignClick}
                    />
                  ))
                )}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}

const weekHeader = {
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  gap: 10, padding: '16px 0',
};
const navBtn = {
  width: 32, height: 32, borderRadius: 6, border: `1px solid ${T.border}`,
  background: T.surface, color: T.muted, fontSize: 18, cursor: 'pointer',
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
};
const todayBtn = {
  marginLeft: 8, padding: '6px 12px', borderRadius: 6,
  border: `1px solid ${T.border}`, background: T.surface,
  color: T.muted, fontSize: 12, fontWeight: 600, cursor: 'pointer',
};
const weekGrid = {
  display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 8,
};
const dayHeader = (isToday, isWeekend) => ({
  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
  padding: '8px 10px', marginBottom: 6,
  background: isToday ? T.primarySoft : T.surface,
  border: `1px solid ${isToday ? T.primary : T.border}`,
  borderRadius: 6,
  fontSize: 12, fontWeight: 700,
  color: isToday ? T.primary : isWeekend ? T.mutedSoft : T.text,
});
const dayBody = {
  display: 'flex', flexDirection: 'column', gap: 6,
};
const emptyDay = {
  fontSize: 11, color: T.mutedSoft, textAlign: 'center', padding: '24px 0',
};
