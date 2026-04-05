import { create } from 'zustand';
import { mockEmployees } from '../lib/mockData';

const useEmployeeStore = create((set, get) => ({
  employees: mockEmployees,

  getActiveEmployees: () => get().employees.filter((e) => e.isActive),
  getWorkers: () => get().employees.filter((e) => e.role === 'worker' && e.isActive),
  getById: (id) => get().employees.find((e) => e.id === id),
}));

export default useEmployeeStore;
