// 성과 분석 — /admin/stats
import React, { useMemo, useState } from 'react';
import { Avatar, Card, T, TopBar } from '../../design/primitives';
import { usePerformanceData } from '../../hooks/usePerformanceData';
import useAuthStore from '../../stores/authStore';

const BRANCH_LABEL = { busan: '부산LAB', jinju: '진주HUB', hadong: '하동HUB' };
const BRANCH_OPTS = [
  { id: 'all', label: '전체 지점' },
  { id: 'busan', label: '부산LAB' },
  { id: 'jinju', label: '진주HUB' },
  { id: 'hadong', label: '하동HUB' },
];

export default function StatsPage() {
  const currentUser = useAuthStore((s) => s.currentUser);
  const { workers: allWorkers, loading } = usePerformanceData();
  const [branchFilter, setBranchFilter] = useState('all');

  const isFarmAdmin = currentUser?.role === 'farm_admin';

  const workers = useMemo(() => {
    if (isFarmAdmin && currentUser?.branch) {
      return allWorkers.filter((w) => w.branch === currentUser.branch);
    }
    if (branchFilter !== 'all') {
      return allWorkers.filter((w) => w.branch === branchFilter);
    }
    return allWorkers;
  }, [allWorkers, currentUser, branchFilter, isFarmAdmin]);

  const ranked = useMemo(
    () => [...workers].sort((a, b) => b.harvestPct - a.harvestPct),
    [workers],
  );

  const avgPct = ranked.length
    ? Math.round(ranked.reduce((s, w) => s + w.harvestPct, 0) / ranked.length)
    : 0;
  const topWeekly = ranked.length ? Math.max(...ranked.map((w) => w.stemsWeek)) : 0;
  const topPct = ranked[0]?.harvestPct || 0;

  const filterBar = !isFarmAdmin && (
    <div style={{ display: 'flex', gap: 0, padding: 3, background: T.bg, border: `1px solid ${T.border}`, borderRadius: 7 }}>
      {BRANCH_OPTS.map(o => {
        const on = branchFilter === o.id;
        return (
          <button key={o.id} onClick={() => setBranchFilter(o.id)} style={{
            padding: '4px 14px', borderRadius: 5, border: 0, cursor: 'pointer',
            background: on ? T.surface : 'transparent', color: on ? T.text : T.mutedSoft,
            fontSize: 12, fontWeight: 600,
            boxShadow: on ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
          }}>{o.label}</button>
        );
      })}
    </div>
  );

  if (loading) {
    return (
      <div style={{ flex: 1, overflow: 'auto', background: T.bg, minWidth: 0 }}>
        <TopBar subtitle="분석" title="성과 분석" />
        <div style={{ padding: 60, textAlign: 'center', color: T.mutedSoft }}>로딩 중...</div>
      </div>
    );
  }

  return (
    <div style={{ flex: 1, overflow: 'auto', background: T.bg, minWidth: 0 }}>
      <TopBar subtitle="분석" title="성과 분석" actions={filterBar} />
      <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
          {[
            { l: '평균 수확 성과율', v: avgPct, unit: '%', tone: T.primary },
            { l: '주간 최고 수확량', v: topWeekly, unit: 'kg/주', tone: T.success },
            { l: '평가 인원', v: ranked.length, unit: '명', tone: T.info },
          ].map((k, i) => (
            <Card key={i} pad={18} style={{ position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: k.tone }} />
              <div style={{ fontSize: 12, color: T.muted, fontWeight: 600, marginBottom: 14 }}>{k.l}</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                <span style={{ fontSize: 36, fontWeight: 700, color: T.text, letterSpacing: -1, lineHeight: 1, fontFamily: 'ui-monospace,monospace' }}>{k.v}</span>
                <span style={{ fontSize: 14, color: T.mutedSoft, fontWeight: 500 }}>{k.unit}</span>
              </div>
            </Card>
          ))}
        </div>

        <Card pad={0}>
          <div style={{ padding: '14px 20px', borderBottom: `1px solid ${T.borderSoft}`, fontSize: 13, fontWeight: 700, color: T.text }}>수확 성과 랭킹</div>
          {ranked.length === 0 ? (
            <div style={{ padding: 60, textAlign: 'center', color: T.mutedSoft }}>수확 데이터가 없습니다</div>
          ) : ranked.map((w, i) => {
            const pct = topPct ? Math.round((w.harvestPct / topPct) * 100) : 0;
            const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : null;
            return (
              <div key={w.id} style={{
                padding: '14px 20px',
                borderTop: i ? `1px solid ${T.borderSoft}` : 'none',
                display: 'flex', alignItems: 'center', gap: 14,
              }}>
                <div style={{
                  width: 30, height: 30, borderRadius: 8,
                  background: i < 3 ? T.warningSoft : T.bg,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 13, fontWeight: 700, color: i < 3 ? T.warning : T.muted,
                  fontFamily: 'ui-monospace,monospace',
                }}>{medal || `#${i + 1}`}</div>
                <Avatar name={w.name} color="indigo" size={36} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: T.text }}>{w.name}</span>
                    <span style={{
                      fontSize: 10, fontWeight: 600, padding: '1px 6px', borderRadius: 4,
                      background: w.bc + '20', color: w.bc,
                    }}>{BRANCH_LABEL[w.branch] || w.branch}</span>
                  </div>
                  <div style={{ height: 5, background: T.bg, borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{ width: `${pct}%`, height: '100%', background: i < 3 ? T.warning : T.primary }} />
                  </div>
                </div>
                <div style={{ textAlign: 'right', minWidth: 90 }}>
                  <div style={{ fontSize: 22, fontWeight: 700, color: T.text, letterSpacing: -0.4, fontFamily: 'ui-monospace,monospace', lineHeight: 1 }}>{w.harvestPct}</div>
                  <div style={{ fontSize: 10, color: T.mutedSoft, marginTop: 3 }}>% · {w.stemsWeek}kg/주</div>
                </div>
              </div>
            );
          })}
        </Card>
      </div>
    </div>
  );
}
