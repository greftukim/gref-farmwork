import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { snakeToCamel } from '../lib/dbHelpers';
import { judgeAttendanceStatus } from '../utils/attendanceStatus';

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

  /** 관리자 대리 입력 */
  proxyCheckIn: async ({ employeeId, date, checkIn, checkOut, status, inputBy, gps }) => {
    if (!employeeId || !date || !checkIn || !inputBy) {
      return { error: 'MISSING_REQUIRED' };
    }

    // 중복 체크 (UNIQUE 제약으로 어차피 실패하지만 명시적으로)
    const existing = get().records.find(
      (r) => r.employeeId === employeeId && r.date === date
    );
    if (existing) {
      return { error: 'ALREADY_EXISTS' };
    }

    // workMinutes 계산 (checkOut 있을 때만)
    let workMinutes = null;
    if (checkOut) {
      workMinutes = Math.round((new Date(checkOut) - new Date(checkIn)) / 60000);
    }

    const { data, error } = await supabase
      .from('attendance')
      .insert({
        employee_id: employeeId,
        date,
        check_in: checkIn,
        check_out: checkOut || null,
        work_minutes: workMinutes,
        status: status || 'normal',
        is_proxy: true,
        input_by: inputBy,
        ...(gps ? { check_in_lat: gps.lat, check_in_lng: gps.lng } : {}),
      })
      .select()
      .single();

    if (!error && data) {
      set((s) => ({ records: [snakeToCamel(data), ...s.records] }));
    }
    return { error };
  },

  /** 기존 기록 수정 (관리자용: check_in, check_out 변경 + status 자동 재판정) */
  updateRecord: async (recordId, { checkIn, checkOut }) => {
    const existing = get().records.find((r) => r.id === recordId);
    if (!existing) throw new Error('Record not found');

    const { data: emp, error: empErr } = await supabase
      .from('employees')
      .select('work_start_time')
      .eq('id', existing.employeeId)
      .single();
    if (empErr) throw empErr;

    let newStatus = existing.status;
    if (existing.status !== 'working') {
      newStatus = judgeAttendanceStatus(checkIn, emp.work_start_time);
    }

    let workMinutes = null;
    if (checkOut) {
      workMinutes = Math.round((new Date(checkOut) - new Date(checkIn)) / 60000);
    }

    const { data, error } = await supabase
      .from('attendance')
      .update({
        check_in: checkIn,
        check_out: checkOut,
        status: newStatus,
        work_minutes: workMinutes,
      })
      .eq('id', recordId)
      .select()
      .single();
    if (error) throw error;

    set((state) => ({
      records: state.records.map((r) =>
        r.id === recordId ? snakeToCamel(data) : r
      ),
    }));

    return data;
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
    // RLS-DEBT-004: 세 조건 모두 없으면 전체 삭제 방지
    if (!startDate && !endDate && !employeeId) {
      console.error('[attendanceStore.deleteRecords] 파라미터 필수 (전체 삭제 방지)');
      return { error: 'NO_CONDITIONS' };
    }

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
