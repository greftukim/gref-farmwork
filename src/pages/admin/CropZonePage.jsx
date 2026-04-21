// 작물/구역 설정 — /admin/crop-zone
import React, { useState } from 'react';
import { Card, Icon, Pill, T, TopBar, icons } from '../../design/primitives';
import useCropZoneStore from '../../stores/cropZoneStore';

export default function CropZonePage() {
  const crops = useCropZoneStore((s) => s.crops);
  const zones = useCropZoneStore((s) => s.zones);
  const addCrop = useCropZoneStore((s) => s.addCrop);
  const removeCrop = useCropZoneStore((s) => s.removeCrop);
  const addZone = useCropZoneStore((s) => s.addZone);
  const removeZone = useCropZoneStore((s) => s.removeZone);

  const [cropDraft, setCropDraft] = useState('');
  const [zoneDraft, setZoneDraft] = useState({ name: '', crop: '' });

  return (
    <div style={{ flex: 1, overflow: 'auto', background: T.bg, minWidth: 0 }}>
      <TopBar subtitle="설정" title="작물·구역 설정" />
      <div style={{ padding: 24, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, maxWidth: 1100 }}>
        <Card pad={0}>
          <div style={{ padding: '14px 20px', borderBottom: `1px solid ${T.borderSoft}`, fontSize: 13, fontWeight: 700, color: T.text }}>작물 ({crops?.length || 0})</div>
          <div style={{ padding: '14px 20px', borderBottom: `1px solid ${T.borderSoft}`, display: 'flex', gap: 8 }}>
            <input value={cropDraft} onChange={(e) => setCropDraft(e.target.value)} placeholder="예: 방울토마토"
              style={{ flex: 1, height: 36, padding: '0 12px', border: `1px solid ${T.border}`, borderRadius: 7, fontSize: 13 }} />
            <button onClick={() => { if (cropDraft.trim()) { addCrop?.({ id: 'crop_' + Date.now(), name: cropDraft.trim() }); setCropDraft(''); } }}
              style={{ height: 36, padding: '0 14px', borderRadius: 7, border: 0, background: T.text, color: T.surface, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>추가</button>
          </div>
          {(!crops || crops.length === 0) ? (
            <div style={{ padding: 40, textAlign: 'center', color: T.mutedSoft, fontSize: 13 }}>등록된 작물이 없습니다</div>
          ) : crops.map((c, i) => (
            <div key={c.id} style={{ padding: '12px 20px', borderTop: i ? `1px solid ${T.borderSoft}` : 'none', display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: T.successSoft, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: 14 }}>🌱</span>
              </div>
              <span style={{ fontSize: 13, fontWeight: 600, color: T.text, flex: 1 }}>{c.name}</span>
              <Pill tone="success">{zones?.filter((z) => z.crop === c.name).length || 0}구역</Pill>
              <button onClick={() => { if (confirm(`'${c.name}' 삭제?`)) removeCrop?.(c.id); }}
                style={{ width: 28, height: 28, borderRadius: 6, border: `1px solid ${T.border}`, background: T.surface, color: T.danger, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon d={icons.trash} size={12} sw={2} />
              </button>
            </div>
          ))}
        </Card>

        <Card pad={0}>
          <div style={{ padding: '14px 20px', borderBottom: `1px solid ${T.borderSoft}`, fontSize: 13, fontWeight: 700, color: T.text }}>구역 ({zones?.length || 0})</div>
          <div style={{ padding: '14px 20px', borderBottom: `1px solid ${T.borderSoft}`, display: 'grid', gridTemplateColumns: '1.3fr 1fr auto', gap: 8 }}>
            <input value={zoneDraft.name} onChange={(e) => setZoneDraft({ ...zoneDraft, name: e.target.value })} placeholder="예: A동 1번"
              style={{ height: 36, padding: '0 12px', border: `1px solid ${T.border}`, borderRadius: 7, fontSize: 13 }} />
            <select value={zoneDraft.crop} onChange={(e) => setZoneDraft({ ...zoneDraft, crop: e.target.value })}
              style={{ height: 36, padding: '0 10px', border: `1px solid ${T.border}`, borderRadius: 7, fontSize: 13 }}>
              <option value="">작물 선택</option>
              {(crops || []).map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}
            </select>
            <button onClick={() => { if (zoneDraft.name.trim() && zoneDraft.crop) { addZone?.({ id: 'zone_' + Date.now(), ...zoneDraft, name: zoneDraft.name.trim() }); setZoneDraft({ name: '', crop: '' }); } }}
              style={{ height: 36, padding: '0 14px', borderRadius: 7, border: 0, background: T.text, color: T.surface, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>추가</button>
          </div>
          {(!zones || zones.length === 0) ? (
            <div style={{ padding: 40, textAlign: 'center', color: T.mutedSoft, fontSize: 13 }}>등록된 구역이 없습니다</div>
          ) : zones.map((z, i) => (
            <div key={z.id} style={{ padding: '12px 20px', borderTop: i ? `1px solid ${T.borderSoft}` : 'none', display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: T.infoSoft, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon d={icons.grid} size={14} c={T.info} sw={2} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: T.text }}>{z.name}</div>
                <div style={{ fontSize: 11, color: T.mutedSoft }}>{z.crop}</div>
              </div>
              <button onClick={() => { if (confirm(`'${z.name}' 삭제?`)) removeZone?.(z.id); }}
                style={{ width: 28, height: 28, borderRadius: 6, border: `1px solid ${T.border}`, background: T.surface, color: T.danger, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon d={icons.trash} size={12} sw={2} />
              </button>
            </div>
          ))}
        </Card>
      </div>
    </div>
  );
}
