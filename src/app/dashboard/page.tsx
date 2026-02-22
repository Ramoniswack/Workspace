'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { clearAuthData, getCurrentUser } from '@/lib/auth';
import { useWorkspaceStore } from '@/store/useWorkspaceStore';
import { useAuthStore } from '@/store/useAuthStore';
import { 
  Plus, 
  Loader2, 
  Users, 
  LogOut, 
  Briefcase,
  Terminal,
  Palette,
  Megaphone,
  Layout,
  MoreHorizontal,
  ArrowRight,
  Settings as SettingsIcon,
  Clock,
  Edit
} from 'lucide-react';
import { useSocket } from '@/contexts/SocketContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from 'sonner';
import { timeAgo } from '@/lib/timeAgo';
import { api } from '@/lib/axios';

// Icon mapping for space types
const spaceIconMap: Record<string, React.ReactNode> = {
  engineering: <Terminal className="w-3.5 h-3.5" />,
  design: <Palette className="w-3.5 h-3.5" />,
  marketing: <Megaphone className="w-3.5 h-3.5" />,
  default: <Layout className="w-3.5 h-3.5" />
};

// Generate avatar color based on workspace name
const getAvatarColor = (name: string) => {
  const colors = [
    'from-purple-500 to-pink-500',
    'from-blue-500 to-cyan-500',
    'from-green-500 to-emerald-500',
    'from-orange-500 to-red-500',
    'from-indigo-500 to-purple-500',
    'from-yellow-500 to-orange-500'
  ];
  const index = name.charCodeAt(0) % colors.length;
  return colors[index];
};

