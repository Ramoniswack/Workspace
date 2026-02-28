'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  ChevronRight,
  ChevronDown,
  Square,
  Folder,
  List,
  Hash,
  Plus,
  MoreHorizontal,
  Star,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUIStore } from '@/store/useUIStore';
import { useModalStore } from '@/store/useModalStore';
import { usePermissions } from '@/store/useAuthStore';
import { HierarchyItem } from '@/types/hierarchy';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface HierarchyItemProps {
  item: HierarchyItem;
  level: number;
  workspaceId: string;
  parentSpaceId?: string;
}

const INDENT_SIZE = 12; // pixels per level

export function HierarchyItemComponent({ item, level, workspaceId, parentSpaceId }: HierarchyItemProps) {
  const pathname = usePathname();
  const { expandedIds, toggleExpanded, favoriteIds, toggleFavorite } = useUIStore();
  const { openModal } = useModalStore();
  const { isAdmin, isOwner } = usePermissions();
  const [isHovered, setIsHovered] = useState(false);
  const [canCreateContent, setCanCreateContent] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  // Check if user is admin or owner
  const isAdminOrOwner = isAdmin() || isOwner();

  // Get userId from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedUserId = localStorage.getItem('userId');
      setUserId(storedUserId);
    }
  }, []);

  // Check if user can create content
  useEffect(() => {
    if (userId) {
      setCanCreateContent(isAdminOrOwner);
    }
  }, [userId, isAdminOrOwner]);

  // Admins and owners can rename spaces/folders/lists
  const canEdit = isAdminOrOwner;

  const isExpanded = expandedIds.includes(item._id);
  const isFavorite = favoriteIds.includes(item._id);

  // Determine if item has children
  const hasChildren =
    (item.type === 'space' && ((item.folders && item.folders.length > 0) || ((item as any).listsWithoutFolder && (item as any).listsWithoutFolder.length > 0))) ||
    (item.type === 'folder' && item.lists && item.lists.length > 0);

  // Debug log
  useEffect(() => {
    if (item.type === 'space') {
      console.log(`[HierarchyItem] Space "${item.name}":`, {
        folders: item.folders?.length || 0,
        listsWithoutFolder: (item as any).listsWithoutFolder?.length || 0,
        hasChildren,
        isExpanded
      });
    }
  }, [item, hasChildren, isExpanded]);

  // Get icon based on type
  const getIcon = () => {
    switch (item.type) {
      case 'space':
        return <Square className="h-4 w-4 text-blue-500 dark:text-blue-400" />;
      case 'folder':
        // Use the folder's color if available, otherwise default to amber
        const folderColor = (item as any).color || '#F59E0B';
        return <Folder className="h-4 w-4" style={{ color: folderColor }} />;
      case 'list':
        return <Hash className="h-4 w-4 text-slate-500 dark:text-slate-400" />;
      default:
        return <List className="h-4 w-4 text-slate-500 dark:text-slate-400" />;
    }
  };

  // Get route based on type
