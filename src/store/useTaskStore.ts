import { create } from 'zustand';
import { api } from '@/lib/axios';
import { Task } from '@/types';

interface TaskStore {
  tasks: Task[];
  loading: boolean;
  error: string | null;
  
  // Actions
  fetchTasks: (listId: string) => Promise<void>;
  createTask: (listId: string, data: Partial<Task>) => Promise<Task>;
  updateTask: (taskId: string, data: Partial<Task>) => Promise<Task>;
  deleteTask: (taskId: string) => Promise<void>;
  bulkUpdateTasks: (taskIds: string[], data: Partial<Task>) => Promise<void>;
  bulkDeleteTasks: (taskIds: string[]) => Promise<void>;
  assignTask: (taskId: string, userId: string | null, taskName: string, assigneeName: string) => Promise<Task>;
  updateTaskStatus: (taskId: string, status: 'todo' | 'inprogress' | 'review' | 'done' | 'cancelled', taskName: string) => Promise<Task>;
  setTasks: (tasks: Task[]) => void;
  clearTasks: () => void;
}

export const useTaskStore = create<TaskStore>((set, get) => ({
  tasks: [],
  loading: false,
  error: null,

  fetchTasks: async (listId: string) => {
    set({ loading: true, error: null });
    try {
      const response = await api.get(`/lists/${listId}/tasks`);
      set({ tasks: response.data.data, loading: false });
    } catch (error: any) {
      set({ 
        error: error.response?.data?.message || 'Failed to fetch tasks',
        loading: false 
      });
      throw error;
    }
  },

  createTask: async (listId: string, data: Partial<Task>) => {
    try {
      const response = await api.post(`/lists/${listId}/tasks`, data);
      const newTask = response.data.data;
      set({ tasks: [...get().tasks, newTask] });
      return newTask;
    } catch (error: any) {
      set({ error: error.response?.data?.message || 'Failed to create task' });
      throw error;
    }
  },

  updateTask: async (taskId: string, data: Partial<Task>) => {
    try {
      const response = await api.patch(`/tasks/${taskId}`, data);
      const updatedTask = response.data.data;
      set({
        tasks: get().tasks.map(task =>
          task._id === taskId ? updatedTask : task
        )
      });
      return updatedTask;
    } catch (error: any) {
      set({ error: error.response?.data?.message || 'Failed to update task' });
      throw error;
    }
  },

  deleteTask: async (taskId: string) => {
    try {
      await api.delete(`/tasks/${taskId}`);
      set({ tasks: get().tasks.filter(task => task._id !== taskId) });
    } catch (error: any) {
      set({ error: error.response?.data?.message || 'Failed to delete task' });
      throw error;
    }
  },

  bulkUpdateTasks: async (taskIds: string[], data: Partial<Task>) => {
    try {
      await Promise.all(
        taskIds.map(taskId => api.patch(`/tasks/${taskId}`, data))
      );
      set({
        tasks: get().tasks.map(task =>
          taskIds.includes(task._id) ? { ...task, ...data } : task
        )
      });
    } catch (error: any) {
      set({ error: error.response?.data?.message || 'Failed to update tasks' });
      throw error;
    }
  },

  bulkDeleteTasks: async (taskIds: string[]) => {
    try {
      await Promise.all(
        taskIds.map(taskId => api.delete(`/tasks/${taskId}`))
      );
      set({ tasks: get().tasks.filter(task => !taskIds.includes(task._id)) });
    } catch (error: any) {
      set({ error: error.response?.data?.message || 'Failed to delete tasks' });
      throw error;
    }
  },

  assignTask: async (taskId: string, userId: string | null, taskName: string, assigneeName: string) => {
    try {
      const response = await api.patch(`/tasks/${taskId}`, { assigneeId: userId });
      const updatedTask = response.data.data;
      
      set({
        tasks: get().tasks.map(task =>
          task._id === taskId ? updatedTask : task
        )
      });

      // Log activity - wrapped in try-catch to prevent blocking
      try {
        const { logActivity } = await import('./useActivityStore');
        const currentUserId = localStorage.getItem('userId');
        if (currentUserId) {
          await logActivity({
            userId: currentUserId,
            action: userId ? `assigned task to ${assigneeName}` : 'unassigned task',
            target: taskName,
            type: 'update',
            workspaceId: updatedTask.workspace,
            spaceId: updatedTask.space,
            listId: updatedTask.list,
            taskId: updatedTask._id
          });
        }
      } catch (activityError) {
        console.error('Failed to log activity:', activityError);
      }

      return updatedTask;
    } catch (error: any) {
      set({ error: error.response?.data?.message || 'Failed to assign task' });
      throw error;
    }
  },

  updateTaskStatus: async (taskId: string, status: 'todo' | 'inprogress' | 'review' | 'done' | 'cancelled', taskName: string) => {
    // Optimistic update - update UI immediately
    const previousTasks = get().tasks;
    set({
      tasks: get().tasks.map(task =>
        task._id === taskId ? { ...task, status } : task
      )
    });

    try {
      const response = await api.patch(`/tasks/${taskId}`, { status });
      const updatedTask = response.data.data;
      
      set({
        tasks: get().tasks.map(task =>
          task._id === taskId ? updatedTask : task
        )
      });

      // Log activity - wrapped in try-catch to prevent blocking
      try {
        const { logActivity } = await import('./useActivityStore');
        const currentUserId = localStorage.getItem('userId');
        if (currentUserId) {
          await logActivity({
            userId: currentUserId,
            action: `changed status to ${status}`,
            target: taskName,
            type: 'update',
            workspaceId: updatedTask.workspace,
            spaceId: updatedTask.space,
            listId: updatedTask.list,
            taskId: updatedTask._id
          });
        }
      } catch (activityError) {
        console.error('Failed to log activity:', activityError);
      }

      return updatedTask;
    } catch (error: any) {
      // Revert optimistic update on error
      set({ 
        tasks: previousTasks,
        error: error.response?.data?.message || 'Failed to update task status' 
      });
      throw error;
    }
  },

  setTasks: (tasks: Task[]) => set({ tasks }),
  
  clearTasks: () => set({ tasks: [], error: null }),
}));
