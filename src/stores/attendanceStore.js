import { create } from 'zustand';
import { mockAttendance } from '../lib/mockData';

const useAttendanceStore = create((set, get) => ({
  records: [...mockAttendance],

  checkIn: (employeeId) => {
    const today = new Date().toISOString().split('T')[0];
    const now = new Date().toISOString();
    const existing = get().records.find(
      (r) => r.employeeId === employeeId && r.date === today
    );
    if (existing) return false;
    set((state) => ({
      records: [
        ...state.records,
        {
          id: `att-${today}-${employeeId}`,
          employeeId,
          date: today,
          checkIn: now,
          checkOut: null,
          workMinutes: null,
          status: 'working',
          note: null,
        },
      ],
    }));
    return true;
  },

  checkOut: (employeeId) => {
    const today = new Date().toISOString().split('T')[0];
    const now = new Date();
    set((state) => ({
      records: state.records.map((r) => {
        if (r.employeeId === employeeId && r.date === today && !r.checkOut) {
          const checkInTime = new Date(r.checkIn);
          const workMinutes = Math.round((now - checkInTime) / 60000);
          return { ...r, checkOut: now.toISOString(), workMinutes, status: r.status === 'working' ? 'normal' : r.status };
        }
        return r;
      }),
    }));
  },
}));

export default useAttendanceStore;
