"use client";

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { api } from '@/lib/axios';
import { usePermissions } from '@/store/useAuthStore';
import { 
  ArrowLeft, 
  Lock, 
  Shield, 
  Eye, 
  Edit, 
  Crown,
  AlertCircle,
  Sparkles
} from 'lucide-react';
import { toast } from 'sonner';

interface Plan {
  features: {
    accessControlTier: 'none' | 'basic' | 'pro' | 'advanced';
    maxAdmins: number;
  };
}

interface Workspace {
  name: string;
  owner: string;
  subscription?: {
    plan: Plan;
  };
}

export default function PermissionsSettings() {
  const router = useRouter();
  const params = useParams();
  const workspaceId = params.id as string;
  const { isOwner } = usePermissions();

  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [loading, setLoading] = useState(true);
  const [accessControlTier, setAccessControlTier] = useState<'none' | 'basic' | 'pro' | 'advanced'>('none');

  useEffect(() => {
    if (!isOwner) {
      toast.error('Only workspace owners can access permissions settings');
      router.push(`/workspace/${workspaceId}`);
      return;
    }

    fetchWorkspace();
  }, [workspaceId, isOwner, router]);

  const fetchWorkspace = async () => {
    try {
      const response = await api.get(`/workspaces/${workspaceId}`);
      setWorkspace(response.data);
      
      // Get access control tier from owner's subscription
      const tier = response.data.subscription?.plan?.features?.accessControlTier || 'none';
      setAccessControlTier(tier);
    } catch (error) {
      console.error('Error fetching workspace:', error);
      toast.error('Failed to load workspace settings');
    } finally {
      setLoading(false);
    }
  };

  const handleUpgrade = (feature: string) => {
    toast.info(`Upgrade to unlock ${feature}`);
    // TODO: Navigate to upgrade page or open upgrade modal
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  const isLocked = accessControlTier === 'none';
  const isProTier = accessControlTier === 'pro';
  const isAdvancedTier = accessControlTier === 'advanced';

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      {/* Header */}
      <header className="border-b border-gray-800 bg-[#111111]">
        <div className="px-6 py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push(`/workspace/${workspaceId}/settings/members`)}
              className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-400" />
            </button>
            <div>
              <h1 className="text-xl font-semibold text-white">Access Control & Permissions</h1>
              <p className="text-sm text-gray-400 mt-1">
                Manage roles and permissions for {workspace?.name}
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="p-6 max-w-5xl mx-auto">
        {/* Current Tier Badge */}
        <div className="mb-6 p-4 bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/20 rounded-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                <Shield className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-white font-semibold">
                  {accessControlTier === 'none' && 'No Access Control'}
                  {accessControlTier === 'basic' && 'Basic Access Control'}
                  {accessControlTier === 'pro' && 'Pro Access Control'}
                  {accessControlTier === 'advanced' && 'Advanced Access Control'}
                </h3>
                <p className="text-sm text-gray-400">
                  {accessControlTier === 'none' && 'Upgrade to unlock access control features'}
                  {accessControlTier === 'basic' && 'Standard permissions with limited list access'}
                  {accessControlTier === 'pro' && 'Enhanced role management with limited list access'}
                  {accessControlTier === 'advanced' && 'Full custom permissions and unrestricted access'}
                </p>
              </div>
            </div>
            {accessControlTier !== 'advanced' && (
              <button
                onClick={() => handleUpgrade('Advanced Access Control')}
                className="px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-lg text-sm font-medium transition-all flex items-center gap-2"
              >
                <Sparkles className="w-4 h-4" />
                Upgrade
              </button>
            )}
          </div>
        </div>

        {/* Permissions Sections */}
        <div className="space-y-6">
          {/* Task Permissions Section */}
          <div className="relative">
            {isLocked && (
              <div className="absolute inset-0 bg-[#111111]/80 backdrop-blur-sm rounded-xl z-10 flex items-center justify-center">
                <div className="text-center p-6">
                  <div className="w-16 h-16 rounded-full bg-purple-500/20 flex items-center justify-center mx-auto mb-4">
                    <Lock className="w-8 h-8 text-purple-400" />
                  </div>
                  <h3 className="text-white font-semibold mb-2">Task Permissions Locked</h3>
                  <p className="text-gray-400 text-sm mb-4">
                    You need <span className="text-purple-400 font-medium">Pro Access Control</span> to unlock this feature
                  </p>
                  <button
                    onClick={() => handleUpgrade('Task Permissions')}
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium transition-colors"
                  >
                    Upgrade to Pro
                  </button>
                </div>
              </div>
            )}
            
            <div className={`bg-[#111111] border border-gray-800 rounded-xl p-6 ${isLocked ? 'opacity-50' : ''}`}>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                  <Edit className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <h3 className="text-white font-semibold">Task Permissions</h3>
                  <p className="text-sm text-gray-400">Control what members can do with tasks</p>
                </div>
              </div>

              <div className="space-y-4">
                {/* View Only Permission */}
                <div className="flex items-center justify-between p-4 bg-[#1a1a1a] border border-gray-700 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Eye className="w-5 h-5 text-gray-400" />
                    <div>
                      <h4 className="text-white font-medium">View Only</h4>
                      <p className="text-sm text-gray-400">Can view tasks but cannot edit</p>
                    </div>
                  </div>
                  <div className="px-3 py-1 bg-green-500/20 text-green-400 text-xs font-medium rounded-full">
                    Available
                  </div>
                </div>

                {/* Edit Permission */}
                <div className="flex items-center justify-between p-4 bg-[#1a1a1a] border border-gray-700 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Edit className="w-5 h-5 text-blue-400" />
                    <div>
                      <h4 className="text-white font-medium">Edit</h4>
                      <p className="text-sm text-gray-400">Can change task status only</p>
                    </div>
                  </div>
                  <div className="px-3 py-1 bg-green-500/20 text-green-400 text-xs font-medium rounded-full">
                    Available
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Full Access & Custom Roles Section */}
          <div className="relative">
            {(isLocked || isProTier) && (
              <div className="absolute inset-0 bg-[#111111]/80 backdrop-blur-sm rounded-xl z-10 flex items-center justify-center">
                <div className="text-center p-6">
                  <div className="w-16 h-16 rounded-full bg-purple-500/20 flex items-center justify-center mx-auto mb-4">
                    <Lock className="w-8 h-8 text-purple-400" />
                  </div>
                  <h3 className="text-white font-semibold mb-2">Advanced Features Locked</h3>
                  <p className="text-gray-400 text-sm mb-4">
                    You need <span className="text-purple-400 font-medium">Advanced Access Control</span> to unlock these features
                  </p>
                  <button
                    onClick={() => handleUpgrade('Advanced Features')}
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium transition-colors"
                  >
                    Upgrade to Advanced
                  </button>
                </div>
              </div>
            )}

            <div className={`bg-[#111111] border border-gray-800 rounded-xl p-6 ${(isLocked || isProTier) ? 'opacity-50' : ''}`}>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                  <Crown className="w-5 h-5 text-purple-400" />
                </div>
                <div>
                  <h3 className="text-white font-semibold">Advanced Permissions</h3>
                  <p className="text-sm text-gray-400">Full access control and custom role creation</p>
                </div>
              </div>

              <div className="space-y-4">
                {/* Full Access Permission */}
                <div className="flex items-center justify-between p-4 bg-[#1a1a1a] border border-gray-700 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Crown className="w-5 h-5 text-purple-400" />
                    <div>
                      <h4 className="text-white font-medium">Full Access</h4>
                      <p className="text-sm text-gray-400">Complete control over all resources</p>
                    </div>
                  </div>
                  <div className="px-3 py-1 bg-purple-500/20 text-purple-400 text-xs font-medium rounded-full">
                    Advanced Only
                  </div>
                </div>

                {/* Custom Role Creation */}
                <div className="flex items-center justify-between p-4 bg-[#1a1a1a] border border-gray-700 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Shield className="w-5 h-5 text-green-400" />
                    <div>
                      <h4 className="text-white font-medium">Custom Role Creation</h4>
                      <p className="text-sm text-gray-400">Create and manage custom roles with specific permissions</p>
                    </div>
                  </div>
                  <div className="px-3 py-1 bg-purple-500/20 text-purple-400 text-xs font-medium rounded-full">
                    Advanced Only
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Info Box */}
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4">
            <div className="flex gap-3">
              <AlertCircle className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="text-blue-400 font-medium mb-1">About Access Control Tiers</h4>
                <ul className="text-sm text-gray-300 space-y-1">
                  <li><span className="font-medium">Basic:</span> Standard workspace roles only</li>
                  <li><span className="font-medium">Pro:</span> Multiple admins + View/Edit task permissions</li>
                  <li><span className="font-medium">Advanced:</span> Full access control + Custom role creation</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
