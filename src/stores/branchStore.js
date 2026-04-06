import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { snakeToCamel } from '../lib/dbHelpers';

const useBranchStore = create((set) => ({
  branches: [],
  selectedBranch: 'all', // 'all' | branch id
  loading: false,

  fetchBranches: async () => {
    set({ loading: true });
    const { data } = await supabase.from('branches').select('*').order('created_at');
    if (data) set({ branches: data.map(snakeToCamel) });
    set({ loading: false });
  },

  setSelectedBranch: (branchId) => set({ selectedBranch: branchId }),
}));

export default useBranchStore;