const getRoute = () => {
  switch (item.type) {
    case 'space':
      return `/workspace/${workspaceId}/spaces/${item._id}`;

    case 'folder':
      if (!parentSpaceId) return '#';
      return `/workspace/${workspaceId}/spaces/${parentSpaceId}?folder=${item._id}`;

    case 'list':
      if (!parentSpaceId) return '#';
      return `/workspace/${workspaceId}/spaces/${parentSpaceId}/lists/${item._id}`;

    default:
      return '#';
  }
};

  const route = getRoute();
  const isActive = pathname === route;

  // Handle click on chevron
  const handleToggle = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (hasChildren) {
      toggleExpanded(item._id);
    }
  };

  // Handle add action
  const handleAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Determine what to create based on current item type
    if (item.type === 'space') {
      // Create folder in space
      openModal('folder', item._id, 'space', item.name);
    } else if (item.type === 'folder') {
      // Create list in folder - pass spaceId as 5th parameter
      const spaceId = parentSpaceId || (item as any).space || (item as any).spaceId;
      openModal('list', item._id, 'folder', item.name, spaceId);
    }
  };

  // Handle favorite toggle
  const handleToggleFavorite = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toggleFavorite(item._id);
  };

  return (
    <div>
      {/* Main Item Row */}
      <div
        className="group relative"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        style={{ paddingLeft: `${level * INDENT_SIZE}px` }}
      >
        <div className="flex items-center gap-2 px-2 py-1.5 rounded-md transition-all duration-150 hover:bg-slate-100 dark:hover:bg-slate-800">
          {/* Chevron - Only show if has children */}
          <button
            onClick={handleToggle}
            className={cn(
              'flex items-center justify-center h-4 w-4 rounded hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors flex-shrink-0',
              !hasChildren && 'invisible'
            )}
          >
            {hasChildren && (
              <>
                {isExpanded ? (
                  <ChevronDown className="h-3 w-3 text-slate-600 dark:text-slate-300" />
                ) : (
                  <ChevronRight className="h-3 w-3 text-slate-600 dark:text-slate-300" />
                )}
              </>
            )}
          </button>

          {/* Icon */}
          <div className="flex-shrink-0">{getIcon()}</div>

          {/* Name - Clickable Link */}
          <Link
            href={route}
            className={cn(
              'flex-1 text-sm truncate',
              isActive && 'text-blue-700 dark:text-blue-400 font-medium',
              !isActive && 'text-slate-700 dark:text-white'
            )}
          >
            {item.name}
          </Link>

          {/* Favorite Star */}
          {isFavorite && (
            <Star className="h-3 w-3 text-amber-500 fill-amber-500 flex-shrink-0" />
          )}

          {/* Hover Actions */}
          {isHovered && isAdminOrOwner && (
            <div className="flex items-center gap-0.5 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
              {/* Add Button - For spaces: create folder */}
              {item.type === 'space' && canCreateContent && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-slate-200 dark:hover:bg-slate-700"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleAdd(e);
                  }}
                  title="Create folder"
                >
                  <Plus className="h-3 w-3" />
                </Button>
              )}
              
              {/* Add Button - For folders: create list */}
              {item.type === 'folder' && canCreateContent && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-slate-200 dark:hover:bg-slate-700"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleAdd(e);
                  }}
                  title="Create list"
                >
                  <Plus className="h-3 w-3" />
                </Button>
              )}

              {/* More Menu */}
              <DropdownMenu modal={false}>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-slate-200 dark:hover:bg-slate-700"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                    }}
                  >
                    <MoreHorizontal className="h-3 w-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent 
                  align="end" 
                  className="w-48 z-50"
                  onClick={(e) => e.stopPropagation()}
                >
                  <DropdownMenuItem 
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleFavorite(e);
                    }}
                  >
                    <Star className="h-4 w-4 mr-2" />
                    {isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                  </DropdownMenuItem>
                  
                  {/* Edit options for owner only */}
                  {canEdit && (
                    <>
                      <DropdownMenuSeparator />
                      {item.type === 'space' && (
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            openModal('editSpace', item._id, 'space', item.name);
                          }}
                        >
                          <MoreHorizontal className="h-4 w-4 mr-2" />
                          Rename space
                        </DropdownMenuItem>
                      )}
                      {item.type === 'folder' && (
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            openModal('editFolder', item._id, 'folder', item.name);
                          }}
                        >
                          <MoreHorizontal className="h-4 w-4 mr-2" />
                          Rename folder
                        </DropdownMenuItem>
                      )}
                      {item.type === 'list' && (
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            openModal('editList', item._id, 'list', item.name);
                          }}
                        >
                          <MoreHorizontal className="h-4 w-4 mr-2" />
                          Rename list
                        </DropdownMenuItem>
                      )}
                    </>
                  )}
                  
                  {/* Create actions */}
                  {canCreateContent && (
                    <>
                      <DropdownMenuSeparator />
                      {item.type === 'space' && (
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            openModal('folder', item._id, 'space', item.name);
                          }}
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          New folder
                        </DropdownMenuItem>
                      )}
                      {item.type === 'folder' && (
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            const spaceId = parentSpaceId || (item as any).space || (item as any).spaceId;
                            openModal('list', item._id, 'folder', item.name, spaceId);
                          }}
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          New list
                        </DropdownMenuItem>
                      )}
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
        </div>
      </div>

{isExpanded && (
  <div className="mt-0.5">

    {/* SPACE CHILDREN */}
    {item.type === 'space' && (
      <>
        {/* Render folders */}
        {item.folders?.map((folder) => (
          <HierarchyItemComponent
            key={folder._id}
            item={folder}
            level={level + 1}
            workspaceId={workspaceId}
            parentSpaceId={item._id}
          />
        ))}

        {/* Render ONLY lists that truly have NO folder */}
        {(item as any).listsWithoutFolder
          ?.filter((list: any) => !list.folder)
          .map((list: any) => (
            <HierarchyItemComponent
              key={list._id}
              item={list}
              level={level + 1}
              workspaceId={workspaceId}
              parentSpaceId={item._id}
            />
          ))}
      </>
    )}

    {/* FOLDER CHILDREN */}
    {item.type === 'folder' && (
      <>
        {item.lists?.map((list) => (
          <HierarchyItemComponent
            key={list._id}
            item={list}
            level={level + 1}
            workspaceId={workspaceId}
            parentSpaceId={parentSpaceId}
          />
        ))}
      </>
    )}
  </div>
)}
    </div>
  );
}
