import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { GROWTH_SCHEMA, STANDARD_CURVE as SC_DEFAULT } from '../data/growth';

const CROP_ID_MAP = { '토마토': 'tomato', '오이': 'cucumber', '파프리카': 'paprika' };
const CROP_PREFIX = { '토마토': 'T', '오이': 'C', '파프리카': 'P' };
const CROP_ORDER = ['토마토', '오이', '파프리카'];

const EMPTY_GR_DATA = {
  currentWeek: 1, calendarWeek: '-', date: '-', nextSurvey: '-',
  crops: [], timeseries: {}, markerPlants: [], incidents: [], branches: [],
};

function buildStandardCurve(rows) {
  const result = {};
  for (const row of rows) {
    const cropName = row.crops?.name;
    if (!cropName) continue;
    if (!result[cropName]) result[cropName] = {};
    if (!result[cropName][row.metric_key]) {
      result[cropName][row.metric_key] = new Array(12).fill(null);
    }
    result[cropName][row.metric_key][row.week - 1] = Number(row.target_value);
  }
  return result;
}

function buildMarkerPlants(plants, surveys) {
  return plants.map(p => {
    const cropName = p.crops?.name ?? '';
    const plantSurveys = surveys
      .filter(s => s.marker_plant_id === p.id)
      .sort((a, b) => new Date(b.survey_date) - new Date(a.survey_date));
    const last = plantSurveys.length > 0 ? (plantSurveys[0].measurements || {}) : {};

    const prefix = CROP_PREFIX[cropName] || 'X';
    const num = String(p.marker_number ?? p.plant_no ?? 0).padStart(2, '0');
    const displayId = `${prefix}-${p.bed || '??'}-${num}`;

    return {
      id: displayId,
      dbId: p.id,
      cropId: p.crop_id ?? null,
      crop: cropName,
      branch: p.branch || '',
      bed: p.bed || '',
      row: p.row_label || '',
      no: p.plant_no ?? 0,
      isActive: p.is_active,
      start: p.start_date?.slice(0, 10) ?? '',
      health: p.health === 'warn' ? 'warn' : 'good',
      note: p.note || '',
      last,
    };
  });
}

function buildTimeseries(plants, surveys) {
  const plantCropMap = {};
  for (const p of plants) {
    if (p.crops?.name) plantCropMap[p.id] = p.crops.name;
  }

  const byCropWeek = {};
  for (const s of surveys) {
    const cropName = plantCropMap[s.marker_plant_id];
    if (!cropName || !GROWTH_SCHEMA[cropName]) continue;
    const w = s.week_number;
    if (!w) continue;
    const key = `${cropName}__${w}`;
    if (!byCropWeek[key]) {
      byCropWeek[key] = { cropName, week: w, label: `${w}주차`, _n: 0, weeklyGrowth: 0, leafLen: 0, flowerClusterH: 0, fruitSetCluster: 0, totalFruit: 0, stemDia: 0 };
    }
    const e = byCropWeek[key];
    const m = s.measurements || {};
    e._n++;
    e.weeklyGrowth    += (m.weeklyGrowth    ?? 0);
    e.leafLen         += (m.leafLen         ?? 0);
    e.flowerClusterH  += (m.flowerClusterH  ?? 0);
    e.fruitSetCluster += (m.fruitSetCluster ?? 0);
    e.totalFruit      += (m.totalFruit      ?? 0);
    e.stemDia         += (m.stemDia         ?? 0);
  }

  const result = {};
  for (const entry of Object.values(byCropWeek)) {
    const { cropName, _n, week, label, ...sums } = entry;
    if (!result[cropName]) result[cropName] = [];
    const avg = (v, dec = 0) => _n > 0 ? (dec ? Math.round(v / _n * 10) / 10 : Math.round(v / _n)) : 0;
    result[cropName].push({
      week, label,
      weeklyGrowth:    avg(sums.weeklyGrowth, 1),
      leafLen:         avg(sums.leafLen, 1),
      flowerClusterH:  avg(sums.flowerClusterH),
      fruitSetCluster: avg(sums.fruitSetCluster),
      totalFruit:      avg(sums.totalFruit),
      stemDia:         avg(sums.stemDia, 1),
    });
  }
  for (const arr of Object.values(result)) arr.sort((a, b) => a.week - b.week);
  return result;
}

