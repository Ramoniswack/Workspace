'use client';

import { useEffect, useState, useMemo, memo } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { api } from '@/lib/axios';
import { Loader2, ArrowLeft, TrendingUp, Clock, CheckCircle2, AlertCircle } from 'lucide-react';
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { format, subDays } from 'date-fns';

interface AnalyticsData {
  totalTasks: number;
  completedTasks: number;
  completionRate: number;
  priorityDistribution: Array<{ label: string; value: number }>;
  statusDistribution: Array<{ label: string; value: number }>;
  velocity: Array<{ date: string; count: number }>;
  leadTime: {
    averageLeadTime: number;
    unit: string;
    taskCount: number;
  };
}

interface TeamWorkload {
  userId: string;
  userName: string;
  userEmail: string;
  openTasks: number;
  inProgressTasks: number;
  totalAssignedTasks: number;
}

// Match Kanban board colors
const STATUS_COLORS: Record<string, string> = {
  'To Do': '#94a3b8', // slate-400
  'In Progress': '#3b82f6', // blue-500
  'Done': '#22c55e', // green-500
};

const PRIORITY_COLORS: Record<string, string> = {
  'Low': '#10b981', // green-500
  'Medium': '#f59e0b', // amber-500
  'High': '#ef4444', // red-500
  'Urgent': '#dc2626', // red-600
};

