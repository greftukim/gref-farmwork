import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { snakeToCamel } from '../lib/dbHelpers';

const useScheduleStore = create((set) => ({
  schedules: [],
  loading: false,

  fetchSchedules: async () => {
    set({ loading: true });
    const { data } = await supabase.from('schedules').select('*').order('date');
    if (data) set({ schedules: data.map(snakeToCamel) });
    set({ loading: false });
  },

  updateSchedule: async (scheduleId, updates) => {
    const row = {};
    if (updates.startTime !== undefined) row.start_time = updates.startTime;
    if (updates.endTime !== undefined) row.end_time = updates.endTime;
    if (updates.note !== undefined) row.note = updates.note;

    const { data } = await supabase.from('schedules').update(row).eq('id', scheduleId).select().single();
    if (data) {
      set((s) => ({ schedules: s.schedules.map((sc) => (sc.id === scheduleId ? snakeToCamel(data) : sc)) }));
    }
  },
}));

export default useScheduleStore;
