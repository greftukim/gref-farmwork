import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { snakeToCamel } from '../lib/dbHelpers';
import { sendPushToAdmins } from '../lib/pushNotify';

const useTaskStore = create((set, get) => ({
  tasks: [],
  loading: false,

  fetchTasks: async (currentUser) => {
    set({ loading: true });
    let query = supabase.from('tasks').select('*').order('date', { ascending: false });
    if (currentUser?.role === 'farm_admin' && currentUser?.branch) {
      const { data: branchEmps } = await supabase.from('employees').select('id').eq('branch', currentUser.branch);
      const empIds = (branchEmps || []).map((e) => e.id);
      if (empIds.length > 0) query = query.in('worker_id', empIds);
    }
    const { data } = await query;
    if (data) set({ tasks: data.map(snakeToCamel) });
    set({ loading: false });
  },

  addTask: async (task) => {
    const { data, error } = await supabase.from('tasks').insert({
      worker_id: task.workerId,
      title: task.title,
      date: task.date,
      zone_id: task.zoneId,
      row_range: task.rowRange,
      crop_id: task.cropId,
      task_type: task.taskType,
      description: task.description,
      estimated_minutes: task.estimatedMinutes,
      quantity_unit: task.quantityUnit,
    }).select().single();
    if (!error && data) {
      set((s) => ({ tasks: [...s.tasks, snakeToCamel(data)] }));
    }
  },

  startTask: async (taskId) => {
    const { data } = await supabase.from('tasks').update({
      status: 'in_progress',
      started_at: new Date().toISOString(),
    }).eq('id', taskId).select().single();
    if (data) {
      set((s) => ({ tasks: s.tasks.map((t) => (t.id === taskId ? snakeToCamel(data) : t)) }));
    }
  },

  completeTask: async (taskId, quantity) => {
    const task = get().tasks.find((t) => t.id === taskId);
    if (!task) return;
    const now = new Date();
    const durationMinutes = task.startedAt ? Math.round((now - new Date(task.startedAt)) / 60000) : 0;

    const { data } = await supabase.from('tasks').update({
      status: 'completed',
      completed_at: now.toISOString(),
      duration_minutes: durationMinutes,
      quantity,
    }).eq('id', taskId).select().single();
    if (data) {
      const completed = snakeToCamel(data);
      set((s) => ({ tasks: s.tasks.map((t) => (t.id === taskId ? completed : t)) }));
      try {
        await sendPushToAdmins({
          title: '작업 완료',
          body: `${completed.title} 작업이 완료되었습니다`,
          type: 'task_completed',
          urgent: false,
        });
      } catch (pushErr) {
        console.error('[taskStore] 푸시 전송 실패:', pushErr);
      }
    }
  },

  updateTask: async (taskId, updates) => {
    const row = {};
    for (const [k, v] of Object.entries(updates)) {
      row[k.replace(/[A-Z]/g, (c) => '_' + c.toLowerCase())] = v;
    }
    const { data } = await supabase.from('tasks').update(row).eq('id', taskId).select().single();
    if (data) {
      set((s) => ({ tasks: s.tasks.map((t) => (t.id === taskId ? snakeToCamel(data) : t)) }));
    }
  },

  deleteTask: async (taskId) => {
    const { error } = await supabase.from('tasks').delete().eq('id', taskId);
    if (!error) {
      set((s) => ({ tasks: s.tasks.filter((t) => t.id !== taskId) }));
    }
  },
}));

export default useTaskStore;
