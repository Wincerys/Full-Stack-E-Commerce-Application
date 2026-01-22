import { useEffect, useState } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import { 
  BarChart, 
  Bar, 
  LineChart,
  Line,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { 
  TrendingUp, 
  Users, 
  Calendar, 
  CheckCircle, 
  Clock,
  Activity
} from 'lucide-react';
import { authHeaders } from "../services/api.js";
import LoadingSkeleton from "../components/LoadingSkeleton.jsx";

export default function AdminAnalyticsTabNew() {
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState("all");
  const [counts, setCounts] = useState(null);
  const [popularEvents, setPopularEvents] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);
  const [organizerLeaderboard, setOrganizerLeaderboard] = useState([]);

  useEffect(() => {
    loadAnalytics();
  }, [dateRange]);

  const loadAnalytics = async () => {
    setLoading(true);
    const headers = authHeaders();

    try {
      const [countsRes, popularRes, activityRes, leaderboardRes] = await Promise.all([
        axios.get(`/api/admin/analytics/counts?dateRange=${dateRange}`, { headers }),
        axios.get("/api/admin/analytics/popular-events?limit=10", { headers }),
        axios.get("/api/admin/analytics/recent-activity?limit=10", { headers }),
        axios.get("/api/admin/analytics/organizer-leaderboard?limit=10", { headers }),
      ]);

      setCounts(countsRes.data);
      setPopularEvents(popularRes.data);
      setRecentActivity(activityRes.data);
      setOrganizerLeaderboard(leaderboardRes.data);
    } catch (error) {
      console.error("Failed to load analytics:", error);
      toast.error("Failed to load analytics data");
    } finally {
      setLoading(false);
    }
  };

  const StatCard = ({ title, value, icon: Icon, color, subtitle }) => (
    <div className="bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-3xl font-bold text-gray-900 mt-2">{value}</p>
          {subtitle && <p className="text-sm text-gray-500 mt-1">{subtitle}</p>}
        </div>
        <div className={`p-3 rounded-lg ${color}`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <LoadingSkeleton type="stat" count={4} />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <LoadingSkeleton type="card" count={2} />
        </div>
      </div>
    );
  }

  const approvalData = [
    { name: 'Approved', value: counts?.eventsApproved || 0, color: '#10b981' },
    { name: 'Pending', value: counts?.eventsPending || 0, color: '#f59e0b' },
    { name: 'Rejected', value: (counts?.eventsTotal || 0) - (counts?.eventsApproved || 0) - (counts?.eventsPending || 0), color: '#ef4444' }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Analytics Dashboard</h1>
          <p className="text-gray-600 mt-1">Overview of platform metrics and insights</p>
        </div>
        <div className="flex gap-2">
          {["all", "30days", "7days"].map((range) => (
            <button
              key={range}
              onClick={() => setDateRange(range)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                dateRange === range
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              {range === "all" ? "All Time" : range === "30days" ? "Last Month" : "Last 7 Days"}
            </button>
          ))}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Users"
          value={counts?.users || 0}
          icon={Users}
          color="bg-blue-500"
        />
        <StatCard
          title="Total Events"
          value={counts?.eventsTotal || 0}
          icon={Calendar}
          color="bg-purple-500"
          subtitle={`${counts?.eventsApproved || 0} approved`}
        />
        <StatCard
          title="Pending Approval"
          value={counts?.eventsPending || 0}
          icon={Clock}
          color="bg-yellow-500"
        />
        <StatCard
          title="Total RSVPs"
          value={counts?.rsvpsTotal || 0}
          icon={CheckCircle}
          color="bg-green-500"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Popular Events */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-blue-600" />
            Most Popular Events
          </h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={popularEvents.slice(0, 8)}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis 
                dataKey="title" 
                angle={-45}
                textAnchor="end"
                height={100}
                tick={{ fontSize: 12 }}
              />
              <YAxis />
              <Tooltip 
                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}
              />
              <Bar dataKey="rsvpCount" fill="#3b82f6" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Event Status Distribution */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Event Status Distribution</h2>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={approvalData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {approvalData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Organizer Leaderboard & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Organizer Leaderboard */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Users className="w-5 h-5 text-purple-600" />
            Top Organizers
          </h2>
          <div className="space-y-3">
            {organizerLeaderboard.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No organizer data yet</p>
            ) : (
              organizerLeaderboard.map((org, idx) => (
                <div
                  key={org.email}
                  className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold text-white ${
                      idx === 0 ? 'bg-yellow-500' : idx === 1 ? 'bg-gray-400' : idx === 2 ? 'bg-orange-600' : 'bg-gray-300'
                    }`}>
                      {idx + 1}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{org.name}</p>
                      <p className="text-sm text-gray-500">{org.eventsCreated} events</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-blue-600">{org.totalRsvps}</p>
                    <p className="text-xs text-gray-500">RSVPs</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Activity className="w-5 h-5 text-green-600" />
            Recent Activity
          </h2>
          <div className="space-y-3">
            {recentActivity.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No recent activity</p>
            ) : (
              recentActivity.map((activity, idx) => {
                const actionColors = {
                  EVENT_APPROVE: 'bg-green-100 text-green-800',
                  EVENT_REJECT: 'bg-red-100 text-red-800',
                  EVENT_DELETE: 'bg-red-100 text-red-800',
                  EVENT_EDIT: 'bg-blue-100 text-blue-800',
                  USER_BAN: 'bg-orange-100 text-orange-800',
                  USER_DEACTIVATE: 'bg-gray-100 text-gray-800',
                  USER_ROLE: 'bg-purple-100 text-purple-800',
                };

                const actionLabels = {
                  EVENT_APPROVE: 'Approved Event',
                  EVENT_REJECT: 'Rejected Event',
                  EVENT_DELETE: 'Deleted Event',
                  EVENT_EDIT: 'Edited Event',
                  USER_BAN: 'Banned User',
                  USER_DEACTIVATE: 'Deactivated User',
                  USER_ROLE: 'Changed Role',
                };

                return (
                  <div key={idx} className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${actionColors[activity.action] || 'bg-gray-100 text-gray-800'}`}>
                      {actionLabels[activity.action] || activity.action}
                    </span>
                    <div className="flex-1">
                      <p className="text-sm text-gray-600">
                        {new Date(activity.timestamp).toLocaleString()}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
