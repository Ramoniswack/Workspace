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
  Layout,
  MoreHorizontal,
  Settings as SettingsIcon,
  Edit,
  Moon,
  Sun,
  Bell,
  Zap,
  Clock,
  CheckSquare
} from 'lucide-react';
import { useSocket } from '@/contexts/SocketContext';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
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
import { api } from '@/lib/axios';
import UpgradeModal from '@/components/subscription/UpgradeModal';
import { useSubscription } from '@/hooks/useSubscription';
import { useSystemSettings } from '@/hooks/useSystemSettings';
import { PricingModal } from '@/components/modals/PricingModal';
import { NotificationsModal } from '@/components/modals/NotificationsModal';

// Generate avatar color based on workspace name
const getAvatarColor = (name: string) => {
  const colors = [
    'bg-blue-500',
    'bg-emerald-500',
    'bg-violet-500',
    'bg-amber-500',
    'bg-indigo-500',
    'bg-rose-500',
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
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedWorkspace, setSelectedWorkspace] = useState<any>(null);
  const [newWorkspaceName, setNewWorkspaceName] = useState('');
  const [renameWorkspaceName, setRenameWorkspaceName] = useState('');
  const [creating, setCreating] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [userName, setUserName] = useState('');

  // Subscription state
  const { subscription, canCreateWorkspace } = useSubscription();
  const { whatsappNumber } = useSystemSettings();
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [upgradeReason, setUpgradeReason] = useState<'workspace' | 'member' | 'access-control' | 'trial-expired'>('workspace');

  // Notification state
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  
  // Modal states
  const [showPricingModal, setShowPricingModal] = useState(false);
  const [showNotificationsModal, setShowNotificationsModal] = useState(false);

  // Fetch unread notifications count
  const fetchNotificationCount = async () => {
    try {
      const response = await api.get('/notifications/unread-count');
      setUnreadNotifications(response.data.count || 0);
    } catch (error) {
      console.error('Failed to fetch notification count:', error);
    }
  };

  useEffect(() => {
    fetchNotificationCount();
    // Poll for notifications every 30 seconds
    const interval = setInterval(fetchNotificationCount, 30000);
    return () => clearInterval(interval);
  }, []);

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

  const handleCreateWorkspace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWorkspaceName.trim()) return;
    
    // Check workspace limit before creating
    if (!canCreateWorkspace()) {
      setUpgradeReason('workspace');
      setShowUpgradeModal(true);
      setShowCreateModal(false);
      return;
    }
    
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
      // Check for workspace limit error from backend
      if (error.response?.data?.code === 'WORKSPACE_LIMIT_REACHED') {
        toast.error(error.response?.data?.message || 'Workspace limit reached. Please upgrade your plan.');
        setUpgradeReason('workspace');
        setShowUpgradeModal(true);
        setShowCreateModal(false);
      } else {
        toast.error(error.response?.data?.message || 'Failed to create workspace');
      }
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteWorkspace = async () => {
    if (!selectedWorkspace) return;
    
    setDeleting(true);

    try {
      await api.delete(`/workspaces/${selectedWorkspace._id}`);
      
      // Optimistic update
      setWorkspaces(prev => prev.filter(w => w._id !== selectedWorkspace._id));
      
      setShowDeleteModal(false);
      setSelectedWorkspace(null);
      toast.success('Workspace deleted successfully!');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to delete workspace');
    } finally {
      setDeleting(false);
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
      toast.error(error.response?.data?.message || 'Failed to rename workspace');
    } finally {
      setRenaming(false);
    }
  };

  const handleLaunchWorkspace = (workspaceId: string) => {
    router.push(`/workspace/${workspaceId}`);
  };

  const handleLogout = () => {
    clearAuthData();
    router.push('/login');
  };

  if (loading && workspaces.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const plan = subscription?.plan;
  const usage = subscription?.usage;
  const isPaid = subscription?.isPaid;
  const planName = plan?.name || "Free Plan";
  const daysRemaining = subscription?.daysRemaining || 0;
  const isActive = subscription?.status === 'active';
  const isExpired = subscription?.status === 'expired';
  
  // Get usage limits (only show 4 key metrics)
  const maxWorkspaces = plan?.features.maxWorkspaces ?? 1;
  const maxSpaces = plan?.features.maxSpaces ?? 2;
  const maxTasks = plan?.features.maxTasks ?? 100;
  const maxMembers = plan?.features.maxMembers ?? 5;
  
  // Calculate percentages
  const workspacePercentage = maxWorkspaces === -1 ? 0 : (workspaces.length / maxWorkspaces) * 100;
  const spacePercentage = maxSpaces === -1 ? 0 : ((usage?.spaces || 0) / maxSpaces) * 100;
  const taskPercentage = maxTasks === -1 ? 0 : ((usage?.tasks || 0) / maxTasks) * 100;

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Header */}
      <header className="bg-background border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">TaskFlow</h1>
              <p className="text-sm text-muted-foreground">Welcome back, {userName}</p>
            </div>
            <div className="flex items-center gap-3">
              {/* Pricing Link */}
              <button
                onClick={() => setShowPricingModal(true)}
                className="text-sm font-medium hover:text-primary transition-colors"
              >
                Pricing
              </button>

              {/* Notification Bell */}
              <button
                onClick={() => setShowNotificationsModal(true)}
                className="relative p-2 rounded-lg hover:bg-muted transition-colors"
                title="Notifications"
              >
                <Bell className="w-5 h-5" />
                {unreadNotifications > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                    {unreadNotifications > 9 ? '9+' : unreadNotifications}
                  </span>
                )}
              </button>

              {/* Theme Toggle */}
              <button
                onClick={() => setThemeMode(themeMode === 'dark' ? 'light' : 'dark')}
                className="p-2 rounded-lg hover:bg-muted transition-colors"
                title={themeMode === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              >
                {themeMode === 'dark' ? (
                  <Sun className="w-5 h-5" />
                ) : (
                  <Moon className="w-5 h-5" />
                )}
              </button>

              {/* Connection Status */}
              <div className="hidden md:flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${
                  isConnected ? 'bg-green-500' : isConnecting ? 'bg-yellow-500 animate-pulse' : 'bg-gray-400'
                }`} />
                <span className="text-sm text-muted-foreground">
                  {isConnected ? 'Connected' : isConnecting ? 'Connecting...' : 'Disconnected'}
                </span>
              </div>

              {/* Logout Button */}
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 transition-colors"
                title="Logout"
              >
                <LogOut className="w-4 h-4" />
                <span className="text-sm font-medium hidden sm:inline">Logout</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-6 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <h2 className="text-3xl font-semibold tracking-tight">Workspaces</h2>
          <p className="text-muted-foreground mt-1">Manage and access your project spaces</p>
        </div>

        {/* Subscription Status Alert */}
        {isPaid && isActive && daysRemaining <= 7 && (
          <Alert variant={daysRemaining <= 3 ? "destructive" : "warning"} className="mb-8">
            <Clock className="h-4 w-4" />
            <AlertDescription className="flex items-center justify-between">
              <div>
                <span className="font-medium">
                  {daysRemaining} day{daysRemaining === 1 ? '' : 's'} remaining
                </span>
                <span className="text-sm ml-2">
                  Your subscription expires soon. Contact support to renew.
                </span>
              </div>
              <Button
                size="sm"
                onClick={() => {
                  if (whatsappNumber) {
                    window.open(`https://wa.me/${whatsappNumber.replace(/[^0-9]/g, '')}?text=Hi, I would like to renew my subscription for ${planName}`, '_blank');
                  }
                }}
                className="ml-4"
              >
                <Zap className="w-3.5 h-3.5 mr-1.5" />
                Renew
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {isExpired && (
          <Alert variant="destructive" className="mb-8">
            <Clock className="h-4 w-4" />
            <AlertDescription className="flex items-center justify-between">
              <div>
                <span className="font-medium">Subscription Expired</span>
                <span className="text-sm ml-2">
                  Your premium features have been disabled. Contact support to reactivate.
                </span>
              </div>
              <Button
                size="sm"
                onClick={() => {
                  if (whatsappNumber) {
                    window.open(`https://wa.me/${whatsappNumber.replace(/[^0-9]/g, '')}?text=Hi, I would like to reactivate my subscription`, '_blank');
                  }
                }}
                className="ml-4"
              >
                <Zap className="w-3.5 h-3.5 mr-1.5" />
                Reactivate
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {/* Plan Overview Card (Compact) */}
        <Card className="mb-8">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold">{planName}</h3>
                <p className="text-sm text-muted-foreground">
                  {isPaid && isActive ? (
                    <span className={
                      daysRemaining <= 3 ? 'text-red-500 font-medium' :
                      daysRemaining <= 7 ? 'text-orange-500 font-medium' :
                      daysRemaining <= 14 ? 'text-yellow-600 font-medium' :
                      'text-green-600 font-medium'
                    }>
                      {daysRemaining} days remaining
                    </span>
                  ) : isPaid && isExpired ? (
                    <span className="text-red-500 font-medium">Expired</span>
                  ) : (
                    'Free plan'
                  )}
                </p>
              </div>
              {!isPaid && (
                <Button
                  onClick={() => {
                    setUpgradeReason('workspace');
                    setShowUpgradeModal(true);
                  }}
                >
                  Upgrade
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {/* Workspaces */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Briefcase className="w-4 h-4" />
                  <span className="text-sm">Workspaces</span>
                </div>
                <div className="text-2xl font-semibold">
                  {workspaces.length} / {maxWorkspaces === -1 ? '∞' : maxWorkspaces}
                </div>
                {maxWorkspaces !== -1 && (
                  <Progress value={workspacePercentage} className="h-1.5" />
                )}
              </div>

              {/* Spaces */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Layout className="w-4 h-4" />
                  <span className="text-sm">Spaces</span>
                </div>
                <div className="text-2xl font-semibold">
                  {usage?.spaces || 0} / {maxSpaces === -1 ? '∞' : maxSpaces}
                </div>
                {maxSpaces !== -1 && (
                  <Progress value={spacePercentage} className="h-1.5" />
                )}
              </div>

              {/* Tasks */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <CheckSquare className="w-4 h-4" />
                  <span className="text-sm">Tasks</span>
                </div>
                <div className="text-2xl font-semibold">
                  {usage?.tasks || 0} / {maxTasks === -1 ? '∞' : maxTasks}
                </div>
                {maxTasks !== -1 && (
                  <Progress value={taskPercentage} className="h-1.5" />
                )}
              </div>

              {/* Members */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Users className="w-4 h-4" />
                  <span className="text-sm">Members</span>
                </div>
                <div className="text-2xl font-semibold">
                  {maxMembers === -1 ? 'Unlimited' : `Up to ${maxMembers}`}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Workspace Section Header */}
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-semibold">Your Workspaces</h3>
          <Button onClick={() => setShowCreateModal(true)}>
            <Plus className="w-4 h-4 mr-2" />
            New Workspace
          </Button>
        </div>

        {/* Error Message */}
        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertDescription className="flex items-center justify-between">
              <span>{error}</span>
              <button
                onClick={() => fetchWorkspaces()}
                className="hover:opacity-70"
              >
                ✕
              </button>
            </AlertDescription>
          </Alert>
        )}

        {/* Workspace Grid */}
        {workspaces.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <div className={`w-16 h-16 ${getAvatarColor('default')} rounded-2xl flex items-center justify-center mb-4`}>
                <Plus className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Create your first workspace</h3>
              <p className="text-sm text-muted-foreground text-center mb-6 max-w-sm">
                Workspaces help you organize your projects and collaborate with your team
              </p>
              <Button onClick={() => setShowCreateModal(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Create Workspace
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {workspaces.map((workspace) => {
              // Check if current user is the actual owner (not just admin)
              const isActualOwner = workspace.owner === userId;
              const colorScheme = getAvatarColor(workspace.name);
              
              return (
                <Card
                  key={workspace._id}
                  className="group cursor-pointer hover:shadow-lg transition-all hover:-translate-y-0.5"
                  onClick={() => handleLaunchWorkspace(workspace._id)}
                >
                  <CardHeader>
                    <div className="flex items-start gap-3">
                      <div className={`w-12 h-12 ${colorScheme} rounded-xl flex items-center justify-center text-white font-semibold text-lg flex-shrink-0`}>
                        {workspace.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold truncate">{workspace.name}</h4>
                        <div className="flex items-center gap-1.5 text-sm text-muted-foreground mt-1">
                          <Users className="w-3.5 h-3.5" />
                          <span>{workspace.members.length} member{workspace.members.length !== 1 ? 's' : ''}</span>
                        </div>
                      </div>
                      
                      {/* Triple Dot Menu - Only for Actual Owner */}
                      {isActualOwner && (
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
                              setSelectedWorkspace(workspace);
                              setRenameWorkspaceName(workspace.name);
                              setShowRenameModal(true);
                            }}>
                              <Edit className="w-4 h-4 mr-2" />
                              Rename
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={(e) => {
                              e.stopPropagation();
                              router.push(`/workspace/${workspace._id}/settings/members`);
                            }}>
                              <SettingsIcon className="w-4 h-4 mr-2" />
                              Settings
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedWorkspace(workspace);
                                setShowDeleteModal(true);
                              }}
                              className="text-red-600 focus:text-red-600"
                            >
                              <LogOut className="w-4 h-4 mr-2" />
                              Delete Workspace
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      Click to open workspace
                    </p>
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
                className="flex-1"
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

      {/* Delete Workspace Confirmation Modal */}
      <Dialog open={showDeleteModal} onOpenChange={setShowDeleteModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Workspace</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Are you sure you want to delete <span className="font-semibold text-foreground">"{selectedWorkspace?.name}"</span>?
            </p>
            <p className="text-sm text-red-600 font-medium">
              This action cannot be undone. All spaces, lists, tasks, and data in this workspace will be permanently deleted.
            </p>
            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowDeleteModal(false);
                  setSelectedWorkspace(null);
                }}
                disabled={deleting}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={handleDeleteWorkspace}
                disabled={deleting}
                className="flex-1"
              >
                {deleting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  'Delete Workspace'
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Upgrade Modal */}
      <UpgradeModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        reason={upgradeReason}
        currentCount={workspaces.length}
        maxAllowed={subscription?.plan?.features.maxWorkspaces || 1}
        workspaceName={workspaces[0]?.name || 'My Workspace'}
        whatsappNumber={whatsappNumber}
      />

      {/* Pricing Modal */}
      <PricingModal
        isOpen={showPricingModal}
        onClose={() => setShowPricingModal(false)}
      />

      {/* Notifications Modal */}
      <NotificationsModal
        isOpen={showNotificationsModal}
        onClose={() => setShowNotificationsModal(false)}
      />
    </div>
  );
}
