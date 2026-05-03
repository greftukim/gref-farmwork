// 트랙 77 후속 U20 — 동별 물리 구조 편집 (zone_specs upsert)

import React, { useState, useEffect, useMemo } from 'react';
import { T } from '../../design/primitives';
import useZoneSpecStore from '../../stores/zoneSpecStore';
import { calculateZoneArea } from '../../lib/zoneCalc';

export default function ZoneSpecEditModal({ zone, spec, onClose, onSaved }) {
  const upsertSpec = useZoneSpecStore((s) => s.upsertSpec);

  const [bayLengthM, setBayLengthM] = useState('');
  const [bayCount, setBayCount] = useState('');
  const [bayWidthM, setBayWidthM] = useState('');
  const [bayWidthCount, setBayWidthCount] = useState('');
  const [corridorWidthM, setCorridorWidthM] = useState('');
  const [corridorCount, setCorridorCount] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setBayLengthM(spec?.bayLengthM ?? '');
    setBayCount(spec?.bayCount ?? '');
    setBayWidthM(spec?.bayWidthM ?? '');
    setBayWidthCount(spec?.bayWidthCount ?? '');
    setCorridorWidthM(spec?.corridorWidthM ?? '');
    setCorridorCount(spec?.corridorCount ?? '');
    setNotes(spec?.notes ?? '');
  }, [spec]);

  const preview = useMemo(() => calculateZoneArea({
    bayLengthM, bayCount, bayWidthM, bayWidthCount, corridorWidthM, corridorCount,
  }), [bayLengthM, bayCount, bayWidthM, bayWidthCount, corridorWidthM, corridorCount]);

  if (!zone) return null;

  const handleSave = async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      await upsertSpec(zone.id, {
        bayLengthM: numOrNull(bayLengthM),
        bayCount: numOrNull(bayCount),
        bayWidthM: numOrNull(bayWidthM),
        bayWidthCount: numOrNull(bayWidthCount),
        corridorWidthM: numOrNull(corridorWidthM),
        corridorCount: numOrNull(corridorCount),
        notes: notes.trim() || null,
      });
      onSaved?.();
    } catch (err) {
      console.error('ZoneSpecEditModal:', err);
      alert('저장 실패: ' + (err?.message || ''));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
      zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
    }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        background: T.surface, borderRadius: 12, width: '100%', maxWidth: 600,
        maxHeight: '90vh', overflow: 'auto',
        boxShadow: '0 12px 40px rgba(0,0,0,0.18)',
      }}>
        <div style={{ padding: '18px 20px', borderBottom: `1px solid ${T.borderSoft}` }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: T.mutedSoft, marginBottom: 4 }}>
            온실 물리 구조 — {zone.name}
          </div>
          <div style={{ fontSize: 16, fontWeight: 700, color: T.text }}>구조 입력 / 수정</div>
        </div>

        <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <FieldRow>
            <Field label="베이 길이 (m)">
              <input type="number" min="0" step="0.1" value={bayLengthM}
                onChange={(e) => setBayLengthM(e.target.value)} style={inputStyle} placeholder="예: 8" />
            </Field>
            <Field label="베이 동수">
              <input type="number" min="0" step="1" value={bayCount}
                onChange={(e) => setBayCount(e.target.value)} style={inputStyle} placeholder="예: 2" />
            </Field>
          </FieldRow>
          <FieldRow>
            <Field label="베이 폭 (m)">
              <input type="number" min="0" step="0.1" value={bayWidthM}
                onChange={(e) => setBayWidthM(e.target.value)} style={inputStyle} placeholder="예: 4.5" />
            </Field>
            <Field label="폭 동수">
              <input type="number" min="0" step="1" value={bayWidthCount}
                onChange={(e) => setBayWidthCount(e.target.value)} style={inputStyle} placeholder="예: 13" />
            </Field>
          </FieldRow>
          <FieldRow>
            <Field label="통로 폭 (m)">
              <input type="number" min="0" step="0.1" value={corridorWidthM}
                onChange={(e) => setCorridorWidthM(e.target.value)} style={inputStyle} placeholder="예: 3.5" />
            </Field>
            <Field label="통로 동수">
              <input type="number" min="0" step="1" value={corridorCount}
                onChange={(e) => setCorridorCount(e.target.value)} style={inputStyle} placeholder="예: 1" />
            </Field>
          </FieldRow>
          <Field label="메모 (선택)">
            <input type="text" value={notes} onChange={(e) => setNotes(e.target.value)}
              style={inputStyle} placeholder="예: 베이 1동 일부 자재 노후" />
          </Field>

          {/* 면적 미리보기 */}
          {preview && preview.greenhouseArea > 0 && (
            <div style={{
              background: T.bg, border: `1px solid ${T.borderSoft}`, borderRadius: 8,
              padding: 12, display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8,
            }}>
              <Preview label="온실 면적" value={`${fmt(preview.greenhouseArea, 1)} m²`} />
              <Preview label="실 재배면적" value={`${fmt(preview.cultivationArea, 1)} m²`} />
              <Preview label="평수" value={`${fmt(preview.areaPyeong, 1)} 평`} />
              <Preview label="통로 면적" value={`${fmt(preview.corridorArea, 1)} m²`} />
            </div>
          )}
        </div>

        <div style={{
          padding: '14px 20px', borderTop: `1px solid ${T.borderSoft}`, background: T.bg,
          display: 'flex', gap: 8, justifyContent: 'flex-end',
        }}>
          <button onClick={onClose} disabled={submitting} style={btnGhost}>취소</button>
          <button onClick={handleSave} disabled={submitting} style={btnPrimaryStyle(submitting)}>
            {submitting ? '저장 중...' : '저장'}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div style={{ flex: 1 }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: T.mutedSoft, marginBottom: 6 }}>{label}</div>
      {children}
    </div>
  );
}

function FieldRow({ children }) {
  return <div style={{ display: 'flex', gap: 10 }}>{children}</div>;
}

function Preview({ label, value }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <span style={{ fontSize: 10, fontWeight: 600, color: T.mutedSoft }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: 700, color: T.text }}>{value}</span>
    </div>
  );
}

function fmt(v, digits) {
  if (!Number.isFinite(v)) return '–';
  return v.toLocaleString('ko-KR', { maximumFractionDigits: digits, minimumFractionDigits: 0 });
}

function numOrNull(v) {
  if (v === '' || v === null || v === undefined) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

const inputStyle = {
  width: '100%', height: 38, padding: '0 10px',
  border: `1px solid ${T.border}`, borderRadius: 8,
  fontSize: 13, color: T.text, background: T.surface,
};

const btnGhost = {
  height: 36, padding: '0 14px', borderRadius: 8,
  border: `1px solid ${T.border}`, background: T.surface, color: T.muted,
  fontSize: 13, fontWeight: 600, cursor: 'pointer',
};

const btnPrimaryStyle = (submitting) => ({
  height: 36, padding: '0 18px', borderRadius: 8, border: 0,
  background: submitting ? T.borderSoft : T.primary,
  color: submitting ? T.mutedSoft : '#fff',
  fontSize: 13, fontWeight: 700,
  cursor: submitting ? 'not-allowed' : 'pointer',
});
