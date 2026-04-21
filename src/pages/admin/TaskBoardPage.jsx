// 작업 칸반 보드 — 프로 SaaS 리디자인
// 기존: src/pages/admin/TaskBoardPage.jsx 교체용

import React, { useMemo, useState } from 'react';
import {
  Avatar, Card, Dot, Icon, Pill, T, TopBar, btnPrimary, btnSecondary, icons,
} from '../../design/primitives';
import useTaskStore from '../../stores/taskStore';
import useEmployeeStore from '../../stores/employeeStore';

const COLUMNS = [
  { id: 'planned', label: '계획', fg: T.muted, soft: '#F1F5F9', accent: '#94A3B8' },
  { id: 'assigned', label: '배정', fg: T.primary, soft: T.primarySoft, accent: T.primary },
  { id: 'in_progress', label: '진행중', fg: T.warning, soft: T.warningSoft, accent: T.warning },
  { id: 'completed', label: '완료', fg: T.success, soft: T.successSoft, accent: T.success },
];

const PRIORITY = {
  high: { l: '높음', fg: T.danger, soft: T.dangerSoft },
  medium: { l: '보통', fg: T.warning, soft: T.warningSoft },
  low: { l: '낮음', fg: T.muted, soft: '#F1F5F9' },
};

const AVATAR_COLORS = ['indigo', 'emerald', 'amber', 'rose'];
const avatarColor = (id) => {
  const s = (id || '').toString();
  let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
};

const fmtDate = (s) => {
  if (!s) return '';
  const d = new Date(s);
  return `${d.getMonth() + 1}/${d.getDate()}`;
};

