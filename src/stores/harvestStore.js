import { create } from 'zustand';
import { supabase } from '../lib/supabase';

const useHarvestStore = create((set, get) => ({
  records: [],
  loading: false,
  error: null,

  fetchCurrentMonth: async () => {
    set({ loading: true, error: null });
    const now = new Date();
    const firstOfMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;

    const { data, error } = await supabase
      .from('harvest_records')
      .select(`
        id, date, quantity, unit, employee_id, crop_id,
        employee:employees(id, name, branch),
        crop:crops(id, name)
      `)
      .gte('date', firstOfMonth)
      .order('date', { ascending: false });

    if (error) {
      set({ error, loading: false });
      return;
    }
    set({ records: data || [], loading: false });
  },

  getTotalMonthly: () => {
    const { records } = get();
    return records.reduce((s, r) => s + Number(r.quantity || 0), 0);
  },

  getByBranch: () => {
    const { records } = get();
    return records.reduce((acc, r) => {
      const br = r.employee?.branch || 'unknown';
      acc[br] = (acc[br] || 0) + Number(r.quantity || 0);
      return acc;
    }, {});
  },

  getByCrop: () => {
    const { records } = get();
    return records.reduce((acc, r) => {
      const cropName = r.crop?.name || 'unknown';
      acc[cropName] = (acc[cropName] || 0) + Number(r.quantity || 0);
      return acc;
    }, {});
  },

  // 최근 4주 (현재 주 + 이전 3주), index 0 = 3주 전, 3 = 현재 주
  getByWeek: (filter) => {
    const { records } = get();
    const now = new Date();
    const weeks = [0, 0, 0, 0];

    const src = typeof filter === 'function' ? records.filter(filter) : records;
    src.forEach((r) => {
      const daysAgo = Math.floor((now - new Date(r.date)) / (1000 * 60 * 60 * 24));
      const weekIdx = 3 - Math.min(Math.floor(daysAgo / 7), 3);
      if (weekIdx >= 0 && weekIdx <= 3) {
        weeks[weekIdx] += Number(r.quantity || 0);
      }
    });
    return weeks;
  },

  // 지점 × 작물 2차원 집계: { busan: { '토마토': 3364.8, ... }, jinju: {...}, hadong: {...} }
  getByBranchAndCrop: () => {
    const { records } = get();
    const result = {};
    records.forEach((r) => {
      const br = r.employee?.branch || 'unknown';
      const crop = r.crop?.name || 'unknown';
      if (!result[br]) result[br] = {};
      result[br][crop] = (result[br][crop] || 0) + Number(r.quantity || 0);
    });
    return result;
  },

  // 특정 지점+작물의 최근 30일 일별 추이: [{date, qty}, ...] length=30
  getTrendByBranchCrop: (branch, crop) => {
    const { records } = get();
    const src = records.filter((r) => r.employee?.branch === branch && r.crop?.name === crop);
    const dateMap = {};
    src.forEach((r) => {
      dateMap[r.date] = (dateMap[r.date] || 0) + Number(r.quantity || 0);
    });
    const now = new Date();
    return Array.from({ length: 30 }, (_, i) => {
      const d = new Date(now);
      d.setDate(d.getDate() - (29 - i));
      const key = d.toISOString().split('T')[0];
      return { date: key, qty: Math.round((dateMap[key] || 0) * 10) / 10 };
    });
  },
}));

export default useHarvestStore;
