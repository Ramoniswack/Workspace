'use client';

import { useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Circle, Clock, AlertCircle } from 'lucide-react';
import { Task } from '@/types';
import Link from 'next/link';

interface YourTasksProps {
  tasks: Task[];
  userId: string;
  workspaceId: string;
}

export function YourTasks({ tasks, userId, workspaceId }: YourTasksProps) {
  const myTasks = useMemo(() => {
    return tasks.filter(task => {
      const assigneeId = typeof task.assignee === 'string' ? task.assignee : task.assignee?._id;
      return assigneeId === userId;
    });
  }, [tasks, userId]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'done':
        return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
      case 'inprogress':
        return <Clock className="w-4 h-4 text-blue-500" />;
      case 'review':
        return <AlertCircle className="w-4 h-4 text-amber-500" />;
      default:
        return <Circle className="w-4 h-4 text-slate-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'done':
        return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400';
      case 'inprogress':
        return 'bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400';
      case 'review':
        return 'bg-amber-100 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400';
      default:
        return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
      case 'high':
        return 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400';
      case 'medium':
        return 'bg-amber-100 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400';
      case 'low':
        return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400';
      default:
        return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400';
    }
  };

  return (
    <Card>
      <div className="px-6 py-4 border-b">
        <h4 className="font-bold">Your Tasks</h4>
        <p className="text-xs text-muted-foreground mt-1">{myTasks.length} tasks assigned to you</p>
      </div>
      <CardContent className="p-6">
        {myTasks.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p className="text-sm">No tasks assigned to you</p>
          </div>
        ) : (
          <div className="space-y-3 max-h-[400px] overflow-y-auto">
            {myTasks.map((task) => (
              <Link
                key={task._id}
                href={`/workspace/${workspaceId}/spaces/${task.space}/lists/${task.list}`}
                className="block p-3 rounded-lg border hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                <div className="flex items-start gap-3">
                  <div className="mt-0.5">
                    {getStatusIcon(task.status)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{task.name}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge className={`text-xs ${getStatusColor(task.status)}`}>
                        {task.status}
                      </Badge>
                      {task.priority && (
                        <Badge className={`text-xs ${getPriorityColor(task.priority)}`}>
                          {task.priority}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
