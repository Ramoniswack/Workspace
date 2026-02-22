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
  
  // State for space permission level
  const [spacePermissionLevel, setSpacePermissionLevel] = useState<SpacePermissionLevel | null>(null);
  
  // Use permission hook with space permission level
  const { can, isAdmin, isOwner } = usePermission(spacePermissionLevel);
  
  // Determine if buttons should show - use isAdmin/isOwner from permission hook
  const shouldShowAdminButtons = isAdmin || isOwner;
  
  // Debug: Log permission state
  console.log('[SpacePage] Permission state:', { 
    isAdmin, 
    isOwner, 
    shouldShowAdminButtons,
    spacePermissionLevel, 
    currentWorkspaceRole,
    currentWorkspaceId,
    workspaceId 
  });

  const { currentSpace, lists, folders, loading, fetchSpace, fetchLists, fetchFolders, createList, createFolder, updateSpace, deleteList, addMemberToSpace, removeMemberFromSpace } = useSpaceStore();

  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [isReadOnly, setIsReadOnly] = useState(false);
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({});
  const [showCreateListModal, setShowCreateListModal] = useState(false);
  const [showCreateFolderModal, setShowCreateFolderModal] = useState(false);
  const [showSettingsSheet, setShowSettingsSheet] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showSpaceMemberManagement, setShowSpaceMemberManagement] = useState(false);
  const [newListData, setNewListData] = useState({ name: '', description: '' });
  const [newFolderData, setNewFolderData] = useState({ name: '', color: '#3b82f6' });
  const [spaceSettings, setSpaceSettings] = useState({ name: '', description: '' });
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [searchMemberQuery, setSearchMemberQuery] = useState('');
  const [showAllMembersModal, setShowAllMembersModal] = useState(false);

  useEffect(() => {
    fetchData();
  }, [spaceId]);

  const fetchData = async () => {
    try {
      console.log('[SpacePage] Starting fetchData, userId:', userId);
      
      if (!userId) {
        console.error('[SpacePage] userId is null or undefined!');
        toast.error('User session not found. Please log in again.');
        return;
      }
      
      const [workspaceRes] = await Promise.all([
        api.get(`/workspaces/${workspaceId}`),
        fetchSpace(spaceId),
        fetchLists(spaceId),
        fetchFolders(spaceId),
      ]);

      const workspaceData = workspaceRes.data.data;
      setWorkspace(workspaceData);

      console.log('[SpacePage] Workspace data:', {
        owner: workspaceData.owner,
        members: workspaceData.members,
        userId
      });

      // Set workspace context for permission system
      const workspaceOwnerId = typeof workspaceData.owner === 'string' ? workspaceData.owner : workspaceData.owner?._id;
      const isOwnerUser = workspaceOwnerId === userId;
      
      console.log('[SpacePage] Owner check:', { workspaceOwnerId, userId, isOwnerUser });
      
      const workspaceMember = workspaceData.members.find((m: any) => {
        const memberId = typeof m.user === 'string' ? m.user : m.user._id;
        console.log('[SpacePage] Checking member:', { memberId, userId, matches: memberId === userId, memberRole: m.role });
        return memberId === userId;
      });
      
      console.log('[SpacePage] Found workspace member:', workspaceMember);
      
      let role: 'owner' | 'admin' | 'member' | 'guest' = 'member';
      if (isOwnerUser) role = 'owner';
      else if (workspaceMember?.role === 'admin' || workspaceMember?.role === 'owner') role = 'admin';
      else if (workspaceMember?.role === 'guest') role = 'guest';
      
      // Always update context to ensure it's set correctly
      setWorkspaceContext(workspaceId, role);
      
      console.log('[SpacePage] User role determined:', { role, isOwnerUser, workspaceMember: workspaceMember?.role });

      // Fetch user's space permission level
      try {
        const spaceMembersRes = await api.get(`/spaces/${spaceId}/space-members`);
        const currentUserMember = spaceMembersRes.data.data.find(
          (m: any) => {
            const memberId = typeof m.user === 'string' ? m.user : m.user?._id;
            return memberId === userId;
          }
        );
        if (currentUserMember?.spacePermissionLevel) {
          setSpacePermissionLevel(currentUserMember.spacePermissionLevel);
          console.log('[SpacePage] Space permission level set:', currentUserMember.spacePermissionLevel);
        } else {
          console.log('[SpacePage] No space permission override found for user');
        }
      } catch (error) {
        console.error('Failed to fetch space permission level:', error);
        // Continue without space permission level (will use workspace role)
      }

      if (currentSpace?.status === 'inactive' && !isOwnerUser && role !== 'admin') {
        toast.error('This space is inactive. Only workspace owner or admin can access it.');
        router.push(`/workspace/${workspaceId}`);
        return;
      }

      if (currentSpace?.status === 'inactive') setIsReadOnly(true);
      if (currentSpace) setSpaceSettings({ name: currentSpace.name, description: currentSpace.description || '' });
    } catch (error: any) {
      console.error('Failed to fetch data:', error);
      toast.error('Failed to load space data');
    }
  };

  const calculateTaskStats = () => {
    let totalTasks = 0;
    let completedTasks = 0;
    lists.forEach(list => {
      const taskCount = (list as any).taskCount || 0;
      const completedCount = (list as any).completedCount || 0;
      totalTasks += taskCount;
      completedTasks += completedCount;
    });
    const percentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
    return { totalTasks, completedTasks, percentage };
  };

  const stats = calculateTaskStats();

  const handleCreateList = async () => {
    if (!newListData.name.trim()) {
      toast.error('List name is required');
      return;
    }
    try {
      const list = await createList(spaceId, newListData);
      setShowCreateListModal(false);
      setNewListData({ name: '', description: '' });
      toast.success('List created successfully');
    } catch (error) {
      toast.error('Failed to create list');
    }
  };

  const handleCreateFolder = async () => {
    if (!newFolderData.name.trim()) {
      toast.error('Folder name is required');
      return;
    }
    try {
      const folder = await createFolder(spaceId, newFolderData);
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
      fetchData();
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
      setSelectedMembers([]);
      setShowInviteModal(false);
      toast.success(`${selectedMembers.length} member(s) added successfully`);
      fetchData();
    } catch (error) {
      toast.error('Failed to add members');
    }
  };

  const handleRemoveMember = async (memberId: string, memberName: string) => {
    try {
      await removeMemberFromSpace(spaceId, memberId);
      toast.success('Member removed successfully');
      fetchData();
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

  if (loading && !currentSpace) return <LoadingSkeleton />;
  if (!currentSpace) return null;

  const spaceColor = (currentSpace as any)?.color || '#3b82f6';
  const unassignedLists = lists.filter(list => !(list as any).folderId);
  const spaceMemberIds = currentSpace?.members?.map((m: any) => typeof m.user === 'string' ? m.user : m.user?._id) || [];
  const isSpaceMember = spaceMemberIds.includes(userId);
  
  // Only owners, admins, and space members can create content
  const canCreateContent = (isAdmin || isOwner || isSpaceMember) && !isReadOnly;
  
  const availableMembers = workspace?.members.filter((m: any) => {
    const userId = typeof m.user === 'string' ? m.user : m.user?._id;
    return !spaceMemberIds.includes(userId);
  }) || [];

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b border-border sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button onClick={() => router.push(`/workspace/${workspaceId}`)} className="p-2 hover:bg-accent rounded-lg transition-colors">
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-2xl font-bold">{currentSpace.name}</h1>
                  <Badge className={currentSpace.status === 'inactive' ? 'bg-gray-100 text-gray-700 dark:bg-gray-900/20 dark:text-gray-400' : 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400'}>
                    {currentSpace.status === 'inactive' ? 'Inactive' : 'Active'}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground mt-1">{currentSpace.description || 'Collaborative workspace for team projects'}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {shouldShowAdminButtons && (
                <>
                  <Button variant="outline" onClick={() => setShowInviteModal(true)}><UserPlus className="w-4 h-4 mr-2" />Invite</Button>
                  <Button variant="outline" onClick={() => setShowSpaceMemberManagement(true)}><Users className="w-4 h-4 mr-2" />Permissions</Button>
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
                  <SpaceMemberManagement
                    open={showSpaceMemberManagement}
                    onOpenChange={setShowSpaceMemberManagement}
                    spaceId={spaceId}
                    spaceName={currentSpace.name}
                    spaceColor={spaceColor}
                  />
                </>
              )}
              {shouldShowAdminButtons && (
                <Sheet open={showSettingsSheet} onOpenChange={setShowSettingsSheet}>
                  <SheetTrigger asChild><Button variant="outline" size="icon"><Settings className="w-4 h-4" /></Button></SheetTrigger>
                  <SheetContent>
                    <SheetHeader><SheetTitle>Space Settings</SheetTitle><SheetDescription>Manage your space configuration</SheetDescription></SheetHeader>
                    <div className="space-y-6 mt-6">
                      <div><Label htmlFor="spaceName">Space Name</Label><Input id="spaceName" value={spaceSettings.name} onChange={(e) => setSpaceSettings({ ...spaceSettings, name: e.target.value })} placeholder="Space name" /></div>
                      <div><Label htmlFor="spaceDescription">Description</Label><Textarea id="spaceDescription" value={spaceSettings.description} onChange={(e) => setSpaceSettings({ ...spaceSettings, description: e.target.value })} placeholder="Space description" rows={3} /></div>
                      <div className="flex gap-3">
                        <Button variant="outline" onClick={() => setShowSettingsSheet(false)} className="flex-1">Cancel</Button>
                        <Button onClick={handleUpdateSpace} className="flex-1">Save Changes</Button>
                      </div>
                    </div>
                  </SheetContent>
                </Sheet>
              )}
            </div>
          </div>
        </div>
      </header>

      {isReadOnly && shouldShowAdminButtons && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border-b border-yellow-200 dark:border-yellow-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-yellow-800 dark:text-yellow-200">
                <AlertCircle className="w-5 h-5" />
                <p className="text-sm font-medium">This space is archived. Click activate to restore access for all members.</p>
              </div>
              <Button size="sm" onClick={handleActivateSpace} className="bg-yellow-600 hover:bg-yellow-700"><Power className="w-4 h-4 mr-2" />Activate Space</Button>
            </div>
          </div>
        </div>
      )}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card><CardHeader className="pb-3"><CardTitle className="text-sm font-medium text-muted-foreground">Task Progress</CardTitle></CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between mb-4">
                    <div><div className="text-3xl font-bold" style={{ color: spaceColor }}>{stats.percentage}%</div><p className="text-xs text-muted-foreground mt-1">{stats.completedTasks} of {stats.totalTasks} tasks</p></div>
                    <div className="relative w-16 h-16">
                      <svg className="w-16 h-16 transform -rotate-90"><circle cx="32" cy="32" r="28" stroke="currentColor" strokeWidth="6" fill="none" className="text-muted" /><circle cx="32" cy="32" r="28" stroke={spaceColor} strokeWidth="6" fill="none" strokeDasharray={`${stats.percentage * 1.76} 176`} className="transition-all duration-300" /></svg>
                      <CheckCircle2 className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-6" style={{ color: spaceColor }} />
                    </div>
                  </div>
                  <Progress value={stats.percentage} className="h-2" style={{ backgroundColor: `${spaceColor}20` }} />
                </CardContent>
              </Card>
              <Card><CardHeader className="pb-3"><CardTitle className="text-sm font-medium text-muted-foreground">Total Lists</CardTitle></CardHeader>
                <CardContent><div className="flex items-center justify-between"><div><div className="text-3xl font-bold">{lists.length}</div><p className="text-xs text-muted-foreground mt-1">{folders.length} folders</p></div><div className="w-12 h-12 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${spaceColor}20` }}><FileText className="w-6 h-6" style={{ color: spaceColor }} /></div></div></CardContent>
              </Card>
              <Card><CardHeader className="pb-3"><CardTitle className="text-sm font-medium text-muted-foreground">Team Members</CardTitle></CardHeader>
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

            <div>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold">Lists & Folders</h2>
                <div className="flex items-center gap-2">
                  {canCreateContent && (<><Dialog open={showCreateFolderModal} onOpenChange={setShowCreateFolderModal}><DialogTrigger asChild><Button variant="outline" size="sm"><Folder className="w-4 h-4 mr-2" />New Folder</Button></DialogTrigger><DialogContent><DialogHeader><DialogTitle>Create New Folder</DialogTitle></DialogHeader><div className="space-y-4"><div><Label htmlFor="folderName">Folder Name</Label><Input id="folderName" value={newFolderData.name} onChange={(e) => setNewFolderData({ ...newFolderData, name: e.target.value })} placeholder="Marketing, Engineering, etc." /></div><div><Label htmlFor="folderColor">Color</Label><Input id="folderColor" type="color" value={newFolderData.color} onChange={(e) => setNewFolderData({ ...newFolderData, color: e.target.value })} /></div><div className="flex gap-3"><Button variant="outline" onClick={() => setShowCreateFolderModal(false)} className="flex-1">Cancel</Button><Button onClick={handleCreateFolder} className="flex-1">Create Folder</Button></div></div></DialogContent></Dialog><Dialog open={showCreateListModal} onOpenChange={setShowCreateListModal}><DialogTrigger asChild><Button size="sm" style={{ backgroundColor: spaceColor }}><Plus className="w-4 h-4 mr-2" />New List</Button></DialogTrigger><DialogContent><DialogHeader><DialogTitle>Create New List</DialogTitle></DialogHeader><div className="space-y-4"><div><Label htmlFor="listName">List Name</Label><Input id="listName" value={newListData.name} onChange={(e) => setNewListData({ ...newListData, name: e.target.value })} placeholder="Sprint Planning, Backlog, etc." /></div><div><Label htmlFor="listDescription">Description</Label><Textarea id="listDescription" value={newListData.description} onChange={(e) => setNewListData({ ...newListData, description: e.target.value })} placeholder="Brief description of this list" rows={3} /></div><div className="flex gap-3"><Button variant="outline" onClick={() => setShowCreateListModal(false)} className="flex-1">Cancel</Button><Button onClick={handleCreateList} className="flex-1">Create List</Button></div></div></DialogContent></Dialog></>)}
                </div>
              </div>
              {lists.length === 0 && folders.length === 0 ? (
                <Card className="border-2 border-dashed"><CardContent className="flex flex-col items-center justify-center py-16"><div className="w-16 h-16 rounded-full flex items-center justify-center mb-4" style={{ backgroundColor: `${spaceColor}20` }}><FileText className="w-8 h-8" style={{ color: spaceColor }} /></div><h3 className="text-lg font-semibold mb-2">Get Started</h3><p className="text-sm text-muted-foreground text-center mb-6 max-w-md">Create your first list to start organizing tasks, or create folders to group related lists together.</p>{canCreateContent && (<div className="flex gap-3"><Button variant="outline" onClick={() => setShowCreateFolderModal(true)}><Folder className="w-4 h-4 mr-2" />Create Folder</Button><Button onClick={() => setShowCreateListModal(true)} style={{ backgroundColor: spaceColor }}><Plus className="w-4 h-4 mr-2" />Create List</Button></div>)}</CardContent></Card>
              ) : (
                <div className="space-y-4">
                  {folders.map((folder) => (
                    <Card key={folder._id}><CardContent className="p-0"><button onClick={() => toggleFolder(folder._id)} className="w-full flex items-center justify-between p-4 hover:bg-accent transition-colors"><div className="flex items-center gap-3">{expandedFolders[folder._id] ? <ChevronDown className="w-5 h-5 text-muted-foreground" /> : <ChevronRight className="w-5 h-5 text-muted-foreground" />}<div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${folder.color || spaceColor}20` }}><Folder className="w-5 h-5" style={{ color: folder.color || spaceColor }} /></div><div className="text-left"><h3 className="font-semibold">{folder.name}</h3><p className="text-sm text-muted-foreground">{folder.lists?.length || 0} lists</p></div></div></button>{expandedFolders[folder._id] && (<div className="border-t divide-y">{folder.lists?.length === 0 ? (<div className="p-8 text-center text-muted-foreground text-sm">No lists in this folder</div>) : (folder.lists?.map((list) => (<ListItem key={list._id} list={list} spaceColor={spaceColor} workspaceId={workspaceId} spaceId={spaceId} canManage={shouldShowAdminButtons} isReadOnly={isReadOnly} onDelete={handleDeleteList} />)))}</div>)}</CardContent></Card>
                  ))}
                  {unassignedLists.length > 0 && (<div className="space-y-2">{unassignedLists.map((list) => (<ListItem key={list._id} list={list} spaceColor={spaceColor} workspaceId={workspaceId} spaceId={spaceId} canManage={shouldShowAdminButtons} isReadOnly={isReadOnly} onDelete={handleDeleteList} />))}</div>)}
                </div>
              )}
            </div>
          </div>

          <div className="space-y-6">
            
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
                          <Avatar className="w-10 h-10">
                            <AvatarImage src={user?.avatar} />
                            <AvatarFallback style={{ backgroundColor: spaceColor, color: 'white' }}>
                              {user ? getInitials(user.name) : '?'}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{user?.name || 'Unknown'}</p>
                            <p className="text-sm text-muted-foreground truncate">{user?.email}</p>
                          </div>
                          <Badge variant="outline" className="capitalize">{member.role}</Badge>
                          {canRemove && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
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
          </div>
        </div>
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
  return (<div className="min-h-screen bg-background"><header className="bg-card border-b border-border"><div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4"><div className="flex items-center justify-between"><div className="flex items-center gap-4"><Skeleton className="h-10 w-10 rounded-lg" /><div><Skeleton className="h-8 w-48 mb-2" /><Skeleton className="h-4 w-64" /></div></div><div className="flex items-center gap-3"><Skeleton className="h-10 w-24" /><Skeleton className="h-10 w-10" /></div></div></div></header><main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8"><div className="grid grid-cols-1 lg:grid-cols-3 gap-8"><div className="lg:col-span-2 space-y-6"><div className="grid grid-cols-1 md:grid-cols-3 gap-6">{[1, 2, 3].map((i) => (<Card key={i}><CardHeader><Skeleton className="h-4 w-24" /></CardHeader><CardContent><Skeleton className="h-12 w-full" /></CardContent></Card>))}</div><div className="space-y-4">{[1, 2, 3].map((i) => (<Card key={i}><CardContent className="p-4"><Skeleton className="h-16 w-full" /></CardContent></Card>))}</div></div><div className="space-y-6"><Card><CardHeader><Skeleton className="h-6 w-32" /></CardHeader><CardContent><Skeleton className="h-32 w-full" /></CardContent></Card></div></div></main></div>);
}
