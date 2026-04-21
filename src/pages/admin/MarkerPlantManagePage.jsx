// 표식주 관리 — 관리자
// 경로: /admin/growth/markers

import React, { useState, useEffect } from 'react';
import {
  Card, Icon, T, TopBar, icons,
} from '../../design/primitives';
import { supabase } from '../../lib/supabase';
import useCropStore from '../../stores/cropStore';

const HEALTH = {
  good: { l: '양호', fg: T.success, soft: T.successSoft },
  warn: { l: '주의', fg: T.warning, soft: T.warningSoft },
  risk: { l: '위험', fg: T.danger, soft: T.dangerSoft },
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
  const crops = useCropStore((s) => s.crops);
  const [greenhouses, setGreenhouses] = useState([]);
  const [markers, setMarkers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    cropId: '', greenhouseId: '', bed: '', row: '',
    plantNo: '', startDate: new Date().toISOString().split('T')[0],
  });

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const [ghRes, mpRes] = await Promise.all([
        supabase.from('greenhouses').select('id, name').order('name'),
        supabase.from('marker_plants')
          .select('*, crops(name), greenhouses(name)')
          .eq('is_active', true)
          .order('created_at', { ascending: false }),
      ]);
      if (ghRes.data) setGreenhouses(ghRes.data);
      if (mpRes.data) setMarkers(mpRes.data);
      setLoading(false);
    };
    load();
  }, []);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const add = async () => {
    if (!form.cropId || !form.greenhouseId || !form.bed || submitting) return;
    setSubmitting(true);
    const { data, error } = await supabase.from('marker_plants').insert({
      crop_id: form.cropId,
      branch: 'busan',
      greenhouse_id: form.greenhouseId,
      bed: form.bed,
      row_label: form.row || null,
      plant_no: form.plantNo ? Number(form.plantNo) : null,
      start_date: form.startDate,
      health: 'good',
      is_active: true,
    }).select('*, crops(name), greenhouses(name)').single();
    if (!error && data) {
      setMarkers([data, ...markers]);
      setForm({ cropId: '', greenhouseId: '', bed: '', row: '', plantNo: '', startDate: new Date().toISOString().split('T')[0] });
    }
    setSubmitting(false);
  };

  const deactivate = async (id) => {
    const { error } = await supabase.from('marker_plants').update({ is_active: false }).eq('id', id);
    if (!error) setMarkers((prev) => prev.filter((m) => m.id !== id));
  };

  const counts = {
    total: markers.length,
    good: markers.filter((m) => m.health === 'good').length,
    warn: markers.filter((m) => m.health === 'warn').length,
    risk: markers.filter((m) => m.health === 'risk').length,
  };

  const canAdd = form.cropId && form.greenhouseId && form.bed && !submitting;

  return (
    <div style={{ flex: 1, overflow: 'auto', background: T.bg, minWidth: 0 }}>
      <TopBar subtitle="생육조사" title="표식주 관리" />

      <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
        {/* KPI */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
          {[
            { l: '전체 표식주', v: counts.total, tone: T.primary },
            { l: '양호', v: counts.good, tone: T.success },
            { l: '주의', v: counts.warn, tone: T.warning },
            { l: '위험', v: counts.risk, tone: T.danger },
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
              <select value={form.cropId} onChange={set('cropId')} style={inputStyle}>
                <option value="">선택</option>
                {crops.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <Label required>온실</Label>
              <select value={form.greenhouseId} onChange={set('greenhouseId')} style={inputStyle}>
                <option value="">선택</option>
                {greenhouses.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
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
            <button onClick={add} disabled={!canAdd}
              style={{
                height: 38, padding: '0 18px', borderRadius: 8, border: 0,
                background: T.primary, color: '#fff',
                fontSize: 13, fontWeight: 700, cursor: 'pointer',
                opacity: canAdd ? 1 : 0.5,
                display: 'inline-flex', alignItems: 'center', gap: 6,
                boxShadow: '0 1px 2px rgba(79,70,229,0.25)',
              }}>
              <Icon d={icons.plus} size={13} c="#fff" sw={2.4} />
              {submitting ? '등록 중...' : '표식주 등록'}
            </button>
          </div>
        </Card>

        {/* 목록 */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: T.text, margin: 0 }}>등록된 표식주</h3>
            <span style={{ fontSize: 11, color: T.mutedSoft }}>{markers.length}주</span>
          </div>

          {loading ? (
            <Card pad={40} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 13, color: T.mutedSoft }}>불러오는 중...</div>
            </Card>
          ) : markers.length === 0 ? (
            <Card pad={40} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 13, color: T.mutedSoft }}>등록된 표식주가 없습니다</div>
            </Card>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12 }}>
              {markers.map((m) => {
                const h = HEALTH[m.health] || HEALTH.good;
                const shortId = m.id.slice(0, 8).toUpperCase();
                const cropName = m.crops?.name || '—';
                const ghName = m.greenhouses?.name || '—';
                return (
                  <Card key={m.id} pad={0} style={{ overflow: 'hidden' }}>
                    <div style={{ height: 3, background: h.fg }} />
                    <div style={{ padding: 14 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                        <span style={{ fontSize: 11, fontWeight: 700, color: T.mutedSoft, fontFamily: 'ui-monospace,monospace', letterSpacing: 0.3 }}>{shortId}</span>
                        <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 4, background: h.soft, color: h.fg }}>{h.l}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                        <div style={{
                          width: 32, height: 32, borderRadius: 8, background: T.successSoft,
                          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                        }}>
                          <Icon d={icons.sprout} size={16} c={T.success} sw={2} />
                        </div>
                        <div>
                          <div style={{ fontSize: 14, fontWeight: 700, color: T.text }}>{cropName}</div>
                          <div style={{ fontSize: 11, color: T.mutedSoft }}>{ghName}</div>
                        </div>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6, padding: 10, background: T.bg, borderRadius: 7, marginBottom: 10 }}>
                        {[
                          { l: 'Bed', v: m.bed || '—' },
                          { l: 'Row', v: m.row_label || '—' },
                          { l: 'No.', v: m.plant_no ?? '—' },
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
                          {m.start_date || '—'}
                        </span>
                        <button onClick={() => deactivate(m.id)} style={{
                          fontSize: 11, fontWeight: 600, color: T.danger,
                          background: 'transparent', border: 0, cursor: 'pointer', padding: 0,
                        }}>비활성화</button>
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
