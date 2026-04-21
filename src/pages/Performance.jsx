import React, { useState } from 'react';
import { HQ } from '../design/hq-shell';
import { usePerformanceData } from '../hooks/usePerformanceData';
import { Avatar, Card, Dot, Icon, Pill, T, btnSecondary, icons } from '../design/primitives';

// 작업자 성과 관리 페이지 — HQ 전사 / 지점 / 개인 상세 / 비교 뷰
// 정규화 설계: 표준공수(SAM) 기반 효율 % + 수확 달성률 % + 드릴다운 실측(주/분)
// "주(株)" = 한 포기 개체 단위

// ─────── 표준 공수(SAM) 테이블 — 작물 × 작업 ───────
// 분/주 (표준). TODO: 실제 값으로 교체
const SAM = {
  '토마토':     { 정식: 0.30, 유인: 0.24, 적엽: 0.18, 적화: 0.22, 적과: 0.20, 수확: 0.28, '줄 내리기': 0.12, 측지제거: 0.16, '선별·포장': 0.15, 방제: 0.08 },
  '딸기':       { 정식: 0.28, 유인: 0.20, 적엽: 0.14, 적화: 0.18, 적과: 0.18, 수확: 0.24, '줄 내리기': 0.10, 측지제거: 0.14, '선별·포장': 0.18, 방제: 0.08 },
  '파프리카':   { 정식: 0.32, 유인: 0.26, 적엽: 0.20, 적화: 0.22, 적과: 0.22, 수확: 0.30, '줄 내리기': 0.14, 측지제거: 0.18, '선별·포장': 0.16, 방제: 0.09 },
  '오이':       { 정식: 0.30, 유인: 0.28, 적엽: 0.22, 적화: 0.20, 적과: 0.20, 수확: 0.26, '줄 내리기': 0.14, 측지제거: 0.20, '선별·포장': 0.14, 방제: 0.08 },
  '애호박':     { 정식: 0.32, 유인: 0.26, 적엽: 0.22, 적화: 0.22, 적과: 0.22, 수확: 0.30, '줄 내리기': 0.14, 측지제거: 0.18, '선별·포장': 0.18, 방제: 0.09 },
  '방울토마토': { 정식: 0.28, 유인: 0.22, 적엽: 0.16, 적화: 0.20, 적과: 0.18, 수확: 0.32, '줄 내리기': 0.11, 측지제거: 0.15, '선별·포장': 0.20, 방제: 0.08 },
  '고추':       { 정식: 0.26, 유인: 0.20, 적엽: 0.14, 적화: 0.18, 적과: 0.18, 수확: 0.26, '줄 내리기': 0.10, 측지제거: 0.14, '선별·포장': 0.14, 방제: 0.08 },
};

// ─────── 데이터 ───────
const PERF_DATA = {
  harvestGoalPct: 100, // 수확 달성률 목표
  branches: [
    { id: 'busan',  name: '부산LAB',  c: T.primary, workers: 20 },
    { id: 'jinju',  name: '진주HUB',  c: T.success, workers: 14 },
    { id: 'hadong', name: '하동HUB',  c: T.warning, workers: 12 },
  ],
  crops: ['전체', '토마토', '딸기', '파프리카', '오이', '애호박', '방울토마토', '고추'],
  workTypes: ['정식', '유인', '적엽', '적화', '적과', '수확', '줄 내리기', '측지제거', '선별·포장', '방제'],

  // 개인별 종합 — efficiency(표준 대비 %), harvestPct(수확 달성률 %), speedStem(주/분 주요 작업)
  workers: [
    { id: 'w01', name: '홍수진', branch: 'busan', bc: T.primary, role: '작업반장', crop: '토마토', joined: '2022.08', avatar: 'rose', efficiency: 122, harvestPct: 118, speedStem: 4.2, stemsWeek: 1680, attendance: 100, pinned: true },
    { id: 'w02', name: '김영수', branch: 'busan', bc: T.primary, role: '작업자',   crop: '토마토', joined: '2023.02', avatar: 'blue',  efficiency: 115, harvestPct: 110, speedStem: 3.9, stemsWeek: 1560, attendance: 98 },
    { id: 'w03', name: '윤서연', branch: 'busan', bc: T.primary, role: '작업자',   crop: '딸기',   joined: '2024.03', avatar: 'rose',  efficiency: 108, harvestPct: 106, speedStem: 4.6, stemsWeek: 1840, attendance: 96 },
    { id: 'w04', name: '강민철', branch: 'busan', bc: T.primary, role: '작업자',   crop: '토마토', joined: '2023.06', avatar: 'blue',  efficiency: 102, harvestPct: 98,  speedStem: 3.4, stemsWeek: 1360, attendance: 95 },
    { id: 'w05', name: '이수빈', branch: 'busan', bc: T.primary, role: '작업자',   crop: '파프리카', joined: '2024.01', avatar: 'emerald', efficiency: 96, harvestPct: 94, speedStem: 3.0, stemsWeek: 1200, attendance: 92 },
    { id: 'w06', name: '박준호', branch: 'busan', bc: T.primary, role: '작업자',   crop: '토마토', joined: '2024.05', avatar: 'slate', efficiency: 82,  harvestPct: 76,  speedStem: 2.7, stemsWeek: 1080, attendance: 88, warn: true },
    { id: 'w07', name: '정태민', branch: 'jinju', bc: T.success, role: '작업자',   crop: '오이',   joined: '2024.01', avatar: 'emerald', efficiency: 116, harvestPct: 112, speedStem: 3.8, stemsWeek: 1520, attendance: 99 },
    { id: 'w08', name: '조미영', branch: 'jinju', bc: T.success, role: '작업자',   crop: '애호박', joined: '2023.09', avatar: 'rose',  efficiency: 110, harvestPct: 104, speedStem: 3.6, stemsWeek: 1440, attendance: 97 },
    { id: 'w09', name: '임대현', branch: 'jinju', bc: T.success, role: '작업자',   crop: '오이',   joined: '2024.06', avatar: 'blue',  efficiency: 98,  harvestPct: 96,  speedStem: 3.2, stemsWeek: 1280, attendance: 94 },
    { id: 'w10', name: '장민호', branch: 'hadong', bc: T.warning, role: '작업자',  crop: '방울토마토', joined: '2025.02', avatar: 'amber', efficiency: 92,  harvestPct: 88,  speedStem: 3.1, stemsWeek: 1240, attendance: 91 },
    { id: 'w11', name: '이강모', branch: 'hadong', bc: T.warning, role: '작업자',  crop: '고추',   joined: '2023.09', avatar: 'amber', efficiency: 84,  harvestPct: 82,  speedStem: 2.6, stemsWeek: 1040, attendance: 84, warn: true },
    { id: 'w12', name: '서지혜', branch: 'hadong', bc: T.warning, role: '작업자',  crop: '방울토마토', joined: '2024.08', avatar: 'rose',  efficiency: 76,  harvestPct: 72,  speedStem: 2.4, stemsWeek: 960,  attendance: 82, warn: true },
  ],
};

// ─────── 공통 유틸 ───────
const toneByPct = (pct) => pct >= 110 ? T.success : pct >= 95 ? T.text : pct >= 80 ? T.warning : T.danger;

