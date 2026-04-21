import { create } from 'zustand';

const useQrCodeStore = create((set) => ({
  codes: [],
  addCode: (c) => set((s) => ({ codes: [...s.codes, c] })),
  removeCode: (id) => set((s) => ({ codes: s.codes.filter((c) => c.id !== id) })),
}));

export default useQrCodeStore;
