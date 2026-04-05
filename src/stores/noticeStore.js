import { create } from 'zustand';
import { mockNotices } from '../lib/mockData';

const useNoticeStore = create((set) => ({
  notices: [...mockNotices],

  addNotice: (notice) => {
    const id = `notice-${Date.now()}`;
    set((state) => ({
      notices: [...state.notices, {
        ...notice,
        id,
        createdAt: new Date().toISOString(),
      }],
    }));
  },

  updateNotice: (id, updates) => {
    set((state) => ({
      notices: state.notices.map((n) => (n.id === id ? { ...n, ...updates } : n)),
    }));
  },

  deleteNotice: (id) => {
    set((state) => ({
      notices: state.notices.filter((n) => n.id !== id),
    }));
  },
}));

export default useNoticeStore;
