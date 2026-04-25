import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { snakeToCamel } from '../lib/dbHelpers';

const useNoticeStore = create((set) => ({
  notices: [],
  loading: false,

  fetchNotices: async () => {
    set({ loading: true });
    const { data } = await supabase.from('notices').select('*').order('created_at', { ascending: false });
    if (data) set({ notices: data.map(snakeToCamel) });
    set({ loading: false });
  },

  addNotice: async (notice) => {
    const { data, error } = await supabase.from('notices').insert({
      title: notice.title,
      body: notice.body,
      priority: notice.priority,
      created_by: notice.createdBy,
      author_team: notice.authorTeam || null,
    }).select().single();
    if (!error && data) {
      set((s) => ({ notices: [...s.notices, snakeToCamel(data)] }));
    }
  },

  updateNotice: async (id, updates) => {
    const row = {};
    if (updates.title !== undefined) row.title = updates.title;
    if (updates.body !== undefined) row.body = updates.body;
    if (updates.priority !== undefined) row.priority = updates.priority;
    const { data } = await supabase.from('notices').update(row).eq('id', id).select().single();
    if (data) {
      set((s) => ({ notices: s.notices.map((n) => (n.id === id ? snakeToCamel(data) : n)) }));
    }
  },

  // DB에 read_by 컬럼 미존재 — 세션 내 로컬 읽음 처리만 수행
  markRead: (id, userId) => {
    if (!userId) return;
    set((s) => ({
      notices: s.notices.map((n) =>
        n.id === id ? { ...n, readBy: [...(n.readBy || []), userId] } : n
      ),
    }));
  },

  deleteNotice: async (id) => {
    const { error } = await supabase.from('notices').delete().eq('id', id);
    if (!error) {
      set((s) => ({ notices: s.notices.filter((n) => n.id !== id) }));
    }
  },
}));

export default useNoticeStore;
