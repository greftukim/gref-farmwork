// 작업 관리 (재설계 + 툴바 정리) — 트랙 77 후속 U19
// 시안: 운영 채팅방 합의 (동×날짜 매트릭스 + 일별 동×카드)
// U19: 상태 칩 제거 (사용자 의견 1) + 동 칩 선택 시 다른 동 row 비표시 (사용자 의견 2)
//
// 자산 보존 7건:
//   - 자산 4번 (76-A): zoneColors.js 미참조, AssignWorkersModal 재사용 only
//   - zoneMatrixColors.js 별 파일 사용 (G77-YY)
//
// 표준 §4 (CCB/Codex 자율 협업): 본 환경 단일 Claude Code → Codex 위임 0건.

import React, { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Icon, T, TopBar, btnPrimary, icons } from '../../design/primitives';
import useTaskStore from '../../stores/taskStore';
import useZoneStore from '../../stores/zoneStore';
import { getMatrixZoneColor } from '../../lib/zoneMatrixColors';
import WeekMatrixView from '../../components/task/WeekMatrixView';
import DayView from '../../components/task/DayView';
import TaskDetailModal from '../../components/task/TaskDetailModal';
import { AssignWorkersModal } from '../../components/task/AssignWorkersModal';

export default function TaskBoardPage() {
  const tasks = useTaskStore((s) => s.tasks);
  const assignWorkers = useTaskStore((s) => s.assignWorkers);
  const zones = useZoneStore((s) => s.zones);

  const [searchParams, setSearchParams] = useSearchParams();
  // [TRACK77-U18] view = 'week' | 'day'. 'kanban'/'focus' 북마크 → 'week' fallback (G77-ZZ)
  const rawView = searchParams.get('view');
  const view = rawView === 'day' ? 'day' : 'week';

  const [searchQ, setSearchQ] = useState('');
  // [TRACK77-U19] zoneFilter = 'all' | zone.id (id 기반으로 변경, G77-III)
  const [zoneFilter, setZoneFilter] = useState('all');
  const [detailTask, setDetailTask] = useState(null);
  const [assignTask, setAssignTask] = useState(null);

  const setView = (v) => {
    const next = new URLSearchParams(searchParams);
    next.set('view', v);
    setSearchParams(next, { replace: true });
  };

  // [TRACK77-U19] task 필터 — 검색 + zoneFilter (id 기반). 상태 칩 제거 (사용자 의견 1).
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
        const zid = t.zoneId || t.zones?.id || t.zone?.id;
        if (zid !== zoneFilter) return false;
      }
      return true;
    });
  }, [tasks, searchQ, zoneFilter]);

  // [TRACK77-U18] 카드 클릭 → 상세 모달
  const handleCardClick = (task) => setDetailTask(task);

  // [TRACK77-U18] 빈 셀 + 클릭 → 신규 작성 모달 (zoneId + date prefill, G77-DDD)
  const handleAddClick = (zoneId, date) => {
    setDetailTask({ __new: true, zoneId, date });
  };

  const handleSaveAssignment = async (workerIds) => {
    if (!assignTask) return;
    try {
      await assignWorkers(assignTask.id, workerIds);
      setAssignTask(null);
    } catch (err) {
      console.error('작업자 배정 실패:', err);
      alert(`작업자 배정 저장에 실패했습니다.\n${err?.message ?? '알 수 없는 오류'}`);
    }
  };

  return (
    <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', background: T.bg, minWidth: 0 }}>
      <TopBar
        subtitle="작업 관리"
        title="작업 관리"
        actions={btnPrimary('새 작업', icons.plus, () => setDetailTask({ __new: true }))}
      />

      {/* [TRACK77-U19] 툴바 — 검색 + 동 칩 + 보기 토글 + 우상단 카운트 (상태 칩 제거) */}
      <div style={{
        padding: '10px 28px',
        display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
        borderBottom: `1px solid ${T.border}`, background: T.surface,
      }}>
        {/* 검색 */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '7px 10px', background: T.bg, border: `1px solid ${T.border}`, borderRadius: 7,
          width: 280,
        }}>
          <Icon d={icons.search} size={14} c={T.mutedSoft} />
          <input
            value={searchQ}
            onChange={(e) => setSearchQ(e.target.value)}
            placeholder="작업명·작물·작업자 검색"
            style={{
              border: 0, background: 'transparent', outline: 'none', flex: 1,
              fontSize: 13, color: T.text,
            }}
          />
        </div>

        {/* [TRACK77-U19] 동 칩 — 선택 시 매트릭스 row도 해당 동만 표시 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: T.mutedSoft, letterSpacing: 0.4, textTransform: 'uppercase' }}>동</span>
          <div style={{ display: 'flex', gap: 4, padding: 3, background: T.bg, borderRadius: 8 }}>
            <ZoneChip on={zoneFilter === 'all'} onClick={() => setZoneFilter('all')}>전체</ZoneChip>
            {(zones || []).map((z, idx) => {
              const c = getMatrixZoneColor(idx);
              return (
                <ZoneChip
                  key={z.id}
                  on={zoneFilter === z.id}
                  onClick={() => setZoneFilter(z.id)}
                  dot={c.strong}
                >{z.name}</ZoneChip>
              );
            })}
          </div>
        </div>

        {/* [TRACK77-U18] view 토글 (주간 / 일별) */}
        <div style={{
          display: 'inline-flex', background: T.bg, border: `1px solid ${T.border}`, borderRadius: 7, padding: 2,
        }}>
          <ViewToggleBtn label="주간" active={view === 'week'} onClick={() => setView('week')} />
          <ViewToggleBtn label="일별" active={view === 'day'} onClick={() => setView('day')} />
        </div>

        {/* [TRACK77-U19] 우상단 카운트 — 동 필터 적용 시 표시 갯수 변화 인지용 (G77-III) */}
        <div style={{ marginLeft: 'auto', fontSize: 12, color: T.mutedSoft, fontWeight: 600 }}>
          총 <b style={{ color: T.text }}>{tasks?.length || 0}</b>건 · 표시 <b style={{ color: T.text }}>{filtered.length}</b>건
        </div>
      </div>

      {/* 보드 — week / day */}
      <div style={{ flex: 1, overflow: 'auto', padding: 24 }}>
        {view === 'week' && (
          <WeekMatrixView
            tasks={filtered}
            zones={zones}
            zoneFilter={zoneFilter}
            onCardClick={handleCardClick}
            onAddClick={handleAddClick}
          />
        )}
        {view === 'day' && (
          <DayView
            tasks={filtered}
            zones={zones}
            zoneFilter={zoneFilter}
            onCardClick={handleCardClick}
            onAddClick={handleAddClick}
          />
        )}
      </div>

      {/* 작업 상세 / 신규 작성 모달 */}
      {detailTask && (
        <TaskDetailModal
          task={detailTask}
          zones={zones}
          onClose={() => setDetailTask(null)}
          onSaved={() => setDetailTask(null)}
          onAssignClick={() => {
            // 신규 작성 모드는 배정 불가 (id 없음). 기존 task만 배정 변경 가능.
            if (!detailTask?.__new) {
              setAssignTask(detailTask);
              setDetailTask(null);
            }
          }}
        />
      )}

      {/* 배정 변경 모달 (자산 4번 — 변경 0, 재사용 only) */}
      {assignTask && (
        <AssignWorkersModal
          task={assignTask}
          onClose={() => setAssignTask(null)}
          onSave={handleSaveAssignment}
        />
      )}
    </div>
  );
}

function ViewToggleBtn({ label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      style={{
        height: 28, padding: '0 12px', borderRadius: 5,
        border: 0,
        background: active ? T.surface : 'transparent',
        color: active ? T.text : T.mutedSoft,
        fontSize: 12, fontWeight: 700, cursor: 'pointer',
        boxShadow: active ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
      }}
    >{label}</button>
  );
}

function ZoneChip({ on, onClick, dot, children }) {
  return (
    <button
      onClick={onClick}
      aria-pressed={on}
      style={{
        padding: '6px 12px', borderRadius: 6, fontSize: 12, fontWeight: 600,
        color: on ? T.text : T.muted,
        background: on ? T.surface : 'transparent',
        boxShadow: on ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
        cursor: 'pointer',
        border: 'none',
        display: 'inline-flex', alignItems: 'center', gap: 5,
      }}
    >
      {dot && <span style={{ width: 6, height: 6, borderRadius: 999, background: dot }} />}
      {children}
    </button>
  );
}
