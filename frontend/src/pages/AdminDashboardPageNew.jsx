import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Toaster } from 'react-hot-toast';
import { 
  LayoutDashboard, 
  Calendar, 
  Users, 
  LogOut,
  ChevronLeft,
  ChevronRight,
  Menu,
  X
} from 'lucide-react';

import AdminUsersTabNew from "./AdminUsersTabNew.jsx";
import AdminEventsTabNew from "./AdminEventsTabNew.jsx";
import AdminAnalyticsTabNew from "./AdminAnalyticsTabNew.jsx";
import { isAuthed, getAuthRole, logout } from "../services/api.js";

export default function AdminDashboardPage() {
  const nav = useNavigate();
  const [tab, setTab] = useState("analytics");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  useEffect(() => {
    const authed = isAuthed();
    const role = getAuthRole();
    if (!authed || role !== "ADMIN") {
      nav("/admin/login");
    }
  }, [nav]);

  const handleLogout = () => {
    logout();
    nav("/admin/login");
  };

  const menuItems = [
    { id: "analytics", label: "Dashboard", icon: LayoutDashboard },
    { id: "events", label: "Events", icon: Calendar },
    { id: "users", label: "Users", icon: Users },
  ];

  return (
    <div className="admin-dashboard">
      <Toaster position="top-right" />
      
      {/* Sidebar */}
      <aside className={`admin-sidebar ${sidebarCollapsed ? 'collapsed' : ''} ${mobileSidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          {!sidebarCollapsed && <h1 className="sidebar-title">Admin Panel</h1>}
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="sidebar-toggle"
          >
            {sidebarCollapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
          </button>
        </div>

        <nav className="sidebar-nav">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = tab === item.id;
            
            return (
              <button
                key={item.id}
                onClick={() => {
                  setTab(item.id);
                  setMobileSidebarOpen(false);
                }}
                className={`nav-item ${isActive ? 'active' : ''}`}
              >
                <Icon size={20} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          <button onClick={handleLogout} className="nav-item" style={{color: 'var(--danger)'}}>
            <LogOut size={20} />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Mobile Overlay */}
      {mobileSidebarOpen && (
        <div 
          className="modal-overlay" 
          onClick={() => setMobileSidebarOpen(false)}
          style={{zIndex: 99}}
        />
      )}

      {/* Main Content */}
      <div className="admin-content">
        <header className="content-header">
          <button
            onClick={() => setMobileSidebarOpen(true)}
            className="btn btn-secondary btn-sm"
            style={{marginRight: '1rem'}}
          >
            <Menu size={20} />
          </button>
          <div>
            <h1 className="content-title">
              {menuItems.find(item => item.id === tab)?.label || "Dashboard"}
            </h1>
            <p className="content-subtitle">Manage and monitor your platform</p>
          </div>
        </header>

        <main className="content-body">
          {tab === "analytics" && <AdminAnalyticsTabNew />}
          {tab === "events" && <AdminEventsTabNew />}
          {tab === "users" && <AdminUsersTabNew />}
        </main>
      </div>
    </div>
  );
}
