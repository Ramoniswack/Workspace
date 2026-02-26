"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Settings,
  LayoutDashboard,
  CreditCard,
  UserCog,
  MessageSquare,
} from "lucide-react";
import AnalyticsDashboard from "@/components/super-admin/AnalyticsDashboard";
import PlanBuilder from "@/components/super-admin/PlanBuilder";
import UserManagement from "@/components/super-admin/UserManagement";
import FeedbackInbox from "@/components/super-admin/FeedbackInbox";

export default function SuperAdminDashboard() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"dashboard" | "plans" | "users" | "feedback">("dashboard");

  useEffect(() => {
    // Check if user is authenticated and is super admin
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

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      {/* Header */}
      <header className="border-b border-gray-800 bg-[#111111]">
        <div className="px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                <Settings className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-white">Super Admin Dashboard</h1>
                <p className="text-sm text-gray-400">System Management Console</p>
              </div>
            </div>
            <button
              onClick={() => router.push("/dashboard")}
              className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors"
            >
              Back to App
            </button>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <div className="border-b border-gray-800 bg-[#111111]">
        <div className="px-8">
          <div className="flex gap-6">
            <button
              onClick={() => setActiveTab("dashboard")}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === "dashboard"
                  ? "border-purple-500 text-white"
                  : "border-transparent text-gray-400 hover:text-white"
              }`}
            >
              <div className="flex items-center gap-2">
                <LayoutDashboard className="w-4 h-4" />
                Analytics
              </div>
            </button>
            <button
              onClick={() => setActiveTab("plans")}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === "plans"
                  ? "border-purple-500 text-white"
                  : "border-transparent text-gray-400 hover:text-white"
              }`}
            >
              <div className="flex items-center gap-2">
                <CreditCard className="w-4 h-4" />
                Plans
              </div>
            </button>
            <button
              onClick={() => setActiveTab("users")}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === "users"
                  ? "border-purple-500 text-white"
                  : "border-transparent text-gray-400 hover:text-white"
              }`}
            >
              <div className="flex items-center gap-2">
                <UserCog className="w-4 h-4" />
                Users
              </div>
            </button>
            <button
              onClick={() => setActiveTab("feedback")}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === "feedback"
                  ? "border-purple-500 text-white"
                  : "border-transparent text-gray-400 hover:text-white"
              }`}
            >
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4" />
                Feedback
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <main className="p-8">
        {activeTab === "dashboard" && <AnalyticsDashboard />}
        {activeTab === "plans" && <PlanBuilder />}
        {activeTab === "users" && <UserManagement />}
        {activeTab === "feedback" && <FeedbackInbox />}
      </main>
    </div>
  );
}
