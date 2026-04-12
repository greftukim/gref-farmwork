import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { snakeToCamel } from '../lib/dbHelpers';
import useAuthStore from './authStore';

// ─── 권한 헬퍼 ────────────────────────────────────────────────────────────────
// farm_admin: 자기 branch 고정 (requestedBranch 무시)
// hr_admin / master: requestedBranch 그대로 사용
// worker / anon: 에러 (RLS도 막지만 클라이언트에서 명시적 차단)
const getEffectiveBranch = (currentUser, requestedBranch) => {
  if (currentUser?.role === 'farm_admin') return currentUser.branch;
  if (['hr_admin', 'master'].includes(currentUser?.role)) return requestedBranch;
  throw new Error('일용직 장부 접근 권한 없음');
};

// ─── store ────────────────────────────────────────────────────────────────────
const useDailyWorkLogStore = create((set, get) => ({
  logs: [],
  loading: false,
  error: null,
  filterBranch: null,   // 현재 조회 중인 지점 (재조회용)
  filterDate: null,     // 일별 보기 활성 시 'YYYY-MM-DD'
  filterMonth: null,    // 월별 보기 활성 시 'YYYY-MM'

  clearError: () => set({ error: null }),

  // ── 일별 조회 ───────────────────────────────────────────────────────────────
  fetchByDate: async (date, branch) => {
    set({ loading: true, error: null, filterDate: date, filterMonth: null });
    try {
      const currentUser = useAuthStore.getState().currentUser;
      const effectiveBranch = getEffectiveBranch(currentUser, branch);

      const { data, error } = await supabase
        .from('daily_work_logs')
        .select('*')
        .eq('work_date', date)
        .eq('branch', effectiveBranch)
        .order('created_at', { ascending: true });

      if (error) throw error;
      set({ logs: (data || []).map(snakeToCamel), filterBranch: effectiveBranch, loading: false });
    } catch (err) {
      console.error('[dailyWorkLogStore] fetchByDate:', err);
      set({ error: err.message, loading: false });
    }
  },

  // ── 월별 조회 ───────────────────────────────────────────────────────────────
  // yearMonth: 'YYYY-MM'
  fetchByMonth: async (yearMonth, branch) => {
    set({ loading: true, error: null, filterMonth: yearMonth, filterDate: null });
    try {
      const currentUser = useAuthStore.getState().currentUser;
      const effectiveBranch = getEffectiveBranch(currentUser, branch);

      const [year, month] = yearMonth.split('-').map(Number);
      const firstDay = `${yearMonth}-01`;
      // Date(year, month, 0) = 해당 월의 마지막 날
      const lastDay = new Date(year, month, 0).toISOString().slice(0, 10);

      const { data, error } = await supabase
        .from('daily_work_logs')
        .select('*')
        .eq('branch', effectiveBranch)
        .gte('work_date', firstDay)
        .lte('work_date', lastDay)
        .order('work_date', { ascending: true });

      if (error) throw error;
      set({ logs: (data || []).map(snakeToCamel), filterBranch: effectiveBranch, loading: false });
    } catch (err) {
      console.error('[dailyWorkLogStore] fetchByMonth:', err);
      set({ error: err.message, loading: false });
    }
  },

  // ── 등록 (INSERT) ───────────────────────────────────────────────────────────
  // payload: { work_date, branch, worker_name, worker_phone,
  //            start_time, end_time, break_minutes, hourly_wage,
  //            work_description, payment_status, paid_at }
  // ⚠️  work_minutes / daily_wage는 GENERATED 컬럼 — payload에 포함 금지
  createLog: async (payload) => {
    set({ loading: true, error: null });
    try {
      const currentUser = useAuthStore.getState().currentUser;
      // 권한 검증 + farm_admin branch 강제
      const effectiveBranch = getEffectiveBranch(currentUser, payload.branch);

      // GENERATED 컬럼 방어적 제거 (호출자가 실수로 포함해도 DB 에러 방지)
      // eslint-disable-next-line no-unused-vars
      const { work_minutes, daily_wage, ...safePayload } = payload;

      const { error } = await supabase
        .from('daily_work_logs')
        .insert({ ...safePayload, branch: effectiveBranch });

      if (error) throw error;

      // 현재 필터 기준으로 목록 갱신
      await get()._refetch();
    } catch (err) {
      console.error('[dailyWorkLogStore] createLog:', err);
      set({ error: err.message, loading: false });
    }
  },

  // ── 수정 (UPDATE) ───────────────────────────────────────────────────────────
  // patch: work_minutes / daily_wage 제외한 변경 필드
  // RLS가 farm_admin의 타 branch row 수정을 차단 (DB 레벨 보호)
  updateLog: async (id, patch) => {
    set({ loading: true, error: null });
    try {
      // GENERATED 컬럼 방어적 제거
      // eslint-disable-next-line no-unused-vars
      const { work_minutes, daily_wage, ...safePatch } = patch;

      const { data, error } = await supabase
        .from('daily_work_logs')
        .update(safePatch)
        .eq('id', id)
        .select('id');

      if (error) throw error;
      if (!data || data.length === 0)
        throw new Error('수정 실패 (0 rows updated) — 권한 또는 ID 확인');

      await get()._refetch();
    } catch (err) {
      console.error('[dailyWorkLogStore] updateLog:', err);
      set({ error: err.message, loading: false });
    }
  },

  // ── 삭제 (DELETE) ───────────────────────────────────────────────────────────
  // 도메인 노트 D-8: 수정·삭제 기능 필수
  // RLS가 farm_admin의 타 branch row 삭제를 차단 (DB 레벨 보호)
  deleteLog: async (id) => {
    set({ loading: true, error: null });
    try {
      const { error } = await supabase
        .from('daily_work_logs')
        .delete()
        .eq('id', id);

      if (error) throw error;
      await get()._refetch();
    } catch (err) {
      console.error('[dailyWorkLogStore] deleteLog:', err);
      set({ error: err.message, loading: false });
    }
  },

  // ── 내부 헬퍼: mutation 후 현재 필터 기준 재조회 ─────────────────────────────
  _refetch: async () => {
    const { filterDate, filterMonth, filterBranch } = get();
    if (filterDate) {
      await get().fetchByDate(filterDate, filterBranch);
    } else if (filterMonth) {
      await get().fetchByMonth(filterMonth, filterBranch);
    } else {
      set({ loading: false });
    }
  },
}));

export default useDailyWorkLogStore;
