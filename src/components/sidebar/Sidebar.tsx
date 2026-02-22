'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { usePathname, useParams } from 'next/navigation';
import {
  Home,
  Inbox,
  Bell,
  Settings,
  Search,
  Plus,
  Star,
  LayoutDashboard,
  ChevronDown,
  Loader2,
  User,
  Users,
  BarChart3,
  FileText,
  MoreHorizontal,
  UserPlus,
  MessageSquare,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUIStore } from '@/store/useUIStore';
import { useModalStore } from '@/store/useModalStore';
import { usePermissions, useWorkspaceContext } from '@/store/useAuthStore';
import { useNotificationStore } from '@/store/useNotificationStore';
import { useThemeStore, accentColors } from '@/store/useThemeStore';
import { HierarchyItemComponent } from './HierarchyItem';
import { WorkspaceHierarchy } from '@/types/hierarchy';
import { CreateItemModal } from '@/components/modals/CreateItemModal';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/axios';

export function ClickUpSidebar() {
  const pathname = usePathname();
  const params = useParams();
  const { isSidebarOpen, favoriteIds } = useUIStore();
  const { openModal, setOnSuccess } = useModalStore();
  const { can } = usePermissions();
  const { setWorkspaceContext } = useWorkspaceContext();
  const { unreadCount } = useNotificationStore();
  const { accentColor } = useThemeStore();
  
  const [hierarchy, setHierarchy] = useState<WorkspaceHierarchy | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userName, setUserName] = useState('User');
  const [userEmail, setUserEmail] = useState('user@example.com');
  const [userId, setUserId] = useState<string | null>(null);
  const [isClient, setIsClient] = useState(false);

  // Extract workspaceId from URL
  let workspaceId = params?.id as string;
  
  if (!workspaceId && pathname) {
    const workspaceMatch = pathname.match(/\/workspace\/([^\/]+)/);
    if (workspaceMatch) {
      workspaceId = workspaceMatch[1];
    }
  }

  const themeColor = accentColors[accentColor];

  // Sidebar colors based on theme
  const sidebarColor = 'transparent';
  const sidebarTextColor = 'inherit';

  // Load user info from localStorage on client side only
  useEffect(() => {
    setIsClient(true);
    if (typeof window !== 'undefined') {
      const storedName = localStorage.getItem('userName');
      const storedEmail = localStorage.getItem('userEmail');
      const storedUserId = localStorage.getItem('userId');
      if (storedName) setUserName(storedName);
      if (storedEmail) setUserEmail(storedEmail);
      if (storedUserId) setUserId(storedUserId);
    }
  }, []);

  // Define fetchHierarchy function with useCallback
  const fetchHierarchy = useCallback(async () => {
    if (!workspaceId) {
      setLoading(false);
      return;
    }

    // Validate workspace ID format
    if (!/^[0-9a-fA-F]{24}$/.test(workspaceId)) {
      console.error('Invalid workspace ID format:', workspaceId);
      setError('Invalid workspace ID');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Fetch workspace details
      const workspaceRes = await api.get(`/workspaces/${workspaceId}`);
      const workspace = workspaceRes.data.data || workspaceRes.data;

      if (!workspace || !workspace._id) {
        throw new Error('Workspace not found');
      }

      // Set workspace context with user's role
      if (userId) {
        const userMember = workspace.members?.find((m: any) => m.user === userId || m.user._id === userId);
        if (userMember) {
          setWorkspaceContext(workspace._id, userMember.role);
        }
      }

      // Fetch all spaces for this workspace
      const spacesRes = await api.get(`/workspaces/${workspaceId}/spaces`);
      const spaces = spacesRes.data.data || spacesRes.data || [];

      // For each space, fetch its lists and folders (backend filters based on access)
      const spacesWithData = await Promise.all(
        spaces.map(async (space: any) => {
          try {
            // Fetch lists - backend will filter based on user's access
            const listsRes = await api.get(`/spaces/${space._id}/lists`);
            const lists = listsRes.data.data || listsRes.data || [];

            // Fetch folders - backend will filter based on user's access
            const foldersRes = await api.get(`/spaces/${space._id}/folders`);
            const folders = foldersRes.data.data || foldersRes.data || [];

            return {
              ...space,
              type: 'space',
              lists: lists.map((list: any) => ({
                ...list,
                type: 'list',
              })),
              folders: folders.map((folder: any) => ({
                ...folder,
                type: 'folder',
                lists: folder.lists || [],
              })),
            };
          } catch (err) {
            console.error(`Failed to fetch data for space ${space._id}:`, err);
            return {
              ...space,
              type: 'space',
              lists: [],
              folders: [],
            };
          }
        })
      );

      // Filter out spaces with no accessible content for non-admin/owner users
      // Check if user is workspace owner or admin
      const workspaceOwnerId = typeof workspace.owner === 'string' ? workspace.owner : workspace.owner?._id;
      const isOwner = workspaceOwnerId === userId;
      const userMember = workspace.members?.find((m: any) => {
        const memberId = typeof m.user === 'string' ? m.user : m.user._id;
        return memberId === userId;
      });
      const isAdmin = userMember?.role === 'admin' || userMember?.role === 'owner';

      // If user is owner/admin, show all spaces. Otherwise, only show spaces with accessible content
      const filteredSpaces = (isOwner || isAdmin) 
        ? spacesWithData 
        : spacesWithData.filter(space => {
            // Check if user is a space member
            const isSpaceMember = space.members?.some((m: any) => {
              const memberId = typeof m.user === 'string' ? m.user : m.user?._id;
              return memberId === userId;
            });
            
            // Show space if user is a member OR has access to any lists/folders
            return isSpaceMember || space.lists.length > 0 || space.folders.length > 0;
          });

      setHierarchy({
        workspaceId: workspace._id,
        workspaceName: workspace.name,
        spaces: filteredSpaces,
      });
    } catch (err: any) {
      console.error('Failed to fetch hierarchy:', err);
      const errorMessage = err.response?.data?.message || err.message || 'Failed to load workspace';
      setError(errorMessage);
      
      // If workspace not found, redirect to dashboard
      if (err.response?.status === 404) {
        console.log('Workspace not found, redirecting to dashboard...');
        // Don't redirect immediately to avoid infinite loops
        setTimeout(() => {
          if (typeof window !== 'undefined') {
            window.location.href = '/dashboard';
          }
        }, 2000);
      }
    } finally {
      setLoading(false);
    }
  }, [workspaceId]);

  // Fetch hierarchy data when workspaceId changes
  useEffect(() => {
    if (workspaceId) {
      fetchHierarchy();
      // Set success callback for modal
      setOnSuccess(() => fetchHierarchy);
    }
  }, [workspaceId, fetchHierarchy, setOnSuccess]);

  // Get favorite items
  const favoriteItems = hierarchy?.spaces
    .flatMap((space) => [
      space,
      ...(space.folders || []),
      ...(space.lists || []),
    ])
    .filter((item) => favoriteIds.includes(item._id)) || [];

  // Handle create space
  const handleCreateSpace = () => {
    if (workspaceId && hierarchy) {
      openModal('space', workspaceId, 'workspace', hierarchy.workspaceName);
    }
  };

  // Don't render sidebar if not in a workspace context
  if (!workspaceId) {
    return null;
  }

  // Hide sidebar with CSS instead of unmounting
  if (!isSidebarOpen) {
    return (
      <>
        <CreateItemModal />
      </>
    );
  }

  return (
    <>
      {/* Create Item Modal */}
      <CreateItemModal />
      
      <aside 
        className="w-[280px] border-r border-slate-200 dark:border-slate-700 flex flex-col h-screen transition-colors duration-300"
        style={{ backgroundColor: sidebarColor, color: sidebarTextColor }}
      >
        {/* Sidebar Header */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center flex-shrink-0">
                <span className="text-white text-sm font-bold">
                  {hierarchy?.workspaceName?.charAt(0) || 'W'}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-sm font-semibold truncate" style={{ color: sidebarTextColor }}>
                  {hierarchy?.workspaceName || 'Workspace'}
                </h2>
              </div>
              <Button variant="ghost" size="icon" className="h-7 w-7 flex-shrink-0" style={{ color: sidebarTextColor }}>
                <ChevronDown className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search..."
              className="w-full pl-9 pr-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Quick Links */}
        <div className="px-3 py-2">
          <nav className="space-y-0.5">
            <Link
              href={`/workspace/${workspaceId}`}
              className={cn(
                'flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition-colors',
                pathname === `/workspace/${workspaceId}`
                  ? 'bg-slate-200/50 dark:bg-slate-700/50'
                  : 'hover:bg-slate-100/50 dark:hover:bg-slate-700/30'
              )}
              style={{ color: sidebarTextColor }}
            >
              <Home className="h-4 w-4" />
              Home
            </Link>
            <Link
              href={`/workspace/${workspaceId}/dashboard`}
              className={cn(
                'flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition-colors',
                pathname === `/workspace/${workspaceId}/dashboard`
                  ? 'bg-slate-200/50 dark:bg-slate-700/50'
                  : 'hover:bg-slate-100/50 dark:hover:bg-slate-700/30'
              )}
              style={{ color: sidebarTextColor }}
            >
              <BarChart3 className="h-4 w-4" />
              Analytics
            </Link>
            <Link
              href={`/workspace/${workspaceId}/docs`}
              className={cn(
                'flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition-colors',
                pathname === `/workspace/${workspaceId}/docs`
                  ? 'bg-slate-200/50 dark:bg-slate-700/50'
                  : 'hover:bg-slate-100/50 dark:hover:bg-slate-700/30'
              )}
              style={{ color: sidebarTextColor }}
            >
              <FileText className="h-4 w-4" />
              Documents
            </Link>
            <Link
              href={`/workspace/${workspaceId}/chat`}
              className={cn(
                'flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition-colors',
                pathname === `/workspace/${workspaceId}/chat`
                  ? 'bg-slate-200/50 dark:bg-slate-700/50'
                  : 'hover:bg-slate-100/50 dark:hover:bg-slate-700/30'
              )}
              style={{ color: sidebarTextColor }}
            >
              <MessageSquare className="h-4 w-4" />
              Group Chat
            </Link>
            <Link
              href={`/workspace/${workspaceId}/inbox`}
              className={cn(
                'flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition-colors',
                pathname === `/workspace/${workspaceId}/inbox`
                  ? 'bg-slate-200/50 dark:bg-slate-700/50'
                  : 'hover:bg-slate-100/50 dark:hover:bg-slate-700/30'
              )}
              style={{ color: sidebarTextColor }}
            >
              <Inbox className="h-4 w-4" />
              Inbox (DMs)
            </Link>
            <Link
              href="/notifications"
              className={cn(
                'flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition-colors relative',
                pathname === '/notifications'
                  ? 'bg-slate-200/50 dark:bg-slate-700/50'
                  : 'hover:bg-slate-100/50 dark:hover:bg-slate-700/30'
              )}
              style={{ color: sidebarTextColor }}
            >
              <div className="relative">
                <Bell className="h-4 w-4" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </div>
              Notifications
            </Link>
            {isClient && can('view_settings') && (
              <>
                <Link
                  href={`/workspace/${workspaceId}/settings/members`}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition-colors',
                    pathname?.startsWith(`/workspace/${workspaceId}/settings`)
                      ? 'bg-slate-200/50 dark:bg-slate-700/50'
                      : 'hover:bg-slate-100/50 dark:hover:bg-slate-700/30'
                  )}
                  style={{ color: sidebarTextColor }}
                >
                  <Users className="h-4 w-4" />
                  Members
                </Link>
                <Link
                  href={`/workspace/${workspaceId}/settings/appearance`}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition-colors',
                    pathname === `/workspace/${workspaceId}/settings/appearance`
                      ? 'bg-slate-200/50 dark:bg-slate-700/50'
                      : 'hover:bg-slate-100/50 dark:hover:bg-slate-700/30'
                  )}
                  style={{ color: sidebarTextColor }}
                >
                  <Settings className="h-4 w-4" />
                  Appearance
                </Link>
              </>
            )}
          </nav>
        </div>

        <Separator className="my-2" />

        {/* Scrollable Content */}
        <ScrollArea className="flex-1 px-3">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
            </div>
          ) : error ? (
            <div className="py-8 px-4 text-center">
              <p className="text-sm text-red-600 mb-2">Failed to load workspace</p>
              <p className="text-xs text-slate-500">{error}</p>
              <Button
                variant="outline"
                size="sm"
                className="mt-3"
                onClick={fetchHierarchy}
              >
                Retry
              </Button>
            </div>
          ) : (
            <div className="space-y-6 pb-4">
              {/* Favorites Section */}
              {favoriteItems.length > 0 && (
                <div>
                  <div className="flex items-center justify-between px-3 py-2">
                    <div className="flex items-center gap-2">
                      <Star className="h-4 w-4 text-amber-500" />
                      <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: sidebarTextColor }}>
                        Favorites
                      </span>
                    </div>
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

              {/* Spaces Section */}
              <div>
                <div className="flex items-center justify-between px-3 py-2">
                  <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: sidebarTextColor }}>
                    Spaces
                  </span>
                  {isClient && can('create_space') && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={handleCreateSpace}
                      style={{ color: sidebarTextColor }}
                    >
                      <Plus className="h-3 w-3" />
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
                      />
                    ))}
                  </div>
                ) : (
                  <div className="px-3 py-4 text-center">
                    <p className="text-sm mb-2" style={{ color: sidebarTextColor, opacity: 0.7 }}>No spaces yet</p>
                    {isClient && can('create_space') && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-2"
                        onClick={handleCreateSpace}
                      >
                        <Plus className="h-3 w-3" />
                        Create Space
                      </Button>
                    )}
                  </div>
                )}
              </div>

              {/* Dashboards Section */}
              <div>
                <div className="flex items-center justify-between px-3 py-2">
                  <div className="flex items-center gap-2">
                    <LayoutDashboard className="h-4 w-4" style={{ color: sidebarTextColor, opacity: 0.7 }} />
                    <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: sidebarTextColor }}>
                      Dashboards
                    </span>
                  </div>
                  <Button variant="ghost" size="icon" className="h-6 w-6" style={{ color: sidebarTextColor }}>
                    <Plus className="h-3 w-3" />
                  </Button>
                </div>
                <div className="px-3 py-2">
                  <p className="text-xs" style={{ color: sidebarTextColor, opacity: 0.7 }}>No dashboards yet</p>
                </div>
              </div>
            </div>
          )}
        </ScrollArea>

        {/* User Profile */}
        <div className="p-3 border-t border-slate-200 dark:border-slate-700">
          <button className="flex items-center gap-3 w-full px-3 py-2 text-sm hover:bg-slate-100/50 dark:hover:bg-slate-700/30 rounded-md transition-colors" style={{ color: sidebarTextColor }}>
            <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center flex-shrink-0">
              <User className="h-4 w-4 text-white" />
            </div>
            <div className="flex-1 text-left min-w-0">
              <div className="font-medium truncate">
                {userName}
              </div>
              <div className="text-xs truncate" style={{ opacity: 0.7 }}>
                {userEmail}
              </div>
            </div>
            <Settings className="h-4 w-4 flex-shrink-0" style={{ opacity: 0.7 }} />
          </button>
        </div>
      </aside>
    </>
  );
}
