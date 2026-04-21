import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

const WORKER_COLORS = [
  '#6366F1','#10B981','#F59E0B','#EF4444','#3B82F6','#8B5CF6',
  '#EC4899','#14B8A6','#F97316','#84CC16','#06B6D4','#E11D48',
];

const TASK_TYPES = {
  pruning:  { label: '적엽', color: '#10B981', abbr: '적엽', speedSecPerM: 38 },
  training: { label: '유인', color: '#3B82F6', abbr: '유인', speedSecPerM: 48 },
  harvest:  { label: '수확', color: '#F59E0B', abbr: '수확', speedSecPerM: 30 },
  sorting:  { label: '선별', color: '#8B5CF6', abbr: '선별', speedSecPerM: 42 },
  planting: { label: '정식', color: '#EC4899', abbr: '정식', speedSecPerM: 55 },
};

const EMPTY_FIELD_STATE = { timestamp: '-', gols: [] };

const EMPTY_DATA = {
  HOUSE_CONFIG: [],
  WORKERS_MAP: [],
  WORKER_SPEED_FACTOR: {},
  FIELD_STATE: EMPTY_FIELD_STATE,
  TASK_TYPES,
  GOL_LENGTH_M: 20,
  ACTIVE_ASSIGNMENTS: [],
};

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
          : [];

        const hasEmployees = !empRes.error && empRes.data.length > 0;
        const hasScans = !scanRes.error && scanRes.data.length > 0;
        const useRealWorkers = hasEmployees && hasScans;

        const workersMap = useRealWorkers
          ? empRes.data.map((e, i) => ({
              id: e.id,
              name: e.name,
              role: e.role,
              color: WORKER_COLORS[i % WORKER_COLORS.length],
            }))
          : [];

        const workerSpeedFactor = useRealWorkers
          ? Object.fromEntries(empRes.data.map(e => [e.id, e.speed_factor ?? 1.0]))
          : {};

        const fieldState = hasScans && useRealWorkers
          ? buildFieldStateFromScans(scanRes.data, ghRes.data)
          : EMPTY_FIELD_STATE;

        const golLengthM = ghRes.data[0]?.gol_length_m ?? 20;

        setData({
          HOUSE_CONFIG: houseConfig,
          WORKERS_MAP: workersMap,
          WORKER_SPEED_FACTOR: workerSpeedFactor,
          FIELD_STATE: fieldState,
          TASK_TYPES,
          GOL_LENGTH_M: golLengthM,
          ACTIVE_ASSIGNMENTS: [],
        });
      } catch (err) {
        console.error('[useFloorData]', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return { data: data ?? EMPTY_DATA, loading };
}
