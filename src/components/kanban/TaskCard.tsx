'use client';

import { motion } from 'framer-motion';
import { Task } from '@/types';
import { DropIndicator } from './DropIndicator';

interface TaskCardProps {
  task: Task;
  handleDragStart: (e: React.DragEvent, task: Task) => void;
  canDrag: boolean;
  spaceMembers: any[];
}

// Status color mapping
const getStatusColor = (status: Task['status']) => {
  switch (status) {
    case 'todo':
      return 'bg-blue-500'; // Blue for To Do
    case 'inprogress':
      return 'bg-orange-500'; // Orange for In Progress
    case 'review':
      return 'bg-purple-500'; // Purple for In Review
    case 'done':
      return 'bg-green-500'; // Green for Done
    default:
      return 'bg-slate-500';
  }
};

export function TaskCard({ task, handleDragStart, canDrag, spaceMembers }: TaskCardProps) {
  return (
    <>
      <DropIndicator beforeId={task._id} column={task.status} />
      <motion.div
        layout
        layoutId={task._id}
        draggable={canDrag}
        onDragStart={(e) => handleDragStart(e as any, task)}
        className={`
          w-full rounded border border-border bg-card p-3 mb-2 relative
          ${canDrag ? 'cursor-grab active:cursor-grabbing' : 'cursor-not-allowed opacity-60'}
        `}
      >
        {/* Status Color Indicator - Left Border */}
        <div className={`absolute left-0 top-0 bottom-0 w-1 rounded-l ${getStatusColor(task.status)}`} />
        
        <p className="text-sm text-foreground pl-2">{task.title}</p>
      </motion.div>
    </>
  );
}
