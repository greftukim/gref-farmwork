import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { snakeToCamel } from '../lib/dbHelpers';

const useAuthStore = create((set) => ({
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
}));

export default useAuthStore;
