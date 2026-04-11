import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { snakeToCamel } from '../lib/dbHelpers';
import { matchRiskTemplates } from '../utils/tbmRiskMatcher';
import { canApproveSafetyChecks, isTeamLeader } from '../lib/permissions';
import { sendPushToEmployee } from '../lib/pushNotify';
import useAuthStore from './authStore';

const BRANCH_NAMES = { busan: '부산LAB', jinju: '진주', hadong: '하동' };

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
    // 교훈 12 적용: FK 제약명 명시 (POSTGREST-001)
    // approved_by_fkey 공존으로 employees:worker_id 단독 사용 시 모호성 에러 위험
    const { data, error } = await supabase
      .from('safety_checks')
      .select(`
        id, worker_id, date, check_type, completed_at, status,
        worker:employees!safety_checks_worker_id_fkey ( id, name, branch )
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

    // ── E-6.5: TBM 제출 완료 후 반장 알림 발송 ──────────────────────────────────
    // 알림 실패는 저장 성공과 완전 분리 — console.warn만, 반환값 영향 없음
    try {
      const currentUser = useAuthStore.getState().currentUser;
      const workerBranch = currentUser?.branch;
      const workerName = currentUser?.name || '작업자';

      if (!workerBranch) {
        console.warn('[E-6.5] currentUser.branch 없음 — 알림 스킵');
      } else {
        // anon_qr_login 정책(role='worker' AND is_active=true) 범위 내 직접 조회 가능
        // FCM-001: 반장 2명 이상 시 maybeSingle() 에러 → catch로 silent fail (백로그)
        const { data: leader } = await supabase
          .from('employees')
          .select('id')
          .eq('branch', workerBranch)
          .eq('role', 'worker')
          .eq('is_active', true)
          .eq('is_team_leader', true)
          .maybeSingle();

        // 반장 본인 TBM이면 알림 생략 (worker_id === teamLeaderId)
        if (leader?.id && leader.id === workerId) {
          console.log('[E-6.5] 반장 본인 TBM — 알림 생략');
        } else if (leader?.id && leader.id !== workerId) {
          const branchLabel = BRANCH_NAMES[workerBranch] || workerBranch;
          await sendPushToEmployee({
            employeeId: leader.id,
            title: 'TBM 승인 요청',
            body: `${workerName}(${branchLabel})이 작업 전 안전점검을 제출했습니다.`,
            type: 'tbm_approval',
            urgent: false,
            url: '/worker',
          });
        }
      }
    } catch (notifErr) {
      console.warn('[E-6.5] 반장 알림 발송 실패 (TBM 저장에는 영향 없음, INFRA-001 추적):', notifErr);
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
