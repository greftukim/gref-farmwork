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
const PERIOD_OPTS = ['이번 주', '이번 달', '전체'];

const TIER_LABEL = { top: '우수', mid: '평균', low: '저성과' };
const TIER_COLOR = { top: T.success, mid: T.primary, low: T.danger };
const TIER_BG   = { top: T.successSoft ?? '#DCFCE7', mid: T.primarySoft ?? '#EEF2FF', low: T.dangerSoft ?? '#FEE2E2' };

// 로컬 날짜 문자열 (교훈 77: toISOString UTC 함정 회피)
function localDateStr(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function getPeriodRange(period) {
  const now = new Date();
  if (period === '이번 달') {
    return { dateFrom: localDateStr(new Date(now.getFullYear(), now.getMonth(), 1)), dateTo: localDateStr(now) };
  }
  if (period === '이번 주') {
    const day = now.getDay(); // 0=일요일
    const mon = new Date(now);
    mon.setDate(now.getDate() - (day === 0 ? 6 : day - 1));
    return { dateFrom: localDateStr(mon), dateTo: localDateStr(now) };
  }
  return { dateFrom: null, dateTo: null }; // 전체
}

export default function StatsPage() {
  const currentUser = useAuthStore((s) => s.currentUser);
  const [period, setPeriod] = useState('전체');
  const [branchFilter, setBranchFilter] = useState('all');
  const { dateFrom, dateTo } = useMemo(() => getPeriodRange(period), [period]);
  const { workers: allWorkers, loading } = usePerformanceData(dateFrom, dateTo);

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
    () => [...workers].sort((a, b) => (b.speedPct || 0) - (a.speedPct || 0)),
    [workers],
  );

  const topWorkers = ranked.filter((w) => w.tier === 'top');
  const midWorkers = ranked.filter((w) => w.tier === 'mid');
  const lowWorkers = ranked.filter((w) => w.tier === 'low');
  const topSpeed = ranked.length ? Math.max(...ranked.map((w) => w.speedPct || 0)) : 0;

  const periodBar = (
    <div style={{ display: 'flex', gap: 0, padding: 3, background: T.bg, border: `1px solid ${T.border}`, borderRadius: 7 }}>
      {PERIOD_OPTS.map(p => {
        const on = period === p;
        return (
          <button key={p} onClick={() => setPeriod(p)} style={{
            padding: '4px 12px', borderRadius: 5, border: 0, cursor: 'pointer',
            background: on ? T.surface : 'transparent', color: on ? T.text : T.mutedSoft,
            fontSize: 12, fontWeight: 600,
            boxShadow: on ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
          }}>{p}</button>
        );
      })}
    </div>
  );

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
        <TopBar subtitle="분석" title="성과 분석" actions={
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {periodBar}
            {filterBar}
          </div>
        } />
        <div style={{ padding: 60, textAlign: 'center', color: T.mutedSoft }}>로딩 중...</div>
      </div>
    );
  }

  return (
    <div style={{ flex: 1, overflow: 'auto', background: T.bg, minWidth: 0 }}>
      <TopBar subtitle="분석" title="성과 분석" actions={
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {periodBar}
          {filterBar}
        </div>
      } />
      <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
          {[
            { l: '우수 작업자', v: topWorkers.length, unit: '명', tone: T.success, soft: TIER_BG.top, sub: '속도 110% 이상' },
            { l: '평균 작업자', v: midWorkers.length, unit: '명', tone: T.primary, soft: TIER_BG.mid, sub: '속도 85–109%' },
            { l: '저성과 작업자', v: lowWorkers.length, unit: '명', tone: T.danger, soft: TIER_BG.low, sub: '속도 85% 미만' },
          ].map((k, i) => (
            <Card key={i} pad={18} style={{ position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: k.tone }} />
              <div style={{ fontSize: 12, color: T.muted, fontWeight: 600, marginBottom: 14 }}>{k.l}</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 8 }}>
                <span style={{ fontSize: 36, fontWeight: 700, color: T.text, letterSpacing: -1, lineHeight: 1, fontFamily: 'ui-monospace,monospace' }}>{k.v}</span>
                <span style={{ fontSize: 14, color: T.mutedSoft, fontWeight: 500 }}>{k.unit}</span>
              </div>
              <div style={{ fontSize: 10, color: k.tone, fontWeight: 600, padding: '2px 8px', background: k.soft, borderRadius: 4, display: 'inline-block' }}>{k.sub}</div>
            </Card>
          ))}
        </div>

        <Card pad={0}>
          <div style={{ padding: '14px 20px', borderBottom: `1px solid ${T.borderSoft}`, fontSize: 13, fontWeight: 700, color: T.text }}>작업 속도 랭킹</div>
          {ranked.length === 0 ? (
            <div style={{ padding: 60, textAlign: 'center', color: T.mutedSoft }}>성과 데이터가 없습니다</div>
          ) : ranked.map((w, i) => {
            const barPct = topSpeed ? Math.round(((w.speedPct || 0) / topSpeed) * 100) : 0;
            const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : null;
            const tierColor = w.tier ? TIER_COLOR[w.tier] : T.muted;
            const tierBg = w.tier ? TIER_BG[w.tier] : T.bg;
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
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: T.text }}>{w.name}</span>
                    <span style={{
                      fontSize: 10, fontWeight: 600, padding: '1px 6px', borderRadius: 4,
                      background: w.bc + '20', color: w.bc,
                    }}>{BRANCH_LABEL[w.branch] || w.branch}</span>
                    {w.tier && (
                      <span style={{
                        fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 4,
                        background: tierBg, color: tierColor,
                      }}>{TIER_LABEL[w.tier]}</span>
                    )}
                  </div>
                  <div style={{ height: 5, background: T.bg, borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{ width: `${barPct}%`, height: '100%', background: tierColor }} />
                  </div>
                </div>
                <div style={{ textAlign: 'right', minWidth: 90 }}>
                  <div style={{ fontSize: 22, fontWeight: 700, color: T.text, letterSpacing: -0.4, fontFamily: 'ui-monospace,monospace', lineHeight: 1 }}>{w.speedPct || '—'}</div>
                  <div style={{ fontSize: 10, color: T.mutedSoft, marginTop: 3 }}>% 속도 · {w.stemsWeek}kg/주</div>
                </div>
              </div>
            );
          })}
        </Card>
      </div>
    </div>
  );
}
