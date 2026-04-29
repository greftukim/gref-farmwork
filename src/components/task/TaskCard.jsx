import React from 'react';
import { T } from '../../design/primitives';
import { getZone } from '../../lib/zoneColors';

// 트랙 76-A-1 v2 — 동(zone)별 카드 + 다중 배정 지원
// 디자인 채팅방 결정값 적용 (D10/D11/G27)

const COL_BAR = {
  plan:     '#6366F1',
  progress: '#D97706',
  done:     '#059669',
};

const AV_COLORS = ['#6366F1', '#0D9488', '#D97706', '#DC2626', '#7C3AED', '#0891B2'];
const avatarColor = (id) => {
  let h = 0;
  for (let i = 0; i < (id || '').length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  return AV_COLORS[Math.abs(h) % AV_COLORS.length];
};
const avatarLabel = (name) => (name || '').slice(0, 2);

const formatDate = (d) => {
  const dt = new Date(d);
  return `${dt.getMonth() + 1}/${dt.getDate()}`;
};

const dueTone = (dueDate, status) => {
  if (!dueDate) return { tone: 'normal', label: '-' };
  if (status === 'completed' || status === 'done') return { tone: 'done', label: `완료 ${formatDate(dueDate)}` };
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const due = new Date(dueDate); due.setHours(0, 0, 0, 0);
  const diff = Math.round((due - today) / 86400000);
  if (diff < 0) return { tone: 'overdue', label: `${formatDate(dueDate)} (지연)` };
  if (diff === 0) return { tone: 'today', label: `${formatDate(dueDate)} (오늘)` };
  return { tone: 'normal', label: formatDate(dueDate) };
};

export function TaskCard({ task, columnKey, onClick, onAddWorker }) {
  const zone = getZone(task);
  const due = dueTone(task.dueDate || task.due_date, task.status);
  const workers = task.workers || [];
  const visible = workers.slice(0, 4);
  const overflow = workers.length - visible.length;
  const dueColor = { normal: T.muted, today: T.warning, overdue: T.danger, done: T.muted }[due.tone];
  const barColor = COL_BAR[columnKey] || COL_BAR.plan;
  const progress = task.progress ?? (task.status === 'completed' ? 100 : task.status === 'in_progress' ? 50 : 0);

  return (
    <article
      onClick={onClick}
      style={{
        background: T.surface,
        border: `1px solid ${T.border}`,
        borderLeft: `4px solid ${zone.line}`,
        borderRadius: 10,
        padding: '12px 14px 12px 13px',
        cursor: 'pointer',
        transition: 'border-color 0.15s, box-shadow 0.15s',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = '#CBD5E1';
        e.currentTarget.style.borderLeftColor = zone.line;
        e.currentTarget.style.boxShadow = '0 4px 12px rgba(15,23,42,0.06)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = T.border;
        e.currentTarget.style.borderLeftColor = zone.line;
        e.currentTarget.style.boxShadow = 'none';
      }}
    >
      {/* Head: 동 Pill + 작업 유형(텍스트) + 위치 + 메뉴 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
        <span style={{
          fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 4,
          letterSpacing: 0.2,
          background: zone.pillBg, color: zone.pillFg,
        }}>{zone.label}</span>
        {task.taskType && (
          <span style={{ fontSize: 10, fontWeight: 600, color: T.muted, letterSpacing: 0.1 }}>
            {task.taskType}
          </span>
        )}
        {task.location && (
          <span style={{ fontSize: 10, color: T.mutedSoft, fontWeight: 600, marginLeft: 'auto' }}>
            {task.location}
          </span>
        )}
        <span style={{
          width: 18, height: 18, borderRadius: 4, color: T.mutedSoft,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          marginLeft: task.location ? 0 : 'auto', cursor: 'pointer',
        }}>⋯</span>
      </div>

      {/* Title */}
      <div style={{
        fontSize: 14, fontWeight: 600, color: T.text,
        lineHeight: 1.4, letterSpacing: -0.2, marginBottom: 10,
      }}>{task.title}</div>

      {/* Progress */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <div style={{ flex: 1, height: 4, background: T.borderSoft, borderRadius: 999, overflow: 'hidden' }}>
          <div style={{ width: `${progress}%`, height: '100%', background: barColor, borderRadius: 999 }} />
        </div>
        <span style={{ fontSize: 10, color: T.muted, fontWeight: 700, minWidth: 32, textAlign: 'right' }}>
          {progress}%
        </span>
      </div>

      {/* Footer: 마감일 + Avatar Stack */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        paddingTop: 9, borderTop: `1px solid ${T.borderSoft}`,
      }}>
        <span style={{ fontSize: 11, color: dueColor, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
          <DueIcon done={task.status === 'completed' || task.status === 'done'} />
          {due.label}
        </span>
        <div
          style={{ display: 'flex', alignItems: 'center', marginLeft: 'auto' }}
          title={workers.map((w) => w.name).join(', ') || '미배정'}
        >
          {workers.length === 0 ? (
            <button
              onClick={(e) => { e.stopPropagation(); onAddWorker?.(task); }}
              style={{
                width: 22, height: 22, borderRadius: 999, border: `2px solid ${T.surface}`,
                background: T.bg, color: T.muted, fontSize: 12, fontWeight: 600,
                display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
              }}
            >+</button>
          ) : (
            <>
              {visible.map((w, i) => (
                <span key={w.id} style={{
                  width: 22, height: 22, borderRadius: 999,
                  border: `2px solid ${T.surface}`,
                  background: avatarColor(w.id),
                  color: '#fff', fontSize: 10, fontWeight: 700,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  marginLeft: i === 0 ? 0 : -6, letterSpacing: -0.2,
                }}>{avatarLabel(w.name)}</span>
              ))}
              {overflow > 0 && (
                <span style={{
                  width: 22, height: 22, borderRadius: 999,
                  border: `2px solid ${T.surface}`,
                  background: T.bg, color: T.muted, fontSize: 10, fontWeight: 700,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  marginLeft: -6,
                }}>+{overflow}</span>
              )}
            </>
          )}
        </div>
      </div>
    </article>
  );
}

const DueIcon = ({ done }) => done ? (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
    <path d="M22 4L12 14.01l-3-3" />
  </svg>
) : (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="4" width="18" height="18" rx="2" />
    <path d="M16 2v4M8 2v4M3 10h18" />
  </svg>
);
