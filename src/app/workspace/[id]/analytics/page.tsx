'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
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
    Announcements,
    StickyNotes,
    WorkspaceActivity,
    PerformanceMetrics,
} from '@/components/analytics';
import { Task } from '@/types';

export default function AnalyticsPage() {
    const params = useParams();
    const workspaceId = params.id as string;

    const [tasks, setTasks] = useState<Task[]>([]);
    const [spaces, setSpaces] = useState<any[]>([]);
    const [members, setMembers] = useState<any[]>([]);
    const [workspace, setWorkspace] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [userId, setUserId] = useState<string>('');
    const [userStatus, setUserStatus] = useState<'active' | 'inactive'>('inactive');
    const [runningTimer, setRunningTimer] = useState<any>(null);
    const [isAdmin, setIsAdmin] = useState(false);
    const [dateFilter] = useState('30'); 

    // Define fetch function with useCallback so it can be passed to children safely
    const fetchAnalyticsData = useCallback(async () => {
        try {
            // We only show the full-page loader on the very first load
            // Subsequent refreshes (from ClockInOut) happen in the background
            
            const localUserId = localStorage.getItem('userId') || '';
            if (localUserId) setUserId(localUserId);

            // Fetch core analytics and workspace data
            // Added a timestamp to the URL to prevent browser caching of the status
            const [analyticsRes, spacesRes, workspaceRes] = await Promise.all([
                api.get(`/workspaces/${workspaceId}/analytics?t=${Date.now()}`),
                api.get(`/workspaces/${workspaceId}/spaces`),
                api.get(`/workspaces/${workspaceId}`),
            ]);

            const { members: membersData, currentRunningTimer } = analyticsRes.data.data;
            const spacesData = spacesRes.data.data || [];
            const workspaceData = workspaceRes.data.data;

            // FIX 1: Removed the spread operator (...) because setMembers expects an array, not individual objects
            setMembers(membersData);
            setRunningTimer(currentRunningTimer);
            setSpaces(spacesData);
            setWorkspace(workspaceData);

            // FIX 2: Correctly determine current user's status and admin role
            if (localUserId) {
                // Determine Status
                const currentMember = membersData.find((m: any) => {
                    const mId = typeof m.user === 'string' ? m.user : m.user?._id;
                    return mId === localUserId;
                });
                setUserStatus(currentMember?.status || 'inactive');

                // Determine Admin Privileges
                if (workspaceData) {
                    const isOwner = workspaceData.owner?._id === localUserId || workspaceData.owner === localUserId;
                    const memberRecord = workspaceData.members?.find((m: any) => {
                        const mId = typeof m.user === 'string' ? m.user : m.user?._id;
                        return mId === localUserId;
                    });
                    const isMemberAdmin = memberRecord && (memberRecord.role === 'admin' || memberRecord.role === 'owner');
                    setIsAdmin(isOwner || !!isMemberAdmin);
                }
            }

            // Fetch Tasks logic
            const allTasks: Task[] = [];
            for (const space of spacesData) {
                try {
                    const listsRes = await api.get(`/spaces/${space._id}/lists`);
                    const lists = listsRes.data.data || [];
                    for (const list of lists) {
                        const tasksRes = await api.get(`/lists/${list._id}/tasks`);
                        allTasks.push(...(tasksRes.data.data || []));
                    }
                } catch (err) {
                    console.error(`Error fetching tasks for space ${space._id}`, err);
                }
            }
            setTasks(allTasks);

        } catch (error) {
            console.error('Failed to fetch analytics data:', error);
        } finally {
            setLoading(false);
        }
    }, [workspaceId]);

    useEffect(() => {
        fetchAnalyticsData();
    }, [fetchAnalyticsData]);

    // Metrics calculation logic remains same but uses fixed 'members' state
    const metrics = useMemo(() => {
        const totalTasks = tasks.length;
        const completedTasks = tasks.filter(t => t.status === 'done').length;
        const clockedInMembers = members.filter(m => m.status === 'active').length;

        return {
            totalTeam: members.length,
            clockedIn: clockedInMembers,
            totalTasks,
            completedTasks,
            completionRate: totalTasks > 0 ? ((completedTasks / totalTasks) * 100).toFixed(1) : "0",
            activeProjects: spaces.filter(s => s.status === 'active').length,
        };
    }, [tasks, spaces, members]);

    const statusStats = useMemo(() => ({
        todo: tasks.filter(t => t.status === 'todo').length,
        inprogress: tasks.filter(t => t.status === 'inprogress').length,
        review: tasks.filter(t => t.status === 'review').length,
        done: tasks.filter(t => t.status === 'done').length,
    }), [tasks]);

    const priorityStats = useMemo(() => ({
        high: tasks.filter(t => t.priority === 'high' || t.priority === 'urgent').length,
        medium: tasks.filter(t => t.priority === 'medium').length,
        low: tasks.filter(t => t.priority === 'low').length,
    }), [tasks]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <BarChart3 className="w-12 h-12 animate-pulse text-primary mr-2" />
                <p className="text-muted-foreground">Loading dashboard...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background">
            <main className="max-w-[1440px] mx-auto px-6 py-8">
                {/* Header Actions */}
                <div className="flex justify-end gap-3 mb-8">
                    {isAdmin && (
                        <Button 
                            variant="outline" 
                            className="gap-2"
                            onClick={() => window.location.href = `/workspace/${workspaceId}/time-tracking`}
                        >
                            <BarChart3 className="w-4 h-4" />
                            Time Tracking
                        </Button>
                    )}
                    <Button variant="outline" className="gap-2">
                        <Calendar className="w-4 h-4" />
                        Last {dateFilter} Days
                    </Button>
                </div>

                {/* Metrics Row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    <MetricCard title="Total Team" value={metrics.totalTeam} icon={<Users className="w-5 h-5"/>} color="blue" badge={`+${metrics.clockedIn} Clocked in`} />
                    <MetricCard title="Total Tasks" value={metrics.totalTasks} icon={<CheckCircle2 className="w-5 h-5"/>} color="primary" subtext={`${metrics.completedTasks} done`} />
                    <MetricCard title="Completion Rate" value={`${metrics.completionRate}%`} icon={<TrendingUp className="w-5 h-5"/>} color="emerald" />
                    <MetricCard title="Active Projects" value={metrics.activeProjects} icon={<Rocket className="w-5 h-5"/>} color="amber" />
                </div>

                {/* Clock In & Charts */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                    <ClockInOut
                        workspaceId={workspaceId}
                        currentStatus={userStatus}
                        runningTimer={runningTimer}
                        onStatusChange={fetchAnalyticsData}
                    />
                    <TaskStatusChart stats={statusStats} totalTasks={metrics.totalTasks} />
                    <PriorityDistribution stats={priorityStats} />
                </div>

                {/* Team & Tasks */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                    <TeamAvailability members={members} />
                    <div className="lg:col-span-2">
                        <YourTasks tasks={tasks} userId={userId} workspaceId={workspaceId} />
                    </div>
                </div>

                {/* Health & Trends */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                    <ProjectHealth spaces={spaces} tasks={tasks} />
                    <div className="lg:col-span-2">
                        <CompletionTrendChart tasks={tasks} />
                    </div>
                </div>

                {/* Utilities */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                    <Announcements workspaceId={workspaceId} isAdmin={isAdmin} />
                    <StickyNotes workspaceId={workspaceId} userId={userId} />
                </div>

                {/* Workspace Activity Timeline */}
                <div className="mb-8">
                    <WorkspaceActivity workspaceId={workspaceId} userId={userId} />
                </div>

                {/* Performance Metrics */}
                <div className="mb-8">
                    <PerformanceMetrics workspaceId={workspaceId} userId={userId} />
                </div>
            </main>
        </div>
    );
}

// Helper component for cleaner code
function MetricCard({ title, value, icon, color, badge, subtext }: any) {
    const colors: any = {
        blue: "bg-blue-50 text-blue-600",
        primary: "bg-primary/10 text-primary",
        emerald: "bg-emerald-50 text-emerald-600",
        amber: "bg-amber-50 text-amber-600"
    };
    return (
        <Card>
            <CardContent className="pt-6">
                <div className="flex justify-between items-start mb-4">
                    <span className="text-muted-foreground font-medium text-sm">{title}</span>
                    <div className={`p-2 rounded-lg ${colors[color]}`}>{icon}</div>
                </div>
                <div className="flex items-baseline gap-2">
                    <h3 className="text-2xl font-bold">{value}</h3>
                    {badge && <Badge className="bg-emerald-50 text-emerald-600">{badge}</Badge>}
                    {subtext && <span className="text-xs font-semibold text-emerald-500">{subtext}</span>}
                </div>
            </CardContent>
        </Card>
    );
}