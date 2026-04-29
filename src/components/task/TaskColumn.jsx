import React from 'react';
import { T } from '../../design/primitives';
import { TaskCard } from './TaskCard';

// 트랙 76-A-1 v2 — 칸반 컬럼 (계획/진행중/완료 3개)
// pending → planned 매핑은 페이지에서 colOf로 처리 (Q4 보존)

const COL_META = {
  plan:     { label: '계획',   dot: '#6366F1', bar: '#6366F1' },
  progress: { label: '진행중', dot: '#D97706', bar: '#D97706' },
  done:     { label: '완료',   dot: '#059669', bar: '#059669' },
};

export function TaskColumn({ columnKey, tasks, onCardClick, onAddTask, onAddWorker }) {
  const meta = COL_META[columnKey] || COL_META.plan;
  return (
    <section>
      <header style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '10px 12px', marginBottom: 8,
        background: T.surface, borderRadius: 8, border: `1px solid ${T.border}`,
      }}>
        <span style={{ width: 8, height: 8, borderRadius: 999, background: meta.dot, flexShrink: 0 }} />
        <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: -0.2 }}>{meta.label}</span>
        <span style={{
          fontSize: 11, padding: '2px 7px', borderRadius: 4,
          background: T.bg, color: T.muted, fontWeight: 700,
        }}>{tasks.length}</span>
        <button
          onClick={onAddTask}
          style={{
            marginLeft: 'auto', width: 22, height: 22, borderRadius: 5,
            border: 'none', background: T.bg, color: T.muted, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 14, fontWeight: 600,
          }}
        >+</button>
      </header>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {tasks.length === 0 ? (
          <div style={{
            background: T.surface, border: `1px dashed ${T.border}`,
            borderRadius: 10, padding: '32px 12px',
            textAlign: 'center', color: T.mutedSoft, fontSize: 12, fontWeight: 500,
          }}>
            <div style={{ marginBottom: 6, fontSize: 18 }}>○</div>
            작업 없음
          </div>
        ) : (
          tasks.map((t) => (
            <TaskCard
              key={t.id}
              task={t}
              columnKey={columnKey}
              onClick={() => onCardClick?.(t)}
              onAddWorker={onAddWorker}
            />
          ))
        )}
      </div>
    </section>
  );
}