export default function TaskBoardPage() {
  const tasks = useTaskStore((s) => s.tasks);
  const updateTask = useTaskStore((s) => s.updateTask);
  const employees = useEmployeeStore((s) => s.employees);

  const [searchQ, setSearchQ] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [dragTask, setDragTask] = useState(null);
  const [dragOver, setDragOver] = useState(null);

  const empMap = useMemo(
    () => Object.fromEntries(employees.map((e) => [e.id, e])),
    [employees]
  );

  const filtered = useMemo(() => {
    const q = searchQ.trim();
    return tasks.filter((t) => {
      if (priorityFilter !== 'all' && t.priority !== priorityFilter) return false;
      if (q && !(t.title || '').includes(q) && !(t.crop || '').includes(q)) return false;
      return true;
    });
  }, [tasks, searchQ, priorityFilter]);

  const byStatus = useMemo(() => {
    const map = { planned: [], assigned: [], in_progress: [], completed: [] };
    filtered.forEach((t) => {
      const s = t.status || 'planned';
      if (map[s]) map[s].push(t);
    });
    return map;
  }, [filtered]);

  const handleDragStart = (task) => setDragTask(task);
  const handleDragOver = (e, colId) => {
    e.preventDefault();
    if (dragOver !== colId) setDragOver(colId);
  };
  const handleDrop = async (colId) => {
    if (dragTask && dragTask.status !== colId) {
      await updateTask(dragTask.id, { status: colId });
    }
    setDragTask(null);
    setDragOver(null);
  };

  return (
    <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', background: T.bg, minWidth: 0 }}>
      <TopBar
        subtitle="작업 관리"
        title="작업 칸반"
        actions={btnPrimary('새 작업', icons.plus)}
      />

      {/* 필터 */}
      <div style={{ padding: '16px 24px', display: 'flex', alignItems: 'center', gap: 10, borderBottom: `1px solid ${T.border}`, background: T.surface }}>
        <div style={{ display: 'flex', gap: 4, background: T.bg, padding: 3, borderRadius: 7 }}>
          {[
            { v: 'all', l: '전체' },
            { v: 'high', l: '높음' },
            { v: 'medium', l: '보통' },
            { v: 'low', l: '낮음' },
          ].map((t) => {
            const on = priorityFilter === t.v;
            return (
              <span key={t.v} onClick={() => setPriorityFilter(t.v)} style={{
                padding: '6px 12px', borderRadius: 5, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                background: on ? T.surface : 'transparent',
                color: on ? T.text : T.mutedSoft,
                boxShadow: on ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
              }}>{t.l}</span>
            );
          })}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 10px', background: T.bg, border: `1px solid ${T.border}`, borderRadius: 7, flex: 1, maxWidth: 280, marginLeft: 'auto' }}>
          <Icon d={icons.search} size={14} c={T.mutedSoft} />
          <input value={searchQ} onChange={(e) => setSearchQ(e.target.value)}
            placeholder="작업명·작물 검색"
            style={{ border: 0, background: 'transparent', outline: 'none', flex: 1, fontSize: 13, color: T.text }} />
        </div>
        <div style={{ fontSize: 12, color: T.mutedSoft }}>총 {filtered.length}건</div>
      </div>

      {/* 보드 */}
      <div style={{ flex: 1, overflow: 'auto', padding: 24 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, minHeight: '100%' }}>
          {COLUMNS.map((col) => {
            const items = byStatus[col.id] || [];
            const isOver = dragOver === col.id;
            return (
              <div key={col.id}
                onDragOver={(e) => handleDragOver(e, col.id)}
                onDrop={() => handleDrop(col.id)}
                style={{
                  background: T.surface,
                  border: `1px solid ${isOver ? col.accent : T.border}`,
                  borderRadius: 12,
                  display: 'flex', flexDirection: 'column',
                  overflow: 'hidden',
                  boxShadow: isOver ? `0 0 0 2px ${col.soft}` : 'none',
                  transition: 'all 0.15s',
                }}>
                <div style={{
                  padding: '12px 14px',
                  borderBottom: `1px solid ${T.borderSoft}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  background: T.bg,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ width: 8, height: 8, borderRadius: 2, background: col.accent }} />
                    <span style={{ fontSize: 12, fontWeight: 700, color: T.text }}>{col.label}</span>
                    <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 4, background: col.soft, color: col.fg }}>{items.length}</span>
                  </div>
                  <button style={{
                    width: 24, height: 24, borderRadius: 5, border: 0, background: 'transparent',
                    color: T.mutedSoft, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Icon d={icons.plus} size={12} sw={2} />
                  </button>
                </div>

                <div style={{ padding: 10, display: 'flex', flexDirection: 'column', gap: 8, flex: 1 }}>
                  {items.length === 0 ? (
                    <div style={{ padding: '40px 10px', textAlign: 'center', color: T.mutedSoft, fontSize: 12, fontWeight: 500 }}>
                      작업 없음
                    </div>
                  ) : items.map((t) => {
                    const p = PRIORITY[t.priority] || PRIORITY.medium;
                    const assignees = (t.assignees || []).map((id) => empMap[id]).filter(Boolean);
                    const progress = t.progress ?? (t.status === 'completed' ? 100 : 0);
                    return (
                      <div key={t.id}
                        draggable
                        onDragStart={() => handleDragStart(t)}
                        onDragEnd={() => { setDragTask(null); setDragOver(null); }}
                        style={{
                          background: T.surface,
                          border: `1px solid ${T.border}`,
                          borderRadius: 8,
                          padding: 12,
                          cursor: 'grab',
                          opacity: dragTask?.id === t.id ? 0.5 : 1,
                          boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
                        }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6, marginBottom: 8 }}>
                          <span style={{
                            fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 3,
                            background: p.soft, color: p.fg, flexShrink: 0,
                          }}>{p.l}</span>
                          {t.crop && (
                            <span style={{
                              fontSize: 9, fontWeight: 600, padding: '2px 6px', borderRadius: 3,
                              background: T.bg, color: T.muted,
                            }}>{t.crop}</span>
                          )}
                        </div>

                        <div style={{ fontSize: 13, fontWeight: 600, color: T.text, marginBottom: 8, lineHeight: 1.35 }}>
                          {t.title}
                        </div>

                        {progress > 0 && col.id !== 'planned' && (
                          <div style={{ marginBottom: 8 }}>
                            <div style={{ height: 4, background: T.bg, borderRadius: 2, overflow: 'hidden' }}>
                              <div style={{ width: `${progress}%`, height: '100%', background: col.accent }} />
                            </div>
                            <div style={{ fontSize: 10, color: T.mutedSoft, fontWeight: 600, marginTop: 3, fontFamily: 'ui-monospace,monospace' }}>{progress}%</div>
                          </div>
                        )}

                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 10, color: T.mutedSoft }}>
                            {t.dueDate && (
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontFamily: 'ui-monospace,monospace', fontWeight: 600 }}>
                                <Icon d={icons.calendar} size={10} c={T.mutedSoft} sw={2} />
                                {fmtDate(t.dueDate)}
                              </span>
                            )}
                            {t.zone && (
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                                <Icon d={icons.location} size={10} c={T.mutedSoft} sw={2} />
                                {t.zone}
                              </span>
                            )}
                          </div>
                          {assignees.length > 0 && (
                            <div style={{ display: 'flex', marginLeft: 'auto' }}>
                              {assignees.slice(0, 3).map((e, i) => (
                                <div key={e.id} style={{ marginLeft: i === 0 ? 0 : -6, border: `2px solid ${T.surface}`, borderRadius: 999 }}>
                                  <Avatar name={e.name} color={avatarColor(e.id)} size={22} />
                                </div>
                              ))}
                              {assignees.length > 3 && (
                                <div style={{
                                  marginLeft: -6, width: 22, height: 22, borderRadius: 999,
                                  background: T.bg, border: `2px solid ${T.surface}`,
                                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                                  fontSize: 9, fontWeight: 700, color: T.muted,
                                }}>+{assignees.length - 3}</div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
