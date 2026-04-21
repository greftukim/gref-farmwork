// 근태 승인 — 프로 SaaS 리디자인
// 기존: src/pages/admin/LeaveApprovalPage.jsx 교체용

import React, { useMemo, useState } from 'react';
import {
  Avatar, Card, Dot, Icon, Pill, T, TopBar,
  btnPrimary, btnSecondary, icons,
} from '../../design/primitives';
import useLeaveStore from '../../stores/leaveStore';
import useEmployeeStore from '../../stores/employeeStore';
import useAuthStore from '../../stores/authStore';
import useNotificationStore from '../../stores/notificationStore';
import { sendPushToEmployee } from '../../lib/pushNotify';

const AVATAR_COLORS = ['indigo', 'emerald', 'amber', 'sky', 'rose', 'violet'];
const avatarColor = (id) => {
  const s = (id || '').toString();
  let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
};

const STATUS = {
  pending: { label: '대기', tone: 'warning', dot: T.warning },
  approved: { label: '승인', tone: 'success', dot: T.success },
  rejected: { label: '반려', tone: 'danger', dot: T.danger },
};

const TYPE_TONE = {
  '연차': { bg: T.primarySoft, fg: T.primaryText },
  '반차': { bg: '#FEF3C7', fg: '#92400E' },
  '병가': { bg: '#FEE2E2', fg: '#991B1B' },
  '경조사': { bg: '#F3E8FF', fg: '#6B21A8' },
};

function fmtAgo(iso) {
  if (!iso) return '';
  const m = Math.floor((Date.now() - new Date(iso)) / 60000);
  if (m < 1) return '방금';
  if (m < 60) return `${m}분 전`;
  if (m < 1440) return `${Math.floor(m / 60)}시간 전`;
  return `${Math.floor(m / 1440)}일 전`;
}

function fmtDate(d) {
  if (!d) return '—';
  const date = new Date(d);
  const days = ['일', '월', '화', '수', '목', '금', '토'];
  return `${date.getMonth() + 1}/${date.getDate()} (${days[date.getDay()]})`;
}

