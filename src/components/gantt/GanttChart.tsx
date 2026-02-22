'use client';

import { useEffect, useState, useRef } from 'react';
import { api } from '@/lib/axios';
import { GanttTask } from './GanttTask';
import { GanttTimeline } from './GanttTimeline';
import { Loader2, AlertCircle } from 'lucide-react';

interface Task {
  id: string;
  title: string;
  startDate: string | null;
  dueDate: string | null;
  duration: number;
  status: string;
  priority: string;
  assignee: any;
  isMilestone: boolean;
  dependencies: Array<{ dependsOn: string; type: string }>;
  progress: number;
}

interface GanttChartProps {
  spaceId: string;
}

export function GanttChart({ spaceId }: GanttChartProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'day' | 'week' | 'month'>('week');
  const [draggedTask, setDraggedTask] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadGanttData();
  }, [spaceId]);

  const loadGanttData = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get(`/gantt/spaces/${spaceId}`);
      const ganttTasks = response.data.data || response.data;
      setTasks(ganttTasks);
    } catch (err: any) {
      console.error('Failed to load Gantt data:', err);
      setError(err.response?.data?.message || 'Failed to load timeline data');
    } finally {
      setLoading(false);
    }
  };

  const handleTaskUpdate = async (
    taskId: string,
    newStartDate: Date,
    newDueDate: Date
  ) => {
    // Optimistic update
    setTasks((prevTasks) =>
      prevTasks.map((task) =>
        task.id === taskId
          ? {
              ...task,
              startDate: newStartDate.toISOString(),
              dueDate: newDueDate.toISOString(),
            }
          : task
      )
    );

    try {
      // Backend call with cascade logic
      const response = await api.post(`/gantt/tasks/${taskId}/update-timeline`, {
        startDate: newStartDate.toISOString(),
        dueDate: newDueDate.toISOString(),
      });

      // Reload to get all cascaded updates
      await loadGanttData();
    } catch (err: any) {
      console.error('Failed to update task timeline:', err);
      // Revert optimistic update on error
      await loadGanttData();
    }
  };

  const handleTaskDrag = (taskId: string, deltaMs: number) => {
    setDraggedTask(taskId);
    
    setTasks((prevTasks) =>
      prevTasks.map((task) => {
        if (task.id === taskId && task.startDate && task.dueDate) {
          return {
            ...task,
            startDate: new Date(new Date(task.startDate).getTime() + deltaMs).toISOString(),
            dueDate: new Date(new Date(task.dueDate).getTime() + deltaMs).toISOString(),
          };
        }
        return task;
      })
    );
  };

  const handleTaskDragEnd = async (taskId: string) => {
    const task = tasks.find((t) => t.id === taskId);
    if (task && task.startDate && task.dueDate) {
      await handleTaskUpdate(
        taskId,
        new Date(task.startDate),
        new Date(task.dueDate)
      );
    }
    setDraggedTask(null);
  };

  const handleTaskResize = async (
    taskId: string,
    newDueDate: Date
  ) => {
    const task = tasks.find((t) => t.id === taskId);
    if (task && task.startDate) {
      await handleTaskUpdate(
        taskId,
        new Date(task.startDate),
        newDueDate
      );
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-8">
        <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Error Loading Timeline</h2>
        <p className="text-gray-600">{error}</p>
      </div>
    );
  }

  const tasksWithDates = tasks.filter((t): t is Task & { startDate: string; dueDate: string } => 
    t.startDate !== null && t.dueDate !== null
  );

  if (tasksWithDates.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-2">No Tasks with Dates</h2>
        <p className="text-gray-600">Add start and due dates to tasks to see them on the timeline</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="border-b border-gray-200 px-6 py-3 bg-gray-50">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-700">View:</span>
          <div className="flex gap-1">
            {(['day', 'week', 'month'] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`px-3 py-1 text-sm rounded ${
                  viewMode === mode
                    ? 'bg-purple-600 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-100'
                }`}
              >
                {mode.charAt(0).toUpperCase() + mode.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Gantt Chart Container */}
      <div ref={containerRef} className="flex-1 overflow-auto">
        <div className="min-w-max">
          <GanttTimeline
            tasks={tasksWithDates}
            viewMode={viewMode}
            onTaskDrag={handleTaskDrag}
            onTaskDragEnd={handleTaskDragEnd}
            onTaskResize={handleTaskResize}
            draggedTask={draggedTask}
          />
        </div>
      </div>
    </div>
  );
}
