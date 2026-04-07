import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { snakeToCamel } from '../lib/dbHelpers';

const useBranchStore = create((set) => ({
  branches: [],
  selectedBranch: 'all',
  loading: false,

  fetchBranches: async () => {
    set({ loading: true });
    const { data } = await supabase.from('branches').select('*').order('created_at');
    if (data) set({ branches: data.map(snakeToCamel) });
    set({ loading: false });
  },

  setSelectedBranch: (branchId) => set({ selectedBranch: branchId }),

  addBranch: async (branch) => {
    const { data, error } = await supabase.from('branches').insert({
      code: branch.code,
      name: branch.name,
      latitude: branch.latitude || null,
      longitude: branch.longitude || null,
      radius_meters: branch.radiusMeters || 200,
    }).select().single();
    if (!error && data) {
      set((s) => ({ branches: [...s.branches, snakeToCamel(data)] }));
    }
    return { error };
  },

  updateBranch: async (id, updates) => {
    const row = {};
    if (updates.latitude !== undefined) row.latitude = updates.latitude;
    if (updates.longitude !== undefined) row.longitude = updates.longitude;
    if (updates.radiusMeters !== undefined) row.radius_meters = updates.radiusMeters;
    if (updates.name !== undefined) row.name = updates.name;

    const { data, error } = await supabase.from('branches').update(row).eq('id', id).select().single();
    if (!error && data) {
      set((s) => ({ branches: s.branches.map((b) => (b.id === id ? snakeToCamel(data) : b)) }));
    }
  },

  deleteBranch: async (id) => {
    const { error } = await supabase.from('branches').delete().eq('id', id);
    if (!error) {
      set((s) => ({ branches: s.branches.filter((b) => b.id !== id) }));
    }
    return { error };
  },
}));

export default useBranchStore;
