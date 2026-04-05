import { create } from 'zustand';
import { mockSchedules } from '../lib/mockData';

const useScheduleStore = create((set) => ({
  schedules: [...mockSchedules],

  updateSchedule: (scheduleId, updates) => {
    set((state) => ({
      schedules: state.schedules.map((s) =>
        s.id === scheduleId ? { ...s, ...updates } : s
      ),
    }));
  },
}));

export default useScheduleStore;
