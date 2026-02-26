"use client";

import { useEffect, useState } from "react";
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
    accessControlTier: 'none' | 'pro' | 'advanced';
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
        alert("WhatsApp number updated successfully!");
      }
    } catch (error) {
      console.error("Error updating settings:", error);
    }
  };

  const createPlan = async (planData: Partial<Plan>) => {
    try {
      console.log('[PlanBuilder] Creating plan with data:', planData);
      const token = localStorage.getItem("authToken");
      
      if (!token) {
        alert('Authentication token not found. Please login again.');
        return;
      }

      const response = await fetch("http://localhost:5000/api/plans", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(planData),
      });

      const data = await response.json();
      console.log('[PlanBuilder] Create plan response:', data);

      if (response.ok) {
        alert('Plan created successfully!');
        await fetchPlans();
        setShowCreateForm(false);
      } else {
        alert(`Failed to create plan: ${data.message || 'Unknown error'}`);
        console.error('[PlanBuilder] Create plan error:', data);
      }
    } catch (error) {
      console.error("Error creating plan:", error);
      alert('Failed to create plan. Check console for details.');
    }
  };

  const updatePlan = async (planId: string, planData: Partial<Plan>) => {
    try {
      console.log('[PlanBuilder] Updating plan:', planId, 'with data:', planData);
      const token = localStorage.getItem("authToken");
      
      if (!token) {
        alert('Authentication token not found. Please login again.');
        return;
      }

      const response = await fetch(`http://localhost:5000/api/plans/${planId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(planData),
      });

      const data = await response.json();
      console.log('[PlanBuilder] Update plan response:', data);

      if (response.ok) {
        alert('Plan updated successfully!');
        await fetchPlans();
        setEditingPlan(null);
      } else {
        alert(`Failed to update plan: ${data.message || 'Unknown error'}`);
        console.error('[PlanBuilder] Update plan error:', data);
      }
    } catch (error) {
      console.error("Error updating plan:", error);
      alert('Failed to update plan. Check console for details.');
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
      <div className="bg-[#111111] border border-gray-800 rounded-xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center">
            <MessageCircle className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-white font-semibold">Payment Contact</h3>
            <p className="text-sm text-gray-400">WhatsApp number for payment inquiries</p>
          </div>
        </div>
        <div className="flex gap-3">
          <input
            type="text"
            value={whatsappNumber}
            onChange={(e) => setWhatsappNumber(e.target.value)}
            placeholder="+1234567890"
            className="flex-1 bg-[#1a1a1a] border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-500"
          />
          <button
            onClick={updateSettings}
            className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            Save
          </button>
        </div>
      </div>

      {/* Plans Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Subscription Plans</h2>
          <p className="text-gray-400 text-sm mt-1">Manage your pricing tiers</p>
        </div>
        <button
          onClick={() => setShowCreateForm(true)}
          className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors flex items-center gap-2"
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
            className={`bg-[#111111] border rounded-xl p-6 transition-all ${
              plan.isActive
                ? "border-gray-800 hover:border-purple-500/50"
                : "border-gray-800 opacity-60"
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
                    <h3 className="text-xl font-bold text-white">{plan.name}</h3>
                    <p className="text-3xl font-bold text-purple-500 mt-2">
                      ${plan.price}
                      <span className="text-sm text-gray-400">/month</span>
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setEditingPlan(plan)}
                      className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
                    >
                      <Edit2 className="w-4 h-4 text-gray-400" />
                    </button>
                    <button
                      onClick={() => togglePlanStatus(plan._id, plan.isActive)}
                      className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
                    >
                      {plan.isActive ? (
                        <Check className="w-4 h-4 text-green-500" />
                      ) : (
                        <X className="w-4 h-4 text-red-500" />
                      )}
                    </button>
                  </div>
                </div>

                <p className="text-gray-400 text-sm mb-6">{plan.description}</p>

                <div className="space-y-3">
                  <div className="flex items-center gap-3 text-sm">
                    <Briefcase className="w-4 h-4 text-purple-500" />
                    <span className="text-gray-300">
                      {plan.features.maxWorkspaces === -1
                        ? "Unlimited"
                        : plan.features.maxWorkspaces}{" "}
                      Workspaces
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <Users className="w-4 h-4 text-blue-500" />
                    <span className="text-gray-300">
                      {plan.features.maxMembers === -1
                        ? "Unlimited"
                        : plan.features.maxMembers}{" "}
                      Members
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <FolderTree className="w-4 h-4 text-cyan-500" />
                    <span className="text-gray-300">
                      {plan.features.maxSpaces === -1
                        ? "Unlimited"
                        : plan.features.maxSpaces}{" "}
                      Spaces
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <ListChecks className="w-4 h-4 text-indigo-500" />
                    <span className="text-gray-300">
                      {plan.features.maxLists === -1
                        ? "Unlimited"
                        : plan.features.maxLists}{" "}
                      Lists
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <FolderOpen className="w-4 h-4 text-yellow-500" />
                    <span className="text-gray-300">
                      {plan.features.maxFolders === -1
                        ? "Unlimited"
                        : plan.features.maxFolders}{" "}
                      Folders
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <CheckSquare className="w-4 h-4 text-pink-500" />
                    <span className="text-gray-300">
                      {plan.features.maxTasks === -1
                        ? "Unlimited"
                        : plan.features.maxTasks}{" "}
                      Tasks
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <Lock className="w-4 h-4 text-green-500" />
                    <span className="text-gray-300">
                      {plan.features.accessControlTier === 'none' ? 'Basic' : 
                       plan.features.accessControlTier === 'pro' ? 'Pro' : 'Advanced'} Access Control
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <MessageSquare className="w-4 h-4 text-orange-500" />
                    <span className="text-gray-300">
                      {plan.features.messageLimit === -1
                        ? "Unlimited"
                        : plan.features.messageLimit}{" "}
                      Messages
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <Bell className="w-4 h-4 text-red-500" />
                    <span className="text-gray-300">
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
    accessControlTier: plan?.features.accessControlTier || 'none',
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
    onSubmit({
      name: formData.name,
      price: formData.price,
      description: formData.description,
      parentPlanId: parentPlanId || undefined,
      features: {
        maxWorkspaces: formData.maxWorkspaces,
        maxMembers: formData.maxMembers,
        maxAdmins: formData.maxAdmins,
        maxSpaces: formData.maxSpaces,
        maxLists: formData.maxLists,
        maxFolders: formData.maxFolders,
        maxTasks: formData.maxTasks,
        hasAccessControl: formData.hasAccessControl,
        hasGroupChat: formData.hasGroupChat,
        messageLimit: formData.messageLimit,
        announcementCooldown: formData.announcementCooldown,
        accessControlTier: formData.accessControlTier,
      },
    });
  };

  // Filter out current plan from parent options (can't inherit from self)
  const availableParentPlans = plans.filter(p => p._id !== plan?._id && p.isActive);

  return (
    <form onSubmit={handleSubmit} className="space-y-6 bg-[#1a1a1a] p-6 rounded-lg border border-gray-800">
      {/* Plan Inheritance Section */}
      {!plan && (
        <div className="space-y-4">
          <h4 className="text-sm font-semibold text-purple-400 uppercase tracking-wider flex items-center gap-2">
            <div className="w-1 h-4 bg-purple-500 rounded"></div>
            Plan Inheritance (Optional)
          </h4>
          <div>
            <label className="block text-xs text-gray-400 mb-1.5">Inherit from existing plan</label>
            <select
              value={parentPlanId}
              onChange={(e) => setParentPlanId(e.target.value)}
              className="w-full bg-[#111111] border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500"
            >
              <option value="">None - Start from scratch</option>
              {availableParentPlans.map(p => (
                <option key={p._id} value={p._id}>
                  {p.name} (${p.price}/mo)
                </option>
              ))}
            </select>
            {parentPlan && (
              <div className="mt-2 p-3 bg-purple-500/10 border border-purple-500/20 rounded-lg">
                <p className="text-xs text-purple-300">
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
        <h4 className="text-sm font-semibold text-purple-400 uppercase tracking-wider flex items-center gap-2">
          <div className="w-1 h-4 bg-purple-500 rounded"></div>
          Basic Information
        </h4>
        <div className="space-y-3">
          <div>
            <label className="block text-xs text-gray-400 mb-1.5">Plan Name</label>
            <input
              type="text"
              placeholder="e.g., Pro, Business, Enterprise"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full bg-[#111111] border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500"
              required
            />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1.5">Monthly Price ($)</label>
            <input
              type="number"
              placeholder="0"
              value={formData.price}
              onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) })}
              className="w-full bg-[#111111] border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500"
              required
              min="0"
              step="0.01"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1.5">Description</label>
            <textarea
              placeholder="Brief description of this plan"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full bg-[#111111] border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500"
              rows={2}
              required
            />
          </div>
        </div>
      </div>

      {/* Plan Limits Section */}
      <div className="space-y-4">
        <h4 className="text-sm font-semibold text-blue-400 uppercase tracking-wider flex items-center gap-2">
          <div className="w-1 h-4 bg-blue-500 rounded"></div>
          Resource Limits
        </h4>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-gray-400 mb-1.5 flex items-center gap-1.5">
              <Briefcase className="w-3 h-3" />
              Max Workspaces
            </label>
            <input
              type="number"
              placeholder="-1 for unlimited"
              value={formData.maxWorkspaces}
              onChange={(e) => setFormData({ ...formData, maxWorkspaces: parseInt(e.target.value) })}
              className="w-full bg-[#111111] border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500"
              required
            />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1.5 flex items-center gap-1.5">
              <Users className="w-3 h-3" />
              Max Members
            </label>
            <input
              type="number"
              placeholder="-1 for unlimited"
              value={formData.maxMembers}
              onChange={(e) => setFormData({ ...formData, maxMembers: parseInt(e.target.value) })}
              className="w-full bg-[#111111] border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500"
              required
            />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1.5 flex items-center gap-1.5">
              <Shield className="w-3 h-3" />
              Max Admins
            </label>
            <input
              type="number"
              placeholder="-1 for unlimited"
              value={formData.maxAdmins}
              onChange={(e) => setFormData({ ...formData, maxAdmins: parseInt(e.target.value) })}
              className="w-full bg-[#111111] border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500"
              required
            />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1.5 flex items-center gap-1.5">
              <FolderTree className="w-3 h-3" />
              Max Spaces
            </label>
            <input
              type="number"
              placeholder="-1 for unlimited"
              value={formData.maxSpaces}
              onChange={(e) => setFormData({ ...formData, maxSpaces: parseInt(e.target.value) })}
              className="w-full bg-[#111111] border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500"
              required
            />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1.5 flex items-center gap-1.5">
              <ListChecks className="w-3 h-3" />
              Max Lists
            </label>
            <input
              type="number"
              placeholder="-1 for unlimited"
              value={formData.maxLists}
              onChange={(e) => setFormData({ ...formData, maxLists: parseInt(e.target.value) })}
              className="w-full bg-[#111111] border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500"
              required
            />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1.5 flex items-center gap-1.5">
              <FolderOpen className="w-3 h-3" />
              Max Folders
            </label>
            <input
              type="number"
              placeholder="-1 for unlimited"
              value={formData.maxFolders}
              onChange={(e) => setFormData({ ...formData, maxFolders: parseInt(e.target.value) })}
              className="w-full bg-[#111111] border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500"
              required
            />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1.5 flex items-center gap-1.5">
              <CheckSquare className="w-3 h-3" />
              Max Tasks
            </label>
            <input
              type="number"
              placeholder="-1 for unlimited"
              value={formData.maxTasks}
              onChange={(e) => setFormData({ ...formData, maxTasks: parseInt(e.target.value) })}
              className="w-full bg-[#111111] border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500"
              required
            />
          </div>
        </div>
        <div>
          <label className="block text-xs text-gray-400 mb-1.5 flex items-center gap-1.5">
            <Bell className="w-3 h-3" />
            Announcement Cooldown (hours)
          </label>
          <input
            type="number"
            placeholder="24"
            value={formData.announcementCooldown}
            onChange={(e) => setFormData({ ...formData, announcementCooldown: parseInt(e.target.value) })}
            className="w-full bg-[#111111] border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500"
            required
            min="0"
          />
          <p className="text-xs text-gray-500 mt-1">Hours between announcements</p>
        </div>
      </div>

      {/* Communication Features Section */}
      <div className="space-y-4">
        <h4 className="text-sm font-semibold text-blue-400 uppercase tracking-wider flex items-center gap-2">
          <div className="w-1 h-4 bg-blue-500 rounded"></div>
          Team Communication
        </h4>
        <div className="flex items-center gap-3 p-3 bg-[#111111] border border-gray-700 rounded-lg">
          <input
            type="checkbox"
            id="groupChat"
            checked={formData.hasGroupChat}
            onChange={(e) => setFormData({ ...formData, hasGroupChat: e.target.checked })}
            className="w-4 h-4 rounded border-gray-600 text-purple-600 focus:ring-purple-500 focus:ring-offset-gray-900"
          />
          <label htmlFor="groupChat" className="flex-1 flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
            <MessageSquare className="w-4 h-4 text-blue-500" />
            <div>
              <div className="font-medium">Enable Group Chat</div>
              <div className="text-xs text-gray-500">Allow team-wide real-time messaging</div>
            </div>
          </label>
        </div>
        
        {/* Message Limit - Only show when Group Chat is enabled */}
        {formData.hasGroupChat && (
          <div className="ml-4 pl-4 border-l-2 border-blue-500/30">
            <label className="block text-xs text-gray-400 mb-1.5 flex items-center gap-1.5">
              <MessageSquare className="w-3 h-3" />
              Message Limit (for Group Chat)
            </label>
            <input
              type="number"
              placeholder="-1 for unlimited"
              value={formData.messageLimit}
              onChange={(e) => setFormData({ ...formData, messageLimit: parseInt(e.target.value) })}
              className="w-full bg-[#111111] border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500"
              required
            />
            <p className="text-xs text-gray-500 mt-1">Monthly message limit for group chat (-1 for unlimited)</p>
          </div>
        )}
      </div>

      {/* Access Control Section */}
      <div className="space-y-4">
        <h4 className="text-sm font-semibold text-green-400 uppercase tracking-wider flex items-center gap-2">
          <div className="w-1 h-4 bg-green-500 rounded"></div>
          Access Control
        </h4>
        <div>
          <label className="block text-xs text-gray-400 mb-1.5 flex items-center gap-1.5">
            <Lock className="w-3 h-3" />
            Access Control Tier
          </label>
          <select
            value={formData.accessControlTier}
            onChange={(e) => setFormData({ ...formData, accessControlTier: e.target.value as 'none' | 'pro' | 'advanced' })}
            className="w-full bg-[#111111] border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500"
          >
            <option value="none">None - Basic permissions only</option>
            <option value="pro">Pro - Enhanced role management</option>
            <option value="advanced">Advanced - Full custom permissions</option>
          </select>
          <p className="text-xs text-gray-500 mt-1">Level of access control features</p>
        </div>
        <div className="flex items-center gap-3 p-3 bg-[#111111] border border-gray-700 rounded-lg">
          <input
            type="checkbox"
            id="accessControl"
            checked={formData.hasAccessControl}
            onChange={(e) => setFormData({ ...formData, hasAccessControl: e.target.checked })}
            className="w-4 h-4 rounded border-gray-600 text-purple-600 focus:ring-purple-500 focus:ring-offset-gray-900"
          />
          <label htmlFor="accessControl" className="flex-1 flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
            <Shield className="w-4 h-4 text-green-500" />
            <div>
              <div className="font-medium">Enable Access Control</div>
              <div className="text-xs text-gray-500">Allow custom permissions and role management</div>
            </div>
          </label>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          className="flex-1 px-4 py-2.5 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2"
        >
          <Save className="w-4 h-4" />
          {plan ? 'Update Plan' : 'Create Plan'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-6 py-2.5 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm font-medium transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

