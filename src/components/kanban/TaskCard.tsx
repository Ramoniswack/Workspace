'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Task } from '@/types';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { format } from 'date-fns';

interface TaskCardProps {
  task: Task;
  spaceMembers: any[];
  isDragging?: boolean;
  isOverlay?: boolean;
  canDrag?: boolean;
  columnId?: string;
}

export function TaskCard({
  task,
  spaceMembers,
  isDragging,
  isOverlay,
  canDrag = true,
  columnId,
}: TaskCardProps) {
  // Debug logging
  if (task.deadline) {
    console.log('[TaskCard] Task has deadline:', { 
      taskId: task._id, 
      title: task.title,
      deadline: task.deadline 
    });
  }

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({
    id: task._id,
    disabled: !canDrag,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const priorityConfig = {
    urgent: { label: 'Urgent', color: '#ef4444', bg: '#fee2e2' },
    high: { label: 'High', color: '#f97316', bg: '#ffedd5' },
    medium: { label: 'Medium', color: '#3b82f6', bg: '#dbeafe' },
    low: { label: 'Low', color: '#10b981', bg: '#d1fae5' },
  };

  const priority = priorityConfig[task.priority || 'medium'];

  const assignee = task.assignee
    ? typeof task.assignee === 'string'
      ? spaceMembers.find((m: any) => {
          const memberId = typeof m.user === 'string' ? m.user : m.user?._id;
          return memberId === task.assignee;
        })
      : task.assignee
    : null;

  const assigneeName = assignee
    ? typeof assignee.user === 'string'
      ? assignee.user
      : assignee.user?.name || assignee.name || 'Unknown'
    : null;

  const assigneeAvatar = assignee
    ? typeof assignee.user === 'string'
      ? null
      : assignee.user?.avatar || assignee.avatar
    : null;

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const isInProgress = columnId === 'inprogress';
  const isDone = columnId === 'done';

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`
        w-full bg-white dark:bg-slate-800 p-2.5 sm:p-3 rounded-lg shadow-sm border border-slate-100 dark:border-slate-700/50 
        hover:shadow-md transition-all cursor-grab
        ${isInProgress ? 'border-l-4 border-l-primary' : ''}
        ${isDone ? 'bg-white/60 dark:bg-slate-800/60 opacity-80' : ''}
        ${isDragging || isOverlay ? 'shadow-2xl rotate-2 scale-105 opacity-90' : ''}
        ${isSortableDragging ? 'opacity-50' : ''}
        ${!canDrag ? 'cursor-not-allowed opacity-60' : ''}
      `}
    >
      {/* Header: Priority Badge + Status Icon */}
      <div className="flex justify-between items-start mb-1.5 sm:mb-2">
        <span
          className="text-[8px] sm:text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded"
          style={{
            backgroundColor: priority.bg,
            color: priority.color,
          }}
        >
          {priority.label}
        </span>
        {isDone && (
          <span className="material-symbols-outlined text-emerald-500 text-[14px] sm:text-[16px]">
            check_circle
          </span>
        )}
      </div>

      {/* Task Title */}
      <h4
        className={`font-semibold leading-tight mb-1.5 sm:mb-2 text-[11px] sm:text-xs line-clamp-2 ${
          isDone
            ? 'text-slate-500 dark:text-slate-400 line-through'
            : 'text-slate-900 dark:text-slate-50'
        }`}
      >
        {task.title}
      </h4>

      {/* Footer: Deadline/Status + Avatar */}
      <div className="flex items-center justify-between text-[9px] sm:text-[10px]">
        {task.deadline ? (
          (() => {
            const now = new Date();
            const deadline = new Date(task.deadline);
            const isOverdue = now > deadline && !isDone;
            const hoursUntilDeadline = (deadline.getTime() - now.getTime()) / (1000 * 60 * 60);
            const isApproaching = hoursUntilDeadline > 0 && hoursUntilDeadline < 24 && !isDone;
            const completedOnTime = isDone && task.completedAt && new Date(task.completedAt) <= deadline;

            return (
              <div className={`flex items-center gap-1 font-medium ${
                isOverdue ? 'text-red-600 dark:text-red-400' :
                isApproaching ? 'text-amber-600 dark:text-amber-400' :
                completedOnTime ? 'text-emerald-600 dark:text-emerald-400' :
                'text-slate-400'
              }`}>
                <span className="material-symbols-outlined text-[12px] sm:text-[14px]">
                  {isOverdue ? 'error' : completedOnTime ? 'check_circle' : 'schedule'}
                </span>
                <span>
                  {isOverdue ? 'Overdue' : 
                   completedOnTime ? 'On time' :
                   format(deadline, 'MMM d, h:mm a')}
                </span>
              </div>
            );
          })()
        ) : isInProgress && !isDone ? (
          <div className="flex items-center gap-1 text-primary font-bold">
            <span className="material-symbols-outlined text-[12px] sm:text-[14px]">schedule</span>
            <span>Active</span>
          </div>
        ) : isDone ? (
          <div className="flex items-center gap-1 text-slate-400">
            <span className="font-medium">
              {task.updatedAt ? `${format(new Date(task.updatedAt), 'MMM d')}` : 'Done'}
            </span>
          </div>
        ) : task.dueDate ? (
          <div className="flex items-center gap-1 text-slate-400">
            <span className="material-symbols-outlined text-[12px] sm:text-[14px]">calendar_today</span>
            <span className="font-medium">
              {format(new Date(task.dueDate), 'MMM d')}
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-1 text-slate-400">
            <span className="material-symbols-outlined text-[12px] sm:text-[14px]">calendar_today</span>
            <span className="font-medium">No date</span>
          </div>
        )}

        {assigneeName && (
          <Avatar className={`h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0 ${isDone ? 'grayscale' : ''}`}>
            {assigneeAvatar && <AvatarImage src={assigneeAvatar} alt={assigneeName} />}
            <AvatarFallback className="text-[8px] sm:text-[9px] bg-primary text-white">
              {getInitials(assigneeName)}
            </AvatarFallback>
          </Avatar>
        )}
      </div>
    </div>
  );
}
