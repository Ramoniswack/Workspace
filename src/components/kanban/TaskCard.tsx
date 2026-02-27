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
          w-full rounded border border-border bg-card p-3 mb-2
          ${canDrag ? 'cursor-grab active:cursor-grabbing' : 'cursor-not-allowed opacity-60'}
        `}
      >
        <p className="text-sm text-foreground">{task.title}</p>
      </motion.div>
    </>
  );
}