export default function LeaveApprovalPage() {
  const currentUser = useAuthStore((s) => s.currentUser);
  const requests = useLeaveStore((s) => s.requests);
  const farmReview = useLeaveStore((s) => s.farmReview);
  const employees = useEmployeeStore((s) => s.employees);
  const addNotification = useNotificationStore((s) => s.addNotification);

  const [processing, setProcessing] = useState(null);
  const [filter, setFilter] = useState('pending');
  const [searchQ, setSearchQ] = useState('');

  const empMap = useMemo(
    () => Object.fromEntries(employees.map((e) => [e.id, e])),
    [employees]
  );

  const counts = useMemo(() => {
    const c = { pending: 0, approved: 0, rejected: 0, all: requests.length };
    requests.forEach((r) => { if (c[r.status] != null) c[r.status]++; });
    return c;
  }, [requests]);

  const filtered = useMemo(() => {
    const q = searchQ.trim();
    return requests
      .filter((r) => filter === 'all' || r.status === filter)
      .filter((r) => !q || (empMap[r.employeeId]?.name || '').includes(q))
      .sort((a, b) => {
        if (a.status === 'pending' && b.status !== 'pending') return -1;
        if (a.status !== 'pending' && b.status === 'pending') return 1;
        return (b.createdAt || '').localeCompare(a.createdAt || '');
      });
  }, [requests, filter, searchQ, empMap]);

  const handleApprove = async (id) => {
    if (processing) return;
    setProcessing(id);
    const req = requests.find((r) => r.id === id);
    const ok = await farmReview(id, true, currentUser.id);
    setProcessing(null);
    if (!ok) {
      addNotification({ type: 'info', title: '승인 실패', message: '처리 중 오류', urgent: false });
      return;
    }
    if (req) sendPushToEmployee({
      employeeId: req.employeeId,
      title: '근태 신청이 승인되었습니다',
      body: `${req.date} ${req.type}${req.reason ? ` · ${req.reason}` : ''}`,
      type: 'leave',
    }).catch(() => {});
  };

  const handleReject = async (id) => {
    if (processing) return;
    setProcessing(id);
    const req = requests.find((r) => r.id === id);
    const ok = await farmReview(id, false, currentUser.id);
    setProcessing(null);
    if (!ok) {
      addNotification({ type: 'info', title: '반려 실패', message: '처리 중 오류', urgent: false });
      return;
    }
    if (req) sendPushToEmployee({
      employeeId: req.employeeId,
      title: '근태 신청이 반려되었습니다',
      body: `${req.date} ${req.type}${req.reason ? ` · ${req.reason}` : ''}`,
      type: 'leave',
    }).catch(() => {});
  };

  return (
    <div style={{ flex: 1, overflow: 'auto', background: T.bg, minWidth: 0 }}>
      <TopBar
        subtitle="근태 관리"
        title="근태 승인"
        actions={
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 12, color: T.mutedSoft }}>실시간 반영</span>
            <Dot c={T.success} />
          </div>
        }
      />

      <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
        {/* KPI */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
          {[
            { l: '대기중', v: counts.pending, tone: T.warning, soft: T.warningSoft, trend: counts.pending > 0 ? '처리 필요' : '없음' },
            { l: '승인됨', v: counts.approved, tone: T.success, soft: T.successSoft, trend: '완료' },
            { l: '반려됨', v: counts.rejected, tone: T.danger, soft: T.dangerSoft, trend: '완료' },
            { l: '전체 신청', v: counts.all, tone: T.primary, soft: T.primarySoft, trend: '누적' },
          ].map((k, i) => (
            <Card key={i} pad={18} style={{ position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: k.tone }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14 }}>
                <span style={{ fontSize: 12, color: T.muted, fontWeight: 600 }}>{k.l}</span>
                <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 6px', background: k.soft, color: k.tone, borderRadius: 4 }}>{k.trend}</span>
              </div>
              <div style={{ fontSize: 36, fontWeight: 700, color: T.text, letterSpacing: -1, lineHeight: 1 }}>{k.v}</div>
              <div style={{ fontSize: 11, color: T.mutedSoft, marginTop: 8 }}>건</div>
            </Card>
          ))}
        </div>

        {/* 필터 */}
        <Card pad={0}>
          <div style={{ padding: '14px 18px', borderBottom: `1px solid ${T.borderSoft}`, display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ display: 'flex', gap: 4, background: T.bg, padding: 3, borderRadius: 7 }}>
              {[
                { v: 'pending', l: '대기', n: counts.pending },
                { v: 'approved', l: '승인', n: counts.approved },
                { v: 'rejected', l: '반려', n: counts.rejected },
                { v: 'all', l: '전체', n: counts.all },
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
                    {t.n > 0 && <span style={{ fontSize: 10, fontWeight: 700, padding: '0 5px', borderRadius: 3, background: on ? T.bg : 'transparent', color: on ? T.muted : T.mutedSoft }}>{t.n}</span>}
                  </span>
                );
              })}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 10px', background: T.bg, border: `1px solid ${T.border}`, borderRadius: 7, flex: 1, maxWidth: 280, marginLeft: 'auto', fontSize: 13, color: T.mutedSoft }}>
              <Icon d={icons.search} size={14} />
              <input value={searchQ} onChange={(e) => setSearchQ(e.target.value)}
                placeholder="작업자명 검색"
                style={{ border: 0, background: 'transparent', outline: 'none', flex: 1, fontSize: 13, color: T.text }} />
            </div>
          </div>

          {/* 리스트 */}
          {filtered.length === 0 ? (
            <div style={{ padding: 60, textAlign: 'center', color: T.mutedSoft, fontSize: 13 }}>
              {filter === 'pending' ? '처리할 근태 신청이 없습니다' : '내역이 없습니다'}
            </div>
          ) : (
            <div>
              {filtered.map((req, i) => {
                const emp = empMap[req.employeeId];
                const st = STATUS[req.status] || STATUS.pending;
                const tt = TYPE_TONE[req.type] || { bg: T.bg, fg: T.muted };
                const isPending = req.status === 'pending';
                return (
                  <div key={req.id} style={{
                    padding: '16px 20px',
                    borderBottom: i < filtered.length - 1 ? `1px solid ${T.borderSoft}` : 'none',
                    background: isPending ? 'linear-gradient(to right, rgba(245,158,11,0.04), transparent 30%)' : T.surface,
                    display: 'flex', alignItems: 'center', gap: 14,
                  }}>
                    <Avatar name={emp?.name || '?'} color={avatarColor(req.employeeId)} size={40} />

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 14, fontWeight: 700, color: T.text }}>{emp?.name || '—'}</span>
                        <span style={{ fontSize: 11, color: T.mutedSoft }}>{emp?.jobType || ''}</span>
                        <span style={{
                          fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 4,
                          background: tt.bg, color: tt.fg,
                        }}>{req.type}</span>
                      </div>
                      <div style={{ display: 'flex', gap: 14, fontSize: 12, color: T.muted, alignItems: 'center', flexWrap: 'wrap' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontWeight: 600, color: T.text }}>
                          <Icon d={icons.calendar} size={12} />
                          {fmtDate(req.date)}
                        </span>
                        {req.reason && (
                          <span style={{ color: T.muted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 320 }}>
                            “{req.reason}”
                          </span>
                        )}
                        <span style={{ color: T.mutedSoft, fontSize: 11, marginLeft: 'auto' }}>{fmtAgo(req.createdAt)}</span>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                      <Pill tone={st.tone}><Dot c={st.dot} />{st.label}</Pill>
                      {isPending ? (
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button onClick={() => handleReject(req.id)} disabled={processing === req.id}
                            style={{
                              height: 34, padding: '0 14px', borderRadius: 7,
                              border: `1px solid ${T.border}`, background: T.surface,
                              color: T.danger, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                            }}>반려</button>
                          <button onClick={() => handleApprove(req.id)} disabled={processing === req.id}
                            style={{
                              height: 34, padding: '0 16px', borderRadius: 7, border: 0,
                              background: T.success, color: '#fff',
                              fontSize: 12, fontWeight: 700, cursor: 'pointer',
                              boxShadow: '0 1px 2px rgba(16,185,129,0.25)',
                              display: 'inline-flex', alignItems: 'center', gap: 6,
                            }}>
                            <Icon d={icons.check} size={12} c="#fff" sw={2.5} />
                            {processing === req.id ? '처리 중...' : '승인'}
                          </button>
                        </div>
                      ) : (
                        <span style={{ fontSize: 11, color: T.mutedSoft, width: 140, textAlign: 'right' }}>처리 완료</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
