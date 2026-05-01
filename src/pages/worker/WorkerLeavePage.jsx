// 작업자 근태 신청 — /worker/leave
// 트랙 77 U3: T_worker 토큰 적용 (관리자 격리)
// 트랙 77 U7 (Q20): "휴가 신청" → "근태 신청" 명칭 변경
import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Icon, Pill, T_worker as T, icons } from '../../design/primitives';
import useLeaveStore from '../../stores/leaveStore';
import useAuthStore from '../../stores/authStore';

const TYPES = [
  { v: 'annual', l: '연차' },
  { v: 'sick', l: '병가' },
  { v: 'personal', l: '개인' },
  { v: 'family', l: '경조사' },
];

const STATUS = {
  pending: { l: '대기', tone: 'warning' },
  approved: { l: '승인', tone: 'success' },
  rejected: { l: '반려', tone: 'danger' },
};

export default function WorkerLeavePage() {
  const navigate = useNavigate();
  const requests = useLeaveStore((s) => s.requests);
  const addRequest = useLeaveStore((s) => s.addRequest);
  const user = useAuthStore((s) => s.user);

  const [draft, setDraft] = useState({ type: 'annual', date: '', days: 1, reason: '' });
  const [showForm, setShowForm] = useState(false);

  const mine = useMemo(() => (requests || []).filter((r) => r.employeeId === user?.id)
    .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || '')), [requests, user]);

  const handleSubmit = () => {
    if (!draft.date || !draft.reason.trim()) return;
    addRequest?.({
      id: 'leave_' + Date.now(), employeeId: user?.id, employeeName: user?.name,
      ...draft, status: 'pending', createdAt: new Date().toISOString(),
    });
    setDraft({ type: 'annual', date: '', days: 1, reason: '' });
    setShowForm(false);
  };

  return (
    <div style={{ minHeight: '100vh', background: T.bg, paddingBottom: 24 }}>
      <div style={{ position: 'sticky', top: 0, zIndex: 10, background: T.surface, borderBottom: `1px solid ${T.border}`, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={() => navigate(-1)} style={{ width: 34, height: 34, borderRadius: 8, border: `1px solid ${T.border}`, background: T.surface, cursor: 'pointer', color: T.muted, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon d={<polyline points="15 18 9 12 15 6" />} size={14} sw={2} />
        </button>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: T.mutedSoft, letterSpacing: 0.5 }}>근태</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: T.text }}>근태 신청</div>
        </div>
        <button onClick={() => setShowForm(true)} style={{ height: 32, padding: '0 12px', borderRadius: 7, border: 0, background: T.text, color: T.surface, fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
          <Icon d={icons.plus} size={11} sw={2.4} />신청
        </button>
      </div>

      <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
        {mine.length === 0 ? (
          <Card pad={40} style={{ textAlign: 'center', color: T.mutedSoft, fontSize: 13 }}>신청 내역이 없습니다</Card>
        ) : mine.map((r) => {
          const st = STATUS[r.status] || STATUS.pending;
          const tp = TYPES.find((t) => t.v === r.type);
          return (
            <Card key={r.id} pad={14}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <Pill tone="info">{tp?.l}</Pill>
                <Pill tone={st.tone}>{st.l}</Pill>
                <span style={{ marginLeft: 'auto', fontSize: 11, color: T.mutedSoft, fontFamily: 'ui-monospace,monospace' }}>{r.date} · {r.days}일</span>
              </div>
              <div style={{ fontSize: 13, color: T.muted, lineHeight: 1.5 }}>{r.reason}</div>
              {r.rejectReason && (
                <div style={{ marginTop: 10, padding: '8px 10px', background: T.dangerSoft, borderRadius: 6, fontSize: 11, color: T.danger }}>
                  반려 사유: {r.rejectReason}
                </div>
              )}
            </Card>
          );
        })}
      </div>

      {showForm && (
        <div onClick={() => setShowForm(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.55)', display: 'flex', alignItems: 'flex-end', zIndex: 50 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: T.surface, width: '100%', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20 }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: T.text, marginBottom: 14 }}>휴가 신청</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ fontSize: 11, color: T.muted, fontWeight: 600, display: 'block', marginBottom: 6 }}>유형</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
                  {TYPES.map((t) => {
                    const on = draft.type === t.v;
                    return <button key={t.v} onClick={() => setDraft({ ...draft, type: t.v })} style={{ height: 36, borderRadius: 7, border: on ? `2px solid ${T.primary}` : `1px solid ${T.border}`, background: on ? T.primarySoft : T.surface, color: on ? T.primary : T.muted, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>{t.l}</button>;
                  })}
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 8 }}>
                <div>
                  <label style={{ fontSize: 11, color: T.muted, fontWeight: 600, display: 'block', marginBottom: 6 }}>시작일</label>
                  <input type="date" value={draft.date} onChange={(e) => setDraft({ ...draft, date: e.target.value })}
                    style={{ width: '100%', height: 38, padding: '0 12px', border: `1px solid ${T.border}`, borderRadius: 7, fontSize: 13 }} />
                </div>
                <div>
                  <label style={{ fontSize: 11, color: T.muted, fontWeight: 600, display: 'block', marginBottom: 6 }}>일수</label>
                  <input type="number" min="1" value={draft.days} onChange={(e) => setDraft({ ...draft, days: parseInt(e.target.value) || 1 })}
                    style={{ width: '100%', height: 38, padding: '0 12px', border: `1px solid ${T.border}`, borderRadius: 7, fontSize: 13, fontFamily: 'ui-monospace,monospace' }} />
                </div>
              </div>
              <div>
                <label style={{ fontSize: 11, color: T.muted, fontWeight: 600, display: 'block', marginBottom: 6 }}>사유</label>
                <textarea value={draft.reason} onChange={(e) => setDraft({ ...draft, reason: e.target.value })} placeholder="사유를 입력하세요" rows={3}
                  style={{ width: '100%', padding: 10, border: `1px solid ${T.border}`, borderRadius: 7, fontSize: 13, fontFamily: 'inherit', resize: 'vertical' }} />
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                <button onClick={() => setShowForm(false)} style={{ flex: 1, height: 42, borderRadius: 8, border: `1px solid ${T.border}`, background: T.surface, color: T.muted, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>취소</button>
                <button onClick={handleSubmit} style={{ flex: 1, height: 42, borderRadius: 8, border: 0, background: T.text, color: T.surface, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>신청</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
