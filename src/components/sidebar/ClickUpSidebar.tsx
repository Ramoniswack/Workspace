'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { usePathname, useParams } from 'next/navigation';
import {
  Inbox,
  Bell,
  Settings,
  Plus,
  Star,
  ChevronDown,
  Loader2,
  User,
  Users,
  BarChart3,
  FileText,
  MoreHorizontal,
  MessageSquare,
  Palette,
  FolderOpen,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUIStore } from '@/store/useUIStore';
import { useModalStore } from '@/store/useModalStore';
import { usePermissions, useWorkspaceContext } from '@/store/useAuthStore';
import { useNotificationStore } from '@/store/useNotificationStore';
import { useThemeStore, accentColors, getGradientColor } from '@/store/useThemeStore';
import { useWorkspaceStore } from '@/store/useWorkspaceStore';
import { HierarchyItemComponent } from './HierarchyItem';
import { CreateItemModal } from '@/components/modals/CreateItemModal';
import { EditSpaceModal } from '@/components/modals/EditSpaceModal';
import { EditFolderModal } from '@/components/modals/EditFolderModal';
import { EditListModal } from '@/components/modals/EditListModal';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { api } from '@/lib/axios';
import UpgradeButton from '@/components/subscription/UpgradeButton';
import { useSubscription } from '@/hooks/useSubscription';
import { useSystemSettings } from '@/hooks/useSystemSettings';

