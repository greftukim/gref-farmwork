import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { snakeToCamel } from '../lib/dbHelpers';

const useGrowthSurveyItemStore = create((set) => ({
  items: [],
  loading: false,

  fetchItems: async () => {
    set({ loading: true });
    const { data } = await supabase
      .from('growth_survey_items')
      .select('*')
      .order('sort_order')
      .order('created_at');
    if (data) set({ items: data.map(snakeToCamel) });
    set({ loading: false });
  },

  addItem: async (item) => {
    const { data, error } = await supabase
      .from('growth_survey_items')
      .insert({
        crop_id: item.cropId,
        name: item.name,
        unit: item.unit || null,
        input_type: item.inputType || 'number',
        sort_order: item.sortOrder ?? 0,
      })
      .select()
      .single();
    if (!error && data) {
      set((s) => ({ items: [...s.items, snakeToCamel(data)] }));
    }
  },

  updateItem: async (id, changes) => {
    const payload = {};
    if (changes.name !== undefined) payload.name = changes.name;
    if (changes.unit !== undefined) payload.unit = changes.unit;
    if (changes.inputType !== undefined) payload.input_type = changes.inputType;
    if (changes.sortOrder !== undefined) payload.sort_order = changes.sortOrder;
    const { data, error } = await supabase
      .from('growth_survey_items')
      .update(payload)
      .eq('id', id)
      .select()
      .single();
    if (!error && data) {
      set((s) => ({ items: s.items.map((item) => (item.id === id ? snakeToCamel(data) : item)) }));
    }
  },

  deleteItem: async (id) => {
    const { error } = await supabase.from('growth_survey_items').delete().eq('id', id);
    if (!error) {
      set((s) => ({ items: s.items.filter((item) => item.id !== id) }));
    }
  },
}));

export default useGrowthSurveyItemStore;
