import { useState, useEffect, useCallback, useRef } from 'react';
import { getSocket, joinDM, leaveDM } from '@/lib/socket';
import { useChatStore } from '@/store/useChatStore';
import { api } from '@/lib/axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export interface ChatMessage {
  _id: string;
  workspace?: string;
  conversation?: string;
  sender: {
    _id: string;
    name: string;
    email: string;
  };
  content: string;
  type?: 'text' | 'system';
  mentions?: string[];
  readBy?: string[];
  createdAt: string;
  updatedAt: string;
}

interface UseChatOptions {
  workspaceId?: string;
  conversationId?: string;
  userId?: string; // For DM - the other user's ID
  type: 'workspace' | 'direct';
}

export const useChat = ({ workspaceId, conversationId, userId, type }: UseChatOptions) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const socket = getSocket();
  
  // Get Zustand store actions
  const { addMessage: addMessageToStore } = useChatStore();

  // Fetch initial messages
  const fetchMessages = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const token = localStorage.getItem('authToken') || localStorage.getItem('token');
      
      if (!token) {
        console.error('[useChat] No token found');
        setError('Authentication required. Please login again.');
        setLoading(false);
        return;
      }

      let response;
      if (type === 'workspace' && workspaceId) {
        response = await api.get(`/workspaces/${workspaceId}/chat?limit=50`);
      } else if (type === 'direct' && conversationId) {
        response = await api.get(`/dm/${conversationId}/messages?limit=50`);
      } else {
        console.error('[useChat] Invalid parameters');
        setError('Invalid chat configuration');
        setLoading(false);
        return;
      }

      if (response?.data?.success) {
        const messages = response.data.data || [];
        setMessages(messages);
      } else {
        console.error('[useChat] Response not successful:', response?.data);
        setError('Failed to load messages');
      }
    } catch (err: any) {
      console.error('[useChat] Failed to fetch messages:', err);
      console.error('[useChat] Error message:', err.message);
      console.error('[useChat] Error response:', err.response?.data);
      console.error('[useChat] Error status:', err.response?.status);
      
      const errorMessage = err.response?.data?.message || err.message || 'Failed to load messages';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [workspaceId, conversationId, type]);

  // Send message
  const sendMessage = useCallback(async (content: string, mentions: string[] = []) => {
    if (!content.trim()) return;

    try {
      setSending(true);
      setError(null);

      const token = localStorage.getItem('authToken') || localStorage.getItem('token');
      
      if (!token) {
        console.error('[useChat] No token found for sending message');
        setError('Authentication required');
        setSending(false);
        return;
      }

      if (type === 'workspace' && workspaceId) {
        // Send via socket for real-time
        socket?.emit('chat:send', {
          workspaceId,
          content: content.trim(),
          mentions
        });
      } else if (type === 'direct' && userId) {
        // For DM, send via API using userId
        const response = await api.post(`/dm/${userId}/message`, { 
          content: content.trim() 
        });
        
        if (response.data.success) {
          // Message will be received via socket
        }
      }
    } catch (err: any) {
      console.error('[useChat] Failed to send message:', err);
      setError(err.response?.data?.message || 'Failed to send message');
    } finally {
      setSending(false);
    }
  }, [workspaceId, userId, type, socket]);

  // Typing indicator
  const sendTypingIndicator = useCallback(() => {
    if (type === 'workspace' && workspaceId) {
      socket?.emit('chat:typing', { workspaceId });
      
      // Clear existing timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      
      // Stop typing after 3 seconds
      typingTimeoutRef.current = setTimeout(() => {
        socket?.emit('chat:stop_typing', { workspaceId });
      }, 3000);
    }
  }, [workspaceId, type, socket]);

  // Socket event listeners
  useEffect(() => {
    if (!socket) return;

    // Join appropriate room
    if (type === 'direct' && conversationId) {
      joinDM(conversationId);
    }

    // Workspace chat events
    if (type === 'workspace' && workspaceId) {
      // New message received
      const handleNewMessage = (data: { message: ChatMessage }) => {
        setMessages(prev => [...prev, data.message]);
        // Add to Zustand store
        const roomId = `workspace_${workspaceId}`;
        addMessageToStore(roomId, data.message);
      };

      // User typing
      const handleUserTyping = (data: { userId: string; userName: string }) => {
        setTypingUsers(prev => new Set(prev).add(data.userName));
      };

      // User stopped typing
      const handleUserStopTyping = (data: { userId: string }) => {
        setTypingUsers(prev => {
          const newSet = new Set(prev);
          // Remove by userId (we'd need to track userId to userName mapping)
          return newSet;
        });
      };

      socket.on('chat:new', handleNewMessage);
      socket.on('chat:user_typing', handleUserTyping);
      socket.on('chat:user_stop_typing', handleUserStopTyping);

      return () => {
        socket.off('chat:new', handleNewMessage);
        socket.off('chat:user_typing', handleUserTyping);
        socket.off('chat:user_stop_typing', handleUserStopTyping);
      };
    }

    // Direct message events
    if (type === 'direct' && conversationId) {
      const handleNewDM = (data: { message: ChatMessage }) => {
        if (data.message.conversation === conversationId) {
          setMessages(prev => [...prev, data.message]);
          // Add to Zustand store
          addMessageToStore(conversationId, data.message);
        }
      };

      socket.on('dm:new', handleNewDM);

      return () => {
        socket.off('dm:new', handleNewDM);
        if (conversationId) {
          leaveDM(conversationId);
        }
      };
    }
  }, [socket, type, workspaceId, conversationId, addMessageToStore]);

  // Fetch messages on mount
  useEffect(() => {
    if ((type === 'workspace' && workspaceId) || (type === 'direct' && conversationId)) {
      fetchMessages();
    }
  }, [fetchMessages, type, workspaceId, conversationId]);

  // Cleanup typing timeout
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  return {
    messages,
    loading,
    sending,
    error,
    typingUsers: Array.from(typingUsers),
    sendMessage,
    sendTypingIndicator,
    refetch: fetchMessages
  };
};
