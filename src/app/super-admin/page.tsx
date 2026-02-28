"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import * as Icons from "@radix-ui/react-icons";
import AnalyticsDashboard from "@/components/super-admin/AnalyticsDashboard";
import PlanBuilderNew from "@/components/super-admin/PlanBuilderNew";
import UserManagementNew from "@/components/super-admin/UserManagementNew";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export default function SuperAdminDashboard() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"dashboard" | "plans" | "users">("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("authToken");
    const isSuperUser = localStorage.getItem("isSuperUser") === "true";
    
    if (!token) {
      router.push("/login");
      return;
    }
    
    if (!isSuperUser) {
      router.push("/dashboard");
      return;
    }
  }, [router]);

  const menuItems = [
    { id: "dashboard", label: "Analytics", icon: Icons.DashboardIcon },
    { id: "plans", label: "Plans", icon: Icons.CardStackIcon },
    { id: "users", label: "Users", icon: Icons.PersonIcon },
  ];

  return (
    <div className="min-h-screen flex bg-background">
      {/* Dark Sidebar */}
      <aside className={cn(
        "fixed lg:relative inset-y-0 left-0 z-50 w-64 bg-[#0a0a0a] border-r border-gray-800 flex flex-col transition-all duration-300",
        sidebarOpen ? "translate-x-0" : "-translate-x-full lg:-translate-x-full"
      )}>
        {/* Logo/Header */}
        <div className="p-6 border-b border-gray-800 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-white">Super Admin</h1>
            <p className="text-sm text-gray-400 mt-1">TaskFlow</p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="text-white hover:bg-gray-800 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          >
            <Icons.Cross2Icon className="w-5 h-5" />
          </Button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4">
          <div className="space-y-1">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveTab(item.id as any);
                    // Auto-close on mobile
                    if (window.innerWidth < 1024) {
                      setSidebarOpen(false);
                    }
                  }}
                  className={cn(
                    "w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors",
                    isActive
                      ? "bg-purple-600 text-white"
                      : "text-gray-400 hover:text-white hover:bg-gray-800"
                  )}
                >
                  <Icon className="w-5 h-5" />
                  {item.label}
                </button>
              );
            })}
          </div>
        </nav>

        {/* Back to App */}
        <div className="p-4 border-t border-gray-800">
          <button
            onClick={() => router.push("/dashboard")}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
          >
            <Icons.ArrowLeftIcon className="w-5 h-5" />
            Back to App
          </button>
        </div>
      </aside>

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main Content - Light Theme - Expands when sidebar is closed */}
      <main className={cn(
        "flex-1 overflow-auto bg-background min-h-screen transition-all duration-300",
        !sidebarOpen && "lg:ml-0"
      )}>
        {/* Header with Hamburger */}
        <div className="sticky top-0 z-30 bg-background border-b px-4 py-3 flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            <Icons.HamburgerMenuIcon className="w-5 h-5" />
          </Button>
          <h2 className="text-lg font-semibold">
            {menuItems.find(item => item.id === activeTab)?.label}
          </h2>
        </div>

        <div className="p-4 sm:p-6 lg:p-8">
          {activeTab === "dashboard" && <AnalyticsDashboard />}
          {activeTab === "plans" && <PlanBuilderNew />}
          {activeTab === "users" && <UserManagementNew />}
        </div>
      </main>
    </div>
  );
}
