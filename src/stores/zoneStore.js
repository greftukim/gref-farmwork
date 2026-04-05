import { create } from 'zustand';
import { mockZones } from '../lib/mockData';

const useZoneStore = create((set, get) => ({
  zones: mockZones,

  getById: (id) => get().zones.find((z) => z.id === id),
}));

export default useZoneStore;
