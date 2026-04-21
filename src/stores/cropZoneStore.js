import { create } from 'zustand';

const useCropZoneStore = create((set) => ({
  crops: [],
  zones: [],
  addCrop: (crop) => set((s) => ({ crops: [...s.crops, { id: 'crop_' + Date.now(), ...crop }] })),
  removeCrop: (id) => set((s) => ({ crops: s.crops.filter((c) => c.id !== id) })),
  addZone: (zone) => set((s) => ({ zones: [...s.zones, { id: 'zone_' + Date.now(), ...zone }] })),
  removeZone: (id) => set((s) => ({ zones: s.zones.filter((z) => z.id !== id) })),
}));

export default useCropZoneStore;
