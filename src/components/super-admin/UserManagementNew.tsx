"use client";

import { useEffect, useState } from "react";
import * as Icons from "@radix-ui/react-icons";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { toast } from "sonner";

interface AdminUser {
  _id: string;
  name: string;
  email: string;
  workspaceCount: number;
  subscription: {
    planId: string | null;
    planName: string;
    planPrice: number;
    isPaid: boolean;
    status: "free" | "active" | "expired";
    expiresAt?: string;
    daysRemaining?: number;
  };
  createdAt: string;
}

interface Plan {
  _id: string;
  name: string;
  price: number;
}

export default function UserManagementNew() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<string>("");

  useEffect(() => {
    fetchUsers();
    fetchPlans();
  }, []);

  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem("authToken");
      const response = await fetch("http://localhost:5000/api/super-admin/users", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setUsers(data.data);
      }
    } catch (error) {
      console.error("Error fetching users:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPlans = async () => {
    try {
      const token = localStorage.getItem("authToken");
      const response = await fetch("http://localhost:5000/api/plans", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setPlans(data.data);
      }
    } catch (error) {
      console.error("Error fetching plans:", error);
    }
  };

  const togglePaidStatus = async (userId: string, currentStatus: boolean) => {
    if (!currentStatus && !selectedPlan) {
      toast.error("Please select a plan first");
      return;
    }

    try {
      const token = localStorage.getItem("authToken");
      const response = await fetch(
        `http://localhost:5000/api/super-admin/users/${userId}/subscription`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            isPaid: !currentStatus,
            planId: !currentStatus ? selectedPlan : undefined,
          }),
        }
      );
      if (response.ok) {
        toast.success(currentStatus ? "User subscription removed" : "User subscription activated");
        fetchUsers();
        setSelectedUser(null);
        setSelectedPlan("");
      } else {
        toast.error("Failed to update subscription");
      }
    } catch (error) {
      console.error("Error updating subscription:", error);
      toast.error("Error updating subscription");
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
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
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight">User Management</h2>
        <p className="text-muted-foreground text-sm mt-1">
          Manage workspace owners and their subscriptions
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Icons.PersonIcon className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{users.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Paid Users</CardTitle>
            <Icons.CheckCircledIcon className="w-4 h-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">
              {users.filter((u) => u.subscription.isPaid).length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active</CardTitle>
            <Icons.CheckCircledIcon className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {users.filter((u) => u.subscription.status === "active").length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Expired</CardTitle>
            <Icons.CrossCircledIcon className="w-4 h-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-500">
              {users.filter((u) => u.subscription.status === "expired").length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Users Table/Cards */}
      <Card>
        <CardHeader>
          <CardTitle>All Users</CardTitle>
          <CardDescription>Manage user subscriptions and plans</CardDescription>
        </CardHeader>
        <CardContent>
          {/* Desktop Table */}
          <div className="hidden lg:block overflow-x-auto">
            <table className="w-full">
              <thead className="border-b">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Workspaces
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Plan
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Days Left
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {users.map((user) => (
                  <tr key={user._id} className="hover:bg-muted/50 transition-colors">
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <Avatar>
                          <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-medium">{user.name}</p>
                          <p className="text-xs text-muted-foreground">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <Icons.ArchiveIcon className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm">{user.workspaceCount}</span>
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div>
                        <p className="text-sm font-medium">{user.subscription.planName}</p>
                        <p className="text-xs text-muted-foreground">
                          ${user.subscription.planPrice}/mo
                        </p>
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <Badge
                        variant={
                          user.subscription.status === "active"
                            ? "default"
                            : user.subscription.status === "expired"
                            ? "destructive"
                            : "secondary"
                        }
                      >
                        {user.subscription.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      {user.subscription.isPaid && user.subscription.status === 'active' && user.subscription.daysRemaining !== undefined ? (
                        <span className={`text-sm font-medium ${
                          user.subscription.daysRemaining <= 3 ? 'text-red-500' :
                          user.subscription.daysRemaining <= 7 ? 'text-orange-500' :
                          user.subscription.daysRemaining <= 14 ? 'text-yellow-500' :
                          'text-green-500'
                        }`}>
                          {user.subscription.daysRemaining} days
                        </span>
                      ) : (
                        <span className="text-sm text-muted-foreground">N/A</span>
                      )}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      {selectedUser?._id === user._id && !user.subscription.isPaid ? (
                        <div className="flex items-center gap-2">
                          <Select value={selectedPlan} onValueChange={setSelectedPlan}>
                            <SelectTrigger className="w-[180px]">
                              <SelectValue placeholder="Select Plan" />
                            </SelectTrigger>
                            <SelectContent>
                              {plans.map((plan) => (
                                <SelectItem key={plan._id} value={plan._id}>
                                  {plan.name} - ${plan.price}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Button
                            size="sm"
                            onClick={() => togglePaidStatus(user._id, user.subscription.isPaid)}
                          >
                            Confirm
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedUser(null);
                              setSelectedPlan("");
                            }}
                          >
                            Cancel
                          </Button>
                        </div>
                      ) : (
                        <Button
                          size="sm"
                          variant={user.subscription.isPaid ? "destructive" : "default"}
                          onClick={() => {
                            if (user.subscription.isPaid) {
                              togglePaidStatus(user._id, user.subscription.isPaid);
                            } else {
                              setSelectedUser(user);
                            }
                          }}
                        >
                          {user.subscription.isPaid ? "Remove" : "Grant Access"}
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="lg:hidden space-y-4">
            {users.map((user) => (
              <Card key={user._id}>
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <CardTitle className="text-base">{user.name}</CardTitle>
                      <CardDescription className="text-xs">{user.email}</CardDescription>
                    </div>
                    <Badge
                      variant={
                        user.subscription.status === "active"
                          ? "default"
                          : user.subscription.status === "expired"
                          ? "destructive"
                          : "secondary"
                      }
                    >
                      {user.subscription.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Workspaces:</span>
                    <span className="font-medium">{user.workspaceCount}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Plan:</span>
                    <span className="font-medium">
                      {user.subscription.planName} (${user.subscription.planPrice}/mo)
                    </span>
                  </div>
                  {user.subscription.isPaid && user.subscription.status === 'active' && user.subscription.daysRemaining !== undefined && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Days Left:</span>
                      <span className={`font-medium ${
                        user.subscription.daysRemaining <= 3 ? 'text-red-500' :
                        user.subscription.daysRemaining <= 7 ? 'text-orange-500' :
                        user.subscription.daysRemaining <= 14 ? 'text-yellow-500' :
                        'text-green-500'
                      }`}>
                        {user.subscription.daysRemaining} days
                      </span>
                    </div>
                  )}
                  {selectedUser?._id === user._id && !user.subscription.isPaid ? (
                    <div className="space-y-2">
                      <Select value={selectedPlan} onValueChange={setSelectedPlan}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select Plan" />
                        </SelectTrigger>
                        <SelectContent>
                          {plans.map((plan) => (
                            <SelectItem key={plan._id} value={plan._id}>
                              {plan.name} - ${plan.price}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <div className="flex gap-2">
                        <Button
                          className="flex-1"
                          onClick={() => togglePaidStatus(user._id, user.subscription.isPaid)}
                        >
                          Confirm
                        </Button>
                        <Button
                          className="flex-1"
                          variant="outline"
                          onClick={() => {
                            setSelectedUser(null);
                            setSelectedPlan("");
                          }}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <Button
                      className="w-full"
                      variant={user.subscription.isPaid ? "destructive" : "default"}
                      onClick={() => {
                        if (user.subscription.isPaid) {
                          togglePaidStatus(user._id, user.subscription.isPaid);
                        } else {
                          setSelectedUser(user);
                        }
                      }}
                    >
                      {user.subscription.isPaid ? "Remove Subscription" : "Grant Access"}
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
