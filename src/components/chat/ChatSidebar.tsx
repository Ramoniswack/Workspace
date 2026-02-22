'use client';

import { useState, useEffect } from 'react';
import { Hash, User, Circle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePresence } from '@/hooks/usePresence';
import { useChatStore, generateDMRoomId } from '@/store/useChatStore';
import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

interface WorkspaceMember {
  _id: string;
  name: string;
  email: string;
  role: string;
}

interface Conversation {
  _id: string;
  participants: WorkspaceMember[];
  lastMessage?: {
    content: string;
    createdAt: string;
  };
  unreadCount?: number;
}

interface ChatSidebarProps {
  workspaceId: string;
  activeChannel: 'general' | string;
  onChannelSelect: (channel: 'general' | string, type: 'workspace' | 'direct', conversationId?: string, userId?: string) => void;
}

export const ChatSidebar = ({ workspaceId, activeChannel, onChannelSelect }: ChatSidebarProps) => {
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const { isUserOnline } = usePresence(workspaceId);
  const { getRoom } = useChatStore();

  // Get current user ID
  const currentUserId = typeof window !== 'undefined' ? localStorage.getItem('userId') : null;

  // Fetch workspace members
  useEffect(() => {
    const fetchMembers = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get(
          `${API_URL}/api/workspaces/${workspaceId}/members`,
          {
            headers: { Authorization: `Bearer ${token}` }
          }
        );

        if (response.data.success) {
          // Filter out current user from members list
          const allMembers = response.data.data || [];
          const filteredMembers = allMembers.filter((m: WorkspaceMember) => m._id !== currentUserId);
          setMembers(filteredMembers);
        }
      } catch (err) {
        console.error('Failed to fetch members:', err);
      }
    };

    fetchMembers();
  }, [workspaceId, currentUserId]);

  // Fetch conversations
  useEffect(() => {
    const fetchConversations = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get(
          `${API_URL}/api/dm`,
          {
            headers: { Authorization: `Bearer ${token}` }
          }
        );

        if (response.data.success) {
          setConversations(response.data.data || []);
        }
      } catch (err) {
        console.error('Failed to fetch conversations:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchConversations();
  }, []);

  const handleMemberClick = async (member: WorkspaceMember) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${API_URL}/api/dm/${member._id}`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      if (response.data.success) {
        const conversation = response.data.data;
        onChannelSelect(member._id, 'direct', conversation._id, member._id);
      }
    } catch (err) {
      console.error('Failed to start conversation:', err);
    }
  };

  // Get unread count for workspace chat
  const workspaceRoomId = `workspace_${workspaceId}`;
  const workspaceRoom = getRoom(workspaceRoomId);
  const workspaceUnread = workspaceRoom?.unreadCount || 0;

  return (
    <div className="w-64 bg-card border-r border-border flex flex-col h-full">
      {/* Channels Section */}
      <div className="p-4">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase mb-2">
          Workspace Chat
        </h3>
        <button
          onClick={() => onChannelSelect('general', 'workspace')}
          className={cn(
            'w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors relative',
            activeChannel === 'general'
              ? 'bg-primary text-primary-foreground'
              : 'hover:bg-accent text-foreground'
          )}
        >
          <Hash className="h-4 w-4" />
          <span className="flex-1 text-left">General</span>
          {workspaceUnread > 0 && activeChannel !== 'general' && (
            <div className="h-5 w-5 rounded-full bg-red-500 text-white text-xs font-bold flex items-center justify-center">
              {workspaceUnread > 9 ? '9+' : workspaceUnread}
            </div>
          )}
        </button>
      </div>

      {/* Direct Messages Section */}
      <div className="flex-1 overflow-y-auto p-4">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase mb-2">
          Direct Messages
        </h3>
        
        {loading ? (
          <div className="text-sm text-muted-foreground">Loading...</div>
        ) : (
          <div className="space-y-1">
            {members.map((member) => {
              const online = isUserOnline(member._id);
              const conversation = conversations.find(c => 
                c.participants.some(p => p._id === member._id)
              );
              
              // Get unread count from Zustand store
              const dmRoomId = currentUserId ? generateDMRoomId(currentUserId, member._id) : '';
              const dmRoom = getRoom(dmRoomId);
              const unreadCount = dmRoom?.unreadCount || 0;
              const hasUnread = unreadCount > 0;

              return (
                <button
                  key={member._id}
                  onClick={() => handleMemberClick(member)}
                  className={cn(
                    'w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors relative',
                    activeChannel === member._id
                      ? 'bg-primary text-primary-foreground'
                      : 'hover:bg-accent text-foreground'
                  )}
                >
                  <div className="relative">
                    <User className="h-4 w-4" />
                    <Circle
                      className={cn(
                        'h-2 w-2 absolute -bottom-0.5 -right-0.5',
                        online ? 'fill-green-500 text-green-500' : 'fill-gray-400 text-gray-400'
                      )}
                    />
                  </div>
                  <span className="flex-1 text-left truncate">{member.name}</span>
                  {hasUnread && activeChannel !== member._id && (
                    <div className="h-5 w-5 rounded-full bg-red-500 text-white text-xs font-bold flex items-center justify-center">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
