import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { snakeToCamel, camelToSnake } from '../lib/dbHelpers';

const useEmployeeStore = create((set, get) => ({
  employees: [],
  loading: false,

  fetchEmployees: async () => {
    set({ loading: true });
    const { data, error } = await supabase.from('employees').select('*').order('created_at');
    if (!error && data) set({ employees: data.map(snakeToCamel) });
    set({ loading: false });
  },

  addEmployee: async (employee) => {
    const row = camelToSnake(employee);
    const { data, error } = await supabase.from('employees').insert(row).select().single();
    if (!error && data) {
      set((s) => ({ employees: [...s.employees, snakeToCamel(data)] }));
    }
  },

  updateEmployee: async (id, updates) => {
    const row = camelToSnake(updates);
    const { data, error } = await supabase.from('employees').update(row).eq('id', id).select().single();
    if (!error && data) {
      set((s) => ({ employees: s.employees.map((e) => (e.id === id ? snakeToCamel(data) : e)) }));
    }
  },

  toggleActive: async (id) => {
    const emp = get().employees.find((e) => e.id === id);
    if (!emp) return;
    const { data, error } = await supabase.from('employees').update({ is_active: !emp.isActive }).eq('id', id).select().single();
    if (!error && data) {
      set((s) => ({ employees: s.employees.map((e) => (e.id === id ? snakeToCamel(data) : e)) }));
    }
  },
}));

export default useEmployeeStore;
