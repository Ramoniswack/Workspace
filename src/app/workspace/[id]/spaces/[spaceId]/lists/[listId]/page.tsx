'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { api } from '@/lib/axios';
import { Task, Space, List, Workspace, User } from '@/types';
import {
  ArrowLeft,
  Search,
  Plus,
  MoreHorizontal,
  Flag,
  User as UserIcon,
  ChevronDown,
  ChevronRight,
  Trash2,
  Calendar as CalendarIcon,
  LayoutList,
  LayoutGrid,
  Activity,
  AlertCircle,
  Settings,
  UserPlus,
  Users,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useTaskStore } from '@/store/useTaskStore';
import { useHighlight } from '@/hooks/useHighlight';
import { useActivityStore } from '@/store/useActivityStore';
import { useAuthStore } from '@/store/useAuthStore';
import { InviteMemberModal } from '@/components/InviteMemberModal';
import { ListMemberManagement } from '@/components/ListMemberManagement';
import { toast } from 'sonner';

export default function ListView() {
  const router = useRouter();
  const params = useParams();
  const workspaceId = params.id as string;
  const spaceId = params.spaceId as string;
  const listId = params.listId as string;
  
  // Get userId from localStorage since it's not in the auth store
  const userId = typeof window !== 'undefined' ? localStorage.getItem('userId') : null;

  const { tasks, loading, fetchTasks, updateTask, deleteTask, createTask, bulkUpdateTasks, bulkDeleteTasks, assignTask, updateTaskStatus } = useTaskStore();
  const { logActivity } = useActivityStore();

  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [space, setSpace] = useState<Space | null>(null);
  const [list, setList] = useState<List | null>(null);
  const [view, setView] = useState<'list' | 'board' | 'calendar' | 'activity'>('list');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTasks, setSelectedTasks] = useState<string[]>([]);
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTaskData, setNewTaskData] = useState({
    title: '',
    description: '',
    priority: 'medium' as Task['priority'],
    status: 'todo' as Task['status'],
  });
  const [isReadOnly, setIsReadOnly] = useState(false);
  const [userRole, setUserRole] = useState<'owner' | 'admin' | 'member'>('member');
  const [isSpaceMember, setIsSpaceMember] = useState(false);
  const [isListMember, setIsListMember] = useState(false);
  const [listPermissionLevel, setListPermissionLevel] = useState<string | null>(null);
  const [listMembers, setListMembers] = useState<any[]>([]);
  const [showSettingsSheet, setShowSettingsSheet] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showListMemberManagement, setShowListMemberManagement] = useState(false);
  const [listSettings, setListSettings] = useState({ name: '', description: '' });
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [searchMemberQuery, setSearchMemberQuery] = useState('');

  useEffect(() => {
    fetchData();
  }, [listId]);

  const fetchData = async () => {
    try {
      const [workspaceRes, spaceRes, listRes] = await Promise.all([
        api.get(`/workspaces/${workspaceId}`),
        api.get(`/spaces/${spaceId}`),
        api.get(`/lists/${listId}`),
      ]);

      const workspaceData = workspaceRes.data.data;
      const spaceData = spaceRes.data.data;
      const listData = listRes.data.data;

      setWorkspace(workspaceData);
      setSpace(spaceData);
      setList(listData);

      // Check if space is inactive
      const spaceStatus = spaceData.status || 'active';
      
      // Determine user role
      const workspaceOwnerId = typeof workspaceData.owner === 'string' 
        ? workspaceData.owner 
        : workspaceData.owner?._id;
      
      const isOwner = workspaceOwnerId === userId;
      const workspaceMember = workspaceData.members.find((m: any) => {
        const memberId = typeof m.user === 'string' ? m.user : m.user._id;
        return memberId === userId;
      });
      const isAdmin = workspaceMember?.role === 'admin' || workspaceMember?.role === 'owner';
      
      // Check if user is a space member
      const spaceMemberIds = spaceData.members?.map((m: any) => 
        typeof m.user === 'string' ? m.user : m.user?._id
      ) || [];
      const isSpaceMember = spaceMemberIds.includes(userId);
      setIsSpaceMember(isSpaceMember);
      
      // Check if user is a list member (has list-specific permissions)
      let userListMember: any = null;
      try {
        const listMembersRes = await api.get(`/lists/${listId}/list-members`);
        const listMembersData = listMembersRes.data.data;
        
        // Filter to only show members with list access (hasOverride = true)
        const membersWithAccess = listMembersData.filter((m: any) => m.hasOverride);
        setListMembers(membersWithAccess);
        
        userListMember = listMembersData.find((m: any) => m._id === userId);
        
        if (userListMember && userListMember.hasOverride) {
          setIsListMember(true);
          setListPermissionLevel(userListMember.listPermissionLevel);
        } else {
          setIsListMember(false);
          setListPermissionLevel(null);
        }
      } catch (error) {
        console.error('Failed to fetch list members:', error);
        setIsListMember(false);
        setListPermissionLevel(null);
        setListMembers([]);
      }
      
      if (isOwner) {
        setUserRole('owner');
      } else if (isAdmin) {
        setUserRole('admin');
      } else {
        setUserRole('member');
      }

      // Determine read-only status based on permissions
      // Owner/Admin: Full access
      // List member with EDIT or FULL: Can create/edit tasks
      // List member with COMMENT: Can only comment
      // List member with VIEW: Read-only
      // Not a list member: Read-only
      
      if (isOwner || isAdmin) {
        setIsReadOnly(false);
      } else if (userListMember && userListMember.hasOverride) {
        const permLevel = userListMember.listPermissionLevel;
        // EDIT and FULL can create/edit, COMMENT and VIEW are read-only for task creation
        setIsReadOnly(permLevel === 'VIEW' || permLevel === 'COMMENT');
      } else {
        // Not a list member - read-only
        setIsReadOnly(true);
      }
      
      // Set list settings
      if (listData) {
        setListSettings({ name: listData.name, description: listData.description || '' });
      }

      await fetchTasks(listId);
    } catch (error: any) {
      console.error('Failed to fetch data:', error);
      toast.error('Failed to load list data');
    }
  };

  // Filter tasks by search query
  const filteredTasks = tasks.filter(task =>
    task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    task.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Group tasks by status
  const groupedTasks = {
    'todo': filteredTasks.filter(t => t.status === 'todo'),
    'inprogress': filteredTasks.filter(t => t.status === 'inprogress'),
    'done': filteredTasks.filter(t => t.status === 'done'),
    'cancelled': filteredTasks.filter(t => t.status === 'cancelled'),
  };

  const handleStatusChange = async (taskId: string, newStatus: Task['status']) => {
    try {
      const task = tasks.find(t => t._id === taskId);
      if (!task) return;

      // Permission check:
      // - Owner/Admin: Can always update
      // - List member with EDIT or FULL: Can update
      // - Task assignee: Can update their own tasks
      const assigneeId = typeof task.assignee === 'object' ? task.assignee?._id : task.assignee;
      const isAssignee = userId === assigneeId;
      const canUpdateAsListMember = isListMember && (listPermissionLevel === 'EDIT' || listPermissionLevel === 'FULL');
      const canUpdate = userRole === 'admin' || userRole === 'owner' || canUpdateAsListMember || isAssignee;
      
      if (!canUpdate) {
        toast.error('You do not have permission to update this task');
        return;
      }

      await updateTaskStatus(taskId, newStatus, task.title);
      toast.success('Task status updated');
    } catch (error) {
      toast.error('Failed to update task status');
    }
  };

  const handlePriorityChange = async (taskId: string, newPriority: Task['priority']) => {
    try {
      const task = tasks.find(t => t._id === taskId);
      if (!task) return;

      await updateTask(taskId, { priority: newPriority });
      
      await logActivity({
        userId: userId!,
        action: `changed priority to ${newPriority}`,
        target: task.title,
        type: 'update',
        workspaceId,
        spaceId,
        listId,
        taskId,
      });

      toast.success('Task priority updated');
    } catch (error) {
      toast.error('Failed to update task priority');
    }
  };

  const handleAssigneeChange = async (taskId: string, assigneeId: string | null) => {
    try {
      const task = tasks.find(t => t._id === taskId);
      if (!task) return;

      // Only admins/owners can assign tasks
      if (userRole !== 'admin' && userRole !== 'owner') {
        toast.error('Only admins and owners can assign tasks');
        return;
      }

      const member = space?.members?.find((m: any) => {
        const userId = typeof m.user === 'object' ? m.user._id : m.user;
        return userId === assigneeId;
      });
      
      const assigneeName = assigneeId 
        ? (typeof member?.user === 'object' ? member.user.name : 'Unknown')
        : 'Unassigned';

      await assignTask(taskId, assigneeId, task.title, assigneeName);
      toast.success(`Task ${assigneeId ? 'assigned to' : 'unassigned from'} ${assigneeName}`);
    } catch (error) {
      toast.error('Failed to assign task');
    }
  };

  const handleCreateTask = async () => {
    if (!newTaskData.title.trim()) {
      toast.error('Task title is required');
      return;
    }

    try {
      const task = await createTask(listId, newTaskData);
      
      await logActivity({
        userId: userId!,
        action: 'created task',
        target: task.title,
        type: 'create',
        workspaceId,
        spaceId,
        listId,
        taskId: task._id,
      });

      setShowCreateModal(false);
      setNewTaskData({
        title: '',
        description: '',
        priority: 'medium',
        status: 'todo',
      });
      toast.success('Task created successfully');
    } catch (error) {
      toast.error('Failed to create task');
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    try {
      const task = tasks.find(t => t._id === taskId);
      if (!task) return;

      await deleteTask(taskId);
      
      await logActivity({
        userId: userId!,
        action: 'deleted task',
        target: task.title,
        type: 'delete',
        workspaceId,
        spaceId,
        listId,
        taskId,
      });

      toast.success('Task deleted');
    } catch (error) {
      toast.error('Failed to delete task');
    }
  };

  const handleUpdateList = async () => {
    try {
      await api.patch(`/lists/${listId}`, listSettings);
      setList({ ...list!, ...listSettings });
      setShowSettingsSheet(false);
      toast.success('List updated successfully');
    } catch (error) {
      toast.error('Failed to update list');
    }
  };

  const handleAddMembers = async () => {
    if (selectedMembers.length === 0) {
      toast.error('Please select at least one member');
      return;
    }
    try {
      // Add members to list with default EDIT permission level
      await Promise.all(
        selectedMembers.map(memberId =>
          api.post(`/lists/${listId}/list-members`, { 
            userId: memberId,
            permissionLevel: 'EDIT' // Default permission level
          })
        )
      );
      setSelectedMembers([]);
      setShowInviteModal(false);
      toast.success(`${selectedMembers.length} member(s) added successfully`);
      // Refresh list data and members
      await fetchData();
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Failed to add members';
      toast.error(errorMessage);
      console.error('Add members error:', error);
    }
  };

  const toggleMemberSelection = (memberId: string) => {
    setSelectedMembers(prev =>
      prev.includes(memberId) ? prev.filter(id => id !== memberId) : [...prev, memberId]
    );
  };

  const getInitials = (name: string) => {
    return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const handleBulkDelete = async () => {
    if (selectedTasks.length === 0) return;

    try {
      await bulkDeleteTasks(selectedTasks);
      
      await logActivity({
        userId: userId!,
        action: `deleted ${selectedTasks.length} tasks`,
        target: 'multiple tasks',
        type: 'delete',
        workspaceId,
        spaceId,
        listId,
      });

      setSelectedTasks([]);
      toast.success(`${selectedTasks.length} tasks deleted`);
    } catch (error) {
      toast.error('Failed to delete tasks');
    }
  };

  const handleBulkStatusChange = async (newStatus: Task['status']) => {
    if (selectedTasks.length === 0) return;

    try {
      await bulkUpdateTasks(selectedTasks, { status: newStatus });
      
      await logActivity({
        userId: userId!,
        action: `changed status of ${selectedTasks.length} tasks to ${newStatus}`,
        target: 'multiple tasks',
        type: 'update',
        workspaceId,
        spaceId,
        listId,
      });

      setSelectedTasks([]);
      toast.success(`${selectedTasks.length} tasks updated`);
    } catch (error) {
      toast.error('Failed to update tasks');
    }
  };

  const toggleGroup = (status: string) => {
    setCollapsedGroups(prev => ({
      ...prev,
      [status]: !prev[status]
    }));
  };

  const toggleTaskSelection = (taskId: string) => {
    setSelectedTasks(prev =>
      prev.includes(taskId)
        ? prev.filter(id => id !== taskId)
        : [...prev, taskId]
    );
  };

  const canEditTask = (task: Task) => {
    // Owner/Admin: Full access
    if (userRole === 'owner' || userRole === 'admin') return true;
    
    // List member with EDIT or FULL permission
    if (isListMember && (listPermissionLevel === 'EDIT' || listPermissionLevel === 'FULL')) return true;
    
    // Task assignee can edit their own tasks
    const assigneeId = typeof task.assignee === 'string' ? task.assignee : task.assignee?._id;
    return assigneeId === userId;
  };

  const canDeleteTask = (task: Task) => {
    // Only owner, admin, or list members with FULL permission can delete
    if (userRole === 'owner' || userRole === 'admin') return true;
    if (isListMember && listPermissionLevel === 'FULL') return true;
    return false;
  };

  if (loading && tasks.length === 0) {
    return <LoadingSkeleton />;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          {/* Breadcrumbs */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
            <button
              onClick={() => router.push('/dashboard')}
              className="hover:text-foreground transition-colors"
            >
              {workspace?.name || 'Workspace'}
            </button>
            <span>/</span>
            <button
              onClick={() => router.push(`/workspace/${workspaceId}`)}
              className="hover:text-foreground transition-colors"
            >
              {space?.name || 'Space'}
            </button>
            <span>/</span>
            <span className="text-foreground font-medium">{list?.name || 'List'}</span>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push(`/workspace/${workspaceId}/spaces/${spaceId}`)}
                className="p-2 hover:bg-accent rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-2xl font-bold">{list?.name}</h1>
                <p className="text-sm text-muted-foreground">
                  {filteredTasks.length} {filteredTasks.length === 1 ? 'task' : 'tasks'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* List Members Display */}
              <div className="flex items-center gap-2 px-3 py-2 bg-accent/50 rounded-lg">
                <Users className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium">{listMembers.length}</span>
                <div className="flex -space-x-2 ml-1">
                  {listMembers.slice(0, 3).map((member: any, idx: number) => {
                    const user = typeof member.user === 'object' ? member.user : member;
                    return (
                      <Avatar key={idx} className="w-7 h-7 border-2 border-background cursor-pointer hover:z-10 transition-transform hover:scale-110" onClick={() => setShowListMemberManagement(true)}>
                        <AvatarImage src={user?.avatar} />
                        <AvatarFallback className="text-xs bg-blue-600 text-white">
                          {user ? getInitials(user.name) : '?'}
                        </AvatarFallback>
                      </Avatar>
                    );
                  })}
                  {listMembers.length > 3 && (
                    <Avatar className="w-7 h-7 border-2 border-background cursor-pointer hover:z-10 transition-transform hover:scale-110 bg-muted" onClick={() => setShowListMemberManagement(true)}>
                      <AvatarFallback className="text-xs font-semibold">
                        +{listMembers.length - 3}
                      </AvatarFallback>
                    </Avatar>
                  )}
                </div>
              </div>

              {/* Invite, Permissions, and Settings buttons for admin/owner only */}
              {(userRole === 'owner' || userRole === 'admin') && !isReadOnly && (
                <>
                  <Button variant="outline" onClick={() => setShowInviteModal(true)}>
                    <UserPlus className="w-4 h-4 mr-2" />
                    Invite
                  </Button>
                  <Button variant="outline" onClick={() => setShowListMemberManagement(true)}>
                    <Users className="w-4 h-4 mr-2" />
                    Permissions
                  </Button>
                  <Sheet open={showSettingsSheet} onOpenChange={setShowSettingsSheet}>
                    <SheetTrigger asChild>
                      <Button variant="outline" size="icon">
                        <Settings className="w-4 h-4" />
                      </Button>
                    </SheetTrigger>
                    <SheetContent>
                      <SheetHeader>
                        <SheetTitle>List Settings</SheetTitle>
                        <SheetDescription>Manage your list configuration</SheetDescription>
                      </SheetHeader>
                      <div className="space-y-6 mt-6">
                        <div>
                          <Label htmlFor="listName">List Name</Label>
                          <Input
                            id="listName"
                            value={listSettings.name}
                            onChange={(e) => setListSettings({ ...listSettings, name: e.target.value })}
                            placeholder="List name"
                          />
                        </div>
                        <div>
                          <Label htmlFor="listDescription">Description</Label>
                          <Textarea
                            id="listDescription"
                            value={listSettings.description}
                            onChange={(e) => setListSettings({ ...listSettings, description: e.target.value })}
                            placeholder="List description"
                            rows={3}
                          />
                        </div>
                        <div className="flex gap-3">
                          <Button variant="outline" onClick={() => setShowSettingsSheet(false)} className="flex-1">
                            Cancel
                          </Button>
                          <Button onClick={handleUpdateList} className="flex-1">
                            Save Changes
                          </Button>
                        </div>
                      </div>
                    </SheetContent>
                  </Sheet>
                  
                  {/* Invite Member Modal */}
                  <InviteMemberModal
                    open={showInviteModal}
                    onOpenChange={setShowInviteModal}
                    spaceColor="#3b82f6"
                    availableMembers={space?.members?.filter((m: any) => {
                      const user = typeof m.user === 'object' ? m.user : null;
                      if (!user) return false;
                      // Only show regular members (not admins/owners)
                      return m.role === 'member';
                    }) || []}
                    selectedMembers={selectedMembers}
                    onToggleMemberSelection={toggleMemberSelection}
                    onAddMembers={handleAddMembers}
                    searchQuery={searchMemberQuery}
                    onSearchChange={setSearchMemberQuery}
                    getInitials={getInitials}
                  />
                  
                  {/* List Member Management Modal */}
                  <ListMemberManagement
                    open={showListMemberManagement}
                    onOpenChange={setShowListMemberManagement}
                    listId={listId}
                    listName={list?.name || 'List'}
                  />
                </>
              )}

              {/* New Task Button */}
              {!isReadOnly && (
                <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
                  <DialogTrigger asChild>
                    <Button className="bg-blue-600 hover:bg-blue-700">
                      <Plus className="w-4 h-4 mr-2" />
                      New Task
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Create New Task</DialogTitle>
                      <DialogDescription>
                        Add a new task to this list
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="title">Title</Label>
                        <Input
                          id="title"
                          value={newTaskData.title}
                          onChange={(e) => setNewTaskData({ ...newTaskData, title: e.target.value })}
                          placeholder="Task title"
                        />
                      </div>
                      <div>
                        <Label htmlFor="description">Description</Label>
                        <Textarea
                          id="description"
                          value={newTaskData.description}
                          onChange={(e) => setNewTaskData({ ...newTaskData, description: e.target.value })}
                          placeholder="Task description"
                          rows={3}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="priority">Priority</Label>
                          <Select
                            value={newTaskData.priority}
                            onValueChange={(value: Task['priority']) =>
                              setNewTaskData({ ...newTaskData, priority: value })
                            }
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="low">Low</SelectItem>
                              <SelectItem value="medium">Medium</SelectItem>
                              <SelectItem value="high">High</SelectItem>
                              <SelectItem value="urgent">Urgent</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label htmlFor="status">Status</Label>
                          <Select
                            value={newTaskData.status}
                            onValueChange={(value: Task['status']) =>
                              setNewTaskData({ ...newTaskData, status: value })
                            }
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="to do">To Do</SelectItem>
                              <SelectItem value="in progress">In Progress</SelectItem>
                              <SelectItem value="done">Done</SelectItem>
                              <SelectItem value="blocked">Blocked</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="flex gap-3">
                        <Button
                          variant="outline"
                          onClick={() => setShowCreateModal(false)}
                          className="flex-1"
                        >
                          Cancel
                        </Button>
                        <Button onClick={handleCreateTask} className="flex-1">
                          Create Task
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              )}
            </div>
          </div>

          {/* View Tabs */}
          <div className="flex items-center gap-1 mt-4 bg-muted p-1 rounded-lg w-fit">
            <button
              onClick={() => setView('list')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${
                view === 'list'
                  ? 'bg-background shadow-sm'
                  : 'hover:bg-background/50'
              }`}
            >
              <LayoutList className="w-4 h-4" />
              List
            </button>
            <button
              onClick={() => setView('board')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${
                view === 'board'
                  ? 'bg-background shadow-sm'
                  : 'hover:bg-background/50'
              }`}
            >
              <LayoutGrid className="w-4 h-4" />
              Board
            </button>
            <button
              onClick={() => setView('calendar')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${
                view === 'calendar'
                  ? 'bg-background shadow-sm'
                  : 'hover:bg-background/50'
              }`}
            >
              <CalendarIcon className="w-4 h-4" />
              Calendar
            </button>
            <button
              onClick={() => setView('activity')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${
                view === 'activity'
                  ? 'bg-background shadow-sm'
                  : 'hover:bg-background/50'
              }`}
            >
              <Activity className="w-4 h-4" />
              Activity Log
            </button>
          </div>
        </div>
      </header>

      {/* Read-Only Banner */}
      {isReadOnly && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border-b border-yellow-200 dark:border-yellow-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
            <div className="flex items-center gap-2 text-yellow-800 dark:text-yellow-200">
              <AlertCircle className="w-5 h-5" />
              <p className="text-sm font-medium">
                {listPermissionLevel === 'VIEW' 
                  ? 'You have view-only access to this list.'
                  : listPermissionLevel === 'COMMENT'
                  ? 'You can view and comment on tasks in this list.'
                  : 'You do not have access to modify this list. Contact an admin to request access.'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {view === 'list' && (
          <div className="space-y-6">
            {(['todo', 'inprogress', 'done', 'cancelled'] as const).map((status) => (
              <TaskGroup
                key={status}
                status={status}
                tasks={groupedTasks[status]}
                collapsed={collapsedGroups[status]}
                onToggle={() => toggleGroup(status)}
                selectedTasks={selectedTasks}
                onToggleSelection={toggleTaskSelection}
                onStatusChange={handleStatusChange}
                onPriorityChange={handlePriorityChange}
                onAssigneeChange={handleAssigneeChange}
                onDelete={handleDeleteTask}
                canEdit={canEditTask}
                canDelete={canDeleteTask}
                isReadOnly={isReadOnly}
                spaceMembers={space?.members || []}
              />
            ))}
          </div>
        )}

        {view === 'board' && (
          <div className="text-center py-12 text-muted-foreground">
            <LayoutGrid className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>Board view coming soon</p>
          </div>
        )}

        {view === 'calendar' && (
          <div className="text-center py-12 text-muted-foreground">
            <CalendarIcon className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>Calendar view coming soon</p>
          </div>
        )}

        {view === 'activity' && (
          <div className="text-center py-12 text-muted-foreground">
            <Activity className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>Activity log coming soon</p>
          </div>
        )}
      </main>

      {/* Bulk Action Bar */}
      {selectedTasks.length > 0 && !isReadOnly && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-card border border-border rounded-lg shadow-lg p-4 flex items-center gap-4">
          <span className="text-sm font-medium">
            {selectedTasks.length} {selectedTasks.length === 1 ? 'task' : 'tasks'} selected
          </span>
          <div className="h-6 w-px bg-border" />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                Change Status
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => handleBulkStatusChange('todo')}>
                To Do
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleBulkStatusChange('inprogress')}>
                In Progress
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleBulkStatusChange('done')}>
                Done
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleBulkStatusChange('cancelled')}>
                Cancelled
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button
            variant="destructive"
            size="sm"
            onClick={handleBulkDelete}
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Delete
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSelectedTasks([])}
          >
            Cancel
          </Button>
        </div>
      )}
    </div>
  );
}

