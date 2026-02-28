'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Check, Loader2, Zap, LogOut, Moon, Sun, Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { api } from '@/lib/axios';
import { toast } from 'sonner';
import { useSystemSettings } from '@/hooks/useSystemSettings';
import { useSubscription } from '@/hooks/useSubscription';
import { useThemeStore } from '@/store/useThemeStore';
import { clearAuthData, getCurrentUser } from '@/lib/auth';

interface Plan {
  _id: string;
  name: string;
  price: number;
  description: string;
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
  isActive: boolean;
}

export default function PricingPage() {
  const router = useRouter();
  const { whatsappNumber } = useSystemSettings();
  const { subscription } = useSubscription();
  const { themeMode, setThemeMode } = useThemeStore();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState('');
  const [unreadNotifications, setUnreadNotifications] = useState(0);

  useEffect(() => {
    const user = getCurrentUser();
    if (user?.name) {
      setUserName(user.name);
    }
    fetchPlans();
    fetchNotificationCount();
  }, []);

  const fetchNotificationCount = async () => {
    try {
      const response = await api.get('/notifications/unread-count');
      setUnreadNotifications(response.data.count || 0);
    } catch (error) {
      console.error('Failed to fetch notification count:', error);
    }
  };

  const handleBackToDashboard = () => {
    router.push('/dashboard');
  };

  const handleLogout = () => {
    clearAuthData();
    router.push('/login');
  };

  const fetchPlans = async () => {
    try {
      setLoading(true);
      const response = await api.get('/plans');
      // Sort plans by price
      const sortedPlans = response.data.data.sort((a: Plan, b: Plan) => a.price - b.price);
      setPlans(sortedPlans);
    } catch (error) {
      console.error('Failed to fetch plans:', error);
      toast.error('Failed to load plans');
    } finally {
      setLoading(false);
    }
  };

  const handleBuyPlan = (plan: Plan) => {
    const message = `Hi, I would like to upgrade to the ${plan.name} plan ($${plan.price}/month). Please help me with the upgrade process.`;
    const whatsappUrl = `https://wa.me/${whatsappNumber.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

  const formatLimit = (value: number) => {
    return value === -1 ? 'Unlimited' : value.toString();
  };

  const isCurrentPlan = (planName: string) => {
    return planName.toLowerCase() === subscription?.plan?.name?.toLowerCase();
  };

  const getFeaturesList = (plan: Plan) => {
    const features = [];
    
    // Combine spaces, folders, lists, tasks in one line
    const limits = [];
    limits.push(`${formatLimit(plan.features.maxSpaces)} Space${plan.features.maxSpaces !== 1 ? 's' : ''}`);
    limits.push(`${formatLimit(plan.features.maxFolders)} Folder${plan.features.maxFolders !== 1 ? 's' : ''}`);
    limits.push(`${formatLimit(plan.features.maxLists)} List${plan.features.maxLists !== 1 ? 's' : ''}`);
    limits.push(`${formatLimit(plan.features.maxTasks)} Task${plan.features.maxTasks !== 1 ? 's' : ''}`);
    features.push(limits.join(', '));
    
    features.push(`${formatLimit(plan.features.maxWorkspaces)} Workspace${plan.features.maxWorkspaces !== 1 ? 's' : ''}`);
    features.push(`${formatLimit(plan.features.maxMembers)} Member${plan.features.maxMembers !== 1 ? 's' : ''}`);
    features.push(`${formatLimit(plan.features.maxAdmins)} Admin${plan.features.maxAdmins !== 1 ? 's' : ''}`);
    
    if (plan.features.hasAccessControl) {
      features.push(`${plan.features.accessControlTier.charAt(0).toUpperCase() + plan.features.accessControlTier.slice(1)} Access Control`);
    }
    
    if (plan.features.hasGroupChat) {
      const messageLimit = plan.features.messageLimit === -1 ? 'Unlimited' : plan.features.messageLimit;
      features.push(`Group Chat (${messageLimit} messages/month)`);
    }
    
    if (plan.features.announcementCooldown === 0) {
      features.push('No Announcement Cooldown');
    } else {
      features.push(`${plan.features.announcementCooldown}h Announcement Cooldown`);
    }
    
    return features;
  };

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Dashboard-style Header */}
      <header className="bg-background border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">TaskFlow</h1>
              <p className="text-sm text-muted-foreground">Welcome back, {userName}</p>
            </div>
            <div className="flex items-center gap-3">
              {/* Dashboard Link */}
              <Link
                href="/dashboard"
                className="text-sm font-medium hover:text-primary transition-colors"
              >
                Dashboard
              </Link>

              {/* Notification Bell */}
              <button
                onClick={() => router.push('/notifications')}
                className="relative p-2 rounded-lg hover:bg-muted transition-colors"
                title="Notifications"
              >
                <Bell className="w-5 h-5" />
                {unreadNotifications > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                    {unreadNotifications > 9 ? '9+' : unreadNotifications}
                  </span>
                )}
              </button>

              {/* Theme Toggle */}
              <button
                onClick={() => setThemeMode(themeMode === 'dark' ? 'light' : 'dark')}
                className="p-2 rounded-lg hover:bg-muted transition-colors"
                title={themeMode === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              >
                {themeMode === 'dark' ? (
                  <Sun className="w-5 h-5" />
                ) : (
                  <Moon className="w-5 h-5" />
                )}
              </button>

              {/* Logout Button */}
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 transition-colors"
                title="Logout"
              >
                <LogOut className="w-4 h-4" />
                <span className="text-sm font-medium hidden sm:inline">Logout</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
          </div>
        ) : (
          <>
            {/* Pricing Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
              {plans.map((plan) => {
                const isCurrent = isCurrentPlan(plan.name);
                const isFree = plan.price === 0;
                const features = getFeaturesList(plan);

                return (
                  <div
                    key={plan._id}
                    className={`relative rounded-2xl border-2 p-8 transition-all flex flex-col bg-white dark:bg-gray-800 ${
                      isCurrent
                        ? 'border-purple-500 shadow-xl shadow-purple-500/20'
                        : 'border-gray-200 dark:border-gray-700 hover:border-purple-300 dark:hover:border-purple-700 hover:shadow-lg'
                    }`}
                  >
                    {/* Current Plan Badge */}
                    {isCurrent && (
                      <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-purple-600 text-white">
                        Current Plan
                      </Badge>
                    )}

                    {/* Popular Badge */}
                    {!isFree && plan.price < 100 && !isCurrent && (
                      <Badge className="absolute -top-3 right-4 bg-gradient-to-r from-orange-500 to-pink-500 text-white">
                        Popular
                      </Badge>
                    )}

                    {/* Plan Header */}
                    <div className="text-center mb-8">
                      <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                        {plan.name}
                      </h3>
                      <div className="flex items-baseline justify-center gap-1 mb-3">
                        <span className="text-5xl font-extrabold text-gray-900 dark:text-white">
                          ${plan.price}
                        </span>
                        <span className="text-gray-500 dark:text-gray-400">/month</span>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {plan.description}
                      </p>
                    </div>

                    {/* Features List */}
                    <ul className="space-y-4 mb-8 flex-grow">
                      {features.map((feature, index) => {
                        // Check if this is the Group Chat feature
                        const isGroupChat = feature.includes('Group Chat');
                        const isChatDisabled = !plan.features.hasGroupChat;
                        
                        return (
                          <li key={index} className="flex items-start gap-3">
                            {isChatDisabled && isGroupChat ? (
                              <X className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                            ) : (
                              <Check className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                            )}
                            <span className={`text-sm ${isChatDisabled && isGroupChat ? 'text-gray-500 dark:text-gray-500 line-through' : 'text-gray-700 dark:text-gray-300'}`}>
                              {isChatDisabled && isGroupChat ? 'Group Chat (Disabled)' : feature}
                            </span>
                          </li>
                        );
                      })}
                    </ul>

                    {/* Action Button */}
                    <div className="mt-auto">
                      {isCurrent ? (
                        <Button
                          disabled
                          className="w-full bg-gray-300 dark:bg-gray-700 cursor-not-allowed"
                          size="lg"
                        >
                          Current Plan
                        </Button>
                      ) : isFree ? (
                        <Button
                          disabled
                          variant="outline"
                          className="w-full"
                          size="lg"
                        >
                          Free Plan
                        </Button>
                      ) : (
                        <Button
                          onClick={() => handleBuyPlan(plan)}
                          className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white"
                          size="lg"
                        >
                          <Zap className="w-5 h-5 mr-2" />
                          Get Started
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* FAQ or Additional Info */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-8">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                Need Help Choosing?
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Contact us via WhatsApp and we'll help you find the perfect plan for your team's needs.
              </p>
              <Button
                onClick={() => {
                  const message = 'Hi, I need help choosing the right plan for my team.';
                  const whatsappUrl = `https://wa.me/${whatsappNumber.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(message)}`;
                  window.open(whatsappUrl, '_blank');
                }}
                variant="outline"
                className="border-purple-600 text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/20"
              >
                Contact Sales
              </Button>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
