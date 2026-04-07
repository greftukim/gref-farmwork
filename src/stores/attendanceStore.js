import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { snakeToCamel } from '../lib/dbHelpers';

const useAttendanceStore = create((set, get) => ({
  records: [],
  loading: false,

  fetchRecords: async () => {
    set({ loading: true });
    const { data, error } = await supabase.from('attendance').select('*').order('date', { ascending: false });
    if (!error && data) set({ records: data.map(snakeToCamel) });
    set({ loading: false });
  },

  /** gps: { lat, lng } | null — GPS 좌표 함께 저장
   *  initialStatus: 'working' (정상) | 'late' (지각) — WorkerHome에서 결정 */
  checkIn: async (employeeId, gps = null, initialStatus = 'working') => {
    const today = new Date().toISOString().split('T')[0];
    const existing = get().records.find((r) => r.employeeId === employeeId && r.date === today);
    if (existing) return false;

    const payload = {
      employee_id: employeeId,
      date: today,
      check_in: new Date().toISOString(),
      status: initialStatus,
      ...(gps && { check_in_lat: gps.lat, check_in_lng: gps.lng }),
    };

    const { data, error } = await supabase.from('attendance').insert(payload).select().single();

    if (!error && data) {
      set((s) => ({ records: [...s.records, snakeToCamel(data)] }));
      return true;
    }
    return false;
  },

  /** gps: { lat, lng } | null — GPS 좌표 함께 저장 */
  checkOut: async (employeeId, gps = null) => {
    const today = new Date().toISOString().split('T')[0];
    const record = get().records.find((r) => r.employeeId === employeeId && r.date === today && !r.checkOut);
    if (!record) return;

    const now = new Date();
    const workMinutes = Math.round((now - new Date(record.checkIn)) / 60000);

    const payload = {
      check_out: now.toISOString(),
      work_minutes: workMinutes,
      // 출근 시 'late'였으면 퇴근 후에도 late 유지, 그 외엔 normal
      status: record.status === 'late' ? 'late' : 'normal',
      ...(gps && { check_out_lat: gps.lat, check_out_lng: gps.lng }),
    };

    const { data, error } = await supabase.from('attendance').update(payload).eq('id', record.id).select().single();

    if (!error && data) {
      set((s) => ({ records: s.records.map((r) => (r.id === record.id ? snakeToCamel(data) : r)) }));
    }
  },

  /** 개별 기록 삭제 */
  deleteRecord: async (id) => {
    const { error } = await supabase.from('attendance').delete().eq('id', id);
    if (!error) {
      set((s) => ({ records: s.records.filter((r) => r.id !== id) }));
    }
    return { error };
  },

  /** 조건부 일괄 삭제: startDate/endDate/employeeId 중 하나 이상 필요 */
  deleteRecords: async ({ startDate, endDate, employeeId } = {}) => {
    let query = supabase.from('attendance').delete();
    if (startDate) query = query.gte('date', startDate);
    if (endDate) query = query.lte('date', endDate);
    if (employeeId) query = query.eq('employee_id', employeeId);
    const { error } = await query;
    if (!error) {
      await get().fetchRecords();
    }
    return { error };
  },
}));

export default useAttendanceStore;
