// 작업 주간 매트릭스 뷰 — 트랙 77 후속 U18 + U19
// 시안: 운영 채팅방 합의 — 동(row) × 날짜(column) 매트릭스 + 동별 색상
// 자산 보존: zoneColors.js (76-A) 미참조. zoneMatrixColors.js 별 파일 사용 (G77-YY)
//
// U19: zoneFilter prop — 선택된 동 row만 표시 (사용자 의견 2). 완료 task opacity 0.55 (G77-JJJ).
//
// props:
//   tasks: 필터된 task 배열 (camelCase, taskStore.fetchTasks 결과)
//   zones: [{id, name, ...}, ...] (zoneStore.zones)
//   zoneFilter: 'all' | zone.id (U19 신규)
//   onCardClick(task): 작업 카드 클릭
//   onAddClick(zoneId, dateStr): 빈 셀 + 클릭 (신규 작성)

import React, { useMemo, useState } from 'react';
import { Icon, T, icons } from '../../design/primitives';
import { getMatrixZoneColor } from '../../lib/zoneMatrixColors';

const DAYS = ['월', '화', '수', '목', '금', '토', '일'];
const pad2 = (n) => String(n).padStart(2, '0');

// ISO 주 시작 = 월요일
function getMondayOf(date) {
  const d = new Date(date);
  const day = d.getDay(); // 0=일~6=토
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function fmtDateKey(d) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function statusInfo(status) {
  if (status === 'in_progress') return { l: '진행중', dot: '#854F0B' };
  if (status === 'completed' || status === 'done') return { l: '완료', dot: '#27500A' };
  return { l: '계획', dot: '#444441' };
}

export default function WeekMatrixView({ tasks, zones, zoneFilter = 'all', onCardClick, onAddClick }) {
  const [weekStart, setWeekStart] = useState(() => getMondayOf(new Date()));

  // [TRACK77-U19] 동 필터 적용 시 해당 zone row만 표시 (사용자 의견 2)
  const visibleZones = useMemo(() => {
    if (zoneFilter === 'all') return zones || [];
    return (zones || []).filter((z) => z.id === zoneFilter);
  }, [zones, zoneFilter]);

  const days = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(weekStart);
      d.setDate(d.getDate() + i);
      return d;
    });
  }, [weekStart]);

  const todayKey = fmtDateKey(new Date());

  // task by [zoneId][dateKey]
  const matrix = useMemo(() => {
    const map = {};
    (tasks || []).forEach((t) => {
      const zoneId = t.zoneId || t.zones?.id || t.zone?.id;
      if (!zoneId || !t.date) return;
      const key = `${zoneId}|${t.date}`;
      if (!map[key]) map[key] = [];
      map[key].push(t);
    });
    return map;
  }, [tasks]);

  const shiftWeek = (delta) => {
    const next = new Date(weekStart);
    next.setDate(next.getDate() + delta * 7);
    setWeekStart(next);
  };

  const goToday = () => setWeekStart(getMondayOf(new Date()));

  const weekEnd = days[6];
  const weekLabel = `${weekStart.getFullYear()}년 ${weekStart.getMonth() + 1}월 ${weekStart.getDate()}일 — ${weekEnd.getMonth() + 1}월 ${weekEnd.getDate()}일`;

  const navBtn = (label, onClick, disabled) => (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        height: 32, padding: '0 12px', borderRadius: 6,
        border: `1px solid ${T.border}`, background: T.surface, color: T.text,
        fontSize: 12, fontWeight: 600,
        cursor: disabled ? 'default' : 'pointer',
        opacity: disabled ? 0.5 : 1,
      }}
    >{label}</button>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* 주차 네비 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {navBtn('‹ 이전 주', () => shiftWeek(-1))}
        <div style={{ fontSize: 14, fontWeight: 700, color: T.text, padding: '0 8px' }}>
          {weekLabel}
        </div>
        {navBtn('이번 주', goToday)}
        {navBtn('다음 주 ›', () => shiftWeek(1))}
      </div>

      {/* 매트릭스 — 가로 스크롤 가능 (모바일은 별 트랙) */}
      <div style={{ overflowX: 'auto', background: T.surface, border: `1px solid ${T.border}`, borderRadius: 8 }}>
        <table style={{
          width: '100%', minWidth: 920,
          borderCollapse: 'collapse', fontSize: 12,
        }}>
          <thead>
            <tr style={{ background: '#FAFAF9' }}>
              <th style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: T.muted, borderBottom: `1px solid ${T.border}`, width: 100 }}>동</th>
              {days.map((d, i) => {
                const isWeekend = i >= 5;
                const isToday = fmtDateKey(d) === todayKey;
                return (
                  <th key={i} style={{
                    padding: '10px 8px', textAlign: 'center',
                    fontSize: 11, fontWeight: 700,
                    color: isToday ? T.primary : isWeekend ? T.muted : T.text,
                    borderBottom: `1px solid ${T.border}`,
                    background: isWeekend ? '#FAFAF9' : 'transparent',
                  }}>
                    <div>{DAYS[i]}</div>
                    <div style={{
                      fontSize: 13, fontWeight: 700, marginTop: 2,
                      color: isToday ? T.primary : isWeekend ? T.muted : T.text,
                    }}>{d.getMonth() + 1}/{d.getDate()}</div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {visibleZones.map((zone) => {
              // [TRACK77-U19] 색상 index = 원본 zones 배열 index (필터 무관 일관성)
              const zIdx = (zones || []).findIndex((z) => z.id === zone.id);
              const color = getMatrixZoneColor(zIdx >= 0 ? zIdx : 0);
              return (
                <tr key={zone.id}>
                  <td style={{
                    padding: '8px 14px',
                    background: color.soft,
                    color: color.strong,
                    fontWeight: 700, fontSize: 12,
                    borderRight: `1px solid ${T.border}`,
                    borderBottom: `1px solid ${T.borderSoft}`,
                    verticalAlign: 'top',
                  }}>{zone.name}</td>
                  {days.map((d, i) => {
                    const dateKey = fmtDateKey(d);
                    const cellTasks = matrix[`${zone.id}|${dateKey}`] || [];
                    const isWeekend = i >= 5;
                    return (
                      <td key={i} style={{
                        padding: 6, verticalAlign: 'top',
                        background: isWeekend ? '#FAFAF9' : T.surface,
                        borderRight: `1px solid ${T.borderSoft}`,
                        borderBottom: `1px solid ${T.borderSoft}`,
                        minWidth: 110,
                      }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                          {cellTasks.map((t) => {
                            const st = statusInfo(t.status);
                            const workers = t.workers || [];
                            const workerLabel = workers.length === 0
                              ? '미배정'
                              : workers.length <= 2
                                ? workers.map((w) => w.name).join(', ')
                                : `${workers[0].name}, ${workers[1].name} 외 ${workers.length - 2}`;
                            const progress = t.progress ?? (t.status === 'completed' ? 100 : t.status === 'in_progress' ? 40 : 0);
                            // [TRACK77-U19] 완료 task 시각 약화 (G77-JJJ)
                            const isDone = t.status === 'completed' || t.status === 'done';
                            return (
                              <div
                                key={t.id}
                                onClick={() => onCardClick?.(t)}
                                style={{
                                  background: color.soft,
                                  border: `1px solid ${color.border}`,
                                  borderRadius: 6,
                                  padding: '6px 8px',
                                  cursor: 'pointer',
                                  fontSize: 11,
                                  opacity: isDone ? 0.55 : 1,
                                }}
                              >
                                <div style={{
                                  display: 'flex', alignItems: 'center', gap: 4, marginBottom: 2,
                                }}>
                                  <span style={{ width: 5, height: 5, borderRadius: 999, background: st.dot }} />
                                  <span style={{ fontWeight: 700, color: color.text, lineHeight: 1.3, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {t.title}
                                  </span>
                                </div>
                                <div style={{ fontSize: 10, color: color.text, opacity: 0.8, marginBottom: 4 }}>{workerLabel}</div>
                                <div style={{ height: 3, background: 'rgba(255,255,255,0.6)', borderRadius: 2, overflow: 'hidden' }}>
                                  <div style={{ width: `${progress}%`, height: '100%', background: color.strong }} />
                                </div>
                              </div>
                            );
                          })}
                          <button
                            onClick={() => onAddClick?.(zone.id, dateKey)}
                            aria-label={`${zone.name} ${dateKey} 작업 추가`}
                            style={{
                              border: `1px dashed ${T.border}`,
                              background: 'transparent',
                              color: T.mutedSoft,
                              borderRadius: 6,
                              padding: '4px 0',
                              cursor: 'pointer',
                              fontSize: 14, lineHeight: 1,
                            }}
                          >+</button>
                        </div>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
            {visibleZones.length === 0 && (
              <tr>
                <td colSpan={8} style={{ padding: 40, textAlign: 'center', color: T.mutedSoft, fontSize: 13 }}>
                  {(!zones || zones.length === 0) ? '동(zone) 정보가 없습니다' : '선택된 동에 해당하는 항목이 없습니다'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
