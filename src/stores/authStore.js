import { create } from 'zustand';
import { mockEmployees } from '../lib/mockData';

const useAuthStore = create((set) => ({
  currentUser: null,
  isAuthenticated: false,

  login: (employeeId, pin) => {
    const employee = mockEmployees.find(
      (e) => e.id === employeeId && e.pinCode === pin && e.isActive
    );
    if (employee) {
      set({ currentUser: employee, isAuthenticated: true });
      return { success: true, role: employee.role };
    }
    return { success: false };
  },

  logout: () => {
    set({ currentUser: null, isAuthenticated: false });
  },
}));

export default useAuthStore;
