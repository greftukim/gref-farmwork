import { create } from 'zustand';
import { mockLeaveRequests, mockLeaveBalances } from '../lib/mockData';

const useLeaveStore = create((set, get) => ({
  requests: [...mockLeaveRequests],
  balances: [...mockLeaveBalances],

  addRequest: (request) => {
    const id = `leave-${Date.now()}`;
    set((state) => ({
      requests: [
        ...state.requests,
        {
          ...request,
          id,
          status: 'pending',
          reviewedBy: null,
          reviewedAt: null,
          createdAt: new Date().toISOString(),
        },
      ],
    }));
  },

  reviewRequest: (requestId, status, reviewerId) => {
    set((state) => ({
      requests: state.requests.map((r) =>
        r.id === requestId
          ? { ...r, status, reviewedBy: reviewerId, reviewedAt: new Date().toISOString() }
          : r
      ),
    }));
    if (status === 'approved') {
      const request = get().requests.find((r) => r.id === requestId);
      if (request) {
        const days = request.type === '연차' ? 1 : 0.5;
        set((state) => ({
          balances: state.balances.map((b) =>
            b.employeeId === request.employeeId && b.year === new Date().getFullYear()
              ? { ...b, usedDays: b.usedDays + days }
              : b
          ),
        }));
      }
    }
  },
}));

export default useLeaveStore;
