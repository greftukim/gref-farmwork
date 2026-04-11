import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { snakeToCamel } from '../lib/dbHelpers';
import { matchRiskTemplates } from '../utils/tbmRiskMatcher';
import { canApproveSafetyChecks, isTeamLeader } from '../lib/permissions';
import useAuthStore from './authStore';

const useSafetyCheckStore = create((set, get) => ({
  items: [],
  itemsLoaded: false,
  riskTemplates: [],

  fetchItems: async () => {
    if (get().itemsLoaded) return get().items;
    const { data, error } = await supabase
      .from('safety_check_items')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true });
    if (error) throw error;
    const items = (data || []).map(snakeToCamel);
    set({ items, itemsLoaded: true });
    return items;
  },

  getTodayCheck: async (workerId, checkType) => {
    const today = new Date().toISOString().slice(0, 10);
    const { data, error } = await supabase
      .from('safety_checks')
      .select('id, status, check_type')
      .eq('worker_id', workerId)
      .eq('date', today)
      .eq('check_type', checkType)
      .maybeSingle();
    if (error) throw error;
    return data;
  },

  saveCheck: async (workerId, date, checkType, itemResults) => {
    const { data: header, error: headerErr } = await supabase
      .from('safety_checks')
      .insert({ worker_id: workerId, date, check_type: checkType })
      .select()
      .single();
    if (headerErr) throw headerErr;

    const rows = itemResults.map((r) => ({
      check_id: header.id,
      item_id: r.itemId,
      checked: r.checked,
    }));
    const { error: rowsErr } = await supabase
      .from('safety_check_results')
      .insert(rows);
    if (rowsErr) {
      await supabase.from('safety_checks').delete().eq('id', header.id);
      throw rowsErr;
    }

    return header;
  },

  /** 관리자용: 일별 전체 조회 */
  fetchByDate: async (date) => {
    const { data, error } = await supabase
      .from('safety_checks')
      .select(`
        id, worker_id, date, check_type, completed_at,
        employees:worker_id ( id, name, branch )
      `)
      .eq('date', date)
      .order('completed_at', { ascending: true });
    if (error) throw error;
    return (data || []).map(snakeToCamel);
  },

  // ── E-3 신규 함수 ──────────────────────────────────────────────────────

  fetchRiskTemplates: async (cropIds, taskTitles, workerId) => {
    const normalizedIds = Array.isArray(cropIds) ? cropIds.filter(Boolean) : (cropIds ? [cropIds] : []);
    const { data, error } = await supabase
      .from('tbm_risk_templates')
      .select('*')
      .eq('is_active', true);
    if (error) throw error;

    const templates = (data || []).map(snakeToCamel);
    const today = new Date().toISOString().slice(0, 10);
    const matched = matchRiskTemplates(templates, normalizedIds, taskTitles, workerId, today);
    set({ riskTemplates: matched });
    return matched;
  },

  savePreTaskCheck: async (workerId, taskIds, itemResults) => {
    const today = new Date().toISOString().slice(0, 10);
    const { data: header, error: headerErr } = await supabase
      .from('safety_checks')
      .insert({
        worker_id: workerId,
        date: today,
        check_type: 'pre_task',
        task_ids: taskIds,
      })
      .select()
      .single();
    if (headerErr) throw headerErr;

    const rows = itemResults.map((r) => ({
      check_id: header.id,
      item_id: r.itemId,
      checked: r.checked,
    }));
    const { error: rowsErr } = await supabase
      .from('safety_check_results')
      .insert(rows);
    if (rowsErr) {
      await supabase.from('safety_checks').delete().eq('id', header.id);
      throw rowsErr;
    }

    return header.id;
  },

  confirmRisks: async (checkId, shownRisks) => {
    const { data, error } = await supabase
      .from('safety_checks')
      .update({
        shown_risks: shownRisks,
        risks_confirmed_at: new Date().toISOString(),
      })
      .eq('id', checkId)
      .select('id');
    if (error) throw error;
    if (!data || data.length === 0) {
      throw new Error('위험 확인 저장 실패 (0 rows updated)');
    }
    return true;
  },

  approveChecks: async (checkIds, approverId) => {
    const currentUser = useAuthStore.getState().currentUser;
    if (!canApproveSafetyChecks(currentUser)) {
      throw new Error('승인 권한이 없습니다');
    }
    const { data, error } = await supabase
      .from('safety_checks')
      .update({
        status: 'approved',
        approved_by: approverId,
        approved_at: new Date().toISOString(),
      })
      .in('id', checkIds)
      .eq('status', 'submitted')
      .select('id');
    if (error) throw error;
    return (data || []).length;
  },

  getPendingChecksForApproval: async (branch) => {
    const currentUser = useAuthStore.getState().currentUser;
    if (!canApproveSafetyChecks(currentUser)) {
      throw new Error('승인 대기 목록 조회 권한이 없습니다');
    }
    if (isTeamLeader(currentUser) && currentUser.branch !== branch) {
      throw new Error('본인 지점만 조회 가능합니다');
    }
    const today = new Date().toISOString().slice(0, 10);
    const { data, error } = await supabase
      .from('safety_checks')
      .select(`
        id, worker_id, date, check_type, status, task_ids, shown_risks, risks_confirmed_at, completed_at,
        employees!safety_checks_worker_id_fkey!inner ( id, name, branch )
      `)
      .eq('check_type', 'pre_task')
      .eq('status', 'submitted')
      .eq('date', today)
      .order('completed_at', { ascending: true });
    if (error) {
      console.error('[getPendingChecksForApproval]', error);
      throw error;
    }
    const filtered = (data || []).filter((row) => row.employees?.branch === branch);
    return filtered.map((row) => ({
      id: row.id,
      workerId: row.worker_id,
      date: row.date,
      checkType: row.check_type,
      taskIds: row.task_ids,
      shownRisks: row.shown_risks,
      completedAt: row.completed_at,
      worker: { id: row.employees.id, name: row.employees.name },
    }));
  },
}));

export default useSafetyCheckStore;
