'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ChatWindow } from '@/components/chat/ChatWindow';
import { initializeSocket, joinWorkspace } from '@/lib/socket';
import { useChatStore } from '@/store/useChatStore';
import { Loader2, Hash, Lock, Crown, Sparkles } from 'lucide-react';
import { api } from '@/lib/axios';
import { toast } from 'sonner';

export default function GroupChatPage() {
  const params = useParams();
  const router = useRouter();
  const workspaceId = params.id as string;
  
  const [workspaceName, setWorkspaceName] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [hasGroupChat, setHasGroupChat] = useState(false);
  const [isOwner, setIsOwner] = useState(false);
  const [checkingAccess, setCheckingAccess] = useState(true);

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

  // Fetch workspace details and check group chat access
  useEffect(() => {
    if (!workspaceId) return;

    const fetchWorkspace = async () => {
      try {
        const response = await api.get(`/workspaces/${workspaceId}`);
        const userId = localStorage.getItem('userId');

        if (response.data.success) {
          const workspace = response.data.data;
          setWorkspaceName(workspace.name);
          
          // Check if user is owner
          const userIsOwner = workspace.owner === userId || workspace.owner._id === userId;
          setIsOwner(userIsOwner);
          
          // Check if group chat is enabled in owner's plan
          const groupChatEnabled = workspace.subscription?.plan?.features?.hasGroupChat || false;
          setHasGroupChat(groupChatEnabled);
          
          setCheckingAccess(false);
        }
      } catch (err) {
        console.error('Failed to fetch workspace:', err);
        toast.error('Failed to load workspace details');
        setCheckingAccess(false);
      }
    };

    fetchWorkspace();
  }, [workspaceId]);

  if (isLoading || checkingAccess) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Loading group chat...</p>
        </div>
      </div>
    );
  }

  // Show lock screen if group chat is not enabled
  if (!hasGroupChat) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#0a0a0a]">
        <div className="max-w-md w-full mx-4">
          <div className="bg-[#111111] border border-gray-800 rounded-2xl p-8 text-center">
            <div className="w-20 h-20 rounded-full bg-purple-500/20 flex items-center justify-center mx-auto mb-6">
              <Lock className="w-10 h-10 text-purple-400" />
            </div>
            
            <h2 className="text-2xl font-bold text-white mb-3">
              Group Chat Locked
            </h2>
            
            {isOwner ? (
              <>
                <p className="text-gray-400 mb-6">
                  Upgrade to Pro to enable Group Chat for your team and unlock real-time collaboration.
                </p>
                <button
                  onClick={() => router.push('/dashboard')}
                  className="w-full px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-lg font-medium transition-all flex items-center justify-center gap-2"
                >
                  <Sparkles className="w-5 h-5" />
                  Upgrade to Pro
                </button>
                <button
                  onClick={() => router.push(`/workspace/${workspaceId}`)}
                  className="w-full mt-3 px-6 py-3 bg-gray-800 hover:bg-gray-700 text-white rounded-lg font-medium transition-colors"
                >
                  Back to Workspace
                </button>
              </>
            ) : (
              <>
                <p className="text-gray-400 mb-6">
                  Ask the workspace owner to activate this feature by upgrading to a Pro plan.
                </p>
                <div className="flex items-center justify-center gap-2 mb-6 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                  <Crown className="w-5 h-5 text-blue-400" />
                  <span className="text-sm text-blue-300">
                    Only the workspace owner can enable Group Chat
                  </span>
                </div>
                <button
                  onClick={() => router.push(`/workspace/${workspaceId}`)}
                  className="w-full px-6 py-3 bg-gray-800 hover:bg-gray-700 text-white rounded-lg font-medium transition-colors"
                >
                  Back to Workspace
                </button>
              </>
            )}
          </div>
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
