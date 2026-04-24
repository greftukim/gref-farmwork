import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { snakeToCamel } from '../lib/dbHelpers';

const useGrowthSurveyStore = create((set) => ({
  surveys: [],
  loading: false,

  fetchSurveys: async () => {
    set({ loading: true });
    const { data } = await supabase.from('growth_surveys').select('*').order('survey_date', { ascending: false });
    if (data) set({ surveys: data.map(snakeToCamel) });
    set({ loading: false });
  },

  addSurvey: async (survey) => {
    const { data, error } = await supabase.from('growth_surveys').insert({
      marker_plant_id: survey.markerPlantId || null,
      week_number: survey.weekNumber || null,
      worker_id: survey.workerId || null,
      survey_date: survey.surveyDate,
      crop_id: survey.cropId || null,
      zone_id: survey.zoneId || null,
      row_number: survey.rowNumber,
      plant_number: survey.plantNumber,
      measurements: survey.measurements || null,
      compartment: survey.compartment ?? null,
      gutter_number: survey.gutterNumber ?? null,
      position_number: survey.positionNumber ?? null,
      // 기존 컬럼 유지 (호환성)
      plant_height: survey.plantHeight || null,
      stem_diameter: survey.stemDiameter || null,
      leaf_count: survey.leafCount || null,
      truss_number: survey.trussNumber || null,
      fruit_count: survey.fruitCount || null,
      fruit_weight: survey.fruitWeight || null,
      notes: survey.notes || '',
      photos: survey.photos || [],
    }).select().single();
    if (!error && data) {
      set((s) => ({ surveys: [...s.surveys, snakeToCamel(data)] }));
    }
  },
}));

export default useGrowthSurveyStore;