export function ClickUpSidebar() {
  const pathname = usePathname();
  const params = useParams();
  const { favoriteIds, isSidebarOpen } = useUIStore();
  const { openModal, setOnSuccess } = useModalStore();
  const { can, isAdmin, isOwner } = usePermissions();
  const { setWorkspaceContext } = useWorkspaceContext();
  const { unreadCount } = useNotificationStore();
  const { accentColor } = useThemeStore();
  const { subscription } = useSubscription();
  const { whatsappNumber } = useSystemSettings();

  // Use workspace store instead of local state
  const { hierarchy, loading, error, setHierarchy, setLoading, setError } = useWorkspaceStore();
  const [userName, setUserName] = useState('User');
  const [userEmail, setUserEmail] = useState('user@example.com');
  const [userId, setUserId] = useState<string | null>(null);
  const [userAvatar, setUserAvatar] = useState<string | null>(null);
  const [isClient, setIsClient] = useState(false);
  const [showWorkspaceSwitcher, setShowWorkspaceSwitcher] = useState(false);
  const [allWorkspaces, setAllWorkspaces] = useState<any[]>([]);

  // Extract workspaceId from URL
  let workspaceId = params?.id as string;

  if (!workspaceId && pathname) {
    const workspaceMatch = pathname.match(/\/workspace\/([^\/]+)/);
    if (workspaceMatch) {
      workspaceId = workspaceMatch[1];
    }
  }

  const themeColor = accentColors[accentColor];
  const gradientStyle = getGradientColor(themeColor);

  // Load user info from localStorage
  useEffect(() => {
    setIsClient(true);
    if (typeof window !== 'undefined') {
      const storedName = localStorage.getItem('userName');
      const storedEmail = localStorage.getItem('userEmail');
      const storedUserId = localStorage.getItem('userId');
      const storedAvatar = localStorage.getItem('userAvatar');
      if (storedName) setUserName(storedName);
      if (storedEmail) setUserEmail(storedEmail);
      if (storedUserId) setUserId(storedUserId);
      if (storedAvatar) setUserAvatar(storedAvatar);
    }
  }, []);

  // Fetch all workspaces for switcher
  const fetchAllWorkspaces = async () => {
    try {
      const response = await api.get('/workspaces');
      setAllWorkspaces(response.data.data || []);
    } catch (error) {
      console.error('Failed to fetch workspaces:', error);
    }
  };

  const handleWorkspaceClick = () => {
    setShowWorkspaceSwitcher(true);
    fetchAllWorkspaces();
  };

  const switchWorkspace = (newWorkspaceId: string) => {
    setShowWorkspaceSwitcher(false);
    window.location.href = `/workspace/${newWorkspaceId}`;
  };

  // Fetch hierarchy
  const fetchHierarchy = useCallback(async () => {
    if (!workspaceId) {
      setLoading(false);
      return;
    }

    if (!/^[0-9a-fA-F]{24}$/.test(workspaceId)) {
      console.error('Invalid workspace ID format:', workspaceId);
      setError('Invalid workspace ID');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const workspaceRes = await api.get(`/workspaces/${workspaceId}`);
      const workspace = workspaceRes.data.data || workspaceRes.data;

      if (!workspace || !workspace._id) {
        throw new Error('Workspace not found');
      }

      if (userId) {
        const userMember = workspace.members?.find((m: any) => m.user === userId || m.user._id === userId);
        if (userMember) {
          setWorkspaceContext(workspace._id, userMember.role);
        }
      }

      const spacesRes = await api.get(`/workspaces/${workspaceId}/spaces`);
      const spaces = spacesRes.data.data || spacesRes.data || [];

      const spacesWithData = await Promise.all(
        spaces.map(async (space: any) => {
          try {
            console.log(`[ClickUpSidebar] Fetching data for space "${space.name}" (${space._id})`);

            // Fetch lists (backend already includes taskCount and completedCount)
            const listsRes = await api.get(`/spaces/${space._id}/lists`);
            const allLists = listsRes.data.data || listsRes.data || [];
            console.log(`[ClickUpSidebar] Space "${space.name}" - Fetched ${allLists.length} lists with task counts`);

            // Fetch tasks for each list to calculate task counts
            const listsWithTaskCounts = await Promise.all(
              allLists.map(async (list: any) => {
                try {
                  const tasksRes = await api.get(`/lists/${list._id}/tasks`);
                  const tasks = tasksRes.data.data || tasksRes.data || [];
                  const completedTasks = tasks.filter((task: any) => task.status === 'done').length;
                  const totalTasks = tasks.length;

                  return {
                    ...list,
                    completedTasks,
                    totalTasks,
                  };
                } catch (error) {
                  console.error(`Failed to fetch tasks for list ${list._id}:`, error);
                  return {
                    ...list,
                    completedTasks: 0,
                    totalTasks: 0,
                  };
                }
              })
            );

            console.log(`[ClickUpSidebar] Space "${space.name}" - Calculated task counts for ${listsWithTaskCounts.length} lists`);

            // Fetch folders
            const foldersRes = await api.get(`/spaces/${space._id}/folders`);
            const folders = foldersRes.data.data || foldersRes.data || [];
            console.log(`[ClickUpSidebar] Space "${space.name}" - Fetched ${folders.length} folders`);

            // Separate lists into folders using folderId
            const foldersWithLists = folders.map((folder: any) => {
              const folderLists = listsWithTaskCounts
                .filter((list: any) => list.folderId === folder._id)
                .map((list: any) => ({
                  ...list,
                  type: 'list',
                }));

              return {
                ...folder,
                type: 'folder',
                lists: folderLists,
              };
            });

            // Lists without folder (standalone lists)
            const listsWithoutFolder = listsWithTaskCounts
              .filter((list: any) => !list.folderId)
              .map((list: any) => ({
                ...list,
                type: 'list',
              }));

            console.log(`[ClickUpSidebar] Space "${space.name}" - ${foldersWithLists.length} folders, ${listsWithoutFolder.length} standalone lists`);

            return {
              ...space,
              type: 'space',
              folders: foldersWithLists,
              listsWithoutFolder: listsWithoutFolder,
            };
          } catch (err) {
            console.error(`Failed to fetch data for space ${space._id}:`, err);
            return {
              ...space,
              type: 'space',
              folders: [],
              listsWithoutFolder: [],
            };
          }
        })
      );

      console.log('[ClickUpSidebar] ✅ Hierarchy fetched successfully!');
      console.log('[ClickUpSidebar] Spaces with data:', spacesWithData.map(s => ({
        name: s.name,
        folders: s.folders?.length || 0,
        lists: s.listsWithoutFolder?.length || 0
      })));

      // Auto-expand all spaces
      const spaceIds = spacesWithData.map(s => s._id);
      const { expandedIds } = useUIStore.getState();
      const newSpaceIds = spaceIds.filter(id => !expandedIds.includes(id));
      if (newSpaceIds.length > 0) {
        useUIStore.getState().expandAll(newSpaceIds);
        console.log('[ClickUpSidebar] Auto-expanded spaces:', newSpaceIds);
      }

      setHierarchy({
        workspaceId: workspace._id,
        workspaceName: workspace.name,
        spaces: spacesWithData,
      });
    } catch (err: any) {
      console.error('Failed to fetch hierarchy:', err);
      const errorMessage = err.response?.data?.message || err.message || 'Failed to load workspace';
      setError(errorMessage);

      if (err.response?.status === 404) {
        setTimeout(() => {
          if (typeof window !== 'undefined') {
            window.location.href = '/dashboard';
          }
        }, 2000);
      }
    } finally {
      setLoading(false);
    }
  }, [workspaceId, userId, setWorkspaceContext]);

  useEffect(() => {
    if (workspaceId) {
      fetchHierarchy();
      setOnSuccess(fetchHierarchy);
    }
  }, [workspaceId, fetchHierarchy, setOnSuccess]);

  const favoriteItems = hierarchy?.spaces
    .flatMap((space) => [
      space,
      ...(space.folders || []),
      ...(space.listsWithoutFolder || []),
    ])
    .filter((item) => favoriteIds.includes(item._id)) || [];

  const handleCreateSpace = () => {
    if (workspaceId && hierarchy) {
      openModal('space', workspaceId, 'workspace', hierarchy.workspaceName);
    }
  };

  // Don't render if not in workspace or on dashboard
  if (!workspaceId || pathname === '/dashboard') {
    return null;
  }

  return (
    <>
      <CreateItemModal />
      <EditSpaceModal />
      <EditFolderModal />
      <EditListModal />

      <div className={cn(
        "flex h-screen transition-all duration-300",
        !isSidebarOpen && "w-0 overflow-hidden"
      )}>
        {/* Left Icon Bar - Accent Color with Gradient - REDUCED WIDTH */}
        <div
          className="w-[60px] flex flex-col items-center py-4 transition-colors duration-300"
          style={{
            background: gradientStyle,
          }}
        >
          {/* Workspace Avatar */}
          <div className="mb-6">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-base shadow-lg"
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.2)',
                color: themeColor === '#f8fafc' ? '#1f2937' : '#ffffff'
              }}
            >
              {hierarchy?.workspaceName?.charAt(0) || 'W'}
            </div>
          </div>

          {/* Primary Navigation */}
          <div className="flex-1 flex flex-col gap-2 w-full px-2">
            <Link
              href={`/workspace/${workspaceId}/analytics`}
              className={cn(
                'flex flex-col items-center justify-center gap-1 py-2 rounded-lg transition-all duration-200',
                pathname === `/workspace/${workspaceId}/analytics`
                  ? 'bg-white/20 shadow-md'
                  : 'hover:bg-white/10'
              )}
              title="Dashboard"
            >
              <BarChart3
                className="w-5 h-5"
                style={{ color: themeColor === '#f8fafc' ? '#1f2937' : '#ffffff' }}
              />
              <span
                className="text-[9px] font-medium"
                style={{ color: themeColor === '#f8fafc' ? '#1f2937' : '#ffffff' }}
              >
                Dashboard
              </span>
            </Link>

            <Link
              href={`/workspace/${workspaceId}/settings/members`}
              className={cn(
                'flex flex-col items-center justify-center gap-1 py-2 rounded-lg transition-all duration-200',
                pathname === `/workspace/${workspaceId}/settings/members`
                  ? 'bg-white/20 shadow-md'
                  : 'hover:bg-white/10'
              )}
              title="Members"
            >
              <Users
                className="w-5 h-5"
                style={{ color: themeColor === '#f8fafc' ? '#1f2937' : '#ffffff' }}
              />
              <span
                className="text-[9px] font-medium"
                style={{ color: themeColor === '#f8fafc' ? '#1f2937' : '#ffffff' }}
              >
                Members
              </span>
            </Link>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="flex flex-col items-center justify-center gap-1 py-2 rounded-lg hover:bg-white/10 transition-all duration-200"
                  title="More"
                >
                  <MoreHorizontal
                    className="w-5 h-5"
                    style={{ color: themeColor === '#f8fafc' ? '#1f2937' : '#ffffff' }}
                  />
                  <span
                    className="text-[9px] font-medium"
                    style={{ color: themeColor === '#f8fafc' ? '#1f2937' : '#ffffff' }}
                  >
                    More
                  </span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem>
                  <Palette className="h-4 w-4 mr-2" />
                  Customize
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Settings className="h-4 w-4 mr-2" />
                  Settings
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>


        </div>

        {/* Main Sidebar Content - Reduced Width */}
        <div className="w-[240px] bg-white dark:bg-[#1a1a1a] border-r border-slate-200 dark:border-slate-800 flex flex-col">
          {/* Workspace Header */}
          <div className="p-3 border-b border-slate-200 dark:border-slate-800">
            <button
              onClick={handleWorkspaceClick}
              className="flex items-center gap-2 w-full hover:bg-slate-50 dark:hover:bg-[#262626] rounded-lg p-2 transition-colors"
            >
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center text-white font-semibold text-xs"
                style={{ backgroundColor: themeColor }}
              >
                {hierarchy?.workspaceName?.charAt(0) || 'W'}
              </div>
              <div className="flex-1 text-left min-w-0">
                <div className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                  {hierarchy?.workspaceName || 'Workspace'}
                </div>
              </div>
              <ChevronDown className="w-3 h-3 text-slate-400 dark:text-slate-500 flex-shrink-0" />
            </button>
          </div>



          {/* Scrollable Content */}
          <ScrollArea className="flex-1 px-3">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-slate-400 dark:text-slate-500" />
              </div>
            ) : error ? (
              <div className="py-8 px-2 text-center">
                <p className="text-xs text-red-600 dark:text-red-400 mb-2">Failed to load</p>
                <p className="text-[10px] text-slate-500 dark:text-slate-400">{error}</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3 h-7 text-xs"
                  onClick={fetchHierarchy}
                >
                  Retry
                </Button>
              </div>
            ) : (
              <div className="space-y-4 py-2">
                {/* Quick Links */}
                <div>
                  <div className="space-y-0.5">
                    <Link
                      href={`/workspace/${workspaceId}/chat`}
                      className={cn(
                        'flex items-center gap-2 px-2 py-1.5 rounded-md text-xs transition-colors',
                        pathname === `/workspace/${workspaceId}/chat`
                          ? 'bg-slate-100 dark:bg-[#262626] text-slate-900 dark:text-white font-medium'
                          : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                      )}
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      Group Chat
                    </Link>
                    <Link
                      href={`/workspace/${workspaceId}/inbox`}
                      className={cn(
                        'flex items-center gap-2 px-2 py-1.5 rounded-md text-xs transition-colors',
                        pathname === `/workspace/${workspaceId}/inbox`
                          ? 'bg-slate-100 dark:bg-[#262626] text-slate-900 dark:text-white font-medium'
                          : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                      )}
                    >
                      <Inbox className="w-3.5 h-3.5" />
                      Inbox (DMs)
                    </Link>
                    <Link
                      href={`/workspace/${workspaceId}/docs`}
                      className={cn(
                        'flex items-center gap-2 px-2 py-1.5 rounded-md text-xs transition-colors',
                        pathname?.includes('/docs')
                          ? 'bg-slate-100 dark:bg-[#262626] text-slate-900 dark:text-white font-medium'
                          : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                      )}
                    >
                      <FileText className="w-3.5 h-3.5" />
                      Documents
                    </Link>
                    <Link
                      href={`/workspace/${workspaceId}/files`}
                      className={cn(
                        'flex items-center gap-2 px-2 py-1.5 rounded-md text-xs transition-colors',
                        pathname?.includes('/files')
                          ? 'bg-slate-100 dark:bg-[#262626] text-slate-900 dark:text-white font-medium'
                          : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                      )}
                    >
                      <FolderOpen className="w-3.5 h-3.5" />
                      Files
                    </Link>
                    <Link
                      href="/notifications"
                      className={cn(
                        'flex items-center gap-2 px-2 py-1.5 rounded-md text-xs transition-colors relative',
                        pathname === '/notifications'
                          ? 'bg-slate-100 dark:bg-[#262626] text-slate-900 dark:text-white font-medium'
                          : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                      )}
                    >
                      <Bell className="w-3.5 h-3.5" />
                      Notifications
                      {unreadCount > 0 && (
                        <span className="ml-auto bg-red-500 text-white text-[10px] font-bold px-1 py-0.5 rounded-full min-w-[16px] text-center">
                          {unreadCount > 9 ? '9+' : unreadCount}
                        </span>
                      )}
                    </Link>

                  </div>
                </div>

                {/* Favorites */}
                {favoriteItems.length > 0 && (
                  <div>
                    <div className="flex items-center gap-1.5 px-2 py-1 mb-1">
                      <Star className="w-3 h-3 text-amber-500" />
                      <span className="text-xs font-semibold text-slate-900 dark:text-white">
                        Favorites
                      </span>
                    </div>
                    <div className="space-y-0.5">
                      {favoriteItems.map((item) => (
                        <HierarchyItemComponent
                          key={item._id}
                          item={item}
                          level={0}
                          workspaceId={workspaceId}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Spaces */}
                <div>
                  <div className="flex items-center justify-between px-2 py-1 mb-1">
                    <span className="text-xs font-semibold text-slate-900 dark:text-white">
                      Spaces
                    </span>
                    {isClient && can('create_space') && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-5 w-5"
                        onClick={handleCreateSpace}
                      >
                        <Plus className="w-3 h-3" />
                      </Button>
                    )}
                  </div>
                  {hierarchy?.spaces && hierarchy.spaces.length > 0 ? (
                    <div className="space-y-0.5">
                      {hierarchy.spaces.map((space) => (
                        <HierarchyItemComponent
                          key={space._id}
                          item={space}
                          level={0}
                          workspaceId={workspaceId}
                          parentSpaceId={space._id}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="px-2 py-3 text-center">
                      <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">No spaces yet</p>
                      {isClient && can('create_space') && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-1 h-7 text-xs"
                          onClick={handleCreateSpace}
                        >
                          <Plus className="h-3 w-3" />
                          Create Space
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </ScrollArea>

          {/* Upgrade Button - Only show for non-paid users who are admin/owner */}
          {subscription && !subscription.isPaid && (isAdmin() || isOwner()) && (
            <div className="px-3 py-2 border-t border-slate-200 dark:border-slate-800">
              <UpgradeButton 
                workspaceName={hierarchy?.workspaceName || 'Workspace'}
                whatsappNumber={whatsappNumber}
              />
            </div>
          )}

          {/* User Profile */}
          <div className="p-2 border-t border-slate-200 dark:border-slate-800">
            <button className="flex items-center gap-2 w-full px-2 py-1.5 text-xs hover:bg-slate-50 dark:hover:bg-slate-800 rounded-md transition-colors">
              <Avatar className="h-7 w-7 flex-shrink-0">
                {userAvatar ? (
                  <AvatarImage src={userAvatar} alt={userName} />
                ) : null}
                <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-500 text-white">
                  <User className="h-3.5 w-3.5" />
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 text-left min-w-0">
                <div className="font-medium truncate text-slate-900 dark:text-white text-[11px]">
                  {userName}
                </div>
                <div className="text-[10px] truncate text-slate-500 dark:text-slate-400">
                  {userEmail}
                </div>
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Workspace Switcher Modal */}
      {showWorkspaceSwitcher && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          onClick={() => setShowWorkspaceSwitcher(false)}
        >
          <div
            className="bg-white dark:bg-[#1a1a1a] rounded-xl shadow-xl w-full max-w-md mx-4 max-h-[80vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-slate-200 dark:border-[#262626]">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Switch Workspace</h3>
            </div>
            <ScrollArea className="max-h-[60vh] p-4">
              <div className="space-y-2">
                {allWorkspaces.map((workspace) => (
                  <button
                    key={workspace._id}
                    onClick={() => switchWorkspace(workspace._id)}
                    className={cn(
                      "w-full flex items-center gap-3 p-3 rounded-lg transition-colors",
                      workspace._id === workspaceId
                        ? "bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-500"
                        : "hover:bg-slate-50 dark:hover:bg-[#262626] border-2 border-transparent"
                    )}
                  >
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-semibold"
                      style={{ backgroundColor: themeColor }}
                    >
                      {workspace.name.charAt(0)}
                    </div>
                    <div className="flex-1 text-left">
                      <div className="font-semibold text-slate-900 dark:text-white">
                        {workspace.name}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        {workspace.members?.length || 0} members
                      </div>
                    </div>
                    {workspace._id === workspaceId && (
                      <div className="text-blue-500 text-xs font-medium">Current</div>
                    )}
                  </button>
                ))}
              </div>
            </ScrollArea>
          </div>
        </div>
      )}
    </>
  );
}
