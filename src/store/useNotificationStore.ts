import { create } from 'zustand';

export interface Notification {
  _id: string;
  type: string;
  title: string;
  body: string;
  read: boolean;
  data?: {
    token?: string;
    workspaceId?: string;
    inviteUrl?: string;
    workspaceName?: string;
    inviterName?: string;
    resourceId?: string;
    resourceType?: string;
    [key: string]: any;
  };
  createdAt: string;
}

interface NotificationStore {
  notifications: Notification[];
  unreadCount: number;
  permission: NotificationPermission;
  isLoading: boolean;
  
  setNotifications: (notifications: Notification[]) => void;
  addNotification: (notification: Notification) => void;
  markAsRead: (notificationId: string) => void;
  markAllAsRead: () => void;
  removeNotification: (notificationId: string) => void;
  clearNotifications: () => void;
  setUnreadCount: (count: number) => void;
  setLoading: (loading: boolean) => void;
  requestPermission: () => Promise<NotificationPermission>;
  showBrowserNotification: (title: string, body: string, data?: any) => void;
}

export const useNotificationStore = create<NotificationStore>((set, get) => ({
  notifications: [],
  unreadCount: 0,
  permission: typeof window !== 'undefined' ? Notification.permission : 'default',
  isLoading: false,

  setNotifications: (notifications) => {
    const unreadCount = notifications.filter((n) => !n.read).length;
    set({ notifications, unreadCount });
  },

  addNotification: (notification) => {
    const { notifications } = get();
    const newNotifications = [notification, ...notifications];
    const unreadCount = newNotifications.filter((n) => !n.read).length;
    
    set({ notifications: newNotifications, unreadCount });

    // Show browser notification if permission granted
    if (get().permission === 'granted' && !notification.read) {
      get().showBrowserNotification(notification.title, notification.body, notification.data);
    }
  },

  markAsRead: (notificationId) => {
    const { notifications } = get();
    const updatedNotifications = notifications.map((n) =>
      n._id === notificationId ? { ...n, read: true } : n
    );
    const unreadCount = updatedNotifications.filter((n) => !n.read).length;
    
    set({ notifications: updatedNotifications, unreadCount });
  },

  markAllAsRead: () => {
    const { notifications } = get();
    const updatedNotifications = notifications.map((n) => ({ ...n, read: true }));
    
    set({ notifications: updatedNotifications, unreadCount: 0 });
  },

  removeNotification: (notificationId) => {
    const { notifications } = get();
    const updatedNotifications = notifications.filter((n) => n._id !== notificationId);
    const unreadCount = updatedNotifications.filter((n) => !n.read).length;
    
    set({ notifications: updatedNotifications, unreadCount });
  },

  clearNotifications: () => {
    set({ notifications: [], unreadCount: 0 });
  },

  setUnreadCount: (count) => {
    set({ unreadCount: count });
  },

  setLoading: (loading) => {
    set({ isLoading: loading });
  },

  requestPermission: async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return 'denied';
    }

    try {
      const permission = await Notification.requestPermission();
      set({ permission });
      return permission;
    } catch (error) {
      console.error('Failed to request notification permission:', error);
      return 'denied';
    }
  },

  showBrowserNotification: (title, body, data) => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return;
    }

    if (Notification.permission === 'granted') {
      try {
        const notification = new Notification(title, {
          body,
          icon: '/logo.png', // Add your app logo
          badge: '/badge.png', // Add your app badge
          tag: data?.resourceId || 'default',
          requireInteraction: false,
          silent: false,
        });

        notification.onclick = () => {
          window.focus();
          notification.close();
          
          // Navigate to relevant page if data provided
          if (data?.workspaceId) {
            window.location.href = `/workspace/${data.workspaceId}`;
          } else if (data?.inviteUrl) {
            window.location.href = data.inviteUrl;
          }
        };
      } catch (error) {
        console.error('Failed to show browser notification:', error);
      }
    }
  },
}));
