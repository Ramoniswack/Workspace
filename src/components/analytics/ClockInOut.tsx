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
  onStatusChange: () => void;
}

export function ClockInOut({ workspaceId, currentStatus, onStatusChange }: ClockInOutProps) {
  const [loading, setLoading] = useState(false);
  const [clockedIn, setClockedIn] = useState(currentStatus === 'active');

  // Update local state when prop changes
  useEffect(() => {
    setClockedIn(currentStatus === 'active');
  }, [currentStatus]);

  const handleClockToggle = async () => {
    try {
      setLoading(true);
      const newStatus = clockedIn ? 'inactive' : 'active';
      
      await api.patch(`/workspaces/${workspaceId}/members/me/status`, {
        status: newStatus
      });

      setClockedIn(!clockedIn);
      toast.success(clockedIn ? 'Clocked out successfully' : 'Clocked in successfully');
      
      // Refresh analytics data to update clocked in count
      onStatusChange();
    } catch (error: any) {
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
          <div className={`p-4 rounded-full mb-4 ${clockedIn ? 'bg-emerald-100 dark:bg-emerald-900/20' : 'bg-slate-100 dark:bg-slate-800'}`}>
            <Clock className={`w-8 h-8 ${clockedIn ? 'text-emerald-600' : 'text-slate-500'}`} />
          </div>
          
          <p className="text-sm text-muted-foreground mb-6">
            {clockedIn ? 'You are currently clocked in' : 'You are currently clocked out'}
          </p>

          <Button
            onClick={handleClockToggle}
            disabled={loading}
            className={`w-full gap-2 ${clockedIn ? 'bg-red-600 hover:bg-red-700' : 'bg-emerald-600 hover:bg-emerald-700'}`}
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
