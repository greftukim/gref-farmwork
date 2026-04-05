import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { snakeToCamel } from '../lib/dbHelpers';

const useCropStore = create((set) => ({
  crops: [],
  loading: false,

  fetchCrops: async () => {
    set({ loading: true });
    const { data } = await supabase.from('crops').select('*').order('created_at');
    if (data) set({ crops: data.map(snakeToCamel) });
    set({ loading: false });
  },

  addCrop: async (crop) => {
    const { data, error } = await supabase.from('crops').insert({
      name: crop.name,
      task_types: crop.taskTypes,
      is_active: true,
    }).select().single();
    if (!error && data) {
      set((s) => ({ crops: [...s.crops, snakeToCamel(data)] }));
    }
  },

  updateCrop: async (id, updates) => {
    const row = {};
    if (updates.name !== undefined) row.name = updates.name;
    if (updates.taskTypes !== undefined) row.task_types = updates.taskTypes;
    const { data } = await supabase.from('crops').update(row).eq('id', id).select().single();
    if (data) {
      set((s) => ({ crops: s.crops.map((c) => (c.id === id ? snakeToCamel(data) : c)) }));
    }
  },

  toggleActive: async (id) => {
    const crop = (await supabase.from('crops').select('is_active').eq('id', id).single()).data;
    if (!crop) return;
    const { data } = await supabase.from('crops').update({ is_active: !crop.is_active }).eq('id', id).select().single();
    if (data) {
      set((s) => ({ crops: s.crops.map((c) => (c.id === id ? snakeToCamel(data) : c)) }));
    }
  },
}));

export default useCropStore;
