// 작업자 - 내 출퇴근 (모바일) — 프로 SaaS 리디자인
// 기존: src/pages/worker/WorkerAttendancePage.jsx 교체용

import React, { useMemo, useState } from 'react';
import {
  Card, Dot, Icon, Pill, T, icons,
} from '../../design/primitives';
import useAuthStore from '../../stores/authStore';
import useAttendanceStore from '../../stores/attendanceStore';

const fmtTime = (iso) => {
  if (!iso) return '—';
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};
const pad2 = (n) => String(n).padStart(2, '0');
const ymd = (y, m, d) => `${y}-${pad2(m + 1)}-${pad2(d)}`;

const STATE_COLOR = {
  normal: T.success,
  late: T.warning,
  early: T.warning,
  absent: T.danger,
  holiday: T.mutedSoft,
  leave: T.info,
};

export default function WorkerAttendancePage({ onNavigate }) {
  const currentUser = useAuthStore((s) => s.currentUser);
  const records = useAttendanceStore((s) => s.records);

  const now = new Date();
  const [ym, setYm] = useState({ y: now.getFullYear(), m: now.getMonth() });
  const [selected, setSelected] = useState(now.toISOString().split('T')[0]);

  const monthRecords = useMemo(() => {
    const prefix = `${ym.y}-${pad2(ym.m + 1)}`;
    return records.filter((r) =>
      r.employeeId === currentUser?.id && r.date && r.date.startsWith(prefix)
    );
  }, [records, currentUser, ym]);

  const recordMap = useMemo(
    () => Object.fromEntries(monthRecords.map((r) => [r.date, r])),
    [monthRecords]
  );

  const stats = useMemo(() => {
    const s = { worked: 0, late: 0, minutes: 0 };
    monthRecords.forEach((r) => {
      if (r.checkIn) s.worked++;
      if (r.status === 'late') s.late++;
      if (r.checkIn && r.checkOut) {
        s.minutes += Math.round((new Date(r.checkOut) - new Date(r.checkIn)) / 60000);
      }
    });
    return s;
  }, [monthRecords]);

  // 달력
  const firstDay = new Date(ym.y, ym.m, 1);
  const daysInMonth = new Date(ym.y, ym.m + 1, 0).getDate();
  const startWeek = firstDay.getDay(); // 0=Sun
  const todayStr = now.toISOString().split('T')[0];

  const cells = [];
  for (let i = 0; i < startWeek; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  const shiftMonth = (delta) => {
    const d = new Date(ym.y, ym.m + delta, 1);
    setYm({ y: d.getFullYear(), m: d.getMonth() });
  };

  const selRecord = recordMap[selected];
  const selDate = new Date(selected);

  return (
    <div style={{ flex: 1, overflow: 'auto', background: T.bg, paddingBottom: 80 }}>
      {/* 헤더 */}
      <div style={{ background: T.surface, borderBottom: `1px solid ${T.border}`, padding: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <button onClick={() => onNavigate?.('home')} style={{
            width: 32, height: 32, borderRadius: 8, border: `1px solid ${T.border}`,
            background: T.bg, color: T.muted, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Icon d={<polyline points="15 18 9 12 15 6" />} size={14} sw={2.2} />
          </button>
          <h1 style={{ fontSize: 15, fontWeight: 700, color: T.text, margin: 0 }}>내 출퇴근</h1>
          <div style={{ width: 32 }} />
        </div>
      </div>

      {/* 월별 통계 */}
      <div style={{ padding: 16 }}>
        <Card pad={16}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <button onClick={() => shiftMonth(-1)} style={{
              width: 28, height: 28, borderRadius: 6, border: `1px solid ${T.border}`, background: T.surface,
              color: T.muted, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Icon d={<polyline points="15 18 9 12 15 6" />} size={13} sw={2} />
            </button>
            <div style={{ fontSize: 15, fontWeight: 700, color: T.text, letterSpacing: -0.3 }}>
              {ym.y}년 {ym.m + 1}월
            </div>
            <button onClick={() => shiftMonth(1)} style={{
              width: 28, height: 28, borderRadius: 6, border: `1px solid ${T.border}`, background: T.surface,
              color: T.muted, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Icon d={<polyline points="9 18 15 12 9 6" />} size={13} sw={2} />
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
            {[
              { l: '출근', v: stats.worked, sub: '일', c: T.success },
              { l: '지각', v: stats.late, sub: '일', c: T.warning },
              { l: '근무 시간', v: Math.floor(stats.minutes / 60), sub: `${stats.minutes % 60}분`, unit: 'h', c: T.primary },
            ].map((k, i) => (
              <div key={i} style={{ padding: 10, background: T.bg, borderRadius: 8, textAlign: 'center' }}>
                <div style={{ fontSize: 10, color: T.mutedSoft, fontWeight: 700, marginBottom: 4 }}>{k.l}</div>
                <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: 3 }}>
                  <span style={{ fontSize: 22, fontWeight: 700, color: k.c, letterSpacing: -0.5, fontFamily: 'ui-monospace,monospace', lineHeight: 1 }}>{k.v}</span>
                  {k.unit && <span style={{ fontSize: 11, color: T.mutedSoft, fontWeight: 600 }}>{k.unit}</span>}
                </div>
                <div style={{ fontSize: 10, color: T.mutedSoft, marginTop: 3 }}>{k.sub}</div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* 달력 */}
      <div style={{ padding: '0 16px' }}>
        <Card pad={14}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, marginBottom: 6 }}>
            {['일', '월', '화', '수', '목', '금', '토'].map((d, i) => (
              <div key={d} style={{
                textAlign: 'center', fontSize: 11, fontWeight: 700,
                color: i === 0 ? T.danger : i === 6 ? T.primary : T.mutedSoft,
                padding: 4,
              }}>{d}</div>
            ))}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
            {cells.map((d, i) => {
              if (d == null) return <div key={i} />;
              const dateStr = ymd(ym.y, ym.m, d);
              const r = recordMap[dateStr];
              const isToday = dateStr === todayStr;
              const isSel = dateStr === selected;
              const dow = new Date(ym.y, ym.m, d).getDay();
              const state = r?.status || (r?.checkIn ? 'normal' : null);
              const dotC = STATE_COLOR[state];
              return (
                <button key={i} onClick={() => setSelected(dateStr)} style={{
                  aspectRatio: '1', border: isSel ? `1.5px solid ${T.primary}` : '1.5px solid transparent',
                  borderRadius: 8, background: isSel ? T.primarySoft : isToday ? T.bg : 'transparent',
                  cursor: 'pointer',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2,
                  padding: 2, position: 'relative',
                }}>
                  <span style={{
                    fontSize: 13, fontWeight: isSel || isToday ? 700 : 500,
                    color: isSel ? T.primaryText : dow === 0 ? T.danger : dow === 6 ? T.primary : T.text,
                    fontFamily: 'ui-monospace,monospace',
                  }}>{d}</span>
                  {dotC ? (
                    <Dot c={dotC} />
                  ) : (
                    <span style={{ width: 6, height: 6 }} />
                  )}
                </button>
              );
            })}
          </div>

          {/* 범례 */}
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 12, paddingTop: 10, borderTop: `1px solid ${T.borderSoft}`, fontSize: 10, color: T.mutedSoft }}>
            <span><Dot c={T.success} /> 정상</span>
            <span><Dot c={T.warning} /> 지각</span>
            <span><Dot c={T.danger} /> 결근</span>
            <span><Dot c={T.info} /> 휴가</span>
          </div>
        </Card>
      </div>

      {/* 선택일 상세 */}
      <div style={{ padding: 16 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: T.muted, marginBottom: 8, letterSpacing: 0.3 }}>
          {selDate.getMonth() + 1}월 {selDate.getDate()}일 ({['일','월','화','수','목','금','토'][selDate.getDay()]}) 기록
        </div>
        <Card pad={16}>
          {selRecord?.checkIn ? (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
                <div style={{ padding: 12, background: T.bg, borderRadius: 8 }}>
                  <div style={{ fontSize: 10, color: T.mutedSoft, fontWeight: 700, marginBottom: 4 }}>출근</div>
                  <div style={{ fontSize: 20, fontWeight: 700, color: T.text, fontFamily: 'ui-monospace,monospace' }}>{fmtTime(selRecord.checkIn)}</div>
                </div>
                <div style={{ padding: 12, background: T.bg, borderRadius: 8 }}>
                  <div style={{ fontSize: 10, color: T.mutedSoft, fontWeight: 700, marginBottom: 4 }}>퇴근</div>
                  <div style={{ fontSize: 20, fontWeight: 700, color: selRecord.checkOut ? T.text : T.mutedSoft, fontFamily: 'ui-monospace,monospace' }}>{fmtTime(selRecord.checkOut)}</div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 10, background: T.bg, borderRadius: 8 }}>
                <Icon d={icons.clock} size={14} c={T.muted} />
                <span style={{ fontSize: 12, color: T.muted, fontWeight: 600, flex: 1 }}>근무 시간</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: T.text, fontFamily: 'ui-monospace,monospace' }}>
                  {selRecord.checkOut
                    ? (() => {
                        const m = Math.round((new Date(selRecord.checkOut) - new Date(selRecord.checkIn)) / 60000);
                        return `${Math.floor(m / 60)}h ${m % 60}m`;
                      })()
                    : '—'}
                </span>
              </div>
              {selRecord.status && selRecord.status !== 'normal' && (
                <div style={{ marginTop: 10, padding: 10, background: T.warningSoft, borderRadius: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Icon d={icons.alert} size={14} c={T.warning} />
                  <span style={{ fontSize: 12, color: T.warning, fontWeight: 600 }}>
                    {selRecord.status === 'late' ? `${selRecord.lateMinutes || ''}분 지각` : selRecord.status === 'early' ? '조퇴' : selRecord.status}
                  </span>
                </div>
              )}
            </>
          ) : (
            <div style={{ padding: '24px 0', textAlign: 'center' }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: T.mutedSoft }}>
                {selected > todayStr ? '예정일입니다' : '기록이 없습니다'}
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
