import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { GR_DATA, GROWTH_SCHEMA, STANDARD_CURVE } from '../data/growth';

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

function surveyToMetrics(survey) {
  const m = {};
  if (survey.plant_height != null)  m.flowerClusterH  = Number(survey.plant_height);
  if (survey.stem_diameter != null) m.stemDia          = Number(survey.stem_diameter);
  if (survey.leaf_count != null)    m.leafCount        = Number(survey.leaf_count);
  if (survey.truss_number != null)  m.fruitSetCluster  = Number(survey.truss_number);
  if (survey.fruit_count != null)   m.totalFruit       = Number(survey.fruit_count);
  if (survey.measurements && typeof survey.measurements === 'object') {
    Object.assign(m, survey.measurements);
  }
  return m;
}

function buildMarkerPlants(plants, surveys) {
  return plants.map(p => {
    const plantSurveys = surveys
      .filter(s => s.marker_plant_id === p.id)
      .sort((a, b) => new Date(b.survey_date) - new Date(a.survey_date));
    const last = plantSurveys.length > 0 ? surveyToMetrics(plantSurveys[0]) : {};
    return {
      id: p.id,
      crop: p.crops?.name ?? '',
      house: p.greenhouses?.code ?? '',
      gol: p.gol,
      plantNo: p.plant_no,
      label: p.label,
      bed: p.label,
      row: '',
      no: p.plant_no,
      isActive: p.is_active,
      start: p.created_at?.slice(0, 10) ?? '',
      health: 'good',
      last,
    };
  });
}

export function useGrowthData() {
  const [result, setResult] = useState({
    grData: GR_DATA,
    schema: GROWTH_SCHEMA,
    standardCurve: STANDARD_CURVE,
    loading: true,
  });

  useEffect(() => {
    async function load() {
      try {
        const [scRes, mpRes] = await Promise.all([
          supabase
            .from('standard_curves')
            .select('*, crops(name)')
            .eq('season', '2026'),
          supabase
            .from('marker_plants')
            .select('*, greenhouses(code), crops(name)')
            .eq('is_active', true),
        ]);

        if (scRes.error || mpRes.error) throw scRes.error || mpRes.error;

        const standardCurve = scRes.data.length > 0
          ? buildStandardCurve(scRes.data)
          : STANDARD_CURVE;

        let grData = GR_DATA;
        if (mpRes.data.length > 0) {
          const plantIds = mpRes.data.map(p => p.id);
          const gsRes = await supabase
            .from('growth_surveys')
            .select('*')
            .in('marker_plant_id', plantIds)
            .order('survey_date', { ascending: false });

          if (!gsRes.error) {
            const markerPlants = buildMarkerPlants(mpRes.data, gsRes.data ?? []);
            grData = {
              ...GR_DATA,
              markerPlants: markerPlants.length > 0 ? markerPlants : GR_DATA.markerPlants,
            };
          }
        }

        setResult({ grData, schema: GROWTH_SCHEMA, standardCurve, loading: false });
      } catch {
        setResult({ grData: GR_DATA, schema: GROWTH_SCHEMA, standardCurve: STANDARD_CURVE, loading: false });
      }
    }
    load();
  }, []);

  return result;
}
