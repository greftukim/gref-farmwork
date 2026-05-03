// 트랙 77 후속 U20 — 작기 (zone_crops) + 자유 이벤트 (zone_crop_events) 통합 store
// G77-MMM: zoneCropEventStore 단일 파일 통합.
//
// LESSONS 147 추종 — nested resource (events)는 별도 .map(snakeToCamel) 필요.

import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { snakeToCamel } from '../lib/dbHelpers';

function camelizeRow(row) {
  if (!row) return row;
  const camel = snakeToCamel(row);
  // events join — nested resource
  if (Array.isArray(row.events)) {
    camel.events = row.events.map(snakeToCamel);
  }
  // crops join (FK)
  if (row.crops) camel.crops = snakeToCamel(row.crops);
  return camel;
}

const useZoneCropStore = create((set, get) => ({
  zoneCrops: [],
  loading: false,
  activeOnly: true,

  setActiveOnly: (v) => set({ activeOnly: v }),

  fetchZoneCrops: async (opts = {}) => {
    set({ loading: true });
    const activeOnly = opts.activeOnly ?? get().activeOnly;
    let query = supabase
      .from('zone_crops')
      .select('*, crops(id, name, category, is_active), events:zone_crop_events(*)')
      .order('started_at', { ascending: false, nullsFirst: false });
    if (activeOnly) query = query.is('ended_at', null);
    const { data, error } = await query;
    if (error) {
      console.error('[zoneCropStore.fetchZoneCrops]', error);
      set({ loading: false });
      return;
    }
    if (data) {
      set({
        zoneCrops: data.map(camelizeRow),
        activeOnly,
      });
    }
    set({ loading: false });
  },

  addZoneCrop: async (payload) => {
    const row = {
      zone_id: payload.zoneId,
      crop_id: payload.cropId,
      cultivar: payload.cultivar ?? null,
      season_label: payload.seasonLabel ?? null,
      started_at: payload.startedAt ?? null,
      ended_at: null,
      rows_per_bay: payload.rowsPerBay ?? null,
      slab_length_cm: payload.slabLengthCm ?? null,
      slab_width_cm: payload.slabWidthCm ?? null,
      slab_height_cm: payload.slabHeightCm ?? null,
      plants_per_slab: payload.plantsPerSlab ?? null,
      stems_per_plant: payload.stemsPerPlant ?? null,
      slab_gap_cm: payload.slabGapCm ?? null,
      notes: payload.notes ?? null,
    };
    const { data, error } = await supabase
      .from('zone_crops')
      .insert(row)
      .select('*, crops(id, name, category, is_active), events:zone_crop_events(*)')
      .single();
    if (error) throw error;
    const camel = camelizeRow(data);
    set((s) => ({ zoneCrops: [camel, ...s.zoneCrops] }));
    return camel;
  },

  updateZoneCrop: async (id, updates) => {
    const row = {};
    const map = {
      cropId: 'crop_id',
      cultivar: 'cultivar',
      seasonLabel: 'season_label',
      startedAt: 'started_at',
      endedAt: 'ended_at',
      rowsPerBay: 'rows_per_bay',
      slabLengthCm: 'slab_length_cm',
      slabWidthCm: 'slab_width_cm',
      slabHeightCm: 'slab_height_cm',
      plantsPerSlab: 'plants_per_slab',
      stemsPerPlant: 'stems_per_plant',
      slabGapCm: 'slab_gap_cm',
      notes: 'notes',
    };
    for (const [k, v] of Object.entries(updates)) {
      if (map[k] && v !== undefined) row[map[k]] = v;
    }
    row.updated_at = new Date().toISOString();
    const { data, error } = await supabase
      .from('zone_crops')
      .update(row)
      .eq('id', id)
      .select('*, crops(id, name, category, is_active), events:zone_crop_events(*)')
      .single();
    if (error) throw error;
    const camel = camelizeRow(data);
    set((s) => ({ zoneCrops: s.zoneCrops.map((z) => (z.id === id ? camel : z)) }));
    return camel;
  },

  endZoneCrop: async (id, endedAt) => {
    return get().updateZoneCrop(id, { endedAt: endedAt || new Date().toISOString().slice(0, 10) });
  },

  deleteZoneCrop: async (id) => {
    const { error } = await supabase.from('zone_crops').delete().eq('id', id);
    if (error) throw error;
    set((s) => ({ zoneCrops: s.zoneCrops.filter((z) => z.id !== id) }));
  },

  // ─── events ─────────────────────────────────────────────────────────
  addEvent: async (zoneCropId, payload) => {
    const row = {
      zone_crop_id: zoneCropId,
      event_type: payload.eventType ?? 'custom',
      event_label: payload.eventLabel,
      event_date: payload.eventDate,
      notes: payload.notes ?? null,
      created_by: payload.createdBy ?? null,
    };
    const { data, error } = await supabase.from('zone_crop_events').insert(row).select().single();
    if (error) throw error;
    const camel = snakeToCamel(data);
    set((s) => ({
      zoneCrops: s.zoneCrops.map((z) =>
        z.id === zoneCropId ? { ...z, events: [...(z.events || []), camel] } : z
      ),
    }));
    return camel;
  },

  updateEvent: async (zoneCropId, eventId, updates) => {
    const row = {};
    if (updates.eventType !== undefined) row.event_type = updates.eventType;
    if (updates.eventLabel !== undefined) row.event_label = updates.eventLabel;
    if (updates.eventDate !== undefined) row.event_date = updates.eventDate;
    if (updates.notes !== undefined) row.notes = updates.notes;
    const { data, error } = await supabase
      .from('zone_crop_events')
      .update(row)
      .eq('id', eventId)
      .select()
      .single();
    if (error) throw error;
    const camel = snakeToCamel(data);
    set((s) => ({
      zoneCrops: s.zoneCrops.map((z) =>
        z.id === zoneCropId
          ? { ...z, events: (z.events || []).map((e) => (e.id === eventId ? camel : e)) }
          : z
      ),
    }));
    return camel;
  },

  deleteEvent: async (zoneCropId, eventId) => {
    const { error } = await supabase.from('zone_crop_events').delete().eq('id', eventId);
    if (error) throw error;
    set((s) => ({
      zoneCrops: s.zoneCrops.map((z) =>
        z.id === zoneCropId
          ? { ...z, events: (z.events || []).filter((e) => e.id !== eventId) }
          : z
      ),
    }));
  },
}));

export default useZoneCropStore;
