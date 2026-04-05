import { create } from 'zustand';
import { mockCalls } from '../lib/mockData';

const useCallStore = create((set) => ({
  calls: [...mockCalls],

  addCall: (call) => {
    const id = `call-${Date.now()}`;
    set((state) => ({
      calls: [...state.calls, {
        ...call,
        id,
        isConfirmed: false,
        confirmedAt: null,
        createdAt: new Date().toISOString(),
      }],
    }));
  },

  confirmCall: (callId) => {
    set((state) => ({
      calls: state.calls.map((c) =>
        c.id === callId ? { ...c, isConfirmed: true, confirmedAt: new Date().toISOString() } : c
      ),
    }));
  },
}));

export default useCallStore;
