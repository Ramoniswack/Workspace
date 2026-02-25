'use client';

import { useSortable, SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Task } from '@/types';
import { TaskCard } from './TaskCard';

interface KanbanColumnProps {
  column: {
    id: string;
    title: string;
    color: string;
    bgColor: string;
  };
  tasks: Task[];
  spaceMembers: any[];
  canDrag: boolean;
  onAddTask?: () => void;
}

export function KanbanColumn({ column, tasks, spaceMembers, canDrag, onAddTask }: KanbanColumnProps) {
  const { setNodeRef } = useSortable({
    id: column.id,
    data: {
      type: 'column',
    },
  });

  const getColumnBadgeStyle = () => {
    if (column.id === 'inprogress') {
      return {
        backgroundColor: '#135bec33',
        color: '#135bec',
      };
    }
    if (column.id === 'done') {
      return {
        backgroundColor: '#10b98133',
        color: '#10b981',
      };
    }
    return {
      backgroundColor: '#e2e8f0',
      color: '#64748b',
    };
  };

  return (
    <div
      ref={setNodeRef}
      className="kanban-column flex flex-col gap-3 sm:gap-4 flex-1 w-full md:min-w-0"
    >
      {/* Column Header */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <h3 className="font-bold text-sm sm:text-base text-slate-700 dark:text-slate-300">{column.title}</h3>
          <span
            className="text-xs px-2 py-0.5 rounded-full font-bold"
            style={getColumnBadgeStyle()}
          >
            {tasks.length}
          </span>
        </div>
        {onAddTask && (
          <button
            onClick={onAddTask}
            className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded transition-colors text-primary flex items-center"
          >
            <span className="material-symbols-outlined text-[18px] sm:text-[20px]">add_circle</span>
          </button>
        )}
      </div>

      {/* Tasks */}
      <SortableContext items={tasks.map((t) => t._id)} strategy={verticalListSortingStrategy}>
        <div className="flex flex-col gap-3 sm:gap-4 min-h-[200px] md:flex-1 overflow-y-auto p-2 rounded-lg bg-slate-50/50 dark:bg-slate-900/20 scrollbar-hide">
          {tasks.map((task) => (
            <TaskCard
              key={task._id}
              task={task}
              spaceMembers={spaceMembers}
              canDrag={canDrag}
              columnId={column.id}
            />
          ))}
          {tasks.length === 0 && (
            <div className="text-center py-6 sm:py-8 text-slate-400 text-xs sm:text-sm">
              Drop tasks here
            </div>
          )}
        </div>
      </SortableContext>
    </div>
  );
}
