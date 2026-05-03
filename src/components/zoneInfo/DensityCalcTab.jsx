// 트랙 77 후속 U20 — 탭3: 재식밀도 계산
// 동·작기 selector → 1+2단계 derive (zoneCalc) → 결과 카드 + 산식 박제

import React, { useMemo, useState, useEffect } from 'react';
import { T } from '../../design/primitives';
import { calculateZoneArea, calculatePlantingDensity, FORMULA_NOTES } from '../../lib/zoneCalc';

export default function DensityCalcTab({ zones, specs, zoneCrops, crops, onGoToCropTab }) {
  const [zoneId, setZoneId] = useState('');
  const [zoneCropId, setZoneCropId] = useState('');

  // 첫 진입 시 첫 동 + 해당 동의 첫 작기 자동 선택
  useEffect(() => {
    if (!zoneId && (zones || []).length > 0) {
      setZoneId(zones[0].id);
    }
  }, [zones, zoneId]);

  const filteredCrops = useMemo(() => {
    if (!zoneId) return [];
    return (zoneCrops || []).filter((zc) => zc.zoneId === zoneId);
  }, [zoneCrops, zoneId]);

  useEffect(() => {
    if (zoneId && filteredCrops.length > 0 && !filteredCrops.some((zc) => zc.id === zoneCropId)) {
      setZoneCropId(filteredCrops[0].id);
    } else if (filteredCrops.length === 0) {
      setZoneCropId('');
    }
  }, [zoneId, filteredCrops, zoneCropId]);

  const spec = useMemo(() => (specs || []).find((s) => s.zoneId === zoneId), [specs, zoneId]);
  const zoneCrop = useMemo(() => (zoneCrops || []).find((z) => z.id === zoneCropId), [zoneCrops, zoneCropId]);

  const area = useMemo(() => calculateZoneArea(spec), [spec]);
  const density = useMemo(() => calculatePlantingDensity(zoneCrop, area), [zoneCrop, area]);

  const zone = (zones || []).find((z) => z.id === zoneId);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* selector */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        <Selector label="동">
          <select value={zoneId} onChange={(e) => setZoneId(e.target.value)} style={selectStyle}>
            <option value="">선택</option>
            {(zones || []).map((z) => <option key={z.id} value={z.id}>{z.name}</option>)}
          </select>
        </Selector>
        <Selector label="작기">
          <select value={zoneCropId} onChange={(e) => setZoneCropId(e.target.value)} style={selectStyle}
            disabled={filteredCrops.length === 0}>
            <option value="">{filteredCrops.length === 0 ? '작기 없음' : '선택'}</option>
            {filteredCrops.map((zc) => (
              <option key={zc.id} value={zc.id}>
                {zc.crops?.name || '–'}{zc.cultivar ? ` · ${zc.cultivar}` : ''}{zc.seasonLabel ? ` (${zc.seasonLabel})` : ''}
                {zc.endedAt ? ' [종료]' : ''}
              </option>
            ))}
          </select>
        </Selector>
        <button
          onClick={() => onGoToCropTab?.(zoneCropId)}
          disabled={!zoneCropId}
          style={{
            marginLeft: 'auto',
            height: 32, padding: '0 12px', borderRadius: 6,
            border: `1px solid ${T.border}`, background: T.surface,
            color: zoneCropId ? T.primary : T.mutedSoft,
            fontSize: 12, fontWeight: 700, cursor: zoneCropId ? 'pointer' : 'default',
          }}
        >탭1에서 편집 →</button>
      </div>

      {/* 1단계: 온실 물리 구조 (read-only) */}
      <Section title={`1단계 — 온실 물리 구조${zone ? ` (${zone.name})` : ''}`}>
        {!spec ? (
          <EmptyHint>물리 구조 미입력 — 탭2(온실 기초 정보)에서 먼저 입력</EmptyHint>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
            <Stat label="베이 길이">{fmt(spec.bayLengthM)} m × {fmt(spec.bayCount)}동</Stat>
            <Stat label="베이 폭">{fmt(spec.bayWidthM)} m × {fmt(spec.bayWidthCount)}동</Stat>
            <Stat label="통로">{fmt(spec.corridorWidthM)} m × {fmt(spec.corridorCount)}동</Stat>
            <Stat label="온실 면적" highlight>{fmt(area.greenhouseArea, 1)} m²</Stat>
            <Stat label="실 재배면적" highlight>{fmt(area.cultivationArea, 1)} m²</Stat>
            <Stat label="평수">{fmt(area.areaPyeong, 1)} 평</Stat>
          </div>
        )}
      </Section>

      {/* 2단계: 식재 정보 (read-only) */}
      <Section title="2단계 — 식재 정보 + 재식밀도">
        {!zoneCrop ? (
          <EmptyHint>작기 미선택 — 위 selector에서 작기를 선택하세요</EmptyHint>
        ) : !density || !spec ? (
          <EmptyHint>물리 구조 또는 식재 정보 미입력 — 탭1·탭2에서 보완하세요</EmptyHint>
        ) : (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 14 }}>
              <Stat label="줄수/베이">{fmt(zoneCrop.rowsPerBay)}</Stat>
              <Stat label="작물수/슬라브">{fmt(zoneCrop.plantsPerSlab)}</Stat>
              <Stat label="슬라브 간격">{fmt(zoneCrop.slabGapCm)} cm</Stat>
              <Stat label="슬라브 길이">{fmt(zoneCrop.slabLengthCm)} cm</Stat>
              <Stat label="슬라브 폭">{fmt(zoneCrop.slabWidthCm)} cm</Stat>
              <Stat label="슬라브 높이">{fmt(zoneCrop.slabHeightCm)} cm</Stat>
            </div>
            <div style={{
              borderTop: `1px solid ${T.borderSoft}`, paddingTop: 14,
              display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10,
            }}>
              <Stat label="총 줄수" highlight>{fmt(density.totalRows)} 줄</Stat>
              <Stat label="1줄당 슬라브" highlight>{fmt(density.slabsPerRow)} 개</Stat>
              <Stat label="총 슬라브 수" highlight>{fmt(density.totalSlabs)} 개</Stat>
              <Stat label="총 식재수량" highlight>{fmt(density.totalPlants)} 주</Stat>
              <Stat label="재식밀도" highlight>{fmt(density.plantingDensity, 2)} 주/m²</Stat>
              <Stat label="배지볼륨/m²" highlight>{fmt(density.mediumVolumePerM2, 2)} L/m²</Stat>
              <Stat label="슬라브 볼륨">{fmt(density.slabVolumeL, 2)} L</Stat>
            </div>
          </>
        )}
      </Section>

      {/* 산식 박제 */}
      <Section title="산식 박제 (사용자 제공 엑셀 추종)">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 14 }}>
          <FormulaBlock title="1단계 — 면적">
            {FORMULA_NOTES.zoneArea.map((line, i) => (
              <li key={i}>{line}</li>
            ))}
          </FormulaBlock>
          <FormulaBlock title="2단계 — 재식밀도">
            {FORMULA_NOTES.density.map((line, i) => (
              <li key={i}>{line}</li>
            ))}
          </FormulaBlock>
        </div>
        <div style={{ marginTop: 12, fontSize: 11, color: T.mutedSoft, lineHeight: 1.6 }}>
          본 라운드는 1+2단계만 구현. 자재 소요량(P2)·발주(P3)는 별 트랙
          (TRACK77-FOLLOWUP-MATERIAL-CALC-001 / TRACK77-FOLLOWUP-PURCHASE-ORDER-001).
        </div>
      </Section>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div style={{
      background: T.surface, border: `1px solid ${T.border}`, borderRadius: 10,
      padding: 16, display: 'flex', flexDirection: 'column', gap: 10,
    }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: T.text }}>{title}</div>
      {children}
    </div>
  );
}

