// 근태 기록 조회 — 프로 SaaS 리디자인
// 기존: src/pages/admin/AttendanceRecordsPage.jsx 교체용

import React, { useMemo, useState } from 'react';
import {
  Avatar, Card, Dot, Icon, Pill, T, TopBar, btnSecondary, icons,
} from '../../design/primitives';
import useAttendanceStore from '../../stores/attendanceStore';
import useEmployeeStore from '../../stores/employeeStore';

const AVATAR_COLORS = ['indigo', 'emerald', 'amber', 'rose'];
const avatarColor = (id) => {
  const s = (id || '').toString();
  let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
};

const STATUS = {
  normal: { l: '정상', tone: 'success' },
  late: { l: '지각', tone: 'warning' },
  early: { l: '조퇴', tone: 'warning' },
  absent: { l: '결근', tone: 'danger' },
};

const fmtTime = (iso) => {
  if (!iso) return '—';
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

const fmtDate = (s) => {
  if (!s) return '—';
  const d = new Date(s);
  const days = ['일', '월', '화', '수', '목', '금', '토'];
  return `${d.getMonth() + 1}/${d.getDate()} (${days[d.getDay()]})`;
};

export default function AttendanceRecordsPage() {
  const records = useAttendanceStore((s) => s.records);
  const employees = useEmployeeStore((s) => s.employees);

  const today = new Date().toISOString().split('T')[0];
  const firstOfMonth = today.slice(0, 8) + '01';

  const [dateFrom, setDateFrom] = useState(firstOfMonth);
  const [dateTo, setDateTo] = useState(today);
  const [empFilter, setEmpFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQ, setSearchQ] = useState('');

  const empMap = useMemo(
    () => Object.fromEntries(employees.map((e) => [e.id, e])),
    [employees]
  );

  const filtered = useMemo(() => {
    const q = searchQ.trim();
    return records
      .filter((r) => r.date >= dateFrom && r.date <= dateTo)
      .filter((r) => empFilter === 'all' || r.employeeId === empFilter)
      .filter((r) => {
        if (statusFilter === 'all') return true;
        if (statusFilter === 'normal') return r.status === 'normal' || (!r.status && r.checkIn);
        return r.status === statusFilter;
      })
      .filter((r) => !q || (empMap[r.employeeId]?.name || '').includes(q))
      .sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  }, [records, dateFrom, dateTo, empFilter, statusFilter, searchQ, empMap]);

  // 집계
  const stats = useMemo(() => {
    const s = { total: filtered.length, normal: 0, late: 0, early: 0, minutes: 0 };
    filtered.forEach((r) => {
      if (r.status === 'late') s.late++;
      else if (r.status === 'early') s.early++;
      else if (r.checkIn) s.normal++;
      if (r.checkIn && r.checkOut) {
        s.minutes += Math.round((new Date(r.checkOut) - new Date(r.checkIn)) / 60000);
      }
    });
    return s;
  }, [filtered]);

  const workers = useMemo(
    () => employees.filter((e) => e.role === 'worker'),
    [employees]
  );

  return (
    <div style={{ flex: 1, overflow: 'auto', background: T.bg, minWidth: 0 }}>
      <TopBar
        subtitle="근태 관리"
        title="근태 기록 조회"
        actions={btnSecondary('CSV 내보내기', icons.down)}
      />

      <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
        {/* KPI */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
          {[
            { l: '총 기록', v: stats.total, sub: '건', tone: T.primary, soft: T.primarySoft },
            { l: '정상 출근', v: stats.normal, sub: '건', tone: T.success, soft: T.successSoft },
            { l: '지각', v: stats.late, sub: '건', tone: T.warning, soft: T.warningSoft },
            { l: '총 근무 시간', v: Math.floor(stats.minutes / 60), sub: `${stats.minutes % 60}분`, unit: 'h', tone: T.info, soft: T.infoSoft },
          ].map((k, i) => (
            <Card key={i} pad={18} style={{ position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: k.tone }} />
              <div style={{ fontSize: 12, color: T.muted, fontWeight: 600, marginBottom: 14 }}>{k.l}</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                <span style={{ fontSize: 36, fontWeight: 700, color: T.text, letterSpacing: -1, lineHeight: 1 }}>{k.v}</span>
                {k.unit && <span style={{ fontSize: 14, color: T.mutedSoft, fontWeight: 500 }}>{k.unit}</span>}
              </div>
              <div style={{ fontSize: 11, color: T.mutedSoft, marginTop: 8 }}>{k.sub}</div>
            </Card>
          ))}
        </div>

        {/* 필터 바 */}
        <Card pad={16}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: T.muted, fontWeight: 600 }}>
              <Icon d={icons.calendar} size={14} c={T.mutedSoft} />
              <span>기간</span>
            </div>
            <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)}
              style={{ height: 34, padding: '0 10px', border: `1px solid ${T.border}`, borderRadius: 7, fontSize: 12 }} />
            <span style={{ color: T.mutedSoft }}>~</span>
            <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)}
              style={{ height: 34, padding: '0 10px', border: `1px solid ${T.border}`, borderRadius: 7, fontSize: 12 }} />

            <div style={{ width: 1, height: 24, background: T.border, margin: '0 6px' }} />

            <select value={empFilter} onChange={(e) => setEmpFilter(e.target.value)}
              style={{ height: 34, padding: '0 10px', border: `1px solid ${T.border}`, borderRadius: 7, fontSize: 12, minWidth: 140 }}>
              <option value="all">전체 직원</option>
              {workers.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
            </select>

            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
              style={{ height: 34, padding: '0 10px', border: `1px solid ${T.border}`, borderRadius: 7, fontSize: 12, minWidth: 110 }}>
              <option value="all">전체 상태</option>
              <option value="normal">정상</option>
              <option value="late">지각</option>
              <option value="early">조퇴</option>
              <option value="absent">결근</option>
            </select>

            <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 10px', background: T.bg, border: `1px solid ${T.border}`, borderRadius: 7, flex: 1, maxWidth: 240, marginLeft: 'auto' }}>
              <Icon d={icons.search} size={14} c={T.mutedSoft} />
              <input value={searchQ} onChange={(e) => setSearchQ(e.target.value)}
                placeholder="이름 검색"
                style={{ border: 0, background: 'transparent', outline: 'none', flex: 1, fontSize: 13, color: T.text }} />
            </div>
          </div>
        </Card>

        {/* 테이블 */}
        <Card pad={0}>
          <div style={{ padding: '14px 20px', borderBottom: `1px solid ${T.borderSoft}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: T.text }}>근태 기록 ({filtered.length})</div>
            <div style={{ fontSize: 11, color: T.mutedSoft }}>{dateFrom} ~ {dateTo}</div>
          </div>
          {filtered.length === 0 ? (
            <div style={{ padding: 60, textAlign: 'center', color: T.mutedSoft, fontSize: 13 }}>
              해당 조건의 근태 기록이 없습니다
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: T.bg, textAlign: 'left', color: T.mutedSoft, fontSize: 11, fontWeight: 700, letterSpacing: 0.3 }}>
                  <th style={{ padding: '10px 20px' }}>날짜</th>
                  <th style={{ padding: '10px 12px' }}>작업자</th>
                  <th style={{ padding: '10px 12px' }}>출근</th>
                  <th style={{ padding: '10px 12px' }}>퇴근</th>
                  <th style={{ padding: '10px 12px' }}>근무 시간</th>
                  <th style={{ padding: '10px 12px' }}>상태</th>
                  <th style={{ padding: '10px 20px', textAlign: 'right' }}>비고</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r, i) => {
                  const emp = empMap[r.employeeId];
                  const minutes = r.checkIn && r.checkOut
                    ? Math.round((new Date(r.checkOut) - new Date(r.checkIn)) / 60000) : 0;
                  const st = STATUS[r.status] || (r.checkIn ? STATUS.normal : null);
                  return (
                    <tr key={r.id || i} style={{ borderTop: i ? `1px solid ${T.borderSoft}` : 'none' }}>
                      <td style={{ padding: '12px 20px', color: T.text, fontWeight: 600, fontFamily: 'ui-monospace,monospace' }}>{fmtDate(r.date)}</td>
                      <td style={{ padding: '12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <Avatar name={emp?.name || '?'} color={avatarColor(r.employeeId)} size={30} />
                          <div>
                            <div style={{ fontWeight: 600, color: T.text }}>{emp?.name || '—'}</div>
                            <div style={{ fontSize: 10, color: T.mutedSoft }}>{emp?.jobType || ''}</div>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '12px', color: r.checkIn ? T.text : T.mutedSoft, fontFamily: 'ui-monospace,monospace', fontWeight: 600 }}>{fmtTime(r.checkIn)}</td>
                      <td style={{ padding: '12px', color: r.checkOut ? T.text : T.mutedSoft, fontFamily: 'ui-monospace,monospace' }}>{fmtTime(r.checkOut)}</td>
                      <td style={{ padding: '12px', color: T.muted, fontFamily: 'ui-monospace,monospace' }}>
                        {minutes > 0 ? `${Math.floor(minutes / 60)}h ${minutes % 60}m` : '—'}
                      </td>
                      <td style={{ padding: '12px' }}>
                        {st ? <Pill tone={st.tone}>{st.l}</Pill> : <span style={{ fontSize: 11, color: T.mutedSoft }}>—</span>}
                      </td>
                      <td style={{ padding: '12px 20px', textAlign: 'right', color: T.mutedSoft, fontSize: 11, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {r.note || (r.lateMinutes ? `${r.lateMinutes}분 지각` : '')}
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
