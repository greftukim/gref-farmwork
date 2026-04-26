import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

const BRANCH_COLOR = {
  busan: '#4F46E5',
  jinju: '#059669',
  hadong: '#D97706',
};

const AVATAR_CYCLE = ['rose', 'blue', 'emerald', 'amber', 'slate'];

function getISOWeek(dateStr) {
  const d = new Date(dateStr);
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

export function usePerformanceData(dateFrom = null, dateTo = null) {
  const [sam, setSam] = useState({});
  const [workers, setWorkers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        // 1. SAM standards
        const samRes = await supabase.from('sam_standards').select('*, crops(name)');
        if (!samRes.error && samRes.data?.length) {
          const result = {};
          for (const row of samRes.data) {
            const cropName = row.crops?.name;
            if (!cropName) continue;
            if (!result[cropName]) result[cropName] = {};
            result[cropName][row.task_type] = Number(row.minutes_per_plant);
          }
          setSam(result);
        }

        // 2. Active employees (worker + farm_admin)
        const empRes = await supabase
          .from('employees')
          .select('id, name, role, branch, is_active, created_at')
          .in('role', ['farm_admin', 'worker'])
          .eq('is_active', true);

        // 3. Harvest records — 날짜 필터 적용 (null이면 전체 기간)
        let harvestQuery = supabase
          .from('harvest_records')
          .select('employee_id, crop_id, date, quantity, crops(name)');
        if (dateFrom) harvestQuery = harvestQuery.gte('date', dateFrom);
        if (dateTo)   harvestQuery = harvestQuery.lte('date', dateTo);
        const harvestRes = await harvestQuery;

        // 4. Task speed data (전체 기간 — tasks에 date 컬럼 없음)
        const tasksRes = await supabase
          .from('tasks')
          .select('worker_id, duration_minutes, quantity')
          .not('duration_minutes', 'is', null)
          .not('quantity', 'is', null);

        if (!empRes.data || !harvestRes.data) {
          setLoading(false);
          return;
        }

        // Build harvest aggregates
        const records = harvestRes.data;
        const byEmp = {};

        for (const r of records) {
          if (!r.employee_id) continue;
          if (!byEmp[r.employee_id]) {
            byEmp[r.employee_id] = { totalKg: 0, dates: new Set(), cropKg: {}, weekKg: {} };
          }
          const qty = Number(r.quantity) || 0;
          byEmp[r.employee_id].totalKg += qty;
          if (r.date) byEmp[r.employee_id].dates.add(r.date);
          const cropName = r.crops?.name || '기타';
          byEmp[r.employee_id].cropKg[cropName] =
            (byEmp[r.employee_id].cropKg[cropName] || 0) + qty;
          if (r.date) {
            const wk = getISOWeek(r.date);
            byEmp[r.employee_id].weekKg[wk] = (byEmp[r.employee_id].weekKg[wk] || 0) + qty;
          }
        }

        // Build task speed aggregates: totalQty / totalDur per worker
        const tasksByEmp = {};
        if (tasksRes.data) {
          for (const t of tasksRes.data) {
            if (!t.worker_id || !t.duration_minutes) continue;
            if (!tasksByEmp[t.worker_id]) tasksByEmp[t.worker_id] = { totalQty: 0, totalDur: 0 };
            tasksByEmp[t.worker_id].totalQty += Number(t.quantity) || 0;
            tasksByEmp[t.worker_id].totalDur += Number(t.duration_minutes) || 0;
          }
        }

        // Normalize speed to 100 (global average = 100)
        const speedRates = Object.entries(tasksByEmp)
          .filter(([, d]) => d.totalDur > 0)
          .map(([id, d]) => ({ id, rate: d.totalQty / d.totalDur }));
        const avgSpeed = speedRates.length > 0
          ? speedRates.reduce((s, w) => s + w.rate, 0) / speedRates.length : 1;
        const speedMap = Object.fromEntries(
          speedRates.map(({ id, rate }) => [id, Math.round((rate / avgSpeed) * 100)])
        );

        const totals = Object.values(byEmp).map(e => e.totalKg).filter(t => t > 0);
        const avgTotal = totals.length > 0 ? totals.reduce((a, b) => a + b, 0) / totals.length : 1;

        const allWeekNums = [
          ...new Set(
            records
              .map(r => (r.date ? getISOWeek(r.date) : null))
              .filter(Boolean)
          ),
        ].sort((a, b) => a - b);
        const last5Weeks = allWeekNums.slice(-5);

        const workersData = empRes.data
          .filter(e => byEmp[e.id])
          .map((emp, idx) => {
            const d = byEmp[emp.id];
            const harvestPct = Math.round((d.totalKg / avgTotal) * 100);
            const attendance = Math.min(100, Math.round((d.dates.size / 30) * 100));

            const topCrop =
              Object.entries(d.cropKg).sort((a, b) => b[1] - a[1])[0]?.[0] || '토마토';

            const weekValues = Object.values(d.weekKg);
            const stemsWeek =
              weekValues.length > 0
                ? Math.round(weekValues.reduce((a, b) => a + b, 0) / weekValues.length)
                : 0;

            const myWeekAvg = stemsWeek || 1;
            const weeklyTrend = last5Weeks.map(wk => {
              const kg = Math.round(d.weekKg[wk] || 0);
              const relPct = Math.round((kg / myWeekAvg) * 100);
              return { w: `${wk}주`, eff: relPct, harv: Math.round(relPct * 0.95), kg };
            });

            const joined = emp.created_at
              ? `${emp.created_at.slice(0, 4)}.${emp.created_at.slice(5, 7)}`
              : '미상';
            const branch = emp.branch || 'busan';
            const speedPct = speedMap[emp.id] || 0;
            const tier = speedPct >= 110 ? 'top' : speedPct >= 85 ? 'mid' : speedPct > 0 ? 'low' : null;

            return {
              id: emp.id,
              name: emp.name,
              branch,
              bc: BRANCH_COLOR[branch] || BRANCH_COLOR.busan,
              role: emp.role === 'farm_admin' ? '관리자' : '작업자',
              crop: topCrop,
              joined,
              avatar: AVATAR_CYCLE[idx % AVATAR_CYCLE.length],
              efficiency: harvestPct,
              harvestPct,
              speedPct,
              tier,
              stemsWeek,
              attendance,
              pinned: speedPct >= 110,
              warn: speedPct > 0 && speedPct < 85,
              weeklyTrend,
            };
          });

        setWorkers(workersData);
      } catch {
        // keep empty state
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [dateFrom, dateTo]);

  return { sam, workers, loading };
}