export default function DashboardPage() {
  const router = useRouter();
  const { isConnected } = useSocket();
  const { userId } = useAuthStore();
  const { 
    workspaces, 
    loading, 
    error, 
    fetchWorkspaces, 
    createWorkspace, 
    updateWorkspace,
    deleteWorkspace,
    lastAccessedWorkspaceId,
    setLastAccessedWorkspace
  } = useWorkspaceStore();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [selectedWorkspace, setSelectedWorkspace] = useState<any>(null);
  const [newWorkspaceName, setNewWorkspaceName] = useState('');
  const [renameWorkspaceName, setRenameWorkspaceName] = useState('');
  const [creating, setCreating] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [userName, setUserName] = useState('');
  const [workspaceSpaces, setWorkspaceSpaces] = useState<Record<string, any[]>>({});
  const [workspaceActivity, setWorkspaceActivity] = useState<Record<string, string>>({});

  useEffect(() => {
    const user = getCurrentUser();
    if (user?.name) {
      setUserName(user.name);
    }
    
    const token = localStorage.getItem('authToken');
    if (!token) {
      router.push('/login');
      return;
    }

    fetchWorkspaces();
  }, [router]);

  // Fetch spaces for each workspace
  useEffect(() => {
    const fetchSpacesForWorkspaces = async () => {
      for (const workspace of workspaces) {
        try {
          const response = await api.get(`/workspaces/${workspace._id}/spaces`);
          setWorkspaceSpaces(prev => ({
            ...prev,
            [workspace._id]: response.data.data || []
          }));
        } catch (error) {
          console.error(`Failed to fetch spaces for workspace ${workspace._id}:`, error);
        }
      }
    };

    if (workspaces.length > 0) {
      fetchSpacesForWorkspaces();
    }
  }, [workspaces]);

  const handleCreateWorkspace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWorkspaceName.trim()) return;
    
    setCreating(true);

    try {
      await createWorkspace(newWorkspaceName.trim());
      setNewWorkspaceName('');
      setShowCreateModal(false);
      toast.success('Workspace created successfully!');
    } catch (error: any) {
      toast.error('Failed to create workspace');
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteWorkspace = async (workspaceId: string, workspaceName: string) => {
    if (!confirm(`Are you sure you want to delete "${workspaceName}"? This action cannot be undone.`)) {
      return;
    }

    try {
      await deleteWorkspace(workspaceId);
      toast.success('Workspace deleted successfully!');
    } catch (error) {
      toast.error('Failed to delete workspace');
    }
  };

  const handleRenameWorkspace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!renameWorkspaceName.trim() || !selectedWorkspace) return;
    
    setRenaming(true);

    try {
      await updateWorkspace(selectedWorkspace._id, { name: renameWorkspaceName.trim() });
      setRenameWorkspaceName('');
      setShowRenameModal(false);
      setSelectedWorkspace(null);
      toast.success('Workspace renamed successfully!');
    } catch (error: any) {
      toast.error('Failed to rename workspace');
    } finally {
      setRenaming(false);
    }
  };

  const openRenameModal = (workspace: any) => {
    setSelectedWorkspace(workspace);
    setRenameWorkspaceName(workspace.name);
    setShowRenameModal(true);
  };

  const handleLaunchWorkspace = (workspaceId: string) => {
    setLastAccessedWorkspace(workspaceId);
    router.push(`/workspace/${workspaceId}`);
  };

  const handleLogout = () => {
    clearAuthData();
    router.push('/login');
  };

  const getSpaceIcon = (spaceName: string) => {
    const lowerName = spaceName.toLowerCase();
    if (lowerName.includes('engineering') || lowerName.includes('dev')) return spaceIconMap.engineering;
    if (lowerName.includes('design')) return spaceIconMap.design;
    if (lowerName.includes('marketing')) return spaceIconMap.marketing;
    return spaceIconMap.default;
  };

  const isOwner = (workspace: any) => {
    if (!userId) return false;
    return workspace.owner === userId || workspace.owner?._id === userId;
  };

  if (loading && workspaces.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f6f6f8] dark:bg-[#101622]">
        <Loader2 className="w-8 h-8 animate-spin text-[#135bec]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f6f6f8] dark:bg-[#101622]">
      {/* Header */}
      <header className="bg-white dark:bg-[#1a1f2e] border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">TaskFlow</h1>
              <p className="text-sm text-gray-600 dark:text-gray-400">Welcome back, {userName}</p>
            </div>
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-gray-400'}`} />
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {isConnected ? 'Connected' : 'Disconnected'}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Your Workspaces</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Select a workspace to get started
            </p>
          </div>
          <Button
            onClick={() => setShowCreateModal(true)}
            className="bg-[#135bec] hover:bg-[#0d4ac4] text-white"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Workspace
          </Button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
              <button
                onClick={() => fetchWorkspaces()}
                className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {workspaces.length === 0 ? (
          <div className="flex items-center justify-center py-20">
            <Card className="border-2 border-dashed border-gray-300 dark:border-gray-700 bg-white dark:bg-[#1a1f2e] max-w-md w-full">
              <CardContent className="flex flex-col items-center justify-center py-12 px-6">
                <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center mb-4">
                  <Plus className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  Create your first workspace
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 text-center mb-6">
                  Workspaces help you organize your projects and collaborate with your team
                </p>
                <Button
                  onClick={() => setShowCreateModal(true)}
                  className="bg-[#135bec] hover:bg-[#0d4ac4] text-white"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create Workspace
                </Button>
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {workspaces.map((workspace) => {
              const spaces = workspaceSpaces[workspace._id] || [];
              const isCurrentWorkspace = workspace._id === lastAccessedWorkspaceId;
              const isWorkspaceOwner = isOwner(workspace);
              
              return (
                <Card
                  key={workspace._id}
                  className="group relative bg-white dark:bg-[#1a1f2e] border border-gray-200 dark:border-gray-800 hover:border-[#135bec] dark:hover:border-[#135bec] transition-all hover:shadow-lg"
                >
                  <CardContent className="p-6">
                    {/* Header */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-12 h-12 bg-gradient-to-r ${getAvatarColor(workspace.name)} rounded-lg flex items-center justify-center text-white font-bold text-lg`}>
                          {workspace.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900 dark:text-white line-clamp-1">
                            {workspace.name}
                          </h3>
                          <div className="flex items-center gap-2 mt-1">
                            <Users className="w-3.5 h-3.5 text-gray-400" />
                            <span className="text-xs text-gray-600 dark:text-gray-400">
                              {workspace.members.length} members
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      {/* Triple Dot Menu - Only for Owner */}
                      {isWorkspaceOwner && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={(e) => {
                              e.stopPropagation();
                              openRenameModal(workspace);
                            }}>
                              <Edit className="w-4 h-4 mr-2" />
                              Rename Workspace
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={(e) => {
                              e.stopPropagation();
                              handleLaunchWorkspace(workspace._id);
                              router.push(`/workspace/${workspace._id}/settings/members`);
                            }}>
                              <SettingsIcon className="w-4 h-4 mr-2" />
                              Settings
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>

                    {/* Current Badge */}
                    {isCurrentWorkspace && (
                      <Badge className="mb-3 bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400 hover:bg-green-100">
                        Current
                      </Badge>
                    )}

                    {/* Activity Status */}
                    <div className="flex items-center gap-2 mb-4 text-xs text-gray-600 dark:text-gray-400">
                      <Clock className="w-3.5 h-3.5" />
                      <span>Active {timeAgo(workspace.updatedAt)}</span>
                    </div>

                    {/* Space Icons Preview */}
                    {spaces.length > 0 && (
                      <div className="flex items-center gap-1 mb-4">
                        {spaces.slice(0, 4).map((space, idx) => (
                          <div
                            key={idx}
                            className="w-7 h-7 bg-gray-100 dark:bg-gray-800 rounded flex items-center justify-center text-gray-600 dark:text-gray-400"
                          >
                            {getSpaceIcon(space.name)}
                          </div>
                        ))}
                        {spaces.length > 4 && (
                          <div className="w-7 h-7 bg-gray-100 dark:bg-gray-800 rounded flex items-center justify-center text-xs text-gray-600 dark:text-gray-400 font-medium">
                            +{spaces.length - 4}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Launch Button */}
                    <Button
                      onClick={() => handleLaunchWorkspace(workspace._id)}
                      variant="outline"
                      className="w-full group-hover:bg-[#135bec] group-hover:text-white group-hover:border-[#135bec] transition-all"
                    >
                      Launch Workspace
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </CardContent>
                </Card>
              );
            })}

            {/* Add New Workspace Card */}
            <Card
              onClick={() => setShowCreateModal(true)}
              className="border-2 border-dashed border-gray-300 dark:border-gray-700 bg-white dark:bg-[#1a1f2e] hover:border-[#135bec] dark:hover:border-[#135bec] cursor-pointer transition-all hover:shadow-lg"
            >
              <CardContent className="flex flex-col items-center justify-center py-12 px-6">
                <div className="w-12 h-12 bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center mb-4">
                  <Plus className="w-6 h-6 text-gray-400" />
                </div>
                <h3 className="font-medium text-gray-900 dark:text-white mb-1">
                  Create New Workspace
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 text-center">
                  Start a new project
                </p>
              </CardContent>
            </Card>
          </div>
        )}
      </main>

      {/* Create Workspace Modal */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Workspace</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateWorkspace} className="space-y-4">
            <div>
              <Label htmlFor="workspaceName">Workspace Name</Label>
              <Input
                id="workspaceName"
                value={newWorkspaceName}
                onChange={(e) => setNewWorkspaceName(e.target.value)}
                placeholder="My Awesome Workspace"
                required
                disabled={creating}
              />
            </div>
            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowCreateModal(false);
                  setNewWorkspaceName('');
                }}
                disabled={creating}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={creating || !newWorkspaceName.trim()}
                className="flex-1 bg-[#135bec] hover:bg-[#0d4ac4]"
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

      {/* Rename Workspace Modal */}
      <Dialog open={showRenameModal} onOpenChange={setShowRenameModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename Workspace</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleRenameWorkspace} className="space-y-4">
            <div>
              <Label htmlFor="renameWorkspaceName">Workspace Name</Label>
              <Input
                id="renameWorkspaceName"
                value={renameWorkspaceName}
                onChange={(e) => setRenameWorkspaceName(e.target.value)}
                placeholder="Enter new workspace name"
                required
                disabled={renaming}
                autoFocus
              />
            </div>
            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowRenameModal(false);
                  setRenameWorkspaceName('');
                  setSelectedWorkspace(null);
                }}
                disabled={renaming}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={renaming || !renameWorkspaceName.trim()}
                className="flex-1 bg-[#135bec] hover:bg-[#0d4ac4]"
              >
                {renaming ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Renaming...
                  </>
                ) : (
                  'Rename'
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
