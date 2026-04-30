import React, { useState, useMemo } from 'react';
import { T } from '../../design/primitives';
import useEmployeeStore from '../../stores/employeeStore';

// 트랙 76-A-3a — 다중 배정 모달 UI
// G33 안전 분기: onSave는 호출자가 alert 처리. 본 컴포넌트는 UI만 담당.
// 활성 worker 목록은 employeeStore에서 farm_admin branch 격리 적용된 상태로 받음.

export function AssignWorkersModal({ task, onClose, onSave }) {
  const employees = useEmployeeStore((s) => s.employees);

  const candidates = useMemo(
    () => employees.filter((e) => e.role === 'worker' && e.isActive),
    [employees]
  );

  const initialIds = (task.workers || []).map((w) => w.id);
  const [selected, setSelected] = useState(new Set(initialIds));
  const [primaryId, setPrimaryId] = useState(initialIds[0] ?? null);
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return candidates;
    return candidates.filter((w) => (w.name || '').toLowerCase().includes(q));
  }, [candidates, search]);

  const toggle = (id) => {
    const next = new Set(selected);
    if (next.has(id)) {
      next.delete(id);
      if (primaryId === id) {
        setPrimaryId(next.values().next().value ?? null);
      }
    } else {
      next.add(id);
      if (!primaryId) setPrimaryId(id);
    }
    setSelected(next);
  };

  const handleSave = () => {
    if (selected.size === 0) {
      onSave([]);
      return;
    }
    const ordered = [primaryId, ...[...selected].filter((id) => id !== primaryId)];
    onSave(ordered);
  };

  return (
    <div style={modalBackdrop} onClick={onClose}>
      <div style={modalContent} onClick={(e) => e.stopPropagation()}>
        <header style={modalHeader}>
          <span style={{ fontSize: 16, fontWeight: 700, color: T.text }}>작업자 배정</span>
          <button onClick={onClose} style={closeBtn} aria-label="닫기">×</button>
        </header>

        <input
          placeholder="작업자 이름 검색"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={searchInput}
        />

        <div style={listWrap}>
          {filtered.length === 0 ? (
            <div style={emptyState}>해당 지점에 활성 작업자가 없습니다</div>
          ) : (
            filtered.map((w) => {
              const isSelected = selected.has(w.id);
              const isPrimary = primaryId === w.id;
              return (
                <div key={w.id} style={listItem(isSelected)} onClick={() => toggle(w.id)}>
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => {}}
                    style={{ accentColor: T.primary, cursor: 'pointer' }}
                  />
                  <span style={{ flex: 1, fontSize: 14, color: T.text, fontWeight: 500 }}>{w.name}</span>
                  {isSelected && (
                    <button
                      onClick={(e) => { e.stopPropagation(); setPrimaryId(w.id); }}
                      style={primaryBtn(isPrimary)}
                    >
                      {isPrimary ? '주담당' : '주담당 지정'}
                    </button>
                  )}
                </div>
              );
            })
          )}
        </div>

        <footer style={modalFooter}>
          <span style={{ fontSize: 12, color: T.muted }}>
            선택 {selected.size}명{primaryId ? ' · 주담당 지정됨' : ''}
          </span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={onClose} style={cancelBtn}>취소</button>
            <button onClick={handleSave} style={saveBtn}>저장</button>
          </div>
        </footer>
      </div>
    </div>
  );
}

const modalBackdrop = {
  position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.4)',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  zIndex: 1000,
};
const modalContent = {
  background: T.surface, borderRadius: 12, width: 480, maxWidth: '92vw', maxHeight: '70vh',
  display: 'flex', flexDirection: 'column',
  boxShadow: '0 12px 48px rgba(15,23,42,0.18)',
};
const modalHeader = {
  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
  padding: '14px 18px', borderBottom: `1px solid ${T.borderSoft}`,
};
const closeBtn = {
  background: 'transparent', border: 'none', fontSize: 22,
  color: T.mutedSoft, cursor: 'pointer', lineHeight: 1, padding: 0, width: 28, height: 28,
};
const searchInput = {
  margin: '12px 18px 8px', padding: '8px 10px',
  border: `1px solid ${T.border}`, borderRadius: 6,
  fontSize: 13, color: T.text, outline: 'none',
};
const listWrap = {
  flex: 1, overflowY: 'auto', padding: '0 12px 8px',
};
const emptyState = {
  padding: '32px 0', textAlign: 'center',
  fontSize: 13, color: T.mutedSoft,
};
const listItem = (selected) => ({
  display: 'flex', alignItems: 'center', gap: 10,
  padding: '10px 8px', borderRadius: 6, cursor: 'pointer',
  background: selected ? T.primarySoft : 'transparent',
  transition: 'background 0.1s',
});
const primaryBtn = (isPrimary) => ({
  fontSize: 11, padding: '3px 8px', borderRadius: 4,
  border: 'none', cursor: 'pointer',
  background: isPrimary ? T.primary : T.bg,
  color: isPrimary ? '#fff' : T.muted,
  fontWeight: 600,
});
const modalFooter = {
  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
  padding: '12px 18px', borderTop: `1px solid ${T.borderSoft}`,
};
const cancelBtn = {
  padding: '7px 14px', borderRadius: 6, border: `1px solid ${T.border}`,
  background: T.surface, color: T.muted, fontSize: 13, cursor: 'pointer',
};
const saveBtn = {
  padding: '7px 14px', borderRadius: 6, border: 'none',
  background: T.primary, color: '#fff', fontSize: 13, fontWeight: 600,
  cursor: 'pointer',
};