// ─────── 상단 헤더 ───────
const PerfHeader = ({ subtitle, title, level, period, setPeriod, crop, setCrop, showBottom, setShowBottom, branchFilter, setBranchFilter, extra }) => (
  <div style={{ background: T.surface, borderBottom: `1px solid ${T.border}` }}>
    <div style={{ padding: '20px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, color: T.mutedSoft, marginBottom: 4 }}>
          <span style={{
            padding: '2px 8px', borderRadius: 4, fontWeight: 700, letterSpacing: 0.3,
            background: level === 'hq' ? HQ.accentSoft : T.primarySoft,
            color: level === 'hq' ? HQ.accentText : T.primaryText,
          }}>{level === 'hq' ? 'HQ' : '지점'}</span>
          <span>{subtitle}</span>
        </div>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: T.text, letterSpacing: -0.4, margin: 0 }}>{title}</h1>
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        {btnSecondary('CSV', icons.chart)}
        {btnSecondary('월간 리포트 PDF', icons.clipboard)}
      </div>
    </div>
    <div style={{ padding: '10px 32px', display: 'flex', alignItems: 'center', gap: 14, borderTop: `1px solid ${T.borderSoft}`, flexWrap: 'wrap' }}>
      <div style={{ display: 'flex', gap: 0, padding: 3, background: T.bg, border: `1px solid ${T.border}`, borderRadius: 7 }}>
        {['이번 주', '이번 달', '분기', '직접선택'].map(p => {
          const on = period === p;
          return (
            <button key={p} onClick={() => setPeriod(p)} style={{
              padding: '4px 12px', borderRadius: 5, border: 0, cursor: 'pointer',
              background: on ? T.surface : 'transparent', color: on ? T.text : T.mutedSoft,
              fontSize: 11, fontWeight: 600,
              boxShadow: on ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
            }}>{p}</button>
          );
        })}
      </div>
      {period === '직접선택' && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: T.muted }}>
          <span style={{ padding: '4px 10px', background: T.bg, border: `1px solid ${T.border}`, borderRadius: 5, fontFamily: 'ui-monospace, monospace' }}>2026-04-01</span>
          <span>→</span>
          <span style={{ padding: '4px 10px', background: T.bg, border: `1px solid ${T.border}`, borderRadius: 5, fontFamily: 'ui-monospace, monospace' }}>2026-04-25</span>
        </div>
      )}
      <span style={{ width: 1, height: 16, background: T.border }} />
      <label style={{ fontSize: 11, fontWeight: 700, color: T.muted }}>작물</label>
      <select value={crop} onChange={e => setCrop(e.target.value)} style={{
        padding: '5px 28px 5px 10px', fontSize: 12, fontWeight: 600, color: T.text,
        background: `${T.bg} url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'><path d='M1 1l4 4 4-4' stroke='%2364748b' stroke-width='1.5' fill='none'/></svg>") no-repeat right 10px center`,
        border: `1px solid ${T.border}`, borderRadius: 6, appearance: 'none', cursor: 'pointer',
      }}>
        {PERF_DATA.crops.map(c => <option key={c}>{c}</option>)}
      </select>
      {level === 'hq' && (
        <>
          <span style={{ width: 1, height: 16, background: T.border }} />
          <label style={{ fontSize: 11, fontWeight: 700, color: T.muted }}>지점</label>
          {['전체', '부산LAB', '진주HUB', '하동HUB'].map(b => {
            const on = branchFilter === b;
            return (
              <button key={b} onClick={() => setBranchFilter(b)} style={{
                padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: 'pointer',
                border: `1px solid ${on ? HQ.accent : T.border}`,
                background: on ? HQ.accentSoft : T.surface,
                color: on ? HQ.accentText : T.muted,
              }}>{b}</button>
            );
          })}
        </>
      )}
      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10 }}>
        {extra}
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: T.muted, cursor: 'pointer', fontWeight: 600 }}
          onClick={() => setShowBottom(!showBottom)}>
          <span style={{
            width: 30, height: 17, borderRadius: 999, background: showBottom ? T.danger : T.border,
            position: 'relative', transition: 'background 0.15s',
          }}>
            <span style={{
              position: 'absolute', top: 2, left: showBottom ? 15 : 2, width: 13, height: 13, borderRadius: '50%',
              background: '#fff', transition: 'left 0.15s', boxShadow: '0 1px 2px rgba(0,0,0,0.2)',
            }} />
          </span>
          하위 성과자 표시
        </label>
      </div>
    </div>
    {/* 정규화 안내 배너 */}
    <div style={{ padding: '8px 32px', background: T.bg, borderTop: `1px solid ${T.borderSoft}`, fontSize: 11, color: T.mutedSoft, display: 'flex', alignItems: 'center', gap: 8 }}>
      <Icon d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" size={12} c={T.mutedSoft} />
      <span><strong style={{ color: T.text }}>정규화 기준:</strong> 작물·작업별 표준공수(SAM) 대비 <strong>효율 %</strong> · 담당 면적 대비 <strong>수확 달성률 %</strong> · 지점·작물 차이를 흡수하여 공정하게 비교</span>
    </div>
  </div>
);