function Stat({ label, highlight, children }) {
  return (
    <div style={{
      padding: '10px 12px', borderRadius: 8,
      background: highlight ? T.primarySoft : T.bg,
      border: `1px solid ${highlight ? T.primary : T.borderSoft}`,
    }}>
      <div style={{ fontSize: 10, fontWeight: 600, color: highlight ? T.primary : T.mutedSoft, marginBottom: 3 }}>{label}</div>
      <div style={{ fontSize: 14, fontWeight: 700, color: highlight ? T.primary : T.text }}>{children}</div>
    </div>
  );
}

function EmptyHint({ children }) {
  return (
    <div style={{
      padding: 24, textAlign: 'center',
      background: T.bg, border: `1px dashed ${T.border}`, borderRadius: 8,
      color: T.mutedSoft, fontSize: 12, fontStyle: 'italic',
    }}>{children}</div>
  );
}

function FormulaBlock({ title, children }) {
  return (
    <div style={{ background: T.bg, border: `1px solid ${T.borderSoft}`, borderRadius: 8, padding: 12 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: T.text, marginBottom: 6 }}>{title}</div>
      <ul style={{ margin: 0, paddingLeft: 18, fontSize: 11, color: T.muted, lineHeight: 1.7 }}>
        {children}
      </ul>
    </div>
  );
}

function Selector({ label, children }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <span style={{ fontSize: 11, fontWeight: 700, color: T.mutedSoft, letterSpacing: 0.4, textTransform: 'uppercase' }}>{label}</span>
      {children}
    </div>
  );
}

function fmt(v, digits = 0) {
  if (v === null || v === undefined || v === '' || !Number.isFinite(Number(v))) return '–';
  return Number(v).toLocaleString('ko-KR', { maximumFractionDigits: digits, minimumFractionDigits: 0 });
}

const selectStyle = {
  height: 32, padding: '0 8px', borderRadius: 6,
  border: `1px solid ${T.border}`, background: T.surface,
  fontSize: 12, fontWeight: 600, color: T.text, cursor: 'pointer',
};
