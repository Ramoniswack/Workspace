"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Plus,
  Edit2,
  Trash2,
  Check,
  X,
  Save,
  MessageCircle,
  Briefcase,
  Users,
  Shield,
  MessageSquare,
  FolderTree,
  ListChecks,
  FolderOpen,
  CheckSquare,
  Bell,
  Lock,
} from "lucide-react";

interface Plan {
  _id: string;
  name: string;
  price: number;
  description: string;
  parentPlanId?: string;
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
    accessControlTier: 'basic' | 'pro' | 'advanced';
  };
  isActive: boolean;
}

interface SystemSettings {
  whatsappContactNumber: string;
}

export default function PlanBuilder() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [settings, setSettings] = useState<SystemSettings>({ whatsappContactNumber: "" });
  const [loading, setLoading] = useState(true);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [whatsappNumber, setWhatsappNumber] = useState("");

  useEffect(() => {
    fetchPlans();
    fetchSettings();
  }, []);

  const fetchPlans = async () => {
    try {
      const token = localStorage.getItem("authToken");
      const response = await fetch("http://localhost:5000/api/plans?includeInactive=true", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setPlans(data.data);
      }
    } catch (error) {
      console.error("Error fetching plans:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSettings = async () => {
    try {
      const token = localStorage.getItem("authToken");
      const response = await fetch("http://localhost:5000/api/super-admin/settings", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setSettings(data.data);
        setWhatsappNumber(data.data.whatsappContactNumber);
      }
    } catch (error) {
      console.error("Error fetching settings:", error);
    }
  };

  const updateSettings = async () => {
    try {
      const token = localStorage.getItem("authToken");
      const response = await fetch("http://localhost:5000/api/super-admin/settings", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ whatsappContactNumber: whatsappNumber }),
      });
      if (response.ok) {
        const data = await response.json();
        setSettings(data.data);
        toast.success("WhatsApp number updated successfully!");
        
        // Trigger a custom event to notify other components
        window.dispatchEvent(new CustomEvent('whatsapp-number-updated', { 
          detail: { whatsappContactNumber: whatsappNumber } 
        }));
      } else {
        toast.error("Failed to update WhatsApp number");
      }
    } catch (error) {
      console.error("Error updating settings:", error);
      toast.error("Failed to update WhatsApp number");
    }
  };

  const createPlan = async (planData: Partial<Plan>) => {
    try {
      const token = localStorage.getItem("authToken");
      
      if (!token) {
        toast.error('Authentication token not found. Please login again.');
        return;
      }

      // Clean and prepare data
      const cleanedData = { ...planData };
      
      // Remove parentPlanId if it's empty string or undefined
      if (!cleanedData.parentPlanId || cleanedData.parentPlanId === '') {
        delete cleanedData.parentPlanId;
      }

      console.log('[PlanBuilder] Creating plan with cleaned data:', JSON.stringify(cleanedData, null, 2));

      const response = await fetch("http://localhost:5000/api/plans", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(cleanedData),
      });

      const data = await response.json();
      console.log('[PlanBuilder] Response status:', response.status);
      console.log('[PlanBuilder] Response data:', JSON.stringify(data, null, 2));

      if (response.ok) {
        toast.success('Plan created successfully!');
        await fetchPlans();
        setShowCreateForm(false);
      } else {
        // Extract detailed error message
        let errorMessage = 'Failed to create plan';
        
        if (data.message) {
          errorMessage = data.message;
          
          // If there's a validation error with details, show them
          if (data.message.includes('Validation failed') && data.error) {
            console.error('[PlanBuilder] Validation error details:', data.error);
          }
        }
        
        toast.error(errorMessage);
        console.error('[PlanBuilder] Create plan failed:', {
          status: response.status,
          data: data,
          sentPayload: cleanedData
        });
      }
    } catch (error: any) {
      console.error('[PlanBuilder] Exception during plan creation:', error);
      toast.error(`Error: ${error.message || 'Network error occurred'}`);
    }
  };

  const updatePlan = async (planId: string, planData: Partial<Plan>) => {
    try {
      const token = localStorage.getItem("authToken");
      
      if (!token) {
        toast.error('Authentication token not found. Please login again.');
        return;
      }

      console.log('[PlanBuilder] Updating plan:', planId);
      console.log('[PlanBuilder] Update data:', JSON.stringify(planData, null, 2));

      const response = await fetch(`http://localhost:5000/api/plans/${planId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(planData),
      });

      const data = await response.json();
      console.log('[PlanBuilder] Update response status:', response.status);
      console.log('[PlanBuilder] Update response data:', JSON.stringify(data, null, 2));

      if (response.ok) {
        toast.success('Plan updated successfully!');
        await fetchPlans();
        setEditingPlan(null);
      } else {
        // Extract detailed error message
        let errorMessage = 'Failed to update plan';
        
        if (data.message) {
          errorMessage = data.message;
        }
        
        toast.error(errorMessage);
        console.error('[PlanBuilder] Update plan failed:', {
          status: response.status,
          data: data,
          sentPayload: planData
        });
      }
    } catch (error: any) {
      console.error('[PlanBuilder] Exception during plan update:', error);
      toast.error(`Error: ${error.message || 'Network error occurred'}`);
    }
  };

  const togglePlanStatus = async (planId: string, isActive: boolean) => {
    try {
      const token = localStorage.getItem("authToken");
      const response = await fetch(`http://localhost:5000/api/plans/${planId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ isActive: !isActive }),
      });
      if (response.ok) {
        fetchPlans();
      }
    } catch (error) {
      console.error("Error toggling plan status:", error);
    }
  };

  const deletePlan = async (planId: string, planName: string) => {
    // Prevent deletion of Free plan
    if (planName.toLowerCase() === 'free' || planName.toLowerCase() === 'free plan') {
      toast.error('Cannot delete the Free plan');
      return;
    }

    if (!confirm(`Are you sure you want to delete the "${planName}" plan? This action cannot be undone.`)) {
      return;
    }

    try {
      const token = localStorage.getItem("authToken");
      const response = await fetch(`http://localhost:5000/api/plans/${planId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (response.ok) {
        toast.success('Plan deleted successfully!');
        await fetchPlans();
      } else {
        toast.error(`Failed to delete plan: ${data.message || 'Unknown error'}`);
      }
    } catch (error: any) {
      console.error("Error deleting plan:", error);
      toast.error(`Error: ${error.message || 'Failed to delete plan'}`);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* WhatsApp Settings */}
      <div className="bg-card border rounded-xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center">
            <MessageCircle className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-semibold">Payment Contact</h3>
            <p className="text-sm text-muted-foreground">WhatsApp number for payment inquiries</p>
          </div>
        </div>
        <div className="flex gap-3">
          <input
            type="text"
            value={whatsappNumber}
            onChange={(e) => setWhatsappNumber(e.target.value)}
            placeholder="+1234567890"
            className="flex-1 bg-background border rounded-lg px-4 py-2 focus:outline-none focus:border-primary"
          />
          <button
            onClick={updateSettings}
            className="px-6 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg transition-colors flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            Save
          </button>
        </div>
      </div>

      {/* Plans Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Subscription Plans</h2>
          <p className="text-muted-foreground text-sm mt-1">Manage your pricing tiers</p>
        </div>
        <button
          onClick={() => setShowCreateForm(true)}
          className="px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg transition-colors flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Create Plan
        </button>
      </div>

      {/* Create Form */}
      {showCreateForm && (
        <PlanForm
          plans={plans}
          onSubmit={createPlan}
          onCancel={() => setShowCreateForm(false)}
        />
      )}

      {/* Plans Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {plans.map((plan) => (
          <div
            key={plan._id}
            className={`bg-card border rounded-xl p-6 transition-all ${
              plan.isActive
                ? "hover:border-primary/50"
                : "opacity-60"
            }`}
          >
            {editingPlan?._id === plan._id ? (
              <PlanForm
                plan={editingPlan}
                plans={plans}
                onSubmit={(data) => updatePlan(plan._id, data)}
                onCancel={() => setEditingPlan(null)}
              />
            ) : (
              <>
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-xl font-bold">{plan.name}</h3>
                    <p className="text-3xl font-bold text-primary mt-2">
                      ${plan.price}
                      <span className="text-sm text-muted-foreground">/month</span>
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setEditingPlan(plan)}
                      className="p-2 hover:bg-muted rounded-lg transition-colors"
                      title="Edit plan"
                    >
                      <Edit2 className="w-4 h-4 text-muted-foreground" />
                    </button>
                    {plan.name.toLowerCase() !== 'free' && plan.name.toLowerCase() !== 'free plan' && (
                      <button
                        onClick={() => deletePlan(plan._id, plan.name)}
                        className="p-2 hover:bg-red-500/10 rounded-lg transition-colors"
                        title="Delete plan"
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </button>
                    )}
                    <button
                      onClick={() => togglePlanStatus(plan._id, plan.isActive)}
                      className="p-2 hover:bg-muted rounded-lg transition-colors"
                      title={plan.isActive ? "Deactivate plan" : "Activate plan"}
                    >
                      {plan.isActive ? (
                        <Check className="w-4 h-4 text-green-500" />
                      ) : (
                        <X className="w-4 h-4 text-red-500" />
                      )}
                    </button>
                  </div>
                </div>

                <p className="text-muted-foreground text-sm mb-6">{plan.description}</p>

                <div className="space-y-3">
                  <div className="flex items-center gap-3 text-sm">
                    <Briefcase className="w-4 h-4 text-purple-500" />
                    <span>
                      {plan.features.maxWorkspaces === -1
                        ? "Unlimited"
                        : plan.features.maxWorkspaces}{" "}
                      Workspaces
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <Users className="w-4 h-4 text-blue-500" />
                    <span>
                      {plan.features.maxMembers === -1
                        ? "Unlimited"
                        : plan.features.maxMembers}{" "}
                      Members
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <FolderTree className="w-4 h-4 text-cyan-500" />
                    <span>
                      {plan.features.maxSpaces === -1
                        ? "Unlimited"
                        : plan.features.maxSpaces}{" "}
                      Spaces
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <ListChecks className="w-4 h-4 text-indigo-500" />
                    <span>
                      {plan.features.maxLists === -1
                        ? "Unlimited"
                        : plan.features.maxLists}{" "}
                      Lists
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <FolderOpen className="w-4 h-4 text-yellow-500" />
                    <span>
                      {plan.features.maxFolders === -1
                        ? "Unlimited"
                        : plan.features.maxFolders}{" "}
                      Folders
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <CheckSquare className="w-4 h-4 text-pink-500" />
                    <span>
                      {plan.features.maxTasks === -1
                        ? "Unlimited"
                        : plan.features.maxTasks}{" "}
                      Tasks
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <Shield className="w-4 h-4 text-green-500" />
                    <span>
                      {plan.features.maxAdmins === -1
                        ? "Unlimited"
                        : plan.features.maxAdmins}{" "}
                      Admins
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <Lock className="w-4 h-4 text-green-500" />
                    <span>
                      {plan.features.accessControlTier === 'basic' ? 'Basic' :
                       plan.features.accessControlTier === 'pro' ? 'Pro' : 'Advanced'} Access Control
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <MessageSquare className="w-4 h-4 text-orange-500" />
                    <span>
                      {plan.features.hasGroupChat ? (
                        <>
                          Group Chat ({plan.features.messageLimit === -1
                            ? "Unlimited"
                            : plan.features.messageLimit}{" "}
                          messages/month)
                        </>
                      ) : (
                        'Group Chat: Disabled'
                      )}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <Bell className="w-4 h-4 text-red-500" />
                    <span>
                      {plan.features.announcementCooldown}h Announcement Cooldown
                    </span>
                  </div>
                </div>

                {!plan.isActive && (
                  <div className="mt-4 px-3 py-2 bg-red-500/10 border border-red-500/20 rounded-lg">
                    <p className="text-xs text-red-400 text-center">Inactive</p>
                  </div>
                )}
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// Plan Form Component
function PlanForm({
  plan,
  plans,
  onSubmit,
  onCancel,
}: {
  plan?: Plan;
  plans: Plan[];
  onSubmit: (data: Partial<Plan>) => void;
  onCancel: () => void;
}) {
  const [parentPlanId, setParentPlanId] = useState(plan?.parentPlanId || "");
  const [parentPlan, setParentPlan] = useState<Plan | null>(null);
  
  const [formData, setFormData] = useState({
    name: plan?.name || "",
    price: plan?.price || 0,
    description: plan?.description || "",
    maxWorkspaces: plan?.features.maxWorkspaces ?? 1,
    maxMembers: plan?.features.maxMembers ?? 5,
    maxAdmins: plan?.features.maxAdmins ?? 1,
    maxSpaces: plan?.features.maxSpaces ?? 10,
    maxLists: plan?.features.maxLists ?? 50,
    maxFolders: plan?.features.maxFolders ?? 20,
    maxTasks: plan?.features.maxTasks ?? 100,
    hasAccessControl: plan?.features.hasAccessControl || false,
    hasGroupChat: plan?.features.hasGroupChat || false,
    messageLimit: plan?.features.messageLimit ?? 100,
    announcementCooldown: plan?.features.announcementCooldown ?? 24,
    accessControlTier: plan?.features.accessControlTier || 'basic',
  });

  // Update parent plan when parentPlanId changes
  useEffect(() => {
    if (parentPlanId) {
      const parent = plans.find(p => p._id === parentPlanId);
      setParentPlan(parent || null);
      
      // Inherit features from parent if creating new plan
      if (!plan && parent) {
        setFormData(prev => ({
          ...prev,
          maxWorkspaces: parent.features.maxWorkspaces,
          maxMembers: parent.features.maxMembers,
          maxAdmins: parent.features.maxAdmins,
          maxSpaces: parent.features.maxSpaces,
          maxLists: parent.features.maxLists,
          maxFolders: parent.features.maxFolders,
          maxTasks: parent.features.maxTasks,
          hasAccessControl: parent.features.hasAccessControl,
          hasGroupChat: parent.features.hasGroupChat,
          messageLimit: parent.features.messageLimit,
          announcementCooldown: parent.features.announcementCooldown,
          accessControlTier: parent.features.accessControlTier,
        }));
      }
    } else {
      setParentPlan(null);
    }
  }, [parentPlanId, plans, plan]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate required fields
    if (!formData.name || formData.name.trim().length < 3) {
      toast.error('Plan name must be at least 3 characters');
      return;
    }
    
    if (!formData.description || formData.description.trim().length < 10) {
      toast.error('Description must be at least 10 characters');
      return;
    }
    
    if (formData.price < 0) {
      toast.error('Price must be 0 or greater');
      return;
    }
    
    const payload: any = {
      name: formData.name.trim(),
      price: Number(formData.price),
      description: formData.description.trim(),
      features: {
        maxWorkspaces: Number(formData.maxWorkspaces),
        maxMembers: Number(formData.maxMembers),
        maxAdmins: Number(formData.maxAdmins),
        maxSpaces: Number(formData.maxSpaces),
        maxLists: Number(formData.maxLists),
        maxFolders: Number(formData.maxFolders),
        maxTasks: Number(formData.maxTasks),
        hasAccessControl: Boolean(formData.hasAccessControl),
        hasGroupChat: Boolean(formData.hasGroupChat),
        messageLimit: Number(formData.messageLimit),
        announcementCooldown: Number(formData.announcementCooldown),
        accessControlTier: formData.accessControlTier,
      },
    };
    
    // Only add parentPlanId if it exists and is not empty
    if (parentPlanId && parentPlanId.trim() !== '') {
      payload.parentPlanId = parentPlanId.trim();
    }
    
    console.log('[PlanForm] Submitting payload:', JSON.stringify(payload, null, 2));
    onSubmit(payload);
  };

  // Filter out current plan from parent options (can't inherit from self)
  const availableParentPlans = plans.filter(p => p._id !== plan?._id && p.isActive);

  return (
    <form onSubmit={handleSubmit} className="space-y-6 bg-card p-6 rounded-lg border">
      {/* Plan Inheritance Section */}
      {!plan && (
        <div className="space-y-4">
          <h4 className="text-sm font-semibold text-primary uppercase tracking-wider flex items-center gap-2">
            <div className="w-1 h-4 bg-primary rounded"></div>
            Plan Inheritance (Optional)
          </h4>
          <div>
            <label className="block text-xs text-muted-foreground mb-1.5">Inherit from existing plan</label>
            <select
              value={parentPlanId}
              onChange={(e) => setParentPlanId(e.target.value)}
              className="w-full bg-background border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary"
            >
              <option value="">None - Start from scratch</option>
              {availableParentPlans.map(p => (
                <option key={p._id} value={p._id}>
                  {p.name} (${p.price}/mo)
                </option>
              ))}
            </select>
            {parentPlan && (
              <div className="mt-2 p-3 bg-primary/10 border border-primary/20 rounded-lg">
                <p className="text-xs text-primary">
                  Inheriting features from <span className="font-semibold">{parentPlan.name}</span>. 
                  You can override any feature below.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
      {/* Basic Information Section */}
      <div className="space-y-4">
        <h4 className="text-sm font-semibold text-primary uppercase tracking-wider flex items-center gap-2">
          <div className="w-1 h-4 bg-primary rounded"></div>
          Basic Information
        </h4>
        <div className="space-y-3">
          <div>
            <label className="block text-xs text-muted-foreground mb-1.5">Plan Name</label>
            <input
              type="text"
              placeholder="e.g., Pro, Business, Enterprise"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full bg-background border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary"
              required
            />
          </div>
          <div>
            <label className="block text-xs text-muted-foreground mb-1.5">Monthly Price ($)</label>
            <input
              type="number"
              placeholder="0"
              value={formData.price}
              onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) })}
              className="w-full bg-background border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary"
              required
              min="0"
              step="0.01"
            />
          </div>
          <div>
            <label className="block text-xs text-muted-foreground mb-1.5">Description</label>
            <textarea
              placeholder="Brief description of this plan"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full bg-background border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary"
              rows={2}
              required
            />
          </div>
        </div>
      </div>

      {/* Plan Limits Section */}
      <div className="space-y-4">
        <h4 className="text-sm font-semibold text-blue-500 uppercase tracking-wider flex items-center gap-2">
          <div className="w-1 h-4 bg-blue-500 rounded"></div>
          Resource Limits
        </h4>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-muted-foreground mb-1.5 flex items-center gap-1.5">
              <Briefcase className="w-3 h-3" />
              Max Workspaces
            </label>
            <input
              type="number"
              placeholder="-1 for unlimited"
              value={formData.maxWorkspaces}
              onChange={(e) => setFormData({ ...formData, maxWorkspaces: parseInt(e.target.value) })}
              className="w-full bg-background border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary"
              required
            />
          </div>
          <div>
            <label className="block text-xs text-muted-foreground mb-1.5 flex items-center gap-1.5">
              <Users className="w-3 h-3" />
              Max Members
            </label>
            <input
              type="number"
              placeholder="-1 for unlimited"
              value={formData.maxMembers}
              onChange={(e) => setFormData({ ...formData, maxMembers: parseInt(e.target.value) })}
              className="w-full bg-background border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary"
              required
            />
          </div>
          <div>
            <label className="block text-xs text-muted-foreground mb-1.5 flex items-center gap-1.5">
              <Shield className="w-3 h-3" />
              Max Admins
            </label>
            <input
              type="number"
              placeholder="-1 for unlimited"
              value={formData.maxAdmins}
              onChange={(e) => setFormData({ ...formData, maxAdmins: parseInt(e.target.value) })}
              className="w-full bg-background border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary"
              required
            />
          </div>
          <div>
            <label className="block text-xs text-muted-foreground mb-1.5 flex items-center gap-1.5">
              <FolderTree className="w-3 h-3" />
              Max Spaces
            </label>
            <input
              type="number"
              placeholder="-1 for unlimited"
              value={formData.maxSpaces}
              onChange={(e) => setFormData({ ...formData, maxSpaces: parseInt(e.target.value) })}
              className="w-full bg-background border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary"
              required
            />
          </div>
          <div>
            <label className="block text-xs text-muted-foreground mb-1.5 flex items-center gap-1.5">
              <ListChecks className="w-3 h-3" />
              Max Lists
            </label>
            <input
              type="number"
              placeholder="-1 for unlimited"
              value={formData.maxLists}
              onChange={(e) => setFormData({ ...formData, maxLists: parseInt(e.target.value) })}
              className="w-full bg-background border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary"
              required
            />
          </div>
          <div>
            <label className="block text-xs text-muted-foreground mb-1.5 flex items-center gap-1.5">
              <FolderOpen className="w-3 h-3" />
              Max Folders
            </label>
            <input
              type="number"
              placeholder="-1 for unlimited"
              value={formData.maxFolders}
              onChange={(e) => setFormData({ ...formData, maxFolders: parseInt(e.target.value) })}
              className="w-full bg-background border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary"
              required
            />
          </div>
          <div>
            <label className="block text-xs text-muted-foreground mb-1.5 flex items-center gap-1.5">
              <CheckSquare className="w-3 h-3" />
              Max Tasks
            </label>
            <input
              type="number"
              placeholder="-1 for unlimited"
              value={formData.maxTasks}
              onChange={(e) => setFormData({ ...formData, maxTasks: parseInt(e.target.value) })}
              className="w-full bg-background border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary"
              required
            />
          </div>
        </div>
        <div>
          <label className="block text-xs text-muted-foreground mb-1.5 flex items-center gap-1.5">
            <Bell className="w-3 h-3" />
            Announcement Cooldown (hours)
          </label>
          <input
            type="number"
            placeholder="24"
            value={formData.announcementCooldown}
            onChange={(e) => setFormData({ ...formData, announcementCooldown: parseInt(e.target.value) })}
            className="w-full bg-background border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary"
            required
            min="0"
          />
          <p className="text-xs text-muted-foreground mt-1">Hours between announcements</p>
        </div>
      </div>

      {/* Communication Features Section */}
      <div className="space-y-4">
        <h4 className="text-sm font-semibold text-blue-500 uppercase tracking-wider flex items-center gap-2">
          <div className="w-1 h-4 bg-blue-500 rounded"></div>
          Team Communication
        </h4>
        <div className="flex items-center gap-3 p-3 bg-background border rounded-lg">
          <input
            type="checkbox"
            id="groupChat"
            checked={formData.hasGroupChat}
            onChange={(e) => setFormData({ ...formData, hasGroupChat: e.target.checked })}
            className="w-4 h-4 rounded border text-primary focus:ring-primary"
          />
          <label htmlFor="groupChat" className="flex-1 flex items-center gap-2 text-sm cursor-pointer">
            <MessageSquare className="w-4 h-4 text-blue-500" />
            <div>
              <div className="font-medium">Enable Group Chat</div>
              <div className="text-xs text-muted-foreground">Allow team-wide real-time messaging</div>
            </div>
          </label>
        </div>
        
        {/* Message Limit - Only show when Group Chat is enabled */}
        {formData.hasGroupChat && (
          <div className="ml-4 pl-4 border-l-2 border-blue-500/30">
            <label className="block text-xs text-muted-foreground mb-1.5 flex items-center gap-1.5">
              <MessageSquare className="w-3 h-3" />
              Message Limit (for Group Chat)
            </label>
            <input
              type="number"
              placeholder="-1 for unlimited"
              value={formData.messageLimit}
              onChange={(e) => setFormData({ ...formData, messageLimit: parseInt(e.target.value) })}
              className="w-full bg-background border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary"
              required
            />
            <p className="text-xs text-muted-foreground mt-1">Monthly message limit for group chat (-1 for unlimited)</p>
          </div>
        )}
      </div>

      {/* Access Control Section */}
      <div className="space-y-4">
        <h4 className="text-sm font-semibold text-green-500 uppercase tracking-wider flex items-center gap-2">
          <div className="w-1 h-4 bg-green-500 rounded"></div>
          Access Control
        </h4>
        <div>
          <label className="block text-xs text-muted-foreground mb-1.5 flex items-center gap-1.5">
            <Lock className="w-3 h-3" />
            Access Control Tier
          </label>
          <select
            value={formData.accessControlTier}
            onChange={(e) => setFormData({ ...formData, accessControlTier: e.target.value as 'basic' | 'pro' | 'advanced' })}
            className="w-full bg-background border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary"
          >
            <option value="basic">Basic - List members get "Full Access" only</option>
            <option value="pro">Pro - List members can have "Full Access" or "Can Edit"</option>
            <option value="advanced">Advanced - Full control: "Full Access", "Can Edit", or "View Only"</option>
          </select>
          <p className="text-xs text-muted-foreground mt-1">Controls which permission levels can be assigned to list members. Basic unlocks "Full Access", Pro adds "Can Edit", Advanced adds "View Only".</p>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          className="flex-1 px-4 py-2.5 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2"
        >
          <Save className="w-4 h-4" />
          {plan ? 'Update Plan' : 'Create Plan'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-6 py-2.5 bg-muted hover:bg-muted/80 rounded-lg text-sm font-medium transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

