'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { GanttChart } from '@/components/gantt/GanttChart';
import { api } from '@/lib/axios';
import { Loader2 } from 'lucide-react';

export default function GanttPage() {
  const params = useParams();
  const workspaceId = params.id as string;
  const [loading, setLoading] = useState(true);
  const [spaces, setSpaces] = useState<any[]>([]);
  const [selectedSpaceId, setSelectedSpaceId] = useState<string | null>(null);

  useEffect(() => {
    loadSpaces();
  }, [workspaceId]);

  const loadSpaces = async () => {
    try {
      const response = await api.get(`/workspaces/${workspaceId}/spaces`);
      const spaceList = response.data.data || response.data;
      setSpaces(spaceList);
      
      if (spaceList.length > 0) {
        setSelectedSpaceId(spaceList[0]._id);
      }
    } catch (error) {
      console.error('Failed to load spaces:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
      </div>
    );
  }

  if (spaces.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-2">No Spaces Found</h2>
        <p className="text-gray-600">Create a space to view the Gantt chart</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-gray-900">Timeline View</h1>
          
          {/* Space Selector */}
          <select
            value={selectedSpaceId || ''}
            onChange={(e) => setSelectedSpaceId(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          >
            {spaces.map((space) => (
              <option key={space._id} value={space._id}>
                {space.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Gantt Chart */}
      <div className="flex-1 overflow-hidden">
        {selectedSpaceId && (
          <GanttChart spaceId={selectedSpaceId} />
        )}
      </div>
    </div>
  );
}
