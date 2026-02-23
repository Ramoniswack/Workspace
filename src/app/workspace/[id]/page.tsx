'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { api } from '@/lib/axios';
import { Space, Workspace } from '@/types';
import { 
  Plus, 
  Loader2, 
  ArrowLeft, 
  Folder, 
  Users, 
  LayoutGrid, 
  CheckCircle2,
  TrendingUp,
  Megaphone,
  Code2,
  Palette,
  DollarSign,
  Briefcase,
  Circle
} from 'lucide-react';
import { useSocket } from '@/contexts/SocketContext';
import { joinWorkspace } from '@/lib/socket';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuthStore } from '@/store/useAuthStore';
import { useWorkspaceStore } from '@/store/useWorkspaceStore';
import { toast } from 'sonner';
import { ConfirmModal } from '@/components/ConfirmModal';

export default function WorkspacePage() {
  const router = useRouter();
  const params = useParams();
  const workspaceId = params.id as string;
  const { socket, isConnected, onlineUsers } = useSocket();
  const { setWorkspaceContext } = useAuthStore();
  const { hierarchy, setHierarchy, addSpace } = useWorkspaceStore();
  
  // Get userId from localStorage since it's not in the auth store
  const userId = typeof window !== 'undefined' ? localStorage.getItem('userId') : null;

  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  // Use spaces from workspace store hierarchy
  const spaces = hierarchy?.spaces || [];
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newSpaceName, setNewSpaceName] = useState('');
  const [newSpaceDescription, setNewSpaceDescription] = useState('');
  const [creating, setCreating] = useState(false);
  
  // Confirmation modal state
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{
    type: 'inactive' | 'active';
    spaceId: string;
    spaceName: string;
  } | null>(null);

  // Simple stats from fetched data
  const stats = {
    totalSpaces: spaces.length,
    totalMembers: workspace?.members.length || 0,
    activeSpaces: spaces.filter((s: any) => s.status !== 'inactive').length,
  };

  // Check if current user is owner or admin
  const isOwnerOrAdmin = () => {
    if (!workspace || !userId) return false;
    
    // Handle populated owner
    const workspaceOwnerId = typeof workspace.owner === 'string' 
      ? workspace.owner 
      : workspace.owner?._id;
    
    if (workspaceOwnerId === userId) return true;
    
    const member = workspace.members.find(m => 
      (typeof m.user === 'string' ? m.user : m.user._id) === userId
    );
    return member?.role === 'admin' || member?.role === 'owner';
  };

  // Get user role in space - check workspace level permissions
  const getUserRoleInSpace = (space: Space) => {
    if (!userId || !workspace) return null;
    
    // Check if user is workspace owner (handle both string and populated object)
    const workspaceOwnerId = typeof workspace.owner === 'string' 
      ? workspace.owner 
      : workspace.owner?._id;
    
    if (workspaceOwnerId === userId) {
      console.log('User is workspace owner');
      return 'owner';
    }
    
    // Check if user is workspace admin
    const workspaceMember = workspace.members.find(m => {
      const memberId = typeof m.user === 'string' ? m.user : m.user._id;
      return memberId === userId;
    });
    
    if (workspaceMember?.role === 'admin') {
      console.log('User is workspace admin');
      return 'admin';
    }
    
    if (workspaceMember?.role === 'owner') {
      console.log('User is workspace owner (from members)');
      return 'owner';
    }
    
    // Otherwise they're a member
    console.log('User is workspace member');
    return 'member';
  };

  useEffect(() => {
    const token = localStorage.getItem('authToken');
    if (!token) {
      router.push('/login');
      return;
    }

    setLoading(true);
    fetchWorkspaceData();
  }, [workspaceId, router]);

  // Re-fetch when window gains focus
  useEffect(() => {
    const handleFocus = () => {
      const token = localStorage.getItem('authToken');
      if (token && workspaceId) {
        fetchWorkspaceData();
      }
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [workspaceId]);

  useEffect(() => {
    if (socket && workspaceId) {
      joinWorkspace(workspaceId);

      socket.on('workspace:event', (payload) => {
        console.log('Received workspace event:', payload);
        if (payload.type === 'space_created' || payload.type === 'space_updated' || payload.type === 'space_deleted') {
          fetchSpaces();
        }
      });

      return () => {
        socket.off('workspace:event');
      };
    }
  }, [socket, workspaceId]);

  const fetchWorkspaceData = async () => {
    try {
      setError(null);
      
      if (!workspaceId || !/^[0-9a-fA-F]{24}$/.test(workspaceId)) {
        setError('Invalid workspace ID');
        setLoading(false);
        return;
      }

      const [workspaceRes, spacesRes] = await Promise.all([
        api.get(`/workspaces/${workspaceId}`),
        api.get(`/workspaces/${workspaceId}/spaces`),
      ]);
      
      console.log('Workspace data:', workspaceRes.data.data);
      console.log('Workspace owner:', workspaceRes.data.data.owner);
      console.log('Workspace members:', workspaceRes.data.data.members);
      console.log('Current userId from store:', userId);
      
      const workspaceData = workspaceRes.data.data;
      const spacesData = spacesRes.data.data;
      
      setWorkspace(workspaceData);
      
      // Update workspace store with hierarchy
      const spacesWithData = await Promise.all(
        spacesData.map(async (space: any) => {
          try {
            const listsRes = await api.get(`/spaces/${space._id}/lists`);
            const allLists = listsRes.data.data || [];
            
            const foldersRes = await api.get(`/spaces/${space._id}/folders`);
            const folders = foldersRes.data.data || [];
            
            const listsWithFolder = new Set<string>();
            const foldersWithLists = folders.map((folder: any) => {
              const folderLists = allLists.filter((list: any) => {
                const listFolderId = typeof list.folder === 'string' ? list.folder : list.folder?._id;
                if (listFolderId === folder._id) {
                  listsWithFolder.add(list._id);
                  return true;
                }
                return false;
              }).map((list: any) => ({ ...list, type: 'list' }));
              
              return { ...folder, type: 'folder', lists: folderLists };
            });
            
            const listsWithoutFolder = allLists
              .filter((list: any) => !listsWithFolder.has(list._id))
              .map((list: any) => ({ ...list, type: 'list' }));
            
            return {
              ...space,
              type: 'space',
              folders: foldersWithLists,
              listsWithoutFolder: listsWithoutFolder,
            };
          } catch (err) {
            return {
              ...space,
              type: 'space',
              folders: [],
              listsWithoutFolder: [],
            };
          }
        })
      );
      
      setHierarchy({
        workspaceId: workspaceData._id,
        workspaceName: workspaceData.name,
        spaces: spacesWithData,
      });

      // Set workspace context for permission system
      const workspaceOwnerId = typeof workspaceData.owner === 'string' ? workspaceData.owner : workspaceData.owner?._id;
      const isOwner = workspaceOwnerId === userId;
      const workspaceMember = workspaceData.members.find((m: any) => {
        const memberId = typeof m.user === 'string' ? m.user : m.user._id;
        return memberId === userId;
      });
      
      let role: 'owner' | 'admin' | 'member' | 'guest' = 'member';
      if (isOwner) role = 'owner';
      else if (workspaceMember?.role === 'admin' || workspaceMember?.role === 'owner') role = 'admin';
      else if (workspaceMember?.role === 'guest') role = 'guest';
      
      setWorkspaceContext(workspaceId, role);
      console.log('[WorkspacePage] Set workspace context:', { workspaceId, role });

    } catch (error: any) {
      console.error('Failed to fetch workspace data:', error);
      const errorMessage = error.response?.data?.message || 'Failed to load workspace';
      setError(errorMessage);
      
      if (error.response?.status === 404) {
        setTimeout(() => {
          router.push('/dashboard');
        }, 3000);
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchSpaces = async () => {
    try {
      const response = await api.get(`/workspaces/${workspaceId}/spaces`);
      const spacesData = response.data.data;
      
      // Update workspace store with new spaces
      const spacesWithData = await Promise.all(
        spacesData.map(async (space: any) => {
          try {
            const listsRes = await api.get(`/spaces/${space._id}/lists`);
            const allLists = listsRes.data.data || [];
            
            const foldersRes = await api.get(`/spaces/${space._id}/folders`);
            const folders = foldersRes.data.data || [];
            
            const listsWithFolder = new Set<string>();
            const foldersWithLists = folders.map((folder: any) => {
              const folderLists = allLists.filter((list: any) => {
                const listFolderId = typeof list.folder === 'string' ? list.folder : list.folder?._id;
                if (listFolderId === folder._id) {
                  listsWithFolder.add(list._id);
                  return true;
                }
                return false;
              }).map((list: any) => ({ ...list, type: 'list' }));
              
              return { ...folder, type: 'folder', lists: folderLists };
            });
            
            const listsWithoutFolder = allLists
              .filter((list: any) => !listsWithFolder.has(list._id))
              .map((list: any) => ({ ...list, type: 'list' }));
            
            return {
              ...space,
              type: 'space',
              folders: foldersWithLists,
              listsWithoutFolder: listsWithoutFolder,
            };
          } catch (err) {
            return {
              ...space,
              type: 'space',
              folders: [],
              listsWithoutFolder: [],
            };
          }
        })
      );
      
      if (hierarchy) {
        setHierarchy({
          ...hierarchy,
          spaces: spacesWithData,
        });
      }
    } catch (error: any) {
      console.error('Failed to fetch spaces:', error);
    }
  };

  const handleCreateSpace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSpaceName.trim()) return;
    
    setCreating(true);
    setError(null);

    try {
      const response = await api.post(`/workspaces/${workspaceId}/spaces`, {
        name: newSpaceName.trim(),
        description: newSpaceDescription.trim()
      });
      
      const newSpace = response.data.data;
      
      // Add to workspace store instantly
      addSpace({
        ...newSpace,
        type: 'space',
        folders: [],
        listsWithoutFolder: [],
      });
      
      setNewSpaceName('');
      setNewSpaceDescription('');
      setShowCreateModal(false);
      
      toast.success('Space created successfully!');
    } catch (error: any) {
      console.error('Failed to create space:', error);
      setError(error.response?.data?.message || 'Failed to create space');
      toast.error('Failed to create space');
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteSpace = async (spaceId: string) => {
    try {
      await api.delete(`/spaces/${spaceId}`);
      setSpaces(spaces.filter(s => s._id !== spaceId));
      toast.success('Space deleted successfully!');
    } catch (error) {
      console.error('Failed to delete space:', error);
      toast.error('Failed to delete space');
    }
  };

  const handleToggleStatus = async (spaceId: string, currentStatus?: string) => {
    try {
      const newStatus = currentStatus === 'inactive' ? 'active' : 'inactive';
      console.log('Toggling space status:', { spaceId, currentStatus, newStatus });
      
      const response = await api.patch(`/spaces/${spaceId}`, { status: newStatus });
      console.log('Status toggle response:', response.data);
      
      // Update workspace store
      if (hierarchy) {
        setHierarchy({
          ...hierarchy,
          spaces: hierarchy.spaces.map(s => 
            s._id === spaceId ? { ...s, status: newStatus } : s
          ),
        });
      }
      
      // Emit socket event for real-time updates
      if (socket) {
        socket.emit('workspace:event', {
          type: 'space_updated',
          workspaceId: workspaceId,
          data: { spaceId, status: newStatus }
        });
      }
      
      toast.success(newStatus === 'inactive' ? 'Space set to inactive!' : 'Space set to active!');
      
      // Refresh spaces to ensure consistency
      await fetchSpaces();
    } catch (error: any) {
      console.error('Failed to update space status:', error);
      console.error('Error response:', error.response?.data);
      const errorMsg = error.response?.data?.message || 'Failed to update space status';
      toast.error(errorMsg);
    }
  };

  const handleSpaceClick = (space: Space) => {
    const userRole = getUserRoleInSpace(space);
    const spaceStatus = space.status || 'active';
    
    // Owner/Admin can always access
    if (userRole === 'owner' || userRole === 'admin') {
      router.push(`/workspace/${workspaceId}/spaces/${space._id}`);
      return;
    }
    
    // Members cannot access inactive spaces
    if (spaceStatus === 'inactive') {
      toast.error('This space is currently inactive. Contact an admin for access.');
      return;
    }
    
    // Allow access to active spaces
    router.push(`/workspace/${workspaceId}/spaces/${space._id}`);
  };

  const openConfirmModal = (type: 'inactive' | 'active', spaceId: string, spaceName: string) => {
    setConfirmAction({ type, spaceId, spaceName });
    setShowConfirmModal(true);
  };

  const handleConfirmAction = () => {
    if (!confirmAction) return;
    
    const { type, spaceId } = confirmAction;
    
    if (type === 'inactive') {
      handleToggleStatus(spaceId, 'active');
    } else {
      handleToggleStatus(spaceId, 'inactive');
    }
    
    setConfirmAction(null);
  };

  const getConfirmModalProps = () => {
    if (!confirmAction) return null;
    
    const { type, spaceName } = confirmAction;
    
    if (type === 'inactive') {
      return {
        title: 'Set Space Inactive',
        description: `Are you sure you want to set "${spaceName}" as inactive? Members won't be able to access it.`,
        confirmText: 'Yes, Set Inactive',
        variant: 'default' as const
      };
    } else {
      return {
        title: 'Set Space Active',
        description: `Are you sure you want to set "${spaceName}" as active?`,
        confirmText: 'Yes, Set Active',
        variant: 'default' as const
      };
    }
  };

  const isUserOnline = (userId: string) => {
    return onlineUsers.includes(userId);
  };

  // Helper function to get space icon based on name
  const getSpaceIcon = (name: string) => {
    const lowerName = name.toLowerCase();
    if (lowerName.includes('marketing')) return Megaphone;
    if (lowerName.includes('engineering') || lowerName.includes('dev')) return Code2;
    if (lowerName.includes('design')) return Palette;
    if (lowerName.includes('finance') || lowerName.includes('sales')) return DollarSign;
    return Briefcase;
  };

  // Helper function to get space gradient
  const getSpaceGradient = (index: number) => {
    const gradients = [
      'from-purple-500 to-pink-500',
      'from-blue-500 to-cyan-500',
      'from-green-500 to-emerald-500',
      'from-orange-500 to-red-500',
      'from-indigo-500 to-purple-500',
      'from-yellow-500 to-orange-500'
    ];
    return gradients[index % gradients.length];
  };

  const confirmModalProps = getConfirmModalProps();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Loading workspace...</p>
        </div>
      </div>
    );
  }

  // Show error state if workspace failed to load
  if (error && !workspace) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="max-w-md w-full bg-card rounded-xl shadow-lg p-8 text-center border border-border">
          <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">⚠️</span>
          </div>
          <h2 className="text-xl font-bold text-foreground mb-2">Failed to Load Workspace</h2>
          <p className="text-muted-foreground mb-6">{error}</p>
          <div className="flex gap-3">
            <button
              onClick={() => router.push('/dashboard')}
              className="flex-1 px-4 py-2 border border-border text-muted-foreground rounded-lg hover:bg-accent transition-colors"
            >
              Back to Dashboard
            </button>
            <button
              onClick={() => {
                setLoading(true);
                setError(null);
                fetchWorkspaceData();
              }}
              className="flex-1 bg-gradient-to-r from-purple-600 to-blue-600 text-white px-4 py-2 rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Confirmation Modal */}
      {confirmModalProps && (
        <ConfirmModal
          open={showConfirmModal}
          onOpenChange={setShowConfirmModal}
          title={confirmModalProps.title}
          description={confirmModalProps.description}
          confirmText={confirmModalProps.confirmText}
          onConfirm={handleConfirmAction}
          variant={confirmModalProps.variant}
        />
      )}

      {/* Header */}
      <header className="bg-card border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push('/dashboard')}
                className="p-2 hover:bg-accent rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-muted-foreground" />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-foreground">{workspace?.name}</h1>
                <p className="text-sm text-muted-foreground">
                  {workspace?.members.length} members
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 px-3 py-2 bg-accent rounded-lg">
                <Users className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium text-foreground">
                  {onlineUsers.length} online
                </span>
              </div>
              <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-gray-400'}`} />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Error Message */}
        {error && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-destructive rounded-full"></div>
                <p className="text-sm text-destructive">{error}</p>
              </div>
              <button
                onClick={() => setError(null)}
                className="text-destructive hover:text-destructive/80"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Total Spaces */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Spaces</p>
                  <h3 className="text-2xl font-bold mt-2">{stats.totalSpaces}</h3>
                  <p className="text-xs text-muted-foreground mt-2">Organize your work</p>
                </div>
                <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/20 rounded-lg flex items-center justify-center">
                  <LayoutGrid className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Total Members */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Members</p>
                  <h3 className="text-2xl font-bold mt-2">{stats.totalMembers}</h3>
                  <div className="flex items-center gap-1 mt-2">
                    <Circle className="w-2 h-2 text-green-500 fill-green-500" />
                    <span className="text-xs text-muted-foreground">{onlineUsers.length} online</span>
                  </div>
                </div>
                <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center">
                  <Users className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Active Spaces */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Active Spaces</p>
                  <h3 className="text-2xl font-bold mt-2">{stats.activeSpaces}</h3>
                  <div className="flex items-center gap-1 mt-2">
                    <TrendingUp className="w-3 h-3 text-green-500" />
                    <span className="text-xs text-muted-foreground">Ready to work!</span>
                  </div>
                </div>
                <div className="w-12 h-12 bg-green-100 dark:bg-green-900/20 rounded-lg flex items-center justify-center">
                  <CheckCircle2 className="w-6 h-6 text-green-600 dark:text-green-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Your Spaces Section */}
        <div>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold">Your Spaces</h2>
              <p className="text-sm text-muted-foreground">Manage your team's departments</p>
            </div>
            {isOwnerOrAdmin() && (
              <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
                <DialogTrigger asChild>
                  <Button className="bg-blue-600 hover:bg-blue-700">
                    <Plus className="mr-2 h-4 w-4" />
                    New Space
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create New Space</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleCreateSpace} className="space-y-4">
                    <div>
                      <Label htmlFor="spaceName">Space Name</Label>
                      <Input
                        id="spaceName"
                        value={newSpaceName}
                        onChange={(e) => setNewSpaceName(e.target.value)}
                        placeholder="Engineering, Marketing, etc."
                        required
                        disabled={creating}
                      />
                    </div>
                    <div>
                      <Label htmlFor="spaceDescription">Description (Optional)</Label>
                      <Input
                        id="spaceDescription"
                        value={newSpaceDescription}
                        onChange={(e) => setNewSpaceDescription(e.target.value)}
                        placeholder="Brief description of this space"
                        disabled={creating}
                      />
                    </div>
                    <div className="flex gap-3">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setShowCreateModal(false);
                          setNewSpaceName('');
                          setNewSpaceDescription('');
                        }}
                        disabled={creating}
                        className="flex-1"
                      >
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        disabled={creating || !newSpaceName.trim()}
                        className="flex-1"
                      >
                        {creating ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Creating...
                          </>
                        ) : (
                          'Create'
                        )}
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            )}
          </div>

          {/* Spaces Grid */}
          {spaces.length === 0 ? (
            <Card className="border-2 border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Folder className="w-16 h-16 text-muted-foreground mb-4" />
                {isOwnerOrAdmin() ? (
                  <>
                    <h3 className="text-lg font-medium mb-2">No spaces yet</h3>
                    <p className="text-sm text-muted-foreground mb-4">Create your first space to organize your work</p>
                    <Button onClick={() => setShowCreateModal(true)}>
                      <Plus className="w-4 h-4 mr-2" />
                      Create Space
                    </Button>
                  </>
                ) : (
                  <>
                    <h3 className="text-lg font-medium mb-2">No spaces available</h3>
                    <p className="text-sm text-muted-foreground mb-4">You haven't been added to any spaces yet</p>
                    <p className="text-xs text-muted-foreground">Contact your workspace admin to get access to spaces</p>
                  </>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6">
              {/* Backend already filters spaces based on access (space member OR list member) */}
              {/* No need for client-side filtering - trust the backend! */}
              {spaces.map((space, index) => {
                const SpaceIcon = getSpaceIcon(space.name);
                const userRole = getUserRoleInSpace(space);
                const canManage = userRole === 'owner' || userRole === 'admin';
                const spaceStatus = space.status || 'active';
                
                return (
                  <Card
                    key={space._id}
                    className="cursor-pointer hover:shadow-lg transition-all hover:border-primary/50"
                  >
                    <CardContent className="pt-6" onClick={() => handleSpaceClick(space)}>
                      <div className="flex items-start justify-between mb-4">
                        <div className={`w-12 h-12 bg-gradient-to-r ${getSpaceGradient(index)} rounded-lg flex items-center justify-center`}>
                          <SpaceIcon className="w-6 h-6 text-white" />
                        </div>
                      </div>
                      
                      <h3 className="font-semibold text-lg mb-2">{space.name}</h3>
                      <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                        {space.description || 'No description'}
                      </p>
                      
                      <div className="flex items-center justify-between">
                        <div className="flex -space-x-2">
                          {space.members?.slice(0, 3).map((member: any, idx: number) => {
                            const userId = typeof member.user === 'string' ? member.user : member.user?._id;
                            const userName = typeof member.user === 'string' ? 'U' : member.user?.name || 'U';
                            const userAvatar = typeof member.user === 'string' ? undefined : member.user?.avatar;
                            const isOnline = isUserOnline(userId);
                            
                            return (
                              <div key={idx} className="relative">
                                <Avatar className="w-8 h-8 border-2 border-background">
                                  {userAvatar ? (
                                    <AvatarImage src={userAvatar} alt={userName} />
                                  ) : null}
                                  <AvatarFallback className="text-xs">
                                    {userName.charAt(0)}
                                  </AvatarFallback>
                                </Avatar>
                                {isOnline && (
                                  <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-white dark:border-gray-800 rounded-full" />
                                )}
                              </div>
                            );
                          })}
                          {(space.members?.length || 0) > 3 && (
                            <div className="w-8 h-8 rounded-full bg-muted border-2 border-background flex items-center justify-center">
                              <span className="text-xs font-medium">+{space.members.length - 3}</span>
                            </div>
                          )}
                        </div>
                        
                        {/* Status Badge - Clickable for admins */}
                        {canManage ? (
                          <Badge 
                            className={`cursor-pointer transition-all hover:opacity-80 ${
                              spaceStatus === 'inactive' 
                                ? 'bg-gray-100 text-gray-700 dark:bg-gray-900/20 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-900/30' 
                                : 'bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400 hover:bg-blue-200 dark:hover:bg-blue-900/30'
                            }`}
                            onClick={(e) => {
                              e.stopPropagation();
                              if (spaceStatus === 'inactive') {
                                openConfirmModal('active', space._id, space.name);
                              } else {
                                openConfirmModal('inactive', space._id, space.name);
                              }
                            }}
                          >
                            {spaceStatus === 'inactive' ? 'Inactive' : 'Active'}
                          </Badge>
                        ) : (
                          <Badge className={
                            spaceStatus === 'inactive' 
                              ? 'bg-gray-100 text-gray-700 dark:bg-gray-900/20 dark:text-gray-400' 
                              : 'bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400'
                          }>
                            {spaceStatus === 'inactive' ? 'Inactive' : 'Active'}
                          </Badge>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}

              {/* Create New Space Card - Only for Admin/Owner */}
              {isOwnerOrAdmin() && (
                <Card
                  className="border-2 border-dashed cursor-pointer hover:border-primary hover:bg-accent/50 transition-all"
                  onClick={() => setShowCreateModal(true)}
                >
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <div className="w-12 h-12 bg-muted rounded-lg flex items-center justify-center mb-4">
                      <Plus className="w-6 h-6 text-muted-foreground" />
                    </div>
                    <h3 className="font-medium mb-1">Create New Space</h3>
                    <p className="text-sm text-muted-foreground">Add a new department</p>
                  </CardContent>
                </Card>
              )}
              {/* This section is no longer needed - backend already filters spaces correctly */}
              {/* If user has list access, they'll see the space above */}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
