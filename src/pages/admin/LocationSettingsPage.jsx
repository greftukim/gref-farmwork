// 위치 설정 — /admin/location-settings
import React, { useMemo, useState } from 'react';
import { Card, Icon, Pill, T, TopBar, icons } from '../../design/primitives';
import useLocationStore from '../../stores/locationStore';

export default function LocationSettingsPage() {
  const locations = useLocationStore((s) => s.locations);
  const addLocation = useLocationStore((s) => s.addLocation);
  const updateLocation = useLocationStore((s) => s.updateLocation);
  const removeLocation = useLocationStore((s) => s.removeLocation);

  const [draft, setDraft] = useState({ name: '', lat: '', lng: '', radius: 50 });

  const handleAdd = () => {
    if (!draft.name.trim() || !draft.lat || !draft.lng) return;
    addLocation?.({
      id: 'loc_' + Date.now(), name: draft.name.trim(),
      lat: parseFloat(draft.lat), lng: parseFloat(draft.lng), radius: parseInt(draft.radius) || 50,
    });
    setDraft({ name: '', lat: '', lng: '', radius: 50 });
  };

  return (
    <div style={{ flex: 1, overflow: 'auto', background: T.bg, minWidth: 0 }}>
      <TopBar subtitle="설정" title="위치 설정" />
      <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 920 }}>
        <Card pad={20}>
          <div style={{ fontSize: 13, fontWeight: 700, color: T.text, marginBottom: 4 }}>새 위치 등록</div>
          <div style={{ fontSize: 11, color: T.mutedSoft, marginBottom: 14 }}>출퇴근 QR 인증 시 이 위치 반경 내에서만 인증이 허용됩니다.</div>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1.3fr 1.3fr 1fr auto', gap: 8, alignItems: 'end' }}>
            <div>
              <label style={{ fontSize: 11, color: T.muted, fontWeight: 600, display: 'block', marginBottom: 4 }}>이름</label>
              <input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="예: 본사 농장"
                style={{ width: '100%', height: 36, padding: '0 12px', border: `1px solid ${T.border}`, borderRadius: 7, fontSize: 13 }} />
            </div>
            <div>
              <label style={{ fontSize: 11, color: T.muted, fontWeight: 600, display: 'block', marginBottom: 4 }}>위도</label>
              <input value={draft.lat} onChange={(e) => setDraft({ ...draft, lat: e.target.value })} placeholder="37.5665"
                style={{ width: '100%', height: 36, padding: '0 12px', border: `1px solid ${T.border}`, borderRadius: 7, fontSize: 13, fontFamily: 'ui-monospace,monospace' }} />
            </div>
            <div>
              <label style={{ fontSize: 11, color: T.muted, fontWeight: 600, display: 'block', marginBottom: 4 }}>경도</label>
              <input value={draft.lng} onChange={(e) => setDraft({ ...draft, lng: e.target.value })} placeholder="126.9780"
                style={{ width: '100%', height: 36, padding: '0 12px', border: `1px solid ${T.border}`, borderRadius: 7, fontSize: 13, fontFamily: 'ui-monospace,monospace' }} />
            </div>
            <div>
              <label style={{ fontSize: 11, color: T.muted, fontWeight: 600, display: 'block', marginBottom: 4 }}>반경(m)</label>
              <input type="number" value={draft.radius} onChange={(e) => setDraft({ ...draft, radius: e.target.value })}
                style={{ width: '100%', height: 36, padding: '0 12px', border: `1px solid ${T.border}`, borderRadius: 7, fontSize: 13, fontFamily: 'ui-monospace,monospace' }} />
            </div>
            <button onClick={handleAdd} style={{ height: 36, padding: '0 16px', borderRadius: 7, border: 0, background: T.text, color: T.surface, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>추가</button>
          </div>
        </Card>

        <Card pad={0}>
          <div style={{ padding: '14px 20px', borderBottom: `1px solid ${T.borderSoft}`, fontSize: 13, fontWeight: 700, color: T.text }}>등록된 위치 ({locations?.length || 0})</div>
          {(!locations || locations.length === 0) ? (
            <div style={{ padding: 50, textAlign: 'center', color: T.mutedSoft, fontSize: 13 }}>등록된 위치가 없습니다</div>
          ) : locations.map((l, i) => (
            <div key={l.id} style={{
              padding: '14px 20px', borderTop: i ? `1px solid ${T.borderSoft}` : 'none',
              display: 'flex', alignItems: 'center', gap: 14,
            }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: T.primarySoft, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Icon d={icons.location} size={18} c={T.primary} sw={2} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: T.text, marginBottom: 3 }}>{l.name}</div>
                <div style={{ fontSize: 11, color: T.mutedSoft, fontFamily: 'ui-monospace,monospace' }}>{l.lat}, {l.lng}</div>
              </div>
              <Pill tone="info">반경 {l.radius}m</Pill>
              <button onClick={() => { if (confirm(`'${l.name}' 을(를) 삭제하시겠습니까?`)) removeLocation?.(l.id); }}
                style={{ width: 32, height: 32, borderRadius: 7, border: `1px solid ${T.border}`, background: T.surface, color: T.danger, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon d={icons.trash} size={14} sw={2} />
              </button>
            </div>
          ))}
        </Card>
      </div>
    </div>
  );
}