interface TaskGroupProps {
  status: Task['status'];
  tasks: Task[];
  collapsed: boolean;
  onToggle: () => void;
  selectedTasks: string[];
  onToggleSelection: (taskId: string) => void;
  onStatusChange: (taskId: string, status: Task['status']) => void;
  onPriorityChange: (taskId: string, priority: Task['priority']) => void;
  onAssigneeChange: (taskId: string, assigneeId: string) => void;
  onDelete: (taskId: string) => void;
  canEdit: (task: Task) => boolean;
  canDelete: (task: Task) => boolean;
  isReadOnly: boolean;
  spaceMembers: any[];
}

function TaskGroup({
  status,
  tasks,
  collapsed,
  onToggle,
  selectedTasks,
  onToggleSelection,
  onStatusChange,
  onPriorityChange,
  onAssigneeChange,
  onDelete,
  canEdit,
  canDelete,
  isReadOnly,
  spaceMembers,
}: TaskGroupProps) {
  const statusConfig = {
    'todo': { label: 'To Do', color: 'bg-slate-100 text-slate-700 dark:bg-slate-900/20 dark:text-slate-400' },
    'inprogress': { label: 'In Progress', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400' },
    'done': { label: 'Done', color: 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400' },
    'cancelled': { label: 'Cancelled', color: 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400' },
  };

  const config = statusConfig[status];

  return (
    <Card>
      <CardContent className="p-0">
        {/* Group Header */}
        <button
          onClick={onToggle}
          className="w-full flex items-center justify-between p-4 hover:bg-accent transition-colors"
        >
          <div className="flex items-center gap-3">
            {collapsed ? (
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            ) : (
              <ChevronDown className="w-5 h-5 text-muted-foreground" />
            )}
            <Badge className={config.color}>{config.label}</Badge>
            <span className="text-sm text-muted-foreground">
              {tasks.length} {tasks.length === 1 ? 'task' : 'tasks'}
            </span>
          </div>
        </button>

        {/* Tasks */}
        {!collapsed && (
          <div className="divide-y divide-border">
            {tasks.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground text-sm">
                No tasks in this status
              </div>
            ) : (
              tasks.map((task) => (
                <TaskRow
                  key={task._id}
                  task={task}
                  selected={selectedTasks.includes(task._id)}
                  onToggleSelection={onToggleSelection}
                  onStatusChange={onStatusChange}
                  onPriorityChange={onPriorityChange}
                  onAssigneeChange={onAssigneeChange}
                  onDelete={onDelete}
                  canEdit={canEdit(task)}
                  canDelete={canDelete(task)}
                  isReadOnly={isReadOnly}
                  spaceMembers={spaceMembers}
                />
              ))
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface TaskRowProps {
  task: Task;
  selected: boolean;
  onToggleSelection: (taskId: string) => void;
  onStatusChange: (taskId: string, status: Task['status']) => void;
  onPriorityChange: (taskId: string, priority: Task['priority']) => void;
  onAssigneeChange: (taskId: string, assigneeId: string) => void;
  onDelete: (taskId: string) => void;
  canEdit: boolean;
  canDelete: boolean;
  isReadOnly: boolean;
  spaceMembers: any[];
}

function TaskRow({
  task,
  selected,
  onToggleSelection,
  onStatusChange,
  onPriorityChange,
  onAssigneeChange,
  onDelete,
  canEdit,
  canDelete,
  isReadOnly,
  spaceMembers,
}: TaskRowProps) {
  const { isHighlighted } = useHighlight(task._id);
  
  const priorityConfig = {
    low: { icon: Flag, color: 'text-slate-400', label: 'Low' },
    medium: { icon: Flag, color: 'text-blue-500', label: 'Medium' },
    high: { icon: Flag, color: 'text-orange-500', label: 'High' },
    urgent: { icon: Flag, color: 'text-red-500', label: 'Urgent' },
  };

  const PriorityIcon = priorityConfig[task.priority].icon;
  const isDone = task.status === 'done';
  const assignee = typeof task.assignee === 'object' ? task.assignee : null;

  return (
    <div 
      id={task._id}
      className={`flex items-center gap-4 p-4 hover:bg-accent/50 transition-colors ${isDone ? 'opacity-60' : ''} ${isHighlighted ? 'ring-2 ring-primary' : ''}`}
    >
      {/* Checkbox */}
      {!isReadOnly && canEdit && (
        <Checkbox
          checked={selected}
          onCheckedChange={() => onToggleSelection(task._id)}
        />
      )}

      {/* Priority */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild disabled={isReadOnly || !canEdit}>
          <button className={`p-1 hover:bg-accent rounded transition-colors ${priorityConfig[task.priority].color}`}>
            <PriorityIcon className="w-4 h-4" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          {(['low', 'medium', 'high', 'urgent'] as const).map((priority) => (
            <DropdownMenuItem
              key={priority}
              onClick={() => onPriorityChange(task._id, priority)}
            >
              <Flag className={`w-4 h-4 mr-2 ${priorityConfig[priority].color}`} />
              {priorityConfig[priority].label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Task Title */}
      <div className="flex-1 min-w-0">
        <h4 className={`font-medium ${isDone ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
          {task.title}
        </h4>
        {task.description && (
          <p className="text-sm text-muted-foreground line-clamp-1 mt-1">
            {task.description}
          </p>
        )}
      </div>

      {/* Status Badge */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild disabled={isReadOnly || !canEdit}>
          <button>
            <Badge
              className={`cursor-pointer ${
                task.status === 'todo'
                  ? 'bg-slate-100 text-slate-700 dark:bg-slate-900/20 dark:text-slate-400'
                  : task.status === 'inprogress'
                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400'
                  : task.status === 'done'
                  ? 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400'
                  : 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400'
              }`}
            >
              {task.status === 'todo' ? 'To Do' : task.status === 'inprogress' ? 'In Progress' : task.status === 'done' ? 'Done' : 'Cancelled'}
            </Badge>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem onClick={() => onStatusChange(task._id, 'todo')}>
            To Do
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onStatusChange(task._id, 'inprogress')}>
            In Progress
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onStatusChange(task._id, 'done')}>
            Done
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onStatusChange(task._id, 'cancelled')}>
            Cancelled
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Assignee */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild disabled={isReadOnly || !canEdit}>
          <button className="hover:opacity-80 transition-opacity">
            {assignee ? (
              <Avatar className="w-8 h-8">
                <AvatarImage src={assignee.avatar} />
                <AvatarFallback className="text-xs bg-blue-600 text-white">
                  {assignee.name.charAt(0)}
                </AvatarFallback>
              </Avatar>
            ) : (
              <div className="w-8 h-8 rounded-full border-2 border-dashed border-muted-foreground/30 flex items-center justify-center">
                <Plus className="w-4 h-4 text-muted-foreground" />
              </div>
            )}
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          {spaceMembers.map((member) => {
            const user = typeof member.user === 'object' ? member.user : null;
            if (!user) return null;
            
            return (
              <DropdownMenuItem
                key={user._id}
                onClick={() => onAssigneeChange(task._id, user._id)}
              >
                <Avatar className="w-6 h-6 mr-2">
                  <AvatarImage src={user.avatar} />
                  <AvatarFallback className="text-xs">
                    {user.name.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                {user.name}
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Actions */}
      {!isReadOnly && canDelete && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="p-1 hover:bg-accent rounded transition-colors">
              <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              className="text-red-600 focus:text-red-600"
              onClick={() => onDelete(task._id)}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete Task
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-2 mb-4">
            <Skeleton className="h-4 w-32" />
            <span>/</span>
            <Skeleton className="h-4 w-24" />
            <span>/</span>
            <Skeleton className="h-4 w-20" />
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Skeleton className="h-10 w-10 rounded-lg" />
              <div>
                <Skeleton className="h-8 w-48 mb-2" />
                <Skeleton className="h-4 w-24" />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Skeleton className="h-10 w-64" />
              <Skeleton className="h-10 w-32" />
            </div>
          </div>
          <div className="flex items-center gap-1 mt-4">
            <Skeleton className="h-10 w-24" />
            <Skeleton className="h-10 w-24" />
            <Skeleton className="h-10 w-32" />
            <Skeleton className="h-10 w-36" />
          </div>
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <div className="flex items-center gap-3 mb-4">
                  <Skeleton className="h-5 w-5" />
                  <Skeleton className="h-6 w-24" />
                  <Skeleton className="h-4 w-16" />
                </div>
                <div className="space-y-3">
                  {[1, 2, 3].map((j) => (
                    <div key={j} className="flex items-center gap-4 p-4">
                      <Skeleton className="h-5 w-5" />
                      <Skeleton className="h-4 w-4" />
                      <Skeleton className="h-5 flex-1" />
                      <Skeleton className="h-6 w-24" />
                      <Skeleton className="h-8 w-8 rounded-full" />
                      <Skeleton className="h-4 w-4" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </main>
    </div>
  );
}
