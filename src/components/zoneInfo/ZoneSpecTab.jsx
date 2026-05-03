// 트랙 77 후속 U20 — 탭2: 온실 기초 정보 (zone_specs CRUD)
// 동별 카드 + 면적 derive + "+ 동 추가" / "수정" 버튼

import React, { useMemo, useState } from 'react';
import { T, btnPrimary, icons, Icon } from '../../design/primitives';
import useZoneStore from '../../stores/zoneStore';
import useZoneSpecStore from '../../stores/zoneSpecStore';
import { calculateZoneArea } from '../../lib/zoneCalc';
import ZoneEditModal from './ZoneEditModal';
import ZoneSpecEditModal from './ZoneSpecEditModal';

export default function ZoneSpecTab({ zones, specs }) {
  const fetchZones = useZoneStore((s) => s.fetchZones);
  const fetchSpecs = useZoneSpecStore((s) => s.fetchSpecs);

  const [zoneModal, setZoneModal] = useState(null); // { __new: true } | zone
  const [specModal, setSpecModal] = useState(null); // zone (for spec edit)

  const specByZone = useMemo(() => {
    const m = {};
    (specs || []).forEach((s) => { m[s.zoneId] = s; });
    return m;
  }, [specs]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: T.text }}>
          동 {zones?.length || 0}개
        </div>
        <div style={{ marginLeft: 'auto' }}>
          {btnPrimary('동 추가', icons.plus, () => setZoneModal({ __new: true }))}
        </div>
      </div>

      <div style={{
        display: 'grid', gap: 12,
        gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
      }}>
        {(zones || []).map((zone) => {
          const spec = specByZone[zone.id];
          const area = calculateZoneArea(spec);
          return (
            <div key={zone.id} style={{
              background: T.surface, border: `1px solid ${T.border}`, borderRadius: 10,
              padding: 16, display: 'flex', flexDirection: 'column', gap: 12,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: T.text }}>{zone.name}</div>
                <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
                  <SmallBtn onClick={() => setZoneModal(zone)}>이름 수정</SmallBtn>
                  <SmallBtn primary onClick={() => setSpecModal(zone)}>
                    {spec ? '구조 수정' : '구조 입력'}
                  </SmallBtn>
                </div>
              </div>

              {!spec ? (
                <div style={{
                  fontSize: 12, color: T.mutedSoft, padding: '14px 12px',
                  background: T.bg, borderRadius: 8,
                  textAlign: 'center', fontStyle: 'italic',
                }}>
                  물리 구조 미입력 — 재식밀도 계산 불가
                </div>
              ) : (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8, fontSize: 12 }}>
                    <Field label="베이 길이">{fmtNum(spec.bayLengthM)} m × {fmtNum(spec.bayCount)}동</Field>
                    <Field label="베이 폭">{fmtNum(spec.bayWidthM)} m × {fmtNum(spec.bayWidthCount)}동</Field>
                    <Field label="통로">{fmtNum(spec.corridorWidthM)} m × {fmtNum(spec.corridorCount)}동</Field>
                    <Field label="">{/* spacer */}</Field>
                  </div>
                  <div style={{ borderTop: `1px solid ${T.borderSoft}`, paddingTop: 10 }}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: T.mutedSoft, marginBottom: 6 }}>면적 (자동 계산)</div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8, fontSize: 12 }}>
                      <Field label="온실 면적">{fmtNum(area.greenhouseArea, 1)} m²</Field>
                      <Field label="실 재배면적">{fmtNum(area.cultivationArea, 1)} m²</Field>
                      <Field label="평수">{fmtNum(area.areaPyeong, 1)} 평</Field>
                      <Field label="통로 면적">{fmtNum(area.corridorArea, 1)} m²</Field>
                    </div>
                  </div>
                </>
              )}

              {spec?.notes && (
                <div style={{ fontSize: 11, color: T.mutedSoft, paddingTop: 6 }}>
                  메모: {spec.notes}
                </div>
              )}
            </div>
          );
        })}

        {(zones || []).length === 0 && (
          <div style={{
            gridColumn: '1 / -1',
            padding: 40, textAlign: 'center',
            background: T.surface, border: `1px dashed ${T.border}`, borderRadius: 10,
            color: T.mutedSoft, fontSize: 13,
          }}>
            등록된 동이 없습니다. "동 추가" 버튼으로 첫 동을 등록하세요.
          </div>
        )}
      </div>

      {zoneModal && (
        <ZoneEditModal
          zone={zoneModal}
          onClose={() => setZoneModal(null)}
          onSaved={() => {
            setZoneModal(null);
            fetchZones();
          }}
        />
      )}

      {specModal && (
        <ZoneSpecEditModal
          zone={specModal}
          spec={specByZone[specModal.id]}
          onClose={() => setSpecModal(null)}
          onSaved={() => {
            setSpecModal(null);
            fetchSpecs();
          }}
        />
      )}
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <span style={{ fontSize: 10, fontWeight: 600, color: T.mutedSoft }}>{label}</span>
      <span style={{ fontSize: 12, fontWeight: 600, color: T.text }}>{children}</span>
    </div>
  );
}

function SmallBtn({ primary, onClick, children }) {
  return (
    <button
      onClick={onClick}
      style={{
        height: 26, padding: '0 10px', borderRadius: 6,
        border: `1px solid ${primary ? T.primary : T.border}`,
        background: primary ? T.primary : T.surface,
        color: primary ? '#fff' : T.text,
        fontSize: 11, fontWeight: 700, cursor: 'pointer',
      }}
    >{children}</button>
  );
}

function fmtNum(v, digits = 0) {
  if (v === null || v === undefined || v === '' || !Number.isFinite(Number(v))) return '–';
  return Number(v).toLocaleString('ko-KR', { maximumFractionDigits: digits, minimumFractionDigits: 0 });
}
