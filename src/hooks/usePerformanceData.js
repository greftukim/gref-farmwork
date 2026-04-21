import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export function usePerformanceData() {
  const [sam, setSam] = useState({});

  useEffect(() => {
    async function load() {
      try {
        const res = await supabase
          .from('sam_standards')
          .select('*, crops(name)');

        if (res.error || !res.data.length) return;

        const result = {};
        for (const row of res.data) {
          const cropName = row.crops?.name;
          if (!cropName) continue;
          if (!result[cropName]) result[cropName] = {};
          result[cropName][row.task_type] = Number(row.minutes_per_plant);
        }
        setSam(result);
      } catch {
        // keep fallback
      }
    }
    load();
  }, []);

  return { sam };
}
