"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import * as Icons from "@radix-ui/react-icons";
import { Shield } from "lucide-react";

interface Plan {
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
}

interface CreatePlanModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  plans: Plan[];
}

export default function CreatePlanModal({ open, onOpenChange, onSuccess, plans }: CreatePlanModalProps) {
  const [parentPlanId, setParentPlanId] = useState("");
  const [formData, setFormData] = useState({
    name: "",
    price: 0,
    description: "",
    maxWorkspaces: 1,
    maxMembers: 5,
    maxAdmins: 1,
    maxSpaces: 10,
    maxLists: 50,
    maxFolders: 20,
    maxTasks: 100,
    hasAccessControl: false,
    hasGroupChat: false,
    messageLimit: 100,
    announcementCooldown: 24,
    accessControlTier: 'basic' as 'basic' | 'pro' | 'advanced',
    // Custom Roles & Table Permissions
    canUseCustomRoles: false,
    maxCustomRoles: -1,
    canCreateTables: false,
    maxTablesCount: -1,
    maxRowsLimit: -1,
    maxColumnsLimit: -1,
    maxFiles: -1,
    maxDocuments: -1,
    maxDirectMessagesPerUser: -1,
  });

  // Update features when parent plan changes
  useEffect(() => {
    if (parentPlanId && parentPlanId !== 'none') {
      const parent = plans.find(p => p._id === parentPlanId);
      if (parent) {
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
          canUseCustomRoles: parent.features.canUseCustomRoles || false,
          maxCustomRoles: parent.features.maxCustomRoles ?? -1,
          canCreateTables: parent.features.canCreateTables || false,
          maxTablesCount: parent.features.maxTablesCount ?? -1,
          maxRowsLimit: parent.features.maxRowsLimit ?? -1,
          maxColumnsLimit: parent.features.maxColumnsLimit ?? -1,
          maxFiles: parent.features.maxFiles ?? -1,
          maxDocuments: parent.features.maxDocuments ?? -1,
          maxDirectMessagesPerUser: parent.features.maxDirectMessagesPerUser ?? -1,
        }));
      }
    }
  }, [parentPlanId, plans]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
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
        // Custom Roles & Table Permissions
        canUseCustomRoles: Boolean(formData.canUseCustomRoles),
        maxCustomRoles: Number(formData.maxCustomRoles) || -1,
        canCreateTables: Boolean(formData.canCreateTables),
        maxTablesCount: Number(formData.maxTablesCount) || -1,
        maxRowsLimit: Number(formData.maxRowsLimit) || -1,
        maxColumnsLimit: Number(formData.maxColumnsLimit) || -1,
        maxFiles: Number(formData.maxFiles) || -1,
        maxDocuments: Number(formData.maxDocuments) || -1,
        maxDirectMessagesPerUser: Number(formData.maxDirectMessagesPerUser) || -1,
      },
    };
    
    if (parentPlanId && parentPlanId.trim() !== '' && parentPlanId !== 'none') {
      payload.parentPlanId = parentPlanId.trim();
    }

    try {
      const token = localStorage.getItem("authToken");
      const response = await fetch("http://localhost:5000/api/plans", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success('Plan created successfully!');
        onSuccess();
        onOpenChange(false);
        // Reset form
        setFormData({
          name: "",
          price: 0,
          description: "",
          maxWorkspaces: 1,
          maxMembers: 5,
          maxAdmins: 1,
          maxSpaces: 10,
          maxLists: 50,
          maxFolders: 20,
          maxTasks: 100,
          hasAccessControl: false,
          hasGroupChat: false,
          messageLimit: 100,
          announcementCooldown: 24,
          accessControlTier: 'basic',
          canUseCustomRoles: false,
          maxCustomRoles: -1,
          canCreateTables: false,
          maxTablesCount: -1,
          maxRowsLimit: -1,
          maxColumnsLimit: -1,
          maxFiles: -1,
          maxDocuments: -1,
          maxDirectMessagesPerUser: -1,
        });
        setParentPlanId("");
      } else {
        toast.error(data.message || 'Failed to create plan');
      }
    } catch (error: any) {
      toast.error(`Error: ${error.message || 'Network error occurred'}`);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Create New Plan</DialogTitle>
          <DialogDescription>
            Create a new subscription plan with custom features and limits
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(90vh-120px)] pr-4">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Parent Plan Selection */}
            <div className="space-y-2">
              <Label>Inherit from existing plan (optional)</Label>
              <Select value={parentPlanId} onValueChange={setParentPlanId}>
                <SelectTrigger>
                  <SelectValue placeholder="None - Start from scratch" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None - Start from scratch</SelectItem>
                  {plans.filter(p => p._id).map(p => (
                    <SelectItem key={p._id} value={p._id}>
                      {p.name} (${p.price}/mo)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Separator />

            {/* Basic Information */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold">Basic Information</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Plan Name *</Label>
                  <Input
                    id="name"
                    placeholder="e.g., Pro, Business, Enterprise"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="price">Monthly Price ($) *</Label>
                  <Input
                    id="price"
                    type="number"
                    placeholder="0"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) })}
                    required
                    min="0"
                    step="0.01"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description *</Label>
                <Textarea
                  id="description"
                  placeholder="Brief description of this plan"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={2}
                  required
                />
              </div>
            </div>

            <Separator />

            {/* Resource Limits */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold">Resource Limits</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Icons.ArchiveIcon className="w-4 h-4" />
                    Max Workspaces
                  </Label>
                  <Input
                    type="number"
                    placeholder="-1 for unlimited"
                    value={formData.maxWorkspaces}
                    onChange={(e) => setFormData({ ...formData, maxWorkspaces: parseInt(e.target.value) })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Icons.PersonIcon className="w-4 h-4" />
                    Max Members
                  </Label>
                  <Input
                    type="number"
                    placeholder="-1 for unlimited"
                    value={formData.maxMembers}
                    onChange={(e) => setFormData({ ...formData, maxMembers: parseInt(e.target.value) })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Shield className="w-4 h-4" />
                    Max Admins
                  </Label>
                  <Input
                    type="number"
                    placeholder="-1 for unlimited"
                    value={formData.maxAdmins}
                    onChange={(e) => setFormData({ ...formData, maxAdmins: parseInt(e.target.value) })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Icons.ComponentInstanceIcon className="w-4 h-4" />
                    Max Spaces
                  </Label>
                  <Input
                    type="number"
                    placeholder="-1 for unlimited"
                    value={formData.maxSpaces}
                    onChange={(e) => setFormData({ ...formData, maxSpaces: parseInt(e.target.value) })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Icons.ListBulletIcon className="w-4 h-4" />
                    Max Lists
                  </Label>
                  <Input
                    type="number"
                    placeholder="-1 for unlimited"
                    value={formData.maxLists}
                    onChange={(e) => setFormData({ ...formData, maxLists: parseInt(e.target.value) })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Icons.FileIcon className="w-4 h-4" />
                    Max Folders
                  </Label>
                  <Input
                    type="number"
                    placeholder="-1 for unlimited"
                    value={formData.maxFolders}
                    onChange={(e) => setFormData({ ...formData, maxFolders: parseInt(e.target.value) })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Icons.CheckboxIcon className="w-4 h-4" />
                    Max Tasks
                  </Label>
                  <Input
                    type="number"
                    placeholder="-1 for unlimited"
                    value={formData.maxTasks}
                    onChange={(e) => setFormData({ ...formData, maxTasks: parseInt(e.target.value) })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Icons.BellIcon className="w-4 h-4" />
                    Announcement Cooldown (hours)
                  </Label>
                  <Input
                    type="number"
                    placeholder="24"
                    value={formData.announcementCooldown}
                    onChange={(e) => setFormData({ ...formData, announcementCooldown: parseInt(e.target.value) })}
                    required
                    min="0"
                  />
                </div>
              </div>
            </div>

            <Separator />

            {/* Communication Features */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold">Team Communication</h3>
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-3">
                  <Icons.ChatBubbleIcon className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <Label htmlFor="groupChat" className="cursor-pointer">Enable Group Chat</Label>
                    <p className="text-xs text-muted-foreground">Allow team-wide real-time messaging</p>
                  </div>
                </div>
                <Switch
                  checked={formData.hasGroupChat}
                  onCheckedChange={(checked) => setFormData({ ...formData, hasGroupChat: checked })}
                />
              </div>
              
              {formData.hasGroupChat && (
                <div className="space-y-2 ml-4 pl-4 border-l-2">
                  <Label className="flex items-center gap-2">
                    <Icons.ChatBubbleIcon className="w-4 h-4" />
                    Message Limit (monthly)
                  </Label>
                  <Input
                    type="number"
                    placeholder="-1 for unlimited"
                    value={formData.messageLimit}
                    onChange={(e) => setFormData({ ...formData, messageLimit: parseInt(e.target.value) })}
                    required
                  />
                </div>
              )}
            </div>

            <Separator />

            {/* Access Control */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold">Access Control</h3>
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Icons.LockClosedIcon className="w-4 h-4" />
                  Access Control Tier
                </Label>
                <Select 
                  value={formData.accessControlTier} 
                  onValueChange={(value: 'basic' | 'pro' | 'advanced') => setFormData({ ...formData, accessControlTier: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="basic">Basic - List members get "Full Access" only</SelectItem>
                    <SelectItem value="pro">Pro - List members can have "Full Access" or "Can Edit"</SelectItem>
                    <SelectItem value="advanced">Advanced - Full control: "Full Access", "Can Edit", or "View Only"</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Controls which permission levels can be assigned to list members
                </p>
              </div>
            </div>

            <Separator />

            {/* Custom Roles */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold">Custom Display Roles (Pro Feature)</h3>
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Icons.PersonIcon className="w-4 h-4" />
                    <Label htmlFor="customRoles" className="cursor-pointer">Enable Custom Display Roles</Label>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Allow workspace owners to assign custom role titles to members
                  </p>
                </div>
                <Switch
                  checked={formData.canUseCustomRoles}
                  onCheckedChange={(checked) => setFormData({ ...formData, canUseCustomRoles: checked })}
                />
              </div>
              
              {formData.canUseCustomRoles && (
                <div className="space-y-2 ml-4 pl-4 border-l-2">
                  <Label className="flex items-center gap-2">
                    <Icons.CounterClockwiseClockIcon className="w-4 h-4" />
                    Max Custom Roles per Workspace
                  </Label>
                  <Input
                    type="number"
                    placeholder="e.g., 10 or -1 for unlimited"
                    value={formData.maxCustomRoles === -1 ? '' : formData.maxCustomRoles}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === '' || val === '-') {
                        setFormData({ ...formData, maxCustomRoles: '' as any });
                      } else {
                        const num = parseInt(val);
                        if (!isNaN(num)) {
                          setFormData({ ...formData, maxCustomRoles: num });
                        }
                      }
                    }}
                    onBlur={(e) => {
                      // On blur, if empty or invalid, set to -1
                      if (e.target.value === '' || e.target.value === '-') {
                        setFormData({ ...formData, maxCustomRoles: -1 });
                      }
                    }}
                    min="-1"
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    Set to -1 for unlimited, or specify a maximum number
                  </p>
                </div>
              )}
            </div>

            <Separator />

            {/* Custom Tables */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold">Customizable Tables (Pro Feature)</h3>
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Icons.TableIcon className="w-4 h-4" />
                    <Label htmlFor="customTables" className="cursor-pointer">Enable Customizable Tables</Label>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Allow users to create spreadsheet-like tables with custom columns and colored cells
                  </p>
                </div>
                <Switch
                  checked={formData.canCreateTables}
                  onCheckedChange={(checked) => setFormData({ ...formData, canCreateTables: checked })}
                />
              </div>
              
              {formData.canCreateTables && (
                <div className="space-y-4 ml-4 pl-4 border-l-2">
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Icons.StackIcon className="w-4 h-4" />
                      Max Tables per Space
                    </Label>
                    <Input
                      type="number"
                      placeholder="e.g., 5 or -1 for unlimited"
                      value={formData.maxTablesCount === -1 ? '' : formData.maxTablesCount}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val === '' || val === '-') {
                          setFormData({ ...formData, maxTablesCount: '' as any });
                        } else {
                          const num = parseInt(val);
                          if (!isNaN(num)) {
                            setFormData({ ...formData, maxTablesCount: num });
                          }
                        }
                      }}
                      onBlur={(e) => {
                        if (e.target.value === '' || e.target.value === '-') {
                          setFormData({ ...formData, maxTablesCount: -1 });
                        }
                      }}
                      min="-1"
                      required
                    />
                    <p className="text-xs text-muted-foreground">
                      Set to -1 for unlimited tables
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Icons.RowsIcon className="w-4 h-4" />
                      Max Rows per Table
                    </Label>
                    <Input
                      type="number"
                      placeholder="e.g., 1000 or -1 for unlimited"
                      value={formData.maxRowsLimit === -1 ? '' : formData.maxRowsLimit}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val === '' || val === '-') {
                          setFormData({ ...formData, maxRowsLimit: '' as any });
                        } else {
                          const num = parseInt(val);
                          if (!isNaN(num)) {
                            setFormData({ ...formData, maxRowsLimit: num });
                          }
                        }
                      }}
                      onBlur={(e) => {
                        if (e.target.value === '' || e.target.value === '-') {
                          setFormData({ ...formData, maxRowsLimit: -1 });
                        }
                      }}
                      min="-1"
                      required
                    />
                    <p className="text-xs text-muted-foreground">
                      Set to -1 for unlimited rows
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Icons.ColumnsIcon className="w-4 h-4" />
                      Max Columns per Table
                    </Label>
                    <Input
                      type="number"
                      placeholder="e.g., 50 or -1 for unlimited"
                      value={formData.maxColumnsLimit === -1 ? '' : formData.maxColumnsLimit}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val === '' || val === '-') {
                          setFormData({ ...formData, maxColumnsLimit: '' as any });
                        } else {
                          const num = parseInt(val);
                          if (!isNaN(num)) {
                            setFormData({ ...formData, maxColumnsLimit: num });
                          }
                        }
                      }}
                      onBlur={(e) => {
                        if (e.target.value === '' || e.target.value === '-') {
                          setFormData({ ...formData, maxColumnsLimit: -1 });
                        }
                      }}
                      min="-1"
                      required
                    />
                    <p className="text-xs text-muted-foreground">
                      Set to -1 for unlimited columns
                    </p>
                  </div>

                  {/* Max Files */}
                  <div className="space-y-2">
                    <Label htmlFor="maxFiles">Max Files</Label>
                    <Input
                      id="maxFiles"
                      type="number"
                      placeholder="e.g., 100 or -1 for unlimited"
                      value={formData.maxFiles === -1 ? '' : formData.maxFiles}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val === '' || val === '-') {
                          setFormData({ ...formData, maxFiles: '' as any });
                        } else {
                          const num = parseInt(val);
                          if (!isNaN(num)) {
                            setFormData({ ...formData, maxFiles: num });
                          }
                        }
                      }}
                      onBlur={(e) => {
                        if (e.target.value === '' || e.target.value === '-') {
                          setFormData({ ...formData, maxFiles: -1 });
                        }
                      }}
                      min="-1"
                      required
                    />
                    <p className="text-xs text-muted-foreground">
                      Set to -1 for unlimited files
                    </p>
                  </div>

                  {/* Max Documents */}
                  <div className="space-y-2">
                    <Label htmlFor="maxDocuments">Max Documents</Label>
                    <Input
                      id="maxDocuments"
                      type="number"
                      placeholder="e.g., 50 or -1 for unlimited"
                      value={formData.maxDocuments === -1 ? '' : formData.maxDocuments}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val === '' || val === '-') {
                          setFormData({ ...formData, maxDocuments: '' as any });
                        } else {
                          const num = parseInt(val);
                          if (!isNaN(num)) {
                            setFormData({ ...formData, maxDocuments: num });
                          }
                        }
                      }}
                      onBlur={(e) => {
                        if (e.target.value === '' || e.target.value === '-') {
                          setFormData({ ...formData, maxDocuments: -1 });
                        }
                      }}
                      min="-1"
                      required
                    />
                    <p className="text-xs text-muted-foreground">
                      Set to -1 for unlimited documents
                    </p>
                  </div>

                  {/* Max Direct Messages Per User */}
                  <div className="space-y-2">
                    <Label htmlFor="maxDirectMessagesPerUser">Max Direct Messages Per User</Label>
                    <Input
                      id="maxDirectMessagesPerUser"
                      type="number"
                      placeholder="e.g., 100 or -1 for unlimited"
                      value={formData.maxDirectMessagesPerUser === -1 ? '' : formData.maxDirectMessagesPerUser}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val === '' || val === '-') {
                          setFormData({ ...formData, maxDirectMessagesPerUser: '' as any });
                        } else {
                          const num = parseInt(val);
                          if (!isNaN(num)) {
                            setFormData({ ...formData, maxDirectMessagesPerUser: num });
                          }
                        }
                      }}
                      onBlur={(e) => {
                        if (e.target.value === '' || e.target.value === '-') {
                          setFormData({ ...formData, maxDirectMessagesPerUser: -1 });
                        }
                      }}
                      min="-1"
                      required
                    />
                    <p className="text-xs text-muted-foreground">
                      Set to -1 for unlimited messages per user
                    </p>
                  </div>
                </div>
              )}
            </div>

            <Separator />

            {/* Action Buttons */}
            <div className="flex gap-3 pt-2">
              <Button type="submit" className="flex-1">
                Create Plan
              </Button>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
            </div>
          </form>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