export default function DashboardPage() {
  const router = useRouter();
  const params = useParams();
  const workspaceId = params.id as string;

  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [teamWorkload, setTeamWorkload] = useState<TeamWorkload[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<'7' | '30'>('7');

  useEffect(() => {
    const token = localStorage.getItem('authToken');
    if (!token) {
      router.push('/login');
      return;
    }

    fetchAnalytics();
  }, [workspaceId, dateRange, router]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      setError(null);

      const [analyticsRes, workloadRes] = await Promise.all([
        api.get(`/analytics/workspaces/${workspaceId}/summary`),
        api.get(`/analytics/workspaces/${workspaceId}/workload`),
      ]);

      setAnalytics(analyticsRes.data.data);
      setTeamWorkload(workloadRes.data.data);
    } catch (error: any) {
      console.error('Failed to fetch analytics:', error);
      setError(error.response?.data?.message || 'Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  // Prepare chart data with useMemo - MUST be before any conditional returns
  const statusChartData = useMemo(() => {
    if (!analytics) return [];
    return analytics.statusDistribution.map((item) => ({
      name: item.label,
      value: item.value,
      color: STATUS_COLORS[item.label] || '#94a3b8',
    }));
  }, [analytics]);

  const priorityChartData = useMemo(() => {
    if (!analytics) return [];
    return analytics.priorityDistribution.map((item) => ({
      name: item.label,
      value: item.value,
      color: PRIORITY_COLORS[item.label] || '#94a3b8',
    }));
  }, [analytics]);

  const velocityChartData = useMemo(() => {
    if (!analytics) return [];
    return analytics.velocity.slice(-parseInt(dateRange)).map((item) => ({
      date: format(new Date(item.date), 'MMM dd'),
      completed: item.count,
    }));
  }, [analytics, dateRange]);

  const workloadChartData = useMemo(() => {
    return teamWorkload.slice(0, 10).map((item) => ({
      name: item.userName.split(' ')[0], // First name only
      open: item.openTasks,
      inProgress: item.inProgressTasks,
    }));
  }, [teamWorkload]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Loading analytics...</p>
        </div>
      </div>
    );
  }

  if (error || !analytics) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="max-w-md w-full bg-card rounded-xl shadow-lg p-8 text-center border border-border">
          <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-destructive" />
          </div>
          <h2 className="text-xl font-bold text-card-foreground mb-2">Failed to Load Analytics</h2>
          <p className="text-muted-foreground mb-6">{error || 'Unknown error'}</p>
          <div className="flex gap-3">
            <button
              onClick={() => router.push(`/workspace/${workspaceId}`)}
              className="flex-1 px-4 py-2 border border-border text-muted-foreground rounded-lg hover:bg-accent transition-colors"
            >
              Back to Workspace
            </button>
            <button
              onClick={fetchAnalytics}
              className="flex-1 bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90 transition-all"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Empty state
  if (analytics.totalTasks === 0) {
    return (
      <div className="min-h-screen bg-background">
        <header className="bg-card border-b border-border">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push(`/workspace/${workspaceId}`)}
                className="p-2 hover:bg-accent rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-muted-foreground" />
              </button>
              <h1 className="text-2xl font-bold text-foreground">Analytics Dashboard</h1>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center py-16 bg-card rounded-xl border-2 border-dashed border-border">
            <div className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <TrendingUp className="w-12 h-12 text-primary" />
            </div>
            <h3 className="text-2xl font-bold text-foreground mb-3">Start Tracking to See Your Progress!</h3>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              Create tasks and track your team's progress to unlock powerful analytics and insights.
            </p>
            <button
              onClick={() => router.push(`/workspace/${workspaceId}`)}
              className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded-lg hover:bg-primary/90 transition-all shadow-lg hover:shadow-xl"
            >
              Go to Workspace
            </button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push(`/workspace/${workspaceId}`)}
                className="p-2 hover:bg-accent rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-muted-foreground" />
              </button>
              <h1 className="text-2xl font-bold text-foreground">Analytics Dashboard</h1>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setDateRange('7')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  dateRange === '7'
                    ? 'bg-purple-600 text-white'
                    : 'bg-card text-muted-foreground border border-border hover:bg-accent'
                }`}
              >
                Last 7 Days
              </button>
              <button
                onClick={() => setDateRange('30')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  dateRange === '30'
                    ? 'bg-purple-600 text-white'
                    : 'bg-card text-muted-foreground border border-border hover:bg-accent'
                }`}
              >
                Last 30 Days
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Metric Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-card rounded-xl p-6 shadow-sm border border-border">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-muted-foreground">Total Tasks</p>
              <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 text-primary" />
              </div>
            </div>
            <p className="text-3xl font-bold text-foreground">{analytics.totalTasks}</p>
          </div>

          <div className="bg-card rounded-xl p-6 shadow-sm border border-border">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-muted-foreground">Completed</p>
              <div className="w-10 h-10 bg-green-500/10 rounded-lg flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 text-green-500" />
              </div>
            </div>
            <p className="text-3xl font-bold text-foreground">{analytics.completedTasks}</p>
          </div>

          <div className="bg-card rounded-xl p-6 shadow-sm border border-border">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-muted-foreground">Completion Rate</p>
              <div className="w-10 h-10 bg-blue-500/10 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-blue-500" />
              </div>
            </div>
            <p className="text-3xl font-bold text-foreground">{analytics.completionRate}%</p>
          </div>

          <div className="bg-card rounded-xl p-6 shadow-sm border border-border">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-muted-foreground">Avg Lead Time</p>
              <div className="w-10 h-10 bg-amber-500/10 rounded-lg flex items-center justify-center">
                <Clock className="w-5 h-5 text-amber-500" />
              </div>
            </div>
            <p className="text-3xl font-bold text-foreground">
              {analytics.leadTime.averageLeadTime}
              <span className="text-lg font-normal text-muted-foreground ml-1">{analytics.leadTime.unit}</span>
            </p>
          </div>
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Status Distribution */}
          <div className="bg-card rounded-xl p-6 shadow-sm border border-border">
            <h3 className="text-lg font-semibold text-foreground mb-4">Task Status Distribution</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={statusChartData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${((percent || 0) * 100).toFixed(0)}%`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {statusChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Priority Distribution */}
          <div className="bg-card rounded-xl p-6 shadow-sm border border-border">
            <h3 className="text-lg font-semibold text-foreground mb-4">Priority Breakdown</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={priorityChartData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${((percent || 0) * 100).toFixed(0)}%`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {priorityChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Velocity Chart */}
        <div className="bg-card rounded-xl p-6 shadow-sm border border-border mb-8">
          <h3 className="text-lg font-semibold text-foreground mb-4">Completion Trend</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={velocityChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" />
              <YAxis stroke="hsl(var(--muted-foreground))" />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  color: 'hsl(var(--foreground))',
                }}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="completed"
                stroke="#8b5cf6"
                strokeWidth={2}
                dot={{ fill: '#8b5cf6', r: 4 }}
                activeDot={{ r: 6 }}
                name="Tasks Completed"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Team Workload */}
        {teamWorkload.length > 0 && (
          <div className="bg-card rounded-xl p-6 shadow-sm border border-border">
            <h3 className="text-lg font-semibold text-foreground mb-4">Team Workload</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={workloadChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" />
                <YAxis stroke="hsl(var(--muted-foreground))" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    color: 'hsl(var(--foreground))',
                  }}
                />
                <Legend />
                <Bar dataKey="open" fill="#94a3b8" name="Open Tasks" />
                <Bar dataKey="inProgress" fill="#3b82f6" name="In Progress" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </main>
    </div>
  );
}
