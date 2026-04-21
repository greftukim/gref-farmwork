// QR코드 관리 — /admin/qr-code
import React, { useMemo, useState } from 'react';
import { Card, Icon, Pill, T, TopBar, icons } from '../../design/primitives';
import useQrCodeStore from '../../stores/qrCodeStore';

const TYPES = {
  attendance: { l: '출퇴근', tone: 'primary' },
  task: { l: '작업', tone: 'info' },
  marker: { l: '표식주', tone: 'success' },
  location: { l: '위치', tone: 'warning' },
};

export default function QrCodePage() {
  const codes = useQrCodeStore((s) => s.codes);
  const addCode = useQrCodeStore((s) => s.addCode);
  const removeCode = useQrCodeStore((s) => s.removeCode);

  const [filter, setFilter] = useState('all');
  const [draft, setDraft] = useState({ type: 'attendance', label: '', value: '' });

  const filtered = useMemo(() => (codes || []).filter((c) => filter === 'all' || c.type === filter), [codes, filter]);

  const counts = useMemo(() => {
    const m = { all: codes?.length || 0 };
    Object.keys(TYPES).forEach((k) => { m[k] = (codes || []).filter((c) => c.type === k).length; });
    return m;
  }, [codes]);

  return (
    <div style={{ flex: 1, overflow: 'auto', background: T.bg, minWidth: 0 }}>
      <TopBar subtitle="설정" title="QR코드 관리" />
      <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12 }}>
          {[['all', '전체', T.primary], ['attendance', '출퇴근', T.primary], ['task', '작업', T.info], ['marker', '표식주', T.success], ['location', '위치', T.warning]].map(([k, l, tone]) => (
            <Card key={k} pad={16} style={{ position: 'relative', overflow: 'hidden', cursor: 'pointer', outline: filter === k ? `2px solid ${tone}` : 'none' }} onClick={() => setFilter(k)}>
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: tone }} />
              <div style={{ fontSize: 11, color: T.muted, fontWeight: 600, marginBottom: 10 }}>{l}</div>
              <div style={{ fontSize: 28, fontWeight: 700, color: T.text, letterSpacing: -0.6, lineHeight: 1 }}>{counts[k]}</div>
            </Card>
          ))}
        </div>

        <Card pad={20}>
          <div style={{ fontSize: 13, fontWeight: 700, color: T.text, marginBottom: 12 }}>QR코드 생성</div>
          <div style={{ display: 'grid', gridTemplateColumns: '160px 1.5fr 1.5fr auto', gap: 8 }}>
            <select value={draft.type} onChange={(e) => setDraft({ ...draft, type: e.target.value })}
              style={{ height: 36, padding: '0 10px', border: `1px solid ${T.border}`, borderRadius: 7, fontSize: 13 }}>
              {Object.entries(TYPES).map(([v, { l }]) => <option key={v} value={v}>{l}</option>)}
            </select>
            <input value={draft.label} onChange={(e) => setDraft({ ...draft, label: e.target.value })} placeholder="레이블"
              style={{ height: 36, padding: '0 12px', border: `1px solid ${T.border}`, borderRadius: 7, fontSize: 13 }} />
            <input value={draft.value} onChange={(e) => setDraft({ ...draft, value: e.target.value })} placeholder="값 (예: A동-1번)"
              style={{ height: 36, padding: '0 12px', border: `1px solid ${T.border}`, borderRadius: 7, fontSize: 13, fontFamily: 'ui-monospace,monospace' }} />
            <button onClick={() => { if (draft.label.trim() && draft.value.trim()) { addCode?.({ id: 'qr_' + Date.now(), ...draft, label: draft.label.trim(), value: draft.value.trim(), createdAt: new Date().toISOString() }); setDraft({ type: draft.type, label: '', value: '' }); } }}
              style={{ height: 36, padding: '0 14px', borderRadius: 7, border: 0, background: T.text, color: T.surface, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>생성</button>
          </div>
        </Card>

        <Card pad={0}>
          <div style={{ padding: '14px 20px', borderBottom: `1px solid ${T.borderSoft}`, fontSize: 13, fontWeight: 700, color: T.text }}>등록된 QR ({filtered.length})</div>
          {filtered.length === 0 ? (
            <div style={{ padding: 50, textAlign: 'center', color: T.mutedSoft, fontSize: 13 }}>QR코드가 없습니다</div>
          ) : (
            <div style={{ padding: 16, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
              {filtered.map((c) => {
                const tp = TYPES[c.type] || TYPES.attendance;
                return (
                  <div key={c.id} style={{ padding: 14, border: `1px solid ${T.border}`, borderRadius: 10, background: T.surface }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                      <Pill tone={tp.tone}>{tp.l}</Pill>
                      <button onClick={() => removeCode?.(c.id)}
                        style={{ width: 24, height: 24, borderRadius: 5, border: 0, background: 'transparent', color: T.mutedSoft, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Icon d={icons.trash} size={12} sw={2} />
                      </button>
                    </div>
                    <div style={{ width: '100%', aspectRatio: '1', background: `repeating-conic-gradient(${T.text} 0deg 25%, ${T.surface} 0deg 50%)`, backgroundSize: '14px 14px', borderRadius: 8, marginBottom: 10, border: `1px solid ${T.border}` }} />
                    <div style={{ fontSize: 12, fontWeight: 700, color: T.text, marginBottom: 2 }}>{c.label}</div>
                    <div style={{ fontSize: 10, color: T.mutedSoft, fontFamily: 'ui-monospace,monospace' }}>{c.value}</div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
