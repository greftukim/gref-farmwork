// 표식주 관리 — 관리자
// 경로: /admin/growth/markers

import React, { useState } from 'react';
import {
  Card, Icon, Pill, T, TopBar, icons,
} from '../../design/primitives';

const CROPS = ['토마토', '딸기', '파프리카', '오이', '가지'];
const GREENHOUSES = ['1cmp', '2cmp', '3cmp', '4cmp'];
const HEALTH = {
  good: { l: '양호', tone: 'success', fg: T.success, soft: T.successSoft },
  warn: { l: '주의', tone: 'warning', fg: T.warning, soft: T.warningSoft },
  risk: { l: '위험', tone: 'danger', fg: T.danger, soft: T.dangerSoft },
};

const inputStyle = {
  height: 38, padding: '0 12px',
  border: `1px solid ${T.border}`, borderRadius: 7,
  fontSize: 13, color: T.text, background: T.surface,
  outline: 'none', boxSizing: 'border-box', width: '100%',
};

const Label = ({ children, required }) => (
  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: T.muted, marginBottom: 6 }}>
    {children}{required && <span style={{ color: T.danger, marginLeft: 3 }}>*</span>}
  </label>
);

export default function MarkerPlantManagePage() {
  const [form, setForm] = useState({
    crop: '', greenhouse: '', bed: '', row: '',
    plantNo: '', startDate: new Date().toISOString().split('T')[0],
  });
  const [markers, setMarkers] = useState([
    { id: 'MK-0001', crop: '토마토', greenhouse: '1cmp', bed: 'A-01', row: 'N-1', plantNo: 3, startDate: '2026-02-10', health: 'good' },
    { id: 'MK-0002', crop: '토마토', greenhouse: '1cmp', bed: 'A-02', row: 'N-5', plantNo: 12, startDate: '2026-02-10', health: 'warn' },
    { id: 'MK-0003', crop: '딸기', greenhouse: '2cmp', bed: 'B-04', row: 'S-2', plantNo: 7, startDate: '2026-03-01', health: 'good' },
    { id: 'MK-0004', crop: '파프리카', greenhouse: '3cmp', bed: 'C-08', row: 'E-3', plantNo: 22, startDate: '2026-01-15', health: 'risk' },
  ]);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const add = () => {
    if (!form.crop || !form.greenhouse || !form.bed) return;
    const nextId = `MK-${String(markers.length + 1).padStart(4, '0')}`;
    setMarkers([{ id: nextId, ...form, plantNo: Number(form.plantNo) || 0, health: 'good' }, ...markers]);
    setForm({ crop: '', greenhouse: '', bed: '', row: '', plantNo: '', startDate: new Date().toISOString().split('T')[0] });
  };

  const counts = {
    total: markers.length,
    good: markers.filter((m) => m.health === 'good').length,
    warn: markers.filter((m) => m.health === 'warn').length,
    risk: markers.filter((m) => m.health === 'risk').length,
  };

  return (
    <div style={{ flex: 1, overflow: 'auto', background: T.bg, minWidth: 0 }}>
      <TopBar subtitle="생육조사" title="표식주 관리" />

      <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
        {/* KPI */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
          {[
            { l: '전체 표식주', v: counts.total, tone: T.primary, soft: T.primarySoft },
            { l: '양호', v: counts.good, tone: T.success, soft: T.successSoft },
            { l: '주의', v: counts.warn, tone: T.warning, soft: T.warningSoft },
            { l: '위험', v: counts.risk, tone: T.danger, soft: T.dangerSoft },
          ].map((k, i) => (
            <Card key={i} pad={18} style={{ position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: k.tone }} />
              <div style={{ fontSize: 12, color: T.muted, fontWeight: 600, marginBottom: 14 }}>{k.l}</div>
              <div style={{ fontSize: 36, fontWeight: 700, color: T.text, letterSpacing: -1, lineHeight: 1 }}>{k.v}</div>
              <div style={{ fontSize: 11, color: T.mutedSoft, marginTop: 8 }}>주</div>
            </Card>
          ))}
        </div>

        {/* 등록 폼 */}
        <Card pad={20}>
          <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 28, height: 28, borderRadius: 7, background: T.primarySoft, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon d={icons.sprout} size={14} c={T.primary} sw={2.2} />
            </div>
            <div>
              <h3 style={{ fontSize: 14, fontWeight: 700, color: T.text, margin: 0 }}>새 표식주 등록</h3>
              <p style={{ fontSize: 11, color: T.mutedSoft, margin: '2px 0 0' }}>위치 정보를 정확히 입력해 주세요</p>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 10, alignItems: 'end' }}>
            <div>
              <Label required>작물</Label>
              <select value={form.crop} onChange={set('crop')} style={inputStyle}>
                <option value="">선택</option>
                {CROPS.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <Label required>온실</Label>
              <select value={form.greenhouse} onChange={set('greenhouse')} style={inputStyle}>
                <option value="">선택</option>
                {GREENHOUSES.map((g) => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>
            <div>
              <Label required>Bed</Label>
              <input value={form.bed} onChange={set('bed')} placeholder="A-01" style={inputStyle} />
            </div>
            <div>
              <Label>Row</Label>
              <input value={form.row} onChange={set('row')} placeholder="N-1" style={inputStyle} />
            </div>
            <div>
              <Label>개체 번호</Label>
              <input type="number" value={form.plantNo} onChange={set('plantNo')} placeholder="1" style={inputStyle} />
            </div>
            <div>
              <Label>시작일</Label>
              <input type="date" value={form.startDate} onChange={set('startDate')} style={inputStyle} />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 14 }}>
            <button onClick={add}
              disabled={!form.crop || !form.greenhouse || !form.bed}
              style={{
                height: 38, padding: '0 18px', borderRadius: 8, border: 0,
                background: T.primary, color: '#fff',
                fontSize: 13, fontWeight: 700, cursor: 'pointer',
                opacity: (!form.crop || !form.greenhouse || !form.bed) ? 0.5 : 1,
                display: 'inline-flex', alignItems: 'center', gap: 6,
                boxShadow: '0 1px 2px rgba(79,70,229,0.25)',
              }}>
              <Icon d={icons.plus} size={13} c="#fff" sw={2.4} />
              표식주 등록
            </button>
          </div>
        </Card>

        {/* 목록 */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: T.text, margin: 0 }}>등록된 표식주</h3>
            <span style={{ fontSize: 11, color: T.mutedSoft }}>{markers.length}주</span>
          </div>

          {markers.length === 0 ? (
            <Card pad={40} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 13, color: T.mutedSoft }}>등록된 표식주가 없습니다</div>
            </Card>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12 }}>
              {markers.map((m) => {
                const h = HEALTH[m.health];
                return (
                  <Card key={m.id} pad={0} style={{ overflow: 'hidden' }}>
                    <div style={{ height: 3, background: h.fg }} />
                    <div style={{ padding: 14 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                        <span style={{ fontSize: 11, fontWeight: 700, color: T.mutedSoft, fontFamily: 'ui-monospace,monospace', letterSpacing: 0.3 }}>{m.id}</span>
                        <span style={{
                          fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 4,
                          background: h.soft, color: h.fg,
                        }}>{h.l}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                        <div style={{
                          width: 32, height: 32, borderRadius: 8, background: T.successSoft,
                          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                        }}>
                          <Icon d={icons.sprout} size={16} c={T.success} sw={2} />
                        </div>
                        <div>
                          <div style={{ fontSize: 14, fontWeight: 700, color: T.text }}>{m.crop}</div>
                          <div style={{ fontSize: 11, color: T.mutedSoft }}>{m.greenhouse}</div>
                        </div>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6, padding: 10, background: T.bg, borderRadius: 7, marginBottom: 10 }}>
                        {[
                          { l: 'Bed', v: m.bed },
                          { l: 'Row', v: m.row || '—' },
                          { l: 'No.', v: m.plantNo || '—' },
                        ].map((f) => (
                          <div key={f.l} style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: 9, color: T.mutedSoft, fontWeight: 700, marginBottom: 2 }}>{f.l}</div>
                            <div style={{ fontSize: 12, fontWeight: 700, color: T.text, fontFamily: 'ui-monospace,monospace' }}>{f.v}</div>
                          </div>
                        ))}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 10, color: T.mutedSoft }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                          <Icon d={icons.calendar} size={10} c={T.mutedSoft} sw={2} />
                          {m.startDate}
                        </span>
                        <button style={{
                          fontSize: 11, fontWeight: 600, color: T.primary,
                          background: 'transparent', border: 0, cursor: 'pointer',
                        }}>상세 →</button>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
