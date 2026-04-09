import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { snakeToCamel } from '../lib/dbHelpers';

const useSafetyCheckStore = create((set, get) => ({
  items: [],
  itemsLoaded: false,

  fetchItems: async () => {
    if (get().itemsLoaded) return get().items;
    const { data, error } = await supabase
      .from('safety_check_items')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true });
    if (error) throw error;
    const items = (data || []).map(snakeToCamel);
    set({ items, itemsLoaded: true });
    return items;
  },

  getTodayCheck: async (workerId, checkType) => {
    const today = new Date().toISOString().slice(0, 10);
    const { data, error } = await supabase
      .from('safety_checks')
      .select('id')
      .eq('worker_id', workerId)
      .eq('date', today)
      .eq('check_type', checkType)
      .maybeSingle();
    if (error) throw error;
    return data;
  },

  saveCheck: async (workerId, date, checkType, itemResults) => {
    const { data: header, error: headerErr } = await supabase
      .from('safety_checks')
      .insert({ worker_id: workerId, date, check_type: checkType })
      .select()
      .single();
    if (headerErr) throw headerErr;

    const rows = itemResults.map((r) => ({
      check_id: header.id,
      item_id: r.itemId,
      checked: r.checked,
    }));
    const { error: rowsErr } = await supabase
      .from('safety_check_results')
      .insert(rows);
    if (rowsErr) {
      await supabase.from('safety_checks').delete().eq('id', header.id);
      throw rowsErr;
    }

    return header;
  },

  /** 관리자용: 일별 전체 조회 */
  fetchByDate: async (date) => {
    const { data, error } = await supabase
      .from('safety_checks')
      .select(`
        id, worker_id, date, check_type, completed_at,
        employees:worker_id ( id, name, branch )
      `)
      .eq('date', date)
      .order('completed_at', { ascending: true });
    if (error) throw error;
    return (data || []).map(snakeToCamel);
  },
}));

export default useSafetyCheckStore;
