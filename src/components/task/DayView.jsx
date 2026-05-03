// 작업 일별 뷰 — 트랙 77 후속 U18 + U19
// 시안: 운영 채팅방 합의 — 동(row) × 작업카드(가로 flex) + 카드는 상태 Pill + 작업명 + 작물 + 시간 + 배정자 + 진행률
//
// U19: zoneFilter prop — 선택된 동 row만 표시 (사용자 의견 2). 완료 task opacity 0.55 (G77-JJJ).
//
// props:
//   tasks, zones, zoneFilter, onCardClick(task), onAddClick(zoneId, dateStr)

import React, { useMemo, useState } from 'react';
import { Avatar, T } from '../../design/primitives';
import { getMatrixZoneColor } from '../../lib/zoneMatrixColors';

const DAYS = ['일', '월', '화', '수', '목', '금', '토'];
const pad2 = (n) => String(n).padStart(2, '0');

function fmtDateKey(d) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

const STATUS_PILL = {
  pending: { l: '계획', soft: '#F1EFE8', strong: '#444441' },
  planned: { l: '계획', soft: '#F1EFE8', strong: '#444441' },
  assigned: { l: '계획', soft: '#F1EFE8', strong: '#444441' },
  in_progress: { l: '진행중', soft: '#FAEEDA', strong: '#854F0B' },
  completed: { l: '완료', soft: '#EAF3DE', strong: '#27500A' },
  done: { l: '완료', soft: '#EAF3DE', strong: '#27500A' },
};

function statusPill(status) {
  return STATUS_PILL[status] || STATUS_PILL.pending;
}

