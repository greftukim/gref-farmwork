import { create } from 'zustand';

const useDailyReportStore = create((set) => ({
  reports: [],
  addReport: (r) => set((s) => ({ reports: [...s.reports, { id: 'rpt_' + Date.now(), ...r }] })),
}));

export default useDailyReportStore;