// ─────── Top 5 카드 ───────
const TopFiveCard = ({ title, subtitle, metric, unit, items, target, emphasis, footer }) => {
  return (
    <Card>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
        <div>
          <h3 style={{ fontSize: 13, fontWeight: 700, color: T.text, margin: 0 }}>{title}</h3>
          <div style={{ fontSize: 10, color: T.mutedSoft, marginTop: 2, fontWeight: 500 }}>{subtitle} · 기준 {target}{unit}</div>
        </div>
        <Pill tone={emphasis ? 'primary' : 'muted'} size="sm">Top 5</Pill>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {items.slice(0, 5).map((w, i) => {
          const v = w[metric];
          return (
            <div key={w.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 8px', borderRadius: 6, background: i === 0 ? T.bg : 'transparent' }}>
              <div style={{
                width: 22, height: 22, borderRadius: 6,
                background: i === 0 ? T.text : i === 1 ? T.muted : i === 2 ? T.mutedSoft : 'transparent',
                border: i > 2 ? `1px solid ${T.border}` : 0,
                color: i < 3 ? '#fff' : T.mutedSoft,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 11, fontWeight: 700, fontVariantNumeric: 'tabular-nums',
                flexShrink: 0,
              }}>{i + 1}</div>
              <Avatar name={w.name[0]} size={26} c={w.avatar} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: T.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{w.name}</div>
                <div style={{ fontSize: 10, color: T.mutedSoft, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Dot c={w.bc} /> {PERF_DATA.branches.find(b => b.id === w.branch)?.name} · {w.crop}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 16, fontWeight: 700, color: toneByPct(typeof v === 'number' && unit === '%' ? v : 100), fontVariantNumeric: 'tabular-nums', letterSpacing: -0.3 }}>
                  {typeof v === 'number' && v % 1 !== 0 ? v.toFixed(1) : v.toLocaleString()}
                  <span style={{ fontSize: 10, color: T.mutedSoft, fontWeight: 500, marginLeft: 2 }}>{unit}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      {footer && <div style={{ marginTop: 10, paddingTop: 10, borderTop: `1px solid ${T.borderSoft}`, fontSize: 10, color: T.mutedSoft, lineHeight: 1.5 }}>{footer}</div>}
    </Card>
  );
};

const BottomFiveCard = ({ items, metric, unit, subtitle, higherIsBetter = true }) => {
  const sorted = [...items].sort((a, b) => higherIsBetter ? a[metric] - b[metric] : b[metric] - a[metric]).slice(0, 5);
  return (
    <Card style={{ background: T.dangerSoft, border: `1px solid ${T.danger}20` }}>
      <div style={{ marginBottom: 12 }}>
        <h3 style={{ fontSize: 13, fontWeight: 700, color: T.danger, margin: 0 }}>관심 필요 · 하위 5명</h3>
        <div style={{ fontSize: 10, color: T.muted, marginTop: 2 }}>{subtitle}</div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {sorted.map(w => (
          <div key={w.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '5px 0' }}>
            <Avatar name={w.name[0]} size={22} c={w.avatar} />
            <div style={{ flex: 1, fontSize: 12, fontWeight: 600, color: T.text }}>{w.name}</div>
            <span style={{ fontSize: 10, color: T.mutedSoft }}>{PERF_DATA.branches.find(b => b.id === w.branch)?.name}</span>
            <div style={{ fontSize: 12, fontWeight: 700, color: T.danger, minWidth: 55, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
              {typeof w[metric] === 'number' && w[metric] % 1 !== 0 ? w[metric].toFixed(1) : w[metric]}<span style={{ fontSize: 9, fontWeight: 500, marginLeft: 2 }}>{unit}</span>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
};

// ─────── KPI 헤더 (정규화 지표만) ───────
const PerfKPIs = ({ workers }) => {
  const avgEff = Math.round(workers.reduce((s, w) => s + w.efficiency, 0) / workers.length);
  const avgHarv = Math.round(workers.reduce((s, w) => s + w.harvestPct, 0) / workers.length);
  const above100 = workers.filter(w => w.efficiency >= 100).length;
  const avgAtt = Math.round(workers.reduce((s, w) => s + w.attendance, 0) / workers.length);

  const items = [
    { l: '평균 효율', v: avgEff, u: '%', sub: '표준공수 대비', tone: toneByPct(avgEff) },
    { l: '평균 수확 달성률', v: avgHarv, u: '%', sub: '담당 면적 기준', tone: toneByPct(avgHarv) },
    { l: '목표 달성 인원', v: above100, u: `/${workers.length}`, sub: `${Math.round(above100 / workers.length * 100)}% 달성`, tone: T.text },
    { l: '평균 출근률', v: avgAtt, u: '%', sub: '목표 95%', tone: toneByPct(Math.round(avgAtt / 95 * 100)) },
  ];
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
      {items.map((k, i) => (
        <Card key={i} pad={18}>
          <div style={{ fontSize: 11, color: T.muted, fontWeight: 600 }}>{k.l}</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginTop: 6 }}>
            <span style={{ fontSize: 28, fontWeight: 700, color: k.tone, letterSpacing: -0.5, fontVariantNumeric: 'tabular-nums' }}>{k.v}</span>
            <span style={{ fontSize: 12, color: T.mutedSoft, fontWeight: 500 }}>{k.u}</span>
          </div>
          <div style={{ fontSize: 11, color: T.mutedSoft, marginTop: 4 }}>{k.sub}</div>
        </Card>
      ))}
    </div>
  );
};

// ─────── 작물·작업별 속도 드릴다운 (주/분) ───────
const SpeedMatrix = ({ selectedCrop, sam: samTable = SAM }) => {
  const crops = selectedCrop && selectedCrop !== '전체' ? [selectedCrop] : ['토마토', '오이', '방울토마토'];
  const works = ['정식', '유인', '적엽', '수확', '선별·포장'];
  return (
    <Card>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <h3 style={{ fontSize: 14, fontWeight: 700, color: T.text, margin: 0 }}>작물·작업별 실측 속도 (주/분)</h3>
        <span style={{ fontSize: 11, color: T.mutedSoft }}>이번 주 지점 평균</span>
      </div>
      <div style={{ fontSize: 11, color: T.mutedSoft, marginBottom: 14 }}>상단: 실제 속도 · 하단: 표준공수(SAM) 대비 효율 %</div>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ borderBottom: `1px solid ${T.border}` }}>
            <th style={{ padding: '8px 12px', textAlign: 'left', fontSize: 10, color: T.mutedSoft, fontWeight: 700 }}>작물</th>
            {works.map(w => (
              <th key={w} style={{ padding: '8px 12px', textAlign: 'center', fontSize: 10, color: T.mutedSoft, fontWeight: 700 }}>{w}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {crops.map(c => {
            const samCol = samTable[c] || {};
            // 랜덤이지만 안정적인 실측값 생성
            const actual = {
              '정식': 1 / (samCol['정식'] || 0.3) * (0.95 + c.length * 0.01),
              '유인': 1 / (samCol['유인'] || 0.24) * (0.98 + c.charCodeAt(0) % 5 * 0.01),
              '적엽': 1 / (samCol['적엽'] || 0.18) * (1.02 - c.charCodeAt(0) % 3 * 0.01),
              '수확': 1 / (samCol['수확'] || 0.28) * (1.01 + c.charCodeAt(1) % 4 * 0.01),
              '선별·포장': 1 / (samCol['선별·포장'] || 0.16) * (0.96 + c.charCodeAt(0) % 6 * 0.01),
            };
            return (
              <tr key={c} style={{ borderBottom: `1px solid ${T.borderSoft}` }}>
                <td style={{ padding: '12px', fontSize: 12, fontWeight: 700, color: T.text }}>{c}</td>
                {works.map(w => {
                  const standard = 1 / (samCol[w] || 0.2);
                  const a = actual[w];
                  const eff = Math.round(a / standard * 100);
                  return (
                    <td key={w} style={{ padding: '10px 12px', textAlign: 'center' }}>
                      <div style={{ fontSize: 15, fontWeight: 700, color: T.text, letterSpacing: -0.3, fontVariantNumeric: 'tabular-nums' }}>
                        {a.toFixed(1)}<span style={{ fontSize: 10, color: T.mutedSoft, fontWeight: 500, marginLeft: 2 }}>주/분</span>
                      </div>
                      <div style={{ fontSize: 10, fontWeight: 700, color: toneByPct(eff), marginTop: 2, fontVariantNumeric: 'tabular-nums' }}>{eff}%</div>
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
      <div style={{ marginTop: 12, padding: 10, background: T.bg, borderRadius: 6, fontSize: 10, color: T.mutedSoft, lineHeight: 1.6 }}>
        <strong style={{ color: T.text }}>SAM 기준값:</strong> 토마토 유인 0.24분/주 → 초당 4.17주. 작물·작업별 표준공수(SAM) 테이블은 시스템 설정에서 관리.
      </div>
    </Card>
  );
};

// ─────── 전체 순위 테이블 ───────
const PerfTable = ({ workers, onSelect, selected, compareMode }) => {
  return (
    <Card pad={0}>
      <div style={{ padding: '12px 16px', borderBottom: `1px solid ${T.borderSoft}`, display: 'flex', alignItems: 'center', gap: 10 }}>
        <h3 style={{ fontSize: 13, fontWeight: 700, color: T.text, margin: 0 }}>전체 작업자 순위</h3>
        <span style={{ fontSize: 11, color: T.mutedSoft }}>{workers.length}명 · 효율 % 기준 정렬</span>
        {compareMode && selected.length > 0 && (
          <span style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: T.text }}>{selected.length}명 선택됨</span>
            <button style={{ padding: '5px 12px', borderRadius: 6, border: 0, background: T.text, color: '#fff', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>나란히 비교 →</button>
          </span>
        )}
      </div>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ background: T.bg, borderBottom: `1px solid ${T.border}` }}>
            {compareMode && <th style={{ width: 36, padding: '10px 12px' }}></th>}
            <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: T.muted, width: 40 }}>#</th>
            <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: T.muted }}>작업자</th>
            <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: T.muted }}>지점·작물</th>
            <th style={{ padding: '10px 12px', textAlign: 'right', fontSize: 11, fontWeight: 700, color: T.muted }}>효율</th>
            <th style={{ padding: '10px 12px', textAlign: 'right', fontSize: 11, fontWeight: 700, color: T.muted }}>수확 달성률</th>
            <th style={{ padding: '10px 12px', textAlign: 'right', fontSize: 11, fontWeight: 700, color: T.muted }}>주요 작업 속도</th>
            <th style={{ padding: '10px 12px', textAlign: 'right', fontSize: 11, fontWeight: 700, color: T.muted }}>주간 처리량</th>
            <th style={{ padding: '10px 12px', textAlign: 'right', fontSize: 11, fontWeight: 700, color: T.muted }}>출근률</th>
            <th style={{ padding: '10px 16px', textAlign: 'right', fontSize: 11, fontWeight: 700, color: T.muted, width: 100 }}></th>
          </tr>
        </thead>
        <tbody>
          {workers.map((w, i) => {
            const isSel = selected && selected.includes(w.id);
            return (
              <tr key={w.id} style={{
                borderBottom: `1px solid ${T.borderSoft}`,
                background: isSel ? HQ.accentSoft : 'transparent',
              }}>
                {compareMode && (
                  <td style={{ padding: '10px 12px' }}>
                    <input type="checkbox" checked={isSel} onChange={() => onSelect && onSelect(w.id)} style={{ cursor: 'pointer' }} />
                  </td>
                )}
                <td style={{ padding: '10px 12px', fontSize: 12, fontWeight: 700, color: i < 3 ? T.text : T.mutedSoft, fontVariantNumeric: 'tabular-nums' }}>{i + 1}</td>
                <td style={{ padding: '10px 12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Avatar name={w.name[0]} size={28} c={w.avatar} />
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: T.text }}>{w.name}</span>
                        {w.pinned && <Icon d="M10 2l2 5 5 1-4 4 1 6-5-3-5 3 1-6-4-4 5-1z" size={10} c={T.warning} />}
                        {w.role === '작업반장' && <Pill tone="primary" size="sm">반장</Pill>}
                        {w.warn && <Pill tone="danger" size="sm">관심</Pill>}
                      </div>
                      <div style={{ fontSize: 10, color: T.mutedSoft }}>입사 {w.joined}</div>
                    </div>
                  </div>
                </td>
                <td style={{ padding: '10px 12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: T.muted }}>
                    <Dot c={w.bc} />
                    <span style={{ fontWeight: 600, color: T.text }}>{PERF_DATA.branches.find(b => b.id === w.branch)?.name}</span>
                    <span>·</span>
                    <span>{w.crop}</span>
                  </div>
                </td>
                <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                  <div style={{ fontSize: 16, fontWeight: 700, color: toneByPct(w.efficiency), fontVariantNumeric: 'tabular-nums', letterSpacing: -0.3 }}>
                    {w.efficiency}<span style={{ fontSize: 10, color: T.mutedSoft, fontWeight: 500, marginLeft: 1 }}>%</span>
                  </div>
                </td>
                <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: toneByPct(w.harvestPct), fontVariantNumeric: 'tabular-nums' }}>
                    {w.harvestPct}<span style={{ fontSize: 10, color: T.mutedSoft, fontWeight: 500, marginLeft: 1 }}>%</span>
                  </div>
                </td>
                <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: T.text, fontVariantNumeric: 'tabular-nums' }}>{w.speedStem.toFixed(1)}<span style={{ fontSize: 10, color: T.mutedSoft, fontWeight: 500, marginLeft: 2 }}>주/분</span></div>
                  <div style={{ fontSize: 9, color: T.mutedSoft }}>{w.crop} 유인</div>
                </td>
                <td style={{ padding: '10px 12px', textAlign: 'right', fontSize: 12, fontWeight: 600, color: T.muted, fontVariantNumeric: 'tabular-nums' }}>
                  {w.stemsWeek.toLocaleString()}<span style={{ fontSize: 10, color: T.mutedSoft, fontWeight: 500, marginLeft: 2 }}>주</span>
                </td>
                <td style={{ padding: '10px 12px', textAlign: 'right', fontSize: 12, fontWeight: 600, color: w.attendance >= 95 ? T.text : T.warning, fontVariantNumeric: 'tabular-nums' }}>
                  {w.attendance}%
                </td>
                <td style={{ padding: '10px 16px', textAlign: 'right' }}>
                  <button style={{ padding: '4px 10px', borderRadius: 6, border: `1px solid ${T.border}`, background: T.surface, color: T.muted, fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>상세 →</button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </Card>
  );
};

const AlertBanner = ({ workers }) => {
  const alerts = workers.filter(w => w.warn);
  if (alerts.length === 0) return null;
  return (
    <Card style={{ borderLeft: `3px solid ${T.danger}`, background: T.dangerSoft, display: 'flex', alignItems: 'center', gap: 12 }} pad={14}>
      <Icon d={icons.alert} size={18} c={T.danger} sw={2.2} />
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: T.danger }}>연속 미달 경고 · {alerts.length}명</div>
        <div style={{ fontSize: 11, color: T.muted, marginTop: 2 }}>2주 이상 효율 80% 미만: {alerts.map(w => w.name).join(', ')}</div>
      </div>
      <button style={{ padding: '5px 12px', borderRadius: 6, border: 0, background: T.danger, color: '#fff', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>1:1 리뷰 예약</button>
    </Card>
  );
};

// ═══════════════════════════════════════════════════════════
// ① HQ 전사 성과
// ═══════════════════════════════════════════════════════════
function HQPerformanceScreen() {
  const { sam } = usePerformanceData();
  // eslint-disable-next-line no-shadow
  const SAM = sam;
  const [period, setPeriod] = useState('이번 주');
  const [crop, setCrop] = useState('전체');
  const [branchFilter, setBranchFilter] = useState('전체');
  const [showBottom, setShowBottom] = useState(false);
  const [compareMode, setCompareMode] = useState(false);
  const [selected, setSelected] = useState([]);

  let workers = PERF_DATA.workers;
  if (branchFilter !== '전체') {
    const bid = branchFilter === '부산LAB' ? 'busan' : branchFilter === '진주HUB' ? 'jinju' : 'hadong';
    workers = workers.filter(w => w.branch === bid);
  }
  if (crop !== '전체') workers = workers.filter(w => w.crop === crop);

  const byEff = [...workers].sort((a, b) => b.efficiency - a.efficiency);
  const byHarv = [...workers].sort((a, b) => b.harvestPct - a.harvestPct);
  const bySpeed = [...workers].sort((a, b) => b.speedStem - a.speedStem);

  const toggle = (id) => setSelected(selected.includes(id)
    ? selected.filter(x => x !== id)
    : selected.length < 4 ? [...selected, id] : selected);

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <PerfHeader
        level="hq" subtitle="본사 · 전사 작업자 성과" title="작업자 성과 관리"
        period={period} setPeriod={setPeriod}
        crop={crop} setCrop={setCrop}
        branchFilter={branchFilter} setBranchFilter={setBranchFilter}
        showBottom={showBottom} setShowBottom={setShowBottom}
        extra={
          <button onClick={() => { setCompareMode(!compareMode); if (compareMode) setSelected([]); }} style={{
            padding: '5px 12px', borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: 'pointer',
            border: `1px solid ${compareMode ? HQ.accent : T.border}`,
            background: compareMode ? HQ.accentSoft : T.surface,
            color: compareMode ? HQ.accentText : T.muted,
          }}>{compareMode ? '비교 취소' : '비교 모드'}</button>
        }
      />
      <div style={{ flex: 1, overflow: 'auto', padding: 24, background: T.bg, display: 'flex', flexDirection: 'column', gap: 16 }}>
        <AlertBanner workers={workers} />
        <PerfKPIs workers={workers} />

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
          <TopFiveCard title="종합 효율 Top 5" subtitle="표준공수 대비 %" metric="efficiency" unit="%" items={byEff} target={100} emphasis footer="작물·작업 차이를 흡수한 정규화 지표. 지점·작물 다른 사람끼리도 공정하게 비교 가능." />
          <TopFiveCard title="수확 달성률 Top 5" subtitle="담당 면적 기준" metric="harvestPct" unit="%" items={byHarv} target={100} footer="본인 담당 구역의 목표 단수 대비 실제 수확량 %" />
          <TopFiveCard title="작업 속도 Top 5" subtitle="주요 작업 속도 (주/분)" metric="speedStem" unit="주/분" items={bySpeed} target="작물별 상이" footer="실측 속도. 작물별 SAM이 달라 직접 비교는 참고용 — 정규화 지표는 왼쪽 효율 Top 5 사용." />
        </div>

        {showBottom && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
            <BottomFiveCard items={workers} metric="efficiency" unit="%" subtitle="효율 80% 미만" />
            <BottomFiveCard items={workers} metric="harvestPct" unit="%" subtitle="수확 달성률 낮음" />
            <BottomFiveCard items={workers} metric="attendance" unit="%" subtitle="출근률 저조" />
          </div>
        )}

        <SpeedMatrix selectedCrop={crop} sam={SAM} />

        <Card>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14 }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: T.text, margin: 0 }}>지점별 성과 비교 (정규화)</h3>
            <span style={{ fontSize: 11, color: T.mutedSoft }}>효율 · 수확 달성률</span>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${T.border}` }}>
                <th style={{ padding: '8px 12px', textAlign: 'left', fontSize: 10, color: T.mutedSoft, fontWeight: 700 }}>지점</th>
                <th style={{ padding: '8px 12px', textAlign: 'right', fontSize: 10, color: T.mutedSoft, fontWeight: 700 }}>인원</th>
                <th style={{ padding: '8px 12px', textAlign: 'right', fontSize: 10, color: T.mutedSoft, fontWeight: 700 }}>재배 작물</th>
                <th style={{ padding: '8px 12px', textAlign: 'right', fontSize: 10, color: T.mutedSoft, fontWeight: 700 }}>평균 효율</th>
                <th style={{ padding: '8px 12px', textAlign: 'right', fontSize: 10, color: T.mutedSoft, fontWeight: 700 }}>수확 달성률</th>
                <th style={{ padding: '8px 12px', textAlign: 'right', fontSize: 10, color: T.mutedSoft, fontWeight: 700 }}>출근률</th>
                <th style={{ padding: '8px 12px', textAlign: 'right', fontSize: 10, color: T.mutedSoft, fontWeight: 700 }}>종합 점수</th>
              </tr>
            </thead>
            <tbody>
              {PERF_DATA.branches.map(b => {
                const ws = PERF_DATA.workers.filter(w => w.branch === b.id);
                const avgEff = Math.round(ws.reduce((s, w) => s + w.efficiency, 0) / ws.length);
                const avgHarv = Math.round(ws.reduce((s, w) => s + w.harvestPct, 0) / ws.length);
                const avgAtt = Math.round(ws.reduce((s, w) => s + w.attendance, 0) / ws.length);
                const total = Math.round(avgEff * 0.5 + avgHarv * 0.35 + avgAtt * 0.15);
                const crops = [...new Set(ws.map(w => w.crop))].join(' · ');
                return (
                  <tr key={b.id} style={{ borderBottom: `1px solid ${T.borderSoft}` }}>
                    <td style={{ padding: '10px 12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Dot c={b.c} />
                        <span style={{ fontSize: 12, fontWeight: 700, color: T.text }}>{b.name}</span>
                      </div>
                    </td>
                    <td style={{ padding: '10px 12px', textAlign: 'right', fontSize: 12, color: T.muted, fontVariantNumeric: 'tabular-nums' }}>{ws.length}명</td>
                    <td style={{ padding: '10px 12px', textAlign: 'right', fontSize: 11, color: T.muted }}>{crops}</td>
                    <td style={{ padding: '10px 12px', textAlign: 'right', fontSize: 13, fontWeight: 700, color: toneByPct(avgEff), fontVariantNumeric: 'tabular-nums' }}>{avgEff}%</td>
                    <td style={{ padding: '10px 12px', textAlign: 'right', fontSize: 13, fontWeight: 700, color: toneByPct(avgHarv), fontVariantNumeric: 'tabular-nums' }}>{avgHarv}%</td>
                    <td style={{ padding: '10px 12px', textAlign: 'right', fontSize: 12, color: T.muted, fontVariantNumeric: 'tabular-nums' }}>{avgAtt}%</td>
                    <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                        <div style={{ width: 80, height: 6, background: T.borderSoft, borderRadius: 999, overflow: 'hidden' }}>
                          <div style={{ width: `${Math.min(total, 100)}%`, height: '100%', background: toneByPct(total) }} />
                        </div>
                        <span style={{ fontSize: 12, fontWeight: 700, color: toneByPct(total), fontVariantNumeric: 'tabular-nums', minWidth: 36, textAlign: 'right' }}>{total}</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div style={{ marginTop: 10, padding: 10, background: T.bg, borderRadius: 6, fontSize: 10, color: T.mutedSoft }}>
            종합 점수 = 효율 50% + 수확 달성률 35% + 출근률 15% (가중 평균)
          </div>
        </Card>

        <PerfTable workers={byEff} onSelect={toggle} selected={selected} compareMode={compareMode} />
      </div>
    </div>
  );
}

// ② 지점 뷰
function BranchPerformanceScreen() {
  const { sam } = usePerformanceData();
  // eslint-disable-next-line no-shadow
  const SAM = sam;
  const [period, setPeriod] = useState('이번 주');
  const [crop, setCrop] = useState('전체');
  const [showBottom, setShowBottom] = useState(false);

  let workers = PERF_DATA.workers.filter(w => w.branch === 'busan');
  if (crop !== '전체') workers = workers.filter(w => w.crop === crop);

  const byEff = [...workers].sort((a, b) => b.efficiency - a.efficiency);
  const byHarv = [...workers].sort((a, b) => b.harvestPct - a.harvestPct);
  const bySpeed = [...workers].sort((a, b) => b.speedStem - a.speedStem);

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <PerfHeader
        level="branch" subtitle="부산LAB · 지점 작업자 성과" title="작업자 성과 관리"
        period={period} setPeriod={setPeriod}
        crop={crop} setCrop={setCrop}
        showBottom={showBottom} setShowBottom={setShowBottom}
      />
      <div style={{ flex: 1, overflow: 'auto', padding: 24, background: T.bg, display: 'flex', flexDirection: 'column', gap: 16 }}>
        <AlertBanner workers={workers} />
        <PerfKPIs workers={workers} />

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
          <TopFiveCard title="종합 효율 Top 5" subtitle="표준공수 대비 %" metric="efficiency" unit="%" items={byEff} target={100} emphasis />
          <TopFiveCard title="수확 달성률 Top 5" subtitle="담당 면적 기준" metric="harvestPct" unit="%" items={byHarv} target={100} />
          <TopFiveCard title="작업 속도 Top 5" subtitle="주요 작업 (주/분)" metric="speedStem" unit="주/분" items={bySpeed} target="작물별 상이" />
        </div>

        {showBottom && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
            <BottomFiveCard items={workers} metric="efficiency" unit="%" subtitle="효율 낮은 순" />
            <BottomFiveCard items={workers} metric="harvestPct" unit="%" subtitle="수확 달성률 낮음" />
            <BottomFiveCard items={workers} metric="attendance" unit="%" subtitle="출근률 저조" />
          </div>
        )}

        <SpeedMatrix selectedCrop={crop} sam={SAM} />
        <PerfTable workers={byEff} />
      </div>
    </div>
  );
}

// ③ 개인 상세
function PerformanceDetailScreen() {
  const { sam } = usePerformanceData();
  // eslint-disable-next-line no-shadow
  const SAM = sam;
  const w = PERF_DATA.workers[0];
  const [weekWork, setWeekWork] = useState('전체');
  const WEEK_TYPES = ['전체', '정식', '유인', '적엽', '수확', '선별·포장'];
  // 작업별 주별 효율 (없으면 전체 사용)
  const WEEK_BY_WORK = {
    '전체':  [{ w: '14주', eff: 108, harv: 104 }, { w: '15주', eff: 114, harv: 108 }, { w: '16주', eff: 118, harv: 112 }, { w: '17주', eff: 120, harv: 116 }, { w: '18주', eff: 122, harv: 118 }],
    '정식':  [{ w: '14주', eff: 112, harv: 108 }, { w: '15주', eff: 115, harv: 110 }, { w: '16주', eff: 116, harv: 112 }, { w: '17주', eff: 118, harv: 114 }, { w: '18주', eff: 118, harv: 115 }],
    '유인':  [{ w: '14주', eff:  98, harv:  96 }, { w: '15주', eff: 102, harv:  99 }, { w: '16주', eff: 104, harv: 101 }, { w: '17주', eff: 105, harv: 103 }, { w: '18주', eff: 106, harv: 104 }],
    '적엽':  [{ w: '14주', eff: 104, harv: 100 }, { w: '15주', eff: 108, harv: 104 }, { w: '16주', eff: 110, harv: 106 }, { w: '17주', eff: 112, harv: 108 }, { w: '18주', eff: 112, harv: 109 }],
    '수확':  [{ w: '14주', eff: 118, harv: 112 }, { w: '15주', eff: 122, harv: 116 }, { w: '16주', eff: 124, harv: 118 }, { w: '17주', eff: 126, harv: 120 }, { w: '18주', eff: 128, harv: 122 }],
    '선별·포장': [{ w: '14주', eff: 92, harv: 90 }, { w: '15주', eff: 94, harv: 92 }, { w: '16주', eff: 96, harv: 94 }, { w: '17주', eff: 98, harv: 95 }, { w: '18주', eff: 98, harv: 96 }],
  };
  const weeks = WEEK_BY_WORK[weekWork];
  const workTypes = [
    { t: '정식', eff: 118 }, { t: '유인', eff: 106 }, { t: '적엽', eff: 112 },
    { t: '적과', eff: 94 }, { t: '수확', eff: 126 }, { t: '선별', eff: 98 },
  ];
  const maxScore = 140;
  const cx = 130, cy = 130, r = 90;
  const points = workTypes.map((t, i) => {
    const angle = (Math.PI * 2 * i / workTypes.length) - Math.PI / 2;
    const rad = (t.eff / maxScore) * r;
    return [cx + rad * Math.cos(angle), cy + rad * Math.sin(angle)];
  });
  const polygon = points.map(p => p.join(',')).join(' ');

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ background: T.surface, borderBottom: `1px solid ${T.border}`, padding: '20px 32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: T.mutedSoft, marginBottom: 10 }}>
          <span style={{ cursor: 'pointer' }}>성과 관리</span><span>›</span>
          <span style={{ cursor: 'pointer' }}>부산LAB</span><span>›</span>
          <span style={{ color: T.text, fontWeight: 600 }}>{w.name}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <Avatar name={w.name[0]} size={64} c={w.avatar} />
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <h1 style={{ fontSize: 22, fontWeight: 700, color: T.text, letterSpacing: -0.4, margin: 0 }}>{w.name}</h1>
              <Pill tone="primary">작업반장</Pill>
              {w.pinned && <Pill tone="warning">우수 작업자</Pill>}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, fontSize: 12, color: T.muted }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Dot c={w.bc} />부산LAB · {w.crop}</span>
              <span>입사 {w.joined}</span>
              <span>사번 GREF-B-{w.id.slice(1)}</span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {btnSecondary('CSV', icons.chart)}
            {btnSecondary('월간 평가서 PDF', icons.clipboard)}
            <button style={{ padding: '7px 14px', borderRadius: 7, border: 0, background: T.warning, color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
              <Icon d="M10 2l2 5 5 1-4 4 1 6-5-3-5 3 1-6-4-4 5-1z" size={13} c="#fff" />우수 태그 유지
            </button>
          </div>
        </div>
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: 24, background: T.bg, display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
          {[
            { l: '종합 효율', v: w.efficiency, u: '%', sub: '지점 1위 · 표준 대비', tone: toneByPct(w.efficiency) },
            { l: '수확 달성률', v: w.harvestPct, u: '%', sub: '담당 면적 대비', tone: toneByPct(w.harvestPct) },
            { l: `주요 속도 (${w.crop} 유인)`, v: w.speedStem.toFixed(1), u: '주/분', sub: `SAM 대비 ${Math.round(w.speedStem / (1/SAM[w.crop]['유인']) * 100)}%`, tone: T.text },
            { l: '출근률', v: w.attendance, u: '%', sub: '3개월 연속 100%', tone: T.text },
          ].map((k, i) => (
            <Card key={i} pad={18}>
              <div style={{ fontSize: 11, color: T.muted, fontWeight: 600 }}>{k.l}</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginTop: 8 }}>
                <span style={{ fontSize: 28, fontWeight: 700, color: k.tone, letterSpacing: -0.8, fontVariantNumeric: 'tabular-nums' }}>{k.v}</span>
                <span style={{ fontSize: 12, color: T.mutedSoft, fontWeight: 500 }}>{k.u}</span>
              </div>
              <div style={{ fontSize: 11, color: T.mutedSoft, marginTop: 4 }}>{k.sub}</div>
            </Card>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 16 }}>
          <Card>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
              <div>
                <h3 style={{ fontSize: 14, fontWeight: 700, color: T.text, margin: 0 }}>주별 효율 추이</h3>
                <div style={{ fontSize: 11, color: T.mutedSoft, marginTop: 2 }}>
                  효율 % · 수확 달성률 % · 목표 100%
                  {weekWork !== '전체' && <span style={{ marginLeft: 6, color: T.primaryText, fontWeight: 600 }}>· {weekWork} 작업만</span>}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 12, fontSize: 11 }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><span style={{ width: 10, height: 2, background: T.primary }} /><span style={{ color: T.muted }}>효율</span></span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><span style={{ width: 10, height: 2, background: T.success }} /><span style={{ color: T.muted }}>수확</span></span>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 4, marginBottom: 14, flexWrap: 'wrap' }}>
              {WEEK_TYPES.map(t => {
                const on = weekWork === t;
                return (
                  <button key={t} onClick={() => setWeekWork(t)} style={{
                    padding: '4px 10px', fontSize: 11, fontWeight: 600, cursor: 'pointer',
                    border: `1px solid ${on ? T.primary : T.border}`,
                    background: on ? T.primarySoft : T.surface,
                    color: on ? T.primaryText : T.muted,
                    borderRadius: 999,
                  }}>{t}</button>
                );
              })}
            </div>
            <div style={{ height: 180 }}>
              <svg viewBox="0 0 440 180" width="100%" height="180" preserveAspectRatio="none">
                {[0, 45, 90, 135, 180].map((y, i) => <line key={i} x1="0" y1={y} x2="440" y2={y} stroke={T.borderSoft} strokeWidth="1" />)}
                <line x1="0" y1="90" x2="440" y2="90" stroke={T.warning} strokeWidth="1" strokeDasharray="4 3" opacity="0.5" />
                <text x="10" y="86" fontSize="9" fill={T.warning} fontWeight="700">목표 100%</text>
                <polyline points={weeks.map((wk, i) => `${i * 110},${180 - (wk.eff - 80) * 3}`).join(' ')} fill="none" stroke={T.primary} strokeWidth="2.5" />
                {weeks.map((wk, i) => (
                  <g key={i}>
                    <circle cx={i * 110} cy={180 - (wk.eff - 80) * 3} r="4" fill={T.primary} stroke="#fff" strokeWidth="2" />
                    <text x={i * 110} y={180 - (wk.eff - 80) * 3 - 10} fontSize="9" fill={T.text} fontWeight="700" textAnchor="middle">{wk.eff}%</text>
                  </g>
                ))}
                <polyline points={weeks.map((wk, i) => `${i * 110},${180 - (wk.harv - 80) * 3}`).join(' ')} fill="none" stroke={T.success} strokeWidth="2" strokeDasharray="4 2" />
                {weeks.map((wk, i) => <circle key={i} cx={i * 110} cy={180 - (wk.harv - 80) * 3} r="3" fill={T.success} stroke="#fff" strokeWidth="1.5" />)}
              </svg>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: T.mutedSoft, marginTop: 6 }}>
              {weeks.map(w => <span key={w.w}>{w.w}</span>)}
            </div>
          </Card>

          <Card>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: T.text, margin: 0, marginBottom: 4 }}>작업유형별 효율</h3>
            <div style={{ fontSize: 11, color: T.mutedSoft, marginBottom: 10 }}>{w.crop} · SAM 대비 %</div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="260" height="260" viewBox="0 0 260 260">
                {[0.5, 0.75, 1.0].map((scale, i) => (
                  <polygon key={i} points={workTypes.map((_, j) => {
                    const a = (Math.PI * 2 * j / workTypes.length) - Math.PI / 2;
                    return `${cx + r * scale * Math.cos(a)},${cy + r * scale * Math.sin(a)}`;
                  }).join(' ')} fill="none" stroke={T.borderSoft} strokeWidth="1" />
                ))}
                <polygon points={workTypes.map((_, j) => {
                  const a = (Math.PI * 2 * j / workTypes.length) - Math.PI / 2;
                  const rd = (100 / maxScore) * r;
                  return `${cx + rd * Math.cos(a)},${cy + rd * Math.sin(a)}`;
                }).join(' ')} fill="none" stroke={T.warning} strokeWidth="1.2" strokeDasharray="3 3" opacity="0.6" />
                <polygon points={polygon} fill={`${T.primary}30`} stroke={T.primary} strokeWidth="2" />
                {points.map((p, i) => <circle key={i} cx={p[0]} cy={p[1]} r="3.5" fill={T.primary} stroke="#fff" strokeWidth="1.5" />)}
                {workTypes.map((t, i) => {
                  const a = (Math.PI * 2 * i / workTypes.length) - Math.PI / 2;
                  const lx = cx + (r + 18) * Math.cos(a);
                  const ly = cy + (r + 18) * Math.sin(a);
                  return (
                    <g key={i}>
                      <text x={lx} y={ly} fontSize="10" fill={T.text} fontWeight="700" textAnchor="middle" dominantBaseline="middle">{t.t}</text>
                      <text x={lx} y={ly + 11} fontSize="9" fill={toneByPct(t.eff)} fontWeight="700" textAnchor="middle">{t.eff}%</text>
                    </g>
                  );
                })}
              </svg>
            </div>
          </Card>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 16 }}>
          <Card>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: T.text, margin: 0, marginBottom: 4 }}>작업별 속도 추이 (4주, 주/분)</h3>
            <div style={{ fontSize: 11, color: T.mutedSoft, marginBottom: 12 }}>{w.crop} · 실측 속도</div>
            <div style={{ height: 150 }}>
              <svg viewBox="0 0 440 150" width="100%" height="150" preserveAspectRatio="none">
                {[0, 37, 75, 112, 150].map((y, i) => <line key={i} x1="0" y1={y} x2="440" y2={y} stroke={T.borderSoft} strokeWidth="1" />)}
                <polyline points="0,80 110,72 220,66 330,58 440,50" fill="none" stroke={T.primary} strokeWidth="2.5" />
                <polyline points="0,95 110,88 220,82 330,78 440,72" fill="none" stroke={T.success} strokeWidth="2" />
                <polyline points="0,115 110,110 220,104 330,100 440,94" fill="none" stroke={T.warning} strokeWidth="2" />
              </svg>
            </div>
            <div style={{ display: 'flex', gap: 14, fontSize: 11, marginTop: 8, justifyContent: 'center' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><span style={{ width: 10, height: 2, background: T.primary }} /><span style={{ color: T.muted }}>수확 4.2주/분</span></span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><span style={{ width: 10, height: 2, background: T.success }} /><span style={{ color: T.muted }}>유인 3.8주/분</span></span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><span style={{ width: 10, height: 2, background: T.warning }} /><span style={{ color: T.muted }}>적엽 5.1주/분</span></span>
            </div>
          </Card>

          <Card pad={0}>
            <div style={{ padding: '14px 16px', borderBottom: `1px solid ${T.borderSoft}`, display: 'flex', justifyContent: 'space-between' }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, color: T.text, margin: 0 }}>최근 작업 이력</h3>
              <button style={{ background: 'none', border: 0, fontSize: 11, color: T.mutedSoft, cursor: 'pointer' }}>전체 보기</button>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <tbody>
                {[
                  { d: '04/25', t: '수확', stems: 178, m: 42, eff: 130 },
                  { d: '04/24', t: '유인', stems: 212, m: 56, eff: 105 },
                  { d: '04/23', t: '적엽', stems: 246, m: 48, eff: 106 },
                  { d: '04/22', t: '수확', stems: 184, m: 44, eff: 125 },
                  { d: '04/21', t: '정식', stems: 94, m: 28, eff: 118 },
                  { d: '04/19', t: '수확', stems: 176, m: 42, eff: 128 },
                ].map((r, i) => (
                  <tr key={i} style={{ borderBottom: `1px solid ${T.borderSoft}` }}>
                    <td style={{ padding: '8px 16px', fontSize: 11, color: T.muted, fontVariantNumeric: 'tabular-nums' }}>{r.d}</td>
                    <td style={{ padding: '8px 0', fontSize: 12, fontWeight: 600, color: T.text }}>{r.t}</td>
                    <td style={{ padding: '8px 0', textAlign: 'right', fontSize: 11, color: T.muted, fontVariantNumeric: 'tabular-nums' }}>{r.stems}주 / {r.m}분</td>
                    <td style={{ padding: '8px 0', textAlign: 'right', fontSize: 12, fontWeight: 600, color: T.text, fontVariantNumeric: 'tabular-nums' }}>{(r.stems / r.m).toFixed(1)}<span style={{ fontSize: 9, color: T.mutedSoft, fontWeight: 500 }}>주/분</span></td>
                    <td style={{ padding: '8px 16px', textAlign: 'right', fontSize: 11, fontWeight: 700, color: toneByPct(r.eff), fontVariantNumeric: 'tabular-nums' }}>{r.eff}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </div>

        <Card>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: T.text, margin: 0 }}>1:1 리뷰 · 코멘트</h3>
            <button style={{ padding: '5px 12px', borderRadius: 6, border: 0, background: T.primary, color: '#fff', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>+ 메모 추가</button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[
              { a: '김재배', r: '지점장', d: '2026.04.20', text: '효율 4주 연속 개선 (108 → 122%). 5월부터 신입 2명 OJT 멘토 역할 부여 검토.' },
              { a: '김재배', r: '지점장', d: '2026.03.28', text: '적과 작업이 표준 대비 94%로 소폭 저조. 5월 정기 교육에서 적과 세션 참여 권장.' },
              { a: '이대한', r: '총괄', d: '2026.02.15', text: '월간 우수 작업자 선정. 인센티브 50만원 지급.' },
            ].map((m, i) => (
              <div key={i} style={{ padding: 12, background: T.bg, borderRadius: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <Avatar name={m.a[0]} size={22} c="slate" />
                  <span style={{ fontSize: 12, fontWeight: 700, color: T.text }}>{m.a}</span>
                  <Pill tone="muted" size="sm">{m.r}</Pill>
                  <span style={{ fontSize: 11, color: T.mutedSoft, marginLeft: 'auto' }}>{m.d}</span>
                </div>
                <div style={{ fontSize: 12, color: T.muted, lineHeight: 1.5 }}>{m.text}</div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

// ④ 비교
function PerformanceCompareScreen() {
  const picks = ['w01', 'w07', 'w10', 'w12'].map(id => PERF_DATA.workers.find(w => w.id === id));

  const rows = [
    { l: '지점 · 작물', get: w => `${PERF_DATA.branches.find(b => b.id === w.branch).name} · ${w.crop}` },
    { l: '종합 효율 (%)', get: w => w.efficiency, tone: w => toneByPct(w.efficiency), big: true, suffix: '%' },
    { l: '수확 달성률 (%)', get: w => w.harvestPct, tone: w => toneByPct(w.harvestPct), big: true, suffix: '%' },
    { l: '주요 속도 (주/분)', get: w => w.speedStem.toFixed(1), big: true },
    { l: '주간 처리 (주)', get: w => w.stemsWeek.toLocaleString() },
    { l: '출근률 (%)', get: w => w.attendance + '%' },
    { l: '입사일', get: w => w.joined },
  ];

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ background: T.surface, borderBottom: `1px solid ${T.border}`, padding: '20px 32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: T.mutedSoft, marginBottom: 6 }}>
          <span style={{ cursor: 'pointer' }}>성과 관리</span><span>›</span>
          <span style={{ color: T.text, fontWeight: 600 }}>비교 뷰</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: T.text, letterSpacing: -0.4, margin: 0 }}>{picks.length}명 나란히 비교</h1>
          <div style={{ display: 'flex', gap: 8 }}>
            {btnSecondary('PDF로', icons.clipboard)}
            {btnSecondary('선택 해제', icons.close)}
          </div>
        </div>
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: 24, background: T.bg, display: 'flex', flexDirection: 'column', gap: 16 }}>
        <Card style={{ background: T.primarySoft, borderLeft: `3px solid ${T.primary}`, fontSize: 12, color: T.primaryText, lineHeight: 1.6 }} pad={14}>
          <strong>정규화 비교:</strong> 선택된 4명은 지점·작물이 서로 다름. 숫자 직접 비교가 불가한 "속도"·"처리량"은 참고용이고, <strong>효율 %</strong>와 <strong>수확 달성률 %</strong>가 공정한 비교 지표입니다.
        </Card>

        <div style={{ display: 'grid', gridTemplateColumns: `160px repeat(${picks.length}, 1fr)`, gap: 12 }}>
          <div></div>
          {picks.map(w => (
            <Card key={w.id} pad={16} style={{ textAlign: 'center' }}>
              <Avatar name={w.name[0]} size={48} c={w.avatar} />
              <div style={{ fontSize: 14, fontWeight: 700, color: T.text, marginTop: 8 }}>{w.name}</div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, fontSize: 11, color: T.mutedSoft, marginTop: 2 }}>
                <Dot c={w.bc} />{PERF_DATA.branches.find(b => b.id === w.branch).name}
              </div>
              <div style={{ fontSize: 10, color: T.mutedSoft, marginTop: 2 }}>{w.crop}</div>
            </Card>
          ))}
        </div>

        <Card pad={0}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <tbody>
              {rows.map((row, i) => {
                const values = picks.map(row.get);
                return (
                  <tr key={i} style={{ borderBottom: `1px solid ${T.borderSoft}` }}>
                    <td style={{ padding: '14px 20px', fontSize: 12, fontWeight: 700, color: T.muted, background: T.bg, width: 180 }}>{row.l}</td>
                    {picks.map((w, j) => (
                      <td key={w.id} style={{
                        padding: '14px 20px', textAlign: 'center',
                        fontSize: row.big ? 22 : 12,
                        fontWeight: row.big ? 700 : 600,
                        color: row.tone ? row.tone(w) : T.text,
                        letterSpacing: row.big ? -0.5 : 0,
                        fontVariantNumeric: 'tabular-nums',
                      }}>
                        {values[j]}{row.suffix && <span style={{ fontSize: 11, color: T.mutedSoft, fontWeight: 500, marginLeft: 2 }}>{row.suffix}</span>}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>

        <Card>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: T.text, margin: 0, marginBottom: 16 }}>종합 효율 비교 (정규화)</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {picks.map(w => (
              <div key={w.id} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 110, fontSize: 12, fontWeight: 700, color: T.text, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Avatar name={w.name[0]} size={22} c={w.avatar} />
                  <span>{w.name}</span>
                </div>
                <div style={{ flex: 1, height: 24, background: T.bg, borderRadius: 6, overflow: 'hidden', position: 'relative' }}>
                  <div style={{
                    width: `${Math.min(w.efficiency / 140 * 100, 100)}%`,
                    height: '100%',
                    background: toneByPct(w.efficiency),
                    display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingRight: 10,
                    fontSize: 11, color: '#fff', fontWeight: 700,
                  }}>{w.efficiency}%</div>
                  <div style={{ position: 'absolute', top: 0, left: `${100 / 140 * 100}%`, width: 2, height: '100%', background: T.warning }} />
                </div>
              </div>
            ))}
          </div>
          <div style={{ fontSize: 10, color: T.mutedSoft, marginTop: 10, textAlign: 'right' }}>● 오렌지 라인 = 목표 100%</div>
        </Card>
      </div>
    </div>
  );
}
export { BranchPerformanceScreen, HQPerformanceScreen, PerformanceCompareScreen, PerformanceDetailScreen };
