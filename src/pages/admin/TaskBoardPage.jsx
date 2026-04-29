// 작업 칸반 보드 v2 — 동(zone) 분류 + 다중 배정 + 우선순위 제거
// 트랙 76-A-1 v2 (디자인 채팅방 산출물 적용)

import React, { useMemo, useState } from 'react';
import { Icon, T, TopBar, btnPrimary, icons } from '../../design/primitives';
import useTaskStore from '../../stores/taskStore';
import useAuthStore from '../../stores/authStore';
import { TaskColumn } from '../../components/task/TaskColumn';
import { TaskFilters } from '../../components/task/TaskFilters';

// DB status → Kanban columnKey 매핑
// pending → plan (Q4 발견 매핑 보존)
const colOf = (s) => {
  if (s === 'pending' || s === 'planned' || s === 'assigned') return 'plan';
  if (s === 'in_progress') return 'progress';
  if (s === 'completed' || s === 'done') return 'done';
  return 'plan';
};

const COLUMN_KEYS = ['plan', 'progress', 'done'];

export default function TaskBoardPage() {
  const tasks = useTaskStore((s) => s.tasks);
  const updateTask = useTaskStore((s) => s.updateTask);
  const currentUser = useAuthStore((s) => s.currentUser);

  const [searchQ, setSearchQ] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [zoneFilter, setZoneFilter] = useState('all');
  const [dragTask, setDragTask] = useState(null);
  const [dragOver, setDragOver] = useState(null);

  // 검색 + zone 필터 적용
  const filtered = useMemo(() => {
    const q = searchQ.trim();
    return (tasks || []).filter((t) => {
      if (q) {
        const hitTitle = (t.title || '').includes(q);
        const hitCrop = (t.crop || '').includes(q);
        const hitWorker = (t.workers || []).some((w) => (w.name || '').includes(q));
        if (!hitTitle && !hitCrop && !hitWorker) return false;
      }
      if (zoneFilter !== 'all') {
        const zoneName = t.zones?.name || t.zone?.name;
        if (zoneName !== zoneFilter) return false;
      }
      return true;
    });
  }, [tasks, searchQ, zoneFilter]);

  // status 필터 적용 + 컬럼별 그룹
  const visible = useMemo(() => {
    if (statusFilter === 'all') return filtered;
    return filtered.filter((t) => colOf(t.status) === statusFilter);
  }, [filtered, statusFilter]);

  const byColumn = useMemo(() => {
    const map = { plan: [], progress: [], done: [] };
    visible.forEach((t) => {
      const k = colOf(t.status);
      if (map[k]) map[k].push(t);
    });
    return map;
  }, [visible]);

  const statusCounts = useMemo(() => ({
    all: filtered.length,
    plan: filtered.filter((t) => colOf(t.status) === 'plan').length,
    progress: filtered.filter((t) => colOf(t.status) === 'progress').length,
    done: filtered.filter((t) => colOf(t.status) === 'done').length,
  }), [filtered]);

  const handleDragStart = (task) => setDragTask(task);
  const handleDragOver = (e, colKey) => {
    e.preventDefault();
    if (dragOver !== colKey) setDragOver(colKey);
  };
  const handleDrop = async (colKey) => {
    if (dragTask) {
      const dbStatus = colKey === 'plan' ? 'pending' : colKey === 'progress' ? 'in_progress' : 'completed';
      if (dragTask.status !== dbStatus) {
        await updateTask(dragTask.id, { status: dbStatus });
      }
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

      <TaskFilters
        statusCounts={statusCounts}
        activeStatus={statusFilter}
        activeZone={zoneFilter}
        onStatusChange={setStatusFilter}
        onZoneChange={setZoneFilter}
        branch={currentUser?.branch}
      />

      {/* 검색 + 총 건수 */}
      <div style={{ padding: '10px 28px', display: 'flex', alignItems: 'center', gap: 10, borderBottom: `1px solid ${T.border}`, background: T.surface }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 10px', background: T.bg, border: `1px solid ${T.border}`, borderRadius: 7, width: 280 }}>
          <Icon d={icons.search} size={14} c={T.mutedSoft} />
          <input
            value={searchQ}
            onChange={(e) => setSearchQ(e.target.value)}
            placeholder="작업명·작물·작업자 검색"
            style={{ border: 0, background: 'transparent', outline: 'none', flex: 1, fontSize: 13, color: T.text }}
          />
        </div>
        <div style={{ marginLeft: 'auto', fontSize: 12, color: T.mutedSoft, fontWeight: 600 }}>
          총 <b style={{ color: T.text }}>{tasks?.length || 0}</b>건 · 표시 <b style={{ color: T.text }}>{visible.length}</b>건
        </div>
      </div>

      {/* 보드 */}
      <div style={{ flex: 1, overflow: 'auto', padding: 24 }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: statusFilter === 'all' ? 'repeat(3, 1fr)' : '1fr',
          gap: 16, alignItems: 'start',
          maxWidth: statusFilter === 'all' ? '100%' : 720,
          margin: statusFilter === 'all' ? 0 : '0 auto',
        }}>
          {(statusFilter === 'all' ? COLUMN_KEYS : [statusFilter]).map((k) => (
            <div
              key={k}
              onDragOver={(e) => handleDragOver(e, k)}
              onDrop={() => handleDrop(k)}
              style={{ opacity: dragOver === k ? 0.85 : 1, transition: 'opacity 0.15s' }}
            >
              <TaskColumn
                columnKey={k}
                tasks={byColumn[k]}
                onCardClick={() => { /* 76-A-3에서 상세 모달 */ }}
                onAddWorker={() => { /* 76-A-3에서 다중 배정 모달 */ }}
                onAddTask={() => { /* 신규 작업 모달 */ }}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
