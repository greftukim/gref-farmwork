import { create } from 'zustand';

const usePerformanceStore = create(() => ({
  performance: [],
}));

export default usePerformanceStore;
