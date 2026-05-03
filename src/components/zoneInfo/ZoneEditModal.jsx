// 트랙 77 후속 U20 — 동 자체 추가/수정 (탭2 내)
// zones 테이블 — 기본 컬럼 (name, description) 한정. row_count / plant_count는 zone_specs로 이전.

import React, { useState, useEffect } from 'react';
import { T } from '../../design/primitives';
import useZoneStore from '../../stores/zoneStore';

export default function ZoneEditModal({ zone, onClose, onSaved }) {
  const addZone = useZoneStore((s) => s.addZone);
  const updateZone = useZoneStore((s) => s.updateZone);

  const isNew = !!zone?.__new;
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!zone) return;
    setName(isNew ? '' : zone.name || '');
    setDescription(isNew ? '' : zone.description || '');
  }, [zone, isNew]);

  if (!zone) return null;
  const valid = name.trim().length > 0;

  const handleSave = async () => {
    if (!valid || submitting) return;
    setSubmitting(true);
    try {
      if (isNew) {
        await addZone({ name: name.trim(), description: description.trim() });
      } else {
        await updateZone(zone.id, { name: name.trim(), description: description.trim() });
      }
      onSaved?.();
    } catch (err) {
      console.error('ZoneEditModal save:', err);
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
        background: T.surface, borderRadius: 12, width: '100%', maxWidth: 440,
        boxShadow: '0 12px 40px rgba(0,0,0,0.18)',
      }}>
        <div style={{ padding: '18px 20px', borderBottom: `1px solid ${T.borderSoft}` }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: T.mutedSoft, marginBottom: 4 }}>
            {isNew ? '동 추가' : '동 이름 수정'}
          </div>
          <div style={{ fontSize: 16, fontWeight: 700, color: T.text }}>
            {isNew ? '새 동을 등록하세요' : zone.name}
          </div>
        </div>
        <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Field label="동 이름 *">
            <input type="text" value={name} onChange={(e) => setName(e.target.value)}
              placeholder="예: A동" style={inputStyle} autoFocus />
          </Field>
          <Field label="메모 (선택)">
            <input type="text" value={description} onChange={(e) => setDescription(e.target.value)}
              placeholder="예: 1번 베이 토마토 전용" style={inputStyle} />
          </Field>
        </div>
        <div style={{
          padding: '14px 20px', borderTop: `1px solid ${T.borderSoft}`, background: T.bg,
          display: 'flex', gap: 8, justifyContent: 'flex-end',
        }}>
          <button onClick={onClose} disabled={submitting} style={{
            height: 36, padding: '0 14px', borderRadius: 8,
            border: `1px solid ${T.border}`, background: T.surface, color: T.muted,
            fontSize: 13, fontWeight: 600, cursor: 'pointer',
          }}>취소</button>
          <button onClick={handleSave} disabled={!valid || submitting} style={{
            height: 36, padding: '0 18px', borderRadius: 8, border: 0,
            background: valid && !submitting ? T.primary : T.borderSoft,
            color: valid && !submitting ? '#fff' : T.mutedSoft,
            fontSize: 13, fontWeight: 700,
            cursor: valid && !submitting ? 'pointer' : 'not-allowed',
          }}>{submitting ? '저장 중...' : isNew ? '추가' : '저장'}</button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <div style={{ fontSize: 11, fontWeight: 600, color: T.mutedSoft, marginBottom: 6 }}>{label}</div>
      {children}
    </div>
  );
}

const inputStyle = {
  width: '100%', height: 38, padding: '0 10px',
  border: `1px solid ${T.border}`, borderRadius: 8,
  fontSize: 13, color: T.text, background: T.surface,
};
