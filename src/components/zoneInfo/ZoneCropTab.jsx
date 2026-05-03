// 트랙 77 후속 U20 — 탭1: 동 작물 정보 (zone_crops + events)
// 작기 필터 (현 작기 / 전체 작기) — LESSONS 150 패턴
// 종료 작기 = opacity 0.55 + 종료 배지

import React, { useMemo, useState, useEffect } from 'react';
import { T, btnPrimary, icons } from '../../design/primitives';
import useZoneCropStore from '../../stores/zoneCropStore';
import { useSearchParams } from 'react-router-dom';
import ZoneCropEditModal from './ZoneCropEditModal';

const STD_EVENTS = [
  { type: 'sowing', label: '파종' },
  { type: 'nursery', label: '가정식' },
  { type: 'planting', label: '정식' },
];

export default function ZoneCropTab({ zones, zoneCrops, crops, specs, activeOnly, onToggleActiveOnly }) {
  const fetchZoneCrops = useZoneCropStore((s) => s.fetchZoneCrops);
  const [editTarget, setEditTarget] = useState(null);
  const [searchParams, setSearchParams] = useSearchParams();

  // 탭3에서 "탭1에서 편집" 링크 시 zoneCropId 자동 오픈
  useEffect(() => {
    const zid = searchParams.get('zoneCropId');
    if (!zid) return;
    const target = zoneCrops.find((z) => z.id === zid);
    if (target) {
      setEditTarget(target);
      const next = new URLSearchParams(searchParams);
      next.delete('zoneCropId');
      setSearchParams(next, { replace: true });
    }
  }, [searchParams, zoneCrops, setSearchParams]);

  const cropsByZone = useMemo(() => {
    const m = {};
    (zoneCrops || []).forEach((zc) => {
      if (!m[zc.zoneId]) m[zc.zoneId] = [];
      m[zc.zoneId].push(zc);
    });
    return m;
  }, [zoneCrops]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* 작기 필터 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: T.mutedSoft, letterSpacing: 0.4, textTransform: 'uppercase' }}>작기</span>
        <div style={{ display: 'flex', gap: 4, padding: 3, background: T.bg, borderRadius: 8 }}>
          <FilterChip on={activeOnly} onClick={() => onToggleActiveOnly(true)}>현 작기</FilterChip>
          <FilterChip on={!activeOnly} onClick={() => onToggleActiveOnly(false)}>전체 작기</FilterChip>
        </div>
        <div style={{ marginLeft: 'auto', fontSize: 12, color: T.mutedSoft, fontWeight: 600 }}>
          총 <b style={{ color: T.text }}>{zoneCrops?.length || 0}</b>건
        </div>
      </div>

      {/* 동별 카드 */}
      <div style={{
        display: 'grid', gap: 12,
        gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))',
      }}>
        {(zones || []).map((zone) => {
          const list = cropsByZone[zone.id] || [];
          return (
            <div key={zone.id} style={{
              background: T.surface, border: `1px solid ${T.border}`, borderRadius: 10,
              padding: 16, display: 'flex', flexDirection: 'column', gap: 10,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: T.text }}>{zone.name}</div>
                <span style={{ fontSize: 11, color: T.mutedSoft }}>{list.length}건</span>
                <div style={{ marginLeft: 'auto' }}>
                  <button
                    onClick={() => setEditTarget({ __new: true, zoneId: zone.id })}
                    style={{
                      height: 26, padding: '0 10px', borderRadius: 6,
                      border: `1px solid ${T.primary}`, background: T.primary, color: '#fff',
                      fontSize: 11, fontWeight: 700, cursor: 'pointer',
                    }}
                  >+ 작물 추가</button>
                </div>
              </div>

              {list.length === 0 ? (
                <div style={{
                  fontSize: 12, color: T.mutedSoft, padding: '14px 12px',
                  background: T.bg, borderRadius: 8,
                  textAlign: 'center', fontStyle: 'italic',
                }}>
                  {activeOnly ? '진행 중인 작기 없음' : '등록된 작기 없음'}
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {list.map((zc) => {
                    const isEnded = !!zc.endedAt;
                    const cropName = zc.crops?.name || '–';
                    return (
                      <div
                        key={zc.id}
                        onClick={() => setEditTarget(zc)}
                        style={{
                          padding: 10, borderRadius: 8,
                          border: `1px solid ${T.borderSoft}`, background: T.bg,
                          cursor: 'pointer',
                          opacity: isEnded ? 0.55 : 1,
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                          <span style={{ fontSize: 13, fontWeight: 700, color: T.text }}>
                            {cropName}{zc.cultivar ? ` · ${zc.cultivar}` : ''}
                          </span>
                          {zc.seasonLabel && (
                            <span style={{
                              fontSize: 10, fontWeight: 600,
                              padding: '1px 6px', borderRadius: 4,
                              background: T.primarySoft, color: T.primary,
                            }}>{zc.seasonLabel}</span>
                          )}
                          {isEnded && (
                            <span style={{
                              fontSize: 10, fontWeight: 700,
                              padding: '1px 6px', borderRadius: 4,
                              background: '#F1EFE8', color: '#444441',
                              marginLeft: 'auto',
                            }}>종료 {zc.endedAt}</span>
                          )}
                        </div>
                        <div style={{ fontSize: 11, color: T.muted, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                          {zc.startedAt && <span>시작 {zc.startedAt}</span>}
                          {(zc.events || []).length > 0 && (
                            <span>이벤트 {zc.events.length}건</span>
                          )}
                          {zc.plantsPerSlab && zc.rowsPerBay && (
                            <span>식재 정보 입력</span>
                          )}
                        </div>
                        {(zc.events || []).length > 0 && (
                          <div style={{
                            marginTop: 6, paddingTop: 6,
                            borderTop: `1px dashed ${T.borderSoft}`,
                            fontSize: 10, color: T.mutedSoft,
                            display: 'flex', flexWrap: 'wrap', gap: 6,
                          }}>
                            {zc.events.slice().sort((a, b) => (a.eventDate < b.eventDate ? -1 : 1)).map((e) => (
                              <span key={e.id} style={{ fontWeight: 500 }}>
                                {e.eventLabel} {e.eventDate}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
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
            등록된 동이 없습니다. 탭2(온실 기초 정보)에서 동을 먼저 추가하세요.
          </div>
        )}
      </div>

      {editTarget && (
        <ZoneCropEditModal
          target={editTarget}
          zones={zones}
          crops={crops}
          stdEvents={STD_EVENTS}
          onClose={() => setEditTarget(null)}
          onSaved={async () => {
            setEditTarget(null);
            await fetchZoneCrops({ activeOnly });
          }}
        />
      )}
    </div>
  );
}

function FilterChip({ on, onClick, children }) {
  return (
    <button
      onClick={onClick}
      aria-pressed={on}
      style={{
        padding: '6px 12px', borderRadius: 6, fontSize: 12, fontWeight: 600,
        color: on ? T.text : T.muted,
        background: on ? T.surface : 'transparent',
        boxShadow: on ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
        cursor: 'pointer', border: 'none',
      }}
    >{children}</button>
  );
}
