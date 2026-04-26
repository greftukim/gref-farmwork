// 휴가 관리 (공용) — /admin/leave
import React, { useMemo, useState } from 'react';
import { Avatar, Card, Pill, T, TopBar, btnPrimary, btnSecondary, icons } from '../../design/primitives';
import useLeaveStore from '../../stores/leaveStore';
import useEmployeeStore from '../../stores/employeeStore';

const TYPES = { annual: '연차', sick: '병가', personal: '개인', family: '경조사' };
const AV_COLORS = ['indigo', 'emerald', 'amber', 'slate', 'rose'];

export default function LeavePage() {
  const requests = useLeaveStore((s) => s.requests);
  const approveRequest = useLeaveStore((s) => s.approveRequest);
  const rejectRequest = useLeaveStore((s) => s.rejectRequest);
  const employees = useEmployeeStore((s) => s.employees);

  const [calMonth, setCalMonth] = useState(() => { const d = new Date(); d.setDate(1); return d; });

  const empMap = useMemo(() => Object.fromEntries(employees.map((e) => [e.id, e])), [employees]);

  const counts = useMemo(() => {
    const now = new Date();
    const ym = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    return {
      pending: (requests || []).filter((r) => r.status === 'pending').length,
      approved: (requests || []).filter((r) => r.status === 'approved').length,
      thisMonth: (requests || []).filter((r) => (r.date || '').startsWith(ym)).length,
      all: requests?.length || 0,
    };
  }, [requests]);

  const pendingList = useMemo(() =>
    (requests || [])
      .filter((r) => r.status === 'pending')
      .sort((a, b) => (a.date || '').localeCompare(b.date || '')),
    [requests]
  );

  const calInfo = useMemo(() => {
    const y = calMonth.getFullYear();
    const m = calMonth.getMonth();
    const firstDay = new Date(y, m, 1).getDay();
    const daysInMonth = new Date(y, m + 1, 0).getDate();
    const today = new Date();
    const todayDay = (today.getFullYear() === y && today.getMonth() === m) ? today.getDate() : -1;
    return { y, m, firstDay, daysInMonth, todayDay };
  }, [calMonth]);

  const leaveDots = useMemo(() => {
    const { y, m } = calInfo;
    const map = {};
    (requests || []).forEach((r, idx) => {
      if (!r.date) return;
      const d = new Date(r.date);
      if (d.getFullYear() !== y || d.getMonth() !== m) return;
      const day = d.getDate();
      if (!map[day]) map[day] = [];
      const emp = empMap[r.employeeId];
      if (emp) map[day].push({ n: emp.name.charAt(0), c: AV_COLORS[idx % AV_COLORS.length] });
    });
    return map;
  }, [requests, empMap, calInfo]);

  const shiftMonth = (n) => setCalMonth((prev) => {
    const d = new Date(prev);
    d.setMonth(d.getMonth() + n);
    d.setDate(1);
    return d;
  });

  const monthLabel = `${calInfo.y}년 ${calInfo.m + 1}월`;

  return (
    <div style={{ flex: 1, overflow: 'auto', background: T.bg, minWidth: 0 }}>
      <TopBar subtitle="인사 관리" title="휴가 신청 관리" actions={
        <div style={{ display: 'flex', gap: 8 }}>
          {btnSecondary('휴가 현황 엑셀')}
          {btnPrimary('휴가 등록', icons.plus)}
        </div>
      } />
      <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* KPI 카드 */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
          {[
            { l: '승인 대기', v: counts.pending, tone: T.warning, sub: '처리 필요' },
            { l: '이번 달 휴가', v: counts.thisMonth, sub: '신청 합계' },
            { l: '승인 완료', v: counts.approved, tone: T.success, sub: '이번 달 기준' },
            { l: '전체 신청', v: counts.all, sub: '누적' },
          ].map((k, i) => (
            <Card key={i} pad={16}>
              <div style={{ fontSize: 12, color: T.muted, fontWeight: 600, marginBottom: 6 }}>{k.l}</div>
              <div style={{ fontSize: 30, fontWeight: 700, color: k.tone || T.text, letterSpacing: -0.8, lineHeight: 1 }}>
                {k.v}<span style={{ fontSize: 14, color: T.mutedSoft, fontWeight: 500, marginLeft: 4 }}>건</span>
              </div>
              <div style={{ fontSize: 11, color: T.mutedSoft, marginTop: 6 }}>{k.sub}</div>
            </Card>
          ))}
        </div>

        {/* 2컬럼: 승인 대기 | 팀 캘린더 */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.4fr', gap: 20, alignItems: 'start' }}>

          {/* 승인 대기 카드 목록 */}
          <Card pad={0}>
            <div style={{ padding: '14px 18px', borderBottom: `1px solid ${T.borderSoft}`, display: 'flex', alignItems: 'center', gap: 8 }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, color: T.text, margin: 0 }}>승인 대기</h3>
              {counts.pending > 0 && <Pill tone="danger">{counts.pending}</Pill>}
            </div>
            {pendingList.length === 0 ? (
              <div style={{ padding: 48, textAlign: 'center', color: T.mutedSoft, fontSize: 13 }}>대기 중인 신청이 없습니다</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {pendingList.map((r, i) => {
                  const emp = empMap[r.employeeId];
                  const roleLabel = emp?.jobType || (emp?.role === 'worker' ? '작업자' : '관리자');
                  return (
                    <div key={r.id} style={{ padding: 16, borderBottom: i < pendingList.length - 1 ? `1px solid ${T.borderSoft}` : 'none' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                        <Avatar name={emp?.name || '?'} size={36} c={AV_COLORS[i % AV_COLORS.length]} />
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 14, fontWeight: 700, color: T.text }}>{emp?.name || '—'}</div>
                          <div style={{ fontSize: 11, color: T.mutedSoft, marginTop: 2 }}>{roleLabel}</div>
                        </div>
                        <Pill tone="primary">{TYPES[r.type] || r.type}</Pill>
                      </div>
                      <div style={{ padding: 12, background: T.bg, borderRadius: 8, marginBottom: 10 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 6 }}>
                          <span style={{ color: T.muted }}>기간</span>
                          <span style={{ color: T.text, fontWeight: 700, fontFamily: 'ui-monospace,monospace' }}>{r.date} · {r.days}일</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                          <span style={{ color: T.muted }}>사유</span>
                          <span style={{ color: T.text }}>{r.reason || '—'}</span>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button onClick={() => rejectRequest?.(r.id)}
                          style={{ flex: 1, padding: '9px 0', border: `1px solid ${T.border}`, background: T.surface, borderRadius: 7, fontSize: 13, fontWeight: 600, color: T.muted, cursor: 'pointer' }}>반려</button>
                        <button onClick={() => approveRequest?.(r.id)}
                          style={{ flex: 2, padding: '9px 0', border: 0, background: T.primary, borderRadius: 7, fontSize: 13, fontWeight: 600, color: '#fff', cursor: 'pointer' }}>승인</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>

          {/* 팀 휴가 캘린더 */}
          <Card pad={20}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div>
                <h3 style={{ fontSize: 14, fontWeight: 700, color: T.text, margin: 0 }}>팀 휴가 캘린더</h3>
                <p style={{ fontSize: 11, color: T.mutedSoft, margin: '2px 0 0' }}>{monthLabel}</p>
              </div>
              <div style={{ display: 'flex', gap: 4 }}>
                <button onClick={() => shiftMonth(-1)} style={{ width: 28, height: 28, borderRadius: 6, border: `1px solid ${T.border}`, background: T.surface, cursor: 'pointer', fontSize: 14, color: T.muted }}>‹</button>
                <button onClick={() => shiftMonth(1)} style={{ width: 28, height: 28, borderRadius: 6, border: `1px solid ${T.border}`, background: T.surface, cursor: 'pointer', fontSize: 14, color: T.muted }}>›</button>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 3 }}>
              {['일', '월', '화', '수', '목', '금', '토'].map((d, i) => (
                <div key={d} style={{ fontSize: 11, fontWeight: 700, color: i === 0 ? T.danger : i === 6 ? T.primary : T.mutedSoft, textAlign: 'center', padding: '6px 0' }}>{d}</div>
              ))}
              {Array.from({ length: calInfo.firstDay + calInfo.daysInMonth }).map((_, idx) => {
                const day = idx - calInfo.firstDay + 1;
                const isValid = day >= 1;
                const isToday = day === calInfo.todayDay;
                const dots = leaveDots[day] || [];
                const dow = idx % 7;
                return (
                  <div key={idx} style={{
                    minHeight: 56, padding: 4, borderRadius: 6,
                    background: isToday ? T.primarySoft : isValid ? T.bg : 'transparent',
                    border: isToday ? `1px solid ${T.primary}` : '1px solid transparent',
                  }}>
                    {isValid && (
                      <>
                        <div style={{ fontSize: 11, fontWeight: 700, color: isToday ? T.primary : dow === 0 ? T.danger : dow === 6 ? T.primary : T.text, marginBottom: 3 }}>{day}</div>
                        <div style={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                          {dots.slice(0, 3).map((l, j) => <Avatar key={j} name={l.n} size={16} c={l.c} />)}
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
            <div style={{ marginTop: 14, paddingTop: 14, borderTop: `1px solid ${T.borderSoft}`, fontSize: 11, color: T.mutedSoft }}>
              이번 달 총 <strong style={{ color: T.text }}>{counts.thisMonth}건</strong>의 휴가
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
