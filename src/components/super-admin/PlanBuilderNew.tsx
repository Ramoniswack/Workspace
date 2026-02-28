"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import * as Icons from "@radix-ui/react-icons";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";

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
    // Custom Roles & Table Permissions
    canUseCustomRoles: boolean;
    maxCustomRoles: number;
    canCreateTables: boolean;
    maxTablesCount: number;
    maxRowsLimit: number;
    maxColumnsLimit: number;
    maxFiles: number;
    maxDocuments: number;
    maxDirectMessagesPerUser: number;
  };
  isActive: boolean;
}

interface SystemSettings {
  whatsappContactNumber: string;
}

export default function PlanBuilderNew() {
  const router = useRouter();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [settings, setSettings] = useState<SystemSettings>({ whatsappContactNumber: "" });
  const [loading, setLoading] = useState(true);
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
        toast.success(`Plan ${!isActive ? 'activated' : 'deactivated'} successfully`);
        fetchPlans();
      }
    } catch (error) {
      console.error("Error toggling plan status:", error);
    }
  };

  const deletePlan = async (planId: string, planName: string) => {
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
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* WhatsApp Settings Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-600 flex items-center justify-center">
              <Icons.ChatBubbleIcon className="w-5 h-5 text-white" />
            </div>
            <div>
              <CardTitle>Payment Contact</CardTitle>
              <CardDescription>WhatsApp number for payment inquiries</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3">
            <Input
              type="text"
              value={whatsappNumber}
              onChange={(e) => setWhatsappNumber(e.target.value)}
              placeholder="+1234567890"
              className="flex-1"
            />
            <Button onClick={updateSettings} className="gap-2">
              <Icons.CheckIcon className="w-4 h-4" />
              Save
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Plans Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Subscription Plans</h2>
          <p className="text-muted-foreground text-sm mt-1">Manage your pricing tiers and features</p>
        </div>
        <Button onClick={() => router.push('/super-admin/plans/create')} className="gap-2">
          <Icons.PlusIcon className="w-4 h-4" />
          Create Plan
        </Button>
      </div>

      {/* Plans Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {plans.map((plan) => (
          <Card
            key={plan._id}
            className={`transition-all hover:shadow-lg ${
              plan.isActive ? "" : "opacity-60"
            }`}
          >
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="flex items-center gap-2">
                    {plan.name}
                    {!plan.isActive && (
                      <Badge variant="secondary" className="text-xs">
                        Inactive
                      </Badge>
                    )}
                  </CardTitle>
                  <div className="flex items-baseline gap-1 mt-2">
                    <span className="text-3xl font-bold">${plan.price}</span>
                    <span className="text-sm text-muted-foreground">/month</span>
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => router.push(`/super-admin/plans/edit/${plan._id}`)}
                    title="Edit plan"
                  >
                    <Icons.Pencil1Icon className="w-4 h-4" />
                  </Button>
                  {plan.name.toLowerCase() !== 'free' && plan.name.toLowerCase() !== 'free plan' && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deletePlan(plan._id, plan.name)}
                      title="Delete plan"
                      className="text-destructive hover:text-destructive"
                    >
                      <Icons.TrashIcon className="w-4 h-4" />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => togglePlanStatus(plan._id, plan.isActive)}
                    title={plan.isActive ? "Deactivate plan" : "Activate plan"}
                  >
                    {plan.isActive ? (
                      <Icons.CheckIcon className="w-4 h-4 text-green-500" />
                    ) : (
                      <Icons.Cross2Icon className="w-4 h-4 text-red-500" />
                    )}
                  </Button>
                </div>
              </div>
              <CardDescription className="mt-2">{plan.description}</CardDescription>
            </CardHeader>

            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center gap-3 text-sm">
                  <Icons.ArchiveIcon className="w-4 h-4 text-muted-foreground" />
                  <span>
                    {plan.features.maxWorkspaces === -1 ? "Unlimited" : plan.features.maxWorkspaces} Workspaces
                  </span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <Icons.PersonIcon className="w-4 h-4 text-muted-foreground" />
                  <span>
                    {plan.features.maxMembers === -1 ? "Unlimited" : plan.features.maxMembers} Members
                  </span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <Icons.ComponentInstanceIcon className="w-4 h-4 text-muted-foreground" />
                  <span>
                    {plan.features.maxSpaces === -1 ? "Unlimited" : plan.features.maxSpaces} Spaces
                  </span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <Icons.ListBulletIcon className="w-4 h-4 text-muted-foreground" />
                  <span>
                    {plan.features.maxLists === -1 ? "Unlimited" : plan.features.maxLists} Lists
                  </span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <Icons.CheckboxIcon className="w-4 h-4 text-muted-foreground" />
                  <span>
                    {plan.features.maxTasks === -1 ? "Unlimited" : plan.features.maxTasks} Tasks
                  </span>
                </div>
                
                <Separator className="my-3" />
                
                <div className="flex items-center gap-3 text-sm">
                  <Icons.LockClosedIcon className="w-4 h-4 text-muted-foreground" />
                  <span className="capitalize">
                    {plan.features.accessControlTier} Access Control
                  </span>
                </div>
                {plan.features.hasGroupChat && (
                  <div className="flex items-center gap-3 text-sm">
                    <Icons.ChatBubbleIcon className="w-4 h-4 text-muted-foreground" />
                    <span>
                      Group Chat ({plan.features.messageLimit === -1 ? "Unlimited" : plan.features.messageLimit} msgs/mo)
                    </span>
                  </div>
                )}
                
                {plan.features.canCreateTables && (
                  <>
                    <Separator className="my-3" />
                    <div className="flex items-center gap-3 text-sm">
                      <Icons.TableIcon className="w-4 h-4 text-muted-foreground" />
                      <span>
                        Custom Tables ({plan.features.maxTablesCount === -1 ? "Unlimited" : plan.features.maxTablesCount})
                      </span>
                    </div>
                  </>
                )}
                
                {(plan.features.maxFiles !== undefined && plan.features.maxFiles !== 0) && (
                  <div className="flex items-center gap-3 text-sm">
                    <Icons.FileIcon className="w-4 h-4 text-muted-foreground" />
                    <span>
                      Files ({plan.features.maxFiles === -1 ? "Unlimited" : plan.features.maxFiles})
                    </span>
                  </div>
                )}
                
                {(plan.features.maxDocuments !== undefined && plan.features.maxDocuments !== 0) && (
                  <div className="flex items-center gap-3 text-sm">
                    <Icons.FileTextIcon className="w-4 h-4 text-muted-foreground" />
                    <span>
                      Documents ({plan.features.maxDocuments === -1 ? "Unlimited" : plan.features.maxDocuments})
                    </span>
                  </div>
                )}
                
                {(plan.features.maxDirectMessagesPerUser !== undefined && plan.features.maxDirectMessagesPerUser !== 0) && (
                  <div className="flex items-center gap-3 text-sm">
                    <Icons.EnvelopeClosedIcon className="w-4 h-4 text-muted-foreground" />
                    <span>
                      DMs ({plan.features.maxDirectMessagesPerUser === -1 ? "Unlimited" : plan.features.maxDirectMessagesPerUser}/user)
                    </span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
