'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ChatWindow } from '@/components/chat/ChatWindow';
import { initializeSocket, joinWorkspace } from '@/lib/socket';
import { useChatStore } from '@/store/useChatStore';
import { Loader2, Hash, Lock, Crown, Sparkles, User, Send } from 'lucide-react';
import { api } from '@/lib/axios';
import { toast } from 'sonner';
import PlansModal from '@/components/subscription/PlansModal';
import { useSubscription } from '@/hooks/useSubscription';
import { useSystemSettings } from '@/hooks/useSystemSettings';

export default function GroupChatPage() {
  const params = useParams();
  const router = useRouter();
  const workspaceId = params.id as string;
  
  const [workspaceName, setWorkspaceName] = useState('');
  const [workspaceSubscription, setWorkspaceSubscription] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasGroupChat, setHasGroupChat] = useState(false);
  const [isOwner, setIsOwner] = useState(false);
  const [checkingAccess, setCheckingAccess] = useState(true);
  const [showPlansModal, setShowPlansModal] = useState(false);

  const { setActiveRoom } = useChatStore();
  const { subscription } = useSubscription();
  const { whatsappNumber } = useSystemSettings();

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
          setWorkspaceSubscription(workspace.subscription);
          
          console.log('[GroupChat] Workspace data:', workspace);
          console.log('[GroupChat] Workspace subscription:', workspace.subscription);
          
          // Check if user is owner
          const userIsOwner = workspace.owner === userId || workspace.owner._id === userId;
          setIsOwner(userIsOwner);
          
          // Check if group chat is enabled in workspace owner's plan
          const groupChatEnabled = workspace.subscription?.plan?.features?.hasGroupChat || false;
          console.log('[GroupChat] Group chat enabled:', groupChatEnabled);
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
      <div className="relative flex h-screen bg-background overflow-hidden">
        {/* Blurred Background - Show actual chat interface */}
        <div className="absolute inset-0 blur-[2px] opacity-60 pointer-events-none">
          <div className="flex h-full">
            {/* Sidebar */}
            <div className="w-64 border-r border-border flex flex-col bg-card">
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
                  Workspace-wide chat
                </p>
              </div>
            </div>

            {/* Chat Area */}
            <div className="flex-1 flex flex-col bg-background">
              <div className="h-14 border-b border-border px-6 flex items-center bg-card">
                <h2 className="text-lg font-semibold text-foreground"># General - {workspaceName}</h2>
              </div>
              <div className="flex-1 p-6 space-y-4">
                {/* Sample messages */}
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                    <User className="w-4 h-4 text-primary" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-baseline gap-2 mb-1">
                      <span className="font-semibold text-sm text-foreground">Team Member</span>
                      <span className="text-xs text-muted-foreground">10:30 AM</span>
                    </div>
                    <div className="bg-muted px-4 py-2 rounded-lg text-sm text-foreground max-w-[70%]">
                      Hey team! How's everyone doing today?
                    </div>
                  </div>
                </div>
                
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center">
                    <User className="w-4 h-4 text-blue-500" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-baseline gap-2 mb-1">
                      <span className="font-semibold text-sm text-foreground">Another User</span>
                      <span className="text-xs text-muted-foreground">10:32 AM</span>
                    </div>
                    <div className="bg-muted px-4 py-2 rounded-lg text-sm text-foreground max-w-[70%]">
                      Great! Just finished the morning standup. Ready to tackle today's tasks.
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 justify-end">
                  <div className="flex-1 flex flex-col items-end">
                    <div className="flex items-baseline gap-2 mb-1">
                      <span className="text-xs text-muted-foreground">10:35 AM</span>
                      <span className="font-semibold text-sm text-foreground">You</span>
                    </div>
                    <div className="bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm max-w-[70%]">
                      Awesome! Let's make it a productive day 🚀
                    </div>
                  </div>
                  <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center">
                    <User className="w-4 h-4 text-green-500" />
                  </div>
                </div>
              </div>
              
              {/* Input area preview */}
              <div className="border-t border-border p-4 bg-card">
                <div className="flex gap-2 items-end">
                  <div className="flex-1 bg-muted rounded-lg px-4 py-2 text-sm text-muted-foreground">
                    Type a message...
                  </div>
                  <div className="h-10 w-10 rounded-md bg-primary flex items-center justify-center">
                    <Send className="h-5 w-5 text-primary-foreground" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Lock Overlay */}
        <div className="absolute inset-0 flex items-center justify-center bg-background/60 backdrop-blur-sm z-10">
          <div className="max-w-md w-full mx-4">
            <div className="bg-card border border-border rounded-2xl p-8 text-center shadow-2xl">
              <div className="w-20 h-20 rounded-full bg-purple-500/20 flex items-center justify-center mx-auto mb-6">
                <Lock className="w-10 h-10 text-purple-500 dark:text-purple-400" />
              </div>
              
              <h2 className="text-2xl font-bold text-foreground mb-3">
                Group Chat Locked
              </h2>
              
              {isOwner ? (
                <>
                  <p className="text-muted-foreground mb-6">
                    Upgrade to Pro to enable Group Chat for your team and unlock real-time collaboration.
                  </p>
                  <button
                    onClick={() => setShowPlansModal(true)}
                    className="w-full px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-lg font-medium transition-all flex items-center justify-center gap-2 shadow-lg"
                  >
                    <Lock className="w-5 h-5" />
                    Upgrade to Pro
                  </button>
                </>
              ) : (
                <>
                  <p className="text-muted-foreground mb-6">
                    Ask the workspace owner to activate this feature by upgrading to a Pro plan.
                  </p>
                  <div className="flex items-center justify-center gap-2 mb-6 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                    <Crown className="w-5 h-5 text-blue-500 dark:text-blue-400" />
                    <span className="text-sm text-blue-600 dark:text-blue-400">
                      Only the workspace owner can enable Group Chat
                    </span>
                  </div>
                  <button
                    onClick={() => setShowPlansModal(true)}
                    className="w-full px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-lg font-medium transition-all flex items-center justify-center gap-2 shadow-lg"
                  >
                    <Lock className="w-5 h-5" />
                    Upgrade to Pro
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Plans Modal */}
        <PlansModal
          isOpen={showPlansModal}
          onClose={() => setShowPlansModal(false)}
          currentPlanName={subscription?.plan?.name}
          workspaceSubscription={workspaceSubscription}
          whatsappNumber={whatsappNumber}
        />
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
