import { create } from 'zustand';
import { mockEmployees } from '../lib/mockData';

const useEmployeeStore = create((set) => ({
  employees: [...mockEmployees],

  addEmployee: (employee) => {
    const id = `emp-${Date.now()}`;
    const empNo = employee.role === 'admin' ? `A${String(Date.now()).slice(-3)}` : `W${String(Date.now()).slice(-3)}`;
    set((state) => ({
      employees: [...state.employees, { ...employee, id, empNo, isActive: true }],
    }));
  },

  updateEmployee: (id, updates) => {
    set((state) => ({
      employees: state.employees.map((e) => (e.id === id ? { ...e, ...updates } : e)),
    }));
  },

  toggleActive: (id) => {
    set((state) => ({
      employees: state.employees.map((e) =>
        e.id === id ? { ...e, isActive: !e.isActive } : e
      ),
    }));
  },
}));

export default useEmployeeStore;
