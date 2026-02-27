"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Loader2, Zap, X } from "lucide-react";
import { api } from "@/lib/axios";
import { toast } from "sonner";

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

interface PlansModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentPlanName?: string;
  workspaceSubscription?: any;
  whatsappNumber: string;
}

export default function PlansModal({ isOpen, onClose, currentPlanName, workspaceSubscription, whatsappNumber }: PlansModalProps) {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchPlans();
    }
  }, [isOpen]);

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
    onClose();
  };

  const formatLimit = (value: number) => {
    return value === -1 ? 'Unlimited' : value.toString();
  };

  const isCurrentPlan = (planName: string) => {
    // Check workspace subscription first (for workspace context)
    if (workspaceSubscription?.plan?.name) {
      return planName.toLowerCase() === workspaceSubscription.plan.name.toLowerCase();
    }
    // Fallback to user's own subscription
    return planName.toLowerCase() === currentPlanName?.toLowerCase();
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
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] p-0">
        <div className="p-6 border-b">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold">Choose Your Plan</DialogTitle>
            <DialogDescription>
              Select the plan that best fits your needs. You can upgrade or downgrade anytime.
            </DialogDescription>
          </DialogHeader>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
          </div>
        ) : (
          <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {plans.map((plan) => {
                const isCurrent = isCurrentPlan(plan.name);
                const isFree = plan.price === 0;
                const features = getFeaturesList(plan);

                return (
                  <div
                    key={plan._id}
                    className={`relative rounded-xl border-2 p-6 transition-all flex flex-col ${
                      isCurrent
                        ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/10'
                        : 'border-gray-200 dark:border-gray-700 hover:border-purple-300 dark:hover:border-purple-700'
                    }`}
                  >
                    {/* Current Plan Badge */}
                    {isCurrent && (
                      <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-purple-600 text-white">
                        Current Plan
                      </Badge>
                    )}

                    {/* Popular Badge for mid-tier plans */}
                    {!isFree && plan.price < 100 && !isCurrent && (
                      <Badge className="absolute -top-3 right-4 bg-gradient-to-r from-orange-500 to-pink-500 text-white">
                        Popular
                      </Badge>
                    )}

                    {/* Plan Header */}
                    <div className="text-center mb-6">
                      <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                        {plan.name}
                      </h3>
                      <div className="flex items-baseline justify-center gap-1">
                        <span className="text-4xl font-extrabold text-gray-900 dark:text-white">
                          ${plan.price}
                        </span>
                        <span className="text-gray-500 dark:text-gray-400">/month</span>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                        {plan.description}
                      </p>
                    </div>

                    {/* Features List - Flex grow to push button to bottom */}
                    <ul className="space-y-3 mb-6 flex-grow">
                      {features.map((feature, index) => {
                        // Check if this is the Group Chat feature
                        const isGroupChat = feature.includes('Group Chat');
                        const isChatDisabled = !plan.features.hasGroupChat;
                        
                        return (
                          <li key={index} className="flex items-start gap-2">
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

                    {/* Action Button - Stuck to bottom */}
                    <div className="mt-auto">
                      {isCurrent ? (
                        <Button
                          disabled
                          className="w-full bg-gray-300 dark:bg-gray-700 cursor-not-allowed"
                        >
                          Current Plan
                        </Button>
                      ) : isFree ? (
                        <Button
                          disabled
                          variant="outline"
                          className="w-full"
                        >
                          Free Plan
                        </Button>
                      ) : (
                        <Button
                          onClick={() => handleBuyPlan(plan)}
                          className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white"
                        >
                          <Zap className="w-4 h-4 mr-2" />
                          Buy Now
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Footer Note */}
        <div className="p-6 border-t bg-blue-50 dark:bg-blue-900/20">
          <p className="text-sm text-blue-800 dark:text-blue-200">
            <strong>Note:</strong> Clicking "Buy Now" will open WhatsApp to complete your purchase. Our team will assist you with the upgrade process.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
