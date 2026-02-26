"use client";

import { useEffect, useState } from "react";
import { DollarSign, TrendingUp, Users, Activity } from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface AnalyticsData {
  totalRevenue: number;
  conversionRate: number;
  signupData: Array<{ week: string; count: number; year: number }>;
  metrics: {
    totalUsers: number;
    paidUsers: number;
    trialUsers: number;
    activeSubscriptions: number;
    expiredSubscriptions: number;
  };
}

export default function AnalyticsDashboard() {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      const token = localStorage.getItem("authToken");
      const response = await fetch("http://localhost:5000/api/super-admin/analytics", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setAnalytics(data.data);
      }
    } catch (error) {
      console.error("Error fetching analytics:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="text-center text-gray-400 py-12">
        Failed to load analytics data
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Revenue Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Total Revenue */}
        <div className="bg-[#111111] border border-gray-800 rounded-xl p-6 hover:border-purple-500/50 transition-colors">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-white" />
            </div>
            <span className="text-xs text-gray-400 bg-gray-800 px-2 py-1 rounded">
              Monthly
            </span>
          </div>
          <h3 className="text-gray-400 text-sm font-medium mb-1">Total Revenue</h3>
          <p className="text-3xl font-bold text-white mb-2">
            ${analytics.totalRevenue.toFixed(2)}
          </p>
          <p className="text-xs text-gray-500">
            From {analytics.metrics.paidUsers} paid users
          </p>
        </div>

        {/* Conversion Rate */}
        <div className="bg-[#111111] border border-gray-800 rounded-xl p-6 hover:border-purple-500/50 transition-colors">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-white" />
            </div>
            <span className="text-xs text-gray-400 bg-gray-800 px-2 py-1 rounded">
              Rate
            </span>
          </div>
          <h3 className="text-gray-400 text-sm font-medium mb-1">Conversion Rate</h3>
          <p className="text-3xl font-bold text-white mb-2">
            {analytics.conversionRate}%
          </p>
          <p className="text-xs text-gray-500">
            {analytics.metrics.trialUsers} users in trial
          </p>
        </div>

        {/* Total Users */}
        <div className="bg-[#111111] border border-gray-800 rounded-xl p-6 hover:border-purple-500/50 transition-colors">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center">
              <Users className="w-6 h-6 text-white" />
            </div>
            <span className="text-xs text-gray-400 bg-gray-800 px-2 py-1 rounded">
              Total
            </span>
          </div>
          <h3 className="text-gray-400 text-sm font-medium mb-1">Total Users</h3>
          <p className="text-3xl font-bold text-white mb-2">
            {analytics.metrics.totalUsers}
          </p>
          <p className="text-xs text-gray-500">
            {analytics.metrics.activeSubscriptions} active subscriptions
          </p>
        </div>
      </div>

      {/* Signup Chart */}
      <div className="bg-[#111111] border border-gray-800 rounded-xl p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center">
            <Activity className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-white font-semibold">New Signups</h3>
            <p className="text-sm text-gray-400">User registrations over time</p>
          </div>
        </div>

        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={analytics.signupData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#333" />
              <XAxis
                dataKey="week"
                stroke="#666"
                style={{ fontSize: "12px" }}
              />
              <YAxis stroke="#666" style={{ fontSize: "12px" }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#1a1a1a",
                  border: "1px solid #333",
                  borderRadius: "8px",
                  color: "#fff",
                }}
              />
              <Line
                type="monotone"
                dataKey="count"
                stroke="#a855f7"
                strokeWidth={2}
                dot={{ fill: "#a855f7", r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Additional Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-[#111111] border border-gray-800 rounded-lg p-4">
          <p className="text-gray-400 text-xs mb-1">Paid Users</p>
          <p className="text-2xl font-bold text-white">{analytics.metrics.paidUsers}</p>
        </div>
        <div className="bg-[#111111] border border-gray-800 rounded-lg p-4">
          <p className="text-gray-400 text-xs mb-1">Trial Users</p>
          <p className="text-2xl font-bold text-white">{analytics.metrics.trialUsers}</p>
        </div>
        <div className="bg-[#111111] border border-gray-800 rounded-lg p-4">
          <p className="text-gray-400 text-xs mb-1">Active</p>
          <p className="text-2xl font-bold text-green-500">
            {analytics.metrics.activeSubscriptions}
          </p>
        </div>
        <div className="bg-[#111111] border border-gray-800 rounded-lg p-4">
          <p className="text-gray-400 text-xs mb-1">Expired</p>
          <p className="text-2xl font-bold text-red-500">
            {analytics.metrics.expiredSubscriptions}
          </p>
        </div>
      </div>
    </div>
  );
}

