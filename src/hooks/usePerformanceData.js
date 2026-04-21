import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

const SAM_FALLBACK = {
  '토마토':     { 정식: 0.30, 유인: 0.24, 적엽: 0.18, 적화: 0.22, 적과: 0.20, 수확: 0.28, '줄 내리기': 0.12, 측지제거: 0.16, '선별·포장': 0.15, 방제: 0.08 },
  '딸기':       { 정식: 0.28, 유인: 0.20, 적엽: 0.14, 적화: 0.18, 적과: 0.18, 수확: 0.24, '줄 내리기': 0.10, 측지제거: 0.14, '선별·포장': 0.18, 방제: 0.08 },
  '파프리카':   { 정식: 0.32, 유인: 0.26, 적엽: 0.20, 적화: 0.22, 적과: 0.22, 수확: 0.30, '줄 내리기': 0.14, 측지제거: 0.18, '선별·포장': 0.16, 방제: 0.09 },
  '오이':       { 정식: 0.30, 유인: 0.28, 적엽: 0.22, 적화: 0.20, 적과: 0.20, 수확: 0.26, '줄 내리기': 0.14, 측지제거: 0.20, '선별·포장': 0.14, 방제: 0.08 },
  '애호박':     { 정식: 0.32, 유인: 0.26, 적엽: 0.22, 적화: 0.22, 적과: 0.22, 수확: 0.30, '줄 내리기': 0.14, 측지제거: 0.18, '선별·포장': 0.18, 방제: 0.09 },
  '방울토마토': { 정식: 0.28, 유인: 0.22, 적엽: 0.16, 적화: 0.20, 적과: 0.18, 수확: 0.32, '줄 내리기': 0.11, 측지제거: 0.15, '선별·포장': 0.20, 방제: 0.08 },
  '고추':       { 정식: 0.26, 유인: 0.20, 적엽: 0.14, 적화: 0.18, 적과: 0.18, 수확: 0.26, '줄 내리기': 0.10, 측지제거: 0.14, '선별·포장': 0.14, 방제: 0.08 },
};

export function usePerformanceData() {
  const [sam, setSam] = useState(SAM_FALLBACK);

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
