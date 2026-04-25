// 작업자 공지 확인 — /worker/notice
import React, { useMemo, useState } from 'react';
import { Avatar, Card, Icon, Pill, T, icons } from '../../design/primitives';
import useNoticeStore from '../../stores/noticeStore';
import useAuthStore from '../../stores/authStore';

const fmtAgo = (iso) => {
  if (!iso) return '';
  const m = Math.floor((Date.now() - new Date(iso)) / 60000);
  if (m < 60) return `${m}분 전`;
  if (m < 1440) return `${Math.floor(m / 60)}시간 전`;
  return `${Math.floor(m / 1440)}일 전`;
};

export default function WorkerNoticePage({ onBack }) {
  const notices = useNoticeStore((s) => s.notices);
  const markRead = useNoticeStore((s) => s.markRead);
  const user = useAuthStore((s) => s.user);

  const [open, setOpen] = useState(null);

  const sorted = useMemo(() => [...(notices || [])].sort((a, b) => {
    if (a.pinned !== b.pinned) return b.pinned ? 1 : -1;
    return (b.createdAt || '').localeCompare(a.createdAt || '');
  }), [notices]);

  const unread = sorted.filter((n) => !(n.readBy || []).includes(user?.id)).length;

  return (
    <div style={{ minHeight: '100vh', background: T.bg, paddingBottom: 24 }}>
      <div style={{ position: 'sticky', top: 0, zIndex: 10, background: T.surface, borderBottom: `1px solid ${T.border}`, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={onBack} style={{ width: 34, height: 34, borderRadius: 8, border: `1px solid ${T.border}`, background: T.surface, cursor: 'pointer', color: T.muted, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon d={<polyline points="15 18 9 12 15 6" />} size={14} sw={2} />
        </button>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: T.mutedSoft, letterSpacing: 0.5 }}>공지</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: T.text }}>공지사항</div>
        </div>
        {unread > 0 && <Pill tone="danger">{unread} 읽지 않음</Pill>}
      </div>

      <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
        {sorted.length === 0 ? (
          <Card pad={40} style={{ textAlign: 'center', color: T.mutedSoft, fontSize: 13 }}>공지사항이 없습니다</Card>
        ) : sorted.map((n) => {
          const read = (n.readBy || []).includes(user?.id);
          return (
            <Card key={n.id} pad={0} onClick={() => { setOpen(n); if (!read) markRead?.(n.id, user?.id); }}
              style={{ cursor: 'pointer', overflow: 'hidden', borderLeft: !read ? `3px solid ${T.primary}` : `1px solid ${T.border}` }}>
              <div style={{ padding: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
                  {n.pinned && <Pill tone="warning">고정</Pill>}
                  {n.important && <Pill tone="danger">중요</Pill>}
                  {!read && <Pill tone="primary">N</Pill>}
                  <span style={{ fontSize: 11, color: T.mutedSoft, marginLeft: 'auto' }}>{fmtAgo(n.createdAt)}</span>
                </div>
                <div style={{ fontSize: 14, fontWeight: 700, color: T.text, marginBottom: 4 }}>{n.title}</div>
                <div style={{ fontSize: 12, color: T.muted, lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{n.body}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 10, fontSize: 10, color: T.mutedSoft }}>
                  <Avatar name={n.authorName || '관리자'} color="indigo" size={18} />
                  <span>{n.authorName || '관리자'}</span>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {open && (
        <div onClick={() => setOpen(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.55)', display: 'flex', alignItems: 'flex-end', zIndex: 50 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: T.surface, width: '100%', maxHeight: '85vh', borderTopLeftRadius: 20, borderTopRightRadius: 20, display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '16px 20px', borderBottom: `1px solid ${T.border}`, display: 'flex', alignItems: 'center' }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', gap: 6, marginBottom: 4 }}>
                  {open.pinned && <Pill tone="warning">고정</Pill>}
                  {open.important && <Pill tone="danger">중요</Pill>}
                </div>
                <div style={{ fontSize: 16, fontWeight: 700, color: T.text }}>{open.title}</div>
              </div>
              <button onClick={() => setOpen(null)} style={{ width: 30, height: 30, borderRadius: 6, border: 0, background: T.bg, color: T.muted, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon d={icons.x} size={14} sw={2} />
              </button>
            </div>
            <div style={{ padding: 20, overflow: 'auto', fontSize: 13, color: T.text, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
              {open.body}
              <div style={{ marginTop: 20, paddingTop: 14, borderTop: `1px solid ${T.borderSoft}`, display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, color: T.mutedSoft }}>
                <Avatar name={open.authorName || '관리자'} color="indigo" size={24} />
                <span>{open.authorName || '관리자'}</span>
                <span>·</span>
                <span>{fmtAgo(open.createdAt)}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
