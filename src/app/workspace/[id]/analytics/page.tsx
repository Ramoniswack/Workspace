'use client';

import { useEffect, useState, useMemo } from 'react';
import { useParams } from 'next/navigation';
import { api } from '@/lib/axios';
import {
    TrendingUp, Users, CheckCircle2, Rocket,
    Download, Calendar, BarChart3
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    CompletionTrendChart,
    TaskStatusChart,
    TeamAvailability,
    ProjectHealth,
    PriorityDistribution,
    TeamPerformanceTable,
    ClockInOut,
    YourTasks,
} from '@/components/analytics';
import { Task } from '@/types';

export default function AnalyticsPage() {
    const params = useParams();
    const workspaceId = params.id as string;

    const [tasks, setTasks] = useState<Task[]>([]);
    const [spaces, setSpaces] = useState<any[]>([]);
    const [members, setMembers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [dateFilter] = useState('30'); // days
    const [userId, setUserId] = useState<string>('');
    const [userStatus, setUserStatus] = useState<'active' | 'inactive'>('inactive');
    const [runningTimer, setRunningTimer] = useState<any>(null);

    useEffect(() => {
        // Get userId from localStorage
        const storedUserId = localStorage.getItem('userId');
        if (storedUserId) {
            setUserId(storedUserId);
        }
        fetchAnalyticsData();
    }, [workspaceId]);

    const fetchAnalyticsData = async () => {
        try {

            // Use the new analytics endpoint for super fast loading
            const response = await api.get(`/workspaces/${workspaceId}/analytics`);
            const { members: membersData, currentRunningTimer } = response.data.data;
            setMembers(membersData);
            setRunningTimer(currentRunningTimer);

            // Get current user's status
            const currentMember = membersData.find((m: any) => {
                const mId = m.user._id || m.user;
                return mId === userId;
            });
            setUserStatus(currentMember?.status || 'inactive');

        } catch (error) {
            console.error('Failed to fetch analytics data:', error);
        } finally {
            setLoading(false);
        }
    };

    // Calculate metrics
    const metrics = useMemo(() => {
        const totalTasks = tasks.length;
        const completedTasks = tasks.filter(t => t.status === 'done').length;
        const completionRate = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;
        const activeProjects = spaces.filter(s => s.status === 'active').length;
        const clockedInMembers = members.filter(m => m.status === 'active').length;

        return {
            totalTeam: members.length,
            clockedIn: clockedInMembers,
            totalTasks,
            completedTasks,
            completionRate: completionRate.toFixed(1),
            activeProjects,
        };
    }, [tasks, spaces, members]);

    // Priority distribution
    const priorityStats = useMemo(() => {
        const high = tasks.filter(t => t.priority === 'high' || t.priority === 'urgent').length;
        const medium = tasks.filter(t => t.priority === 'medium').length;
        const low = tasks.filter(t => t.priority === 'low').length;

        return { high, medium, low };
    }, [tasks]);

    // Task status distribution
    const statusStats = useMemo(() => {
        return {
            todo: tasks.filter(t => t.status === 'todo').length,
            inprogress: tasks.filter(t => t.status === 'inprogress').length,
            review: tasks.filter(t => t.status === 'review').length,
            done: tasks.filter(t => t.status === 'done').length,
        };
    }, [tasks]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <BarChart3 className="w-12 h-12 animate-pulse text-primary mx-auto mb-4" />
                    <p className="text-muted-foreground">Loading analytics...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background">
            <main className="max-w-[1440px] mx-auto px-6 py-8">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
                    <div>
                        <h2 className="text-3xl font-extrabold mb-1">Analytics Overview</h2>
                        <p className="text-muted-foreground">Real-time performance and team productivity metrics.</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <Button variant="outline" className="gap-2">
                            <Calendar className="w-4 h-4" />
                            Last {dateFilter} Days
                        </Button>
                        <Button className="gap-2 bg-primary hover:bg-primary/90">
                            <Download className="w-4 h-4" />
                            Download Report
                        </Button>
                    </div>
                </div>

                {/* Summary Metrics */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    <Card>
                        <CardContent className="pt-6">
                            <div className="flex justify-between items-start mb-4">
                                <span className="text-muted-foreground font-medium text-sm">Total Team</span>
                                <div className="p-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 rounded-lg">
                                    <Users className="w-5 h-5" />
                                </div>
                            </div>
                            <div className="flex items-baseline gap-2">
                                <h3 className="text-2xl font-bold">{metrics.totalTeam}</h3>
                                <Badge className="bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20">
                                    +{metrics.clockedIn} Clocked in
                                </Badge>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="pt-6">
                            <div className="flex justify-between items-start mb-4">
                                <span className="text-muted-foreground font-medium text-sm">Total Tasks</span>
                                <div className="p-2 bg-primary/10 text-primary rounded-lg">
                                    <CheckCircle2 className="w-5 h-5" />
                                </div>
                            </div>
                            <div className="flex items-baseline gap-2">
                                <h3 className="text-2xl font-bold">{metrics.totalTasks}</h3>
                                <span className="text-xs font-semibold text-emerald-500">
                                    {metrics.completedTasks} done
                                </span>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="pt-6">
                            <div className="flex justify-between items-start mb-4">
                                <span className="text-muted-foreground font-medium text-sm">Completion Rate</span>
                                <div className="p-2 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 rounded-lg">
                                    <TrendingUp className="w-5 h-5" />
                                </div>
                            </div>
                            <div className="flex items-baseline gap-2">
                                <h3 className="text-2xl font-bold">{metrics.completionRate}%</h3>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="pt-6">
                            <div className="flex justify-between items-start mb-4">
                                <span className="text-muted-foreground font-medium text-sm">Active Projects</span>
                                <div className="p-2 bg-amber-50 dark:bg-amber-900/20 text-amber-600 rounded-lg">
                                    <Rocket className="w-5 h-5" />
                                </div>
                            </div>
                            <div className="flex items-baseline gap-2">
                                <h3 className="text-2xl font-bold">{metrics.activeProjects}</h3>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Charts Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                    <ClockInOut
                        workspaceId={workspaceId}
                        currentStatus={userStatus}
                        runningTimer={runningTimer}
                        onStatusChange={fetchAnalyticsData}
                    />
                    <div className="lg:col-span-2">
                        <CompletionTrendChart tasks={tasks} />
                    </div>
                </div>

                {/* Your Tasks and Team Availability */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                    <TeamAvailability members={members} />
                    <div className="lg:col-span-2">
                        <YourTasks tasks={tasks} userId={userId} workspaceId={workspaceId} />
                    </div>
                </div>

                {/* Project Health and Distribution */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                    <ProjectHealth spaces={spaces} tasks={tasks} />
                    <TaskStatusChart stats={statusStats} totalTasks={metrics.totalTasks} />
                    <PriorityDistribution stats={priorityStats} />
                </div>

                {/* Team Performance Table */}
                <TeamPerformanceTable
                    members={members}
                    tasks={tasks}
                    searchQuery={searchQuery}
                />
            </main>
        </div>
    );
}
