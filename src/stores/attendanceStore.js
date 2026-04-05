import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { snakeToCamel } from '../lib/dbHelpers';

const useAttendanceStore = create((set, get) => ({
  records: [],
  loading: false,

  fetchRecords: async () => {
    set({ loading: true });
    const { data, error } = await supabase.from('attendance').select('*').order('date', { ascending: false });
    if (!error && data) set({ records: data.map(snakeToCamel) });
    set({ loading: false });
  },

  checkIn: async (employeeId) => {
    const today = new Date().toISOString().split('T')[0];
    const existing = get().records.find((r) => r.employeeId === employeeId && r.date === today);
    if (existing) return false;

    const { data, error } = await supabase.from('attendance').insert({
      employee_id: employeeId,
      date: today,
      check_in: new Date().toISOString(),
      status: 'working',
    }).select().single();

    if (!error && data) {
      set((s) => ({ records: [...s.records, snakeToCamel(data)] }));
      return true;
    }
    return false;
  },

  checkOut: async (employeeId) => {
    const today = new Date().toISOString().split('T')[0];
    const record = get().records.find((r) => r.employeeId === employeeId && r.date === today && !r.checkOut);
    if (!record) return;

    const now = new Date();
    const checkInTime = new Date(record.checkIn);
    const workMinutes = Math.round((now - checkInTime) / 60000);

    const { data, error } = await supabase.from('attendance').update({
      check_out: now.toISOString(),
      work_minutes: workMinutes,
      status: record.status === 'working' ? 'normal' : record.status,
    }).eq('id', record.id).select().single();

    if (!error && data) {
      set((s) => ({ records: s.records.map((r) => (r.id === record.id ? snakeToCamel(data) : r)) }));
    }
  },
}));

export default useAttendanceStore;
