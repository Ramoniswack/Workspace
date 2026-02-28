"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import * as Icons from "@radix-ui/react-icons";
import AnalyticsDashboard from "@/components/super-admin/AnalyticsDashboard";
import PlanBuilderNew from "@/components/super-admin/PlanBuilderNew";
import UserManagementNew from "@/components/super-admin/UserManagementNew";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export default function SuperAdminDashboard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get('tab');
  const [activeTab, setActiveTab] = useState<"dashboard" | "plans" | "users">(
    (tabParam as "dashboard" | "plans" | "users") || "dashboard"
  );
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

  // Update active tab when URL changes
  useEffect(() => {
    if (tabParam && ['dashboard', 'plans', 'users'].includes(tabParam)) {
      setActiveTab(tabParam as "dashboard" | "plans" | "users");
    }
  }, [tabParam]);

  const menuItems = [
    { id: "dashboard", label: "Analytics", icon: Icons.DashboardIcon },
    { id: "plans", label: "Plans", icon: Icons.CardStackIcon },
    { id: "users", label: "Users", icon: Icons.PersonIcon },
  ];

  return (
    <div className="min-h-screen flex bg-gray-50">
      {/* Dark Sidebar */}
      <aside className={cn(
        "fixed lg:sticky inset-y-0 left-0 top-0 z-50 h-screen bg-[#0a0a0a] border-r border-gray-800 flex flex-col transition-all duration-300",
        sidebarOpen ? "w-64" : "w-0 lg:w-16"
      )}>
        {/* Logo/Header */}
        <div className={cn(
          "p-6 border-b border-gray-800 flex items-center justify-between transition-all duration-300",
          !sidebarOpen && "lg:p-3 lg:justify-center"
        )}>
          {sidebarOpen ? (
            <>
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
            </>
          ) : (
            <div className="hidden lg:block">
              <Icons.DashboardIcon className="w-6 h-6 text-white" />
            </div>
          )}
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
                      : "text-gray-400 hover:text-white hover:bg-gray-800",
                    !sidebarOpen && "lg:justify-center lg:px-2"
                  )}
                  title={!sidebarOpen ? item.label : undefined}
                >
                  <Icon className="w-5 h-5 flex-shrink-0" />
                  {sidebarOpen && <span>{item.label}</span>}
                </button>
              );
            })}
          </div>
        </nav>

        {/* Back to App */}
        <div className="p-4 border-t border-gray-800">
          <button
            onClick={() => router.push("/dashboard")}
            className={cn(
              "w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-gray-400 hover:text-white hover:bg-gray-800 transition-colors",
              !sidebarOpen && "lg:justify-center lg:px-2"
            )}
            title={!sidebarOpen ? "Back to App" : undefined}
          >
            <Icons.ArrowLeftIcon className="w-5 h-5 flex-shrink-0" />
            {sidebarOpen && <span>Back to App</span>}
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

      {/* Main Content - Properly expands when sidebar is collapsed */}
      <main className="flex-1 overflow-auto bg-gray-50 min-h-screen">
        {/* Header with Hamburger */}
        <div className="sticky top-0 z-30 bg-white border-b shadow-sm px-4 py-4 flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="hover:bg-gray-100"
          >
            <Icons.HamburgerMenuIcon className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-2">
            {menuItems.find(item => item.id === activeTab)?.icon && (
              <div className="text-purple-600">
                {(() => {
                  const Icon = menuItems.find(item => item.id === activeTab)?.icon;
                  return Icon ? <Icon className="w-5 h-5" /> : null;
                })()}
              </div>
            )}
            <h2 className="text-lg font-semibold text-gray-900">
              {menuItems.find(item => item.id === activeTab)?.label}
            </h2>
          </div>
        </div>

        <div className="p-4 sm:p-6 lg:p-8 max-w-[1600px] mx-auto">
          {activeTab === "dashboard" && <AnalyticsDashboard />}
          {activeTab === "plans" && <PlanBuilderNew />}
          {activeTab === "users" && <UserManagementNew />}
        </div>
      </main>
    </div>
  );
}
