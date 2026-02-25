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
import { Task } from '@/types';
import confetti from 'canvas-confetti';
import { KanbanColumn } from './kanban/KanbanColumn';
import { TaskCard } from './kanban/TaskCard';

interface KanbanBoardProps {
  tasks: Task[];
  onStatusChange: (taskId: string, newStatus: Task['status']) => void;
  canChangeStatus: boolean;
  spaceMembers: any[];
}

const COLUMNS = [
  { id: 'todo', title: 'To Do', color: '#64748b', bgColor: '#f1f5f9' },
  { id: 'inprogress', title: 'In Progress', color: '#135bec', bgColor: '#135bec1A' },
  { id: 'review', title: 'In Review', color: '#8b5cf6', bgColor: '#f3e8ff' },
  { id: 'done', title: 'Done', color: '#10b981', bgColor: '#d1fae5' },
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
    
    // Always clear active state first
    setActiveId(null);
    
    if (!over || !canChangeStatus) {
      console.log('[KanbanBoard] Drag cancelled - no drop target or no permission');
      return;
    }

    const taskId = active.id as string;
    const overId = over.id as string;

    console.log('[KanbanBoard] Drag ended:', { taskId, overId });

    // Find the task being dragged
    const task = tasks.find((t) => t._id === taskId);
    if (!task) {
      console.log('[KanbanBoard] Task not found:', taskId);
      return;
    }

    // Check if dropped on a column
    const targetColumn = COLUMNS.find((col) => col.id === overId);
    if (targetColumn) {
      console.log('[KanbanBoard] Dropped on column:', targetColumn.id, 'Current status:', task.status);
      
      if (task.status !== targetColumn.id) {
        console.log('[KanbanBoard] Status change detected, calling onStatusChange');
        // Update task status
        onStatusChange(taskId, targetColumn.id as Task['status']);
        
        // Confetti effect when task moved to done
        if (targetColumn.id === 'done') {
          setTimeout(() => {
            triggerConfetti();
          }, 100);
        }
      } else {
        console.log('[KanbanBoard] Task already in this column, no change needed');
      }
    } else {
      console.log('[KanbanBoard] Not dropped on a column, checking if dropped on another task');
      // If dropped on another task, find which column that task is in
      const targetTask = tasks.find((t) => t._id === overId);
      if (targetTask && targetTask.status !== task.status) {
        console.log('[KanbanBoard] Dropped on task in different column, moving to:', targetTask.status);
        onStatusChange(taskId, targetTask.status);
        
        if (targetTask.status === 'done') {
          setTimeout(() => {
            triggerConfetti();
          }, 100);
        }
      }
    }
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
      {/* Kanban Board Container - Vertical on mobile, horizontal on desktop */}
      <div className="flex flex-col md:flex-row gap-3 sm:gap-4 md:gap-4 p-3 sm:p-4 md:p-6 h-auto md:h-[calc(100vh-280px)] overflow-visible md:overflow-hidden">
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
