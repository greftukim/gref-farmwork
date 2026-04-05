import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { snakeToCamel } from '../lib/dbHelpers';

const STORAGE_KEY = 'gref-auth';

// 앱 시작 시 localStorage에서 복원
function loadPersistedAuth() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed.currentUser && parsed.isAuthenticated) {
        return { currentUser: parsed.currentUser, isAuthenticated: true };
      }
    }
  } catch (e) {
    // 파싱 실패 시 무시
  }
  return { currentUser: null, isAuthenticated: false };
}

const useAuthStore = create((set) => ({
  ...loadPersistedAuth(),

  login: async (employeeId, pin) => {
    const { data, error } = await supabase
      .from('employees')
      .select('*')
      .eq('id', employeeId)
      .eq('pin_code', pin)
      .eq('is_active', true)
      .single();

    if (!error && data) {
      const user = snakeToCamel(data);
      const state = { currentUser: user, isAuthenticated: true };
      set(state);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      return { success: true, role: user.role };
    }
    return { success: false };
  },

  logout: () => {
    set({ currentUser: null, isAuthenticated: false });
    localStorage.removeItem(STORAGE_KEY);
  },
}));

export default useAuthStore;
