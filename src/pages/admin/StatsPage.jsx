// 성과 분석 — /admin/stats
import React, { useMemo } from 'react';
import { Avatar, Card, Icon, T, TopBar, icons } from '../../design/primitives';
import usePerformanceStore from '../../stores/performanceStore';
import useEmployeeStore from '../../stores/employeeStore';

export default function StatsPage() {
  const performance = usePerformanceStore((s) => s.performance);
  const employees = useEmployeeStore((s) => s.employees);
  const empMap = useMemo(() => Object.fromEntries(employees.map((e) => [e.id, e])), [employees]);

  const ranked = useMemo(() => {
    return [...(performance || [])].sort((a, b) => (b.score || 0) - (a.score || 0));
  }, [performance]);

  const total = ranked.reduce((s, r) => s + (r.score || 0), 0);
  const avg = ranked.length ? Math.round(total / ranked.length) : 0;
  const topScore = ranked[0]?.score || 0;

  return (
    <div style={{ flex: 1, overflow: 'auto', background: T.bg, minWidth: 0 }}>
      <TopBar subtitle="분석" title="작업자 성과 분석" />
      <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
          {[
            { l: '평균 점수', v: avg, unit: '점', tone: T.primary },
            { l: '최고 점수', v: topScore, unit: '점', tone: T.success },
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
          <div style={{ padding: '14px 20px', borderBottom: `1px solid ${T.borderSoft}`, fontSize: 13, fontWeight: 700, color: T.text }}>성과 랭킹</div>
          {ranked.length === 0 ? (
            <div style={{ padding: 60, textAlign: 'center', color: T.mutedSoft }}>평가 데이터가 없습니다</div>
          ) : ranked.map((r, i) => {
            const emp = empMap[r.employeeId];
            const pct = topScore ? Math.round(((r.score || 0) / topScore) * 100) : 0;
            const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : null;
            return (
              <div key={r.id || i} style={{
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
                <Avatar name={emp?.name || '?'} color="indigo" size={36} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: T.text, marginBottom: 3 }}>{emp?.name || '—'}</div>
                  <div style={{ fontSize: 11, color: T.mutedSoft, marginBottom: 5 }}>{emp?.jobType || ''}</div>
                  <div style={{ height: 5, background: T.bg, borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{ width: `${pct}%`, height: '100%', background: i < 3 ? T.warning : T.primary }} />
                  </div>
                </div>
                <div style={{ textAlign: 'right', minWidth: 80 }}>
                  <div style={{ fontSize: 22, fontWeight: 700, color: T.text, letterSpacing: -0.4, fontFamily: 'ui-monospace,monospace', lineHeight: 1 }}>{r.score || 0}</div>
                  <div style={{ fontSize: 10, color: T.mutedSoft, marginTop: 3 }}>점 · {r.taskCount || 0}건</div>
                </div>
              </div>
            );
          })}
        </Card>
      </div>
    </div>
  );
}
