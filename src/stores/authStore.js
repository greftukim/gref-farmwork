import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from '../lib/supabase';
import { snakeToCamel } from '../lib/dbHelpers';

const useAuthStore = create(
  persist(
    (set) => ({
      currentUser: null,
      isAuthenticated: false,

      // 작업자용: 직원 선택 + PIN 로그인
      loginWithPin: async (employeeId, pin) => {
        const { data, error } = await supabase
          .from('employees')
          .select('*')
          .eq('id', employeeId)
          .eq('pin_code', pin)
          .eq('is_active', true)
          .single();

        if (!error && data) {
          const user = snakeToCamel(data);
          set({ currentUser: user, isAuthenticated: true });
          return { success: true, role: user.role };
        }
        return { success: false };
      },

      // 관리자용: 아이디 + 비밀번호 + 팀 로그인
      loginWithPassword: async (username, password, team) => {
        const { data, error } = await supabase
          .from('employees')
          .select('*')
          .eq('username', username)
          .eq('password', password)
          .eq('role', 'admin')
          .eq('is_active', true)
          .single();

        if (!error && data) {
          const user = { ...snakeToCamel(data), team };
          set({ currentUser: user, isAuthenticated: true });
          return { success: true, role: 'admin' };
        }
        return { success: false };
      },

      logout: () => {
        set({ currentUser: null, isAuthenticated: false });
      },
    }),
    {
      name: 'gref-auth',
      partialize: (state) => ({
        currentUser: state.currentUser,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);

export default useAuthStore;
