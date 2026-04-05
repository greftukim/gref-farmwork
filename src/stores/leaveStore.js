import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { snakeToCamel } from '../lib/dbHelpers';

const useLeaveStore = create((set, get) => ({
  requests: [],
  balances: [],
  loading: false,

  fetchRequests: async () => {
    const { data } = await supabase.from('leave_requests').select('*').order('created_at', { ascending: false });
    if (data) set({ requests: data.map(snakeToCamel) });
  },

  fetchBalances: async () => {
    const { data } = await supabase.from('leave_balances').select('*');
    if (data) set({ balances: data.map(snakeToCamel) });
  },

  addRequest: async (request) => {
    const { data, error } = await supabase.from('leave_requests').insert({
      employee_id: request.employeeId,
      date: request.date,
      type: request.type,
      reason: request.reason,
    }).select().single();
    if (!error && data) {
      set((s) => ({ requests: [...s.requests, snakeToCamel(data)] }));
    }
  },

  reviewRequest: async (requestId, status, reviewerId) => {
    const { data, error } = await supabase.from('leave_requests').update({
      status,
      reviewed_by: reviewerId,
      reviewed_at: new Date().toISOString(),
    }).eq('id', requestId).select().single();

    if (!error && data) {
      set((s) => ({ requests: s.requests.map((r) => (r.id === requestId ? snakeToCamel(data) : r)) }));

      if (status === 'approved') {
        const req = get().requests.find((r) => r.id === requestId) || snakeToCamel(data);
        const days = req.type === '연차' ? 1 : 0.5;
        const balance = get().balances.find((b) => b.employeeId === req.employeeId && b.year === new Date().getFullYear());
        if (balance) {
          const { data: bData } = await supabase.from('leave_balances').update({
            used_days: balance.usedDays + days,
          }).eq('id', balance.id).select().single();
          if (bData) {
            set((s) => ({ balances: s.balances.map((b) => (b.id === balance.id ? snakeToCamel(bData) : b)) }));
          }
        }
      }
    }
  },
}));

export default useLeaveStore;
