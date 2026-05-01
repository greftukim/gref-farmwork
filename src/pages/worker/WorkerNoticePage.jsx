// 작업자 공지 확인 — /worker/notices
// 트랙 77 U4: 시안 v2 ScreenNotice 적용
//   - T_worker 토큰
//   - localStorage 기반 읽음 추적 (G77-F)
//   - currentUser 사용 (기존 latent bug fix: user → currentUser)
import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Avatar, Card, Icon, Pill, T_worker as T, icons } from '../../design/primitives';
import useNoticeStore from '../../stores/noticeStore';
import useAuthStore from '../../stores/authStore';
import { getReadIds, markReadLocal } from '../../lib/noticeRead';

const fmtAgo = (iso) => {
  if (!iso) return '';
  const m = Math.floor((Date.now() - new Date(iso)) / 60000);
  if (m < 60) return `${m}분 전`;
  if (m < 1440) return `${Math.floor(m / 60)}시간 전`;
  return `${Math.floor(m / 1440)}일 전`;
};

export default function WorkerNoticePage() {
  const navigate = useNavigate();
  const notices = useNoticeStore((s) => s.notices);
  const markReadStore = useNoticeStore((s) => s.markRead);
  const currentUser = useAuthStore((s) => s.currentUser);
  const userId = currentUser?.id;

  const [open, setOpen] = useState(null);
  // localStorage seen IDs는 force re-render이 필요한 변경 트리거. tick 카운터로 대체.
  const [tick, setTick] = useState(0);

  const sorted = useMemo(() => [...(notices || [])].sort((a, b) => {
    if (a.pinned !== b.pinned) return b.pinned ? 1 : -1;
    return (b.createdAt || '').localeCompare(a.createdAt || '');
  }), [notices]);

  const readIds = useMemo(() => getReadIds(userId), [userId, tick]);
  const unread = sorted.filter((n) => !readIds.has(n.id)).length;

  const handleOpen = (n) => {
    setOpen(n);
    if (!readIds.has(n.id)) {
      markReadLocal(n.id, userId);
      markReadStore?.(n.id, userId); // 세션 메모리 sync (기존 store 호환)
      setTick((t) => t + 1);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: T.bg, paddingBottom: 80 }}>
      <div style={{
        position: 'sticky', top: 0, zIndex: 10,
        background: T.surface, borderBottom: `1px solid ${T.border}`,
        padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10,
      }}>
        <button onClick={() => navigate(-1)} style={{
          width: 36, height: 36, borderRadius: 10, border: `1px solid ${T.border}`,
          background: T.bg, color: T.muted, cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon d={<polyline points="15 18 9 12 15 6" />} size={14} sw={2.2} />
        </button>
        <h1 style={{ fontSize: 15, fontWeight: 700, color: T.text, margin: 0, flex: 1 }}>공지사항</h1>
        {unread > 0 && (
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 4,
            fontSize: 11, color: T.danger, fontWeight: 700,
          }}>
            <span style={{ width: 6, height: 6, borderRadius: 999, background: T.danger }} />
            미확인 {unread}
          </span>
        )}
      </div>

      <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
        {sorted.length === 0 ? (
          <Card pad={32} style={{ textAlign: 'center' }}>
            <div style={{
              width: 48, height: 48, borderRadius: 12, background: T.bg,
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 10,
            }}>
              <Icon d={icons.bell} size={20} c={T.mutedSoft} />
            </div>
            <div style={{ fontSize: 13, fontWeight: 600, color: T.muted }}>새 공지가 없어요</div>
          </Card>
        ) : sorted.map((n) => {
          const read = readIds.has(n.id);
          const isUrgent = n.priority === 'urgent' || n.important;
          const isImportant = n.priority === 'important' || n.pinned;
          return (
            <Card
              key={n.id}
              pad={14}
              style={{
                cursor: 'pointer',
                borderLeft: !read && (isUrgent || isImportant)
                  ? `3px solid ${isUrgent ? T.danger : T.primary}`
                  : !read
                    ? `3px solid ${T.primary}`
                    : `1px solid ${T.border}`,
                opacity: read ? 0.78 : 1,
              }}
              onClick={() => handleOpen(n)}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6, flexWrap: 'wrap' }}>
                {isUrgent && <Pill tone="danger" size="sm">긴급</Pill>}
                {isImportant && !isUrgent && <Pill tone="warning" size="sm">중요</Pill>}
                {!isUrgent && !isImportant && <Pill tone={read ? 'muted' : 'primary'} size="sm">공지</Pill>}
                {!read && (
                  <span style={{
                    fontSize: 9, fontWeight: 800, padding: '2px 6px', borderRadius: 999,
                    background: T.danger, color: '#fff', letterSpacing: 0.3,
                  }}>NEW</span>
                )}
                <span style={{ marginLeft: 'auto', fontSize: 11, color: T.mutedSoft }}>{fmtAgo(n.createdAt)}</span>
              </div>
              <div style={{
                fontSize: 14, fontWeight: read ? 600 : 700, color: read ? T.muted : T.text, marginBottom: 4,
              }}>{n.title}</div>
              {n.body && (
                <div style={{
                  fontSize: 12, color: T.mutedSoft, lineHeight: 1.5,
                  display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                }}>{n.body}</div>
              )}
            </Card>
          );
        })}
      </div>

      {/* 상세 모달 */}
      {open && (
        <div onClick={() => setOpen(null)} style={{
          position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.55)',
          display: 'flex', alignItems: 'flex-end', zIndex: 50,
        }}>
          <div onClick={(e) => e.stopPropagation()} style={{
            background: T.surface, width: '100%', maxHeight: '85vh',
            borderTopLeftRadius: 20, borderTopRightRadius: 20,
            display: 'flex', flexDirection: 'column',
          }}>
            <div style={{ padding: '16px 20px', borderBottom: `1px solid ${T.borderSoft}`, display: 'flex', alignItems: 'flex-start', gap: 10 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', gap: 6, marginBottom: 4 }}>
                  {(open.priority === 'urgent' || open.important) && <Pill tone="danger" size="sm">긴급</Pill>}
                  {(open.priority === 'important' || open.pinned) && open.priority !== 'urgent' && !open.important && <Pill tone="warning" size="sm">중요</Pill>}
                </div>
                <div style={{ fontSize: 16, fontWeight: 700, color: T.text }}>{open.title}</div>
              </div>
              <button onClick={() => setOpen(null)} style={{
                width: 32, height: 32, borderRadius: 16, border: 0, background: T.borderSoft, color: T.muted, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>
                <Icon d={icons.x} size={14} sw={2.4} />
              </button>
            </div>
            <div style={{ padding: 20, overflow: 'auto', fontSize: 13, color: T.text, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
              {open.body}
              <div style={{ marginTop: 20, paddingTop: 14, borderTop: `1px solid ${T.borderSoft}`, display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, color: T.mutedSoft }}>
                <Avatar name={open.authorName || '관'} size={24} />
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
