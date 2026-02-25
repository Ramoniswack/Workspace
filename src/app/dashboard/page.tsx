'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { clearAuthData, getCurrentUser } from '@/lib/auth';
import { useAuthStore } from '@/store/useAuthStore';
import { useThemeStore } from '@/store/useThemeStore';
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
  Edit,
  Moon,
  Sun
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

// Generate avatar color based on workspace name - Premium gradient colors
const getAvatarColor = (name: string) => {
  const colors = [
    { gradient: 'from-blue-600 via-blue-500 to-cyan-500', shadow: 'shadow-blue-500/50' },
    { gradient: 'from-emerald-600 via-emerald-500 to-teal-500', shadow: 'shadow-emerald-500/50' },
    { gradient: 'from-violet-600 via-purple-500 to-fuchsia-500', shadow: 'shadow-violet-500/50' },
    { gradient: 'from-amber-600 via-orange-500 to-red-500', shadow: 'shadow-amber-500/50' },
    { gradient: 'from-indigo-600 via-indigo-500 to-blue-500', shadow: 'shadow-indigo-500/50' },
    { gradient: 'from-rose-600 via-pink-500 to-fuchsia-500', shadow: 'shadow-rose-500/50' },
  ];
  const index = name.charCodeAt(0) % colors.length;
  return colors[index];
};

