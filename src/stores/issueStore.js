import { create } from 'zustand';
import { mockIssues } from '../lib/mockData';

const useIssueStore = create((set) => ({
  issues: [...mockIssues],

  addIssue: (issue) => {
    const id = `issue-${Date.now()}`;
    set((state) => ({
      issues: [...state.issues, {
        ...issue,
        id,
        isResolved: false,
        resolvedBy: null,
        resolvedAt: null,
        createdAt: new Date().toISOString(),
      }],
    }));
  },

  resolveIssue: (issueId, resolverId) => {
    set((state) => ({
      issues: state.issues.map((i) =>
        i.id === issueId
          ? { ...i, isResolved: true, resolvedBy: resolverId, resolvedAt: new Date().toISOString() }
          : i
      ),
    }));
  },
}));

export default useIssueStore;
