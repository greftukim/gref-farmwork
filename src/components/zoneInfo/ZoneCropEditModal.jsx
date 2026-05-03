// 트랙 77 후속 U20 — 작기 편집 + 자유 이벤트 (zone_crops + zone_crop_events)
// G77-PPP: 작기 종료 = ended_at = today UPDATE만 (별 confirm 없이 즉시).
// G77-QQQ: 작기 신규 = started_at default = today.

import React, { useState, useEffect, useMemo } from 'react';
import { T } from '../../design/primitives';
import useZoneCropStore from '../../stores/zoneCropStore';
import useAuthStore from '../../stores/authStore';

function todayKey() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export default function ZoneCropEditModal({ target, zones, crops, stdEvents, onClose, onSaved }) {
  const addZoneCrop = useZoneCropStore((s) => s.addZoneCrop);
  const updateZoneCrop = useZoneCropStore((s) => s.updateZoneCrop);
  const endZoneCrop = useZoneCropStore((s) => s.endZoneCrop);
  const deleteZoneCrop = useZoneCropStore((s) => s.deleteZoneCrop);
  const addEvent = useZoneCropStore((s) => s.addEvent);
  const updateEvent = useZoneCropStore((s) => s.updateEvent);
  const deleteEvent = useZoneCropStore((s) => s.deleteEvent);
  const currentUser = useAuthStore((s) => s.currentUser);

  const isNew = !!target?.__new;

  // 작기 본문
  const [zoneId, setZoneId] = useState('');
  const [cropId, setCropId] = useState('');
  const [cultivar, setCultivar] = useState('');
  const [seasonLabel, setSeasonLabel] = useState('');
  const [startedAt, setStartedAt] = useState('');

  // 식재 정보 (엑셀 산식 입력)
  const [rowsPerBay, setRowsPerBay] = useState('');
  const [slabLengthCm, setSlabLengthCm] = useState('');
  const [slabWidthCm, setSlabWidthCm] = useState('');
  const [slabHeightCm, setSlabHeightCm] = useState('');
  const [plantsPerSlab, setPlantsPerSlab] = useState('');
  const [stemsPerPlant, setStemsPerPlant] = useState('');
  const [slabGapCm, setSlabGapCm] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // 이벤트 (사전 정의 3 + 자유)
  const [events, setEvents] = useState([]); // [{id?, type, label, date, isNew?}]

  useEffect(() => {
    if (!target) return;
    setZoneId(target.zoneId || '');
    setCropId(target.cropId || '');
    setCultivar(target.cultivar || '');
    setSeasonLabel(target.seasonLabel || '');
    setStartedAt(target.startedAt || (isNew ? todayKey() : ''));
    setRowsPerBay(target.rowsPerBay ?? '');
    setSlabLengthCm(target.slabLengthCm ?? '');
    setSlabWidthCm(target.slabWidthCm ?? '');
    setSlabHeightCm(target.slabHeightCm ?? '');
    setPlantsPerSlab(target.plantsPerSlab ?? '');
    setStemsPerPlant(target.stemsPerPlant ?? '');
    setSlabGapCm(target.slabGapCm ?? '');
    setNotes(target.notes || '');
    if (isNew) {
      // 신규 생성 시: 사전 정의 3 이벤트는 빈 row로 미리 노출
      setEvents(stdEvents.map((s) => ({
        type: s.type, label: s.label, date: '', isNew: true,
      })));
    } else {
      setEvents((target.events || []).map((e) => ({
        id: e.id, type: e.eventType, label: e.eventLabel, date: e.eventDate, notes: e.notes || '',
      })));
    }
  }, [target, isNew, stdEvents]);

  if (!target) return null;
  const valid = zoneId && cropId;

  const handleSave = async () => {
    if (!valid || submitting) return;
    setSubmitting(true);
    try {
      let saved;
      const payload = {
        zoneId,
        cropId,
        cultivar: cultivar.trim() || null,
        seasonLabel: seasonLabel.trim() || null,
        startedAt: startedAt || null,
        rowsPerBay: numOrNull(rowsPerBay),
        slabLengthCm: numOrNull(slabLengthCm),
        slabWidthCm: numOrNull(slabWidthCm),
        slabHeightCm: numOrNull(slabHeightCm),
        plantsPerSlab: numOrNull(plantsPerSlab),
        stemsPerPlant: numOrNull(stemsPerPlant),
        slabGapCm: numOrNull(slabGapCm),
        notes: notes.trim() || null,
      };
      if (isNew) {
        saved = await addZoneCrop(payload);
      } else {
        saved = await updateZoneCrop(target.id, payload);
      }
      const zoneCropId = saved.id;

      // 이벤트 변경분 반영
      const originalEvents = isNew ? [] : (target.events || []);
      // 1) 추가 (id 없음 + date 채움)
      for (const ev of events) {
        if (!ev.id && ev.date) {
          await addEvent(zoneCropId, {
            eventType: ev.type,
            eventLabel: ev.label,
            eventDate: ev.date,
            notes: ev.notes || null,
            createdBy: currentUser?.id || null,
          });
        }
      }
      // 2) 수정 (id 존재 + 변경)
      for (const ev of events) {
        if (!ev.id) continue;
        const orig = originalEvents.find((o) => o.id === ev.id);
        if (!orig) continue;
        if (orig.eventLabel !== ev.label || orig.eventDate !== ev.date || (orig.notes || '') !== (ev.notes || '')) {
          await updateEvent(zoneCropId, ev.id, {
            eventLabel: ev.label, eventDate: ev.date, notes: ev.notes || null,
          });
        }
      }
      // 3) 삭제 (원본에 있고 events에 id가 없음)
      const keepIds = new Set(events.filter((e) => e.id).map((e) => e.id));
      for (const orig of originalEvents) {
        if (!keepIds.has(orig.id)) {
          await deleteEvent(zoneCropId, orig.id);
        }
      }

      onSaved?.();
    } catch (err) {
      console.error('ZoneCropEditModal save:', err);
      alert('저장 실패: ' + (err?.message || ''));
    } finally {
      setSubmitting(false);
    }
  };

  const handleEnd = async () => {
    if (isNew || !target.id) return;
    if (!window.confirm('이 작기를 종료하시겠습니까? (오늘 날짜로 종료)')) return;
    setSubmitting(true);
    try {
      await endZoneCrop(target.id);
      onSaved?.();
    } catch (err) {
      alert('종료 실패: ' + (err?.message || ''));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (isNew || !target.id) return;
    if (!window.confirm('이 작기를 삭제하시겠습니까? (이벤트도 함께 삭제됩니다)')) return;
    setSubmitting(true);
    try {
      await deleteZoneCrop(target.id);
      onSaved?.();
    } catch (err) {
      alert('삭제 실패: ' + (err?.message || ''));
    } finally {
      setSubmitting(false);
    }
  };

  const addCustomEvent = () => {
    setEvents((arr) => [...arr, { type: 'custom', label: '', date: '', isNew: true }]);
  };

  const updateEventLocal = (idx, patch) => {
    setEvents((arr) => arr.map((e, i) => (i === idx ? { ...e, ...patch } : e)));
  };

  const removeEventLocal = (idx) => {
    setEvents((arr) => arr.filter((_, i) => i !== idx));
  };

  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
      zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
    }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        background: T.surface, borderRadius: 12, width: '100%', maxWidth: 680,
        maxHeight: '90vh', overflow: 'auto',
        boxShadow: '0 12px 40px rgba(0,0,0,0.18)',
      }}>
        <div style={{ padding: '18px 20px', borderBottom: `1px solid ${T.borderSoft}` }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: T.mutedSoft, marginBottom: 4 }}>
            {isNew ? '작기 추가' : '작기 편집'}
          </div>
          <div style={{ fontSize: 16, fontWeight: 700, color: T.text }}>
            {isNew ? '새 작기를 등록하세요' : `${target.crops?.name || '–'}${target.cultivar ? ` · ${target.cultivar}` : ''}`}
          </div>
        </div>

        <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* 동 + 작물 */}
          <div style={{ display: 'flex', gap: 10 }}>
            <Field label="동 *">
              <select value={zoneId} onChange={(e) => setZoneId(e.target.value)} style={inputStyle}>
                <option value="">선택</option>
                {(zones || []).map((z) => <option key={z.id} value={z.id}>{z.name}</option>)}
              </select>
            </Field>
            <Field label="작물 *">
              <select value={cropId} onChange={(e) => setCropId(e.target.value)} style={inputStyle}>
                <option value="">선택</option>
                {(crops || []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </Field>
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <Field label="품종 (자유 텍스트)">
              <input type="text" value={cultivar} onChange={(e) => setCultivar(e.target.value)}
                style={inputStyle} placeholder="예: 대저짭짤이" />
            </Field>
            <Field label="작기 라벨">
              <input type="text" value={seasonLabel} onChange={(e) => setSeasonLabel(e.target.value)}
                style={inputStyle} placeholder="예: 2026 1기작" />
            </Field>
          </div>

          <Field label="시작일">
            <input type="date" value={startedAt} onChange={(e) => setStartedAt(e.target.value)}
              style={inputStyle} />
          </Field>

          {/* 이벤트 */}
          <div style={{ borderTop: `1px solid ${T.borderSoft}`, paddingTop: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: T.text }}>주요 시점 (이벤트)</span>
              <button
                onClick={addCustomEvent}
                style={{
                  marginLeft: 'auto',
                  height: 26, padding: '0 10px', borderRadius: 6,
                  border: `1px solid ${T.border}`, background: T.surface, color: T.primary,
                  fontSize: 11, fontWeight: 700, cursor: 'pointer',
                }}
              >+ 자유 이벤트</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {events.map((ev, idx) => (
                <div key={ev.id || `new-${idx}`} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <input
                    type="text"
                    value={ev.label}
                    onChange={(e) => updateEventLocal(idx, { label: e.target.value })}
                    placeholder="라벨"
                    style={{ ...inputStyle, flex: 1 }}
                    disabled={ev.type !== 'custom' && !!ev.id === false && stdEvents.some((s) => s.type === ev.type)}
                  />
                  <input
                    type="date"
                    value={ev.date}
                    onChange={(e) => updateEventLocal(idx, { date: e.target.value })}
                    style={{ ...inputStyle, flex: 1 }}
                  />
                  <button
                    onClick={() => removeEventLocal(idx)}
                    title="삭제"
                    style={{
                      width: 32, height: 38, borderRadius: 6,
                      border: `1px solid ${T.border}`, background: T.surface, color: T.danger,
                      fontSize: 16, cursor: 'pointer', lineHeight: 1, padding: 0,
                    }}
                  >×</button>
                </div>
              ))}
              {events.length === 0 && (
                <div style={{ fontSize: 11, color: T.mutedSoft, fontStyle: 'italic' }}>이벤트 없음</div>
              )}
            </div>
          </div>

          {/* 식재 정보 */}
          <div style={{ borderTop: `1px solid ${T.borderSoft}`, paddingTop: 14 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: T.text, marginBottom: 10 }}>
              식재 정보 (재식밀도 산식 입력)
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
              <Field label="줄수/베이">
                <input type="number" min="0" step="1" value={rowsPerBay}
                  onChange={(e) => setRowsPerBay(e.target.value)} style={inputStyle} placeholder="예: 8" />
              </Field>
              <Field label="작물수/슬라브">
                <input type="number" min="0" step="1" value={plantsPerSlab}
                  onChange={(e) => setPlantsPerSlab(e.target.value)} style={inputStyle} placeholder="예: 4" />
              </Field>
              <Field label="줄기수/작물">
                <input type="number" min="0" step="1" value={stemsPerPlant}
                  onChange={(e) => setStemsPerPlant(e.target.value)} style={inputStyle} placeholder="예: 1" />
              </Field>
              <Field label="슬라브 간격 (cm)">
                <input type="number" min="0" step="0.1" value={slabGapCm}
                  onChange={(e) => setSlabGapCm(e.target.value)} style={inputStyle} placeholder="예: 5" />
              </Field>
              <Field label="슬라브 길이 (cm)">
                <input type="number" min="0" step="0.1" value={slabLengthCm}
                  onChange={(e) => setSlabLengthCm(e.target.value)} style={inputStyle} placeholder="예: 100" />
              </Field>
              <Field label="슬라브 폭 (cm)">
                <input type="number" min="0" step="0.1" value={slabWidthCm}
                  onChange={(e) => setSlabWidthCm(e.target.value)} style={inputStyle} placeholder="예: 20" />
              </Field>
              <Field label="슬라브 높이 (cm)">
                <input type="number" min="0" step="0.1" value={slabHeightCm}
                  onChange={(e) => setSlabHeightCm(e.target.value)} style={inputStyle} placeholder="예: 7.5" />
              </Field>
            </div>
          </div>

          <Field label="메모">
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2}
              style={{ ...inputStyle, height: 'auto', padding: 10, resize: 'vertical', fontFamily: 'inherit' }}
              placeholder="작기 관련 메모" />
          </Field>
        </div>

        <div style={{
          padding: '14px 20px', borderTop: `1px solid ${T.borderSoft}`, background: T.bg,
          display: 'flex', gap: 8, alignItems: 'center',
        }}>
          {!isNew && (
            <>
              <button onClick={handleDelete} disabled={submitting} style={btnDanger}>삭제</button>
              {!target.endedAt && (
                <button onClick={handleEnd} disabled={submitting} style={btnGhost}>작기 종료</button>
              )}
            </>
          )}
          <div style={{ flex: 1 }} />
          <button onClick={onClose} disabled={submitting} style={btnGhost}>취소</button>
          <button onClick={handleSave} disabled={!valid || submitting}
            style={{
              height: 36, padding: '0 18px', borderRadius: 8, border: 0,
              background: valid && !submitting ? T.primary : T.borderSoft,
              color: valid && !submitting ? '#fff' : T.mutedSoft,
              fontSize: 13, fontWeight: 700,
              cursor: valid && !submitting ? 'pointer' : 'not-allowed',
            }}
          >{submitting ? '저장 중...' : isNew ? '추가' : '저장'}</button>
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
const btnDanger = {
  height: 36, padding: '0 14px', borderRadius: 8,
  border: `1px solid #F1C7C7`, background: T.surface, color: T.danger,
  fontSize: 13, fontWeight: 600, cursor: 'pointer',
};