export default function DayView({ tasks, zones, zoneFilter = 'all', onCardClick, onAddClick }) {
  const [day, setDay] = useState(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  });

  // [TRACK77-U19] 동 필터 적용 시 해당 zone row만 표시 (사용자 의견 2)
  const visibleZones = useMemo(() => {
    if (zoneFilter === 'all') return zones || [];
    return (zones || []).filter((z) => z.id === zoneFilter);
  }, [zones, zoneFilter]);

  const dayKey = fmtDateKey(day);
  const todayKey = fmtDateKey(new Date());

  // task by zoneId
  const byZone = useMemo(() => {
    const map = {};
    (tasks || []).forEach((t) => {
      if (t.date !== dayKey) return;
      const zoneId = t.zoneId || t.zones?.id || t.zone?.id;
      if (!zoneId) return;
      if (!map[zoneId]) map[zoneId] = [];
      map[zoneId].push(t);
    });
    return map;
  }, [tasks, dayKey]);

  const shiftDay = (delta) => {
    const next = new Date(day);
    next.setDate(next.getDate() + delta);
    setDay(next);
  };

  const goToday = () => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    setDay(d);
  };

  const dayLabel = `${day.getFullYear()}년 ${day.getMonth() + 1}월 ${day.getDate()}일 (${DAYS[day.getDay()]})`;

  const navBtn = (label, onClick) => (
    <button
      onClick={onClick}
      style={{
        height: 32, padding: '0 12px', borderRadius: 6,
        border: `1px solid ${T.border}`, background: T.surface, color: T.text,
        fontSize: 12, fontWeight: 600, cursor: 'pointer',
      }}
    >{label}</button>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* 일자 네비 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {navBtn('‹ 이전 일', () => shiftDay(-1))}
        <div style={{
          fontSize: 14, fontWeight: 700,
          color: dayKey === todayKey ? T.primary : T.text,
          padding: '0 8px',
        }}>{dayLabel}</div>
        {navBtn('오늘', goToday)}
        {navBtn('다음 일 ›', () => shiftDay(1))}
      </div>

      {/* 동별 row */}
      <div style={{
        display: 'flex', flexDirection: 'column', gap: 0,
        background: T.surface, border: `1px solid ${T.border}`, borderRadius: 8,
        overflow: 'hidden',
      }}>
        {visibleZones.map((zone, vIdx) => {
          // [TRACK77-U19] 색상 index = 원본 zones 배열 index (필터 무관 일관성)
          const zIdx = (zones || []).findIndex((z) => z.id === zone.id);
          const color = getMatrixZoneColor(zIdx >= 0 ? zIdx : 0);
          const cards = byZone[zone.id] || [];
          return (
            <div key={zone.id} style={{
              display: 'flex', alignItems: 'stretch',
              borderBottom: vIdx < visibleZones.length - 1 ? `1px solid ${T.borderSoft}` : 'none',
            }}>
              {/* 동 헤더 (왼쪽 고정) */}
              <div style={{
                flexShrink: 0,
                width: 120,
                background: color.soft,
                color: color.strong,
                fontWeight: 700, fontSize: 13,
                padding: '14px 16px',
                borderRight: `1px solid ${T.border}`,
                display: 'flex', alignItems: 'center',
              }}>
                {zone.name}
                <span style={{ marginLeft: 'auto', fontSize: 11, fontWeight: 600, opacity: 0.7 }}>{cards.length}</span>
              </div>

              {/* 작업 카드 가로 flex */}
              <div style={{
                flex: 1, padding: 12,
                display: 'flex', alignItems: 'flex-start', gap: 10,
                overflowX: 'auto',
              }}>
                {cards.length === 0 ? (
                  <div style={{
                    color: T.mutedSoft, fontSize: 12, padding: '8px 4px',
                    fontWeight: 500,
                  }}>배정된 작업 없음</div>
                ) : (
                  cards.map((t) => {
                    const sp = statusPill(t.status);
                    const workers = t.workers || [];
                    const progress = t.progress ?? (t.status === 'completed' ? 100 : t.status === 'in_progress' ? 40 : 0);
                    // [TRACK77-U19] 완료 task 시각 약화 (G77-JJJ)
                    const isDone = t.status === 'completed' || t.status === 'done';
                    return (
                      <div
                        key={t.id}
                        onClick={() => onCardClick?.(t)}
                        style={{
                          flexShrink: 0,
                          width: 220,
                          background: T.surface,
                          border: `1px solid ${color.border}`,
                          borderTop: `3px solid ${color.strong}`,
                          borderRadius: 8,
                          padding: 12,
                          cursor: 'pointer',
                          boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
                          opacity: isDone ? 0.55 : 1,
                        }}
                      >
                        {/* 상태 Pill */}
                        <div style={{ marginBottom: 6 }}>
                          <span style={{
                            display: 'inline-block',
                            padding: '2px 7px', borderRadius: 4,
                            background: sp.soft, color: sp.strong,
                            fontSize: 10, fontWeight: 700,
                          }}>{sp.l}</span>
                        </div>
                        {/* 작업명 */}
                        <div style={{ fontSize: 13, fontWeight: 700, color: T.text, marginBottom: 4, lineHeight: 1.3 }}>
                          {t.title}
                        </div>
                        {/* 작물 + 시간 */}
                        <div style={{ fontSize: 11, color: T.muted, marginBottom: 8 }}>
                          {t.crop && <span>{t.crop}</span>}
                          {t.crop && t.estimatedMinutes && <span> · </span>}
                          {t.estimatedMinutes && <span>{Math.floor(t.estimatedMinutes / 60)}h {t.estimatedMinutes % 60}m</span>}
                        </div>
                        {/* 배정자 아바타 */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 6 }}>
                          {workers.slice(0, 3).map((w, i) => (
                            <div key={w.id || i} style={{ marginLeft: i > 0 ? -6 : 0, border: `2px solid ${T.surface}`, borderRadius: 999 }}>
                              <Avatar name={w.name || '?'} size={22} />
                            </div>
                          ))}
                          {workers.length > 3 && (
                            <span style={{ marginLeft: 4, fontSize: 11, color: T.mutedSoft, fontWeight: 600 }}>외 {workers.length - 3}명</span>
                          )}
                          {workers.length === 0 && (
                            <span style={{ fontSize: 11, color: T.mutedSoft, fontStyle: 'italic' }}>미배정</span>
                          )}
                        </div>
                        {/* 진행률 */}
                        <div style={{ height: 4, background: T.bg, borderRadius: 2, overflow: 'hidden' }}>
                          <div style={{ width: `${progress}%`, height: '100%', background: color.strong }} />
                        </div>
                      </div>
                    );
                  })
                )}

                {/* + 작업 추가 */}
                <button
                  onClick={() => onAddClick?.(zone.id, dayKey)}
                  style={{
                    flexShrink: 0,
                    minWidth: 100, height: 80,
                    border: `1px dashed ${T.border}`,
                    background: 'transparent',
                    color: T.mutedSoft,
                    borderRadius: 8,
                    fontSize: 12, fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >+ 작업 추가</button>
              </div>
            </div>
          );
        })}

        {visibleZones.length === 0 && (
          <div style={{ padding: 40, textAlign: 'center', color: T.mutedSoft, fontSize: 13 }}>
            {(!zones || zones.length === 0) ? '동(zone) 정보가 없습니다' : '선택된 동에 해당하는 항목이 없습니다'}
          </div>
        )}
      </div>
    </div>
  );
}
