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
      set((s) => ({ requests: [snakeToCamel(data), ...s.requests] }));
    }
  },

  // 재배팀 1차 승인/반려
  farmReview: async (requestId, approved, reviewerId) => {
    const status = approved ? 'farm_approved' : 'rejected';
    const { data, error } = await supabase.from('leave_requests').update({
      status,
      reviewed_by: reviewerId,
      reviewed_at: new Date().toISOString(),
    }).eq('id', requestId).select().single();

    if (!error && data) {
      set((s) => ({ requests: s.requests.map((r) => (r.id === requestId ? snakeToCamel(data) : r)) }));

      // 승인 시 잔여 연차 차감
      if (status === 'farm_approved') {
        const req = snakeToCamel(data);
        const days = req.type === '연차' ? 1 : (req.type === '오전반차' || req.type === '오후반차') ? 0.5 : 0;
        if (days > 0) {
          const balance = get().balances.find(
            (b) => b.employeeId === req.employeeId && b.year === new Date().getFullYear()
          );
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

      // 처리 후 전체 재조회 (화면 자동 갱신)
      const { data: allData } = await supabase.from('leave_requests').select('*').order('created_at', { ascending: false });
      if (allData) set({ requests: allData.map(snakeToCamel) });
    }
    return !error;
  },

  reviewRequest: async (requestId, status, reviewerId) => {
    const { data, error } = await supabase.from('leave_requests').update({
      status,
      reviewed_by: reviewerId,
      reviewed_at: new Date().toISOString(),
    }).eq('id', requestId).select().single();

    if (!error && data) {
      set((s) => ({ requests: s.requests.map((r) => (r.id === requestId ? snakeToCamel(data) : r)) }));
    }
  },
}));

export default useLeaveStore;
