import { create } from 'zustand';
import { mockCrops } from '../lib/mockData';

const useCropStore = create((set, get) => ({
  crops: mockCrops,

  getActiveCrops: () => get().crops.filter((c) => c.isActive),
  getById: (id) => get().crops.find((c) => c.id === id),
}));

export default useCropStore;
