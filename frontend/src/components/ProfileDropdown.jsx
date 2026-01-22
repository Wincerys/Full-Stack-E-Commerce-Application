import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getMyProfile, logout as apiLogout } from "../services/api";
import { useAuth } from "../contexts/AuthContext";

export default function ProfileDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  const { logout: authLogout } = useAuth();

  const { data: profile } = useQuery({
    queryKey: ["profile"],
    queryFn: getMyProfile,
  });

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen]);

  const handleLogout = () => {
    apiLogout();
    authLogout();
    window.location.replace("/");
  };

  const getInitials = () => {
    if (profile?.name) {
      const names = profile.name.trim().split(" ");
      if (names.length >= 2) {
        return (names[0][0] + names[names.length - 1][0]).toUpperCase();
      }
      return names[0][0].toUpperCase();
    }
    return profile?.email?.[0]?.toUpperCase() || "U";
  };

  return (
    <div style={{ position: "relative" }} ref={dropdownRef}>
      <button
        className="profile-icon"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Profile menu"
        style={{
          width: 40,
          height: 40,
          borderRadius: "50%",
          background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
          color: "white",
          border: "2px solid white",
          cursor: "pointer",
          fontWeight: "bold",
          fontSize: 14,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
          transition: "transform 0.2s",
        }}
        onMouseEnter={(e) => e.currentTarget.style.transform = "scale(1.05)"}
        onMouseLeave={(e) => e.currentTarget.style.transform = "scale(1)"}
      >
        {getInitials()}
      </button>

      {isOpen && (
        <div
          className="profile-dropdown"
          style={{
            position: "absolute",
            top: "calc(100% + 8px)",
            right: 0,
            background: "white",
            border: "1px solid var(--border)",
            borderRadius: "12px",
            boxShadow: "0 4px 16px rgba(0,0,0,0.15)",
            minWidth: 220,
            zIndex: 1000,
            overflow: "hidden",
          }}
        >
          {/* Profile Info Section */}
          <div
            style={{
              padding: "12px 16px",
              borderBottom: "1px solid var(--border)",
              background: "#f8faff",
            }}
          >
            <div style={{ fontWeight: 600, fontSize: 15 }}>
              {profile?.name || "User"}
            </div>
            <div style={{ fontSize: 13, color: "var(--muted)", marginTop: 2 }}>
              {profile?.email}
            </div>
            <div style={{ marginTop: 6 }}>
              <span
                className={`badge ${
                  profile?.role === "STUDENT" ? "badge--ok" : "badge--warm"
                }`}
                style={{ fontSize: 11 }}
              >
                {profile?.role}
              </span>
            </div>
          </div>

          {/* Menu Items */}
          <div style={{ padding: "8px 0" }}>
            <Link
              to="/profile"
              className="dropdown-item"
              onClick={() => setIsOpen(false)}
              style={{
                display: "block",
                padding: "10px 16px",
                color: "var(--text)",
                textDecoration: "none",
                transition: "background 0.15s",
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = "#f5f6f7"}
              onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
            >
              👤 View Profile
            </Link>

            {(profile?.role === "ORGANIZER" || profile?.role === "ADMIN") && (
              <Link
                to="/organiser-dashboard"
                className="dropdown-item"
                onClick={() => setIsOpen(false)}
                style={{
                  display: "block",
                  padding: "10px 16px",
                  color: "var(--text)",
                  textDecoration: "none",
                  transition: "background 0.15s",
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = "#f5f6f7"}
                onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
              >
                📊 Dashboard
              </Link>
            )}

            <div style={{ borderTop: "1px solid var(--border)", margin: "8px 0" }} />

            <button
              className="dropdown-item"
              onClick={handleLogout}
              style={{
                width: "100%",
                padding: "10px 16px",
                background: "transparent",
                border: "none",
                color: "#f02849",
                textAlign: "left",
                cursor: "pointer",
                fontSize: 15,
                fontWeight: 500,
                transition: "background 0.15s",
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = "#fff5f5"}
              onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
            >
              🚪 Logout
            </button>
          </div>
        </div>
      )}
    </div>
  );
}