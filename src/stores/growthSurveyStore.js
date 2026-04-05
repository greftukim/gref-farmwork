import { create } from 'zustand';
import { mockGrowthSurveys } from '../lib/mockData';

const useGrowthSurveyStore = create((set) => ({
  surveys: [...mockGrowthSurveys],

  addSurvey: (survey) => {
    const id = `gs-${Date.now()}`;
    set((state) => ({
      surveys: [...state.surveys, { ...survey, id }],
    }));
  },
}));

export default useGrowthSurveyStore;
