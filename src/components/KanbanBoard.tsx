'use client';

import { useState, useMemo } from 'react';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  closestCorners,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Task } from '@/types';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import confetti from 'canvas-confetti';
import { Flag } from 'lucide-react';

interface KanbanBoardProps {
  tasks: Task[];
  onStatusChange: (taskId: string, newStatus: Task['status']) => void;
  canChangeStatus: boolean;
  spaceMembers: any[];
}

const COLUMNS = [
  { id: 'todo', title: 'TO DO', color: '#ef4444', bgColor: '#fef2f2' },
  { id: 'inprogress', title: 'IN PROGRESS', color: '#f97316', bgColor: '#fff7ed' },
  { id: 'review', title: 'REVIEW', color: '#3b82f6', bgColor: '#eff6ff' },
  { id: 'done', title: 'DONE', color: '#22c55e', bgColor: '#f0fdf4' },
] as const;

export function KanbanBoard({ tasks, onStatusChange, canChangeStatus, spaceMembers }: KanbanBoardProps) {
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 250,
        tolerance: 5,
      },
    })
  );

  const tasksByStatus = useMemo(() => {
    return {
      todo: tasks.filter((t) => t.status === 'todo'),
      inprogress: tasks.filter((t) => t.status === 'inprogress'),
      review: tasks.filter((t) => t.status === 'review'),
      done: tasks.filter((t) => t.status === 'done'),
    };
  }, [tasks]);

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (!over) {
      setActiveId(null);
      return;
    }

    const taskId = active.id as string;
    const overId = over.id as string;

    // Check if dropped on a column
    const targetColumn = COLUMNS.find((col) => col.id === overId);
    if (targetColumn) {
      const task = tasks.find((t) => t._id === taskId);
      if (task && task.status !== targetColumn.id) {
        onStatusChange(taskId, targetColumn.id as Task['status']);
        
        // Confetti effect when task moved to done
        if (targetColumn.id === 'done') {
          triggerConfetti();
        }
      }
    }

    setActiveId(null);
  };

  const triggerConfetti = () => {
    const duration = 2000;
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };

    const randomInRange = (min: number, max: number) => {
      return Math.random() * (max - min) + min;
    };

    const interval = setInterval(() => {
      const timeLeft = animationEnd - Date.now();

      if (timeLeft <= 0) {
        return clearInterval(interval);
      }

      const particleCount = 50 * (timeLeft / duration);

      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
        colors: ['#22c55e', '#86efac', '#4ade80'],
      });
      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
        colors: ['#22c55e', '#86efac', '#4ade80'],
      });
    }, 250);
  };

  const activeTask = activeId ? tasks.find((t) => t._id === activeId) : null;

  return (
    <DndContext
      sensors={canChangeStatus ? sensors : []}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 p-6 bg-[#f6f6f8] dark:bg-gray-950 min-h-[calc(100vh-200px)]">
        {COLUMNS.map((column) => (
          <KanbanColumn
            key={column.id}
            column={column}
            tasks={tasksByStatus[column.id as keyof typeof tasksByStatus]}
            spaceMembers={spaceMembers}
            canDrag={canChangeStatus}
          />
        ))}
      </div>

      <DragOverlay>
        {activeTask ? (
          <TaskCard
            task={activeTask}
            spaceMembers={spaceMembers}
            isDragging
            isOverlay
          />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

interface KanbanColumnProps {
  column: typeof COLUMNS[number];
  tasks: Task[];
  spaceMembers: any[];
  canDrag: boolean;
}

function KanbanColumn({ column, tasks, spaceMembers, canDrag }: KanbanColumnProps) {
  const { setNodeRef } = useSortable({
    id: column.id,
    data: {
      type: 'column',
    },
  });

  return (
    <div
      ref={setNodeRef}
      className="flex flex-col bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden"
    >
      {/* Column Header */}
      <div
        className="px-4 py-3 border-b-4 flex items-center justify-between"
        style={{ borderBottomColor: column.color }}
      >
        <h3 className="font-semibold text-sm text-gray-700 dark:text-gray-300">
          {column.title}
        </h3>
        <div
          className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium"
          style={{ backgroundColor: column.bgColor, color: column.color }}
        >
          {tasks.length}
        </div>
      </div>

      {/* Tasks */}
      <SortableContext items={tasks.map((t) => t._id)} strategy={verticalListSortingStrategy}>
        <div className="flex-1 p-3 space-y-3 overflow-y-auto min-h-[200px]">
          {tasks.map((task) => (
            <TaskCard
              key={task._id}
              task={task}
              spaceMembers={spaceMembers}
              canDrag={canDrag}
            />
          ))}
          {tasks.length === 0 && (
            <div className="text-center py-8 text-gray-400 text-sm">
              No tasks
            </div>
          )}
        </div>
      </SortableContext>
    </div>
  );
}

interface TaskCardProps {
  task: Task;
  spaceMembers: any[];
  isDragging?: boolean;
  isOverlay?: boolean;
  canDrag?: boolean;
}

function TaskCard({ task, spaceMembers, isDragging, isOverlay, canDrag = true }: TaskCardProps) {
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
    opacity: isSortableDragging ? 0.5 : 1,
  };

  const priorityConfig = {
    high: { color: '#ef4444', label: 'HIGH', bg: '#fef2f2' },
    medium: { color: '#f97316', label: 'MED', bg: '#fff7ed' },
    low: { color: '#22c55e', label: 'LOW', bg: '#f0fdf4' },
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

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <Card
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`
        relative bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 
        rounded-lg overflow-hidden cursor-grab active:cursor-grabbing
        transition-all duration-200
        ${isDragging || isOverlay ? 'shadow-2xl rotate-3 scale-105' : 'shadow-sm hover:shadow-md'}
        ${!canDrag ? 'cursor-not-allowed opacity-60' : ''}
      `}
    >
      {/* Priority Accent Bar */}
      <div
        className="absolute left-0 top-0 bottom-0 w-1"
        style={{ backgroundColor: priority.color }}
      />

      <div className="p-3 pl-4">
        {/* Task Title */}
        <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-3 line-clamp-2">
          {task.title}
        </h4>

        {/* Bottom Row: Priority Badge + Assignee */}
        <div className="flex items-center justify-between">
          <Badge
            className="text-xs font-medium px-2 py-0.5"
            style={{
              backgroundColor: priority.bg,
              color: priority.color,
              border: 'none',
            }}
          >
            {priority.label}
          </Badge>

          {assigneeName && (
            <Avatar className="w-6 h-6 border-2 border-white dark:border-gray-800">
              <AvatarFallback
                className="text-xs font-medium"
                style={{ backgroundColor: priority.color, color: 'white' }}
              >
                {getInitials(assigneeName)}
              </AvatarFallback>
            </Avatar>
          )}
        </div>
      </div>
    </Card>
  );
}
