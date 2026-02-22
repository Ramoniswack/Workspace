import { create } from 'zustand';
import { api } from '@/lib/axios';
import { Workspace } from '@/types';

interface WorkspaceStore {
  workspaces: Workspace[];
  loading: boolean;
  error: string | null;
  lastAccessedWorkspaceId: string | null;
  
  // Actions
  fetchWorkspaces: () => Promise<void>;
  createWorkspace: (name: string, description?: string) => Promise<Workspace>;
  updateWorkspace: (workspaceId: string, data: { name?: string; description?: string }) => Promise<void>;
  deleteWorkspace: (workspaceId: string) => Promise<void>;
  setLastAccessedWorkspace: (workspaceId: string) => void;
  getWorkspaceById: (workspaceId: string) => Workspace | undefined;
}

export const useWorkspaceStore = create<WorkspaceStore>((set, get) => ({
  workspaces: [],
  loading: false,
  error: null,
  lastAccessedWorkspaceId: typeof window !== 'undefined' 
    ? localStorage.getItem('lastAccessedWorkspaceId') 
    : null,

  fetchWorkspaces: async () => {
    set({ loading: true, error: null });
    try {
      const response = await api.get('/workspaces');
      set({ workspaces: response.data.data, loading: false });
    } catch (error: any) {
      set({ 
        error: error.response?.data?.message || 'Failed to load workspaces',
        loading: false 
      });
    }
  },

  createWorkspace: async (name: string, description?: string) => {
    set({ loading: true, error: null });
    try {
      const response = await api.post('/workspaces', { name, description });
      const newWorkspace = response.data.data;
      set(state => ({ 
        workspaces: [...state.workspaces, newWorkspace],
        loading: false 
      }));
      return newWorkspace;
    } catch (error: any) {
      set({ 
        error: error.response?.data?.message || 'Failed to create workspace',
        loading: false 
      });
      throw error;
    }
  },

  updateWorkspace: async (workspaceId: string, data: { name?: string; description?: string }) => {
    set({ loading: true, error: null });
    try {
      const response = await api.patch(`/workspaces/${workspaceId}`, data);
      const updatedWorkspace = response.data.data;
      set(state => ({ 
        workspaces: state.workspaces.map(w => 
          w._id === workspaceId ? { ...w, ...updatedWorkspace } : w
        ),
        loading: false 
      }));
    } catch (error: any) {
      set({ 
        error: error.response?.data?.message || 'Failed to update workspace',
        loading: false 
      });
      throw error;
    }
  },

  deleteWorkspace: async (workspaceId: string) => {
    set({ loading: true, error: null });
    try {
      await api.delete(`/workspaces/${workspaceId}`);
      set(state => ({ 
        workspaces: state.workspaces.filter(w => w._id !== workspaceId),
        loading: false 
      }));
    } catch (error: any) {
      set({ 
        error: error.response?.data?.message || 'Failed to delete workspace',
        loading: false 
      });
      throw error;
    }
  },

  setLastAccessedWorkspace: (workspaceId: string) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('lastAccessedWorkspaceId', workspaceId);
    }
    set({ lastAccessedWorkspaceId: workspaceId });
  },

  getWorkspaceById: (workspaceId: string) => {
    return get().workspaces.find(w => w._id === workspaceId);
  },
}));
