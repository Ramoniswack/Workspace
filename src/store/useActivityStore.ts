import { create } from 'zustand';
import { api } from '@/lib/axios';

export interface Activity {
  _id: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  action: string;
  target: string;
  type: 'create' | 'update' | 'delete' | 'comment';
  workspaceId: string;
  spaceId?: string;
  listId?: string;
  taskId?: string;
  metadata?: Record<string, any>;
  createdAt: string;
}

interface ActivityStore {
  activities: Activity[];
  loading: boolean;
  error: string | null;
  
  // Actions
  fetchActivities: (params: { workspaceId?: string; spaceId?: string; listId?: string }) => Promise<void>;
  logActivity: (data: {
    userId: string;
    action: string;
    target: string;
    type: 'create' | 'update' | 'delete' | 'comment';
    workspaceId: string;
    spaceId?: string;
    listId?: string;
    taskId?: string;
    metadata?: Record<string, any>;
  }) => Promise<void>;
  clearActivities: () => void;
}

export const useActivityStore = create<ActivityStore>((set, get) => ({
  activities: [],
  loading: false,
  error: null,

  fetchActivities: async (params) => {
    set({ loading: true, error: null });
    try {
      const queryParams = new URLSearchParams();
      if (params.workspaceId) queryParams.append('workspaceId', params.workspaceId);
      if (params.spaceId) queryParams.append('spaceId', params.spaceId);
      if (params.listId) queryParams.append('listId', params.listId);
      
      const response = await api.get(`/activities?${queryParams.toString()}`);
      set({ activities: response.data.data, loading: false });
    } catch (error: any) {
      set({ 
        error: error.response?.data?.message || 'Failed to fetch activities',
        loading: false 
      });
    }
  },

  logActivity: async (data) => {
    try {
      const response = await api.post('/activities', data);
      const newActivity = response.data.data;
      set({ activities: [newActivity, ...get().activities] });
    } catch (error: any) {
      console.error('Failed to log activity:', error);
      // Don't throw error for activity logging failures
    }
  },

  clearActivities: () => set({ activities: [], error: null }),
}));
