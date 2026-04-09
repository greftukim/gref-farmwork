import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { snakeToCamel } from '../lib/dbHelpers';

const useOvertimeStore = create((set, get) => ({
  requests: [],
  loading: false,

  fetchRequests: async () => {
    set({ loading: true });
    const { data, error } = await supabase
      .from('overtime_requests')
      .select('*')
      .order('created_at', { ascending: false });
    if (!error && data) set({ requests: data.map(snakeToCamel) });
    set({ loading: false });
  },

  submitRequest: async ({ employeeId, date, hours, minutes, reason }) => {
    const { data, error } = await supabase
      .from('overtime_requests')
      .insert({
        employee_id: employeeId,
        date,
        hours,
        minutes,
        reason: reason || null,
        status: 'pending',
      })
      .select()
      .single();
    if (error) {
      console.error('[overtimeStore] submitRequest 실패:', error.message);
      return { error };
    }
    if (data) {
      set((s) => ({ requests: [snakeToCamel(data), ...s.requests] }));
    }
    return { data: snakeToCamel(data) };
  },

  approveRequest: async (id, reviewerId) => {
    const { data, error } = await supabase
      .from('overtime_requests')
      .update({
        status: 'approved',
        reviewed_by: reviewerId,
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();
    if (!error && data) {
      set((s) => ({ requests: s.requests.map((r) => (r.id === id ? snakeToCamel(data) : r)) }));
    }
    return { error };
  },

  rejectRequest: async (id, reviewerId) => {
    const { data, error } = await supabase
      .from('overtime_requests')
      .update({
        status: 'rejected',
        reviewed_by: reviewerId,
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();
    if (!error && data) {
      set((s) => ({ requests: s.requests.map((r) => (r.id === id ? snakeToCamel(data) : r)) }));
    }
    return { error };
  },

  adjustAndApprove: async (id, reviewerId, hours, minutes) => {
    const { data, error } = await supabase
      .from('overtime_requests')
      .update({
        hours,
        minutes,
        status: 'approved',
        reviewed_by: reviewerId,
        reviewed_at: new Date().toISOString(),
        adjusted_by_reviewer: true,
      })
      .eq('id', id)
      .select()
      .single();
    if (!error && data) {
      set((s) => ({ requests: s.requests.map((r) => (r.id === id ? snakeToCamel(data) : r)) }));
    }
    return { error };
  },

  updateOvertimeHours: async (id, hours, minutes) => {
    const { data, error } = await supabase
      .from('overtime_requests')
      .update({ hours, minutes })
      .eq('id', id)
      .select()
      .single();
    if (!error && data) {
      set((s) => ({ requests: s.requests.map((r) => (r.id === id ? snakeToCamel(data) : r)) }));
    }
    return { error };
  },

  bulkApprove: async (ids, reviewerId) => {
    if (!ids?.length) return { error: 'NO_IDS' };
    const reviewedAt = new Date().toISOString();
    const { error } = await supabase
      .from('overtime_requests')
      .update({
        status: 'approved',
        reviewed_by: reviewerId,
        reviewed_at: reviewedAt,
      })
      .in('id', ids);
    if (!error) {
      set((s) => ({
        requests: s.requests.map((r) =>
          ids.includes(r.id)
            ? { ...r, status: 'approved', reviewedBy: reviewerId, reviewedAt: reviewedAt }
            : r
        ),
      }));
    }
    return { error };
  },

  subscribeRealtime: () => {
    const channel = supabase
      .channel('overtime_requests_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'overtime_requests' }, () => {
        get().fetchRequests();
      })
      .subscribe();
    return () => supabase.removeChannel(channel);
  },
}));

export default useOvertimeStore;
