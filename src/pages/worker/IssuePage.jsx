// 작업자 이상 신고 — /worker/issue
import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Icon, Pill, T, icons } from '../../design/primitives';
import useIssueStore from '../../stores/issueStore';
import useAuthStore from '../../stores/authStore';

const CATEGORIES = ['시설', '작물', '장비', '안전', '기타'];

const STATUS = {
  pending: { l: '미처리', tone: 'warning' },
  in_progress: { l: '처리중', tone: 'info' },
  resolved: { l: '완료', tone: 'success' },
};

const fmtAgo = (iso) => {
  if (!iso) return '';
  const m = Math.floor((Date.now() - new Date(iso)) / 60000);
  if (m < 60) return `${m}분 전`;
  if (m < 1440) return `${Math.floor(m / 60)}시간 전`;
  return `${Math.floor(m / 1440)}일 전`;
};

export default function IssuePage() {
  const navigate = useNavigate();
  const issues = useIssueStore((s) => s.issues);
  const addIssue = useIssueStore((s) => s.addIssue);
  const user = useAuthStore((s) => s.user);

  const [draft, setDraft] = useState({ category: '시설', severity: 'normal', description: '', location: '' });

  const mine = useMemo(() => (issues || []).filter((i) => i.employeeId === user?.id)
    .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || '')), [issues, user]);

  const handleSubmit = () => {
    if (!draft.description.trim()) return;
    addIssue?.({
      id: 'iss_' + Date.now(), employeeId: user?.id,
      ...draft, description: draft.description.trim(),
      status: 'pending', createdAt: new Date().toISOString(),
    });
    setDraft({ category: '시설', severity: 'normal', description: '', location: '' });
  };

  return (
    <div style={{ minHeight: '100vh', background: T.bg, paddingBottom: 24 }}>
      <div style={{ position: 'sticky', top: 0, zIndex: 10, background: T.surface, borderBottom: `1px solid ${T.border}`, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={() => navigate(-1)} style={{ width: 34, height: 34, borderRadius: 8, border: `1px solid ${T.border}`, background: T.surface, cursor: 'pointer', color: T.muted, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon d={<polyline points="15 18 9 12 15 6" />} size={14} sw={2} />
        </button>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: T.mutedSoft, letterSpacing: 0.5 }}>안전</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: T.text }}>이상 신고</div>
        </div>
      </div>

      <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 16 }}>
        <Card pad={16}>
          <div style={{ fontSize: 13, fontWeight: 700, color: T.text, marginBottom: 12 }}>신고하기</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <label style={{ fontSize: 11, color: T.muted, fontWeight: 600, display: 'block', marginBottom: 6 }}>분류</label>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {CATEGORIES.map((c) => {
                  const on = draft.category === c;
                  return <button key={c} onClick={() => setDraft({ ...draft, category: c })} style={{ height: 30, padding: '0 12px', borderRadius: 15, border: on ? `1.5px solid ${T.primary}` : `1px solid ${T.border}`, background: on ? T.primarySoft : T.surface, color: on ? T.primary : T.muted, fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>{c}</button>;
                })}
              </div>
            </div>
            <div>
              <label style={{ fontSize: 11, color: T.muted, fontWeight: 600, display: 'block', marginBottom: 6 }}>긴급도</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
                {[['normal', '보통', T.info], ['high', '높음', T.warning], ['critical', '긴급', T.danger]].map(([v, l, c]) => {
                  const on = draft.severity === v;
                  return <button key={v} onClick={() => setDraft({ ...draft, severity: v })} style={{ height: 36, borderRadius: 7, border: on ? `2px solid ${c}` : `1px solid ${T.border}`, background: on ? c + '18' : T.surface, color: on ? c : T.muted, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>{l}</button>;
                })}
              </div>
            </div>
            <div>
              <label style={{ fontSize: 11, color: T.muted, fontWeight: 600, display: 'block', marginBottom: 6 }}>위치(선택)</label>
              <input value={draft.location} onChange={(e) => setDraft({ ...draft, location: e.target.value })} placeholder="예: A동 3번 라인"
                style={{ width: '100%', height: 38, padding: '0 12px', border: `1px solid ${T.border}`, borderRadius: 7, fontSize: 13 }} />
            </div>
            <div>
              <label style={{ fontSize: 11, color: T.muted, fontWeight: 600, display: 'block', marginBottom: 6 }}>내용</label>
              <textarea value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} placeholder="발생한 상황을 구체적으로 기술해 주세요" rows={4}
                style={{ width: '100%', padding: 10, border: `1px solid ${T.border}`, borderRadius: 7, fontSize: 13, fontFamily: 'inherit', resize: 'vertical' }} />
            </div>
            <button onClick={handleSubmit} style={{ height: 44, borderRadius: 8, border: 0, background: T.danger, color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
              신고 제출
            </button>
          </div>
        </Card>

        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: T.mutedSoft, letterSpacing: 0.4, padding: '0 4px', marginBottom: 8 }}>내 신고 내역 ({mine.length})</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {mine.length === 0 ? (
              <Card pad={30} style={{ textAlign: 'center', color: T.mutedSoft, fontSize: 12 }}>신고 내역이 없습니다</Card>
            ) : mine.map((it) => {
              const st = STATUS[it.status] || STATUS.pending;
              return (
                <Card key={it.id} pad={14}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6, flexWrap: 'wrap' }}>
                    <Pill tone="info">{it.category}</Pill>
                    {it.severity === 'critical' && <Pill tone="danger">긴급</Pill>}
                    {it.severity === 'high' && <Pill tone="warning">높음</Pill>}
                    <Pill tone={st.tone}>{st.l}</Pill>
                    <span style={{ marginLeft: 'auto', fontSize: 11, color: T.mutedSoft }}>{fmtAgo(it.createdAt)}</span>
                  </div>
                  <div style={{ fontSize: 13, color: T.muted, lineHeight: 1.5 }}>{it.description}</div>
                  {it.location && <div style={{ fontSize: 11, color: T.mutedSoft, marginTop: 6, display: 'inline-flex', alignItems: 'center', gap: 4 }}><Icon d={icons.location} size={11} c={T.mutedSoft} sw={2} />{it.location}</div>}
                </Card>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