function buildCrops(plants, surveys, standardCurve, maxWeek) {
  const plantCropMap = {};
  for (const p of plants) {
    if (p.crops?.name) plantCropMap[p.id] = p.crops.name;
  }

  const byCrop = {};
  for (const p of plants) {
    const name = p.crops?.name;
    if (!name || !GROWTH_SCHEMA[name]) continue;
    if (!byCrop[name]) byCrop[name] = { plants: [], latestSurveys: [] };
    byCrop[name].plants.push(p);
  }
  for (const s of surveys) {
    const name = plantCropMap[s.marker_plant_id];
    if (!name || !byCrop[name]) continue;
    if ((s.week_number || 0) === maxWeek) byCrop[name].latestSurveys.push(s);
  }

  const lastSurveyDate = surveys.reduce((max, s) => s.survey_date > (max || '') ? s.survey_date : max, null);

  return CROP_ORDER.filter(n => byCrop[n]).map(name => {
    const { plants: ps, latestSurveys } = byCrop[name];
    const summary = {};
    if (latestSurveys.length > 0) {
      const keys = Object.keys(latestSurveys[0].measurements || {});
      for (const k of keys) {
        const vals = latestSurveys.map(s => s.measurements?.[k]).filter(v => typeof v === 'number');
        if (vals.length > 0) summary[k] = Math.round(vals.reduce((a, b) => a + b, 0) / vals.length * 10) / 10;
      }
    }

    let deviation = 0;
    const curve = standardCurve[name] ?? SC_DEFAULT[name];
    if (curve?.weeklyGrowth && maxWeek > 0 && summary.weeklyGrowth) {
      const target = curve.weeklyGrowth[maxWeek - 1];
      if (target) deviation = Math.round((summary.weeklyGrowth - target) / target * 100);
    }

    return {
      id: CROP_ID_MAP[name] || name,
      name,
      surveyPlants: ps.length,
      health: 90,
      deviation,
      lastSurvey: lastSurveyDate || '-',
      warn: Math.abs(deviation) > 8,
      summary,
    };
  });
}

function calendarWeekNumber(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
  const week1 = new Date(d.getFullYear(), 0, 4);
  return 1 + Math.round(((d - week1) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7);
}

export function useGrowthData() {
  const [result, setResult] = useState({
    grData: EMPTY_GR_DATA,
    schema: GROWTH_SCHEMA,
    standardCurve: SC_DEFAULT,
    loading: true,
  });

  useEffect(() => {
    async function load() {
      try {
        const [scRes, mpRes] = await Promise.all([
          supabase.from('standard_curves').select('*, crops(name)').eq('season', '2026'),
          supabase.from('marker_plants').select('*, crops(name, category)').eq('is_active', true),
        ]);
        if (scRes.error || mpRes.error) throw scRes.error || mpRes.error;

        const dbCurve = buildStandardCurve(scRes.data ?? []);
        const standardCurve = { ...SC_DEFAULT, ...dbCurve };

        let grData = EMPTY_GR_DATA;
        if ((mpRes.data ?? []).length > 0) {
          const plantIds = mpRes.data.map(p => p.id);
          const gsRes = await supabase
            .from('growth_surveys')
            .select('marker_plant_id, survey_date, week_number, measurements')
            .in('marker_plant_id', plantIds)
            .order('survey_date', { ascending: true });

          if (!gsRes.error) {
            const surveys = gsRes.data ?? [];
            const maxWeek = surveys.reduce((m, s) => Math.max(m, s.week_number || 0), 0);
            const lastDate = surveys.reduce((max, s) => s.survey_date > (max || '') ? s.survey_date : max, null);

            const markerPlants = buildMarkerPlants(mpRes.data, surveys);
            const crops = buildCrops(mpRes.data, surveys, standardCurve, maxWeek);
            const timeseries = buildTimeseries(mpRes.data, surveys);

            const cw = calendarWeekNumber(new Date());

            grData = {
              currentWeek: maxWeek || 1,
              calendarWeek: `${cw}주`,
              date: lastDate || '-',
              nextSurvey: '-',
              crops,
              timeseries,
              markerPlants,
              incidents: [],
              branches: [],
            };
          }
        }

        setResult({ grData, schema: GROWTH_SCHEMA, standardCurve, loading: false });
      } catch {
        setResult({ grData: EMPTY_GR_DATA, schema: GROWTH_SCHEMA, standardCurve: SC_DEFAULT, loading: false });
      }
    }
    load();
  }, []);

  return result;
}
