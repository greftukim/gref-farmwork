import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import * as FALLBACK from '../data/floor';

const WORKER_COLORS = [
  '#6366F1','#10B981','#F59E0B','#EF4444','#3B82F6','#8B5CF6',
  '#EC4899','#14B8A6','#F97316','#84CC16','#06B6D4','#E11D48',
];

function buildFieldStateFromScans(scans, greenhouses) {
  const ghMap = Object.fromEntries(greenhouses.map(g => [g.id, g.code]));
  const golMap = {};

  for (const scan of scans) {
    if (!scan.qr_codes) continue;
    const houseCode = ghMap[scan.qr_codes.greenhouse_id];
    if (!houseCode) continue;
    const key = `${houseCode}-${scan.qr_codes.gol}`;
    if (!golMap[key]) golMap[key] = { house: houseCode, gol: scan.qr_codes.gol, scans: [] };
    golMap[key].scans.push(scan);
  }

  const gols = Object.values(golMap).map(({ house, gol, scans: s }) => {
    const sorted = [...s].sort((a, b) => new Date(a.scanned_at) - new Date(b.scanned_at));

    let progress = 0;
    let currentWorker = null;
    let lastScan = null;

    for (const sc of sorted) {
      if (sc.scan_type === 'start') {
        currentWorker = sc.employee_id;
        lastScan = sc.qr_codes.side;
        progress = 0;
      } else if (sc.scan_type === 'half') {
        lastScan = 'B';
        progress = 50;
      } else if (sc.scan_type === 'complete') {
        progress = 100;
        currentWorker = null;
        lastScan = 'F-again';
      } else if (sc.scan_type === 'switch') {
        currentWorker = sc.employee_id;
      }
    }

    const startScan = sorted.find(sc => sc.scan_type === 'start');
    const startedAt = startScan
      ? new Date(startScan.scanned_at).toTimeString().slice(0, 5)
      : null;

    return {
      house,
      gol,
      progress,
      currentWorker,
      taskType: null,
      lastScan,
      startedAt,
      completedAt: null,
      completedBy: null,
      hasIssue: false,
      pausedAt: null,
      pauseTotalMin: 0,
      pauseHistory: [],
      scanHistory: sorted.map(sc => ({
        at: new Date(sc.scanned_at).toTimeString().slice(0, 5),
        side: sc.qr_codes.side,
        by: sc.employee_id,
      })),
    };
  });

  return {
    timestamp: new Date().toISOString().slice(0, 16).replace('T', ' '),
    gols,
  };
}

export function useFloorData() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const todayISO = new Date().toISOString().split('T')[0];
        const [ghRes, empRes, scanRes] = await Promise.all([
          supabase
            .from('greenhouses')
            .select('*, crops(name)')
            .eq('branch', 'busan')
            .eq('is_active', true)
            .order('code'),
          supabase
            .from('employees')
            .select('id, name, role, speed_factor')
            .eq('branch', 'busan')
            .eq('is_active', true),
          supabase
            .from('qr_scans')
            .select('*, qr_codes(gol, side, greenhouse_id)')
            .gte('scanned_at', todayISO)
            .order('scanned_at', { ascending: false })
            .limit(200),
        ]);

        if (ghRes.error) throw ghRes.error;

        // HOUSE_CONFIG from DB
        const houseConfig = ghRes.data.length > 0
          ? ghRes.data.map(h => ({
              id: h.code,
              name: h.name,
              crop: h.crops?.name ?? '',
              gutters: h.gutters,
              gols: h.gols,
              hasRightGol: h.has_right_gol,
              hanging: h.is_hanging,
              golLengthM: h.gol_length_m ?? 20,
            }))
          : FALLBACK.HOUSE_CONFIG;

        // WORKERS_MAP + WORKER_SPEED_FACTOR from DB employees
        const hasEmployees = !empRes.error && empRes.data.length > 0;
        const hasScans = !scanRes.error && scanRes.data.length > 0;

        // WORKERS_MAP and FIELD_STATE must share the same IDs
        const useRealWorkers = hasEmployees && hasScans;

        const workersMap = useRealWorkers
          ? empRes.data.map((e, i) => ({
              id: e.id,
              name: e.name,
              role: e.role,
              color: WORKER_COLORS[i % WORKER_COLORS.length],
            }))
          : FALLBACK.WORKERS_MAP;

        const workerSpeedFactor = useRealWorkers
          ? Object.fromEntries(empRes.data.map(e => [e.id, e.speed_factor ?? 1.0]))
          : FALLBACK.WORKER_SPEED_FACTOR;

        const fieldState = hasScans && useRealWorkers
          ? buildFieldStateFromScans(scanRes.data, ghRes.data)
          : FALLBACK.FIELD_STATE;

        setData({
          HOUSE_CONFIG: houseConfig,
          WORKERS_MAP: workersMap,
          WORKER_SPEED_FACTOR: workerSpeedFactor,
          FIELD_STATE: fieldState,
          TASK_TYPES: FALLBACK.TASK_TYPES,
          GOL_LENGTH_M: FALLBACK.GOL_LENGTH_M,
          ACTIVE_ASSIGNMENTS: FALLBACK.ACTIVE_ASSIGNMENTS,
        });
      } catch (err) {
        console.error('[useFloorData]', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const resolved = data ?? {
    HOUSE_CONFIG: FALLBACK.HOUSE_CONFIG,
    WORKERS_MAP: FALLBACK.WORKERS_MAP,
    WORKER_SPEED_FACTOR: FALLBACK.WORKER_SPEED_FACTOR,
    FIELD_STATE: FALLBACK.FIELD_STATE,
    TASK_TYPES: FALLBACK.TASK_TYPES,
    GOL_LENGTH_M: FALLBACK.GOL_LENGTH_M,
    ACTIVE_ASSIGNMENTS: FALLBACK.ACTIVE_ASSIGNMENTS,
  };

  return { data: resolved, loading };
}
