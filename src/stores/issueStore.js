import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { snakeToCamel } from '../lib/dbHelpers';
import { sendPushToAdmins } from '../lib/pushNotify';

const useIssueStore = create((set) => ({
  issues: [],
  loading: false,

  fetchIssues: async () => {
    set({ loading: true });
    const { data } = await supabase.from('issues').select('*').order('created_at', { ascending: false });
    if (data) set({ issues: data.map(snakeToCamel) });
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
      sendPushToAdmins({
        title: '이상 신고',
        body: `[${issue.type}] ${issue.comment || '이상 신고가 접수되었습니다'}`,
        type: 'issue_report',
        urgent: issue.type === '병해충',
      });
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
