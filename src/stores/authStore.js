import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from '../lib/supabase';
import { snakeToCamel } from '../lib/dbHelpers';

const useAuthStore = create(
  persist(
    (set, get) => ({
      currentUser: null,
      isAuthenticated: false,
      workerToken: null, // QR 토큰 (작업자 전용)

      // 작업자용: QR 토큰으로 로그인
      loginWithToken: async (token) => {
        const { data, error } = await supabase
          .from('employees')
          .select('*')
          .eq('device_token', token)
          .eq('is_active', true)
          .single();

        if (!error && data) {
          const user = snakeToCamel(data);
          set({ currentUser: user, isAuthenticated: true, workerToken: token });
          return { success: true };
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

      // 앱 로드 시 작업자 토큰 유효성 재검증 (QR 재발급/해제 감지)
      revalidateWorkerToken: async () => {
        const { currentUser, workerToken } = get();
        if (!currentUser || currentUser.role !== 'worker' || !workerToken) return;

        const { data } = await supabase
          .from('employees')
          .select('device_token')
          .eq('id', currentUser.id)
          .single();

        if (!data || data.device_token !== workerToken) {
          set({ currentUser: null, isAuthenticated: false, workerToken: null });
        }
      },

      logout: () => {
        set({ currentUser: null, isAuthenticated: false, workerToken: null });
      },
    }),
    {
      name: 'gref-auth',
      partialize: (state) => ({
        currentUser: state.currentUser,
        isAuthenticated: state.isAuthenticated,
        workerToken: state.workerToken,
      }),
    }
  )
);

export default useAuthStore;
