import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { snakeToCamel } from '../lib/dbHelpers';

const useCallStore = create((set) => ({
  calls: [],
  loading: false,

  fetchCalls: async () => {
    set({ loading: true });
    const { data } = await supabase.from('calls').select('*').order('created_at', { ascending: false });
    if (data) set({ calls: data.map(snakeToCamel) });
    set({ loading: false });
  },

  addCall: async (call) => {
    const { data, error } = await supabase.from('calls').insert({
      worker_id: call.workerId,
      type: call.type,
      memo: call.memo,
    }).select().single();
    if (!error && data) {
      set((s) => ({ calls: [...s.calls, snakeToCamel(data)] }));
    }
  },

  confirmCall: async (callId) => {
    const { data } = await supabase.from('calls').update({
      is_confirmed: true,
      confirmed_at: new Date().toISOString(),
    }).eq('id', callId).select().single();
    if (data) {
      set((s) => ({ calls: s.calls.map((c) => (c.id === callId ? snakeToCamel(data) : c)) }));
    }
  },
}));

export default useCallStore;
