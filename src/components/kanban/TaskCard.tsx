'use client';

import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Calendar, AlertCircle, User, GripVertical } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTaskSidebarStore } from '@/store/useTaskSidebarStore';

interface Task {
  _id: string;
  title: string;
  description?: string;
  status: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  dueDate?: string;
  assignee?: {
    _id: string;
    name: string;
    email: string;
  };
}

interface TaskCardProps {
  task: Task;
  isDragging?: boolean;
}

const priorityConfig = {
  low: {
    color: 'bg-slate-500',
    textColor: 'text-slate-700',
    bgColor: 'bg-slate-50',
    label: 'Low',
  },
  medium: {
    color: 'bg-blue-500',
    textColor: 'text-blue-700',
    bgColor: 'bg-blue-50',
    label: 'Medium',
  },
  high: {
    color: 'bg-orange-500',
    textColor: 'text-orange-700',
    bgColor: 'bg-orange-50',
    label: 'High',
  },
  urgent: {
    color: 'bg-red-500',
    textColor: 'text-red-700',
    bgColor: 'bg-red-50',
    label: 'Urgent',
  },
};

export function TaskCard({ task, isDragging }: TaskCardProps) {
  const { openTask } = useTaskSidebarStore();
  
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({ id: task._id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const priority = priorityConfig[task.priority] || priorityConfig.medium;
  const isOverdue = task.dueDate && new Date(task.dueDate) < new Date();

  const handleClick = (e: React.MouseEvent) => {
    // Don't open sidebar if clicking on drag handle
    if ((e.target as HTMLElement).closest('button[data-drag-handle]')) {
      return;
    }
    openTask(task._id);
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={handleClick}
      className={cn(
        'bg-white rounded-lg border border-slate-200 p-3 mb-2 cursor-pointer',
        'hover:shadow-md transition-shadow duration-200',
        'group',
        (isDragging || isSortableDragging) && 'opacity-50'
      )}
    >
      {/* Drag Handle & Title */}
      <div className="flex items-start gap-2 mb-2">
        <button
          {...attributes}
          {...listeners}
          data-drag-handle
          className="mt-0.5 text-slate-400 hover:text-slate-600 cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <GripVertical className="h-4 w-4" />
        </button>
        <h3 className="flex-1 text-sm font-medium text-slate-900 line-clamp-2">
          {task.title}
        </h3>
      </div>

      {/* Description (if exists) */}
      {task.description && (
        <p className="text-xs text-slate-600 mb-2 line-clamp-2 ml-6">
          {task.description}
        </p>
      )}

      {/* Footer: Priority, Due Date, Assignee */}
      <div className="flex items-center justify-between ml-6">
        <div className="flex items-center gap-2">
          {/* Priority Badge */}
          <span
            className={cn(
              'inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium',
              priority.bgColor,
              priority.textColor
            )}
          >
            <AlertCircle className="h-3 w-3" />
            {priority.label}
          </span>

          {/* Due Date */}
          {task.dueDate && (
            <span
              className={cn(
                'inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs',
                isOverdue
                  ? 'bg-red-50 text-red-700 font-medium'
                  : 'bg-slate-50 text-slate-600'
              )}
            >
              <Calendar className="h-3 w-3" />
              {new Date(task.dueDate).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
              })}
            </span>
          )}
        </div>

        {/* Assignee Avatar */}
        {task.assignee && (
          <div
            className="h-6 w-6 rounded-full bg-gradient-to-br from-purple-400 to-blue-400 flex items-center justify-center text-white text-xs font-medium"
            title={task.assignee.name}
          >
            {task.assignee.name
              .split(' ')
              .map((n) => n[0])
              .join('')
              .toUpperCase()
              .slice(0, 2)}
          </div>
        )}
      </div>
    </div>
  );
}
