import { io, Socket } from 'socket.io-client';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

let socket: Socket | null = null;

export const initializeSocket = (token: string): Socket => {
  // VALIDATE TOKEN before attempting connection
  if (!token || 
      token === 'undefined' || 
      token === 'null' || 
      token.trim() === '' ||
      typeof token !== 'string') {
    console.error('[Socket] ⚠️ Invalid token, cannot initialize socket');
    throw new Error('Invalid authentication token for socket connection');
  }
  
  // If socket exists and is connected, reuse it
  if (socket?.connected) {
    return socket;
  }

  // Disconnect old socket if it exists but not connected
  if (socket) {
    socket.disconnect();
    socket = null;
  }

  socket = io(API_URL, {
    auth: { token },
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionAttempts: 5,
  });

  socket.on('connect', () => {
    console.log('[Socket] ✓ Connected');
  });

  socket.on('disconnect', (reason) => {
    // If disconnected due to auth error, clear tokens and redirect
    if (reason === 'io server disconnect' || reason.includes('auth')) {
      console.error('[Socket] Authentication error - clearing tokens');
      if (typeof window !== 'undefined') {
        localStorage.removeItem('token');
        localStorage.removeItem('authToken');
        localStorage.removeItem('userId');
        localStorage.removeItem('userName');
        localStorage.removeItem('userEmail');
        window.location.href = '/login';
      }
    }
  });

  socket.on('connect_error', (error) => {
    console.error('[Socket] Connection error:', error.message);
    
    // If auth error, clear tokens
    if (error.message.includes('Authentication') || error.message.includes('auth')) {
      console.error('[Socket] Authentication error - clearing tokens');
      if (typeof window !== 'undefined') {
        localStorage.removeItem('token');
        localStorage.removeItem('authToken');
        localStorage.removeItem('userId');
        localStorage.removeItem('userName');
        localStorage.removeItem('userEmail');
      }
    }
  });

  socket.on('error', (error) => {
    console.error('[Socket] Error:', error);
  });

  return socket;
};

export const getSocket = (): Socket | null => {
  return socket;
};

export const disconnectSocket = (): void => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

export const joinWorkspace = (workspaceId: string): void => {
  if (!socket) return;
  socket.emit('join_workspace', { workspaceId });
};

export const joinSpace = (spaceId: string): void => {
  if (!socket) return;
  socket.emit('join_space', { spaceId });
};

export const joinTask = (taskId: string): void => {
  if (!socket) return;
  socket.emit('join_task', { taskId });
};

export const leaveTask = (taskId: string): void => {
  if (!socket) return;
  socket.emit('leave_task', { taskId });
};

export const joinDM = (conversationId: string): void => {
  if (!socket) return;
  socket.emit('join_dm', { conversationId });
};

export const leaveDM = (conversationId: string): void => {
  if (!socket) return;
  socket.emit('leave_dm', { conversationId });
};
