import React, { useState } from 'react';
import { GROWTH_SCHEMA, GR_DATA, STANDARD_CURVE } from '../data/growth';
import { Card, Icon, Pill, T, btnSecondary, icons } from '../design/primitives';

// 생육조사 화면 — 지점 (재배팀)
// 4개 화면: 대시보드 / 주별 입력 / 표식주 상세 / 추이·히트맵

// ─────── 공통 유틸 ───────
const toneByDev = (d) => Math.abs(d) <= 3 ? T.success : Math.abs(d) <= 8 ? T.warning : T.danger;
const pct = (actual, target) => target ? Math.round(actual / target * 100) : 0;

// ═══════════════════════════════════════════════════════════
// ① 생육 대시보드
// ═══════════════════════════════════════════════════════════
function GrowthDashboardScreen() {
  const [crop, setCrop] = useState('토마토');
  const weekIdx = GR_DATA.currentWeek - 1;
  const current = GR_DATA.crops.find(c => c.name === crop);
  const schema = GROWTH_SCHEMA[crop] || GROWTH_SCHEMA['토마토'];
  const curve = STANDARD_CURVE[crop] || STANDARD_CURVE['토마토'];

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* 헤더 */}
      <div style={{ background: T.surface, borderBottom: `1px solid ${T.border}` }}>
        <div style={{ padding: '20px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, color: T.mutedSoft, marginBottom: 4 }}>
              <span style={{ padding: '2px 8px', borderRadius: 4, fontWeight: 700, background: T.primarySoft, color: T.primaryText }}>재배팀</span>
              <span>부산LAB · 생육조사</span>
            </div>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: T.text, letterSpacing: -0.4, margin: 0 }}>생육 대시보드</h1>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ padding: '8px 14px', background: T.bg, border: `1px solid ${T.border}`, borderRadius: 8, fontSize: 11, color: T.muted }}>
              <span style={{ color: T.mutedSoft, marginRight: 6 }}>이번 주</span>
              <strong style={{ color: T.text }}>{GR_DATA.calendarWeek}</strong>
              <span style={{ color: T.mutedSoft, margin: '0 6px' }}>·</span>
              <span style={{ color: T.mutedSoft }}>작기 {GR_DATA.currentWeek}주차</span>
            </div>
            <button style={{ padding: '8px 14px', borderRadius: 8, border: 0, background: T.primary, color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Icon d={icons.plus} size={14} c="#fff" sw={2.2} />금주 조사 입력
            </button>
          </div>
        </div>
        {/* 작물 탭 */}
        <div style={{ padding: '0 32px', borderTop: `1px solid ${T.borderSoft}`, display: 'flex', gap: 0 }}>
          {GR_DATA.crops.map(c => {
            const on = c.name === crop;
            return (
              <button key={c.id} onClick={() => setCrop(c.name)} style={{
                padding: '12px 18px', border: 0, background: 'transparent', cursor: 'pointer',
                borderBottom: `2px solid ${on ? T.primary : 'transparent'}`,
                color: on ? T.text : T.mutedSoft,
                fontSize: 13, fontWeight: on ? 700 : 500,
                display: 'flex', alignItems: 'center', gap: 8,
              }}>
                {c.name}
                {c.warn && <Pill tone="danger" size="sm">경고</Pill>}
                <span style={{ fontSize: 10, color: T.mutedSoft, fontWeight: 500 }}>{c.surveyPlants}주</span>
              </button>
            );
          })}
        </div>
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: 24, background: T.bg, display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* KPI — 주차별 변화 중심 */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
          {(() => {
            const ts = GR_DATA.timeseries[crop] || GR_DATA.timeseries['토마토'];
            const last = ts[ts.length - 1];
            const prev = ts[ts.length - 2];
            const cropMeta = GR_DATA.crops.find(c => c.name === crop);
            const totalWeeks = (curve.flowerClusterH || []).length || 12;
            const progress = Math.round(GR_DATA.currentWeek / totalWeeks * 100);
            // WoW 변화
            const growthWoW = last.weeklyGrowth - prev.weeklyGrowth;
            const flowerWoW = last.flowerClusterH - prev.flowerClusterH;
            // 스파크라인 (최근 6주 주간 생장)
            const spark = ts.slice(-6).map(t => t.weeklyGrowth);
            const sMax = Math.max(...spark), sMin = Math.min(...spark);
            const sparkPath = spark.map((v, i) => `${i * 60 / (spark.length - 1)},${24 - (v - sMin) / (sMax - sMin || 1) * 20}`).join(' ');

            const cards = [
              {
                l: '이번 주 생장', v: last.weeklyGrowth, u: 'cm',
                sub: `지난주 ${prev.weeklyGrowth}cm`,
                delta: growthWoW, deltaUnit: 'cm',
                tone: T.text,
                spark: sparkPath,
              },
              {
                l: '화방 높이', v: last.flowerClusterH, u: 'cm',
                sub: `지난주 ${prev.flowerClusterH}cm`,
                delta: flowerWoW, deltaUnit: 'cm',
                tone: T.text,
              },
              {
                l: '누적 착과', v: last.totalFruit, u: '개',
                sub: `지난주 ${prev.totalFruit}개 · +${last.totalFruit - prev.totalFruit}`,
                delta: last.totalFruit - prev.totalFruit, deltaUnit: '개',
                tone: T.text,
              },
              {
                l: '작기 진행', v: GR_DATA.currentWeek, u: `/${totalWeeks}주`,
                sub: `${progress}% 진행`,
                progress,
                tone: T.primary,
              },
            ];

            return cards.map((k, i) => (
              <Card key={i} pad={18}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 11, color: T.muted, fontWeight: 600 }}>{k.l}</span>
                  {typeof k.delta === 'number' && (
                    <span style={{
                      fontSize: 10, fontWeight: 700,
                      color: k.delta >= 0 ? T.success : T.danger,
                      display: 'flex', alignItems: 'center', gap: 2,
                      fontVariantNumeric: 'tabular-nums',
                    }}>
                      <span>{k.delta >= 0 ? '▲' : '▼'}</span>
                      {k.delta >= 0 ? '+' : ''}{k.delta.toFixed(k.deltaUnit === 'cm' ? 1 : 0)}{k.deltaUnit}
                    </span>
                  )}
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginTop: 8 }}>
                  <span style={{ fontSize: 28, fontWeight: 700, color: k.tone, letterSpacing: -0.6, fontVariantNumeric: 'tabular-nums' }}>{k.v}</span>
                  <span style={{ fontSize: 12, color: T.mutedSoft, fontWeight: 500 }}>{k.u}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 6 }}>
                  <span style={{ fontSize: 11, color: T.mutedSoft }}>{k.sub}</span>
                  {k.spark && (
                    <svg width="62" height="26" viewBox="0 0 60 24" style={{ overflow: 'visible' }}>
                      <polyline points={k.spark} fill="none" stroke={T.primary} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
                      <circle cx={60} cy={24 - (spark[spark.length - 1] - sMin) / (sMax - sMin || 1) * 20} r="2.5" fill={T.primary} />
                    </svg>
                  )}
                  {typeof k.progress === 'number' && (
                    <div style={{ width: 62, height: 4, background: T.borderSoft, borderRadius: 999, overflow: 'hidden' }}>
                      <div style={{ width: `${k.progress}%`, height: '100%', background: T.primary }} />
                    </div>
                  )}
                </div>
              </Card>
            ));
          })()}
        </div>

        {/* 항목별 목표 대비 현재값 */}
        <Card>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div>
              <h3 style={{ fontSize: 14, fontWeight: 700, color: T.text, margin: 0 }}>항목별 목표 대비 현재값</h3>
              <div style={{ fontSize: 11, color: T.mutedSoft, marginTop: 2 }}>{crop} · 작기 {GR_DATA.currentWeek}주차 · 표식주 {current.surveyPlants}개 평균</div>
            </div>
            <div style={{ display: 'flex', gap: 10, fontSize: 10, color: T.mutedSoft }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 8, height: 8, borderRadius: 999, background: T.success }} />±3% 이내</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 8, height: 8, borderRadius: 999, background: T.warning }} />±8%</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 8, height: 8, borderRadius: 999, background: T.danger }} />초과</span>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
            {schema.filter(s => s.type !== 'derived').map(s => {
              const target = curve[s.key] ? curve[s.key][weekIdx] : null;
              if (!target) return null;
              // 시뮬레이션: 각 항목에 랜덤하지만 안정적인 편차
              const seed = s.key.charCodeAt(0) + s.key.charCodeAt(1);
              const devPct = current.deviation + (seed % 13 - 6);
              const actual = (target * (1 + devPct / 100));
              const actualDisp = s.step < 1 ? actual.toFixed(1) : Math.round(actual);
              const barPct = Math.min(Math.abs(devPct) / 20 * 50, 50);
              const tone = toneByDev(devPct);
              return (
                <div key={s.key} style={{ padding: '10px 12px', borderRadius: 8, background: T.bg, border: `1px solid ${T.borderSoft}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: T.text }}>{s.label}</span>
                    <span style={{ fontSize: 11, color: T.mutedSoft }}>목표 {target}{s.unit}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                    <span style={{ fontSize: 20, fontWeight: 700, color: T.text, fontVariantNumeric: 'tabular-nums' }}>
                      {actualDisp}<span style={{ fontSize: 10, color: T.mutedSoft, fontWeight: 500, marginLeft: 2 }}>{s.unit}</span>
                    </span>
                    <span style={{ fontSize: 11, fontWeight: 700, color: tone, marginLeft: 'auto', fontVariantNumeric: 'tabular-nums' }}>
                      {devPct >= 0 ? '+' : ''}{devPct}%
                    </span>
                  </div>
                  {/* 중앙선 기준 편차 바 */}
                  <div style={{ position: 'relative', height: 4, marginTop: 6, background: T.borderSoft, borderRadius: 999 }}>
                    <span style={{ position: 'absolute', left: '50%', top: -2, width: 1, height: 8, background: T.mutedSoft }} />
                    <div style={{
                      position: 'absolute', top: 0, height: '100%',
                      left: devPct >= 0 ? '50%' : `${50 - barPct}%`,
                      width: `${barPct}%`,
                      background: tone, borderRadius: 999,
                    }} />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        {/* 이번주 핵심 추이 + 이상 기록 */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 16 }}>
          <Card>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, color: T.text, margin: 0 }}>개화 화방 높이 추이</h3>
              <span style={{ fontSize: 11, color: T.mutedSoft }}>실측 vs 표준 곡선</span>
            </div>
            {(() => {
              const ts = GR_DATA.timeseries[crop] || GR_DATA.timeseries['토마토'];
              const cur = curve.flowerClusterH.slice(0, 12);
              const maxY = Math.max(...cur, ...ts.map(t => t.flowerClusterH));
              return (
                <div style={{ height: 220 }}>
                  <svg viewBox="0 0 520 220" width="100%" height="220" preserveAspectRatio="none">
                    {[0, 55, 110, 165, 220].map((y, i) => <line key={i} x1="0" y1={y} x2="520" y2={y} stroke={T.borderSoft} strokeWidth="1" />)}
                    {/* 표준 곡선 */}
                    <polyline
                      points={cur.map((v, i) => `${i * 520 / 11},${220 - v / maxY * 200}`).join(' ')}
                      fill="none" stroke={T.mutedSoft} strokeWidth="1.5" strokeDasharray="4 3"
                    />
                    {/* 실측 */}
                    <polyline
                      points={ts.map((t, i) => `${i * 520 / 11},${220 - t.flowerClusterH / maxY * 200}`).join(' ')}
                      fill="none" stroke={T.primary} strokeWidth="2.5"
                    />
                    {ts.map((t, i) => (
                      <circle key={i} cx={i * 520 / 11} cy={220 - t.flowerClusterH / maxY * 200} r="4" fill={T.primary} stroke="#fff" strokeWidth="2" />
                    ))}
                    {/* 현재 주차 마커 */}
                    <line x1={(ts.length - 1) * 520 / 11} y1="0" x2={(ts.length - 1) * 520 / 11} y2="220" stroke={T.primary} strokeWidth="1" strokeDasharray="2 2" opacity="0.4" />
                  </svg>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: T.mutedSoft, marginTop: 6 }}>
                    {Array.from({ length: 12 }, (_, i) => <span key={i}>{i + 1}주</span>)}
                  </div>
                  <div style={{ display: 'flex', gap: 14, fontSize: 11, marginTop: 8, justifyContent: 'center' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><span style={{ width: 14, height: 2, background: T.primary }} /><span style={{ color: T.muted }}>실측</span></span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><span style={{ width: 14, height: 2, background: T.mutedSoft, borderTop: `1px dashed ${T.mutedSoft}` }} /><span style={{ color: T.muted }}>표준</span></span>
                  </div>
                </div>
              );
            })()}
          </Card>

          <Card pad={0}>
            <div style={{ padding: '14px 16px', borderBottom: `1px solid ${T.borderSoft}`, display: 'flex', justifyContent: 'space-between' }}>
              <div>
                <h3 style={{ fontSize: 14, fontWeight: 700, color: T.text, margin: 0 }}>이상 개체 기록</h3>
                <span style={{ fontSize: 10, color: T.mutedSoft }}>최근 7일</span>
              </div>
              <button style={{ background: 'none', border: 0, fontSize: 11, color: T.primary, cursor: 'pointer', fontWeight: 600 }}>+ 기록</button>
            </div>
            <div style={{ maxHeight: 240, overflow: 'auto' }}>
              {GR_DATA.incidents.map(inc => {
                const tone = inc.status === 'open' ? T.danger : inc.status === 'monitoring' ? T.warning : T.success;
                const statusLabel = inc.status === 'open' ? '미조치' : inc.status === 'monitoring' ? '모니터링' : '조치완료';
                return (
                  <div key={inc.id} style={{ padding: '12px 16px', borderBottom: `1px solid ${T.borderSoft}`, cursor: 'pointer' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontSize: 11, fontWeight: 700, color: T.text, fontFamily: 'ui-monospace, monospace' }}>{inc.plant}</span>
                        <Pill tone={inc.type === '병해' ? 'danger' : inc.type === '생리장해' ? 'warning' : 'muted'} size="sm">{inc.type}</Pill>
                      </div>
                      <span style={{ fontSize: 10, color: tone, fontWeight: 700 }}>● {statusLabel}</span>
                    </div>
                    <div style={{ fontSize: 11, color: T.muted, marginBottom: 6, lineHeight: 1.4 }}>{inc.note}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 10, color: T.mutedSoft }}>
                      <span>{inc.d}</span>
                      <span>·</span>
                      <span>{inc.reporter}</span>
                      {inc.photos > 0 && (
                        <>
                          <span>·</span>
                          <span style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            <Icon d={icons.camera} size={10} c={T.mutedSoft} />{inc.photos}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>

        {/* 표식주 빠른 접근 */}
        <Card pad={0}>
          <div style={{ padding: '14px 16px', borderBottom: `1px solid ${T.borderSoft}`, display: 'flex', justifyContent: 'space-between' }}>
            <div>
              <h3 style={{ fontSize: 14, fontWeight: 700, color: T.text, margin: 0 }}>표식주 목록</h3>
              <span style={{ fontSize: 11, color: T.mutedSoft }}>{crop} · 8개 표식주 중 전체 표시</span>
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              {btnSecondary('CSV', icons.chart)}
              <button style={{ padding: '6px 12px', borderRadius: 6, border: 0, background: T.primary, color: '#fff', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>+ 표식주 추가</button>
            </div>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: T.bg, borderBottom: `1px solid ${T.border}` }}>
                <th style={{ padding: '10px 16px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: T.muted }}>ID</th>
                <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: T.muted }}>위치</th>
                <th style={{ padding: '10px 12px', textAlign: 'right', fontSize: 10, fontWeight: 700, color: T.muted }}>주간 생장</th>
                <th style={{ padding: '10px 12px', textAlign: 'right', fontSize: 10, fontWeight: 700, color: T.muted }}>화방 높이</th>
                <th style={{ padding: '10px 12px', textAlign: 'right', fontSize: 10, fontWeight: 700, color: T.muted }}>착과</th>
                <th style={{ padding: '10px 12px', textAlign: 'right', fontSize: 10, fontWeight: 700, color: T.muted }}>총 과일</th>
                <th style={{ padding: '10px 12px', textAlign: 'center', fontSize: 10, fontWeight: 700, color: T.muted }}>상태</th>
                <th style={{ padding: '10px 16px', textAlign: 'right', fontSize: 10, fontWeight: 700, color: T.muted, width: 80 }}></th>
              </tr>
            </thead>
            <tbody>
              {GR_DATA.markerPlants.filter(p => p.crop === crop).map(p => (
                <tr key={p.id} style={{ borderBottom: `1px solid ${T.borderSoft}` }}>
                  <td style={{ padding: '10px 16px', fontSize: 12, fontWeight: 700, color: T.text, fontFamily: 'ui-monospace, monospace' }}>{p.id}</td>
                  <td style={{ padding: '10px 12px', fontSize: 11, color: T.muted }}>{p.bed} · {p.row} · {p.no}번</td>
                  <td style={{ padding: '10px 12px', textAlign: 'right', fontSize: 12, color: T.text, fontVariantNumeric: 'tabular-nums' }}>{p.last.weeklyGrowth}<span style={{ fontSize: 9, color: T.mutedSoft }}>cm</span></td>
                  <td style={{ padding: '10px 12px', textAlign: 'right', fontSize: 12, color: T.text, fontVariantNumeric: 'tabular-nums' }}>{p.last.flowerClusterH}<span style={{ fontSize: 9, color: T.mutedSoft }}>cm</span></td>
                  <td style={{ padding: '10px 12px', textAlign: 'right', fontSize: 12, color: T.text, fontVariantNumeric: 'tabular-nums' }}>{p.last.fruitSetCluster}<span style={{ fontSize: 9, color: T.mutedSoft }}>화방</span></td>
                  <td style={{ padding: '10px 12px', textAlign: 'right', fontSize: 12, fontWeight: 700, color: T.text, fontVariantNumeric: 'tabular-nums' }}>{p.last.totalFruit}</td>
                  <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                    {p.health === 'good' ? <Pill tone="success" size="sm">양호</Pill> : <Pill tone="warning" size="sm">주의</Pill>}
                  </td>
                  <td style={{ padding: '10px 16px', textAlign: 'right' }}>
                    <button style={{ padding: '4px 10px', borderRadius: 6, border: `1px solid ${T.border}`, background: T.surface, color: T.muted, fontSize: 11, cursor: 'pointer' }}>상세 →</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// ② 주별 입력 폼
// ═══════════════════════════════════════════════════════════
function GrowthInputScreen() {
  const [crop, setCrop] = useState('토마토');
  const [selectedWeek, setSelectedWeek] = useState(GR_DATA.currentWeek);
  const schema = GROWTH_SCHEMA[crop];
  const plants = GR_DATA.markerPlants.filter(p => p.crop === crop);
  const curve = STANDARD_CURVE[crop];
  const totalWeeks = (curve.flowerClusterH || []).length || 12;
  const weekIdx = selectedWeek - 1;
  const isPast = selectedWeek < GR_DATA.currentWeek;
  const isFuture = selectedWeek > GR_DATA.currentWeek;
  const isCurrent = selectedWeek === GR_DATA.currentWeek;
  const readOnly = isPast;

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ background: T.surface, borderBottom: `1px solid ${T.border}`, padding: '20px 32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: T.mutedSoft, marginBottom: 6 }}>
          <span style={{ cursor: 'pointer' }}>생육조사</span><span>›</span>
          <span style={{ color: T.text, fontWeight: 600 }}>주별 기록 입력</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: T.text, letterSpacing: -0.4, margin: 0 }}>주별 생육 기록 입력</h1>
            <div style={{ fontSize: 12, color: T.muted, marginTop: 4 }}>{GR_DATA.calendarWeek} ({GR_DATA.date}) · 작기 {GR_DATA.currentWeek}주차 · {plants.length}개 표식주</div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {btnSecondary('지난 주 값 불러오기', icons.clock)}
            {btnSecondary('임시 저장', icons.check)}
            <button disabled={readOnly} style={{
              padding: '8px 16px', borderRadius: 7, border: 0,
              background: readOnly ? T.borderSoft : T.primary,
              color: readOnly ? T.mutedSoft : '#fff',
              fontSize: 12, fontWeight: 700, cursor: readOnly ? 'not-allowed' : 'pointer',
            }}>{readOnly ? '과거 기록 (읽기 전용)' : '저장 · 제출'}</button>
          </div>
        </div>

        {/* 주차 선택 스텝퍼 */}
        <div style={{ marginTop: 14, display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ fontSize: 11, color: T.mutedSoft, fontWeight: 600 }}>조사 주차</div>
          <button
            onClick={() => setSelectedWeek(Math.max(1, selectedWeek - 1))}
            disabled={selectedWeek <= 1}
            style={{ width: 28, height: 28, borderRadius: 6, border: `1px solid ${T.border}`, background: T.surface, color: T.muted, cursor: selectedWeek <= 1 ? 'not-allowed' : 'pointer', opacity: selectedWeek <= 1 ? 0.4 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon d={icons.chevLeft} size={14} c={T.muted} sw={2} />
          </button>
          {/* 주차 셀 */}
          <div style={{ display: 'flex', gap: 4, background: T.bg, padding: 4, borderRadius: 8 }}>
            {Array.from({ length: totalWeeks }, (_, i) => {
              const w = i + 1;
              const on = w === selectedWeek;
              const past = w < GR_DATA.currentWeek;
              const cur = w === GR_DATA.currentWeek;
              const future = w > GR_DATA.currentWeek;
              return (
                <button key={w} onClick={() => setSelectedWeek(w)} title={future ? '미래 주차' : past ? '제출 완료' : '이번 주'} style={{
                  minWidth: 38, padding: '6px 0', fontSize: 11, fontWeight: 700, cursor: future ? 'not-allowed' : 'pointer',
                  border: 0, borderRadius: 5, position: 'relative',
                  background: on ? T.primary : 'transparent',
                  color: on ? '#fff' : future ? T.mutedSoft : past ? T.muted : T.text,
                  opacity: future ? 0.5 : 1,
                  fontVariantNumeric: 'tabular-nums',
                }} disabled={future}>
                  {w}
                  {past && !on && <span style={{ position: 'absolute', bottom: 2, left: '50%', transform: 'translateX(-50%)', width: 3, height: 3, borderRadius: 999, background: T.success }} />}
                  {cur && !on && <span style={{ position: 'absolute', bottom: 2, left: '50%', transform: 'translateX(-50%)', width: 3, height: 3, borderRadius: 999, background: T.primary }} />}
                </button>
              );
            })}
          </div>
          <button
            onClick={() => setSelectedWeek(Math.min(totalWeeks, selectedWeek + 1))}
            disabled={selectedWeek >= GR_DATA.currentWeek}
            style={{ width: 28, height: 28, borderRadius: 6, border: `1px solid ${T.border}`, background: T.surface, color: T.muted, cursor: selectedWeek >= GR_DATA.currentWeek ? 'not-allowed' : 'pointer', opacity: selectedWeek >= GR_DATA.currentWeek ? 0.4 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon d={icons.chevRight} size={14} c={T.muted} sw={2} />
          </button>

          <div style={{ marginLeft: 6, display: 'flex', gap: 6, alignItems: 'center' }}>
            {isPast && <Pill tone="muted" size="sm">과거 · 읽기 전용</Pill>}
            {isCurrent && <Pill tone="primary" size="sm">● 이번 주 · 입력 중</Pill>}
            {isFuture && <Pill tone="warning" size="sm">예정</Pill>}
          </div>

          <div style={{ marginLeft: 'auto', display: 'flex', gap: 12, fontSize: 10, color: T.mutedSoft, alignItems: 'center' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 5, height: 5, borderRadius: 999, background: T.success }} />제출 완료</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 5, height: 5, borderRadius: 999, background: T.primary }} />이번 주</span>
          </div>
        </div>

        <div style={{ marginTop: 14, display: 'flex', gap: 0 }}>
          {GR_DATA.crops.map(c => {
            const on = c.name === crop;
            return (
              <button key={c.id} onClick={() => setCrop(c.name)} style={{
                padding: '8px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer',
                border: `1px solid ${on ? T.primary : T.border}`,
                background: on ? T.primarySoft : T.surface,
                color: on ? T.primaryText : T.muted,
                marginRight: 6, borderRadius: 6,
              }}>{c.name}</button>
            );
          })}
        </div>
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: 24, background: T.bg, display: 'flex', flexDirection: 'column', gap: 16 }}>
        <Card style={{ background: T.primarySoft, borderLeft: `3px solid ${T.primary}` }} pad={12}>
          <div style={{ fontSize: 12, color: T.primaryText, lineHeight: 1.6 }}>
            <strong>입력 가이드:</strong> 표식주 {plants.length}개 각각의 값을 입력합니다. 이전 주 값 대비 크게 벗어나면 자동으로 노란색 경고가 표시됩니다. 파생 항목(예: 엽장/엽폭 비율)은 자동 계산됩니다.
          </div>
        </Card>

        <Card pad={0}>
          <div style={{ overflow: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 1100 }}>
              <thead>
                <tr style={{ background: T.bg, borderBottom: `2px solid ${T.border}` }}>
                  <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: T.muted, position: 'sticky', left: 0, background: T.bg, zIndex: 2, minWidth: 100 }}>표식주</th>
                  {schema.map(s => {
                    const target = curve[s.key]?.[weekIdx];
                    return (
                      <th key={s.key} style={{ padding: '8px 10px', textAlign: 'center', fontSize: 10, fontWeight: 700, color: T.muted, borderLeft: `1px solid ${T.borderSoft}`, minWidth: s.type === 'derived' ? 70 : 90 }}>
                        <div style={{ fontSize: 10, color: T.text }}>{s.label}</div>
                        <div style={{ fontSize: 9, color: T.mutedSoft, fontWeight: 500, marginTop: 2 }}>
                          {s.unit && `(${s.unit})`}
                          {s.type === 'derived' && <span style={{ color: T.primary }}> · 자동</span>}
                          {target && <span style={{ display: 'block', marginTop: 1 }}>목표 {target}</span>}
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {plants.map((p, rowIdx) => (
                  <tr key={p.id} style={{ borderBottom: `1px solid ${T.borderSoft}` }}>
                    <td style={{ padding: '8px 12px', fontSize: 11, fontWeight: 700, color: T.text, fontFamily: 'ui-monospace, monospace', position: 'sticky', left: 0, background: rowIdx % 2 === 0 ? T.surface : T.bg, zIndex: 1 }}>
                      {p.id}
                      <div style={{ fontSize: 9, color: T.mutedSoft, fontWeight: 500 }}>{p.bed} · {p.no}번</div>
                    </td>
                    {schema.map(s => {
                      const val = p.last[s.key];
                      const target = curve[s.key]?.[weekIdx];
                      const dev = target && typeof val === 'number' ? (val - target) / target * 100 : 0;
                      const warn = Math.abs(dev) > 15;
                      if (s.type === 'derived') {
                        const computed = s.formula ? s.formula(p.last) : '-';
                        return (
                          <td key={s.key} style={{ padding: '6px 8px', textAlign: 'center', borderLeft: `1px solid ${T.borderSoft}`, background: T.bg }}>
                            <div style={{ padding: '7px 0', fontSize: 12, fontWeight: 700, color: T.primary, fontVariantNumeric: 'tabular-nums' }}>{computed}</div>
                          </td>
                        );
                      }
                      return (
                        <td key={s.key} style={{ padding: '6px 8px', textAlign: 'center', borderLeft: `1px solid ${T.borderSoft}` }}>
                          <input
                            type="number" step={s.step} defaultValue={val}
                            readOnly={readOnly}
                            style={{
                              width: '100%', padding: '6px 6px', fontSize: 12, fontWeight: 600,
                              textAlign: 'center', fontVariantNumeric: 'tabular-nums',
                              border: `1px solid ${warn ? T.warning : T.border}`,
                              borderRadius: 4,
                              background: readOnly ? T.bg : (warn ? `${T.warning}12` : T.surface),
                              color: readOnly ? T.muted : T.text,
                              cursor: readOnly ? 'default' : 'text',
                            }}
                          />
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <Card>
            <h3 style={{ fontSize: 13, fontWeight: 700, color: T.text, margin: 0, marginBottom: 10 }}>이번 주 전체 메모</h3>
            <textarea
              placeholder="온실 환경, 병해충, 특이사항 등..."
              style={{ width: '100%', minHeight: 90, padding: 10, border: `1px solid ${T.border}`, borderRadius: 6, fontSize: 12, color: T.text, background: T.surface, fontFamily: 'inherit', resize: 'vertical' }}
              defaultValue="4/24 새벽 최저 12℃ · 야간 기온 하강으로 파프리카 일부 개체 생장 지연 관찰. 화방 높이 관찰 지속 필요."
            />
          </Card>
          <Card>
            <h3 style={{ fontSize: 13, fontWeight: 700, color: T.text, margin: 0, marginBottom: 10 }}>이상 발생 시 개체 지정</h3>
            <div style={{ fontSize: 11, color: T.mutedSoft, marginBottom: 10 }}>이상이 있는 개체만 체크 후 사진 첨부</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {plants.slice(0, 3).map(p => (
                <label key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', background: T.bg, borderRadius: 6, cursor: 'pointer' }}>
                  <input type="checkbox" defaultChecked={p.health === 'warn'} />
                  <span style={{ fontSize: 12, fontWeight: 600, color: T.text, fontFamily: 'ui-monospace, monospace' }}>{p.id}</span>
                  <span style={{ fontSize: 11, color: T.muted, flex: 1 }}>{p.note || ''}</span>
                  {p.health === 'warn' && <button style={{ padding: '3px 9px', fontSize: 10, border: 0, background: T.warning, color: '#fff', borderRadius: 4, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}><Icon d={icons.camera} size={10} c="#fff" />사진</button>}
                </label>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// ③ 표식주 상세
// ═══════════════════════════════════════════════════════════
function GrowthMarkerDetailScreen() {
  const p = GR_DATA.markerPlants[0];
  const schema = GROWTH_SCHEMA[p.crop];
  const curve = STANDARD_CURVE[p.crop];
  const ts = GR_DATA.timeseries[p.crop];
  const weekIdx = GR_DATA.currentWeek - 1;

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ background: T.surface, borderBottom: `1px solid ${T.border}`, padding: '20px 32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: T.mutedSoft, marginBottom: 8 }}>
          <span style={{ cursor: 'pointer' }}>생육조사</span><span>›</span>
          <span style={{ cursor: 'pointer' }}>{p.crop}</span><span>›</span>
          <span style={{ color: T.text, fontWeight: 600, fontFamily: 'ui-monospace, monospace' }}>{p.id}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{
            width: 64, height: 64, borderRadius: 10,
            background: `linear-gradient(135deg, ${T.success}, ${T.primary})`,
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff',
          }}>
            <Icon d={icons.sprout} size={28} c="#fff" sw={2} />
          </div>
          <div style={{ flex: 1 }}>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: T.text, letterSpacing: -0.4, margin: 0, fontFamily: 'ui-monospace, monospace' }}>{p.id}</h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 12, color: T.muted, marginTop: 4 }}>
              <span>{p.crop} · {p.bed} 베드 · {p.row} · {p.no}번</span>
              <span>정식 {p.start} (작기 {GR_DATA.currentWeek}주차)</span>
              <Pill tone={p.health === 'good' ? 'success' : 'warning'}>{p.health === 'good' ? '양호' : '주의'}</Pill>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {btnSecondary('이전 개체', icons.chevLeft)}
            {btnSecondary('다음 개체', icons.chevRight)}
            <button style={{ padding: '8px 14px', borderRadius: 7, border: 0, background: T.primary, color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>이번주 입력</button>
          </div>
        </div>
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: 24, background: T.bg, display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* 현재 주 스냅샷 */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12 }}>
          {['weeklyGrowth', 'flowerClusterH', 'flowerClusterLen', 'fruitSetCluster', 'totalFruit'].map(key => {
            const s = schema.find(x => x.key === key);
            if (!s) return null;
            const val = p.last[key];
            const target = curve[key]?.[weekIdx];
            const dev = target ? Math.round((val - target) / target * 100) : 0;
            return (
              <Card key={key} pad={16}>
                <div style={{ fontSize: 11, color: T.muted, fontWeight: 600 }}>{s.label}</div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginTop: 6 }}>
                  <span style={{ fontSize: 24, fontWeight: 700, color: T.text, letterSpacing: -0.5, fontVariantNumeric: 'tabular-nums' }}>{val}</span>
                  <span style={{ fontSize: 11, color: T.mutedSoft, fontWeight: 500 }}>{s.unit}</span>
                </div>
                {target && (
                  <div style={{ fontSize: 10, color: toneByDev(dev), marginTop: 4, fontWeight: 600 }}>
                    목표 {target}{s.unit} · {dev >= 0 ? '+' : ''}{dev}%
                  </div>
                )}
              </Card>
            );
          })}
        </div>

        {/* 시계열 + 최근 기록 테이블 */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 16 }}>
          <Card>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, color: T.text, margin: 0 }}>생육 추이 (정식 후 주차별)</h3>
              <div style={{ display: 'flex', gap: 10, fontSize: 11 }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><span style={{ width: 12, height: 2, background: T.primary }} /><span style={{ color: T.muted }}>실측</span></span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><span style={{ width: 12, height: 2, background: T.mutedSoft, borderTop: `1px dashed ${T.mutedSoft}` }} /><span style={{ color: T.muted }}>표준</span></span>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[
                { key: 'flowerClusterH', label: '개화 화방 높이 (cm)' },
                { key: 'weeklyGrowth', label: '주간 생장길이 (cm)' },
                { key: 'totalFruit', label: '총 과일 수 (개)' },
              ].map(metric => {
                const actual = ts.map(t => t[metric.key]);
                const std = curve[metric.key].slice(0, ts.length);
                const maxY = Math.max(...actual, ...std) * 1.1;
                return (
                  <div key={metric.key}>
                    <div style={{ fontSize: 11, color: T.muted, fontWeight: 600, marginBottom: 4 }}>{metric.label}</div>
                    <svg viewBox="0 0 440 80" width="100%" height="70" preserveAspectRatio="none">
                      <polyline points={std.map((v, i) => `${i * 440 / (ts.length - 1)},${80 - v / maxY * 70}`).join(' ')} fill="none" stroke={T.mutedSoft} strokeWidth="1.3" strokeDasharray="4 3" />
                      <polyline points={actual.map((v, i) => `${i * 440 / (ts.length - 1)},${80 - v / maxY * 70}`).join(' ')} fill="none" stroke={T.primary} strokeWidth="2" />
                      {actual.map((v, i) => <circle key={i} cx={i * 440 / (ts.length - 1)} cy={80 - v / maxY * 70} r="3" fill={T.primary} stroke="#fff" strokeWidth="1.5" />)}
                    </svg>
                  </div>
                );
              })}
            </div>
          </Card>

          <Card pad={0}>
            <div style={{ padding: '14px 16px', borderBottom: `1px solid ${T.borderSoft}` }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, color: T.text, margin: 0 }}>최근 기록</h3>
              <span style={{ fontSize: 11, color: T.mutedSoft }}>최근 8주</span>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: T.bg, borderBottom: `1px solid ${T.border}` }}>
                  <th style={{ padding: '8px 14px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: T.muted }}>주차</th>
                  <th style={{ padding: '8px 10px', textAlign: 'right', fontSize: 10, fontWeight: 700, color: T.muted }}>생장</th>
                  <th style={{ padding: '8px 10px', textAlign: 'right', fontSize: 10, fontWeight: 700, color: T.muted }}>화방 H</th>
                  <th style={{ padding: '8px 10px', textAlign: 'right', fontSize: 10, fontWeight: 700, color: T.muted }}>과일</th>
                  <th style={{ padding: '8px 14px', textAlign: 'center', fontSize: 10, fontWeight: 700, color: T.muted }}>편차</th>
                </tr>
              </thead>
              <tbody>
                {ts.slice().reverse().map((t, i) => {
                  const dev = Math.round((t.flowerClusterH - curve.flowerClusterH[t.week - 1]) / curve.flowerClusterH[t.week - 1] * 100);
                  return (
                    <tr key={t.week} style={{ borderBottom: `1px solid ${T.borderSoft}`, background: i === 0 ? T.primarySoft : 'transparent' }}>
                      <td style={{ padding: '8px 14px', fontSize: 11, fontWeight: 600, color: T.text }}>{t.label}{i === 0 && <span style={{ marginLeft: 4, fontSize: 9, color: T.primary }}>NOW</span>}</td>
                      <td style={{ padding: '8px 10px', textAlign: 'right', fontSize: 11, color: T.muted, fontVariantNumeric: 'tabular-nums' }}>{t.weeklyGrowth}</td>
                      <td style={{ padding: '8px 10px', textAlign: 'right', fontSize: 11, color: T.muted, fontVariantNumeric: 'tabular-nums' }}>{t.flowerClusterH}</td>
                      <td style={{ padding: '8px 10px', textAlign: 'right', fontSize: 11, fontWeight: 600, color: T.text, fontVariantNumeric: 'tabular-nums' }}>{t.totalFruit}</td>
                      <td style={{ padding: '8px 14px', textAlign: 'center', fontSize: 11, fontWeight: 700, color: toneByDev(dev), fontVariantNumeric: 'tabular-nums' }}>{dev >= 0 ? '+' : ''}{dev}%</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Card>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// ④ 추이 · 히트맵
// ═══════════════════════════════════════════════════════════
function GrowthHeatmapScreen() {
  const [crop, setCrop] = useState('토마토');
  const schema = GROWTH_SCHEMA[crop].filter(s => s.type !== 'derived');
  const curve = STANDARD_CURVE[crop];
  const plants = GR_DATA.markerPlants.filter(p => p.crop === crop);
  const weekIdx = GR_DATA.currentWeek - 1;

  // 히트맵: 행=표식주, 열=항목, 셀=현재주 편차 %
  const cellColor = (dev) => {
    const a = Math.abs(dev);
    if (a <= 3) return T.success;
    if (a <= 8) return T.warning;
    return T.danger;
  };

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ background: T.surface, borderBottom: `1px solid ${T.border}`, padding: '20px 32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 11, color: T.mutedSoft, marginBottom: 4 }}>부산LAB · 생육조사</div>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: T.text, letterSpacing: -0.4, margin: 0 }}>목표 곡선 대비 편차 히트맵</h1>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {GR_DATA.crops.map(c => {
              const on = c.name === crop;
              return (
                <button key={c.id} onClick={() => setCrop(c.name)} style={{
                  padding: '6px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer',
                  border: `1px solid ${on ? T.primary : T.border}`,
                  background: on ? T.primarySoft : T.surface,
                  color: on ? T.primaryText : T.muted,
                  borderRadius: 6,
                }}>{c.name}</button>
              );
            })}
          </div>
        </div>
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: 24, background: T.bg, display: 'flex', flexDirection: 'column', gap: 16 }}>
        <Card style={{ background: T.primarySoft }} pad={12}>
          <div style={{ fontSize: 12, color: T.primaryText, lineHeight: 1.6 }}>
            각 셀은 <strong>표식주 × 조사항목</strong>의 목표 대비 편차(%). <span style={{ color: T.success, fontWeight: 700 }}>● 초록</span> ±3% 이내 / <span style={{ color: T.warning, fontWeight: 700 }}>● 주황</span> ±8% / <span style={{ color: T.danger, fontWeight: 700 }}>● 빨강</span> 초과.
          </div>
        </Card>

        <Card pad={0}>
          <div style={{ padding: '14px 16px', borderBottom: `1px solid ${T.borderSoft}`, display: 'flex', justifyContent: 'space-between' }}>
            <div>
              <h3 style={{ fontSize: 14, fontWeight: 700, color: T.text, margin: 0 }}>{crop} · 작기 {GR_DATA.currentWeek}주차 편차</h3>
              <span style={{ fontSize: 11, color: T.mutedSoft }}>표식주 {plants.length}개 × 조사항목 {schema.length}개</span>
            </div>
            {btnSecondary('CSV 내보내기', icons.chart)}
          </div>
          <div style={{ overflow: 'auto', padding: 12 }}>
            <table style={{ borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={{ padding: '8px 12px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: T.muted, position: 'sticky', left: 0, background: T.surface, zIndex: 2 }}>표식주</th>
                  {schema.map(s => (
                    <th key={s.key} style={{ padding: '8px 4px', fontSize: 9, fontWeight: 700, color: T.muted, minWidth: 64, maxWidth: 64 }}>
                      <div style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)', whiteSpace: 'nowrap', height: 90 }}>{s.label}</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {plants.map(p => (
                  <tr key={p.id}>
                    <td style={{ padding: '4px 12px', fontSize: 11, fontWeight: 700, color: T.text, fontFamily: 'ui-monospace, monospace', position: 'sticky', left: 0, background: T.surface, whiteSpace: 'nowrap' }}>{p.id}</td>
                    {schema.map(s => {
                      const target = curve[s.key]?.[weekIdx];
                      const val = p.last[s.key];
                      if (!target || typeof val !== 'number') {
                        return <td key={s.key} style={{ width: 64, height: 40 }}><div style={{ background: T.borderSoft, margin: 1, height: 36, borderRadius: 3 }} /></td>;
                      }
                      const dev = Math.round((val - target) / target * 100);
                      const color = cellColor(dev);
                      return (
                        <td key={s.key} style={{ padding: 0, width: 64, height: 40 }}>
                          <div style={{
                            background: `${color}${Math.abs(dev) <= 3 ? '28' : Math.abs(dev) <= 8 ? '55' : '88'}`,
                            margin: 1, height: 36, borderRadius: 3,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 11, fontWeight: 700, color: Math.abs(dev) > 8 ? '#fff' : color,
                            fontVariantNumeric: 'tabular-nums',
                          }}>{dev >= 0 ? '+' : ''}{dev}</div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* 항목별 분포 바 */}
        <Card>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: T.text, margin: 0, marginBottom: 4 }}>항목별 표식주 편차 분포</h3>
          <div style={{ fontSize: 11, color: T.mutedSoft, marginBottom: 14 }}>각 항목에서 표식주가 목표 대비 어떻게 분포하는지</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {schema.slice(0, 8).map(s => {
              const devs = plants.map(p => {
                const t = curve[s.key]?.[weekIdx];
                const v = p.last[s.key];
                return t && typeof v === 'number' ? Math.round((v - t) / t * 100) : 0;
              });
              const bins = { good: 0, warn: 0, bad: 0 };
              devs.forEach(d => {
                if (Math.abs(d) <= 3) bins.good++;
                else if (Math.abs(d) <= 8) bins.warn++;
                else bins.bad++;
              });
              const total = plants.length;
              return (
                <div key={s.key} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 150, fontSize: 12, fontWeight: 600, color: T.text }}>{s.label}</div>
                  <div style={{ flex: 1, height: 22, background: T.bg, borderRadius: 5, overflow: 'hidden', display: 'flex' }}>
                    <div style={{ width: `${bins.good / total * 100}%`, background: T.success, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: '#fff' }}>{bins.good > 0 && bins.good}</div>
                    <div style={{ width: `${bins.warn / total * 100}%`, background: T.warning, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: '#fff' }}>{bins.warn > 0 && bins.warn}</div>
                    <div style={{ width: `${bins.bad / total * 100}%`, background: T.danger, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: '#fff' }}>{bins.bad > 0 && bins.bad}</div>
                  </div>
                  <div style={{ width: 70, fontSize: 11, color: T.mutedSoft, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{total}개</div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>
    </div>
  );
}
export { GrowthDashboardScreen, GrowthHeatmapScreen, GrowthInputScreen, GrowthMarkerDetailScreen };
