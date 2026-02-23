'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { api } from '@/lib/axios';
import { List, Workspace } from '@/types';
import {
  ArrowLeft,
  Settings,
  UserPlus,
  Plus,
  Folder,
  FileText,
  MoreVertical,
  Trash2,
  Edit,
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  Users,
  AlertCircle,
  Power,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { InviteMemberModal } from '@/components/InviteMemberModal';
import { SpaceMemberManagement } from '@/components/SpaceMemberManagement';
import { useSpaceStore } from '@/store/useSpaceStore';
import { useWorkspaceStore } from '@/store/useWorkspaceStore';
import { useAuthStore } from '@/store/useAuthStore';
import { usePermission, SpacePermissionLevel } from '@/hooks/usePermission';
import { toast } from 'sonner';

export default function SpaceHomePage() {
  const router = useRouter();
  const params = useParams();
  const workspaceId = params.id as string;
  const spaceId = params.spaceId as string;
  const { setWorkspaceContext, currentWorkspaceId, currentWorkspaceRole } = useAuthStore();
  
  // Get userId from localStorage since it's not in the auth store
  const userId = typeof window !== 'undefined' ? localStorage.getItem('userId') : null;
  
  // Get folder ID from URL query params for highlighting
  const [highlightedFolderId, setHighlightedFolderId] = useState<string | null>(null);
  
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const folderId = urlParams.get('folder');
      if (folderId) {
        setHighlightedFolderId(folderId);
        // Auto-expand the folder
        setExpandedFolders(prev => ({ ...prev, [folderId]: true }));
        // Remove highlight after 3 seconds
        setTimeout(() => setHighlightedFolderId(null), 3000);
        // Scroll to folder
        setTimeout(() => {
          const folderElement = document.getElementById(`folder-${folderId}`);
          if (folderElement) {
            folderElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }, 100);
      }
    }
  }, []);
  
  // State for space permission level
  const [spacePermissionLevel, setSpacePermissionLevel] = useState<SpacePermissionLevel | null>(null);
  
  // Use permission hook with space permission level
  const { can, isAdmin, isOwner } = usePermission(spacePermissionLevel);
  
  // Determine if buttons should show - use isAdmin/isOwner from permission hook
  const shouldShowAdminButtons = isAdmin || isOwner;

  const { currentSpace, lists, folders, loading, fetchSpace, fetchLists, fetchFolders, createList, createFolder, updateSpace, deleteList, addMemberToSpace, removeMemberFromSpace } = useSpaceStore();
  
  // Also use global workspace store for sidebar updates
  const { addFolder: addFolderToWorkspace, addList: addListToWorkspace } = useWorkspaceStore();

  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [isReadOnly, setIsReadOnly] = useState(false);
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({});
  const [showCreateListModal, setShowCreateListModal] = useState(false);
  const [showCreateFolderModal, setShowCreateFolderModal] = useState(false);
  const [showSettingsSheet, setShowSettingsSheet] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showSpaceMemberManagement, setShowSpaceMemberManagement] = useState(false);
  const [newListData, setNewListData] = useState({ name: '', description: '', folderId: '' });
  const [newFolderData, setNewFolderData] = useState({ name: '', color: '#3b82f6' });
  const [spaceSettings, setSpaceSettings] = useState({ name: '', description: '' });
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [searchMemberQuery, setSearchMemberQuery] = useState('');
  const [showAllMembersModal, setShowAllMembersModal] = useState(false);

  // Consolidated loading state
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    // CRITICAL: Guard against undefined params and missing auth
    if (!spaceId || !workspaceId || !userId) {
      console.warn('[SpacePage] Waiting for params/auth:', { spaceId, workspaceId, userId });
      return;
    }

    let isMounted = true; // Prevent state updates after unmount

    const initializePage = async () => {
      setIsInitializing(true);
      
      try {
        console.log('[SpacePage] Initializing with:', { spaceId, workspaceId, userId });
        
        // Fetch workspace data first (needed for permissions)
        const workspaceRes = await api.get(`/workspaces/${workspaceId}`);
        
        if (!isMounted) return; // Component unmounted, abort
        
        const workspaceData = workspaceRes.data.data;
        setWorkspace(workspaceData);

        // Set workspace context for permission system
        const workspaceOwnerId = typeof workspaceData.owner === 'string' 
          ? workspaceData.owner 
          : workspaceData.owner?._id;
        const isOwnerUser = workspaceOwnerId === userId;
        
        const workspaceMember = workspaceData.members.find((m: any) => {
          const memberId = typeof m.user === 'string' ? m.user : m.user._id;
          return memberId === userId;
        });
        
        let role: 'owner' | 'admin' | 'member' | 'guest' = 'member';
        if (isOwnerUser) role = 'owner';
        else if (workspaceMember?.role === 'admin' || workspaceMember?.role === 'owner') role = 'admin';
        else if (workspaceMember?.role === 'guest') role = 'guest';
        
        setWorkspaceContext(workspaceId, role);

        // Fetch space data in parallel (all have guard checks in store)
        await Promise.all([
          fetchSpace(spaceId),
          fetchLists(spaceId),
          fetchFolders(spaceId),
        ]);

        if (!isMounted) return;

        // Fetch space permission level
        try {
          const spaceMembersRes = await api.get(`/spaces/${spaceId}/space-members`);
          if (!isMounted) return;
          
          const currentUserMember = spaceMembersRes.data.data.find(
            (m: any) => {
              const memberId = typeof m.user === 'string' ? m.user : m.user?._id;
              return memberId === userId;
            }
          );
          
          if (currentUserMember?.spacePermissionLevel) {
            setSpacePermissionLevel(currentUserMember.spacePermissionLevel);
          }
        } catch (error) {
          console.error('[SpacePage] Failed to fetch space permission level:', error);
          // Non-critical error, continue
        }

      } catch (error: any) {
        if (!isMounted) return;
        
        console.error('[SpacePage] Initialization failed:', error);
        
        if (error.response?.status === 404) {
          toast.error('Space not found');
          router.push(`/workspace/${workspaceId}`);
        } else if (error.response?.status === 403) {
          toast.error('You do not have access to this space');
          router.push(`/workspace/${workspaceId}`);
        } else {
          toast.error('Failed to load space data');
        }
      } finally {
        if (isMounted) {
          setIsInitializing(false);
        }
      }
    };

    initializePage();

    // Cleanup function to prevent state updates after unmount
    return () => {
      isMounted = false;
    };
  }, [spaceId, workspaceId, userId]); // All dependencies included

  const calculateTaskStats = (listsToCalculate: List[]) => {
    let totalTasks = 0;
    let completedTasks = 0;
    listsToCalculate.forEach(list => {
      const taskCount = (list as any).taskCount || 0;
      const completedCount = (list as any).completedCount || 0;
      totalTasks += taskCount;
      completedTasks += completedCount;
    });
    const percentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
    return { totalTasks, completedTasks, percentage };
  };

  const handleCreateList = async () => {
    if (!newListData.name.trim()) {
      toast.error('List name is required');
      return;
    }
    try {
      const listPayload: any = {
        name: newListData.name,
        description: newListData.description,
      };
      
      // Add folderId if creating list inside a folder
      if (newListData.folderId) {
        listPayload.folderId = newListData.folderId;
      }
      
      const list = await createList(spaceId, listPayload);
      
      // Update global workspace store for sidebar
      addListToWorkspace(spaceId, {
        _id: list._id,
        name: list.name,
        space: spaceId,
        folder: newListData.folderId || undefined,
        workspace: workspaceId,
        status: 'active',
        type: 'list',
      }, newListData.folderId || undefined);
      
      setShowCreateListModal(false);
      setNewListData({ name: '', description: '', folderId: '' });
      toast.success('List created successfully');
      
      // Refresh folders to show the new list
      await fetchFolders(spaceId);
    } catch (error) {
      toast.error('Failed to create list');
    }
  };

  const handleOpenCreateListModal = (folderId?: string) => {
    setNewListData({ name: '', description: '', folderId: folderId || '' });
    setShowCreateListModal(true);
  };

  const handleCreateFolder = async () => {
    if (!newFolderData.name.trim()) {
      toast.error('Folder name is required');
      return;
    }
    try {
      const folder = await createFolder(spaceId, newFolderData);
      
      // Update global workspace store for sidebar
      addFolderToWorkspace(spaceId, {
        _id: folder._id,
        name: folder.name,
        space: spaceId,
        workspace: workspaceId,
        lists: [],
        type: 'folder',
      });
      
      setShowCreateFolderModal(false);
      setNewFolderData({ name: '', color: '#3b82f6' });
      toast.success('Folder created successfully');
    } catch (error) {
      toast.error('Failed to create folder');
    }
  };

  const handleUpdateSpace = async () => {
    try {
      await updateSpace(spaceId, spaceSettings);
      setShowSettingsSheet(false);
      toast.success('Space updated successfully');
    } catch (error) {
      toast.error('Failed to update space');
    }
  };

  const handleActivateSpace = async () => {
    try {
      await updateSpace(spaceId, { status: 'active' });
      setIsReadOnly(false);
      toast.success('Space activated successfully');
      // Refresh space data
      await fetchSpace(spaceId);
    } catch (error) {
      toast.error('Failed to activate space');
    }
  };

  const handleDeleteList = async (listId: string, listName: string) => {
    try {
      await deleteList(listId);
      toast.success('List deleted successfully');
    } catch (error) {
      toast.error('Failed to delete list');
    }
  };

  const handleAddMembers = async () => {
    if (selectedMembers.length === 0) {
      toast.error('Please select at least one member');
      return;
    }
    try {
      await Promise.all(selectedMembers.map(memberId => addMemberToSpace(spaceId, memberId)));
      
      // Send notifications to assigned members
      try {
        await Promise.all(
          selectedMembers.map(memberId =>
            api.post('/notifications', {
              recipientId: memberId,
              type: 'space_assignment',
              title: 'Assigned to Space',
              message: `You've been assigned to "${space?.name}"`,
              link: `/workspace/${workspaceId}/spaces/${spaceId}`,
            })
          )
        );
      } catch (notifError) {
        console.error('Failed to send notifications:', notifError);
      }
      
      setSelectedMembers([]);
      setShowInviteModal(false);
      toast.success(`${selectedMembers.length} member(s) assigned successfully`);
      // Refresh space data to show new members
      await fetchSpace(spaceId);
    } catch (error) {
      toast.error('Failed to assign members');
    }
  };

  const handleRemoveMember = async (memberId: string, memberName: string) => {
    try {
      await removeMemberFromSpace(spaceId, memberId);
      toast.success('Member removed successfully');
      // Refresh space data to update member list
      await fetchSpace(spaceId);
    } catch (error) {
      toast.error('Failed to remove member');
    }
  };

  const toggleMemberSelection = (memberId: string) => {
    setSelectedMembers(prev => prev.includes(memberId) ? prev.filter(id => id !== memberId) : [...prev, memberId]);
  };

  const toggleFolder = (folderId: string) => {
    setExpandedFolders(prev => ({ ...prev, [folderId]: !prev[folderId] }));
  };

  const getInitials = (name: string) => {
    return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const formatTimeAgo = (date: string) => {
    const now = new Date();
    const past = new Date(date);
    const diffInSeconds = Math.floor((now.getTime() - past.getTime()) / 1000);
    if (diffInSeconds < 60) return 'just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    return `${Math.floor(diffInSeconds / 86400)}d ago`;
  };

  if (isInitializing || (loading && !currentSpace)) return <LoadingSkeleton />;
  if (!currentSpace) return null;

  const spaceColor = (currentSpace as any)?.color || '#3b82f6';
  
  // Backend already filters lists and folders based on user access
  // Owners/admins see all, regular members see only their lists
  // No need for client-side filtering - trust the backend!
  const accessibleLists = lists; // Backend filtered
  const unassignedLists = accessibleLists.filter(list => !(list as any).folderId);
  const accessibleFolders = folders; // Backend filtered
  
  // Calculate stats based on accessible lists (already filtered by backend)
  const stats = calculateTaskStats(accessibleLists);
  
  const spaceMemberIds = currentSpace?.members?.map((m: any) => typeof m.user === 'string' ? m.user : m.user?._id) || [];
  const isSpaceMember = spaceMemberIds.includes(userId);
  
  // Only owners and admins can create content (not regular members or space members)
  const canCreateContent = (isAdmin || isOwner) && !isReadOnly;
  
  const availableMembers = workspace?.members.filter((m: any) => {
    const userId = typeof m.user === 'string' ? m.user : m.user?._id;
    return !spaceMemberIds.includes(userId);
  }) || [];

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      <header className="bg-card border-b border-border sticky top-0 z-10">
        <div className="w-full px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            {/* Left side - Back button and title */}
            <div className="flex items-start gap-3 min-w-0 flex-1">
              <button 
                onClick={() => router.push(`/workspace/${workspaceId}`)} 
                className="p-2 hover:bg-accent rounded-lg transition-colors flex-shrink-0 mt-1"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-xl sm:text-2xl font-bold truncate">{currentSpace.name}</h1>
                  <Badge className={currentSpace.status === 'inactive' ? 'bg-gray-100 text-gray-700 dark:bg-gray-900/20 dark:text-gray-400' : 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400'}>
                    {currentSpace.status === 'inactive' ? 'Inactive' : 'Active'}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{currentSpace.description || 'Collaborative workspace for team projects'}</p>
              </div>
            </div>
            
            {/* Right side - Admin actions */}
            {shouldShowAdminButtons && (
              <div className="flex items-center gap-2 flex-shrink-0">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm">
                      <MoreVertical className="w-4 h-4" />
                      <span className="ml-2 hidden sm:inline">Actions</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem onClick={() => setShowInviteModal(true)}>
                      <UserPlus className="w-4 h-4 mr-2" />
                      Invite Members
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setShowSettingsSheet(true)}>
                      <Settings className="w-4 h-4 mr-2" />
                      Space Settings
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                
                {/* Modals */}
                <InviteMemberModal
                  open={showInviteModal}
                  onOpenChange={setShowInviteModal}
                  spaceColor={spaceColor}
                  availableMembers={availableMembers}
                  selectedMembers={selectedMembers}
                  onToggleMemberSelection={toggleMemberSelection}
                  onAddMembers={handleAddMembers}
                  searchQuery={searchMemberQuery}
                  onSearchChange={setSearchMemberQuery}
                  getInitials={getInitials}
                />
                
                <Sheet open={showSettingsSheet} onOpenChange={setShowSettingsSheet}>
                  <SheetContent>
                    <SheetHeader>
                      <SheetTitle>Space Settings</SheetTitle>
                      <SheetDescription>Manage your space configuration</SheetDescription>
                    </SheetHeader>
                    <div className="space-y-6 mt-6">
                      <div>
                        <Label htmlFor="spaceName">Space Name</Label>
                        <Input 
                          id="spaceName" 
                          value={spaceSettings.name} 
                          onChange={(e) => setSpaceSettings({ ...spaceSettings, name: e.target.value })} 
                          placeholder="Space name" 
                        />
                      </div>
                      <div>
                        <Label htmlFor="spaceDescription">Description</Label>
                        <Textarea 
                          id="spaceDescription" 
                          value={spaceSettings.description} 
                          onChange={(e) => setSpaceSettings({ ...spaceSettings, description: e.target.value })} 
                          placeholder="Space description" 
                          rows={3} 
                        />
                      </div>
                      <div className="flex gap-3">
                        <Button variant="outline" onClick={() => setShowSettingsSheet(false)} className="flex-1">
                          Cancel
                        </Button>
                        <Button onClick={handleUpdateSpace} className="flex-1">
                          Save Changes
                        </Button>
                      </div>
                    </div>
                  </SheetContent>
                </Sheet>
              </div>
            )}
          </div>
        </div>
      </header>

      {isReadOnly && shouldShowAdminButtons && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border-b border-yellow-200 dark:border-yellow-800">
          <div className="w-full px-4 sm:px-6 lg:px-8 py-3">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex items-center gap-2 text-yellow-800 dark:text-yellow-200">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <p className="text-sm font-medium">This space is archived. Click activate to restore access for all members.</p>
              </div>
              <Button size="sm" onClick={handleActivateSpace} className="bg-yellow-600 hover:bg-yellow-700 w-full sm:w-auto">
                <Power className="w-4 h-4 mr-2" />
                Activate Space
              </Button>
            </div>
          </div>
        </div>
      )}
      
      <main className="w-full px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Task Progress</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <div className="text-3xl font-bold" style={{ color: spaceColor }}>{stats.percentage}%</div>
                  <p className="text-xs text-muted-foreground mt-1">{stats.completedTasks} of {stats.totalTasks} tasks</p>
                </div>
                <div className="relative w-16 h-16 flex-shrink-0">
                  <svg className="w-16 h-16 transform -rotate-90">
                    <circle cx="32" cy="32" r="28" stroke="currentColor" strokeWidth="6" fill="none" className="text-muted" />
                    <circle cx="32" cy="32" r="28" stroke={spaceColor} strokeWidth="6" fill="none" strokeDasharray={`${stats.percentage * 1.76} 176`} className="transition-all duration-300" />
                  </svg>
                  <CheckCircle2 className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-6" style={{ color: spaceColor }} />
                </div>
              </div>
              <Progress value={stats.percentage} className="h-2" style={{ backgroundColor: `${spaceColor}20` }} />
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Lists</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-3xl font-bold">{accessibleLists.length}</div>
                  <p className="text-xs text-muted-foreground mt-1">{accessibleFolders.length} folders</p>
                </div>
                <div className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${spaceColor}20` }}>
                  <FileText className="w-6 h-6" style={{ color: spaceColor }} />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="sm:col-span-2 lg:col-span-1">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Team Members</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-3xl font-bold">{currentSpace.members?.length || 0}</div>
                  <p className="text-xs text-muted-foreground mt-1">Active members</p>
                </div>
                <div className="flex -space-x-2">
                  {currentSpace.members?.slice(0, 3).map((member: any, idx: number) => {
                    const user = typeof member.user === 'object' ? member.user : null;
                    return (
                      <Avatar key={idx} className="w-8 h-8 border-2 border-background cursor-pointer hover:z-10 transition-transform hover:scale-110" onClick={() => setShowAllMembersModal(true)}>
                        <AvatarImage src={user?.avatar} />
                        <AvatarFallback className="text-xs" style={{ backgroundColor: spaceColor, color: 'white' }}>
                          {user ? getInitials(user.name) : '?'}
                        </AvatarFallback>
                      </Avatar>
                    );
                  })}
                  {currentSpace.members && currentSpace.members.length > 3 && (
                    <Avatar className="w-8 h-8 border-2 border-background cursor-pointer hover:z-10 transition-transform hover:scale-110 bg-muted" onClick={() => setShowAllMembersModal(true)}>
                      <AvatarFallback className="text-xs font-semibold">
                        +{currentSpace.members.length - 3}
                      </AvatarFallback>
                    </Avatar>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Lists & Folders Section */}
        <div>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <h2 className="text-xl font-bold">Lists & Folders</h2>
            {canCreateContent && (
              <div className="flex items-center gap-2 flex-wrap">
                <Dialog open={showCreateFolderModal} onOpenChange={setShowCreateFolderModal}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm" className="flex-1 sm:flex-none">
                      <Folder className="w-4 h-4 mr-2" />
                      New Folder
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Create New Folder</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="folderName">Folder Name</Label>
                        <Input 
                          id="folderName" 
                          value={newFolderData.name} 
                          onChange={(e) => setNewFolderData({ ...newFolderData, name: e.target.value })} 
                          placeholder="Marketing, Engineering, etc." 
                        />
                      </div>
                      <div>
                        <Label htmlFor="folderColor">Color</Label>
                        <Input 
                          id="folderColor" 
                          type="color" 
                          value={newFolderData.color} 
                          onChange={(e) => setNewFolderData({ ...newFolderData, color: e.target.value })} 
                        />
                      </div>
                      <div className="flex gap-3">
                        <Button variant="outline" onClick={() => setShowCreateFolderModal(false)} className="flex-1">
                          Cancel
                        </Button>
                        <Button onClick={handleCreateFolder} className="flex-1">
                          Create Folder
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
                
                <Dialog open={showCreateListModal} onOpenChange={setShowCreateListModal}>
                  <DialogTrigger asChild>
                    <Button size="sm" style={{ backgroundColor: spaceColor }} onClick={() => handleOpenCreateListModal()} className="flex-1 sm:flex-none">
                      <Plus className="w-4 h-4 mr-2" />
                      New List
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>{newListData.folderId ? 'Create List in Folder' : 'Create New List'}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="listName">List Name</Label>
                        <Input 
                          id="listName" 
                          value={newListData.name} 
                          onChange={(e) => setNewListData({ ...newListData, name: e.target.value })} 
                          placeholder="Sprint Planning, Backlog, etc." 
                        />
                      </div>
                      <div>
                        <Label htmlFor="listDescription">Description</Label>
                        <Textarea 
                          id="listDescription" 
                          value={newListData.description} 
                          onChange={(e) => setNewListData({ ...newListData, description: e.target.value })} 
                          placeholder="Brief description of this list" 
                          rows={3} 
                        />
                      </div>
                      <div className="flex gap-3">
                        <Button variant="outline" onClick={() => setShowCreateListModal(false)} className="flex-1">
                          Cancel
                        </Button>
                        <Button onClick={handleCreateList} className="flex-1">
                          Create List
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            )}
          </div>
          
          {accessibleLists.length === 0 && accessibleFolders.length === 0 ? (
            <Card className="border-2 border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-12 sm:py-16">
                <div className="w-16 h-16 rounded-full flex items-center justify-center mb-4" style={{ backgroundColor: `${spaceColor}20` }}>
                  <FileText className="w-8 h-8" style={{ color: spaceColor }} />
                </div>
                <h3 className="text-lg font-semibold mb-2">Get Started</h3>
                <p className="text-sm text-muted-foreground text-center mb-6 max-w-md px-4">
                  Create your first list to start organizing tasks, or create folders to group related lists together.
                </p>
                {canCreateContent && (
                  <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto px-4">
                    <Button variant="outline" onClick={() => setShowCreateFolderModal(true)} className="w-full sm:w-auto">
                      <Folder className="w-4 h-4 mr-2" />
                      Create Folder
                    </Button>
                    <Button onClick={() => handleOpenCreateListModal()} style={{ backgroundColor: spaceColor }} className="w-full sm:w-auto">
                      <Plus className="w-4 h-4 mr-2" />
                      Create List
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {accessibleFolders.map((folder) => (
                <Card 
                  key={folder._id}
                  id={`folder-${folder._id}`}
                  className={highlightedFolderId === folder._id ? 'animate-pulse ring-4 ring-blue-500 ring-opacity-50' : ''}
                >
                  <CardContent className="p-0">
                    <div className={`flex items-center justify-between p-4 border-b transition-colors duration-300 ${highlightedFolderId === folder._id ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}>
                      <button 
                        onClick={() => toggleFolder(folder._id)} 
                        className="flex items-center gap-3 flex-1 hover:opacity-80 transition-opacity min-w-0"
                      >
                        {expandedFolders[folder._id] ? (
                          <ChevronDown className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                        ) : (
                          <ChevronRight className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                        )}
                        <div 
                          className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" 
                          style={{ backgroundColor: `${folder.color || spaceColor}20` }}
                        >
                          <Folder className="w-5 h-5" style={{ color: folder.color || spaceColor }} />
                        </div>
                        <div className="text-left min-w-0 flex-1">
                          <h3 className="font-semibold truncate">{folder.name}</h3>
                          <p className="text-sm text-muted-foreground">{folder.lists?.length || 0} lists</p>
                        </div>
                      </button>
                      {canCreateContent && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenCreateListModal(folder._id);
                          }}
                          className="ml-2 flex-shrink-0"
                        >
                          <Plus className="w-4 h-4 sm:mr-1" />
                          <span className="hidden sm:inline">Add List</span>
                        </Button>
                      )}
                    </div>
                    {expandedFolders[folder._id] && (
                      <div className="divide-y">
                        {folder.lists?.length === 0 ? (
                          <div className="p-8 text-center">
                            <p className="text-sm text-muted-foreground mb-3">No lists in this folder</p>
                            {canCreateContent && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleOpenCreateListModal(folder._id)}
                              >
                                <Plus className="w-4 h-4 mr-2" />
                                Create First List
                              </Button>
                            )}
                          </div>
                        ) : (
                          folder.lists?.map((list) => (
                            <ListItem
                              key={list._id}
                              list={list}
                              spaceColor={spaceColor}
                              workspaceId={workspaceId}
                              spaceId={spaceId}
                              canManage={shouldShowAdminButtons}
                              isReadOnly={isReadOnly}
                              onDelete={handleDeleteList}
                            />
                          ))
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
              
              {unassignedLists.length > 0 && (
                <div className="space-y-2">
                  {unassignedLists.map((list) => (
                    <ListItem
                      key={list._id}
                      list={list}
                      spaceColor={spaceColor}
                      workspaceId={workspaceId}
                      spaceId={spaceId}
                      canManage={shouldShowAdminButtons}
                      isReadOnly={isReadOnly}
                      onDelete={handleDeleteList}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
        
        {/* All Members Modal */}
        <Dialog open={showAllMembersModal} onOpenChange={setShowAllMembersModal}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
            <DialogHeader>
              <DialogTitle>Team Members ({currentSpace.members?.length || 0})</DialogTitle>
            </DialogHeader>
            <div className="divide-y overflow-y-auto flex-1">
              {currentSpace.members?.map((member: any, idx: number) => {
                const user = typeof member.user === 'object' ? member.user : null;
                const memberId = typeof member.user === 'string' ? member.user : member.user?._id;
                const canRemove = shouldShowAdminButtons && memberId !== userId;
                return (
                  <div key={idx} className="p-4 hover:bg-accent/50 transition-colors group">
                    <div className="flex items-center gap-3">
                      <Avatar className="w-10 h-10 flex-shrink-0">
                        <AvatarImage src={user?.avatar} />
                        <AvatarFallback style={{ backgroundColor: spaceColor, color: 'white' }}>
                          {user ? getInitials(user.name) : '?'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{user?.name || 'Unknown'}</p>
                        <p className="text-sm text-muted-foreground truncate">{user?.email}</p>
                      </div>
                      <Badge variant="outline" className="capitalize flex-shrink-0">{member.role}</Badge>
                      {canRemove && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                          onClick={() => handleRemoveMember(memberId, user?.name || 'member')}
                        >
                          <Trash2 className="w-4 h-4 text-red-600" />
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}

interface ListItemProps { list: List; spaceColor: string; workspaceId: string; spaceId: string; canManage: boolean; isReadOnly: boolean; onDelete: (listId: string, listName: string) => void; }

function ListItem({ list, spaceColor, workspaceId, spaceId, canManage, isReadOnly, onDelete }: ListItemProps) {
  const router = useRouter();
  const taskCount = (list as any).taskCount || 0;
  const completedCount = (list as any).completedCount || 0;
  const progress = taskCount > 0 ? Math.round((completedCount / taskCount) * 100) : 0;
  return (<Card className="cursor-pointer hover:shadow-md transition-all hover:border-primary/50" onClick={() => router.push(`/workspace/${workspaceId}/spaces/${spaceId}/lists/${list._id}`)}><CardContent className="p-4"><div className="flex items-center justify-between"><div className="flex items-center gap-3 flex-1"><div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${spaceColor}20` }}><FileText className="w-5 h-5" style={{ color: spaceColor }} /></div><div className="flex-1 min-w-0"><h4 className="font-semibold truncate">{list.name}</h4><div className="flex items-center gap-4 mt-1"><span className="text-sm text-muted-foreground">{completedCount}/{taskCount} tasks</span><div className="flex-1 max-w-[100px]"><Progress value={progress} className="h-1.5" /></div><span className="text-xs text-muted-foreground">{progress}%</span></div></div></div>{canManage && !isReadOnly && (<DropdownMenu><DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}><button className="p-1 hover:bg-accent rounded transition-colors"><MoreVertical className="w-4 h-4 text-muted-foreground" /></button></DropdownMenuTrigger><DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}><DropdownMenuItem onClick={(e) => { e.stopPropagation(); }}><Edit className="w-4 h-4 mr-2" />Edit List</DropdownMenuItem><DropdownMenuItem className="text-red-600 focus:text-red-600" onClick={(e) => { e.stopPropagation(); onDelete(list._id, list.name); }}><Trash2 className="w-4 h-4 mr-2" />Delete List</DropdownMenuItem></DropdownMenuContent></DropdownMenu>)}</div></CardContent></Card>);
}

function LoadingSkeleton() {
  return (<div className="min-h-screen bg-background"><header className="bg-card border-b border-border"><div className="w-full px-4 sm:px-6 lg:px-8 py-4"><div className="flex items-center justify-between"><div className="flex items-center gap-4"><Skeleton className="h-10 w-10 rounded-lg" /><div><Skeleton className="h-8 w-48 mb-2" /><Skeleton className="h-4 w-64" /></div></div><div className="flex items-center gap-3"><Skeleton className="h-10 w-24" /><Skeleton className="h-10 w-10" /></div></div></div></header><main className="w-full px-4 sm:px-6 lg:px-8 py-8"><div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"><div className="space-y-6">{[1, 2, 3].map((i) => (<Card key={i}><CardHeader><Skeleton className="h-4 w-24" /></CardHeader><CardContent><Skeleton className="h-12 w-full" /></CardContent></Card>))}</div></div><div className="space-y-4 mt-6">{[1, 2, 3].map((i) => (<Card key={i}><CardContent className="p-4"><Skeleton className="h-16 w-full" /></CardContent></Card>))}</div></main></div>);
}
