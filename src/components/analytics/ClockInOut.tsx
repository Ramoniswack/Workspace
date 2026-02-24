'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Clock, LogIn, LogOut } from 'lucide-react';
import { api } from '@/lib/axios';
import { toast } from 'sonner';

interface ClockInOutProps {
  workspaceId: string;
  currentStatus: 'active' | 'inactive';
  runningTimer: any;
  onStatusChange: () => void;
}

export function ClockInOut({ workspaceId, currentStatus, runningTimer, onStatusChange }: ClockInOutProps) {
  const [loading, setLoading] = useState(false);
  const [clockedIn, setClockedIn] = useState(currentStatus === 'active');
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  useEffect(() => {
    setClockedIn(currentStatus === 'active');
    console.log("CURRENT STATUS PROP:", currentStatus);
  }, [currentStatus]);
  const handleClockToggle = async () => {
    if (!workspaceId) {
      toast.error("Workspace ID is missing");
      return;
    }
  //   useEffect(() => {
  //   if (clockedIn && runningTimer?.startTime) {
  //     const startTime = new Date(runningTimer.startTime).getTime();
  //     const now = Date.now();
  //     const initialSeconds = Math.floor((now - startTime) / 1000);
  //     setElapsedSeconds(initialSeconds);

  //     const interval = setInterval(() => {
  //       setElapsedSeconds(prev => prev + 1);
  //     }, 1000);

  //     return () => clearInterval(interval);
  //   } else {
  //     setElapsedSeconds(0);
  //   }
  // }, [clockedIn, runningTimer]);
  // const formatTime = (seconds: number) => {
  //   const hours = Math.floor(seconds / 3600);
  //   const minutes = Math.floor((seconds % 3600) / 60);
  //   const secs = seconds % 60;
  //   return [hours, minutes, secs]
  //     .map(v => v < 10 ? "0" + v : v)
  //     .join(":");
  // };

    try {
      setLoading(true);
      const newStatus = clockedIn ? 'inactive' : 'active';

      // NOTE: Added backticks and ${workspaceId} to fix the // error
      await api.post(`/workspaces/${workspaceId}/clock/toggle`, {
        status: newStatus
      });
      setClockedIn(newStatus === 'active');
      await onStatusChange();

      toast.success(newStatus === 'active' ? 'Clocked in!' : 'Clocked out!');
    } catch (error: any) {
      setClockedIn(currentStatus === 'active');
      console.error('Failed to toggle clock status:', error);
      toast.error(error.response?.data?.message || 'Failed to update status');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <div className="px-6 py-4 border-b">
        <h4 className="font-bold">Time Tracking</h4>
      </div>
      <CardContent className="p-6">
        <div className="flex flex-col items-center justify-center py-8">
          <div className={`p-4 rounded-full mb-4 `}>
            <Clock className={`w-8 h-8 `} />
          </div>

          {/* {clockedIn && (
            <div className="text-3xl font-bold text-emerald-600 mb-2">
              {formatTime(elapsedSeconds)}
            </div>
          )} */}

          <p className="text-sm text-muted-foreground mb-6">
            {clockedIn ? 'You are currently clocked in' : 'You are currently clocked out'}
          </p>

          <Button
            type="button"
            onClick={handleClockToggle}
            disabled={loading}
            className={`w-full gap-2 `}
          >
            {clockedIn ? (
              <>
                <LogOut className="w-4 h-4" />
                Clock Out
              </>
            ) : (
              <>
                <LogIn className="w-4 h-4" />
                Clock In
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