export default function DashboardPage() {
  const router = useRouter();
  const { isConnected, isConnecting } = useSocket();
  const { userId } = useAuthStore();
  const { themeMode, setThemeMode } = useThemeStore();
  
  // Local state for workspaces
  const [workspaces, setWorkspaces] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  // Fetch workspaces
  const fetchWorkspaces = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get('/workspaces');
      setWorkspaces(response.data.data || []);
    } catch (err: any) {
      console.error('Failed to fetch workspaces:', err);
      setError(err.response?.data?.message || 'Failed to load workspaces');
    } finally {
      setLoading(false);
    }
  };

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

  // Apply theme to document
  useEffect(() => {
    if (themeMode === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [themeMode]);

  // Fetch spaces for each workspace
  useEffect(() => {
    if (!workspaces || workspaces.length === 0) return;
    
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

    if (workspaces && workspaces.length > 0) {
      fetchSpacesForWorkspaces();
    }
  }, [workspaces]);

  const handleCreateWorkspace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWorkspaceName.trim()) return;
    
    setCreating(true);

    try {
      const response = await api.post('/workspaces', { name: newWorkspaceName.trim() });
      const newWorkspace = response.data.data;
      
      // Optimistic update
      setWorkspaces(prev => [...prev, newWorkspace]);
      
      setNewWorkspaceName('');
      setShowCreateModal(false);
      toast.success('Workspace created successfully!');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to create workspace');
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteWorkspace = async (workspaceId: string, workspaceName: string) => {
    if (!confirm(`Are you sure you want to delete "${workspaceName}"? This action cannot be undone.`)) {
      return;
    }

    try {
      await api.delete(`/workspaces/${workspaceId}`);
      
      // Optimistic update
      setWorkspaces(prev => prev.filter(w => w._id !== workspaceId));
      
      toast.success('Workspace deleted successfully!');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to delete workspace');
    }
  };

  const handleRenameWorkspace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!renameWorkspaceName.trim() || !selectedWorkspace) return;
    
    setRenaming(true);

    try {
      await api.patch(`/workspaces/${selectedWorkspace._id}`, { name: renameWorkspaceName.trim() });
      
      // Optimistic update
      setWorkspaces(prev => prev.map(w => 
        w._id === selectedWorkspace._id 
          ? { ...w, name: renameWorkspaceName.trim() }
          : w
      ));
      
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
            <div className="flex items-center gap-4">
              {/* Theme Toggle */}
              <button
                onClick={() => setThemeMode(themeMode === 'dark' ? 'light' : 'dark')}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                title={themeMode === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              >
                {themeMode === 'dark' ? (
                  <Sun className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                ) : (
                  <Moon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                )}
              </button>

              {/* Connection Status */}
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${
                  isConnected ? 'bg-green-500' : isConnecting ? 'bg-yellow-500 animate-pulse' : 'bg-gray-400'
                }`} />
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {isConnected ? 'Connected' : isConnecting ? 'Connecting...' : 'Disconnected'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex items-center justify-between mb-10">
          <div>
            <h2 className="text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">
              Your Workspaces
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
              You have {workspaces.length} active workspace{workspaces.length !== 1 ? 's' : ''}
            </p>
          </div>
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
            <Card className="border-2 border-dashed border-gray-300 dark:border-gray-700 bg-white/80 dark:bg-slate-900/50 backdrop-blur-sm max-w-md w-full">
              <CardContent className="flex flex-col items-center justify-center py-12 px-6">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-blue-500/30">
                  <Plus className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  Create your first workspace
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 text-center mb-6">
                  Workspaces help you organize your projects and collaborate with your team
                </p>
                <Button
                  onClick={() => setShowCreateModal(true)}
                  className="bg-[#135bec] hover:bg-[#0d4ac4] text-white shadow-lg shadow-blue-500/30"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create Workspace
                </Button>
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Add New Workspace Card - First Position */}
            <Card
              onClick={() => setShowCreateModal(true)}
              className="group border-2 border-dashed border-slate-200/60 dark:border-slate-800/50 bg-white/80 dark:bg-slate-900/50 backdrop-blur-sm hover:border-blue-400 dark:hover:border-blue-500 cursor-pointer transition-all hover:-translate-y-1 hover:shadow-xl"
            >
              <CardContent className="flex flex-col items-center justify-center py-16 px-6">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-blue-500/30 group-hover:shadow-blue-500/50 transition-shadow">
                  <Plus className="w-8 h-8 text-white" />
                </div>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-1 tracking-tight">
                  Create New Workspace
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
                  Start a new project
                </p>
              </CardContent>
            </Card>

            {/* Existing Workspaces */}
            {workspaces.map((workspace) => {
              const spaces = workspaceSpaces[workspace._id] || [];
              const isWorkspaceOwner = workspace.owner === userId || workspace.members?.some((m: any) => {
                const memberId = typeof m.user === 'string' ? m.user : m.user?._id;
                return memberId === userId && (m.role === 'owner' || m.role === 'admin');
              });
              const colorScheme = getAvatarColor(workspace.name);
              
              return (
                <Card
                  key={workspace._id}
                  onClick={() => handleLaunchWorkspace(workspace._id)}
                  className="group relative bg-white/80 dark:bg-slate-900/50 backdrop-blur-sm border border-slate-200/60 dark:border-slate-800/50 hover:border-blue-400/30 dark:hover:border-blue-500/30 transition-all hover:-translate-y-1 hover:shadow-xl cursor-pointer overflow-hidden"
                >
                  {/* Hover Arrow Icon */}
                  <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="w-8 h-8 rounded-full bg-blue-500/10 dark:bg-blue-500/20 flex items-center justify-center">
                      <ArrowRight className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    </div>
                  </div>

                  <CardContent className="p-6">
                    {/* Header with Icon and Menu */}
                    <div className="flex items-start gap-4 mb-6">
                      <div className={`relative w-14 h-14 bg-gradient-to-br ${colorScheme.gradient} rounded-2xl flex items-center justify-center text-white font-bold text-xl shadow-lg ${colorScheme.shadow}`}>
                        {workspace.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-gray-900 dark:text-white text-base tracking-tight line-clamp-1 mb-1">
                          {workspace.name}
                        </h3>
                        <div className="flex items-center gap-2">
                          <Users className="w-3.5 h-3.5 text-gray-400" />
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {workspace.members.length} member{workspace.members.length !== 1 ? 's' : ''}
                          </span>
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
                              router.push(`/workspace/${workspace._id}/settings/members`);
                            }}>
                              <SettingsIcon className="w-4 h-4 mr-2" />
                              Settings
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>

                    {/* Activity Status */}
                    <div className="flex items-center gap-2 mb-4 text-xs text-gray-500 dark:text-gray-400">
                      <Clock className="w-3.5 h-3.5" />
                      <span>Last active: {timeAgo(workspace.updatedAt)}</span>
                    </div>

                    {/* Member Avatars - Overlapping Style */}
                    {workspace.members && workspace.members.length > 0 && (
                      <div className="flex items-center gap-2">
                        <div className="flex -space-x-2">
                          {workspace.members.slice(0, 4).map((member: any, idx: number) => {
                            const user = typeof member.user === 'object' ? member.user : null;
                            const userName = user?.name || 'User';
                            return (
                              <div
                                key={idx}
                                className="w-7 h-7 rounded-full bg-gradient-to-br from-gray-400 to-gray-600 border-2 border-white dark:border-slate-900 flex items-center justify-center text-white text-xs font-medium"
                                title={userName}
                              >
                                {userName.charAt(0).toUpperCase()}
                              </div>
                            );
                          })}
                          {workspace.members.length > 4 && (
                            <div className="w-7 h-7 rounded-full bg-gray-200 dark:bg-gray-700 border-2 border-white dark:border-slate-900 flex items-center justify-center text-xs text-gray-600 dark:text-gray-300 font-medium">
                              +{workspace.members.length - 4}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
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
