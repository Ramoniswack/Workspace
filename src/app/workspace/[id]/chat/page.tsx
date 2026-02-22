'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ChatWindow } from '@/components/chat/ChatWindow';
import { initializeSocket, joinWorkspace } from '@/lib/socket';
import { useChatStore } from '@/store/useChatStore';
import { Loader2, Hash } from 'lucide-react';
import { api } from '@/lib/axios';

export default function GroupChatPage() {
  const params = useParams();
  const router = useRouter();
  const workspaceId = params.id as string;
  
  const [workspaceName, setWorkspaceName] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const { setActiveRoom } = useChatStore();

  // Initialize auth and socket
  useEffect(() => {
    const authToken = localStorage.getItem('authToken');
    const token = localStorage.getItem('token');
    const userId = localStorage.getItem('userId');
    
    const finalToken = authToken || token;
    
    // STRICT VALIDATION: Check for invalid tokens
    if (!finalToken || 
        !userId || 
        finalToken === 'undefined' || 
        finalToken === 'null' || 
        finalToken.trim() === '') {
      console.error('[GroupChat] Auth failed - redirecting to login');
      
      // Clear invalid tokens
      localStorage.removeItem('token');
      localStorage.removeItem('authToken');
      localStorage.removeItem('userId');
      localStorage.removeItem('userName');
      localStorage.removeItem('userEmail');
      
      router.push('/login');
      return;
    }

    // Initialize socket with error handling
    try {
      initializeSocket(finalToken);
      
      // Join workspace room
      joinWorkspace(workspaceId);

      // Set active room in store
      const roomId = `workspace_${workspaceId}`;
      setActiveRoom(roomId);

      setIsLoading(false);
    } catch (error) {
      console.error('[GroupChat] Socket initialization failed:', error);
      // Don't redirect, just log - socket will retry
      setIsLoading(false);
    }
  }, [router, workspaceId, setActiveRoom]);

  // Fetch workspace details
  useEffect(() => {
    if (!workspaceId) return;

    const fetchWorkspace = async () => {
      try {
        const response = await api.get(`/workspaces/${workspaceId}`);

        if (response.data.success) {
          setWorkspaceName(response.data.data.name);
        }
      } catch (err) {
        console.error('Failed to fetch workspace:', err);
      }
    };

    fetchWorkspace();
  }, [workspaceId]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Loading group chat...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-background">
      {/* Simple Sidebar showing just the channel */}
      <div className="w-64 border-r border-border flex flex-col">
        <div className="p-4 border-b border-border">
          <h2 className="text-lg font-semibold text-foreground">Group Chat</h2>
          <p className="text-sm text-muted-foreground">{workspaceName}</p>
        </div>
        
        <div className="p-4">
          <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-primary text-primary-foreground">
            <Hash className="h-4 w-4" />
            <span className="text-sm font-medium">General</span>
          </div>
          <p className="text-xs text-muted-foreground mt-2 px-3">
            Workspace-wide chat for all members
          </p>
        </div>
      </div>

      {/* Chat Window */}
      <ChatWindow
        workspaceId={workspaceId}
        type="workspace"
        title={`# General - ${workspaceName}`}
      />
    </div>
  );
}
