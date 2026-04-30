import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { snakeToCamel, camelToSnake } from '../lib/dbHelpers';

const useEmployeeStore = create((set, get) => ({
  employees: [],
  loading: false,

  fetchEmployees: async (currentUser) => {
    set({ loading: true });
    let query = supabase.from('employees').select('*').order('created_at');
    if (currentUser?.role === 'farm_admin' && currentUser?.branch) {
      query = query.eq('branch', currentUser.branch);
    }
    const { data, error } = await query;
    if (!error && data) set({ employees: data.map(snakeToCamel) });
    set({ loading: false });
  },

  addEmployee: async (employee) => {
    const row = camelToSnake(employee);
    const { data, error } = await supabase.from('employees').insert(row).select().single();
    if (!error && data) {
      set((s) => ({ employees: [...s.employees, snakeToCamel(data)] }));
    }
  },

  updateEmployee: async (id, updates) => {
    const row = camelToSnake(updates);
    const { data, error } = await supabase.from('employees').update(row).eq('id', id).select().single();
    if (!error && data) {
      set((s) => ({ employees: s.employees.map((e) => (e.id === id ? snakeToCamel(data) : e)) }));
    }
  },

  toggleActive: async (id) => {
    const emp = get().employees.find((e) => e.id === id);
    if (!emp) return;
    const { data, error } = await supabase.from('employees').update({ is_active: !emp.isActive }).eq('id', id).select().single();
    if (!error && data) {
      set((s) => ({ employees: s.employees.map((e) => (e.id === id ? snakeToCamel(data) : e)) }));
    }
  },

  // 반장 토글 — 낙관적 업데이트, 실패 시 이전 값 복원
  // 권한 가드: farm_admin은 본인 지점 worker만 (RLS 레벨 처리), hr_admin/master는 전체
  toggleTeamLeader: async (employeeId, nextValue) => {
    const prev = get().employees.find((e) => e.id === employeeId);
    if (!prev) return { error: 'not_found' };

    // 낙관적 업데이트
    set((s) => ({
      employees: s.employees.map((e) =>
        e.id === employeeId ? { ...e, isTeamLeader: nextValue } : e
      ),
    }));

    const { data, error } = await supabase
      .from('employees')
      .update({ is_team_leader: nextValue })
      .eq('id', employeeId)
      .select('id, is_team_leader')
      .single();

    if (error) {
      // 롤백
      set((s) => ({
        employees: s.employees.map((e) =>
          e.id === employeeId ? { ...e, isTeamLeader: prev.isTeamLeader } : e
        ),
      }));
      return { error };
    }

    return { data };
  },

  // 작업자 QR 로그인 토큰 발급/재발급
  // 생성된 token → /auth?token={token} URL → QRCodeSVG 렌더링
  // .maybeSingle(): RLS UPDATE 0행 → 406 차단. 0행 케이스를 명시 에러로 변환.
  issueDeviceToken: async (id) => {
    const token = crypto.randomUUID();
    const { data, error } = await supabase
      .from('employees')
      .update({ device_token: token })
      .eq('id', id)
      .select()
      .maybeSingle();
    if (error) {
      return { error };
    }
    if (!data) {
      return {
        error: {
          message: '권한이 부족합니다. 본인 지점의 작업자에게만 QR을 발급할 수 있습니다.',
          code: 'RLS_BLOCKED',
        },
      };
    }
    set((s) => ({ employees: s.employees.map((e) => (e.id === id ? snakeToCamel(data) : e)) }));
    return { token };
  },
}));

export default useEmployeeStore;
