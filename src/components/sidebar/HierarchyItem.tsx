'use client';

import React, { useState } from 'react';
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
import { HierarchyItem, HierarchyItemType } from '@/types/hierarchy';
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
}

const INDENT_SIZE = 12; // pixels per level

export function HierarchyItemComponent({ item, level, workspaceId }: HierarchyItemProps) {
  const pathname = usePathname();
  const { expandedIds, toggleExpanded, favoriteIds, toggleFavorite } = useUIStore();
  const { openModal } = useModalStore();
  const [isHovered, setIsHovered] = useState(false);

  const isExpanded = expandedIds.includes(item._id);
  const isFavorite = favoriteIds.includes(item._id);

  // Determine if item has children
  const hasChildren =
    (item.type === 'space' && ((item.folders && item.folders.length > 0) || (item.lists && item.lists.length > 0))) ||
    (item.type === 'folder' && item.lists && item.lists.length > 0);

  // Get icon based on type
  const getIcon = () => {
    switch (item.type) {
      case 'space':
        return <Square className="h-4 w-4 text-blue-500" />;
      case 'folder':
        return <Folder className="h-4 w-4 text-amber-500" />;
      case 'list':
        return <Hash className="h-4 w-4 text-slate-500" />;
      default:
        return <List className="h-4 w-4 text-slate-500" />;
    }
  };

  // Get route based on type
  const getRoute = () => {
    switch (item.type) {
      case 'space':
        return `/workspace/${workspaceId}/spaces/${item._id}`;
      case 'folder':
        return `/workspace/${workspaceId}/folder/${item._id}`;
      case 'list':
        // Lists navigate to: /workspace/[wsId]/spaces/[spaceId]/lists/[listId]
        const spaceId = (item as any).space;
        if (spaceId) {
          return `/workspace/${workspaceId}/spaces/${spaceId}/lists/${item._id}`;
        }
        return '#';
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
      // Create list in space (or folder if folders are implemented)
      openModal('list', item._id, 'space', item.name);
    } else if (item.type === 'folder') {
      // Create list in folder
      openModal('list', item._id, 'folder', item.name);
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
        <Link
          href={route}
          className={cn(
            'flex items-center gap-2 px-2 py-1.5 rounded-md transition-all duration-150',
            'hover:bg-slate-100',
            isActive && 'bg-blue-50 text-blue-700 font-medium hover:bg-blue-100',
            !isActive && 'text-slate-700'
          )}
        >
          {/* Chevron - Only show if has children */}
          <button
            onClick={handleToggle}
            className={cn(
              'flex items-center justify-center h-4 w-4 rounded hover:bg-slate-200 transition-colors',
              !hasChildren && 'invisible'
            )}
          >
            {hasChildren && (
              <>
                {isExpanded ? (
                  <ChevronDown className="h-3 w-3 text-slate-600" />
                ) : (
                  <ChevronRight className="h-3 w-3 text-slate-600" />
                )}
              </>
            )}
          </button>

          {/* Icon */}
          <div className="flex-shrink-0">{getIcon()}</div>

          {/* Name */}
          <span className="flex-1 text-sm truncate">{item.name}</span>

          {/* Favorite Star */}
          {isFavorite && (
            <Star className="h-3 w-3 text-amber-500 fill-amber-500 flex-shrink-0" />
          )}

          {/* Hover Actions */}
          {isHovered && (
            <div className="flex items-center gap-1 flex-shrink-0">
              {/* Add Button */}
              {item.type !== 'list' && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={handleAdd}
                >
                  <Plus className="h-3 w-3" />
                </Button>
              )}

              {/* More Menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => e.preventDefault()}
                  >
                    <MoreHorizontal className="h-3 w-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem onClick={handleToggleFavorite}>
                    <Star className="h-4 w-4 mr-2" />
                    {isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.preventDefault();
                      if (item.type === 'space') {
                        openModal('list', item._id, 'space', item.name);
                      } else if (item.type === 'folder') {
                        openModal('list', item._id, 'folder', item.name);
                      }
                    }}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    {item.type === 'space' ? 'New list' : 'New list'}
                  </DropdownMenuItem>
                  <DropdownMenuItem>Rename</DropdownMenuItem>
                  <DropdownMenuItem>Duplicate</DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="text-red-600">Delete</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
        </Link>
      </div>

      {/* Recursive Children */}
      {isExpanded && hasChildren && (
        <div className="mt-0.5">
          {/* Render folders first (for spaces) */}
          {item.type === 'space' && item.folders && item.folders.length > 0 && (
            <>
              {item.folders.map((folder) => (
                <HierarchyItemComponent
                  key={folder._id}
                  item={folder}
                  level={level + 1}
                  workspaceId={workspaceId}
                />
              ))}
            </>
          )}

          {/* Render lists */}
          {item.type === 'space' && item.lists && item.lists.length > 0 && (
            <>
              {item.lists.map((list) => (
                <HierarchyItemComponent
                  key={list._id}
                  item={list}
                  level={level + 1}
                  workspaceId={workspaceId}
                />
              ))}
            </>
          )}

          {item.type === 'folder' && item.lists && item.lists.length > 0 && (
            <>
              {item.lists.map((list) => (
                <HierarchyItemComponent
                  key={list._id}
                  item={list}
                  level={level + 1}
                  workspaceId={workspaceId}
                />
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}
