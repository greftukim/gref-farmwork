import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { snakeToCamel } from '../lib/dbHelpers';
import { sendPushToAdmins } from '../lib/pushNotify';

const useIssueStore = create((set) => ({
  issues: [],
  loading: false,

  fetchIssues: async (currentUser) => {
    set({ loading: true });
    let query = supabase.from('issues').select('*').order('created_at', { ascending: false });
    if (currentUser?.role === 'farm_admin' && currentUser?.branch) {
      const { data: branchEmps } = await supabase.from('employees').select('id').eq('branch', currentUser.branch);
      const empIds = (branchEmps || []).map((e) => e.id);
      if (empIds.length > 0) query = query.in('worker_id', empIds);
    }
    const { data } = await query;
    if (data) set({ issues: data.map((d) => ({ ...snakeToCamel(d), status: d.is_resolved ? 'resolved' : 'pending' })) });
    set({ loading: false });
  },

  addIssue: async (issue) => {
    const { data, error } = await supabase.from('issues').insert({
      worker_id: issue.workerId,
      zone_id: issue.zoneId,
      type: issue.type,
      comment: issue.comment,
      photo: issue.photo,
    }).select().single();
    if (!error && data) {
      set((s) => ({ issues: [...s.issues, snakeToCamel(data)] }));
      try {
        const senderPrefix = issue.workerName ? `[${issue.workerName}] ` : '';
        await sendPushToAdmins({
          title: `${senderPrefix}작물 이상 신고`,
          body: `[${issue.type}] ${issue.comment || '이상 신고가 접수되었습니다'}`,
          type: 'issue_report',
          urgent: issue.type === '병해충',
        });
      } catch (pushErr) {
        console.error('[issueStore] 푸시 전송 실패:', pushErr);
      }
    }
  },

  updateIssue: async (id, patch) => {
    if (patch.status === 'in_progress') {
      // is_resolved 컬럼만 존재 — in_progress는 로컬 상태만 반영
      set((s) => ({ issues: s.issues.map((i) => (i.id === id ? { ...i, status: 'in_progress' } : i)) }));
      return;
    }
    if (patch.status === 'resolved') {
      const { data } = await supabase.from('issues').update({
        is_resolved: true,
        resolved_at: new Date().toISOString(),
      }).eq('id', id).select().single();
      if (data) {
        set((s) => ({ issues: s.issues.map((i) => (i.id === id ? { ...snakeToCamel(data), status: 'resolved' } : i)) }));
      }
    }
  },

  resolveIssue: async (issueId, resolverId) => {
    const { data } = await supabase.from('issues').update({
      is_resolved: true,
      resolved_by: resolverId,
      resolved_at: new Date().toISOString(),
    }).eq('id', issueId).select().single();
    if (data) {
      set((s) => ({ issues: s.issues.map((i) => (i.id === issueId ? snakeToCamel(data) : i)) }));
    }
  },
}));

export default useIssueStore;
