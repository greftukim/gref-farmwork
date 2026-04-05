import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from '../lib/supabase';
import { snakeToCamel } from '../lib/dbHelpers';

const useAuthStore = create(
  persist(
    (set) => ({
      currentUser: null,
      isAuthenticated: false,

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
          set({ currentUser: user, isAuthenticated: true });
          return { success: true, role: user.role };
        }
        return { success: false };
      },

      logout: () => {
        set({ currentUser: null, isAuthenticated: false });
      },
    }),
    {
      name: 'gref-auth',
      // persist 미들웨어가 login/logout 함수는 자동 제외하고
      // currentUser, isAuthenticated만 저장/복원
      partialize: (state) => ({
        currentUser: state.currentUser,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);

export default useAuthStore;
