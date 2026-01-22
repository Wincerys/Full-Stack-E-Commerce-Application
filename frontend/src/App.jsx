import { Routes, Route, NavLink, Link, Navigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import EventsPage from "./pages/EventsPage";
import EventDetailPage from "./pages/EventDetailPage";
import MyRsvpsPage from "./pages/MyRsvpsPage";
import CreateEventPage from "./pages/CreateEventPage";
import ProfilePage from "./pages/ProfilePage";
import BadgesPage from "./pages/BadgesPage";
import OrganizerDashboard from "./pages/OrganizerDashboard";
import OrganizerDashboardNew from "./pages/OrganizerDashboardNew.jsx";
import NotFoundPage from "./pages/NotFoundPage";
import AdminDashboardPage from "./pages/AdminDashboardPage.jsx";
import AdminDashboardPageNew from "./pages/AdminDashboardPageNew.jsx";
import LoginPage from "./pages/LoginPage";
import AdminLoginPage from "./pages/AdminLoginPage";
import RegisterPage from "./pages/RegisterPage";
import ProfileDropdown from "./components/ProfileDropdown";
import { useAuth } from "./contexts/AuthContext";
import { getMyProfile, getAuthRole } from "./services/api";
import HomePage from "./pages/HomePage.jsx";  

function Topbar() {
  const { isAuthed } = useAuth();

  // Fetch user profile to check role
  const { data: profile } = useQuery({
    queryKey: ["profile"],
    queryFn: getMyProfile,
    enabled: isAuthed,
  });

  const canCreateEvents = isAuthed && profile && profile.role !== "STUDENT";
  const role = getAuthRole();
  return (
    <header className="topbar">
      <div className="topbar__inner">
        <Link to="/" className="link-quiet">
          <h1 className="brand__title">EventHub</h1>
        </Link>

        <div style={{ width: 8 }} />

        <nav className="nav">
          <NavLink to="/events" end>Events</NavLink>
          {canCreateEvents && <NavLink to="/create">Create</NavLink>}
          {canCreateEvents && <NavLink to="/organiser-dashboard">My Events</NavLink>}
          {isAuthed && <NavLink to="/my-rsvps">My RSVPs</NavLink>}
          {isAuthed && <NavLink to="/badges">Badges</NavLink>}
          {isAuthed && role === "ADMIN" && <NavLink to="/admin">Admin</NavLink>}
        </nav>

        <div style={{ flex: 1 }} />

        <nav className="nav">
          {isAuthed ? (
            <ProfileDropdown />
          ) : (
            <>
              <NavLink className="btn" to="/login">Login</NavLink>
              <NavLink className="btn" to="/admin/login">Admin</NavLink>
              <NavLink className="btn btn--primary" to="/register">Register</NavLink>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}

export default function App() {
  return (
    <>
      <Topbar />
      <main className="container">
        <Routes>
          {/* Ensure homepage is the root and handle direct /index.html access */}
          <Route path="/" element={<HomePage />} />
          <Route path="/index.html" element={<Navigate to="/" replace />} />
          <Route path="/events" element={<EventsPage />} />
          <Route path="/events/:id" element={<EventDetailPage />} />
          <Route path="/my-rsvps" element={<MyRsvpsPage />} />
          <Route path="/create" element={<CreateEventPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/badges" element={<BadgesPage />} />
          {/* Organiser dashboards: old is canonical, new available at /new */}
          <Route path="/organiser-dashboard" element={<OrganizerDashboard />} />
          <Route path="/organiser-dashboard/new" element={<OrganizerDashboardNew />} />
          <Route path="/organiser-dashboard/old" element={<OrganizerDashboard />} />
          <Route path="/admin" element={<AdminDashboardPageNew />} />
          <Route path="/admin/old" element={<AdminDashboardPage />} />
          <Route path="/admin/login" element={<AdminLoginPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="*" element={<NotFoundPage />} />
          
        </Routes>
      </main>
    </>
  );
}