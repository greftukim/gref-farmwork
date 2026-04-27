// 공지사항 관리 — 프로 SaaS 리디자인
// 기존: src/pages/admin/NoticePage.jsx 교체용

import React, { useMemo, useState } from 'react';
import {
  Avatar, Card, Dot, Icon, Pill, T, TopBar, btnPrimary, btnSecondary, icons,
} from '../../design/primitives';
import useNoticeStore from '../../stores/noticeStore';
import useAuthStore from '../../stores/authStore';

const PRIORITY = {
  urgent: { l: '긴급', tone: 'danger', fg: T.danger, soft: T.dangerSoft },
  important: { l: '중요', tone: 'warning', fg: T.warning, soft: T.warningSoft },
  normal: { l: '일반', tone: 'muted', fg: T.muted, soft: '#F1F5F9' },
};

const fmtDate = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const fmtAgo = (iso) => {
  if (!iso) return '';
  const m = Math.floor((Date.now() - new Date(iso)) / 60000);
  if (m < 60) return `${m}분 전`;
  if (m < 1440) return `${Math.floor(m / 60)}시간 전`;
  if (m < 10080) return `${Math.floor(m / 1440)}일 전`;
  return fmtDate(iso);
};

export default function NoticePage() {
  const currentUser = useAuthStore((s) => s.currentUser);
  const notices = useNoticeStore((s) => s.notices);
  const addNotice = useNoticeStore((s) => s.addNotice);
  const updateNotice = useNoticeStore((s) => s.updateNotice);
  const deleteNotice = useNoticeStore((s) => s.deleteNotice);

  const [editing, setEditing] = useState(null); // null | 'new' | id
  const [form, setForm] = useState({ title: '', body: '', priority: 'normal' });
  const [filter, setFilter] = useState('all');
  const [searchQ, setSearchQ] = useState('');

  const filtered = useMemo(() => {
    const q = searchQ.trim();
    return [...notices]
      .filter((n) => filter === 'all' || n.priority === filter)
      .filter((n) => !q || n.title.includes(q) || (n.body || '').includes(q))
      .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
  }, [notices, filter, searchQ]);

  const counts = useMemo(() => {
    const c = { all: notices.length, urgent: 0, important: 0, normal: 0 };
    notices.forEach((n) => { if (c[n.priority] != null) c[n.priority]++; });
    return c;
  }, [notices]);

  const startNew = () => {
    setForm({ title: '', body: '', priority: 'normal' });
    setEditing('new');
  };
  const startEdit = (n) => {
    setForm({ title: n.title, body: n.body || '', priority: n.priority || 'normal' });
    setEditing(n.id);
  };
  const cancel = () => {
    setEditing(null);
    setForm({ title: '', body: '', priority: 'normal' });
  };
  const save = async () => {
    if (!form.title.trim()) return alert('제목을 입력해 주세요');
    if (editing === 'new') {
      await addNotice({ ...form, authorId: currentUser?.id, createdAt: new Date().toISOString() });
    } else {
      await updateNotice(editing, form);
    }
    cancel();
  };
  const remove = async (id) => {
    if (!window.confirm('이 공지를 삭제하시겠습니까?')) return;
    await deleteNotice(id);
  };

  return (
    <div style={{ flex: 1, overflow: 'auto', background: T.bg, minWidth: 0 }}>
      <TopBar
        subtitle="공지사항"
        title="공지사항 관리"
        actions={
          <button onClick={startNew} style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            height: 36, padding: '0 14px', borderRadius: 8,
            background: T.primary, color: '#fff', border: 0,
            fontSize: 13, fontWeight: 600, cursor: 'pointer',
            boxShadow: '0 1px 2px rgba(79,70,229,0.25)',
          }}>
            <Icon d={icons.plus} size={14} c="#fff" sw={2.2} />
            새 공지 작성
          </button>
        }
      />

      <div style={{ padding: 24, display: 'grid', gridTemplateColumns: editing ? '1fr 400px' : '1fr', gap: 20, alignItems: 'start' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20, minWidth: 0 }}>
          {/* KPI */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
            {[
              { l: '전체 공지', v: counts.all, tone: T.primary, soft: T.primarySoft },
              { l: '긴급', v: counts.urgent, tone: T.danger, soft: T.dangerSoft },
              { l: '중요', v: counts.important, tone: T.warning, soft: T.warningSoft },
              { l: '일반', v: counts.normal, tone: T.muted, soft: '#F1F5F9' },
            ].map((k, i) => (
              <Card key={i} pad={18} style={{ position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: k.tone }} />
                <div style={{ fontSize: 12, color: T.muted, fontWeight: 600, marginBottom: 14 }}>{k.l}</div>
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
                  { v: 'all', l: '전체', n: counts.all },
                  { v: 'urgent', l: '긴급', n: counts.urgent },
                  { v: 'important', l: '중요', n: counts.important },
                  { v: 'normal', l: '일반', n: counts.normal },
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
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 10px', background: T.bg, border: `1px solid ${T.border}`, borderRadius: 7, flex: 1, maxWidth: 280, marginLeft: 'auto' }}>
                <Icon d={icons.search} size={14} c={T.mutedSoft} />
                <input value={searchQ} onChange={(e) => setSearchQ(e.target.value)}
                  placeholder="제목·내용 검색"
                  style={{ border: 0, background: 'transparent', outline: 'none', flex: 1, fontSize: 13, color: T.text }} />
              </div>
            </div>

            {filtered.length === 0 ? (
              <div style={{ padding: 60, textAlign: 'center', color: T.mutedSoft, fontSize: 13 }}>공지가 없습니다</div>
            ) : (
              <div>
                {filtered.map((n, i) => {
                  const p = PRIORITY[n.priority] || PRIORITY.normal;
                  const isEditing = editing === n.id;
                  return (
                    <div key={n.id} style={{
                      padding: '16px 20px',
                      borderBottom: i < filtered.length - 1 ? `1px solid ${T.borderSoft}` : 'none',
                      background: isEditing ? T.primarySoft : T.surface,
                      borderLeft: n.priority === 'urgent' ? `3px solid ${T.danger}` :
                                  n.priority === 'important' ? `3px solid ${T.warning}` : '3px solid transparent',
                      display: 'flex', alignItems: 'flex-start', gap: 14,
                    }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
                          <span style={{
                            fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 4,
                            background: p.soft, color: p.fg,
                          }}>{p.l}</span>
                          <h3 style={{ fontSize: 14, fontWeight: 700, color: T.text, margin: 0 }}>{n.title}</h3>
                        </div>
                        {n.body && (
                          <p style={{
                            fontSize: 13, color: T.muted, margin: '0 0 8px 0',
                            lineHeight: 1.5,
                            display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                            overflow: 'hidden',
                          }}>{n.body}</p>
                        )}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 11, color: T.mutedSoft }}>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                            <Icon d={icons.clock} size={11} c={T.mutedSoft} />
                            {fmtAgo(n.createdAt)}
                          </span>
                          {n.authorName && <span>· {n.authorName}</span>}
                          {n.updatedAt && n.updatedAt !== n.createdAt && <span>· 수정됨</span>}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                        <button onClick={() => startEdit(n)} style={{
                          height: 30, padding: '0 10px', borderRadius: 6,
                          border: `1px solid ${T.border}`, background: T.surface,
                          color: T.muted, fontSize: 11, fontWeight: 600, cursor: 'pointer',
                        }}>수정</button>
                        <button onClick={() => remove(n.id)} style={{
                          height: 30, padding: '0 10px', borderRadius: 6,
                          border: `1px solid ${T.border}`, background: T.surface,
                          color: T.danger, fontSize: 11, fontWeight: 600, cursor: 'pointer',
                        }}>삭제</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </div>

        {/* 편집 패널 */}
        {editing && (
          <Card style={{ position: 'sticky', top: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: T.text, margin: 0 }}>
                {editing === 'new' ? '새 공지 작성' : '공지 수정'}
              </h3>
              <button onClick={cancel} style={{
                width: 28, height: 28, borderRadius: 6, border: 0, background: 'transparent',
                color: T.mutedSoft, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Icon d={icons.x} size={14} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: T.muted, display: 'block', marginBottom: 6 }}>우선순위</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
                  {['normal', 'important', 'urgent'].map((p) => {
                    const cfg = PRIORITY[p];
                    const on = form.priority === p;
                    return (
                      <button key={p} onClick={() => setForm({ ...form, priority: p })}
                        style={{
                          height: 36, padding: '0 10px', borderRadius: 7,
                          border: on ? `1.5px solid ${cfg.fg}` : `1px solid ${T.border}`,
                          background: on ? cfg.soft : T.surface,
                          color: on ? cfg.fg : T.muted,
                          fontSize: 12, fontWeight: 700, cursor: 'pointer',
                        }}>{cfg.l}</button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: T.muted, display: 'block', marginBottom: 6 }}>제목</label>
                <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="공지 제목"
                  style={{
                    width: '100%', height: 38, padding: '0 12px',
                    border: `1px solid ${T.border}`, borderRadius: 7, fontSize: 13, color: T.text,
                  }} />
              </div>

              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: T.muted, display: 'block', marginBottom: 6 }}>내용</label>
                <textarea value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })}
                  placeholder="공지 내용"
                  rows={8}
                  style={{
                    width: '100%', padding: 12,
                    border: `1px solid ${T.border}`, borderRadius: 7, fontSize: 13, color: T.text,
                    resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.5,
                  }} />
              </div>

              <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                <button onClick={cancel} style={{
                  flex: 1, height: 40, borderRadius: 8,
                  border: `1px solid ${T.border}`, background: T.surface, color: T.muted,
                  fontSize: 13, fontWeight: 600, cursor: 'pointer',
                }}>취소</button>
                <button onClick={save} style={{
                  flex: 2, height: 40, borderRadius: 8, border: 0,
                  background: T.primary, color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer',
                }}>{editing === 'new' ? '게시' : '저장'}</button>
              </div>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
