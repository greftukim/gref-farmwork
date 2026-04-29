import React from 'react';
import { T } from '../../design/primitives';
import { ZONES, ZONE_NAMES } from '../../lib/zoneColors';

// 트랙 76-A-1 v2 — 상태 + 동(zone) 필터 (busan 한정)
// 우선순위 필터 제거됨 (G17 DB 보존, UI만 정리)

const STATUS_OPTIONS = [
  { key: 'all',      label: '전체',   dotCls: null },
  { key: 'plan',     label: '계획',   dotCls: '#6366F1' },
  { key: 'progress', label: '진행중', dotCls: '#D97706' },
  { key: 'done',     label: '완료',   dotCls: '#059669' },
];

export function TaskFilters({ statusCounts, activeStatus, activeZone, onStatusChange, onZoneChange, branch }) {
  const showZone = branch === 'busan' || !branch; // master/HR_admin은 모두 표시
  return (
    <div style={{
      background: T.surface, padding: '10px 28px 14px',
      borderBottom: `1px solid ${T.border}`,
      display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
    }}>
      <span style={filterLabelStyle}>상태</span>
      <FilterGroup>
        {STATUS_OPTIONS.map((s) => (
          <FilterChip key={s.key} on={activeStatus === s.key} onClick={() => onStatusChange(s.key)} dotCls={s.dotCls}>
            {s.label}
            <Count on={activeStatus === s.key}>{statusCounts[s.key] ?? 0}</Count>
          </FilterChip>
        ))}
      </FilterGroup>

      {showZone && (
        <>
          <span style={{ ...filterLabelStyle, marginLeft: 8 }}>동</span>
          <FilterGroup>
            <FilterChip on={activeZone === 'all'} onClick={() => onZoneChange('all')}>전체</FilterChip>
            {ZONE_NAMES.map((name) => (
              <FilterChip key={name} on={activeZone === name} onClick={() => onZoneChange(name)} dotCls={ZONES[name].dot}>
                {name}
              </FilterChip>
            ))}
          </FilterGroup>
        </>
      )}
    </div>
  );
}

const filterLabelStyle = {
  fontSize: 11, fontWeight: 700, color: T.mutedSoft,
  letterSpacing: 0.4, textTransform: 'uppercase',
};
const FilterGroup = ({ children }) => (
  <div style={{ display: 'flex', gap: 4, padding: 3, background: T.bg, borderRadius: 8 }}>{children}</div>
);
const FilterChip = ({ on, onClick, dotCls, children }) => (
  <button
    onClick={onClick}
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
    {dotCls && <span style={{ width: 6, height: 6, borderRadius: 999, background: dotCls }} />}
    {children}
  </button>
);
const Count = ({ on, children }) => (
  <span style={{
    fontSize: 10, padding: '1px 6px', borderRadius: 999,
    background: on ? T.primarySoft : T.border,
    color: on ? T.primary : T.muted,
    fontWeight: 700,
  }}>{children}</span>
);
