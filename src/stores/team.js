import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useTeamStore = create(persist(
  (set) => ({ team: 'farm', setTeam: (t) => set({ team: t }) }),
  { name: 'gref-team' },
));
