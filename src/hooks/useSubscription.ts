import { useState, useEffect } from 'react';
import { api } from '@/lib/axios';

interface SubscriptionInfo {
  isPaid: boolean;
  status: 'free' | 'active' | 'expired';
  daysRemaining: number;
  subscriptionExpired: boolean;
  expiresAt: string | null;
  plan: {
    _id: string;
    name: string;
    price: number;
    features: {
      maxWorkspaces: number;
      maxMembers: number;
      maxAdmins: number;
      maxSpaces: number;
      maxLists: number;
      maxFolders: number;
      maxTasks: number;
      hasAccessControl: boolean;
      hasGroupChat: boolean;
      messageLimit: number;
      announcementCooldown: number;
      accessControlTier: string;
    };
  } | null;
  usage: {
    workspaces: number;
    spaces: number;
    lists: number;
    folders: number;
    tasks: number;
  };
}

export function useSubscription() {
  const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSubscription = async () => {
    try {
      setLoading(true);
      const response = await api.get('/subscription/info');
      setSubscription(response.data.data);
      setError(null);
    } catch (err: any) {
      console.error('Failed to fetch subscription:', err);
      setError(err.response?.data?.message || 'Failed to load subscription info');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubscription();
  }, []);

  const canCreateWorkspace = () => {
    if (!subscription || !subscription.plan) return true; // Free plan
    const maxWorkspaces = subscription.plan.features.maxWorkspaces;
    return maxWorkspaces === -1 || subscription.usage.workspaces < maxWorkspaces;
  };

  const canInviteMember = (currentMemberCount: number) => {
    if (!subscription || !subscription.plan) {
      return currentMemberCount < 5; // Free plan default
    }
    const maxMembers = subscription.plan.features.maxMembers;
    return maxMembers === -1 || currentMemberCount < maxMembers;
  };

  const hasAccessControl = () => {
    if (!subscription || !subscription.plan) return false;
    return subscription.plan.features.hasAccessControl;
  };

  return {
    subscription,
    loading,
    error,
    refetch: fetchSubscription,
    canCreateWorkspace,
    canInviteMember,
    hasAccessControl
  };
}
