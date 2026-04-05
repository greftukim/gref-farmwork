import { create } from 'zustand';
import { mockCrops } from '../lib/mockData';

const useCropStore = create((set) => ({
  crops: [...mockCrops],

  addCrop: (crop) => {
    const id = `crop-${Date.now()}`;
    set((state) => ({
      crops: [...state.crops, { ...crop, id, isActive: true }],
    }));
  },

  updateCrop: (id, updates) => {
    set((state) => ({
      crops: state.crops.map((c) => (c.id === id ? { ...c, ...updates } : c)),
    }));
  },

  toggleActive: (id) => {
    set((state) => ({
      crops: state.crops.map((c) => (c.id === id ? { ...c, isActive: !c.isActive } : c)),
    }));
  },
}));

export default useCropStore;
