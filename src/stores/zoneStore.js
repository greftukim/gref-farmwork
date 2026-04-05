import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { snakeToCamel } from '../lib/dbHelpers';

const useZoneStore = create((set) => ({
  zones: [],
  loading: false,

  fetchZones: async () => {
    set({ loading: true });
    const { data } = await supabase.from('zones').select('*').order('created_at');
    if (data) set({ zones: data.map(snakeToCamel) });
    set({ loading: false });
  },

  addZone: async (zone) => {
    const { data, error } = await supabase.from('zones').insert({
      name: zone.name,
      description: zone.description,
      row_count: zone.rowCount,
      plant_count: zone.plantCount,
    }).select().single();
    if (!error && data) {
      set((s) => ({ zones: [...s.zones, snakeToCamel(data)] }));
    }
  },

  updateZone: async (id, updates) => {
    const row = {};
    if (updates.name !== undefined) row.name = updates.name;
    if (updates.description !== undefined) row.description = updates.description;
    if (updates.rowCount !== undefined) row.row_count = updates.rowCount;
    if (updates.plantCount !== undefined) row.plant_count = updates.plantCount;
    const { data } = await supabase.from('zones').update(row).eq('id', id).select().single();
    if (data) {
      set((s) => ({ zones: s.zones.map((z) => (z.id === id ? snakeToCamel(data) : z)) }));
    }
  },
}));

export default useZoneStore;
