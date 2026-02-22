'use client';

import { useState, useRef, useEffect } from 'react';

interface Task {
  id: string;
  title: string;
  status: string;
  priority: string;
  isMilestone: boolean;
  progress: number;
}

interface GanttTaskProps {
  task: Task;
  left: number;
  width: number;
  onDrag: (deltaMs: number) => void;
  onDragEnd: () => void;
  onResize: (newDueDate: Date) => void;
  isDragging: boolean;
  isHovered: boolean;
  columnWidth: number;
  startDate: Date;
  totalDays: number;
  columnsLength: number;
}

export function GanttTask({
  task,
  left,
  width,
  onDrag,
  onDragEnd,
  onResize,
  isDragging,
  isHovered,
  columnWidth,
  startDate,
  totalDays,
  columnsLength,
}: GanttTaskProps) {
  const [isResizing, setIsResizing] = useState(false);
  const dragStartX = useRef<number>(0);
  const initialLeft = useRef<number>(0);
  const initialWidth = useRef<number>(0);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'done':
        return 'bg-green-500';
      case 'in-progress':
        return 'bg-blue-500';
      case 'todo':
        return 'bg-gray-400';
      default:
        return 'bg-gray-400';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'border-red-500';
      case 'high':
        return 'border-orange-500';
      case 'normal':
        return 'border-blue-500';
      case 'low':
        return 'border-gray-400';
      default:
        return 'border-gray-300';
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (task.isMilestone) return; // Milestones can't be dragged
    
    e.stopPropagation();
    dragStartX.current = e.clientX;
    initialLeft.current = left;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - dragStartX.current;
      const msPerPixel =
        (totalDays * 24 * 60 * 60 * 1000) / (columnsLength * columnWidth);
      const deltaMs = deltaX * msPerPixel;
      onDrag(deltaMs);
    };

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      onDragEnd();
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const handleResizeMouseDown = (e: React.MouseEvent) => {
    if (task.isMilestone) return; // Milestones can't be resized
    
    e.stopPropagation();
    setIsResizing(true);
    dragStartX.current = e.clientX;
    initialWidth.current = width;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - dragStartX.current;
      const msPerPixel =
        (totalDays * 24 * 60 * 60 * 1000) / (columnsLength * columnWidth);
      const deltaMs = deltaX * msPerPixel;
      
      // Calculate new due date
      const currentDueDate = new Date(
        startDate.getTime() +
          ((left + initialWidth.current) / (columnsLength * columnWidth)) *
            totalDays *
            24 *
            60 *
            60 *
            1000
      );
      const newDueDate = new Date(currentDueDate.getTime() + deltaMs);
      
      onResize(newDueDate);
    };

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      setIsResizing(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  if (task.isMilestone) {
    // Render milestone as diamond
    return (
      <div
        className="absolute flex items-center justify-center"
        style={{ left, width: 24 }}
        title={task.title}
      >
        <div
          className={`w-4 h-4 rotate-45 ${getStatusColor(
            task.status
          )} shadow-md border-2 border-white`}
        />
      </div>
    );
  }

  return (
    <div
      className={`absolute group cursor-move transition-shadow ${
        isDragging ? 'opacity-70' : ''
      } ${isHovered ? 'z-20' : 'z-10'}`}
      style={{ left, width }}
      onMouseDown={handleMouseDown}
    >
      {/* Task Bar */}
      <div
        className={`h-full rounded-lg shadow-sm border-2 ${getPriorityColor(
          task.priority
        )} ${getStatusColor(
          task.status
        )} hover:shadow-md transition-all relative overflow-hidden`}
      >
        {/* Progress Bar */}
        <div
          className="absolute inset-0 bg-white/30"
          style={{ width: `${100 - task.progress}%`, right: 0 }}
        />

        {/* Task Title */}
        <div className="absolute inset-0 flex items-center px-2">
          <span className="text-xs font-medium text-white truncate">
            {task.title}
          </span>
        </div>

        {/* Resize Handle */}
        <div
          className="absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize hover:bg-white/30 opacity-0 group-hover:opacity-100 transition-opacity"
          onMouseDown={handleResizeMouseDown}
        />
      </div>

      {/* Tooltip on Hover */}
      {isHovered && !isDragging && !isResizing && (
        <div className="absolute top-full left-0 mt-2 bg-gray-900 text-white text-xs rounded px-2 py-1 whitespace-nowrap z-30 shadow-lg">
          <div className="font-semibold">{task.title}</div>
          <div className="text-gray-300">
            Status: {task.status} | Progress: {task.progress}%
          </div>
        </div>
      )}
    </div>
  );
}
