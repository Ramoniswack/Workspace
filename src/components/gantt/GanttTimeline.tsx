'use client';

import { useMemo, useState, useRef, useEffect } from 'react';
import { GanttTask } from './GanttTask';

interface Task {
  id: string;
  title: string;
  startDate: string;
  dueDate: string;
  status: string;
  priority: string;
  isMilestone: boolean;
  progress: number;
  dependencies: Array<{ dependsOn: string; type: string }>;
}

interface GanttTimelineProps {
  tasks: Task[];
  viewMode: 'day' | 'week' | 'month';
  onTaskDrag: (taskId: string, deltaMs: number) => void;
  onTaskDragEnd: (taskId: string) => void;
  onTaskResize: (taskId: string, newDueDate: Date) => void;
  draggedTask: string | null;
}

export function GanttTimeline({
  tasks,
  viewMode,
  onTaskDrag,
  onTaskDragEnd,
  onTaskResize,
  draggedTask,
}: GanttTimelineProps) {
  const [hoveredTask, setHoveredTask] = useState<string | null>(null);

  // Calculate date range
  const { startDate, endDate, columns } = useMemo(() => {
    if (tasks.length === 0) {
      const today = new Date();
      return {
        startDate: today,
        endDate: new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000),
        columns: [],
      };
    }

    const dates = tasks.flatMap((t) => [
      new Date(t.startDate),
      new Date(t.dueDate),
    ]);
    const minDate = new Date(Math.min(...dates.map((d) => d.getTime())));
    const maxDate = new Date(Math.max(...dates.map((d) => d.getTime())));

    // Add padding
    const paddingMs = 7 * 24 * 60 * 60 * 1000; // 7 days
    const start = new Date(minDate.getTime() - paddingMs);
    const end = new Date(maxDate.getTime() + paddingMs);

    // Generate columns based on view mode
    const cols = generateColumns(start, end, viewMode);

    return { startDate: start, endDate: end, columns: cols };
  }, [tasks, viewMode]);

  const totalDays = Math.ceil(
    (endDate.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000)
  );

  const columnWidth = viewMode === 'day' ? 40 : viewMode === 'week' ? 80 : 120;
  const rowHeight = 48;
  const taskHeight = 32;
  const leftPanelWidth = 280;

  // Today marker position
  const today = new Date();
  const todayPosition = useMemo(() => {
    if (today < startDate || today > endDate) return null;
    const daysSinceStart =
      (today.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000);
    return (daysSinceStart / totalDays) * (columns.length * columnWidth);
  }, [today, startDate, endDate, totalDays, columns.length, columnWidth]);

  return (
    <div className="flex">
      {/* Left Panel - Task Names */}
      <div
        className="sticky left-0 z-20 bg-white border-r border-gray-200"
        style={{ width: leftPanelWidth }}
      >
        {/* Header */}
        <div className="h-12 border-b border-gray-200 flex items-center px-4 bg-gray-50 font-semibold text-sm text-gray-700">
          Task Name
        </div>

        {/* Task Rows */}
        {tasks.map((task) => (
          <div
            key={task.id}
            className="border-b border-gray-100 flex items-center px-4 hover:bg-gray-50 transition-colors"
            style={{ height: rowHeight }}
            onMouseEnter={() => setHoveredTask(task.id)}
            onMouseLeave={() => setHoveredTask(null)}
          >
            <div className="flex items-center gap-2 flex-1 min-w-0">
              {task.isMilestone && (
                <div className="w-3 h-3 bg-yellow-400 rotate-45 flex-shrink-0" />
              )}
              <span className="text-sm text-gray-900 truncate">{task.title}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Right Panel - Timeline */}
      <div className="flex-1 relative">
        {/* Timeline Header */}
        <div className="h-12 border-b border-gray-200 flex bg-gray-50 sticky top-0 z-10">
          {columns.map((col, idx) => (
            <div
              key={idx}
              className="border-r border-gray-200 flex items-center justify-center text-xs font-medium text-gray-600"
              style={{ width: columnWidth, minWidth: columnWidth }}
            >
              {col.label}
            </div>
          ))}
        </div>

        {/* Timeline Grid */}
        <div className="relative">
          {/* Grid Lines */}
          <div className="absolute inset-0 flex">
            {columns.map((_, idx) => (
              <div
                key={idx}
                className="border-r border-gray-100"
                style={{ width: columnWidth, minWidth: columnWidth }}
              />
            ))}
          </div>

          {/* Today Marker */}
          {todayPosition !== null && (
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-10"
              style={{ left: todayPosition }}
            >
              <div className="absolute -top-2 left-1/2 -translate-x-1/2 text-xs font-semibold text-red-500 whitespace-nowrap">
                Today
              </div>
            </div>
          )}

          {/* Task Bars */}
          {tasks.map((task, idx) => {
            const taskStart = new Date(task.startDate);
            const taskEnd = new Date(task.dueDate);
            const startOffset =
              ((taskStart.getTime() - startDate.getTime()) /
                (24 * 60 * 60 * 1000) /
                totalDays) *
              (columns.length * columnWidth);
            const duration =
              ((taskEnd.getTime() - taskStart.getTime()) /
                (24 * 60 * 60 * 1000) /
                totalDays) *
              (columns.length * columnWidth);

            return (
              <div
                key={task.id}
                className="absolute"
                style={{
                  top: idx * rowHeight + (rowHeight - taskHeight) / 2,
                  height: taskHeight,
                }}
              >
                <GanttTask
                  task={task}
                  left={startOffset}
                  width={Math.max(duration, task.isMilestone ? 16 : 40)}
                  onDrag={(deltaMs) => onTaskDrag(task.id, deltaMs)}
                  onDragEnd={() => onTaskDragEnd(task.id)}
                  onResize={(newDueDate) => onTaskResize(task.id, newDueDate)}
                  isDragging={draggedTask === task.id}
                  isHovered={hoveredTask === task.id}
                  columnWidth={columnWidth}
                  startDate={startDate}
                  totalDays={totalDays}
                  columnsLength={columns.length}
                />
              </div>
            );
          })}

          {/* Row Backgrounds */}
          {tasks.map((task, idx) => (
            <div
              key={`row-${task.id}`}
              className={`border-b border-gray-100 ${
                hoveredTask === task.id ? 'bg-purple-50' : ''
              }`}
              style={{ height: rowHeight }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function generateColumns(
  start: Date,
  end: Date,
  viewMode: 'day' | 'week' | 'month'
): Array<{ label: string; date: Date }> {
  const columns: Array<{ label: string; date: Date }> = [];
  const current = new Date(start);

  while (current <= end) {
    if (viewMode === 'day') {
      columns.push({
        label: `${current.getDate()} ${current.toLocaleDateString('en-US', {
          month: 'short',
        })}`,
        date: new Date(current),
      });
      current.setDate(current.getDate() + 1);
    } else if (viewMode === 'week') {
      const weekStart = new Date(current);
      const weekEnd = new Date(current);
      weekEnd.setDate(weekEnd.getDate() + 6);
      columns.push({
        label: `${weekStart.getDate()} - ${weekEnd.getDate()} ${weekStart.toLocaleDateString(
          'en-US',
          { month: 'short' }
        )}`,
        date: new Date(current),
      });
      current.setDate(current.getDate() + 7);
    } else {
      columns.push({
        label: current.toLocaleDateString('en-US', {
          month: 'short',
          year: 'numeric',
        }),
        date: new Date(current),
      });
      current.setMonth(current.getMonth() + 1);
    }
  }

  return columns;
}
