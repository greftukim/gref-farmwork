// 출근 현황 — 프로 SaaS 리디자인
// 기존: src/pages/admin/AttendanceStatusPage.jsx 교체용

import React, { useMemo, useState } from 'react';
import {
  Avatar, Card, Dot, Icon, Pill, T, TopBar, icons,
} from '../../design/primitives';
import useAttendanceStore from '../../stores/attendanceStore';
import useEmployeeStore from '../../stores/employeeStore';

const TODAY = new Date().toISOString().split('T')[0];
const AVATAR_COLORS = ['indigo', 'emerald', 'amber', 'sky', 'rose', 'violet'];
const avatarColor = (id) => {
  const s = (id || '').toString();
  let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
};

const STATUS_TONE = {
  normal: { l: '정상 출근', tone: 'success', fg: T.success, soft: T.successSoft },
  working: { l: '근무중', tone: 'primary', fg: T.primary, soft: T.primarySoft },
  late: { l: '지각', tone: 'warning', fg: T.warning, soft: T.warningSoft },
  early: { l: '조퇴', tone: 'warning', fg: T.warning, soft: T.warningSoft },
};

const fmtTime = (iso) => {
  if (!iso) return '—';
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

export default function AttendanceStatusPage() {
  const records = useAttendanceStore((s) => s.records);
  const employees = useEmployeeStore((s) => s.employees);

  const [filter, setFilter] = useState('all');
  const [searchQ, setSearchQ] = useState('');

  const workers = useMemo(
    () => employees.filter((e) => e.role === 'worker' && e.isActive),
    [employees]
  );
  const todayRecords = useMemo(() => records.filter((r) => r.date === TODAY), [records]);

  const rows = useMemo(() => {
    return workers.map((w) => {
      const rec = todayRecords.find((r) => r.employeeId === w.id);
      let state = 'absent';
      if (rec?.checkIn) {
        if (rec.checkOut) state = rec.status === 'late' ? 'late' : 'normal';
        else state = 'working';
      }
      return { emp: w, rec, state };
    });
  }, [workers, todayRecords]);

  const filtered = useMemo(() => {
    const q = searchQ.trim();
    return rows
      .filter((r) => filter === 'all' || (filter === 'present' && r.state !== 'absent') || (filter === 'absent' && r.state === 'absent') || filter === r.state)
      .filter((r) => !q || (r.emp.name || '').includes(q));
  }, [rows, filter, searchQ]);

  const total = workers.length;
  const checkedIn = rows.filter((r) => r.state !== 'absent').length;
  const working = rows.filter((r) => r.state === 'working').length;
  const late = rows.filter((r) => r.state === 'late').length;
  const absent = rows.filter((r) => r.state === 'absent').length;
  const rate = total ? Math.round((checkedIn / total) * 100) : 0;

  // 부서별 그룹
  const byJobType = useMemo(() => {
    const m = {};
    rows.forEach((r) => {
      const jt = r.emp.jobType || '기타';
      if (!m[jt]) m[jt] = { total: 0, checkedIn: 0 };
      m[jt].total++;
      if (r.state !== 'absent') m[jt].checkedIn++;
    });
    return Object.entries(m).sort((a, b) => b[1].total - a[1].total);
  }, [rows]);

  return (
    <div style={{ flex: 1, overflow: 'auto', background: T.bg, minWidth: 0 }}>
      <TopBar
        subtitle="근태 관리"
        title="출근 현황"
        actions={
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 12, color: T.muted }}>
            <span>{new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' })}</span>
            <Dot c={T.success} />
            <span style={{ fontWeight: 600, color: T.success }}>LIVE</span>
          </div>
        }
      />

      <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
        {/* KPI with progress */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr 1fr 1fr', gap: 12 }}>
          {/* 출근율 (hero) */}
          <Card pad={20} style={{ position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: T.primary }} />
            <div style={{ fontSize: 12, color: T.muted, fontWeight: 600, marginBottom: 10 }}>오늘 출근율</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 12 }}>
              <span style={{ fontSize: 44, fontWeight: 700, color: T.text, letterSpacing: -1.2, lineHeight: 1 }}>{rate}</span>
              <span style={{ fontSize: 18, color: T.mutedSoft, fontWeight: 600 }}>%</span>
              <span style={{ fontSize: 12, color: T.muted, fontWeight: 600, marginLeft: 'auto' }}>
                {checkedIn} / {total}명
              </span>
            </div>
            <div style={{ height: 8, background: T.bg, borderRadius: 4, overflow: 'hidden', display: 'flex' }}>
              <div style={{ width: `${total ? (rows.filter((r) => r.state === 'normal').length / total) * 100 : 0}%`, background: T.success }} />
              <div style={{ width: `${total ? (working / total) * 100 : 0}%`, background: T.primary }} />
              <div style={{ width: `${total ? (late / total) * 100 : 0}%`, background: T.warning }} />
            </div>
            <div style={{ display: 'flex', gap: 14, fontSize: 11, color: T.mutedSoft, marginTop: 8 }}>
              <span><Dot c={T.success} /> 정상 {rows.filter((r) => r.state === 'normal').length}</span>
              <span><Dot c={T.primary} /> 근무중 {working}</span>
              <span><Dot c={T.warning} /> 지각 {late}</span>
            </div>
          </Card>

          {[
            { l: '근무중', v: working, sub: '미퇴근', tone: T.primary, soft: T.primarySoft, trend: 'LIVE' },
            { l: '지각', v: late, sub: '출근 후 기록', tone: T.warning, soft: T.warningSoft, trend: late > 0 ? '확인' : '없음' },
            { l: '미출근', v: absent, sub: `${rate < 100 ? `${100 - rate}%` : ''}`, tone: absent > 0 ? T.danger : T.mutedSoft, soft: absent > 0 ? T.dangerSoft : T.bg, trend: absent > 0 ? '체크' : '없음' },
          ].map((k, i) => (
            <Card key={i} pad={18} style={{ position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: k.tone }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14 }}>
                <span style={{ fontSize: 12, color: T.muted, fontWeight: 600 }}>{k.l}</span>
                <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 6px', background: k.soft, color: k.tone, borderRadius: 4 }}>{k.trend}</span>
              </div>
              <div style={{ fontSize: 36, fontWeight: 700, color: T.text, letterSpacing: -1, lineHeight: 1 }}>{k.v}</div>
              <div style={{ fontSize: 11, color: T.mutedSoft, marginTop: 8 }}>{k.sub || '명'}</div>
            </Card>
          ))}
        </div>

        {/* 부서별 요약 */}
        {byJobType.length > 0 && (
          <Card>
            <div style={{ fontSize: 13, fontWeight: 700, color: T.text, marginBottom: 12 }}>직군별 출근 현황</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12 }}>
              {byJobType.map(([jt, s]) => {
                const r = s.total ? Math.round((s.checkedIn / s.total) * 100) : 0;
                return (
                  <div key={jt} style={{ padding: 12, background: T.bg, borderRadius: 8 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: T.text }}>{jt}</span>
                      <span style={{ fontSize: 11, color: T.mutedSoft, fontFamily: 'ui-monospace,monospace' }}>{s.checkedIn}/{s.total}</span>
                    </div>
                    <div style={{ height: 6, background: T.surface, borderRadius: 3, overflow: 'hidden' }}>
                      <div style={{ width: `${r}%`, height: '100%', background: r === 100 ? T.success : r >= 80 ? T.primary : T.warning }} />
                    </div>
                    <div style={{ fontSize: 10, color: T.mutedSoft, marginTop: 4, fontWeight: 600 }}>{r}%</div>
                  </div>
                );
              })}
            </div>
          </Card>
        )}

        {/* 리스트 */}
        <Card pad={0}>
          <div style={{ padding: '14px 18px', borderBottom: `1px solid ${T.borderSoft}`, display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ display: 'flex', gap: 4, background: T.bg, padding: 3, borderRadius: 7 }}>
              {[
                { v: 'all', l: '전체', n: total },
                { v: 'present', l: '출근', n: checkedIn },
                { v: 'working', l: '근무중', n: working },
                { v: 'late', l: '지각', n: late },
                { v: 'absent', l: '미출근', n: absent },
              ].map((t) => {
                const on = filter === t.v;
                return (
                  <span key={t.v} onClick={() => setFilter(t.v)} style={{
                    padding: '6px 12px', borderRadius: 5, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                    background: on ? T.surface : 'transparent',
                    color: on ? T.text : T.mutedSoft,
                    boxShadow: on ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                  }}>
                    {t.l}
                    <span style={{ fontSize: 10, fontWeight: 700, padding: '0 5px', borderRadius: 3, background: on ? T.bg : 'transparent', color: on ? T.muted : T.mutedSoft }}>{t.n}</span>
                  </span>
                );
              })}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 10px', background: T.bg, border: `1px solid ${T.border}`, borderRadius: 7, flex: 1, maxWidth: 260, marginLeft: 'auto', fontSize: 13, color: T.mutedSoft }}>
              <Icon d={icons.search} size={14} />
              <input value={searchQ} onChange={(e) => setSearchQ(e.target.value)}
                placeholder="작업자명 검색"
                style={{ border: 0, background: 'transparent', outline: 'none', flex: 1, fontSize: 13, color: T.text }} />
            </div>
          </div>

          {filtered.length === 0 ? (
            <div style={{ padding: 60, textAlign: 'center', color: T.mutedSoft, fontSize: 13 }}>해당 조건의 작업자가 없습니다</div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: T.bg, textAlign: 'left', color: T.mutedSoft, fontSize: 11, fontWeight: 700, letterSpacing: 0.3 }}>
                  <th style={{ padding: '10px 18px' }}>작업자</th>
                  <th style={{ padding: '10px 12px' }}>직군</th>
                  <th style={{ padding: '10px 12px' }}>출근</th>
                  <th style={{ padding: '10px 12px' }}>퇴근</th>
                  <th style={{ padding: '10px 12px' }}>근무 시간</th>
                  <th style={{ padding: '10px 18px', textAlign: 'right' }}>상태</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(({ emp, rec, state }, i) => {
                  const st = STATUS_TONE[state];
                  const minutes = rec?.checkIn && rec?.checkOut
                    ? Math.round((new Date(rec.checkOut) - new Date(rec.checkIn)) / 60000)
                    : rec?.checkIn ? Math.round((Date.now() - new Date(rec.checkIn)) / 60000) : 0;
                  return (
                    <tr key={emp.id} style={{ borderTop: i ? `1px solid ${T.borderSoft}` : 'none' }}>
                      <td style={{ padding: '12px 18px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <Avatar name={emp.name} color={avatarColor(emp.id)} size={32} />
                          <span style={{ fontWeight: 600, color: T.text }}>{emp.name}</span>
                        </div>
                      </td>
                      <td style={{ padding: '12px', color: T.muted }}>{emp.jobType || '—'}</td>
                      <td style={{ padding: '12px', color: rec?.checkIn ? T.text : T.mutedSoft, fontFamily: 'ui-monospace,monospace', fontWeight: 600 }}>
                        {fmtTime(rec?.checkIn)}
                      </td>
                      <td style={{ padding: '12px', color: rec?.checkOut ? T.text : T.mutedSoft, fontFamily: 'ui-monospace,monospace' }}>
                        {fmtTime(rec?.checkOut)}
                      </td>
                      <td style={{ padding: '12px', color: T.muted, fontFamily: 'ui-monospace,monospace' }}>
                        {rec?.checkIn ? `${Math.floor(minutes / 60)}h ${minutes % 60}m` : '—'}
                      </td>
                      <td style={{ padding: '12px 18px', textAlign: 'right' }}>
                        {st ? (
                          <span style={{
                            display: 'inline-flex', alignItems: 'center', gap: 6,
                            padding: '3px 10px', borderRadius: 999,
                            background: st.soft, color: st.fg,
                            fontSize: 11, fontWeight: 700,
                          }}>
                            <Dot c={st.fg} />{st.l}
                            {state === 'working' && <span style={{ fontFamily: 'ui-monospace,monospace', fontWeight: 600, opacity: 0.8 }}>· {Math.floor(minutes / 60)}h{minutes % 60}m</span>}
                          </span>
                        ) : (
                          <span style={{
                            display: 'inline-flex', alignItems: 'center', gap: 6,
                            padding: '3px 10px', borderRadius: 999,
                            background: T.bg, color: T.mutedSoft,
                            fontSize: 11, fontWeight: 700, border: `1px solid ${T.border}`,
                          }}>미출근</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </Card>
      </div>
    </div>
  );
}
