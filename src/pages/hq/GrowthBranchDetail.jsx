import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { T, Card, Pill, icons, btnSecondary } from '../../design/primitives';
import { HQPageHeader } from './_pages';
import { HQ_GR_DATA } from './GrowthCompare';

const BRANCH_META = {
  busan:  { name: '부산LAB', accent: T.primary,  accentSoft: T.primarySoft  },
  jinju:  { name: '진주HUB', accent: T.success,  accentSoft: T.successSoft  },
  hadong: { name: '하동HUB', accent: T.warning,  accentSoft: T.warningSoft  },
};

const toneByHealth = (h) => h >= 90 ? T.success : h >= 80 ? T.warning : T.danger;
const toneByDev    = (d) => Math.abs(d) <= 3 ? T.success : Math.abs(d) <= 8 ? T.warning : T.danger;

export function HQGrowthBranchDetailScreen() {
  const { branchId } = useParams();
  const navigate = useNavigate();
  const meta = BRANCH_META[branchId];
  const branch = HQ_GR_DATA.branches.find(b => b.id === branchId);

  if (!meta || !branch) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: T.muted }}>
        알 수 없는 지점 코드입니다.
      </div>
    );
  }

  const avgHealth    = Math.round(branch.crops.reduce((s, c) => s + c.health, 0) / branch.crops.length);
  const totalPlants  = branch.crops.reduce((s, c) => s + c.plants, 0);
  const totalOpen    = branch.crops.reduce((s, c) => s + c.open, 0);
  const criticalCrops = branch.crops.filter(c => Math.abs(c.dev) > 8 || c.health < 80);

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <HQPageHeader
        subtitle="생육 현황 › 지점 상세"
        title={meta.name}
        actions={btnSecondary('목록으로', icons.chevronLeft, () => navigate('/admin/hq/growth'))}
      />

      <div style={{ flex: 1, overflow: 'auto', padding: 24, background: T.bg, display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* KPI 4개 */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
          {[
            { l: '평균 건전도', v: avgHealth, u: '%', sub: `${branch.crops.length}개 작물 가중평균`, tone: toneByHealth(avgHealth) },
            { l: '추적 표식주', v: totalPlants, u: '주', sub: `${branch.crops.length}개 작물`, tone: T.text },
            { l: '미조치 이상', v: totalOpen, u: '건', sub: '전체 작물 합계', tone: totalOpen > 0 ? T.danger : T.success },
            { l: '주의 작물', v: criticalCrops.length, u: '종', sub: '편차 초과 또는 건전도 하락', tone: criticalCrops.length > 0 ? T.warning : T.success },
          ].map((k, i) => (
            <Card key={i} pad={20} style={{ position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: k.tone }} />
              <div style={{ fontSize: 12, color: T.muted, fontWeight: 600, marginBottom: 12 }}>{k.l}</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                <span style={{ fontSize: 28, fontWeight: 700, color: T.text, letterSpacing: -0.8, lineHeight: 1 }}>{k.v}</span>
                {k.u && <span style={{ fontSize: 12, color: T.mutedSoft, fontWeight: 600 }}>{k.u}</span>}
              </div>
              <div style={{ fontSize: 11, color: T.mutedSoft, marginTop: 8 }}>{k.sub}</div>
            </Card>
          ))}
        </div>

        {/* 작물별 상세 테이블 */}
        <Card pad={0}>
          <div style={{ padding: '14px 20px', borderBottom: `1px solid ${T.borderSoft}`, fontSize: 13, fontWeight: 700, color: T.text }}>
            작물별 생육 상세
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: T.bg, borderBottom: `1px solid ${T.border}` }}>
                <th style={{ padding: '10px 20px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: T.muted }}>작물</th>
                <th style={{ padding: '10px 12px', textAlign: 'right', fontSize: 10, fontWeight: 700, color: T.muted }}>작기</th>
                <th style={{ padding: '10px 12px', textAlign: 'right', fontSize: 10, fontWeight: 700, color: T.muted }}>표식주</th>
                <th style={{ padding: '10px 12px', textAlign: 'right', fontSize: 10, fontWeight: 700, color: T.muted }}>건전도</th>
                <th style={{ padding: '10px 20px', textAlign: 'center', fontSize: 10, fontWeight: 700, color: T.muted, minWidth: 200 }}>목표 대비 편차</th>
                <th style={{ padding: '10px 14px', textAlign: 'center', fontSize: 10, fontWeight: 700, color: T.muted }}>이상</th>
              </tr>
            </thead>
            <tbody>
              {branch.crops.map((c) => {
                const devPct = Math.min(Math.abs(c.dev) / 15 * 50, 50);
                const tone = toneByDev(c.dev);
                return (
                  <tr key={c.name} style={{ borderBottom: `1px solid ${T.borderSoft}` }}>
                    <td style={{ padding: '14px 20px' }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: T.text, marginBottom: 6 }}>{c.name}</div>
                      <div style={{ position: 'relative', height: 4, background: T.borderSoft, borderRadius: 999 }}>
                        <div style={{ position: 'absolute', left: 0, top: 0, width: `${c.health}%`, height: '100%', background: toneByHealth(c.health), borderRadius: 999 }} />
                      </div>
                    </td>
                    <td style={{ padding: '14px 12px', textAlign: 'right', fontSize: 12, color: T.muted, fontVariantNumeric: 'tabular-nums' }}>{c.week}주</td>
                    <td style={{ padding: '14px 12px', textAlign: 'right', fontSize: 12, color: T.muted, fontVariantNumeric: 'tabular-nums' }}>{c.plants}</td>
                    <td style={{ padding: '14px 12px', textAlign: 'right', fontSize: 13, fontWeight: 700, color: toneByHealth(c.health), fontVariantNumeric: 'tabular-nums' }}>{c.health}%</td>
                    <td style={{ padding: '14px 20px' }}>
                      <div style={{ position: 'relative', height: 18, background: T.bg, borderRadius: 4 }}>
                        <span style={{ position: 'absolute', left: '50%', top: 0, width: 1, height: '100%', background: T.mutedSoft }} />
                        <div style={{
                          position: 'absolute', top: 3, height: 12,
                          left: c.dev >= 0 ? '50%' : `${50 - devPct}%`,
                          width: `${devPct}%`,
                          background: tone, borderRadius: 3,
                        }} />
                        <span style={{
                          position: 'absolute', top: '50%', transform: 'translateY(-50%)',
                          [c.dev >= 0 ? 'right' : 'left']: 6,
                          fontSize: 10, fontWeight: 700, color: T.text,
                        }}>{c.dev >= 0 ? '+' : ''}{c.dev}%</span>
                      </div>
                    </td>
                    <td style={{ padding: '14px 14px', textAlign: 'center' }}>
                      {c.open > 0
                        ? <Pill tone="danger" size="sm">{c.open}건</Pill>
                        : <span style={{ fontSize: 11, color: T.mutedSoft }}>—</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>

        {/* 주의 필요 섹션 */}
        {criticalCrops.length > 0 && (
          <Card style={{ borderLeft: `3px solid ${T.warning}` }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
              <div style={{ fontSize: 24 }}>⚠</div>
              <div style={{ flex: 1 }}>
                <h3 style={{ fontSize: 13, fontWeight: 700, color: T.text, margin: 0, marginBottom: 6 }}>주의 필요 작물</h3>
                <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12, color: T.muted, lineHeight: 1.8 }}>
                  {criticalCrops.map(c => (
                    <li key={c.name}>
                      <strong style={{ color: T.text }}>{c.name}</strong>
                      {' — '}편차 {c.dev >= 0 ? '+' : ''}{c.dev}%, 건전도 {c.health}%
                      {c.open > 0 && <span> · 미조치 이상 {c.open}건</span>}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
