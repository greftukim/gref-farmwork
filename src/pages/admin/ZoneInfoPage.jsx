// 트랙 77 후속 U20 — 온실 정보 관리 (별 트랙 TRACK77-FOLLOWUP-ZONE-METADATA-001)
// 3-탭 구조: 동 작물 정보 / 온실 기초 정보 / 재식밀도 계산
// 사용자 결정: 라이프사이클 분리 (zone_specs 영구 vs zone_crops 회차)
// 권한: farm_admin / master 단독 (RLS + 페이지 가드)

import React, { useEffect } from 'react';
import { Navigate, useSearchParams } from 'react-router-dom';
import { TopBar, T, btnPrimary, icons } from '../../design/primitives';
import useZoneStore from '../../stores/zoneStore';
import useZoneSpecStore from '../../stores/zoneSpecStore';
import useZoneCropStore from '../../stores/zoneCropStore';
import useCropStore from '../../stores/cropStore';
import useAuthStore from '../../stores/authStore';
import ZoneCropTab from '../../components/zoneInfo/ZoneCropTab';
import ZoneSpecTab from '../../components/zoneInfo/ZoneSpecTab';
import DensityCalcTab from '../../components/zoneInfo/DensityCalcTab';

const TABS = [
  { key: 'crops', label: '동 작물 정보' },
  { key: 'specs', label: '온실 기초 정보' },
  { key: 'density', label: '재식밀도 계산' },
];

export default function ZoneInfoPage() {
  const currentUser = useAuthStore((s) => s.currentUser);
  const [searchParams, setSearchParams] = useSearchParams();

  const zones = useZoneStore((s) => s.zones);
  const fetchZones = useZoneStore((s) => s.fetchZones);
  const specs = useZoneSpecStore((s) => s.specs);
  const fetchSpecs = useZoneSpecStore((s) => s.fetchSpecs);
  const zoneCrops = useZoneCropStore((s) => s.zoneCrops);
  const fetchZoneCrops = useZoneCropStore((s) => s.fetchZoneCrops);
  const activeOnly = useZoneCropStore((s) => s.activeOnly);
  const setActiveOnly = useZoneCropStore((s) => s.setActiveOnly);
  const crops = useCropStore((s) => s.crops);
  const fetchCrops = useCropStore((s) => s.fetchCrops);

  // 권한 가드 (RLS와 별도 — 사용자 결정)
  const role = currentUser?.role;
  const allowed = role === 'farm_admin' || role === 'master';

  useEffect(() => {
    if (!allowed) return;
    fetchZones();
    fetchSpecs();
    fetchCrops();
    fetchZoneCrops();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allowed]);

  if (!allowed) {
    return <Navigate to="/admin" replace />;
  }

  const rawTab = searchParams.get('tab');
  const tab = TABS.some((t) => t.key === rawTab) ? rawTab : 'crops';

  const setTab = (k) => {
    const next = new URLSearchParams(searchParams);
    next.set('tab', k);
    setSearchParams(next, { replace: true });
  };

  return (
    <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', background: T.bg, minWidth: 0 }}>
      <TopBar
        subtitle="생산 관리"
        title="온실 정보"
      />

      {/* 서브탭 */}
      <div style={{
        display: 'flex', gap: 0,
        borderBottom: `1px solid ${T.border}`, background: T.surface,
        padding: '0 28px',
      }}>
        {TABS.map((t) => (
          <SubTabBtn key={t.key} active={tab === t.key} onClick={() => setTab(t.key)}>
            {t.label}
          </SubTabBtn>
        ))}
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: 24 }}>
        {tab === 'crops' && (
          <ZoneCropTab
            zones={zones}
            zoneCrops={zoneCrops}
            crops={crops}
            specs={specs}
            activeOnly={activeOnly}
            onToggleActiveOnly={(v) => {
              setActiveOnly(v);
              fetchZoneCrops({ activeOnly: v });
            }}
          />
        )}
        {tab === 'specs' && (
          <ZoneSpecTab
            zones={zones}
            specs={specs}
          />
        )}
        {tab === 'density' && (
          <DensityCalcTab
            zones={zones}
            specs={specs}
            zoneCrops={zoneCrops}
            crops={crops}
            onGoToCropTab={(zoneCropId) => {
              const next = new URLSearchParams(searchParams);
              next.set('tab', 'crops');
              if (zoneCropId) next.set('zoneCropId', zoneCropId);
              setSearchParams(next, { replace: true });
            }}
          />
        )}
      </div>
    </div>
  );
}

function SubTabBtn({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      style={{
        padding: '14px 18px',
        border: 0,
        background: 'transparent',
        color: active ? T.text : T.muted,
        fontSize: 13, fontWeight: active ? 700 : 600,
        cursor: 'pointer',
        borderBottom: `2px solid ${active ? T.primary : 'transparent'}`,
        marginBottom: -1,
      }}
    >
      {children}
    </button>
  );
}
