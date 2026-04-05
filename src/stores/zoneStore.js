import { create } from 'zustand';
import { mockZones } from '../lib/mockData';

const useZoneStore = create((set) => ({
  zones: [...mockZones],

  addZone: (zone) => {
    const id = `zone-${Date.now()}`;
    set((state) => ({
      zones: [...state.zones, { ...zone, id }],
    }));
  },

  updateZone: (id, updates) => {
    set((state) => ({
      zones: state.zones.map((z) => (z.id === id ? { ...z, ...updates } : z)),
    }));
  },
}));

export default useZoneStore;
