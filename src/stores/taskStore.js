import { create } from 'zustand';
import { mockTasks } from '../lib/mockData';

const useTaskStore = create((set) => ({
  tasks: [...mockTasks],

  addTask: (task) => {
    const id = `task-${Date.now()}`;
    set((state) => ({
      tasks: [...state.tasks, {
        ...task,
        id,
        status: 'pending',
        assignedAt: new Date().toISOString(),
        startedAt: null,
        completedAt: null,
        durationMinutes: null,
      }],
    }));
  },

  startTask: (taskId) => {
    set((state) => ({
      tasks: state.tasks.map((t) =>
        t.id === taskId ? { ...t, status: 'in_progress', startedAt: new Date().toISOString() } : t
      ),
    }));
  },

  completeTask: (taskId, quantity) => {
    const now = new Date();
    set((state) => ({
      tasks: state.tasks.map((t) => {
        if (t.id !== taskId) return t;
        const started = new Date(t.startedAt);
        const durationMinutes = Math.round((now - started) / 60000);
        return { ...t, status: 'completed', completedAt: now.toISOString(), durationMinutes, quantity };
      }),
    }));
  },

  updateTask: (taskId, updates) => {
    set((state) => ({
      tasks: state.tasks.map((t) => (t.id === taskId ? { ...t, ...updates } : t)),
    }));
  },

  deleteTask: (taskId) => {
    set((state) => ({
      tasks: state.tasks.filter((t) => t.id !== taskId),
    }));
  },
}));

export default useTaskStore;
