import React from 'react';
import { TaskCard } from './TaskCard';
import { T } from '../../design/primitives';

// 트랙 76-A-3a — 단일 상태 풀뷰 2열 그리드
// 디자인 산출물 §1 C-3 — 단일 포커스 모드
// fetch만, write 없음

const colKeyOfStatus = (s) => {
  if (s === 'completed' || s === 'done') return 'done';
  if (s === 'in_progress') return 'progress';
  return 'plan';
};

export function FocusList({ tasks, onCardClick, onAssignClick }) {
  if (!tasks || tasks.length === 0) {
    return (
      <div style={emptyState}>해당 상태의 작업이 없습니다</div>
    );
  }
  return (
    <div style={grid}>
      {tasks.map((t) => (
        <TaskCard
          key={t.id}
          task={t}
          columnKey={colKeyOfStatus(t.status)}
          onClick={() => onCardClick?.(t)}
          onAddWorker={onAssignClick}
        />
      ))}
    </div>
  );
}

const grid = {
  padding: '0 28px',
  display: 'grid',
  gridTemplateColumns: 'repeat(2, 1fr)',
  gap: 12,
  alignItems: 'start',
};
const emptyState = {
  padding: '64px 28px', textAlign: 'center',
  color: T.mutedSoft, fontSize: 14, fontWeight: 500,
};
