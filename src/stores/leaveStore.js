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
      status: 'pending',
    }).select().single();
    if (!error && data) {
      set((s) => ({ requests: [snakeToCamel(data), ...s.requests] }));
    }
  },

  // 재배팀 단독 승인 (pending → approved 직행)
  farmReview: async (requestId, approved, reviewerId) => {
    const status = approved ? 'approved' : 'rejected';
    const { data, error } = await supabase.from('leave_requests').update({
      status,
      farm_reviewed_by: reviewerId,
      farm_reviewed_at: new Date().toISOString(),
    }).eq('id', requestId).select().single();

    if (error) {
      console.error('[leaveStore] farmReview 실패:', error.message, error.details);
      return false;
    }
    if (data) {
      set((s) => ({ requests: s.requests.map((r) => (r.id === requestId ? snakeToCamel(data) : r)) }));
      // 승인 시 잔여 휴가 차감
      if (status === 'approved') {
        const req = get().requests.find((r) => r.id === requestId) || snakeToCamel(data);
        const dayMap = { 연차: 1, 오전반차: 0.5, 오후반차: 0.5, 출장: 0, 대휴: 1 };
        const days = dayMap[req.type] ?? 0;
        const balance = get().balances.find((b) => b.employeeId === req.employeeId && b.year === new Date().getFullYear());
        if (balance && days > 0) {
          const { data: bData } = await supabase.from('leave_balances').update({
            used_days: balance.usedDays + days,
          }).eq('id', balance.id).select().single();
          if (bData) {
            set((s) => ({ balances: s.balances.map((b) => (b.id === balance.id ? snakeToCamel(bData) : b)) }));
          }
        }
      }
      // 전체 재조회
      const { data: allData } = await supabase.from('leave_requests').select('*').order('created_at', { ascending: false });
      if (allData) set({ requests: allData.map(snakeToCamel) });
    }
    return true;
  },
}));

export default useLeaveStore;
