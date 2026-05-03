// 트랙 77 후속 U20 — 동별 물리 구조 (zone_specs, 1동 1행, 영구 자산)
// upsert 패턴: zone_id PK + ON CONFLICT DO UPDATE

import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { snakeToCamel } from '../lib/dbHelpers';

const useZoneSpecStore = create((set) => ({
  specs: [],
  loading: false,

  fetchSpecs: async () => {
    set({ loading: true });
    const { data, error } = await supabase.from('zone_specs').select('*');
    if (error) {
      console.error('[zoneSpecStore.fetchSpecs]', error);
      set({ loading: false });
      return;
    }
    if (data) set({ specs: data.map(snakeToCamel) });
    set({ loading: false });
  },

  upsertSpec: async (zoneId, payload) => {
    const row = {
      zone_id: zoneId,
      bay_length_m: payload.bayLengthM ?? null,
      bay_count: payload.bayCount ?? null,
      bay_width_m: payload.bayWidthM ?? null,
      bay_width_count: payload.bayWidthCount ?? null,
      corridor_width_m: payload.corridorWidthM ?? null,
      corridor_count: payload.corridorCount ?? null,
      notes: payload.notes ?? null,
      updated_at: new Date().toISOString(),
    };
    const { data, error } = await supabase
      .from('zone_specs')
      .upsert(row, { onConflict: 'zone_id' })
      .select()
      .single();
    if (error) throw error;
    if (data) {
      const camel = snakeToCamel(data);
      set((s) => {
        const exists = s.specs.some((sp) => sp.zoneId === zoneId);
        return {
          specs: exists
            ? s.specs.map((sp) => (sp.zoneId === zoneId ? camel : sp))
            : [...s.specs, camel],
        };
      });
    }
    return data;
  },
}));

export default useZoneSpecStore;
